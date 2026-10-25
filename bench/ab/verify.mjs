// Checks that each variant draws what the base draws, before its timings count: the same elements, each in the same
// place (largest difference of any element's box, in px), and the same pixels (screenshots compared in a canvas).
//   node verify.mjs --variants base,noguard --scenarios bars1000,dots10k [--dir out] [--engine chromium] [--hostile]
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
const RHP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const { chromium, firefox, webkit } = await import(`${RHP}/node_modules/playwright/index.mjs`);

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) => {
  const i = process.argv.indexOf("--" + name);
  return i < 0 ? fallback : process.argv[i + 1];
};
const variants = arg("variants", "base").split(",");
const scenarios = arg("scenarios", "bars20").split(",");
const outDir = arg("dir", "out");
const engine = arg("engine", "chromium");
const hostile = process.argv.includes("--hostile");
const shots = arg("shots", null); // a folder to save the screenshots in

const server = http.createServer((q, r) => {
  const f = path.join(here, outDir, new URL(q.url, "http://x").pathname);
  if (!fs.existsSync(f)) return r.writeHead(404).end();
  r.writeHead(200, { "content-type": f.endsWith(".html") ? "text/html" : "text/javascript" }).end(fs.readFileSync(f));
}).listen(0, "127.0.0.1");
await new Promise((r) => server.on("listening", r));

const browser = await { chromium: () => chromium.launch({ channel: "chromium" }), firefox: () => firefox.launch(), webkit: () => webkit.launch() }[engine]();
const compareCtx = await (await chromium.launch()).newContext();
const comparer = await compareCtx.newPage();

// A page's CSS that would bend an unguarded chart: the kind of rules resets and frameworks write for every element
const HOSTILE = `div, span { margin: 3px; padding: 2px; box-sizing: content-box; border: 1px dotted #999; font: italic 15px Georgia;
  letter-spacing: 1px; line-height: 2; text-transform: uppercase; color: #c00; background: #ffe; min-height: 4px; }
svg, path { stroke: #f0f; stroke-width: 6px; } * { transition: all 1s; }`;

async function draw(variant, scenario) {

  const context = await browser.newContext({ viewport: { width: 1000, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/${variant}.html?s=${scenario}`);
  await page.waitForFunction(() => window.bench);
  if (hostile) await page.addStyleTag({ content: HOSTILE });
  await page.evaluate(() => window.bench.mount());
  await page.evaluate(() => window.bench.settle(1500));
  const rects = await page.evaluate(() => [...document.getElementById("stage").querySelectorAll("*")].map((el) => {
    const r = el.getBoundingClientRect();
    return [el.tagName, el.getAttribute("class") ?? "", r.x, r.y, r.width, r.height];
  }));
  const box = await page.evaluate(() => {
    const r = document.getElementById("stage").getBoundingClientRect();
    return { x: 0, y: 0, width: 1000, height: Math.min(4000, Math.ceil(r.bottom + 40)) };
  });
  const png = await page.screenshot({ clip: box, fullPage: true });
  if (shots) {
    fs.mkdirSync(shots, { recursive: true });
    fs.writeFileSync(path.join(shots, `${scenario}-${variant}${hostile ? "-hostile" : ""}.png`), png);
  }
  await context.close();

  return { rects, png: png.toString("base64"), errors };
}

const pixels = (a, b) => comparer.evaluate(async ([a, b]) => {
  const load = async (s) => {
    const img = new Image();
    img.src = "data:image/png;base64," + s;
    await img.decode();
    const c = new OffscreenCanvas(img.width, img.height);
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    return g.getImageData(0, 0, img.width, img.height);
  };
  const [x, y] = await Promise.all([load(a), load(b)]);
  if (x.width !== y.width || x.height !== y.height) return { size: `${x.width}x${x.height} vs ${y.width}x${y.height}`, diff: -1, max: -1 };
  let diff = 0;
  let max = 0;
  for (let i = 0; i < x.data.length; i += 4) {
    const d = Math.max(Math.abs(x.data[i] - y.data[i]), Math.abs(x.data[i + 1] - y.data[i + 1]), Math.abs(x.data[i + 2] - y.data[i + 2]));
    if (d) diff++;
    if (d > max) max = d;
  }
  return { diff, max };
}, [a, b]);

for (const scenario of scenarios) {
  const base = await draw(variants[0], scenario);
  console.log(`${scenario}: ${variants[0]} draws ${base.rects.length} elements${base.errors.length ? ", errors: " + base.errors.join("; ") : ""}`);
  for (const v of variants.slice(1)) {
    const d = await draw(v, scenario);
    let moved = 0;
    let most = 0;
    const same = d.rects.length === base.rects.length;
    if (same) {
      for (let i = 0; i < d.rects.length; i++) {
        const m = Math.max(...[2, 3, 4, 5].map((k) => Math.abs(d.rects[i][k] - base.rects[i][k])));
        if (m > 0.01) moved++;
        if (m > most) most = m;
      }
    }
    const px = await pixels(base.png, d.png);
    console.log(`  ${v.padEnd(14)} ${same ? `${moved} of ${d.rects.length} boxes moved, at most ${most.toFixed(3)} px` : `${d.rects.length} elements (not ${base.rects.length})`}; ` +
      `${px.diff < 0 ? "screenshot size " + px.size : `${px.diff} pixels differ (largest channel difference ${px.max})`}${d.errors.length ? "; errors: " + d.errors.join("; ") : ""}`);
  }
}

await browser.close();
await compareCtx.browser().close();
server.close();
