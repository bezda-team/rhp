// npm test: builds the test pages and the gallery, then checks them in Chromium (Playwright).
// CHROMIUM=/path/to/chrome picks the browser; otherwise Playwright's own.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import { chromium } from "playwright";
import { page as bundle, standalone } from "../scripts/bundle.mjs";
const here = path.dirname(fileURLToPath(import.meta.url)), at = (f) => path.join(here, f);
fs.mkdirSync(at("out"), { recursive: true });
for (const t of ["core", "cost", "mount"]) {
  await bundle(at(t + ".jsx"), at(`out/${t}.js`));
  fs.writeFileSync(at(`out/${t}.html`), `<!doctype html><html><head><meta charset=utf-8></head><body><script src="${t}.js"></script></body></html>`);
}
await standalone(path.join(here, "../src/standalone.js"), at("out/standalone.js"));
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

// No build step (src/standalone.js): a plain page imports one module and writes slats with html templates.
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

// Mount cost (test/mount.jsx): 50 charts of 7 slats; and a page's view-transition-name on a slat class
{
  const p = await open("file://" + at("out/mount.html"));
  const ms = await p.evaluate(() => T.mount());
  const vt = await p.evaluate(async () => {
    const s = document.createElement("style");
    s.textContent = ".slat { view-transition-name: card }"; // 350 slat roots with one name: a duplicate aborts the transition
    document.head.append(s);
    const t = document.startViewTransition(() => {});
    try { await t.finished; return "ran"; } catch (e) { return e.message; }
  });
  check("a page's view-transition-name on slat roots doesn't abort the page's view transition", vt, "ran");
  check("no page errors", p.errors, []);
  console.log(`     mount, 50 charts x 7 slats, with style and layout: ${ms.toFixed(1)} ms`);
  await p.close();
}

