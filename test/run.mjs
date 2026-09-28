// npm test builds the test pages and the gallery and checks them in Chromium with Playwright.
// Set CHROMIUM=/path/to/chrome to use a browser other than Playwright's.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import { chromium } from "playwright";
import { page as bundle, standalone, ssrServer, ssrClient, ssrPackage } from "../scripts/bundle.mjs";
import { build } from "esbuild";
const here = path.dirname(fileURLToPath(import.meta.url)), at = (f) => path.join(here, f);
fs.mkdirSync(at("out"), { recursive: true });
for (const t of ["core", "cost", "mount"]) {
  await bundle(at(t + ".jsx"), at(`out/${t}.js`));
  fs.writeFileSync(at(`out/${t}.html`), `<!doctype html><html><head><meta charset=utf-8></head><body><script src="${t}.js"></script></body></html>`);
}
await standalone(path.join(here, "../src/standalone.js"), at("out/standalone.js"));
await build({ entryPoints: [at("react.js")], outfile: at("out/react.js"), bundle: true, format: "iife", minify: true, logLevel: "warning",
  alias: { "@bezda/rhp/standalone": at("out/standalone.js") }, define: { "process.env.NODE_ENV": '"production"' } });
fs.writeFileSync(at("out/react.html"), '<!doctype html><html><head><meta charset=utf-8></head><body><script src="react.js"></script></body></html>');
// The server rendering app (test/ssr.jsx), built from src and from the published package
await ssrServer(at("ssr-server.jsx"), at("out/ssr-server.mjs"));
await ssrClient(at("ssr-client.jsx"), at("out/ssr-client.js"));
execFileSync("node", [path.join(here, "../scripts/build.mjs")], { stdio: "ignore" });
await ssrPackage(at("ssr-server.jsx"), at("out/ssr-dist-server.mjs"), "server");
await ssrPackage(at("ssr-client.jsx"), at("out/ssr-dist-client.js"), "browser");
const SSR = await import("file://" + at("out/ssr-server.mjs") + "?" + Date.now());
// A Solid app built by Vite (test/vite)
const VITE = JSON.parse(execFileSync("node", [at("vite/build.mjs")], { encoding: "utf8" }).trim().split("\n").at(-1));
const SSRD = await import("file://" + at("out/ssr-dist-server.mjs") + "?" + Date.now());
fs.writeFileSync(at("out/ssr.html"), SSR.page());
fs.writeFileSync(at("out/ssr-dist.html"), SSRD.page("ssr-dist-client.js"));
// The app with linkedCss, on a page that links dist/rhp.css and on one that forgets to
await ssrServer(at("ssr-linked.jsx"), at("out/ssr-linked-server.mjs"));
await ssrClient(at("ssr-linked.jsx"), at("out/ssr-linked-client.js"));
const SSRL = await import("file://" + at("out/ssr-linked-server.mjs") + "?" + Date.now());
fs.writeFileSync(at("out/ssr-linked.html"), SSRL.page());
fs.writeFileSync(at("out/ssr-unlinked.html"), SSRL.page(false));
// The gallery drawn on a server
await ssrServer(at("ssr-gallery.jsx"), at("out/ssr-gallery-server.mjs"));
await ssrClient(at("ssr-gallery.jsx"), at("out/ssr-gallery-client.js"));
const SSRG = await import("file://" + at("out/ssr-gallery-server.mjs") + "?" + Date.now());
fs.writeFileSync(at("out/ssr-gallery.html"), SSRG.page());
execFileSync("node", [path.join(here, "../examples/gallery/make.mjs")], { stdio: "inherit" });
const gallery = "file://" + path.join(here, "../examples/gallery/out/slat-gallery.html");

