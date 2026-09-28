// What a library's objects are, from heap snapshots before and after mounting, grouped by constructor
//   node heapdiff.mjs rhp-css mount '{"n":1000,"band":8}'
import fs from "node:fs"; import http from "node:http"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
const here = path.dirname(fileURLToPath(import.meta.url));
const [lib = "rhp-css", fn = "mount", arg = '{"n":1000,"band":8}'] = process.argv.slice(2);
const server = http.createServer((q, r) => { const f = path.join(here, "out", new URL(q.url, "http://x").pathname); fs.existsSync(f) ? r.writeHead(200, { "content-type": f.endsWith(".html") ? "text/html" : "text/javascript" }).end(fs.readFileSync(f)) : r.writeHead(404).end(); }).listen(0, "127.0.0.1");
await new Promise((r) => server.on("listening", r));
const b = await chromium.launch({ channel: "chrome", headless: false });
const p = await b.newPage(); await p.goto(`http://127.0.0.1:${server.address().port}/${lib}.html`);
const cdp = await p.context().newCDPSession(p);
const snap = async () => {
  await cdp.send("HeapProfiler.collectGarbage");
  let text = ""; const on = (e) => (text += e.chunk);
  cdp.on("HeapProfiler.addHeapSnapshotChunk", on);
  await cdp.send("HeapProfiler.takeHeapSnapshot", { reportProgress: false });
  cdp.off("HeapProfiler.addHeapSnapshotChunk", on);
  const s = JSON.parse(text), f = s.snapshot.meta.node_fields, types = s.snapshot.meta.node_types[0], n = f.length;
  const iT = f.indexOf("type"), iN = f.indexOf("name"), iS = f.indexOf("self_size");
  const g = {};
  for (let i = 0; i < s.nodes.length; i += n) {
    const type = types[s.nodes[i + iT]], name = s.strings[s.nodes[i + iN]];
    const key = type === "object" || type === "closure" ? `${type}:${name}` : type;
    (g[key] ??= { count: 0, size: 0 }); g[key].count++; g[key].size += s.nodes[i + iS];
  }
  return g;
};
await p.evaluate(() => window.bench.mount({ n: 1 }));
const a = await snap();
await p.evaluate(([fn, arg]) => window.bench[fn](JSON.parse(arg)), [fn, arg]); await p.waitForTimeout(1500);
const z = await snap();
const rows = Object.keys(z).map((k) => [k, z[k].count - (a[k]?.count ?? 0), z[k].size - (a[k]?.size ?? 0)]).filter((r) => r[2] > 0).sort((x, y) => y[2] - x[2]);
let total = 0; for (const r of rows) total += r[2];
console.log("total added", (total / 1024).toFixed(0), "kB");
for (const [k, c, sz] of rows.slice(0, 28)) console.log(String((sz / 1024).toFixed(1)).padStart(8), "kB", String(c).padStart(7), k);
await b.close(); server.close();
