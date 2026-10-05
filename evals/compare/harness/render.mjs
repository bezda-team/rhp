// Renders a poster page the way a reader's browser would, and measures what any reader would hit, whatever library drew it.
//   node render.mjs <poster.html> <outDir> [--widths 1280,390]
// CDN requests (jsDelivr, unpkg, cdnjs, Highcharts' CDN) are answered from the npm registry's copy of the same package,
// since this sandbox blocks the CDNs; Google Fonts and every other host go through the sandbox's proxy as usual.
// Writes <outDir>/shot-<width>.png (full page) and <outDir>/scan.json.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { PNG } from "pngjs";
import semver from "semver";
import { build as esbuild } from "esbuild";

const here = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(here, "..", "cdn-cache");
fs.mkdirSync(CACHE, { recursive: true });

// ---------- the CDN mirror ----------
const versionsOf = new Map();
function resolveVersion(name, range) {
  if (!versionsOf.has(name)) {
    const out = execFileSync("npm", ["view", name, "versions", "dist-tags", "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    versionsOf.set(name, JSON.parse(out));
  }
  const info = versionsOf.get(name);
  if (!range || range === "latest") return info["dist-tags"].latest;
  if (info["dist-tags"][range]) return info["dist-tags"][range];
  return semver.maxSatisfying(info.versions, range) ?? info["dist-tags"].latest;
}
function packageDir(name, version) {
  const dir = path.join(CACHE, `${name.replace("/", "__")}@${version}`);
  if (!fs.existsSync(path.join(dir, "package", "package.json"))) {
    fs.mkdirSync(dir, { recursive: true });
    const tgz = execFileSync("npm", ["pack", `${name}@${version}`, "--silent"], { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n").pop();
    execFileSync("tar", ["xzf", tgz], { cwd: dir });
    fs.rmSync(path.join(dir, tgz));
  }
  return path.join(dir, "package");
}
// The file jsDelivr would serve for a package with no path: its jsdelivr, unpkg, browser or main field
function defaultFile(dir) {
  const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
  for (const f of [pkg.jsdelivr, pkg.unpkg, typeof pkg.browser === "string" ? pkg.browser : null, pkg.main, "index.js"]) {
    if (f && fs.existsSync(path.join(dir, f))) return f;
  }
  return null;
}
function findByName(dir, base) {
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.name === base) return p;
    }
  }
  return null;
}
const CDNJS = { "Chart.js": "chart.js", "chartjs-plugin-datalabels": "chartjs-plugin-datalabels", d3: "d3", echarts: "echarts", apexcharts: "apexcharts", highcharts: "highcharts", "vega-lite": "vega-lite", vega: "vega", "vega-embed": "vega-embed", "plotly.js": "plotly.js-dist-min" };
// { name, range, file } for a CDN URL, or null
function parseCdn(url) {
  const u = new URL(url);
  let m;
  if (u.hostname === "cdn.jsdelivr.net" && (m = u.pathname.match(/^\/npm\/((?:@[^/]+\/)?[^/@]+)(?:@([^/]+))?(\/.*)?$/))) return { name: m[1], range: m[2], file: m[3] };
  if (u.hostname === "unpkg.com" && (m = u.pathname.match(/^\/((?:@[^/]+\/)?[^/@]+)(?:@([^/]+))?(\/.*)?$/))) return { name: m[1], range: m[2], file: m[3] };
  if (u.hostname === "cdnjs.cloudflare.com" && (m = u.pathname.match(/^\/ajax\/libs\/([^/]+)\/([^/]+)\/(.+)$/))) return { name: CDNJS[m[1]] ?? m[1].toLowerCase(), range: m[2], file: "/" + m[3], byName: true };
  if (u.hostname === "code.highcharts.com") {
    const p = u.pathname.replace(/^\/(\d+\.\d+\.\d+|\d+)\//, "/");
    const v = u.pathname.match(/^\/(\d+(?:\.\d+\.\d+)?)\//)?.[1];
    return { name: "highcharts", range: v, file: p.replace(/^\/es-modules\//, "/es-modules/") };
  }
  return null;
}
// jsDelivr's +esm: the module bundled into one ES module, each bare import of another package left as an import of
// that package's own +esm URL at the version installed with it, as jsDelivr does
const ESM = path.join(CACHE, "esm");
function installed(name, version) {
  const dir = path.join(ESM, "install", `${name.replace("/", "__")}@${version}`);
  if (!fs.existsSync(path.join(dir, "node_modules", name, "package.json"))) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "package.json"), "{}");
    execFileSync("npm", ["install", "--no-audit", "--no-fund", "--ignore-scripts", "--omit=dev", "--legacy-peer-deps", `${name}@${version}`], { cwd: dir, stdio: "ignore" });
  }
  return dir;
}
function versionNear(dep, from) {
  for (let d = from; d.length > 1; d = path.dirname(d)) {
    const p = path.join(d, "node_modules", dep, "package.json");
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8")).version;
  }
  return null;
}
const BUILTINS = new Set(["fs", "path", "os", "url", "util", "crypto", "stream", "buffer", "events", "module", "child_process", "http", "https", "zlib", "assert", "worker_threads", "perf_hooks", "tty", "net", "vm"]);
async function esmBundle(name, version, sub) {
  const out = path.join(ESM, `${name.replace("/", "__")}@${version}${(sub ?? "").replace(/\//g, "__")}.js`);
  if (fs.existsSync(out)) return { code: fs.readFileSync(out), exports: JSON.parse(fs.readFileSync(out + ".exports.json", "utf8")) };
  const dir = installed(name, version);
  const file = sub ? path.join(dir, "node_modules", name, sub) : null;
  const spec = file && fs.existsSync(file) ? file : `${name}${sub ?? ""}`;
  // A CommonJS module gets named exports, as jsDelivr's build gives it: its export names come from loading it in Node
  let names = [];
  try {
    const out = execFileSync("node", ["-e", `process.env.NODE_ENV="production";const m=require(${JSON.stringify(spec)});console.log(JSON.stringify(m&&typeof m==="object"||typeof m==="function"?Object.keys(m):[]))`], { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    names = JSON.parse(out).filter((k) => /^[A-Za-z_$][\w$]*$/.test(k) && k !== "default" && k !== "__esModule");
  } catch {}
  const probe = await esbuild({ entryPoints: [spec], absWorkingDir: dir, bundle: true, format: "esm", platform: "browser", write: false, metafile: true, logLevel: "silent",
    conditions: ["browser", "import", "module", "default"], mainFields: ["browser", "module", "main"], plugins: [{ name: "ext", setup(b) { b.onResolve({ filter: /^[^./]/ }, (a) => (a.kind === "entry-point" ? undefined : { path: a.path, external: true })); } }] }).catch(() => null);
  const probeExports = probe ? Object.values(probe.metafile.outputs)[0]?.exports ?? [] : [];
  const cjs = probeExports.length <= 1 && probeExports[0] !== undefined ? probeExports[0] === "default" && names.length > 0 : names.length > 0 && probeExports.length === 0;
  const stdin = cjs ? { contents: `import __m from ${JSON.stringify(spec)};\nexport default __m;\nexport const { ${names.join(", ")} } = __m;\n`, resolveDir: dir, loader: "js" } : undefined;
  const r = await esbuild({
    ...(stdin ? { stdin } : { entryPoints: [spec] }), absWorkingDir: dir, bundle: true, format: "esm", platform: "browser", write: false, minify: true, metafile: true,
    conditions: ["browser", "import", "module", "default"], mainFields: ["browser", "module", "main"], define: { "process.env.NODE_ENV": '"production"', global: "globalThis" }, logLevel: "silent",
    plugins: [{ name: "jsdelivr-esm", setup(b) {
      // Packages that must stay one instance on a page (React and the package's peers) are always imports; any other
      // package an ES module imports is an import of its own +esm URL; a CommonJS require() of it is bundled in
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, "node_modules", name, "package.json"), "utf8"));
      const shared = new Set(["react", "react-dom", ...Object.keys(pkg.peerDependencies ?? {})]);
      const urlOf = (dep, rest, from) => `https://cdn.jsdelivr.net/npm/${dep}@${versionNear(dep, from) ?? resolveVersion(dep, "latest")}${rest ?? ""}/+esm`;
      b.onResolve({ filter: /^https?:/ }, (a) => ({ path: a.path, external: true }));
      b.onResolve({ filter: /^[^./]/ }, (a) => {
        if (a.kind === "entry-point") return;
        const bare = a.path.replace(/^node:/, "");
        if (BUILTINS.has(bare.split("/")[0])) return { path: bare, namespace: "empty" };
        const m = a.path.match(/^((?:@[^/]+\/)?[^/]+)(\/.*)?$/);
        if (!m || m[1] === name || a.path === spec) return;
        if (a.kind === "require-call") return shared.has(m[1]) ? { path: urlOf(m[1], m[2], a.resolveDir), namespace: "shared" } : undefined;
        return { path: urlOf(m[1], m[2], a.resolveDir), external: true };
      });
      b.onLoad({ filter: /.*/, namespace: "empty" }, () => ({ contents: "export default {}", loader: "js" }));
      b.onLoad({ filter: /.*/, namespace: "shared" }, (a) => ({ contents: `export * from ${JSON.stringify(a.path)}; export { default } from ${JSON.stringify(a.path)};`, loader: "js" }));
    } }],
  });
  fs.mkdirSync(ESM, { recursive: true });
  const exports = Object.values(r.metafile.outputs)[0]?.exports ?? [];
  fs.writeFileSync(out, r.outputFiles[0].contents);
  fs.writeFileSync(out + ".exports.json", JSON.stringify(exports));
  return { code: Buffer.from(r.outputFiles[0].contents), exports };
}
const TYPES = { ".js": "text/javascript", ".mjs": "text/javascript", ".cjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".woff": "font/woff", ".map": "application/json" };
export async function serveCdn(url) {
  const c = parseCdn(url);
  if (!c) return null;
  const version = resolveVersion(c.name, c.range);
  if (/\/\+esm$/.test(c.file ?? "") || c.file === "/+esm") {
    const sub = c.file.replace(/\/?\+esm$/, "") || null;
    const got = await esmBundle(c.name, version, sub);
    // A range re-exports its exact version, so every importer of a package shares one module instance
    if (c.range !== version) {
      const exact = `https://cdn.jsdelivr.net/npm/${c.name}@${version}${c.file}`;
      const body = `export * from ${JSON.stringify(exact)};${got.exports.includes("default") ? `export { default } from ${JSON.stringify(exact)};` : ""}`;
      return { status: 200, type: "text/javascript", body: Buffer.from(body), source: `${c.name}@${c.range} -> ${version}` };
    }
    return { status: 200, type: "text/javascript", body: got.code, source: `${c.name}@${version}${sub ?? ""} (+esm bundle)` };
  }
  const dir = packageDir(c.name, version);
  let rel = (c.file ?? "").replace(/\/\+esm$/, "");
  let file = rel && rel !== "/" ? path.join(dir, rel) : null;
  if (file && fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.js");
  if (!file || !fs.existsSync(file)) {
    if (!rel || rel === "/") file = path.join(dir, defaultFile(dir) ?? "index.js");
    else if (c.byName || !fs.existsSync(file)) file = findByName(dir, path.basename(rel)) ?? (fs.existsSync(rel.replace(/\.min\.js$/, ".js")) ? rel : null);
  }
  if (!file || !fs.existsSync(file)) return { status: 404, body: `not in ${c.name}@${version}: ${rel}` };
  return { status: 200, type: TYPES[path.extname(file)] ?? "application/octet-stream", body: fs.readFileSync(file), source: `${c.name}@${version}${file.slice(dir.length)}` };
}

// ---------- the scan, run in the page ----------
function inPage() {
  const vw = innerWidth;
  const out = { width: vw, pageHeight: document.documentElement.scrollHeight };
  const de = document.documentElement;
  out.sideways = Math.max(de.scrollWidth, document.body?.scrollWidth ?? 0) > vw + 1;
  // Charts: rhp charts, svg and canvas of a chart's size (not nested in another counted one)
  const charts = [];
  for (const el of document.querySelectorAll(".rhp-chart, svg, canvas")) {
    const r = el.getBoundingClientRect();
    if (r.width < 100 || r.height < 60) continue;
    if (charts.some((c) => c.contains(el))) continue;
    if (el.closest(".rhp-chart") && !el.matches(".rhp-chart")) continue;
    charts.push(el);
  }
  out.charts = charts.map((c) => {
    const r = c.getBoundingClientRect();
    return { tag: c.tagName.toLowerCase(), cls: (c.getAttribute("class") ?? "").slice(0, 60), x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) };
  });
  out.canvasCharts = out.charts.filter((c) => c.tag === "canvas").length;
  out.firstScreenChart = out.charts.some((c) => c.y < innerHeight && c.y + c.h > 0);
  // Visible text, one box per text node's line
  const texts = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const n = walker.currentNode;
    const t = n.textContent.replace(/\s+/g, " ").trim();
    if (!t) continue;
    const el = n.parentElement;
    if (!el || el.closest("script, style, noscript, title, template")) continue;
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    const cs = getComputedStyle(el);
    if (parseFloat(cs.opacity) === 0 || cs.color === "rgba(0, 0, 0, 0)") continue;
    // A screen-reader-only text (clipped to 1px) is not visible text
    let rects;
    let size = parseFloat(cs.fontSize);
    if (el instanceof SVGElement) {
      const r = el.getBoundingClientRect();
      rects = [r];
      const m = el.getScreenCTM?.();
      if (m) size *= Math.hypot(m.a, m.b);
      if (el.getAttribute("fill") === "none" && !cs.stroke) continue;
    } else {
      const range = document.createRange();
      range.selectNodeContents(n);
      rects = [...range.getClientRects()];
    }
    rects = rects.filter((r) => r.width > 1 && r.height > 1);
    if (!rects.length) continue;
    const sr = el.closest("[class*='sr-only'], [class*='visually-hidden'], .sr, .screen-reader");
    if (sr) continue;
    for (const r of rects) texts.push({ t: t.slice(0, 50), el, x: r.left, y: r.top, w: r.width, h: r.height, size });
  }
  out.textCount = texts.length;
  // Text smaller than 10px on screen
  out.tiny = texts.filter((b) => b.size < 9.5).map((b) => ({ t: b.t, size: +b.size.toFixed(1) }));
  // Text that leaves the page sideways, or is cut by a box that hides its overflow
  const cut = [];
  for (const b of texts) {
    if (b.x < -1 || b.x + b.w > vw + 1) { cut.push({ t: b.t, why: "outside the page" }); continue; }
    let a = b.el.parentElement;
    while (a && a !== document.body) {
      const s = getComputedStyle(a);
      if (/(hidden|clip)/.test(s.overflowX + s.overflowY)) {
        const r = a.getBoundingClientRect();
        // Glyphs lost, not line boxes that poke out: 2px sideways, or over a third of the line's height up or down
        const dy = 0.35 * b.h;
        if (b.x < r.left - 2 || b.x + b.w > r.right + 2 || b.y < r.top - dy || b.y + b.h > r.bottom + dy) { cut.push({ t: b.t, why: "cut by its box" }); break; }
      }
      a = a.parentElement;
    }
    if (!(b.el instanceof SVGElement)) {
      const s = getComputedStyle(b.el);
      if (s.textOverflow === "ellipsis" && b.el.scrollWidth > b.el.clientWidth + 1) cut.push({ t: b.t, why: "ellipsis" });
    }
  }
  out.cut = cut;
  // Text over other text: two boxes from different elements sharing over a fifth of the smaller one
  const overlaps = [];
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i], b = texts[j];
      if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (w <= 1 || h <= 1) continue;
      // Real collisions only: most of the shorter line's height and a good part of the narrower box's width, so tight
      // leading in a headline (line boxes that touch) doesn't count
      if (h > 0.5 * Math.min(a.h, b.h) && w > 0.3 * Math.min(a.w, b.w)) overlaps.push([a.t, b.t]);
    }
  }
  out.overlaps = overlaps.slice(0, 50);
  out.overlapCount = overlaps.length;
  // Boxes for the pixel contrast check (in page coordinates, so the full-page screenshot can be sampled)
  // The text's own color, from its CSS (fill for SVG text), as sRGB through a canvas so any color syntax works
  const cv = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const rgba = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = "#000"; cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data]; };
  out.textBoxes = texts.filter((b) => b.w >= 4 && b.h >= 6).map((b) => {
    const s = getComputedStyle(b.el);
    const c = b.el instanceof SVGElement && s.fill && s.fill !== "none" && !s.fill.startsWith("url") ? s.fill : s.color;
    return { t: b.t, x: Math.round(b.x + scrollX), y: Math.round(b.y + scrollY), w: Math.round(b.w), h: Math.round(b.h), size: +b.size.toFixed(1), bold: parseInt(s.fontWeight) >= 600, color: rgba(c), opacity: parseFloat(s.opacity) };
  });
  out.title = document.title;
  out.headings = [...document.querySelectorAll("h1, h2, h3")].map((h) => h.textContent.trim().slice(0, 100)).filter(Boolean).slice(0, 8);
  out.watermark = /apexcharts|highcharts\.com|trial|watermark/i.test([...document.querySelectorAll("text, a, div")].filter((e) => e.childElementCount === 0).map((e) => e.textContent).join(" ").slice(0, 200000).match(/(trial|watermark|apexcharts\s*$|highcharts\.com)/i)?.[0] ?? "");
  return out;
}