let failed = 0;
const check = (name, got, want) => {
  const ok = typeof want === "function" ? want(got) : JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `: got ${JSON.stringify(got)}, want ${typeof want === "function" ? want.toString() : JSON.stringify(want)}`}`);
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const open = async (url, opts = {}) => {
  const p = await browser.newPage({ viewport: { width: 900, height: 900 }, ...opts });
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.goto(url);
  await p.waitForTimeout(400);
  return p;
};

// Plot behavior (test/core.jsx)
{
  const p = await open("file://" + at("out/core.html"));
  const names = (sel) => p.evaluate((sel) => [...document.querySelectorAll(sel)].map((e) => e.dataset.name), sel);
  await p.evaluate(() => { window.cK = document.querySelector('.keyed > [data-name="C"]'); T.seen.keyed = []; T.seen.plain = []; T.setRows([{ name: "A", v: 10 }, { name: "C", v: 30 }]); });
  await p.waitForTimeout(600);
  check("key: a removed row takes its slat with it", await names(".keyed > *"), ["A", "C"]);
  check("key: the next row keeps its element", await p.evaluate(() => document.querySelector('.keyed > [data-name="C"]') === window.cK), true);
  check("key: the next row doesn't animate from the removed row's value", await p.evaluate(() => [...new Set(T.seen.keyed)]), ["A:10", "C:30"]);
  check("the longest list sets the slat count", await p.evaluate(() => document.querySelectorAll(".cnt").length), 5);
  check("data that arrives later draws", await p.evaluate(() => (T.setLate([3, 4, 5]), document.querySelectorAll(".late").length)), 3);
  const hid = () => p.evaluate(() => [...document.querySelectorAll(".hid")].map((e) => e.dataset.n + (e.hidden ? "(hidden)" : "@" + e.style.getPropertyValue("--rhp-position"))).join(" "));
  check("order: null hides a row", await hid(), "a@2 b(hidden) c@0 d@1");
  await p.evaluate(() => T.setPos([0, 1, 2, 3]));
  check("order: positions change", await hid(), "a@0 b@1 c@2 d@3");
  const c0 = await p.evaluate(() => T.computed);
  await p.evaluate(() => T.setVals("v", 1, 70)); await p.waitForTimeout(50);
  check("a computed group re-runs once for the one row that changed", (await p.evaluate(() => T.computed)) - c0, 1);
  check("computed values reach the blocks", await p.evaluate(() => [...document.querySelectorAll(".cmp .rhp-label")].map((e) => e.textContent).join(",")), "10,140,18");
  check("reorder=move puts the DOM in display order", await p.evaluate(() => [...document.querySelectorAll(".mv")].map((e) => e.textContent).join("")), "bca");
  check("sortBy keeps ties in data order", await p.evaluate(() => [...document.querySelectorAll(".tie")].map((e) => e.dataset.n + "@" + e.style.getPropertyValue("--rhp-position")).join(" ")), "a@1 b@2 c@0 d@3");
  await p.evaluate(() => T.setRows([{ name: "A", v: NaN }, { name: "C", v: 30 }])); await p.waitForTimeout(700);
  check("a NaN value doesn't keep the page clock running", await p.evaluate(async () => { const a = T.framesDrawn(); await new Promise((r) => setTimeout(r, 500)); return T.framesDrawn() - a; }), 0);
  const ticks = () => p.evaluate(() => [...document.querySelectorAll(".sc .tk")].map((e) => [+e.dataset.at, +e.dataset.next, e.dataset.end]));
  check("Scale: the Chart's scale in steps of 5, its ends included, with next, first and last", await ticks(),
    [[0, 5, "first"], [5, 10, ""], [10, 15, ""], [15, 20, ""], [20, 25, ""], [25, 27, ""], [27, 27, "last"]]);
  check("Scale: the Chart draws no axis of its own; one without a Scale does", await p.evaluate(() => [document.querySelectorAll(".sc .rhp-axis").length, document.querySelectorAll(".nosc .rhp-axis").length]), [0, 1]);
  await p.evaluate(() => { window.t25 = document.querySelector('.sc .tk[data-at="25"]'); T.setTop(30); });
  check("restyle: a slat type's slats restyle in place, a type made with the same CSS keeps its look, and no sheet is added", await p.evaluate(() => {
    const el = document.querySelector(".rs .r:not(.twin)"), twin = document.querySelector(".rs .twin"), n = document.adoptedStyleSheets.length;
    T.restyle(T.Red, ".r { color: rgb(0, 0, 255); }");
    return [getComputedStyle(el).color, document.querySelector(".rs .r:not(.twin)") === el, getComputedStyle(twin).color, document.adoptedStyleSheets.length - n];
  }), ["rgb(0, 0, 255)", true, "rgb(255, 0, 0)", 0]);
  check("restyle: half-typed CSS (a string a newline cuts short) still reaches nothing outside the slat", await p.evaluate(() => {
    T.restyle(T.Red, '.r { content: "x;\n} body { background: rgb(1, 2, 3); }');
    return getComputedStyle(document.body).backgroundColor;
  }), "rgba(0, 0, 0, 0)");
  check("Scale: a new max moves the ticks, and a tick keeps its slat", [(await ticks()).map((t) => t[0]).join(" "), await p.evaluate(() => document.querySelector('.sc .tk[data-at="25"]') === window.t25)], ["0 5 10 15 20 25 30", true]);
  check(":horizontal and :vertical match a slat root and what is inside it", await p.evaluate(() => [".or-h .o", ".or-v .o", ".or-h .inner", ".or-v .inner"].map((q) => getComputedStyle(document.querySelector(q)).color)),
    ["rgb(0, 128, 0)", "rgb(0, 0, 128)", "rgb(0, 128, 0)", "rgb(1, 2, 3)"]);
  check("--rhp-end-radius rounds a bar's value end, also for a bar that runs backward", await p.evaluate(() => [".or-h", ".or-v"].flatMap((c) =>
    [...document.querySelectorAll(c + " .b")].map((b) => { const s = getComputedStyle(b); return [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius].join(" "); }))),
    ["0px 7px 7px 0px", "7px 0px 0px 7px", "7px 7px 0px 0px", "0px 0px 7px 7px"]);
  check("--rhp-toward-end points a gradient at the value end", await p.evaluate(() => [".or-h", ".or-v"].flatMap((c) =>
    [...document.querySelectorAll(c + " .b")].map((b) => getComputedStyle(b).backgroundImage.match(/to \w+/)?.[0] ?? "to bottom"))), ["to right", "to left", "to top", "to bottom"]);
  check("--rhp-gap leaves room at a bar's from side", await p.evaluate(() => [".or-h", ".or-v"].flatMap((c) => {
    const plot = document.querySelector(c + " .rhp-plot").getBoundingClientRect(), [a, b] = [...document.querySelectorAll(c + " .b")].map((e) => e.getBoundingClientRect());
    return c === ".or-h" ? [Math.round(a.left - plot.left), Math.round(plot.right - b.right)] : [Math.round(plot.bottom - a.bottom), Math.round(b.top - plot.top)];
  })), [3, 3, 3, 3]);
  check("--rhp-label-gap spaces a label from its value", await p.evaluate(() => [getComputedStyle(document.querySelector(".or-h .l")).paddingLeft, getComputedStyle(document.querySelector(".or-v .l")).paddingBottom]), ["11px", "11px"]);
  check("a block's classList and class together", await p.evaluate(async () => {
    const b = document.querySelector(".kept .kb"), a = b.className;
    T.setLit(false); await new Promise((r) => setTimeout(r, 20));
    return [a, b.className];
  }), ["rhp-bar kb lit", "rhp-bar kb"]);
  check("an axis format can return elements", await p.evaluate(() => [...document.querySelectorAll(".kept .rhp-gridline .fmt")].map((e) => e.textContent).join(" ")), "0 5 10");
  check("slat CSS can place things by --rhp-p and --rhp-lo", await p.evaluate(() => {
    const dot = document.querySelector(".kept .rhp-dot"), pin = dot.querySelector(".pin"), from = document.querySelector(".kept .from"), bar = from.parentElement;
    const at = (e, box) => { const a = e.getBoundingClientRect(), b = box.getBoundingClientRect(); return Math.round(((a.left - b.left) / b.width) * 100) / 100; };
    return [at(pin, dot), at(from, bar)];
  }), [0.8, 0.2]);
  check("--rhp-radius with several lengths gets a warning", await p.evaluate(() => {
    const seen = []; const warn = console.warn; console.warn = (m) => seen.push(m);
    const R = T.slat({ css: ".x { --rhp-radius: 0 0 3px 3px; }" }, () => document.createElement("div"));
    T.restyle(R, ".x { --rhp-radius: 0 0 3px 3px; }"); T.restyle(R, ".x { --rhp-radius: calc(2px + 1px); }");
    console.warn = warn; return seen.length;
  }), 2);
  check("room auto: an edge Label inside another element gets a warning, once; a child of the row, or a Plot's own inside the row, gets none", await p.evaluate(() => {
    const seen = []; const warn = console.warn; console.warn = (m) => seen.push(m);
    const count = () => seen.filter((m) => m.includes("edge Label")).length;
    T.edges(T.Direct); T.edges(T.Inner);
    const before = count();
    T.edges(T.Wrapped); T.edges(T.Wrapped);
    console.warn = warn; return [before, count()];
  }), [0, 1]);
  check("a horizontal chart with a height fits rows without a thickness; without one, rows are 32px; a thickness stays", await p.evaluate(() =>
    [".fits .fit", ".grows .fit", ".keeps .fix"].map((q) => Math.round(document.querySelector(q).getBoundingClientRect().height))), [50, 32, 20]);
  const still = () => p.evaluate(() => [...document.querySelectorAll(".st .sr")].map((e) => e.dataset.n + e.querySelector(".rhp-label").textContent + "@" + e.style.getPropertyValue("--rhp-position") + ":" + e.querySelectorAll(".sd").length).join(" "));
  check("static: rows are drawn sorted, nested Plots included", await still(), "a5@1:2 b9@0:2");
  await p.evaluate(() => T.setStill([12, 3])); await p.waitForTimeout(50);
  check("static: when the Plot's data changes, its rows are drawn again", await still(), "a12@0:2 b3@1:2");
  const bar = () => document.querySelector(".paced .rhp-bar").style.getPropertyValue("--rhp-to");
  check("a change from a timer is written in the next frame, before it paints", await p.evaluate(async (bar) => {
    const read = new Function("return (" + bar + ")()");
    await new Promise((r) => setTimeout(r, 50)); T.setPaced(2); const now = read();
    await new Promise((r) => requestAnimationFrame(r)); return [now, read()];
  }, bar.toString()), ["1", "2"]);
  check("a change made in the app's own frame is written in that frame (after the first)", await p.evaluate(async (bar) => {
    const read = new Function("return (" + bar + ")()"), late = [];
    await new Promise((done) => { let v = 10; const f = () => { if (v > 10 && read() !== String(v - 1)) late.push(v - 1); if (v > 20) return done(); T.setPaced(v++); requestAnimationFrame(f); }; requestAnimationFrame(f); });
    return late.slice(1);
  }, bar.toString()), []);
  check("no page errors", p.errors, []);
  await p.close();
}

// No build step: a plain page that imports standalone.js and writes slats with html templates
{
  const p = await browser.newPage();
  p.errors = []; p.on("pageerror", (e) => p.errors.push(e.message));
  await p.route("http://rhp.test/**", (r) => {
    const f = new URL(r.request().url()).pathname.slice(1);
    if (f === "standalone.js") return r.fulfill({ path: at("out/standalone.js"), contentType: "text/javascript" });
    r.fulfill({ contentType: "text/html", body: `<!doctype html><meta charset="utf-8"><div id="app"></div><script type="module">
      import { Chart, Plot, Bar, Label, slat, sortBy, html, render, createSignal } from "./standalone.js";
      const [values, setValues] = createSignal([12, 18, 7]);
      window.setValues = setValues;
      const Row = slat({ css: ".bar { --rhp-end-radius: 6px; }" }, (d) => html\`<div>
        <\${Label} edge="start">\${() => d.name}<//>
        <\${Bar} class="bar" to=\${() => d.value} />
        <\${Label} at=\${() => d.value}>\${() => d.value}<//>
      </div>\`);
      render(() => html\`<\${Chart} scale=\${[0, 30]}>
        <\${Plot} name=\${["Apple", "Kiwi", "Lemon"]} value=\${values} order=\${sortBy("value", "desc")}>\${Row}<//>
      <//>\`, document.getElementById("app"));
    </script>` });
  });
  await p.goto("http://rhp.test/index.html"); await p.waitForTimeout(400);
  const rows = () => p.evaluate(() => [...document.querySelectorAll(".rhp-plot > *")].map((s) => s.textContent.replace(/\s+/g, "") + "@" + s.style.getPropertyValue("--rhp-position")).join(" "));
  check("no build step: html templates draw a chart, sorted", await rows(), "Apple12@1 Kiwi18@0 Lemon7@2");
  await p.evaluate(() => window.setValues([12, 18, 25])); await p.waitForTimeout(100);
  check("no build step: a signal passed as a data group updates the chart", await rows(), "Apple12@2 Kiwi18@1 Lemon25@0");
  check("no build step: slat CSS applies", await p.evaluate(() => getComputedStyle(document.querySelector(".bar")).borderTopRightRadius), "6px");
  check("no page errors", p.errors, []);
  await p.close();
}

