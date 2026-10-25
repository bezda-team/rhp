// Runs a micro page's ways against each other: a fresh page per sample, ways interleaved in rotating order, the
// browser's style and layout counters (Chromium, thread time) or the frame (other engines).
//   node run-micro.mjs style-cache.html [--engine chromium] [--rounds 12]
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { compare, describe, roundOrder, fmt, fmtChange } from "../stats.mjs";
const RHP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const { chromium, firefox, webkit } = await import(`${RHP}/node_modules/playwright/index.mjs`);
const here = path.dirname(fileURLToPath(import.meta.url));
const file = process.argv[2];
const arg = (name, fallback) => {
  const i = process.argv.indexOf("--" + name);
  return i < 0 ? fallback : process.argv[i + 1];
};
const engine = arg("engine", "chromium");
const rounds = +arg("rounds", 12);
const jsonOut = arg("json", null);

const server = http.createServer((q, r) => {
  const f = path.join(here, new URL(q.url, "http://x").pathname);
  if (!fs.existsSync(f)) return r.writeHead(404).end();
  r.writeHead(200, { "content-type": "text/html", "cross-origin-opener-policy": "same-origin", "cross-origin-embedder-policy": "require-corp" }).end(fs.readFileSync(f));
}).listen(0, "127.0.0.1");
await new Promise((r) => server.on("listening", r));
const browser = await { chromium: () => chromium.launch({ channel: "chromium" }), firefox: () => firefox.launch(), webkit: () => webkit.launch() }[engine]();

const probe = await browser.newPage();
await probe.goto(`http://127.0.0.1:${server.address().port}/${file}`);
const ways = await probe.evaluate(() => window.ways);
await probe.close();

const samples = Object.fromEntries(ways.map((w) => [w, []]));
for (let r = 0; r < rounds; r++) {
  for (const w of roundOrder(ways, r)) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/${file}`);
    let cdp = null;
    if (engine === "chromium") {
      cdp = await context.newCDPSession(page);
      await cdp.send("Performance.enable", { timeDomain: "threadTicks" });
      await cdp.send("HeapProfiler.collectGarbage");
    }
    const get = async () => cdp && Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
    await page.evaluate(() => new Promise((r) => setTimeout(r, 150)));
    const a = await get();
    const frame = await page.evaluate((w) => window.run(w), w);
    await page.evaluate(() => new Promise((r) => setTimeout(r, 200)));
    const b = await get();
    samples[w][r] = { frame, style: b ? (b.RecalcStyleDuration - a.RecalcStyleDuration) * 1000 : null, layout: b ? (b.LayoutDuration - a.LayoutDuration) * 1000 : null };
    await context.close();
  }
  process.stdout.write(`\rround ${r + 1}/${rounds}`);
}
process.stdout.write("\n");
await browser.close();
server.close();

for (const m of ["frame", "style", "layout"]) {
  if (samples[ways[0]][0][m] == null) continue;
  console.log(`${m}:`);
  for (const w of ways) {
    const s = samples[w].map((x) => x[m]);
    const d = describe(s);
    const c = w === ways[0] ? null : compare(samples[ways[0]].map((x) => x[m]), s);
    console.log(`  ${w.padEnd(12)} ${fmt(d.median, 2).padStart(7)} ms (±${fmt(d.spread)}%)  ${c ? fmtChange(c) : "(base)"}`);
  }
}
if (jsonOut) {
  const out = { file, engine, rounds, ways, metrics: {} };
  for (const m of ["frame", "style", "layout"]) {
    if (samples[ways[0]][0][m] == null) continue;
    out.metrics[m] = Object.fromEntries(ways.map((w) => {
      const s = samples[w].map((x) => x[m]);
      return [w, { median: describe(s).median, spread: describe(s).spread, change: w === ways[0] ? null : compare(samples[ways[0]].map((x) => x[m]), s) }];
    }));
  }
  fs.writeFileSync(jsonOut, JSON.stringify(out, null, 2));
}