// ---------- contrast from pixels ----------
const lum = ([r, g, b]) => {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// The text's CSS color against the commonest other color under it (its background), so thin small glyphs and
// antialiasing don't lower the result; the text color is blended over that background when it is translucent
function cssContrast(png, box) {
  const counts = new Map();
  const [tr, tg, tb, ta] = box.color;
  for (let y = Math.max(0, box.y); y < Math.min(png.height, box.y + box.h); y++) {
    for (let x = Math.max(0, box.x); x < Math.min(png.width, box.x + box.w); x++) {
      const i = (y * png.width + x) * 4;
      const c = [png.data[i], png.data[i + 1], png.data[i + 2]];
      if (Math.abs(c[0] - tr) + Math.abs(c[1] - tg) + Math.abs(c[2] - tb) < 40) continue;
      const k = c.map((v) => v >> 2).join(",");
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  if (!counts.size) return null;
  const bg = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0].split(",").map((v) => (+v << 2) + 2);
  const a = (ta / 255) * (box.opacity ?? 1);
  const fg = [tr, tg, tb].map((v, i) => v * a + bg[i] * (1 - a));
  return ratio(fg, bg);
}
function pixelContrast(png, box) {
  const counts = new Map();
  const px = [];
  for (let y = Math.max(0, box.y); y < Math.min(png.height, box.y + box.h); y++) {
    for (let x = Math.max(0, box.x); x < Math.min(png.width, box.x + box.w); x++) {
      const i = (y * png.width + x) * 4;
      const c = [png.data[i], png.data[i + 1], png.data[i + 2]];
      px.push(c);
      const k = c.map((v) => v >> 3).join(",");
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  if (px.length < 20) return null;
  // The background is the commonest color; the text is the color farthest from it (the 1st percentile, against antialiasing)
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0].split(",").map((v) => (+v << 3) + 4);
  const d = px.map((c) => ratio(c, top)).sort((a, b) => b - a);
  return d[Math.floor(d.length * 0.01)];
}

// ---------- main ----------
export async function render(file, outDir, { widths = [1280, 390], browser: given } = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  const root = path.dirname(path.resolve(file));
  const server = http.createServer((q, r) => {
    const p = path.join(root, decodeURIComponent(new URL(q.url, "http://x").pathname));
    if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) return r.writeHead(404).end();
    r.writeHead(200, { "content-type": TYPES[path.extname(p)] ?? (p.endsWith(".html") ? "text/html" : "application/octet-stream") }).end(fs.readFileSync(p));
  }).listen(0, "127.0.0.1");
  await new Promise((r) => server.on("listening", r));
  const url = `http://127.0.0.1:${server.address().port}/${encodeURIComponent(path.basename(file))}`;
  const browser = given ?? await chromium.launch({ executablePath: process.env.RENDER_BROWSER });
  const result = { file, widths: {}, cdn: [], errors: [], failed: [] };
  try {
    for (const width of widths) {
      const context = await browser.newContext({ viewport: { width, height: width <= 600 ? 844 : 900 }, deviceScaleFactor: 1, reducedMotion: "reduce", isMobile: width <= 600, hasTouch: width <= 600 });
      const page = await context.newPage();
      const errors = [], failed = [];
      page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 300)));
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 300)); });
      page.on("requestfailed", (q) => failed.push(`${q.url().slice(0, 120)} ${q.failure()?.errorText ?? ""}`));
      await page.route("**/*", async (route) => {
        const u = route.request().url();
        if (u.startsWith("http://127.0.0.1")) return route.continue();
        try {
          const got = await serveCdn(u);
          if (got) {
            if (width === widths[0]) result.cdn.push({ url: u, served: got.source ?? got.body.toString().slice(0, 100), status: got.status });
            return route.fulfill({ status: got.status, contentType: got.type ?? "text/plain", body: got.body, headers: { "access-control-allow-origin": "*", ...(got.headers ?? {}) } });
          }
        } catch (e) {
          if (width === widths[0]) result.cdn.push({ url: u, error: e.message.slice(0, 200) });
          return route.fulfill({ status: 502, body: "mirror failed" });
        }
        // Every other host: fetched from Node, which goes through the sandbox's proxy and trusts its certificate
        try {
          const res = await route.fetch({ timeout: 8000, maxRedirects: 5 });
          return route.fulfill({ response: res });
        } catch (e) {
          return route.abort("internetdisconnected").catch(() => {});
        }
      });
      const t0 = Date.now();
      await page.goto(url, { waitUntil: "load", timeout: 30000 }).catch((e) => errors.push("load: " + e.message.slice(0, 200)));
      await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
      await page.evaluate(() => document.fonts?.ready).catch(() => {});
      await page.waitForTimeout(2500); // entry animations, even with reduced motion asked for
      const loadMs = Date.now() - t0;
      const scan = await page.evaluate(inPage);
      const shot = path.join(outDir, `shot-${width}.png`);
      await page.screenshot({ path: shot, fullPage: true });
      const png = PNG.sync.read(fs.readFileSync(shot));
      const low = [];
      for (const b of scan.textBoxes) {
        const c = b.color ? cssContrast(png, b) : pixelContrast(png, b);
        if (c == null) continue;
        const large = b.size >= 24 || (b.size >= 18.66 && b.bold);
        if (c < (large ? 3 : 4.5)) low.push({ t: b.t, contrast: +c.toFixed(2), size: b.size });
      }
      delete scan.textBoxes;
      scan.lowContrast = low;
      scan.loadMs = loadMs;
      scan.errors = errors;
      scan.failed = failed;
      result.widths[width] = scan;
      await context.close();
    }
  } finally {
    if (!given) await browser.close();
    server.close();
  }
  fs.writeFileSync(path.join(outDir, "scan.json"), JSON.stringify(result, null, 2));
  return result;
}

// A short verdict for tables: the problems a reader would hit
export function summarize(result) {
  const w = Object.values(result.widths);
  const sum = (f) => w.reduce((a, s) => a + f(s), 0);
  return {
    renders: w.every((s) => s.charts.length > 0) && !w.some((s) => s.errors.some((e) => !/favicon|Failed to load resource: the server responded with a status of 404/.test(e))),
    charts: Math.max(...w.map((s) => s.charts.length)),
    errors: [...new Set(w.flatMap((s) => s.errors))].length,
    sideways: w.filter((s) => s.sideways).map((s) => s.width),
    overlaps: sum((s) => s.overlapCount),
    cut: sum((s) => s.cut.length),
    tiny: sum((s) => s.tiny.length),
    lowContrast: sum((s) => s.lowContrast.length),
    canvas: Math.max(...w.map((s) => s.canvasCharts)),
    phoneHeight: result.widths[390]?.pageHeight,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [file, outDir] = process.argv.slice(2);
  const at = process.argv.indexOf("--widths");
  const widths = at > 0 ? process.argv[at + 1].split(",").map(Number) : undefined;
  const r = await render(file, outDir, { widths });
  console.log(JSON.stringify({ summary: summarize(r), cdn: r.cdn }, null, 1));
}
