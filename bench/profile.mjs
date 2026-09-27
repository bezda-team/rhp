// Where a library's mount time goes, in Chrome: script, style, layout and the rest, for one chart of n bars.
//   node profile.mjs rhp-css,d3 1000
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
const here = path.dirname(fileURLToPath(import.meta.url));
const libs = (process.argv[2] ?? "rhp-css,d3").split(","), n = +(process.argv[3] ?? 1000), runs = +(process.argv[4] ?? 7);
const server = http.createServer((q, r) => { const f = path.join(here, "out", new URL(q.url, "http://x").pathname); fs.existsSync(f) ? r.writeHead(200, { "content-type": f.endsWith(".html") ? "text/html" : "text/javascript" }).end(fs.readFileSync(f)) : r.writeHead(404).end(); }).listen(0, "127.0.0.1");
await new Promise((r) => server.on("listening", r));
const b = await chromium.launch({ channel: "chrome", headless: false });
const med = (a) => a.sort((x, y) => x - y)[a.length >> 1];
for (const lib of libs) {
  const rows = [];
  for (let i = 0; i < runs; i++) {
    const p = await b.newPage();
    await p.goto(`http://127.0.0.1:${server.address().port}/${lib}.html`);
    const cdp = await p.context().newCDPSession(p);
    await cdp.send("Performance.enable");
    const get = async () => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
    const a = await get();
    const frame = await p.evaluate((n) => window.bench.mount({ n, band: 8 }), n);
    const z = await get();
    const d = (k) => (z[k] - a[k]) * 1000;
    rows.push({ frame, task: d("TaskDuration"), script: d("ScriptDuration"), style: d("RecalcStyleDuration"), layout: d("LayoutDuration"), nodes: z.Nodes - a.Nodes, styleCount: z.RecalcStyleCount - a.RecalcStyleCount, layoutCount: z.LayoutCount - a.LayoutCount });
    await p.close();
  }
  const o = {}; for (const k of Object.keys(rows[0])) o[k] = +med(rows.map((r) => r[k])).toFixed(1);
  o.other = +(o.task - o.script - o.style - o.layout).toFixed(1);
  console.log(lib.padEnd(10), JSON.stringify(o));
}
await b.close(); server.close();
