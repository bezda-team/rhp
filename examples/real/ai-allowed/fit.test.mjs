// Picks every project on a poster in turn and checks that the readout shows all of its text (nothing clipped by the
// card's fixed height), at the Reddit size (1280px window, the poster at 1080px) and on a phone (390px).
// usage: node fit.test.mjs <poster.html> [slat selector]
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../../node_modules/playwright"));
const [file, selector = "[data-row]"] = process.argv.slice(2);
const browser = await chromium.launch();
let failures = 0;
for (const width of [1280, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(pathToFileURL(path.resolve(file)).href);
  await page.waitForSelector(selector);
  await page.evaluate(() => document.fonts.ready);
  const rows = await page.locator(selector).count();
  for (let i = 0; i < rows; i++) {
    await page.locator(selector).nth(i).focus();
    const clipped = await page.evaluate(() => [...document.querySelectorAll(".readout .face:not(.sizer) *")]
      .filter((el) => el.scrollHeight > el.clientHeight + 1 && getComputedStyle(el).overflow !== "visible" || el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).textOverflow === "ellipsis")
      .map((el) => `${el.className || el.tagName}: ${el.textContent.trim().slice(0, 60)}`));
    const name = await page.locator(".readout .who").first().textContent();
    if (clipped.length) {
      failures++;
      console.log(`${width}px ${name}: ${clipped.join(" | ")}`);
    }
  }
  await page.close();
}
await browser.close();
console.log(failures ? `${failures} readouts clipped` : "Every readout fits");
process.exit(failures ? 1 : 0);
