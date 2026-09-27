// JS heap a library adds, after garbage collection: one chart of n bars, and k charts of 7 bars.
//   node memory.mjs rhp-css,d3
import fs from "node:fs"; import http from "node:http"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
const here = path.dirname(fileURLToPath(import.meta.url));
const libs = (process.argv[2] ?? "rhp-css,d3").split(",");
const server = http.createServer((q, r) => { const f = path.join(here, "out", new URL(q.url, "http://x").pathname); fs.existsSync(f) ? r.writeHead(200, { "content-type": f.endsWith(".html") ? "text/html" : "text/javascript" }).end(fs.readFileSync(f)) : r.writeHead(404).end(); }).listen(0, "127.0.0.1");
await new Promise((r) => server.on("listening", r));
const b = await chromium.launch({ channel: "chrome", headless: false });
const heap = async (cdp) => { await cdp.send("HeapProfiler.collectGarbage"); await cdp.send("HeapProfiler.collectGarbage"); return (await cdp.send("Runtime.getHeapUsage")).usedSize; };
for (const lib of libs) {
  const out = {};
  for (const [label, fn, arg] of [["1 chart, 1000 bars", "mount", { n: 1000, band: 8 }], ["1 chart, 100 bars", "mount", { n: 100, band: 8 }], ["50 charts, 7 bars", "dashboard", { k: 50, n: 7 }], ["50 charts, 1 bar", "dashboard", { k: 50, n: 1 }]]) {
    const p = await b.newPage(); await p.goto(`http://127.0.0.1:${server.address().port}/${lib}.html`);
    const cdp = await p.context().newCDPSession(p);
    await p.evaluate(() => window.bench.mount({ n: 1 })); // library code and its one-time setup loaded
    const h0 = await heap(cdp); await p.evaluate(([fn, arg]) => window.bench[fn](arg), [fn, arg]); await p.waitForTimeout(1500);
    out[label] = +(((await heap(cdp)) - h0) / 1024).toFixed(0) + " kB";
    await p.close();
  }
  console.log(lib.padEnd(10), JSON.stringify(out));
}
await b.close(); server.close();
