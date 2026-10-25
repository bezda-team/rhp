// Self time by function while a scenario mounts (or updates), in Chromium, on an unminified build (MINIFY=0 OUT=out/dev node build.mjs).
//   node profile.mjs --variant base --scenario bars1000 [--runs 8] [--warm] [--update all] [--dir out/dev]
// Sampled every 50 µs; a function's self time is the time the sampler found it at the top of the stack.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
const RHP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const { chromium } = await import(`${RHP}/node_modules/playwright/index.mjs`);

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) => {
  const i = process.argv.indexOf("--" + name);
  return i < 0 ? fallback : process.argv[i + 1];
};
const variant = arg("variant", "base");
const scenario = arg("scenario", "bars1000");
const runs = +arg("runs", 8);
const warm = process.argv.includes("--warm");
const update = arg("update", null);
const outDir = arg("dir", "out/dev");
const jsonOut = arg("json", null);

const server = http.createServer((q, r) => {
  const f = path.join(here, outDir, new URL(q.url, "http://x").pathname);
  if (!fs.existsSync(f)) return r.writeHead(404).end();
  r.writeHead(200, { "content-type": f.endsWith(".html") ? "text/html" : "text/javascript" }).end(fs.readFileSync(f));
}).listen(0, "127.0.0.1");
await new Promise((r) => server.on("listening", r));

const browser = await chromium.launch({ channel: "chromium", headless: true });
const self = {};
const byFile = {};
let total = 0;

for (let k = 0; k < runs; k++) {
  const context = await browser.newContext({ viewport: { width: 1000, height: 900 } });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/${variant}.html?s=${scenario}`);
  await page.waitForFunction(() => window.bench);
  if (warm || update) {
    await page.evaluate(() => window.bench.mount());
    await page.evaluate(() => window.bench.settle(300));
    if (!update) await page.evaluate(() => window.bench.unmount());
  }
  await page.evaluate(() => window.bench.settle(300));
  const cdp = await context.newCDPSession(page);
  await cdp.send("Profiler.enable");
  await cdp.send("Profiler.setSamplingInterval", { interval: 50 });
  await cdp.send("Profiler.start");
  if (update) await page.evaluate((u) => window.bench.update(u, 0), update);
  else await page.evaluate(() => window.bench.mount());
  const { profile } = await cdp.send("Profiler.stop");
  await context.close();

  const dt = {};
  profile.samples.forEach((id, i) => (dt[id] = (dt[id] ?? 0) + (profile.timeDeltas[i] ?? 0)));
  for (const node of profile.nodes) {
    const ms = (dt[node.id] ?? 0) / 1000 / runs;
    if (!ms) continue;
    const f = node.callFrame;
    if (f.functionName === "(idle)" || f.functionName === "(program)") continue;
    const file = f.url ? path.basename(new URL(f.url).pathname) : "(native)";
    const key = `${f.functionName || "(anonymous)"} ${file}:${f.lineNumber + 1}`;
    self[key] = (self[key] ?? 0) + ms;
    byFile[f.functionName === "(garbage collector)" ? "(gc)" : file] = (byFile[f.functionName === "(garbage collector)" ? "(gc)" : file] ?? 0) + ms;
    total += ms;
  }
}

await browser.close();
server.close();

console.log(`${variant} ${scenario}${update ? " update:" + update : warm ? " (warm)" : ""}: ${total.toFixed(2)} ms of samples per run (mean of ${runs})`);
for (const [k, v] of Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 30)) {
  console.log(`  ${v.toFixed(2).padStart(6)} ms  ${k}`);
}
if (jsonOut) {
  fs.mkdirSync(path.dirname(path.resolve(jsonOut)), { recursive: true });
  fs.writeFileSync(jsonOut, JSON.stringify({ variant, scenario, warm, update, runs, total,
    top: Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([fn, ms]) => ({ fn, ms })),
    byFile: Object.entries(byFile).sort((a, b) => b[1] - a[1]).map(([file, ms]) => ({ file, ms })) }, null, 2));
}
