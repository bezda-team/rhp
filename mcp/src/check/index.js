// check(): renders a chart file in a headless browser and reports what is wrong with it.
//
//   import { check } from "@bezda/rhp-mcp";
//   const result = await check({ file: "chart.html" });
//   console.log(result.text);
//
// Options
//   file      the chart: an .html page, a Solid .jsx/.tsx component, a React .jsx/.tsx component, or a .js module that
//             uses @bezda/rhp/standalone (its default export is mounted)
//   code      the chart's code instead of a file (written to a temp file; imports resolve from the checker)
//   format    "html", "solid", "react" or "module" (found from the file, its imports and its project when left out)
//   widths    page widths in px, [1280, 390] by default; the interaction pass runs at the first, and slats are tapped
//             at the widths of a phone (600px or less, which are drawn as a touch screen), in a window 664px tall
//   dark      emulate prefers-color-scheme: dark
//   interact  run the interaction pass and the taps (true by default)
//   outDir    where the screenshots go (a folder in the OS temp dir by default)
//   guard     check how rhp is used, in the page (true by default; false is for proving the guard draws nothing)
//   freeze    take the screenshots with CSS animations stopped (an endless one at its start), for comparing them
//   settleTimeout  readiness budget per settling wait in ms (10000 by default); an unsettled page fails explicitly
//   offline   fetch nothing from the web (fonts fall back): for tests that must not depend on the network
//   browser   a Playwright Browser to use instead of launching one (it is left open)
//   debug     also save the screenshots the color probes read (as drawn, with the text hidden, with the marks hidden)
//
// Result: { ok, file, format, rhpVersion, browser, findings, charts, interactions, interactedAt, screenshots, timings,
// text }
//   ok            no finding is an error
//   findings      [{ level: "error" | "warning" | "info", code, message, fix, width, widths }], errors first
//   charts        [{ width, slats, blocks: { bar: 3, label: 6 }, box: { width, height } }]
//   interactions  [{ width, kind, target, changed, how, error, moved, unseen }]
//   screenshots   [{ width, dark, hover, path }]
//   text          the report as plain text (what the CLI prints)
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { pathToFileURL } from "url";
import { detectFormat, bundle, guardedStandalone, htmlProblems, packages, contentType } from "./build.js";
import { launch, NO_BROWSER_FIX } from "./browser.js";
import { install } from "./inpage.js";
import { fromProbe, fixForError, placeOf } from "./findings.js";
import { textContrast, faintMarks, colorBlind } from "./colors.js";
import { decode } from "./png.js";
import { interact as interactionPass } from "./interact.js";
import { readMap, lookup } from "./sourcemap.js";
import { sourceProblems } from "./source.js";
import { report } from "./report.js";