// React charts with @bezda/rhp-react (test/react.js)
{
  const p = await open("file://" + at("out/react.html"));
  const rows = () => p.evaluate(() => [...document.querySelectorAll(".row")].map((r) => r.dataset.fruit + ":" + r.querySelector(".rhp-bar").style.getPropertyValue("--rhp-to")).join(" "));
  check("react: the chart draws once in StrictMode, in a div with the className", await p.evaluate(() => [document.querySelectorAll(".rhp-chart").length, document.querySelector(".card > .rhp-chart") != null]), [1, true]);
  check("react: its props reach the rows", await rows(), "Apples:12 Bananas:18 Cherries:7");
  const writes = await p.evaluate(async () => {
    const bars = [...document.querySelectorAll(".rhp-bar")], seen = [];
    const mo = new MutationObserver((ms) => ms.forEach((m) => seen.push(m.target.closest(".row").dataset.fruit)));
    document.querySelectorAll(".row").forEach((r) => mo.observe(r, { attributes: true, subtree: true, attributeFilter: ["style"] }));
    T.setSold([12, 25, 7]);
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r)));
    mo.disconnect();
    return { same: bars.every((b, i) => b === document.querySelectorAll(".rhp-bar")[i]), rows: [...new Set(seen)] };
  });
  check("react: a new number moves its bar only, and no element is made again", [await rows(), writes], ["Apples:12 Bananas:25 Cherries:7", { same: true, rows: ["Bananas"] }]);
  check("react: unmounting removes the chart", await p.evaluate(() => { T.hide(); return [document.querySelectorAll(".rhp-chart").length, !!document.getElementById("gone")]; }), [0, true]);
  check("no page errors", p.errors, []);
  await p.close();
}

// Update cost (test/cost.jsx): 1,000 slats per Plot, one value changed
{
  const p = await open("file://" + at("out/cost.html"));
  const ms = await p.evaluate(() => T.mount());
  const r = await p.evaluate(async () => {
    const mo = { plain: 0, store: 0 }, plots = document.querySelectorAll(".rhp-plot");
    const watch = (el, k) => new MutationObserver((rs) => (mo[k] += rs.length)).observe(el, { attributes: true, subtree: true, attributeFilter: ["style"] });
    watch(plots[0], "plain"); watch(plots[1], "store");
    T.runs.plain = 0; T.runs.store = 0;
    const next = T.plain().slice(); next[500] = 3; T.setPlain(next);
    T.setSt("v", 500, 3);
    await new Promise((r) => setTimeout(r, 50));
    return { runs: { ...T.runs }, writes: mo };
  });
  check("a plain array replaced: every slat re-runs, one style write", [r.runs.plain, r.writes.plain], [1000, 1]);
  check("a store item set: one slat re-runs, one style write", [r.runs.store, r.writes.store], [1, 1]);
  console.log(`     mount, 2 Plots x 1,000 slats: ${ms.toFixed(1)} ms`);
  await p.close();
}

// Mount cost (test/mount.jsx): 50 charts of 7 slats
{
  const p = await open("file://" + at("out/mount.html"));
  const ms = await p.evaluate(() => T.mount());
  const vt = await p.evaluate(async () => {
    const s = document.createElement("style");
    s.textContent = ".slat { view-transition-name: card }"; // 350 slats with one name (a duplicate name aborts a view transition)
    document.head.append(s);
    const t = document.startViewTransition(() => {});
    try { await t.finished; return "ran"; } catch (e) { return e.message; }
  });
  check("a page's view-transition-name on slat roots doesn't abort the page's view transition", vt, "ran");
  check("no page errors", p.errors, []);
  console.log(`     mount, 50 charts x 7 slats, with style and layout: ${ms.toFixed(1)} ms`);
  await p.close();
}

