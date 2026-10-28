// Checks that the chart's readout box and its hint overlap no bar and no label, with a margin, while the box stands
// beside the bars (a window wide enough for the full poster).
// usage: node overlap.test.mjs [poster.html] [margin px]
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../../package.json"));
const { chromium } = require("playwright");
const [file = "ai-allowed-chart.html", margin = "12"] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
await page.goto(pathToFileURL(path.join(here, file)).href);
await page.waitForSelector(".rhp-chart");
await page.evaluate(() => document.fonts.ready);
const hits = await page.evaluate((margin) => {
  const boxes = [".readout", ".hint"].map((s) => [s, document.querySelector(s).getBoundingClientRect()]);
  const marks = [...document.querySelectorAll(".rhp-chart .rhp-bar, .rhp-chart .rhp-label")];
  const near = (a, b) => a.left < b.right + margin && b.left < a.right + margin && a.top < b.bottom + margin && b.top < a.bottom + margin;
  const out = [];
  for (const [name, box] of boxes) for (const mark of marks) {
    // A label's own box can be wider than its text: measure the text
    const range = document.createRange();
    range.selectNodeContents(mark);
    const rect = mark.classList.contains("rhp-label") ? range.getBoundingClientRect() : mark.getBoundingClientRect();
    if (rect.width && near(box, rect)) out.push(`${name} touches "${mark.textContent.trim() || mark.className}" (${Math.round(Math.max(rect.right - box.left + margin, 0))}px)`);
  }
  return out;
}, +margin);
await browser.close();
console.log(hits.length ? hits.join("\n") : `The box and the hint keep ${margin}px from every bar and label`);
process.exit(hits.length ? 1 : 0);
