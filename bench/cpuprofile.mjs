// Self time per function while one library mounts n bars (unminified build: BENCH_MINIFY=0).
import fs from "node:fs"; import http from "node:http"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
const here = path.dirname(fileURLToPath(import.meta.url));
const [lib = "rhp-css", n = 1000] = process.argv.slice(2);
const server = http.createServer((q, r) => { const f = path.join(here, "out", new URL(q.url, "http://x").pathname); fs.existsSync(f) ? r.writeHead(200, { "content-type": f.endsWith(".html") ? "text/html" : "text/javascript" }).end(fs.readFileSync(f)) : r.writeHead(404).end(); }).listen(0, "127.0.0.1");
await new Promise((r) => server.on("listening", r));
const b = await chromium.launch({ channel: "chrome", headless: false });
const self = {};
for (let i = 0; i < 5; i++) {
  const p = await b.newPage(); await p.goto(`http://127.0.0.1:${server.address().port}/${lib}.html`);
  const cdp = await p.context().newCDPSession(p);
  await cdp.send("Profiler.enable"); await cdp.send("Profiler.setSamplingInterval", { interval: 50 }); await cdp.send("Profiler.start");
  await p.evaluate((n) => window.bench.mount({ n: +n, band: 8 }), n);
  const { profile } = await cdp.send("Profiler.stop");
  const dt = {}; profile.samples.forEach((id, k) => (dt[id] = (dt[id] ?? 0) + (profile.timeDeltas[k] ?? 0)));
  for (const node of profile.nodes) {
    const f = node.callFrame, key = `${f.functionName || "(anon)"} :${f.lineNumber}`;
    if (dt[node.id]) self[key] = (self[key] ?? 0) + dt[node.id] / 1000 / 5;
  }
  await p.close();
}
Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 30).forEach(([k, v]) => console.log(v.toFixed(2).padStart(7), "ms", k));
await b.close(); server.close();