// The gallery in both orientations and animation versions, light and dark, on desktop and phone
{
  const p = await open(gallery, { viewport: { width: 1280, height: 900 } });
  await p.click("label:has(#motion-js)"); await p.waitForTimeout(200);
  const gaps = () => p.evaluate(() => {
    let worst = 0;
    for (const plot of document.querySelectorAll("#stacked .rhp-plot .rhp-plot")) {
      const r = [...plot.querySelectorAll(".rhp-bar")].map((e) => e.getBoundingClientRect()).filter((b) => b.width).sort((a, b) => a.left - b.left); // empty segments are skipped
      for (let i = 1; i < r.length; i++) {
        worst = Math.max(worst, Math.abs(r[i].left - r[i - 1].right - 2)); // the gap is 2px (--rhp-gap)
      }
    }
    return worst;
  });
  let worst = 0;
  await p.click("#new-data");
  for (let t = 0; t < 12; t++) {
    await p.waitForTimeout(40);
    worst = Math.max(worst, await gaps());
  }
  check("JS version: stacked segments keep their 2px gap while they move (px off)", +worst.toFixed(2), (w) => w < 0.5);
  check("no page errors", p.errors, []);
  await p.close();
  for (const scheme of ["light", "dark"]) for (const width of [1280, 390]) for (const motion of ["css", "js"]) {
    const q = await open(gallery, { viewport: { width, height: 900 }, colorScheme: scheme });
    if (motion === "js") { await q.click("label:has(#motion-js)"); await q.waitForTimeout(100); }
    const bad = [];
    for (const o of ["horizontal", "vertical", "horizontal"]) {
      await q.click(`label:has(#orient-${o})`); await q.waitForTimeout(700);
      bad.push(...await q.evaluate((o) => {
        const out = [];
        if (document.documentElement.scrollWidth > innerWidth) out.push(`${o}: page ${document.documentElement.scrollWidth}px wide`);
        for (const ch of document.querySelectorAll(".rhp-chart")) {
          const c = ch.getBoundingClientRect();
          for (const e of ch.querySelectorAll("*")) {
            const b = e.getBoundingClientRect();
            if (!b.width && !b.height) continue;
            // Things that only show on hover (tags, bubbles) are invisible at rest, so they don't count
            if (!e.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
            // Only the part that shows counts, since a slat can clip what it draws (a photo zoomed in its circle)
            let { left, top, right, bottom } = b;
            for (let a = e.parentElement; a !== ch; a = a.parentElement) {
              const s = getComputedStyle(a);
              if (s.overflowX === "visible" && s.overflowY === "visible") continue;
              const k = a.getBoundingClientRect();
              if (s.overflowX !== "visible") { left = Math.max(left, k.left); right = Math.min(right, k.right); }
              if (s.overflowY !== "visible") { top = Math.max(top, k.top); bottom = Math.min(bottom, k.bottom); }
            }
            if (right < left || bottom < top) continue;
            const name = e.localName + [...e.classList].map((x) => "." + x).join("");
            const past = { right: right - c.right, left: c.left - left, bottom: bottom - c.bottom, top: c.top - top };
            const side = Object.keys(past).reduce((a, k) => (past[k] > past[a] ? k : a));
            if (past[side] > 0.5) { // with enough detail to debug a rare failure from the log
              out.push(`${o}: ${ch.closest(".card").id} ${name} sticks out ${past[side].toFixed(1)}px on the ${side} (${[left, top, right, bottom].map(Math.round)} in ${[c.left, c.top, c.right, c.bottom].map(Math.round)})`);
              break;
            }
          }
        }
        return out;
      }, o));
    }
    check(`${scheme}, ${width}px, ${motion.toUpperCase()} version: nothing outside its chart or the page, after turning`, bad, []);
    check(`${scheme}, ${width}px, ${motion.toUpperCase()} version: no page errors`, q.errors, []);
    await q.close();
  }
}

// The gallery's interactions (pointer, clicks and keys) in both animation versions
for (const motion of ["css", "js"]) {
  const p = await open(gallery, { viewport: { width: 1280, height: 900 } });
  if (motion === "js") { await p.click("label:has(#motion-js)"); await p.waitForTimeout(100); }
  const M = motion.toUpperCase() + " version";
  const hover = async (sel) => { await p.hover(sel, { force: true }); await p.waitForTimeout(500); };
  const away = async () => { await p.mouse.move(0, 0); await p.waitForTimeout(500); };

  await hover("#segmented .charge.games >> nth=0");
  check(`${M}, battery: pointing at an app lights it in every battery and fades the others`, await p.evaluate(() => ({
    on: [...document.querySelectorAll("#segmented .charge.on")].map((e) => e.dataset.app).join(),
    off: document.querySelectorAll("#segmented .charge.off").length,
    keys: [...document.querySelectorAll("#segmented .keys button.off")].map((e) => e.dataset.app).join(),
  })), { on: "Games,Games,Games,Games", off: 16, keys: "Video,Social,Music,Maps" });
  const lit = () => p.evaluate(() => [...document.querySelectorAll("#segmented .charge.on")].map((e) => e.dataset.app).join());
  await p.focus('#segmented .keys button[data-app="Maps"]'); await p.keyboard.press("Enter"); await p.waitForTimeout(300);
  check(`${M}, battery: Enter on a key pins its app, over the app a still pointer is on`, await lit(), "Maps,Maps,Maps,Maps");
  await away();
  check(`${M}, battery: a pinned app stays when the pointer leaves`, [await lit(), await p.evaluate(() => document.querySelector('#segmented button[data-app="Maps"]').getAttribute("aria-pressed"))], ["Maps,Maps,Maps,Maps", "true"]);
  await p.keyboard.press("Enter"); await p.waitForTimeout(300);
  check(`${M}, battery: Enter again unpins it`, await p.evaluate(() => document.querySelectorAll("#segmented :is(.charge.on, .charge.off)").length), 0);

  const budget = () => p.evaluate(() => {
    const out = document.querySelector('#waterfall .step[data-line="5"]').getBoundingClientRect();
    return { saved: document.querySelector("#waterfall .dek b").textContent, out: Math.round(out.width), pressed: document.querySelector('#waterfall button[data-line="5"]').getAttribute("aria-pressed") };
  });
  const before = await budget();
  await p.click('#waterfall button[data-line="5"]'); await p.waitForTimeout(700);
  const cut = await budget();
  check(`${M}, budget: clicking an expense cuts it, and the savings grow by what it cost`,
    [cut.saved, cut.out, cut.pressed], ["£1,820", 0, "true"]);
  await p.focus('#waterfall button[data-line="5"]'); await p.keyboard.press("Enter"); await p.waitForTimeout(700);
  check(`${M}, budget: Enter on it brings it back`, await budget(), before);

  await hover('#violin [data-instrument="3"] .median');
  check(`${M}, strings: pointing at an instrument lights the keys it reaches, and names its lowest and highest`, await p.evaluate(() => {
    const lit = [...document.querySelectorAll("#violin .rhp-scale > .lit")], names = [...document.querySelectorAll("#violin .rhp-scale .c")].map((e) => e.textContent);
    return lit.length > 20 && lit.length < 45 && names.length === 2 && document.querySelectorAll('#violin [data-instrument].off').length === 3;
  }), true);
  await away();
  check(`${M}, strings: leaving puts the C's back`, await p.evaluate(() => [document.querySelectorAll("#violin .rhp-scale > .lit").length, [...document.querySelectorAll("#violin .rhp-scale .c")].map((e) => e.textContent).join()]),
    [0, "C2,C3,C4,C5,C6,C7"]);

  await hover("#gantt .row .job >> nth=1");
  check(`${M}, gantt: a trade under the today line still takes the pointer`, await p.evaluate(() =>
    [...document.querySelectorAll("#gantt .weeks")].filter((e) => getComputedStyle(e).visibility === "visible").length), 1);
  await away();

  await hover('#candles [data-day="4"] .wick');
  check(`${M}, candles: a day under the pointer gets a line at its close, its price and the readout`, await p.evaluate(() => {
    const body = document.querySelector('#candles [data-day="4"] .body').getBoundingClientRect(), cross = document.querySelector("#candles .cross").getBoundingClientRect();
    const h = document.querySelector("#candles .rhp-chart").dataset.rhpO === "h"; // the close is one end of the body
    const ends = h ? [body.left, body.right] : [body.top, body.bottom], at = h ? cross.left + cross.width / 2 : cross.top + cross.height / 2;
    return [document.querySelector("#candles .ohlc b").textContent, Math.min(...ends.map((x) => Math.abs(x - at))) < 1.5];
  }), ["Day 5", true]);
  await away();
  check(`${M}, candles: leaving drops the line and reads the latest day`, await p.evaluate(() => [document.querySelectorAll("#candles .cross").length, document.querySelector("#candles .ohlc b").textContent]), [0, "Day 22"]);

  const wave = () => p.evaluate(() => [...document.querySelectorAll("#stem .swing")].map((e) => e.style.getPropertyValue("--rhp-to")).join());
  const w0 = await wave();
  await p.click("#stem .strike"); await p.waitForTimeout(100);
  check(`${M}, bell: clicking strikes it again`, (await wave()) !== w0, true);
  check(`${M}: no page errors`, p.errors, []);
  await p.close();
}

// The v1 replicas in the gallery (fruit bars, box and whisker, animated dots)
{
  const p = await open(gallery, { viewport: { width: 1280, height: 900 } });
  check("v1 replicas: all 14 images load", await p.evaluate(async () => {
    const imgs = [...document.querySelectorAll("#fruit img, #clouds img")];
    await Promise.all(imgs.map((i) => i.decode().catch(() => {})));
    return [imgs.length, imgs.filter((i) => !i.naturalWidth).map((i) => i.alt)];
  }), [14, []]);

  // Where v1's demos draw the top row and the scale, measured in Chromium at 1088px wide.
  // Each is [x, y, width, height] from the plot's corner, or [x, y] where a text starts.
  const V1 = {
    fruit: { bar: [112, 48, 944, 62.84], img: [112, -70.58, 300, 300], value: [1064, 69.67], name: [31.75, 67.42, 48.5, 24],
      "mark 0": [108, 24, 4], "mark 5": [300.8, 24, 4], "mark 25": [1056, 24, 4], "num 5": [308.8, 20] },
    clouds: { box: [803.53, 48, 212.27, 62.84], "cap 0": [626.66, 70, 4, 18.84], "cap 1": [1051.17, 70, 4, 18.84], circle: [16.58, 48, 62.84, 62.84],
      value: [1059.17, 68.67], "mark 0": [92, 24, 4], "mark 5": [272.88, 24, 4, 13], "mark 27": [1051.2, 24, 4], "num 5": [280.88, 20] },
  };
  await p.addStyleTag({ content: "#fruit .rhp-chart, #clouds .v1-card { width: 1088px !important; }" });
  await p.waitForTimeout(100);
  const off = [];
  for (const [id, root] of [["fruit", "#fruit .rhp-chart"], ["clouds", "#clouds .v1-card"]]) {
    const got = await p.evaluate((root) => {
      const o = document.querySelector(root).getBoundingClientRect();
      const box = (e) => { const b = e.getBoundingClientRect(); return [b.left - o.left, b.top - o.top, b.width, b.height]; };
      // For text we measure the glyphs, since v1 measured fit-content boxes
      const text = (e) => { const r = document.createRange(); r.selectNodeContents(e); const t = r.getBoundingClientRect(), b = box(e); return [t.left - o.left, b[1], t.width, b[3]]; };
      const [scale, rows] = document.querySelectorAll(root + " .rhp-body > .rhp-plot");
      const top = [...rows.children].find((s) => s.style.getPropertyValue("--rhp-position") === "0");
      const out = { value: text(top.querySelector(".value")) };
      const name = top.querySelector(".name"), img = top.querySelector(".bar > img");
      if (name) out.name = text(name);
      if (img) out.img = box(img);
      for (const c of ["bar", "box", "circle"]) {
        if (top.querySelector("." + c)) out[c] = box(top.querySelector("." + c));
      }
      top.querySelectorAll(".cap").forEach((e, i) => (out["cap " + i] = box(e)));
      for (const s of scale.children) {
        out["mark " + s.textContent] = box(s.querySelector(".mark"));
        out["num " + s.textContent] = text(s.querySelector(".num"));
      }
      return out;
    }, root);
    for (const [k, want] of Object.entries(V1[id])) {
      const g = got[k]?.slice(0, want.length);
      if (!g || want.some((v, i) => Math.abs(g[i] - v) > 1)) off.push(`${id} ${k}: got ${g?.map((v) => +v.toFixed(2))}, v1 ${want}`);
    }
  }
  check("v1 replicas: the top rows and scales sit where v1 draws them, within 1px", off, []);

  // The scale's end line stays at the end while the max changes, also when the new max lands on a tick
  for (const motion of ["css", "js"]) {
    if (motion === "js") await p.click("label:has(#motion-js)");
    const drift = await p.evaluate(async () => {
      const input = document.querySelector("#fruit .slider input"), body = document.querySelector("#fruit .rhp-body");
      const set = (v) => { input.value = v; input.dispatchEvent(new Event("input", { bubbles: true })); };
      let worst = 0;
      for (const [from, to] of [[29, 31], [31, 29], [31, 30], [26, 25], [30, 31], [25, 26]]) {
        set(from); await new Promise((r) => setTimeout(r, 600));
        set(to);
        for (let f = 0; f < 36; f++) {
          await new Promise((r) => requestAnimationFrame(r));
          const end = document.querySelector("#fruit .rhp-scale .end .mark");
          worst = Math.max(worst, Math.abs(end.getBoundingClientRect().left - body.getBoundingClientRect().right));
        }
      }
      set(1); // v1's value again
      return +worst.toFixed(1);
    });
    check(`Scale, ${motion.toUpperCase()} version: the end line never leaves the end while the max changes (px)`, drift, (w) => w <= 1);
  }
  await p.click("label:has(#motion-css)");
  await p.waitForTimeout(600);

  // While the JS version moves the scale, no line is drawn past the end and none is missing inside it
  await p.click("label:has(#motion-js)");
  const lines = await p.evaluate(async () => {
    const input = document.querySelector("#fruit .slider input"), chart = document.querySelector("#fruit .rhp-chart");
    const set = (v) => { input.value = v; input.dispatchEvent(new Event("input", { bubbles: true })); };
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    const out = { past: 0, missing: 0, axis: 0 };
    for (const [from, to] of [[25, 60], [60, 25]]) {
      set(from); await new Promise((r) => setTimeout(r, 700));
      set(to);
      for (let f = 0; f < 30; f++) {
        await frame();
        const max = +chart.style.getPropertyValue("--rhp-max"), end = chart.querySelector(".rhp-body").getBoundingClientRect().right;
        const marks = [...chart.querySelectorAll(".rhp-scale > :not(.end)")].map((s) => ({ v: +s.querySelector(".num").textContent, x: s.querySelector(".mark").getBoundingClientRect().left }));
        if (marks.some((m) => m.x > end + 0.5)) out.past++;
        for (let v = 5; v < max - 0.5; v += 5) {
          if (!marks.some((m) => m.v === v)) {
            out.missing++;
            break;
          }
        }
      }
    }
    set(1);
    for (let k = 0; k < 4; k++) {
      document.querySelector("#new-data").click();
      for (let f = 0; f < 30; f++) {
        await frame();
        for (const id of ["grouped", "stacked"]) {
          const b = document.querySelector(`#${id} .rhp-body`).getBoundingClientRect();
          if ([...document.querySelectorAll(`#${id} .rhp-gridline`)].some((g) => { const x = g.getBoundingClientRect().left; return x > b.right + 0.5 || x < b.left - 0.5; })) out.axis++;
        }
      }
    }
    return out;
  });
  check("JS version, while the scale moves: frames with a line past the end, with a line missing, with an axis line outside", [lines.past, lines.missing, lines.axis], [0, 0, 0]);

  // A steady drag moves a bar steadily in the JS version (restarting the easing at every input made it pulse)
  const pulses = await p.evaluate(async () => {
    const input = document.querySelector("#fruit .slider input");
    const set = (v) => { input.value = v; input.dispatchEvent(new Event("input", { bubbles: true })); };
    const bar = document.querySelector("#fruit .rhp-body > .rhp-plot:last-child > * .bar");
    set(12); await new Promise((r) => setTimeout(r, 900));
    const w = [];
    for (let v = 12; v <= 24; v++) {
      for (let k = 0; k < 3; k++) {
        set(v);
        await new Promise((r) => requestAnimationFrame(r));
        w.push(bar.getBoundingClientRect().width);
      }
    }
    const speed = w.slice(1).map((x, i) => x - w[i]);
    let n = 0;
    for (let i = 2; i < speed.length; i++) {
      if (speed[i - 1] < speed[i - 2] * 0.25 && speed[i] > Math.max(0.5, speed[i - 1] * 2)) n++;
    }
    set(1);
    return n;
  });
  check("JS version: a steady drag never makes the bar's speed collapse and recover", pulses, 0);
  await p.click("label:has(#motion-css)");
  await p.waitForTimeout(600);

  // On a narrow chart, a number on v1's scale hides only when it would touch the end mark
  const narrow = await p.addStyleTag({ content: "#fruit .rhp-chart { width: 560px !important; }" });
  for (const o of ["horizontal", "vertical"]) {
    await p.click(`label:has(#orient-${o})`); await p.waitForTimeout(400);
    const labels = await p.evaluate(async (h) => {
      const input = document.querySelector("#fruit .slider input"), chart = document.querySelector("#fruit .rhp-chart");
      const set = (v) => { input.value = v; input.dispatchEvent(new Event("input", { bubbles: true })); };
      const out = { touching: [], hiddenWithRoom: [] };
      for (let v = 21; v <= 62; v++) {
        set(v); await new Promise((r) => setTimeout(r, 220)); // the CSS version settles in .15s
        const end = chart.querySelector(".rhp-scale .end .mark").getBoundingClientRect();
        for (const n of chart.querySelectorAll(".rhp-scale :is(.line, .tick) > .num")) {
          const range = document.createRange(); range.selectNodeContents(n);
          // A crowded number is clipped to no size, so it counts as hidden
          const t = range.getBoundingClientRect(), box = n.getBoundingClientRect(), cs = getComputedStyle(n);
          const inner = h ? box.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) : box.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
          const shown = n.checkVisibility({ visibilityProperty: true, opacityProperty: true }) && inner > 0.5 ? 1 : 0;
          // The room between the number's text and the end mark, where the text would be if it showed
          const room = h ? end.left - t.right : box.bottom - n.scrollHeight - end.bottom;
          if (shown > 0 && room < 0) out.touching.push(`${v}: ${n.textContent}`);
          if (shown < 1 && room > 12) out.hiddenWithRoom.push(`${v}: ${n.textContent}`);
        }
      }
      set(1);
      return out;
    }, o === "horizontal");
    check(`v1 scale, narrow chart, ${o}: a number hides only when it would touch the end mark`, labels, { touching: [], hiddenWithRoom: [] });
  }
  await p.click("label:has(#orient-horizontal)"); await p.waitForTimeout(400);
  await narrow.evaluate((e) => e.remove());

  // A value takes as long to move in the JS version as in the CSS version (150 ms by default)
  const settle = {};
  for (const motion of ["css", "js"]) {
    await p.click(`label:has(#motion-${motion})`); await p.waitForTimeout(400);
    settle[motion] = await p.evaluate(async () => {
      const input = document.querySelector("#fruit .slider input");
      const set = (v) => { input.value = v; input.dispatchEvent(new Event("input", { bubbles: true })); };
      const frame = () => new Promise((r) => requestAnimationFrame(r));
      const bar = [...document.querySelectorAll("#fruit .slat")].find((s) => s.querySelector(".name")?.textContent === "Fruit A").querySelector(".bar");
      set(5); await new Promise((r) => setTimeout(r, 500));
      let last = bar.getBoundingClientRect().width, moved = 0;
      set(60);
      const t0 = performance.now();
      for (let f = 0; f < 45; f++) {
        await frame();
        const w = bar.getBoundingClientRect().width;
        if (Math.abs(w - last) > 0.01) { last = w; moved = performance.now() - t0; }
      }
      set(1);
      return Math.round(moved);
    });
  }
  check("JS version: a value moves as fast as in the CSS version (ms until it settles)", settle,
    (t) => t.css >= 100 && t.css <= 220 && t.js >= 100 && t.js <= 220 && Math.abs(t.js - t.css) <= 40);
  console.log(`     a value settles in: CSS version ${settle.css} ms, JS version ${settle.js} ms`);
  await p.click("label:has(#motion-css)");
  await p.waitForTimeout(600);

  // Each row's whole dots (lit or not), and whether its window shows a hole wider than the 8px between dots
  const look = () => p.evaluate(() => [...document.querySelectorAll("#dots .rhp-body > .rhp-plot > *")].map((row) => {
    const w = row.getBoundingClientRect();
    const d = [...row.querySelectorAll(".rhp-dot")].map((e) => ({ b: e.getBoundingClientRect(), lit: getComputedStyle(e).backgroundColor === "rgb(242, 204, 143)" }))
      .sort((a, b) => a.b.left - b.b.left);
    let hole = !d.length || d[0].b.left - w.left > 4.5 || w.right - d.at(-1).b.right > 4.5;
    for (let i = 1; i < d.length; i++) {
      if (d[i].b.left > w.left && d[i - 1].b.right < w.right) hole ||= d[i].b.left - d[i - 1].b.right > 8.5;
    }
    const shown = d.filter((x) => x.b.right > w.left && x.b.left < w.right), whole = shown.filter((x) => x.b.left >= w.left - 0.5 && x.b.right <= w.right + 0.5);
    return { lit: whole.map((x) => (x.lit ? "#" : ".")).join(""), hole, x: shown[0]?.b.left - w.left, size: [shown[0]?.b.width, shown[1]?.b.left - shown[0]?.b.left] };
  }));
  await p.hover("#dots .dots-window"); await p.waitForTimeout(600); // hovering holds the logo still
  const rest = await look();
  await p.mouse.move(0, 0); // leaving starts the cycle again
  check("v1 dots: v1's logo, 11 whole dots by 9 rows, 52px dots 60px apart", [rest.map((r) => r.lit), rest[0].size.map((v) => +v.toFixed(2))],
    [["...........", "....#......", "....#......", ".##.##..##.", "#...#.#.#.#", "#...#.#.##.", "........#..", "........#..", "..........."], [52, 60]]);
  // The rows scatter or come back every 5 s, so we sample one change in each animation version
  for (const motion of ["css", "js"]) {
    if (motion === "js") await p.click("label:has(#motion-js)");
    const still = JSON.stringify((await look()).map((r) => Math.round(r.x)));
    let samples = 0, between = 0, holes = 0;
    for (const end = Date.now() + 6000; Date.now() < end && !samples; ) {
      if (JSON.stringify((await look()).map((r) => Math.round(r.x))) !== still) samples = 1;
    }
    for (const end = Date.now() + 700; Date.now() < end; samples++) {
      const rows = await look();
      if (rows.some((r) => r.hole)) holes++;
      if (rows.some((r) => Math.abs(r.x - 4) > 0.5)) between++;
    }
    check(`v1 dots, ${motion.toUpperCase()} version: rows moved, and no frame shows a hole in the window`, [between > 0, holes], [true, 0]);
  }
  check("no page errors", p.errors, []);
  await p.close();
}

