// Chromium's own style counters for one mount (or update): elements styled, and how many styles came from its cache.
//   node count-cache.mjs --variants count-inherit,count-base --scenarios bars1000,heat50,dash50,dots10k [--update sort]
import fs from "node:fs"; import path from "node:path"; import http from "node:http"; import { fileURLToPath } from "node:url";
const RHP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const { chromium } = await import(`${RHP}/node_modules/playwright/index.mjs`);
const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (n, f) => { const i = process.argv.indexOf("--" + n); return i < 0 ? f : process.argv[i + 1]; };
const variants = arg("variants", "count-inherit,count-base").split(","), scenarios = arg("scenarios", "bars1000").split(","), update = arg("update", null), dir = arg("dir", "out");
const server = http.createServer((q, r) => { const f = path.join(here, dir, new URL(q.url, "http://x").pathname); fs.existsSync(f) ? r.writeHead(200, { "content-type": f.endsWith(".html") ? "text/html" : "text/javascript" }).end(fs.readFileSync(f)) : r.writeHead(404).end(); }).listen(0, "127.0.0.1");
await new Promise((r) => server.on("listening", r));
const browser = await chromium.launch({ channel: "chromium" });
const out = {};
for (const s of scenarios) for (const v of variants) {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/${v}.html?s=${s}`);
  await page.waitForFunction(() => window.bench);
  // --cold traces the first chart on the page (an empty style cache); otherwise a second mount, or an update
  if (!process.argv.includes("--cold")) {
    await page.evaluate(() => window.bench.mount()); await page.evaluate(() => window.bench.settle(300));
    if (!update) { await page.evaluate(() => window.bench.unmount()); await page.evaluate(() => window.bench.settle(300)); }
  }
  await browser.startTracing(page, { categories: ["devtools.timeline", "disabled-by-default-devtools.timeline", "blink", "blink.user_timing", "disabled-by-default-blink.debug"] });
  await page.evaluate(async (u) => { performance.mark("bench-start"); if (u) await window.bench.update(u, 0); else await window.bench.mount(); performance.mark("bench-end"); }, update);
  const events = JSON.parse((await browser.stopTracing()).toString()).traceEvents;
  const t0 = events.find((e) => e.name === "bench-start").ts, t1 = events.find((e) => e.name === "bench-end").ts;
  const sum = {};
  for (const e of events) {
    if (e.name !== "Document::updateStyle" || e.ts < t0 || e.ts > t1) continue;
    for (const [k, x] of Object.entries(e.args?.counters ?? {})) sum[k] = (sum[k] ?? 0) + x;
  }
  (out[s] ??= {})[v] = sum;
  await page.context().close();
}
await browser.close(); server.close();
const keys = [...new Set(Object.values(out).flatMap((o) => Object.values(o).flatMap((x) => Object.keys(x))))];
for (const s of scenarios) {
  console.log(`\n${s}${update ? " update:" + update : process.argv.includes("--cold") ? " (first chart)" : " (warm mount)"}`);
  for (const k of keys) console.log("  " + k.padEnd(40) + variants.map((v) => String(out[s][v][k] ?? 0).padStart(10)).join(""));
}
const jsonOut = arg("json", null);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ variants, scenarios, update, counters: out }, null, 2));
