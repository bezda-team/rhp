// Saves each poster as a PNG through its own download button (the way a reader would), and a preview of each at the
// sizes Reddit shows it: 390px wide on a phone, and in the desktop feed's box, at most 540px tall (portrait images get
// a square box there, so a 3:4 poster shows at about 405 by 540).
// usage: node export.mjs [poster.html ...]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../../package.json"));
const { chromium } = require("playwright");
const files = process.argv.slice(2).length ? process.argv.slice(2) : ["ai-allowed-chart.html", "ai-allowed-infographic.html"];
const previews = path.join(here, "previews");
fs.mkdirSync(previews, { recursive: true });

const browser = await chromium.launch();
for (const file of files) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 }, acceptDownloads: true });
  await page.goto(pathToFileURL(path.join(here, file)).href);
  await page.waitForSelector(".rhp-chart");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 120000 }), page.click(".poster-download")]);
  const png = path.join(here, file.replace(/\.html$/, ".png"));
  await download.saveAs(png);

  // Reddit's sizes: the phone's width, and the desktop feed's box (the column's width, about 724px, and 540px tall;
  // a portrait image's box is square)
  const data = fs.readFileSync(png).toString("base64");
  const view = await browser.newPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 2 });
  await view.setContent(`<body style="margin:0;background:#dae0e6"><img id="i" src="data:image/png;base64,${data}"></body>`);
  const { w, h } = await view.evaluate(async () => { const i = document.getElementById("i"); await i.decode(); return { w: i.naturalWidth, h: i.naturalHeight }; });
  const ratio = w / h;
  const feedW = 724, feedH = Math.min(540, feedW / Math.max(ratio, 1));
  const shown = ratio >= feedW / feedH ? [feedW, feedW / ratio] : [feedH * ratio, feedH];
  for (const [name, width, height, box] of [["phone", 390, 390 / ratio, null], ["desktop-feed", shown[0], shown[1], [feedW, feedH]]]) {
    const [bw, bh] = box ?? [width, height];
    await view.setViewportSize({ width: Math.round(bw), height: Math.round(bh) });
    await view.setContent(`<body style="margin:0;width:${bw}px;height:${bh}px;display:grid;place-items:center;background:#1a1a1b"><img src="data:image/png;base64,${data}" style="width:${width}px;height:${height}px"></body>`);
    await view.waitForTimeout(200);
    await view.screenshot({ path: path.join(previews, `${file.replace(/\.html$/, "")}-${name}.png`) });
  }
  console.log(`${path.basename(png)}: ${w} x ${h}; desktop feed shows it at ${Math.round(shown[0])} x ${Math.round(shown[1])}, a phone at 390 x ${Math.round(390 / ratio)}`);
  await view.close();
  await page.close();
}
await browser.close();