// The page's charts as a string, to compare two drawings of the same app. It sorts attributes, merges adjacent text
// and leaves out what differs between a server and a browser (hydration keys, server CSS, generated ids).
const dom = (p, charts) => p.evaluate((charts) => {
  const ids = (v) => v.replace(/rhp-[\w-]+?-(\d+)(?=\s|$)/g, "rhp-#-$1");
  const out = (n) => {
    if (n.nodeType === 3) return n.previousSibling?.nodeType === 3 ? "" : ((t) => (t.trim() ? JSON.stringify(t) : ""))(
      (function all(x) { return x && x.nodeType === 3 ? x.textContent + all(x.nextSibling) : ""; })(n));
    if (n.nodeType !== 1 || (n.localName === "style" && n.hasAttribute("data-rhp-server"))) return "";
    const attrs = [...n.attributes].filter((a) => a.name !== "data-hk").map((a) => {
      if (a.name === "style") return "style=" + [...n.style].map((k) => k + ":" + n.style.getPropertyValue(k)).sort().join(";");
      if (a.name === "class") return "class=" + a.value.split(/\s+/).filter(Boolean).sort().join(" ");
      return a.name + "=" + ids(a.value);
    }).sort();
    return `<${n.localName} ${attrs.join(" ")}>${[...n.childNodes].map(out).join("")}</${n.localName}>`;
  };
  return charts ? [...document.querySelectorAll(".rhp-chart")].map(out).join("") : out(document.querySelector("main"));
}, charts);