const ORIGIN = "http://rhp-check.localhost";
const CDN = /^https?:\/\/(?:cdn\.jsdelivr\.net\/npm|unpkg\.com|esm\.sh)\/@bezda\/rhp(?:@([^/]+))?\/(?:dist\/)?([^?#]*)/;
const EXT = { html: ".html", solid: ".jsx", react: ".jsx", module: ".js" };
const LEVELS = { error: 0, warning: 1, info: 2 };
const PHONE = 600;
// The height of what a phone shows of a page (Safari on a 390 by 844 iPhone, its bars shown): where the taps are tried
const PHONE_WINDOW = 664;

const shortHash = (text) => crypto.createHash("sha1").update(text).digest("hex").slice(0, 8);

// What the web answered (fonts and their CSS), kept for the checks that follow in this process: the same bytes each
// time, and no wait. Only answers that came back whole are kept.
const fetched = new Map();
let fetchedBytes = 0;
const KEEP_BYTES = 64 * 1024 * 1024;

// The chart's file: the one given, or the code written to a temp file
function source({ file, code, format }) {

  if (file) {
    const abs = path.resolve(file);
    if (!fs.existsSync(abs)) return { error: `No such file: ${abs}` };
    return { file: abs, text: fs.readFileSync(abs, "utf8") };
  }

  if (typeof code !== "string" || !code.trim()) return { error: "Give a file or code to check." };

  const kind = format ?? detectFormat(null, code);
  const dir = path.join(os.tmpdir(), "rhp-check", "input-" + shortHash(code));
  fs.mkdirSync(dir, { recursive: true });
  const abs = path.join(dir, "chart" + EXT[kind]);
  fs.writeFileSync(abs, code);

  return { file: abs, text: code };
}

export async function check(options = {}) {

  const started = performance.now();
  const timings = {};
  const lap = (name, since) => (timings[name] = Math.round(performance.now() - since));
  const widths = (options.widths ?? [1280, 390]).map(Number).filter((w) => w > 0);
  const dark = !!options.dark;
  const guard = options.guard !== false;
  const wantInteract = options.interact !== false;
  const settleTimeout = options.settleTimeout ?? 10000;
  const requireRest = (result) => {
    if (!result.rest) throw Object.assign(new Error(`The page did not settle within ${settleTimeout}ms; layout and color measurements would be unreliable.`), { code: "page-unsettled" });
  };

  const src = source(options);
  if (src.error) return finish({ file: options.file ?? null, format: options.format ?? null, findings: [{ level: "error", code: "no-file", message: src.error, fix: "Pass the path of the chart's file (an .html page, a .jsx component or a .js module)." }], timings, started });

  const file = src.file;
  const format = options.format ?? detectFormat(file, src.text);
  const outDir = options.outDir ? path.resolve(options.outDir) : path.join(os.tmpdir(), "rhp-check", `${path.basename(file).replace(/\.[^.]+$/, "")}-${shortHash(file)}`);
  const findings = [];
  const pkgs = packages(path.dirname(file));
  const base = { file, format, rhpVersion: pkgs.rhp?.version ?? null };

  // What needs no browser: the page's scripts parse, or the file bundles
  let t = performance.now();
  let built = null;
  if (format === "html") {
    findings.push(...(await htmlProblems(file, src.text)));
  } else {
    built = await bundle({ file, format, guard });
    findings.push(...built.problems);
  }
  lap("build", t);

  // What the code gets wrong without an error (a bare boolean, a handler with no parameter, two copies of Solid...).
  // A name the standalone module doesn't export makes the build fail too: the static finding says what to use instead.
  const statics = pkgs.rhp ? sourceProblems({ file, text: src.text, format, rhpRoot: pkgs.rhp.root }) : [];
  const missing = new Set(statics.filter((f) => f.code === "missing-export").map((f) => f.name));
  const replaced = (f) => f.code === "syntax-error" && [...missing].some((name) => f.message.includes(`import "${name}"`));
  findings.splice(0, findings.length, ...findings.filter((f) => !replaced(f)), ...statics.map(({ name, ...f }) => f));

  if (built && !built.ok) return finish({ ...base, findings, timings, started });

  t = performance.now();
  const launched = options.browser ? { browser: options.browser, name: `${options.browser.browserType().name()} ${options.browser.version()}` } : await launch();
  lap("launch", t);
  if (launched.error) {
    findings.push({ level: "error", code: "no-browser", message: `No browser to render the chart in (tried: ${launched.error.join("; ")}).`, fix: NO_BROWSER_FIX });
    return finish({ ...base, findings, timings, started });
  }

  t = performance.now();
  const standalone = format === "html" && guard ? fs.readFileSync(await guardedStandalone(pkgs)) : null;
  lap("standalone", t);

  const map = built ? readMap(built.files.get("/__rhp/bundle.js").body.toString("utf8")) : null;
  const remote = new Map();
  const cdnNotes = [];
  fs.mkdirSync(outDir, { recursive: true });
  const name = path.basename(file).replace(/\.[^.]+$/, "");

  // Answers every request the page makes: the bundle and the user's files for a bundled chart, rhp from the CDN, and
  // the rest of the web (fonts) through a short timeout, kept for the next width
  const route = async (r) => {
    const url = r.request().url();

    if (url.startsWith(ORIGIN + "/")) {
      const p = decodeURIComponent(new URL(url).pathname);
      if (p === "/") return r.fulfill({ body: built.html, contentType: "text/html" });
      if (built.files.has(p)) return r.fulfill({ body: built.files.get(p).body, contentType: built.files.get(p).type });
      if (p === "/favicon.ico") return r.fulfill({ status: 204, body: "" });
      const local = path.join(path.dirname(file), p);
      if (local.startsWith(path.dirname(file)) && fs.existsSync(local) && fs.statSync(local).isFile()) return r.fulfill({ body: fs.readFileSync(local), contentType: contentType(local) });
      return r.fulfill({ status: 404, body: "not found: " + p });
    }

    const cdn = url.match(CDN);
    if (cdn) {
      const [, version, rest] = cdn;
      const major = version && /^[\^~]?(\d+)/.exec(version)?.[1];
      if (major && major !== String(pkgs.rhp.version.split(".")[0])) cdnNotes.push(`@bezda/rhp@${version}`);
      const sub = rest === "standalone" || rest === "standalone.js" || rest === "" ? "standalone.js" : rest;
      const headers = { "access-control-allow-origin": "*" };
      if (sub === "standalone.js") return r.fulfill({ body: standalone ?? fs.readFileSync(path.join(pkgs.rhp.root, "dist/standalone.js")), contentType: "text/javascript", headers });
      const f = path.join(pkgs.rhp.root, "dist", sub.replace(/^dist\//, ""));
      if (fs.existsSync(f)) return r.fulfill({ body: fs.readFileSync(f), contentType: contentType(f), headers });
      return r.fulfill({ status: 404, body: "not in @bezda/rhp: " + sub, headers });
    }

    if (!/^https?:/.test(url)) return r.continue();
    if (options.offline) return r.abort("internetdisconnected").catch(() => {});

    if (!remote.has(url)) {
      remote.set(url, fetched.has(url) ? Promise.resolve(fetched.get(url)) : r.fetch({ timeout: 5000, maxRedirects: 5 }).then(async (res) => {
        const got = { status: res.status(), headers: res.headers(), body: await res.body() };
        if (got.status >= 200 && got.status < 300 && fetchedBytes + got.body.length <= KEEP_BYTES) {
          fetched.set(url, got);
          fetchedBytes += got.body.length;
        }
        return got;
      }, (e) => ({ error: String(e.message ?? e).split("\n")[0] })));
    }
    const got = await remote.get(url);
    if (got.error) return r.abort("internetdisconnected").catch(() => {});
    return r.fulfill({ status: got.status, headers: got.headers, body: got.body }).catch(() => {});
  };

  const browser = launched.browser;
  const results = [];
  const screenshots = [];
  const isLocal = (u) => u.startsWith("file:") || u.startsWith(ORIGIN);

  // A page with the chart, the probe installed and at rest (in a window of another size when asked); what the page
  // throws or prints goes to events
  const open = async (context, events, reducedMotion, viewport = null) => {
    const page = await context.newPage();
    if (viewport) await page.setViewportSize(viewport);
    page.on("pageerror", (e) => events.push({ kind: "pageerror", text: `${e.name && !String(e.message).startsWith(e.name) ? e.name + ": " : ""}${e.message}`, stack: e.stack }));
    page.on("console", (m) => {
      const text = m.text();
      if (m.type() === "error" && !/^Failed to load resource/.test(text)) events.push({ kind: "console-error", text, stack: m.location()?.url ? `\n    at ${m.location().url}:${m.location().lineNumber + 1}:${m.location().columnNumber + 1}` : "" });
      if (m.type() === "warning" && /^rhp:/.test(text)) events.push({ kind: "rhp-warning", text });
    });
    page.on("requestfailed", (q) => {
      const u = q.url();
      events.push({ kind: isLocal(u) ? "request-failed" : "remote-failed", text: u, error: q.failure()?.errorText ?? "failed" });
    });
    page.on("response", (res) => {
      const u = res.url();
      if (isLocal(u) && res.status() >= 400 && !u.endsWith("/favicon.ico")) events.push({ kind: "request-failed", text: u, error: `HTTP ${res.status()}` });
    });
    await page.emulateMedia({ reducedMotion });
    await page.route("**/*", route);
    await page.goto(format === "html" ? pathToFileURL(file).href : ORIGIN + "/", { waitUntil: "load", timeout: 20000 }).catch((e) => events.push({ kind: "pageerror", text: "The page did not finish loading: " + String(e.message).split("\n")[0] }));
    await page.evaluate(install);
    requireRest(await page.evaluate((max) => window.__rhpProbe.settle(max), settleTimeout));
    return page;
  };

  // A screenshot, after which the page comes to rest again: taking one can lay the page out at another size for a
  // moment (see calm() in inpage.js)
  const capture = async (page, opts) => {
    const since = await page.evaluate(() => window.__rhpProbe.resized());
    const png = await page.screenshot(opts);
    requireRest(await page.evaluate(([n, max]) => window.__rhpProbe.calm(n, max), [since, settleTimeout]));
    return png;
  };

  // The screenshot the report gives, cropped to what the page draws
  const save = async (page, width, suffix) => {
    const box = await page.evaluate(() => window.__rhpProbe.contentBox());
    const size = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
    const pad = 16;
    const clip = box && {
      x: Math.max(0, Math.floor(box.left - pad)),
      y: Math.max(0, Math.floor(box.top - pad)),
      width: Math.min(size.w, Math.ceil(box.right + pad)) - Math.max(0, Math.floor(box.left - pad)),
      height: Math.min(size.h, Math.ceil(box.bottom + pad)) - Math.max(0, Math.floor(box.top - pad)),
    };
    const png = path.join(outDir, `${name}-${width}${dark ? "-dark" : ""}${suffix ? "-" + suffix : ""}.png`);
    await capture(page, { type: "png", path: png, fullPage: true, animations: options.freeze ? "disabled" : "allow", ...(clip && clip.width > 0 && clip.height > 0 ? { clip } : {}) });
    screenshots.push({ width, dark, hover: suffix === "hover", path: png });
  };

  t = performance.now();

  try {
    await Promise.all(widths.map(async (width, i) => {
      const phone = width <= PHONE;
      const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: phone ? 2 : 1, hasTouch: phone, colorScheme: dark ? "dark" : "light" });
      const events = [];
      const w0 = performance.now();
      try {

      // The page is measured and pictured with reduced motion asked for: rhp's moves end at once, and a page that moves
      // on its own (an autoplay, a live feed) waits or changes in steps, so the screenshots show what was measured
      const page = await open(context, events, "reduce");

      // first, before any probe hides or restyles anything
      await save(page, width, "");

      // The screenshots the colors are read from (in CSS px): as drawn, with the glyphs hidden, with the marks hidden
      const shot = () => capture(page, { type: "png", fullPage: true, scale: "css", animations: "allow" });
      const keep = (png, suffix) => {
        if (options.debug) fs.writeFileSync(path.join(outDir, `${name}-${width}${dark ? "-dark" : ""}-${suffix}.png`), png);
        return decode(png);
      };
      const drawn = keep(await shot(), "drawn");
      // Full-page captures can trigger responsive layout handlers. Read geometry
      // and text colors only after those handlers have come to rest again.
      const seen = await page.evaluate(() => window.__rhpProbe.measure());
      const items = await page.evaluate(() => window.__rhpProbe.colorItems());
      await page.evaluate(() => window.__rhpProbe.hide("text"));
      const noText = keep(await shot(), "no-text");
      let noMarks = null;
      if (items.some((x) => x.kind === "mark")) {
        await page.evaluate(() => window.__rhpProbe.hide("marks"));
        noMarks = keep(await shot(), "no-marks");
      }
      await page.evaluate(() => window.__rhpProbe.show());
      const colorFindings = [...textContrast(items, noText, 1), ...(noMarks ? faintMarks(items, drawn, noMarks, 1) : []), ...colorBlind(items, noMarks, 1)];

      // with reduced motion rhp turns every block's transition off, so a slat's own is read with motion on
      await page.emulateMedia({ reducedMotion: "no-preference" });
      seen.found.push(...(await page.evaluate(() => window.__rhpProbe.transitions())));
      const guarded = await page.evaluate(() => globalThis.__rhpCheck?.findings ?? []).catch(() => []);
      await page.close();

      // The interactions are tried on a fresh page with motion on, as a reader gets it: the pass at the first width,
      // and taps at a phone's, in the window a phone shows (not when the page never finished loading)
      const interactions = [];
      const unfocused = [];
      const loaded = !events.some((e) => e.kind === "pageerror" && /^The page did not finish loading/.test(e.text));
      if (wantInteract && loaded && (i === 0 || phone)) {
        const fresh = await open(context, events, "no-preference", phone ? { width, height: PHONE_WINDOW } : null);
        const pass = { events, capture: (opts) => capture(fresh, opts), shoot: (suffix) => save(fresh, width, suffix) };
        const passes = [];
        if (i === 0) passes.push(await interactionPass(fresh, pass));
        if (phone) passes.push(await interactionPass(fresh, { ...pass, taps: true }));
        for (const done of passes) {
          interactions.push(...done.interactions);
          unfocused.push(...done.unfocused);
        }
        // what the slats read once, read again (the pass does it after each step too)
        await fresh.evaluate(() => globalThis.__rhpCheck?.recheck?.()).catch(() => {});
        guarded.push(...(await fresh.evaluate(() => globalThis.__rhpCheck?.findings ?? []).catch(() => [])));
      }

      results.push({ width, index: i, seen, events, guarded, colorFindings, interactions: interactions.map((x) => ({ width, ...x })), unfocused, ms: Math.round(performance.now() - w0) });
      } catch (error) {
        if (error.code !== "page-unsettled") throw error;
        findings.push({ level: "error", code: error.code, message: error.message, fix: "Let finite entry animations finish, honor prefers-reduced-motion for live updates, or increase the check's settleTimeout for a slow machine.", width });
      } finally {
        await context.close();
      }
    }));
  } finally {
    if (!options.browser) await browser.close();
  }
  lap("pages", t);

  results.sort((a, b) => a.index - b.index);

  for (const version of new Set(cdnNotes)) {
    findings.push({ level: "error", code: "cdn-version", message: `The page loads ${version} from the CDN, but this check (and the kit) is for rhp ${pkgs.rhp.version.split(".")[0]}.`, fix: `Load https://cdn.jsdelivr.net/npm/@bezda/rhp@${pkgs.rhp.version.split(".")[0]}/dist/standalone.js in the import map.` });
  }

  const staticSyntax = findings.some((f) => f.code === "syntax-error" || f.code === "plain-script-tag" || f.code === "missing-import-map");
  const named = (text) => [...missing].some((name) => new RegExp(`export named '${name}'`).test(text));
  const statically = new Set(statics.map((f) => f.code));
  const cannotLoad = findings.some((f) => /^(syntax-error|plain-script-tag|missing-import-map|missing-export|missing-import|cdn-version)$/.test(f.code)) || results.some((r) => r.guarded.some((g) => g.code === "no-component"));
  const where = (stack) => placeOf(stack, path.dirname(file), map && ((line, col) => lookup(map, line, col)));

  for (const r of results) {
    const errors = r.events.some((e) => e.kind === "pageerror" || e.kind === "console-error");

    for (const e of r.events) {
      const at = e.stack ? where(e.stack) : "";
      if (e.kind === "pageerror" && named(e.text)) continue;
      if (e.kind === "pageerror" && !(staticSyntax && /SyntaxError|Unexpected token|Failed to resolve module specifier|Cannot use import/.test(e.text))) {
        findings.push({ level: "error", code: e.during ? "interaction-error" : /^SyntaxError/.test(e.text) ? "syntax-error" : "runtime-error", message: `${e.during ? `${e.during} threw: ` : ""}${e.text}${at ? ` (at ${at})` : ""}`, fix: fixForError(e.text, format), width: r.width });
      } else if (e.kind === "console-error" && !(staticSyntax && /Failed to resolve module specifier|Unexpected token/.test(e.text))) {
        findings.push({ level: "error", code: e.during ? "interaction-error" : "console-error", message: `${e.during ? `${e.during} logged: ` : "Console error: "}${e.text}${at ? ` (at ${at})` : ""}`, fix: fixForError(e.text, format), width: r.width });
      } else if (e.kind === "rhp-warning") {
        findings.push({ level: "error", code: "rhp-warning", message: e.text, fix: "Do what the warning says: rhp prints it when a chart is set up in a way that doesn't work as written.", width: r.width });
      } else if (e.kind === "request-failed") {
        findings.push({ level: "error", code: "request-failed", message: `${e.text.replace(ORIGIN, "").replace(/^file:\/\//, "")} failed to load (${e.error}).`, fix: "Fix the path, or add the file next to the chart.", width: r.width });
      } else if (e.kind === "remote-failed") {
        findings.push({ level: "info", code: "remote-failed", message: `${e.text} could not be fetched (${e.error}); the check went on without it.`, fix: "If the page needs it, check the URL; offline, fonts fall back to the next in the stack.", width: r.width });
      }
    }

    for (const g of r.guarded) {
      // className is found in the code already, with its line
      if (statically.has("class-name") && /className/.test(g.message)) continue;
      findings.push({ level: g.level, code: g.code, message: g.message, fix: g.fix, width: r.width });
    }

    for (const f of r.seen.found) {
      // no chart is what code that can't load draws: the reason is reported already
      if (f.code === "no-chart" && cannotLoad) continue;
      findings.push({ ...fromProbe(f, { errors }), width: r.width });
    }

    for (const f of r.colorFindings) {
      findings.push({ ...f, width: r.width });
    }

    // the layout jumping when an interaction runs: the same things moving for several interactions is one finding
    const jumps = new Map();
    for (const x of r.interactions.filter((x) => x.moved?.length)) {
      const key = x.moved.map((m) => m.what).join("\n");
      if (jumps.has(key)) jumps.get(key).more++;
      else jumps.set(key, { code: "layout-jump", kind: x.kind, target: x.target, moved: x.moved, more: 0 });
    }
    for (const j of jumps.values()) {
      findings.push({ ...fromProbe(j, {}), width: r.width });
    }

    // taps whose every change of text lies outside the window: one finding, on the last of them (the furthest slat)
    const unseen = r.interactions.filter((x) => x.unseen);
    if (unseen.length) findings.push({ ...fromProbe({ code: "out-of-view", target: unseen.at(-1).target, ...unseen.at(-1).unseen, more: unseen.length - 1 }, {}), width: r.width });

    // focus that shows nothing: one finding for the page
    if (r.unfocused.length) findings.push({ ...fromProbe({ code: "focus-invisible", what: r.unfocused[0], more: r.unfocused.length - 1 }, {}), width: r.width });
  }

  const charts = results.flatMap((r) => r.seen.charts.map((c) => ({ width: r.width, ...c })));
  const interactions = results.flatMap((r) => r.interactions);
  timings.widths = Object.fromEntries(results.map((r) => [r.width, r.ms]));

  return finish({ ...base, browser: launched.name, findings, charts, interactions, interactedAt: wantInteract ? widths[0] : null, screenshots, timings, started });
}

// Merges the same finding at several widths, sorts errors first, and writes the report
function finish({ findings, started, timings, ...rest }) {

  const merged = new Map();

  for (const f of findings) {
    const key = f.key ?? f.code + "\n" + f.message;
    const had = merged.get(key);
    if (had) {
      if (f.width != null && !had.widths.includes(f.width)) had.widths.push(f.width);
      continue;
    }
    merged.set(key, { level: f.level, code: f.code, message: f.message, fix: f.fix, width: f.width ?? null, widths: f.width != null ? [f.width] : [] });
  }

  const list = [...merged.values()].sort((a, b) => LEVELS[a.level] - LEVELS[b.level]);
  timings.total = Math.round(performance.now() - started);
  const result = {
    ok: !list.some((f) => f.level === "error"),
    file: rest.file ?? null,
    format: rest.format ?? null,
    rhpVersion: rest.rhpVersion ?? null,
    browser: rest.browser ?? null,
    findings: list,
    charts: rest.charts ?? [],
    interactions: rest.interactions ?? [],
    interactedAt: rest.interactedAt ?? null,
    screenshots: rest.screenshots ?? [],
    timings,
  };
  result.text = report(result);

  return result;
}
