// Browser regressions for problems found by the chart-library comparison.
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium, webkit, firefox } from "playwright";
import { standalone } from "../scripts/bundle.mjs";

const at = (name) => fileURLToPath(new URL(name, import.meta.url));
fs.mkdirSync(at("out"), { recursive: true });
await standalone(at("../src/standalone.js"), at("out/comparison-standalone.js"));
const moduleURL = "data:text/javascript;base64," + fs.readFileSync(at("out/comparison-standalone.js")).toString("base64");
const engine = process.env.BROWSER ?? "chromium";
assert.ok(["chromium", "webkit", "firefox"].includes(engine), "BROWSER must name a supported Playwright engine");
const browser = await { chromium, webkit, firefox }[engine].launch(engine === "chromium" ? { executablePath: process.env.CHROMIUM } : {});
try {
  for (const fallback of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
    const result = await page.evaluate(async ({ moduleURL, fallback }) => {
      if (fallback) CSS.supports = () => false;
      const { shape } = await import(moduleURL);
      const outlines = [shape(["M", 0, 0], ["Q", .2, 0, .4, 0], ["L", .4, 1], ["L", 0, 1], ["Z"],
        ["M", .6, 0], ["L", 1, 0], ["L", 1, 1], ["L", .6, 1], ["Z"]),
        shape(["M", 0, 0], ["L", 1, 0], ["L", 1, 1], ["L", 0, 1], ["Z"],
          ["M", .4, .4], ["L", .4, .6], ["L", .6, .6], ["L", .6, .4], ["Z"])];
      const results = [];
      for (const outline of outlines) for (const vertical of [false, true]) for (const backward of [false, true]) {
        const block = document.createElement("div");
        block.style.cssText = "position:absolute;left:0;top:0;width:200px;height:200px;background:black";
        block.style.clipPath = outline.clip(vertical, backward);
        document.body.append(block);
        const hit = (along, across) => {
          const x = vertical ? across : backward ? 1 - along : along;
          const y = vertical ? backward ? along : 1 - along : across;
          return document.elementFromPoint(x * 200, y * 200) === block;
        };
        results.push({ clipped: getComputedStyle(block).clipPath !== "none", hits: [.2, .5, .8].map((v) => hit(v, .5)) });
        block.remove();
      }
      return results;
    }, { moduleURL, fallback });
    assert.deepEqual(result, Array(8).fill({ clipped: true, hits: [true, false, true] }), `compound shapes and holes, fallback=${fallback}`);
    await page.close();
  }
  console.log("PASS compound clips preserve both subpaths and their gap in both directions and orientations, including fallback");
  for (const orientation of ["horizontal", "vertical"]) {
  const page = await browser.newPage();
  const axes = await page.evaluate(async ({ moduleURL, orientation }) => {
    const { Chart, Plot, Bar, html, render, createSignal } = await import(moduleURL);
    const [grid, setGrid] = createSignal(false);
    const [crossGrid, setCrossGrid] = createSignal(false);
    render(() => html`<${Chart} orientation=${orientation} grid=${grid} crossGrid=${crossGrid} scale=${[0, 10]} ticks=${[0, 5, 10]} cross=${[0, 10]} crossTicks=${[0, 10]}><${Plot} v=${[5]}>${d => html`<div><${Bar} to=${() => d.v}/></div>`}<//><//>`, document.body);
    await new Promise(requestAnimationFrame);
    const read = () => [...document.querySelectorAll('.rhp-axis')].map(axis => ({ labels: [...axis.querySelectorAll('span')].map(n => n.textContent), hidden: [...axis.children].every(el => getComputedStyle(el)[el.dataset.rhpO === 'h' ? 'borderLeftColor' : 'borderBottomColor'] === 'rgba(0, 0, 0, 0)') }));
    const off = read();
    setGrid(true);
    const on = read();
    setGrid(false);
    setCrossGrid(true);
    return { off, on, crossOnly: read() };
  }, { moduleURL, orientation });
  assert.deepEqual(axes, { off: [{ labels: ['0', '5', '10'], hidden: true }, { labels: ['0', '10'], hidden: true }], on: [{ labels: ['0', '5', '10'], hidden: false }, { labels: ['0', '10'], hidden: true }], crossOnly: [{ labels: ['0', '5', '10'], hidden: true }, { labels: ['0', '10'], hidden: false }] }, orientation);
  await page.close();
  }
  console.log("PASS grid visibility changes independently of labels and the cross-axis grid");
} finally {
  await browser.close();
}