// Server rendering (test/ssr.jsx): the server's HTML and the hydrated page look exactly like the browser's drawing
{
  const url = "file://" + at("out/ssr.html"), shot = (p) => p.locator("main").screenshot({ animations: "disabled" });
  // NOTE: Text isn't merged here like in the gallery test below, since merging breaks Solid's text nodes for updates
  const server = await open(url + "?wait"); // ?wait holds the script back, so the page shows the server's HTML only
  const count = (p) => p.evaluate(() => ["main *", ".rhp-bar", ".rhp-plot > *", "style[data-rhp-server]"].map((q) => document.querySelectorAll(q).length));
  const before = await count(server), serverShot = await shot(server);
  check("server: each chart brings its slats' CSS, and rhp's core comes once per page", await server.evaluate(() => {
    const st = [...document.querySelectorAll("style[data-rhp-server]")];
    return [st.length, st.filter((s) => s.textContent.includes("@layer rhp.place, rhp.slat, rhp.core;")).length, st.some((s) => s.textContent.includes('[data-rhp-slat="'))];
  }), [await server.evaluate(() => document.querySelectorAll(".rhp-chart").length), 1, true]);
  await server.evaluate(() => { window.firstBar = document.querySelector("#fruit .rhp-bar"); window.go(); });
  await server.waitForTimeout(300);
  const after = await count(server), hydratedShot = await shot(server);
  const fresh = await open(url + "#fresh"), freshShot = await shot(fresh);
  check("server: the HTML draws every chart before any script runs", before.slice(1, 3), (b) => b[0] >= 20 && b[1] >= 20);
  check("server: the HTML looks exactly like the app drawn in the browser alone", Buffer.compare(serverShot, freshShot), 0);
  check("server: taken over, the page keeps the server's elements (none drawn twice) and drops the server's CSS", [after[0] - before[0] + before[3], after[1], after[3], await server.evaluate(() => document.querySelector("#fruit .rhp-bar") === window.firstBar)], [0, before[1], 0, true]);
  check("server: taken over, it still looks the same", Buffer.compare(hydratedShot, freshShot), 0);
  check("server: taken over, the page's elements are exactly those the browser draws alone (none matched out of order)", await dom(server) === await dom(fresh), true);
  await server.evaluate(() => window.setSold([30, 1, 2, 3])); await server.waitForTimeout(400);
  check("server: taken over, the chart follows its data", await server.evaluate(() => [...document.querySelectorAll("#fruit .fruit")].map((e) => e.querySelector(".value").textContent + "@" + e.style.getPropertyValue("--rhp-position"))), ["30@0", "1@3", "2@2", "3@1"]);
  check("server: no page errors, and no hydration warnings", [...server.errors, ...fresh.errors], []);
  for (const p of [server, fresh]) await p.close();
}