// The gallery: 20 charts, both orientations, both animation versions, light and dark, desktop and phone
{
  const p = await open(gallery, { viewport: { width: 1280, height: 900 } });
  await p.click("label:has(#motion-js)"); await p.waitForTimeout(200);
  const gaps = () => p.evaluate(() => {
    let worst = 0;
    for (const plot of document.querySelectorAll("#stacked .rhp-plot .rhp-plot")) {
      const r = [...plot.querySelectorAll(".rhp-bar")].map((e) => e.getBoundingClientRect()).filter((b) => b.width).sort((a, b) => a.left - b.left); // hidden (empty) segments aside
      for (let i = 1; i < r.length; i++) worst = Math.max(worst, Math.abs(r[i].left - r[i - 1].right - 2)); // the layers' --rhp-gap: 2px
    }
    return worst;
  });
  let worst = 0;
  await p.click("#new-data");
  for (let t = 0; t < 12; t++) { await p.waitForTimeout(40); worst = Math.max(worst, await gaps()); }
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
            // What shows only on hover (a tag, a bubble, a dimension) is there, invisible, at rest: it doesn't count.
            if (!e.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
            // What shows: the box cut by each clipping ancestor inside the chart. A slat may hide what it draws
            // (the dots past their window, a photo zoomed in its circle); only what is left counts.
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
            if (past[side] > 0.5) { // how far, where, and both boxes, so a rare failure can be read from the log
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

// The gallery's interactions: pointer and click handlers on the posters feed signals into the Plots' data, in both
// animation versions; and an overlay Plot with pointer-events: none lets the pointer through to the Plot under it.
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

// The v1 replicas in the gallery (fruit bars, box and whisker, animated dots): v1's assets and geometry,
// and a dots window that stays full while the rows move
{
  const p = await open(gallery, { viewport: { width: 1280, height: 900 } });
  check("v1 replicas: all 14 images load", await p.evaluate(async () => {
    const imgs = [...document.querySelectorAll("#fruit img, #clouds img")];
    await Promise.all(imgs.map((i) => i.decode().catch(() => {})));
    return [imgs.length, imgs.filter((i) => !i.naturalWidth).map((i) => i.alt)];
  }), [14, []]);

  // Where master's demos draw the top row and the scale, measured in Chromium at 1088px wide: [x, y, width, height]
  // from the plot's corner (the box plot's card), or [x, y] where a text starts.
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
      // a text: where its glyphs start and how wide they are, and the top and height of its line (v1 measured fit-content boxes)
      const text = (e) => { const r = document.createRange(); r.selectNodeContents(e); const t = r.getBoundingClientRect(), b = box(e); return [t.left - o.left, b[1], t.width, b[3]]; };
      const [scale, rows] = document.querySelectorAll(root + " .rhp-body > .rhp-plot");
      const top = [...rows.children].find((s) => s.style.getPropertyValue("--rhp-position") === "0");
      const out = { value: text(top.querySelector(".value")) };
      const name = top.querySelector(".name"), img = top.querySelector(".bar > img");
      if (name) out.name = text(name);
      if (img) out.img = box(img);
      for (const c of ["bar", "box", "circle"]) if (top.querySelector("." + c)) out[c] = box(top.querySelector("." + c));
      top.querySelectorAll(".cap").forEach((e, i) => (out["cap " + i] = box(e)));
      for (const s of scale.children) { out["mark " + s.textContent] = box(s.querySelector(".mark")); out["num " + s.textContent] = text(s.querySelector(".num")); }
      return out;
    }, root);
    for (const [k, want] of Object.entries(V1[id])) {
      const g = got[k]?.slice(0, want.length);
      if (!g || want.some((v, i) => Math.abs(g[i] - v) > 1)) off.push(`${id} ${k}: got ${g?.map((v) => +v.toFixed(2))}, v1 ${want}`);
    }
  }
  check("v1 replicas: the top rows and scales sit where v1 draws them, within 1px", off, []);

  // The scale's end line stays at the end of the track in every frame while the max changes, also when the new max
  // lands on a tick (that tick must not become the end and slide there), in both animation versions.
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

  // While the JS version moves the scale, its lines appear when the moving end reaches them and go when it passes
  // them: none drawn past the end, none missing inside the scale on screen (fruit: a Scale; medals, coffee: the axis).
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
        for (let v = 5; v < max - 0.5; v += 5) if (!marks.some((m) => m.v === v)) { out.missing++; break; }
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

  // A steady drag moves a bar steadily in the JS version: a change mid-move adds to the motion, so the speed never
  // collapses and recovers at each step (restarting an ease-in-out at every input made the bar pulse).
  const pulses = await p.evaluate(async () => {
    const input = document.querySelector("#fruit .slider input");
    const set = (v) => { input.value = v; input.dispatchEvent(new Event("input", { bubbles: true })); };
    const bar = document.querySelector("#fruit .rhp-body > .rhp-plot:last-child > * .bar");
    set(12); await new Promise((r) => setTimeout(r, 900));
    const w = [];
    for (let v = 12; v <= 24; v++) for (let k = 0; k < 3; k++) { set(v); await new Promise((r) => requestAnimationFrame(r)); w.push(bar.getBoundingClientRect().width); }
    const speed = w.slice(1).map((x, i) => x - w[i]);
    let n = 0;
    for (let i = 2; i < speed.length; i++) if (speed[i - 1] < speed[i - 2] * 0.25 && speed[i] > Math.max(0.5, speed[i - 1] * 2)) n++;
    set(1);
    return n;
  });
  check("JS version: a steady drag never makes the bar's speed collapse and recover", pulses, 0);
  await p.click("label:has(#motion-css)");
  await p.waitForTimeout(600);

  // v1's scale on a narrow chart (as on a page with the code beside it): a number next to the end hides only when it
  // would touch the end mark, and a number that shows never does, in either orientation.
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
          const t = range.getBoundingClientRect(), shown = n.checkVisibility({ visibilityProperty: true, opacityProperty: true }) ? 1 : 0;
          const room = h ? end.left - t.right : t.top - end.bottom; // px between the number's text and the end mark
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

  // A value takes as long to move in the JS version as in the CSS version (150 ms, ease-out, by default): the time from
  // a change to the last frame in which Fruit A's bar still moves.
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

  // The dots: each row's whole dots in the window, lit or not, and whether the window shows a hole anywhere in the row:
  // a gap wider than the 8px between dots (counting the dots just past its ends), or no dot within 4px of an end.
  const look = () => p.evaluate(() => [...document.querySelectorAll("#dots .rhp-body > .rhp-plot > *")].map((row) => {
    const w = row.getBoundingClientRect();
    const d = [...row.querySelectorAll(".rhp-dot")].map((e) => ({ b: e.getBoundingClientRect(), lit: getComputedStyle(e).backgroundColor === "rgb(242, 204, 143)" }))
      .sort((a, b) => a.b.left - b.b.left);
    let hole = !d.length || d[0].b.left - w.left > 4.5 || w.right - d.at(-1).b.right > 4.5;
    for (let i = 1; i < d.length; i++) if (d[i].b.left > w.left && d[i - 1].b.right < w.right) hole ||= d[i].b.left - d[i - 1].b.right > 8.5;
    const shown = d.filter((x) => x.b.right > w.left && x.b.left < w.right), whole = shown.filter((x) => x.b.left >= w.left - 0.5 && x.b.right <= w.right + 0.5);
    return { lit: whole.map((x) => (x.lit ? "#" : ".")).join(""), hole, x: shown[0]?.b.left - w.left, size: [shown[0]?.b.width, shown[1]?.b.left - shown[0]?.b.left] };
  }));
  await p.hover("#dots .dots-window"); await p.waitForTimeout(600); // hovering holds v1's logo, whatever the 5 s cycle is doing
  const rest = await look();
  await p.mouse.move(0, 0); // leaving starts the cycle again
  check("v1 dots: v1's logo, 11 whole dots by 9 rows, 52px dots 60px apart", [rest.map((r) => r.lit), rest[0].size.map((v) => +v.toFixed(2))],
    [["...........", "....#......", "....#......", ".##.##..##.", "#...#.#.#.#", "#...#.#.##.", "........#..", "........#..", "..........."], [52, 60]]);
  // Every 5 s the rows scatter or come back. Sample the window through one change in each animation version.
  for (const motion of ["css", "js"]) {
    if (motion === "js") await p.click("label:has(#motion-js)");
    const still = JSON.stringify((await look()).map((r) => Math.round(r.x)));
    let samples = 0, between = 0, holes = 0;
    for (const end = Date.now() + 6000; Date.now() < end && !samples; ) if (JSON.stringify((await look()).map((r) => Math.round(r.x))) !== still) samples = 1;
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
await browser.close();
console.log(failed ? `${failed} failed` : "all passed");
process.exit(failed ? 1 : 0);
