// npm test: builds the test pages and the gallery, then checks them in Chromium (Playwright).
// CHROMIUM=/path/to/chrome picks the browser; otherwise Playwright's own.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import { chromium } from "playwright";
import { page as bundle } from "../scripts/bundle.mjs";
const here = path.dirname(fileURLToPath(import.meta.url)), at = (f) => path.join(here, f);
fs.mkdirSync(at("out"), { recursive: true });
for (const t of ["core", "cost"]) {
  await bundle(at(t + ".jsx"), at(`out/${t}.js`));
  fs.writeFileSync(at(`out/${t}.html`), `<!doctype html><html><head><meta charset=utf-8></head><body><script src="${t}.js"></script></body></html>`);
}
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

// The gallery: 20 charts, both orientations, both animation versions, light and dark, desktop and phone
{
  const p = await open(gallery, { viewport: { width: 1280, height: 900 } });
  await p.click("label:has(#motion-js)"); await p.waitForTimeout(200);
  const gaps = () => p.evaluate(() => {
    let worst = 0;
    for (const plot of document.querySelectorAll("#stacked .rhp-plot .rhp-plot")) {
      const r = [...plot.querySelectorAll(".rhp-bar")].map((e) => e.getBoundingClientRect()).sort((a, b) => a.left - b.left);
      for (let i = 1; i < r.length; i++) worst = Math.max(worst, Math.abs(r[i].left - r[i - 1].right));
    }
    return worst;
  });
  let worst = 0;
  await p.click("#new-data");
  for (let t = 0; t < 12; t++) { await p.waitForTimeout(40); worst = Math.max(worst, await gaps()); }
  check("JS version: stacked segments stay joined while they move (px)", +worst.toFixed(2), (w) => w < 0.5);
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
            if ((b.width || b.height) && Math.max(b.right - c.right, c.left - b.left, b.bottom - c.bottom, c.top - b.top) > 0.5) { out.push(`${o}: ${ch.closest(".card").id} ${e.className} sticks out`); break; }
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
await browser.close();
console.log(failed ? `${failed} failed` : "all passed");
process.exit(failed ? 1 : 0);