// Server rendering in Node: the published package and the other ways to render
{
  check("server package: Node loads @bezda/rhp's server build, and it writes the same HTML as the source", SSRD.html() === SSR.html(), true);
  check("server package: the browser build carries no server code, and the server build no browser blocks",
    [/onRoot|serverSheets|withVars/.test(fs.readFileSync(path.join(here, "../dist/index.js"), "utf8")), /getNextElement|\binsert\(/.test(fs.readFileSync(path.join(here, "../dist/server.js"), "utf8"))], [false, false]);
  const core = (h) => h.split("@layer rhp.place, rhp.slat, rhp.core;").length - 1;
  check("server: two renders (two islands) each bring rhp's core, once", [core(SSR.html()), core(SSR.html())], [1, 1]);
  check("server: renderToStringAsync writes the same HTML", await SSR.htmlAsync(), SSR.html());
  const plain = SSR.plain();
  check("server: without hydration keys, the charts are all there", [/data-hk/.test(plain), (plain.match(/class="rhp-bar/g) ?? []).length], [false, (SSR.html().match(/class="rhp-bar/g) ?? []).length]);
  let err = "";
  try { SSR.bad(); } catch (e) { err = e.message; }
  check("server: a slat that returns text is an error that says so", err, "rhp: a slat must return one element");
}

// Details of the server's HTML that a screenshot can't show
{
  const p = await open("file://" + at("out/ssr.html") + "?wait");
  check("server HTML: slat CSS with &, > and quotes applies as written", await p.evaluate(() => {
    const t = document.querySelector("#themed .t");
    return [getComputedStyle(t.querySelector(".in")).fontFamily, getComputedStyle(t, "::after").content];
  }), ['"Tricky & Co", serif', '"&<>"']);
  check("server HTML: a slat root keeps its own style next to its position", await p.evaluate(() => {
    const t = document.querySelectorAll("#themed .t")[1];
    return [t.style.getPropertyValue("--own"), t.style.getPropertyValue("--rhp-position")];
  }), ["8", "1"]);
  check("server HTML: a block keeps a style given as text next to its values, and a backward bar is marked", await p.evaluate(() => {
    const b = document.querySelector("#themed .back");
    return [getComputedStyle(b).opacity, b.style.getPropertyValue("--rhp-to"), b.hasAttribute("data-rhp-back")];
  }), ["0.9", "-4", true]);
  check("server HTML: the theme (a Theme around it and its own) and the page's class reach the chart", await p.evaluate(() => {
    const c = document.getElementById("themed");
    return [c.classList.contains("page-class"), c.style.getPropertyValue("--rhp-series-1"), c.style.getPropertyValue("--rhp-muted"), c.style.getPropertyValue("--rhp-ink")];
  }), [true, "rgb(200, 30, 90)", "rgb(1, 2, 3)", "rgb(10, 20, 30)"]);
  check("server HTML: a row whose position is null is hidden", await p.evaluate(() => [...document.querySelectorAll("#move .hid")].map((e) => e.dataset.n + (e.hidden ? ":hidden" : ""))), ["h1:hidden", "h2"]);
  check("server HTML: reorder=move writes the rows in display order", await p.evaluate(() => [...document.querySelectorAll("#move .mv")].map((e) => e.textContent)), ["b", "d", "c", "a"]);
  check("server HTML: the JS version starts where the data is", await p.evaluate(() => [...document.querySelectorAll("#anim .rhp-bar")].map((b) => b.style.getPropertyValue("--rhp-to"))), ["5", "15", "10"]);
  await p.close();
}

// The published package end to end
{
  const url = "file://" + at("out/ssr-dist.html"), shot = (p) => p.locator("main").screenshot({ animations: "disabled" });
  const server = await open(url + "?wait"), serverShot = await shot(server), n = await server.evaluate(() => document.querySelectorAll("main *:not(style)").length);
  await server.evaluate(() => window.go()); await server.waitForTimeout(300);
  const fresh = await open(url + "#fresh");
  check("server package: its HTML, taken over, looks like the app drawn in the browser alone, with the same elements",
    [Buffer.compare(serverShot, await shot(fresh)), Buffer.compare(await shot(server), await shot(fresh)), await server.evaluate(() => document.querySelectorAll("main *:not(style)").length) - n], [0, 0, 0]);
  await server.evaluate(() => window.setSold([30, 1, 2, 3])); await server.waitForTimeout(400);
  check("server package: taken over, the chart follows its data", await server.evaluate(() => document.querySelector("#fruit .fruit .value").textContent), "30");
  check("server package: no page errors", [...server.errors, ...fresh.errors], []);
  for (const p of [server, fresh]) await p.close();
}

// The whole gallery drawn on a server (test/ssr-gallery.jsx), compared plot by plot with the browser's drawing
{
  const url = "file://" + at("out/ssr-gallery.html");
  // NOTE: A server writes "86%" as one text node where a browser makes "86" and "%", and Chromium kerns the two a
  // pixel apart, so we merge the text first. The pointer stays outside the plots, and the examples' timers are stopped.
  const shots = async (p) => {
    await p.mouse.move(795, 5);
    await p.evaluate(() => document.body.normalize());
    const out = {}; for (const el of await p.locator("section.plot").all()) out[await el.getAttribute("data-plot")] = await el.screenshot({ animations: "disabled" }); return out;
  };
  // Each view gets its own page, since a page scrolled through twice draws a dotted underline a shade off
  const still = { viewport: { width: 800, height: 900 } };
  const alone = await browser.newPage(still), server = await browser.newPage(still), fresh = await browser.newPage(still);
  for (const p of [alone, server, fresh]) {
    p.errors = [];
    p.on("pageerror", (e) => p.errors.push(e.message));
    await p.addInitScript(() => { window.setInterval = () => 0; });
  }
  await alone.goto(url + "?wait"); await alone.waitForTimeout(300);
  const fromServer = await shots(alone);
  await server.goto(url + "?wait"); await server.waitForTimeout(300);
  await server.evaluate(() => window.go()); await server.waitForTimeout(500);
  const taken = await shots(server);
  await fresh.goto(url + "#fresh"); await fresh.waitForTimeout(500);
  const want = await shots(fresh);
  const differ = (a) => Object.keys(want).filter((k) => !a[k] || Buffer.compare(a[k], want[k]) !== 0);
  check("server gallery: every plot, three ways, is drawn", Object.keys(want).length, SSRG.plots());
  check("server gallery: the server's HTML alone looks like the browser's drawing, plot by plot", differ(fromServer), []);
  check("server gallery: taken over, every plot looks the same", differ(taken), []);
  check("server gallery: taken over, the charts' elements are exactly those the browser draws alone", await dom(server, true) === await dom(fresh, true), true);
  check("server gallery: no page errors", [...alone.errors, ...server.errors, ...fresh.errors], []);
  for (const p of [alone, server, fresh]) await p.close();
}

// Auto gutters, the room to the end, and slat roots of every kind, in the server's HTML
{
  const p = await open("file://" + at("out/ssr.html") + "?wait");
  const g = (id) => p.evaluate((id) => {
    const c = document.getElementById(id), body = c.querySelector(".rhp-body"), track = c.querySelector(".rhp-bar").getBoundingClientRect();
    const r = (e) => e.getBoundingClientRect(), names = [...c.querySelectorAll(".nm")], ends = [...c.querySelectorAll(".pct")];
    return { gutters: c.hasAttribute("data-rhp-gutters"), start: Math.round(track.left - r(body).left), end: Math.round(r(body).right - (c.querySelector(".rhp-axis") ? r(c.querySelector(".rhp-axis")).right : track.right)),
      widest: Math.max(...names.map((e) => e.scrollWidth)), clipped: names.map((e) => e.scrollWidth > e.clientWidth), endWidest: Math.max(0, ...ends.map((e) => e.scrollWidth)),
      aligned: names.every((e) => Math.round(r(e).right) === Math.round(track.left)) };
  }, id);
  const auto = await g("auto");
  check("gutters auto: the start gutter is as wide as the widest name, which isn't cut, and every name ends at the track",
    [auto.gutters, auto.start === auto.widest, auto.clipped.some(Boolean), auto.aligned], [true, true, false, true]);
  check("gutters auto: the end gutter is as wide as the widest share", auto.end, auto.endWidest);
  const capped = await g("capped");
  check("gutters auto: a slat's CSS caps its names (max-width: 60px), and the gutter follows; a fixed end stays 30px",
    [capped.start, capped.clipped[1], capped.end], [60, true, 30]);
  check("gutters auto, vertical: names under the columns wrap in the slat's CSS, and the gutter below is as tall as the tallest", await p.evaluate(() => {
    const c = document.getElementById("auto-v"), names = [...c.querySelectorAll(".nm")], body = c.querySelector(".rhp-body").getBoundingClientRect();
    const bar = c.querySelector(".rhp-bar").getBoundingClientRect(), tallest = Math.max(...names.map((e) => e.getBoundingClientRect().height));
    return [names[1].getBoundingClientRect().height > names[0].getBoundingClientRect().height, Math.round(body.bottom - bar.bottom) === Math.round(tallest)];
  }), [true, true]);
  check("room to the end: a number too close to the scale's end is left out, in CSS, on the server's HTML", await p.evaluate(() =>
    [...document.querySelectorAll("#toend .n")].map((e) => e.getBoundingClientRect().width - parseFloat(getComputedStyle(e).paddingLeft) > 0)), [true, true, false]);
  check("server roots: a component's, a spread's, an svg and an img all get their row's place", await p.evaluate(() =>
    [".comp", ".spread", ".svgroot", ".imgroot"].map((q) => { const e = document.querySelector("#roots " + q); return !!e && e.hasAttribute("data-rhp-o") && e.style.getPropertyValue("--rhp-position") !== ""; })),
    [true, true, true, true]);
  check("server roots: its own attributes are kept as written (title with >, quotes and &; its style next to rhp's)", await p.evaluate(() => {
    const e = document.querySelector("#roots .spread");
    return [e.getAttribute("title"), e.dataset.x, e.style.color, e.style.getPropertyValue("--rhp-position")];
  }), [`a > b "c" & 'd'`, "5", "rgb(1, 2, 3)", "0"]);
  check("server roots: a row with no position is hidden, and one a slat hid itself shows at its position, as in a browser", await p.evaluate(() =>
    [...document.querySelectorAll("#roots [data-h]")].map((e) => e.hidden)), [true, false]);
  await p.close();
}

// linkedCss, on a page that links rhp's stylesheet and on one that forgets to
{
  const shot = (p) => p.locator("main").screenshot({ animations: "disabled" });
  const fresh = await open("file://" + at("out/ssr.html") + "#fresh"), want = await shot(fresh);
  const server = await open("file://" + at("out/ssr-linked.html") + "?wait");
  const coreIn = (p) => p.evaluate(() => [[...document.querySelectorAll("style[data-rhp-server]")].some((s) => s.textContent.includes(".rhp-body{all:initial")),
    document.adoptedStyleSheets.some((s) => [...s.cssRules].some((r) => r.cssText.includes(".rhp-body")))]);
  check("linkedCss: the server's HTML carries no core CSS, and looks the same with the page's link", [await coreIn(server), Buffer.compare(await shot(server), want)], [[false, false], 0]);
  await server.evaluate(() => window.go()); await server.waitForTimeout(300);
  check("linkedCss: taken over, the browser adopts no core of its own, and it looks the same", [await coreIn(server), Buffer.compare(await shot(server), want)], [[false, false], 0]);
  const warned = [];
  const unlinked = await browser.newPage({ viewport: { width: 900, height: 900 } });
  unlinked.on("console", (m) => m.type() === "warning" && warned.push(m.text()));
  await unlinked.goto("file://" + at("out/ssr-unlinked.html") + "#fresh"); await unlinked.waitForTimeout(400);
  check("linkedCss: a page that doesn't link the stylesheet is warned, and rhp adopts its core after all", [warned.some((w) => w.includes("linkedCss")), Buffer.compare(await shot(unlinked), want)], [true, 0]);
  check("linkedCss: no page errors", [...server.errors, ...fresh.errors], []);
  for (const p of [fresh, server, unlinked]) await p.close();
}

// An app built by Vite from rhp's source (test/vite)
{
  const url = "file://" + at("vite/out/page.html"), shot = (p) => p.locator("main").screenshot({ animations: "disabled" });
  check("vite: an app's build takes rhp's source, for its server and for its browser", VITE, { server: "dist/source/index.js", browser: "dist/source/index.js" });
  const alone = await open(url + "?wait"), server = await open(url + "?wait"), fresh = await open(url + "#fresh");
  await server.evaluate(() => window.go()); await server.waitForTimeout(300);
  const want = await shot(fresh);
  check("vite: the server's HTML alone, and taken over, look like the app drawn in the browser alone, with the same elements",
    [Buffer.compare(await shot(alone), want), Buffer.compare(await shot(server), want), await dom(server) === await dom(fresh)], [0, 0, true]);
  await server.evaluate(() => window.setSold([30, 1, 2, 3])); await server.waitForTimeout(400);
  check("vite: taken over, the chart follows its data", await server.evaluate(() => [...document.querySelectorAll("#fruit .rhp-plot > *")].map((e) => e.style.getPropertyValue("--rhp-position"))), ["0", "3", "2", "1"]);
  check("vite: no page errors", [...alone.errors, ...server.errors, ...fresh.errors], []);
  for (const p of [alone, server, fresh]) await p.close();
}

// What a screen reader gets, from Chromium's accessibility tree
{
  const p = await open("file://" + at("out/ssr.html") + "#fresh");
  const cdp = await p.context().newCDPSession(p);
  const tree = async (sel) => {
    const { nodes } = await cdp.send("Accessibility.getFullAXTree");
    const byId = new Map(nodes.map((n) => [n.nodeId, n]));
    const { node: { backendNodeId } } = await cdp.send("DOM.describeNode", { objectId: (await cdp.send("Runtime.evaluate", { expression: `document.querySelector(${JSON.stringify(sel)})` })).result.objectId });
    const text = (n) => (n.ignored ? (n.childIds ?? []).map((c) => text(byId.get(c))).join(" ") : n.role?.value === "StaticText" ? n.name?.value ?? "" : (n.childIds ?? []).map((c) => text(byId.get(c))).join(" ")).replace(/\s+/g, " ").trim();
    const root = nodes.find((n) => n.backendDOMNodeId === backendNodeId);
    // Ignored and generic nodes (plain divs) are skipped, and their children take their place
    const walk = (n) => n.ignored || n.role?.value === "generic" ? (n.childIds ?? []).flatMap((c) => walk(byId.get(c))) : [n];
    const shown = (n) => (n.childIds ?? []).flatMap((c) => walk(byId.get(c)));
    return { root, byId, text, shown };
  };
  const { root, byId, text, shown } = await tree("#fruit");
  const list = shown(root).find((n) => n.role.value === "list");
  check("a11y: a chart with a label is a figure with that name", [root.role.value, root.name?.value], ["figure", "Fruit sold this week"]);
  check("a11y: a Plot is a list of its rows, in the order they are shown", list && shown(list).map((n) => [n.role.value, text(n)]),
    [["listitem", "Kiwis 22"], ["listitem", "Bananas 18"], ["listitem", "Apples 12"], ["listitem", "Cherries 7"]]);
  check("a11y: the axis numbers are left out", text(root).includes("30"), false);
  await p.evaluate(() => window.setSold([1, 2, 30, 3])); await p.waitForTimeout(500);
  const again = await tree("#fruit"), list2 = again.shown(again.root).find((n) => n.role.value === "list");
  check("a11y: a new order reads in its new order", again.shown(list2).map((n) => again.text(n).split(" ")[0]), ["Cherries", "Kiwis", "Bananas", "Apples"]);
  const keyed = await tree("#vertical"), kl = keyed.shown(keyed.root).find((n) => n.role.value === "list");
  check("a11y: keyed rows read in the order shown too", keyed.shown(kl).map((n) => keyed.text(n).split(" ")[0]), ["Apples", "Cherries", "Bananas"]);
  const own = await tree("#own");
  check("a11y: a slat root with its own role keeps it, and its own id", [own.shown(own.shown(own.root)[0])[0]?.role.value, await p.evaluate(() => !!document.getElementById("own-0"))], ["group", true]);
  const heat = await tree("#heat"), own2 = await tree("#own");
  check("a11y: a Plot inside a row, and an overlap Plot, are not lists of their own", [
    heat.shown(heat.shown(heat.root).find((n) => n.role.value === "list"))[0] && heat.shown(heat.shown(heat.shown(heat.root).find((n) => n.role.value === "list"))[0]).some((n) => n.role.value === "list"),
    own2.shown(own2.root).filter((n) => n.role.value === "list").length], [false, 1]);
  const sc = await tree("#scale");
  check("a11y: a Scale is left out", sc.text(sc.root).includes("20"), false);
  check("a11y: a chart with no name is no figure", sc.root.role.value !== "figure", true);
  await p.close();
}

await browser.close();
console.log(failed ? `${failed} failed` : "all passed");
process.exit(failed ? 1 : 0);
