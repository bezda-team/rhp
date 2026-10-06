// Runs every library through every scenario in one browser and writes results/<browser>.json.
//   node run.mjs chrome | chromium | firefox | webkit | safari      (safari is the real Safari, see safari.mjs)
// chrome is the installed Chrome, headed; chromium is Playwright's own Chromium, headless (for machines without Chrome,
// such as a Linux container). Both also report main-thread time and run the drag again on a CPU slowed 4x, like a
// mid-range phone. BENCH_RESULTS names the folder the results go to (results/ by default).
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { chromium, firefox, webkit } from "playwright";
import { withSafari } from "./safari.mjs";
import { idleGate } from "./idle.mjs";
const here = path.dirname(fileURLToPath(import.meta.url)), at = (f) => path.join(here, f);
const inputs = process.env.BENCH_INPUTS ? path.resolve(process.env.BENCH_INPUTS) : here;
const bundle = (f) => path.join(inputs, "out", f);
const engine = process.argv[2] ?? "chrome", only = process.argv[3]?.split(",");
const LIBS = fs.readdirSync(bundle("")).filter((f) => f.endsWith(".html")).map((f) => f.slice(0, -5)).filter((l) => !only || only.includes(l));
const REPS = { mount: 10, large: 5, dashboard: 5 };
const CDP = engine === "chrome" || engine === "chromium";

// The pages are served over http since Safari can't open files
const server = http.createServer((q, r) => {
  const f = bundle(new URL(q.url, "http://x").pathname);
  if (!fs.existsSync(f)) return r.writeHead(404).end();
  r.writeHead(200, { "content-type": f.endsWith(".html") ? "text/html" : "text/javascript" }).end(fs.readFileSync(f));
}).listen(0, "127.0.0.1");
await new Promise((r) => server.on("listening", r));
const url = (lib) => `http://127.0.0.1:${server.address().port}/${lib}.html`;

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const frames = (gaps) => ({ p50: +median(gaps).toFixed(1), p95: +pct(gaps, 0.95).toFixed(1), long: gaps.filter((g) => g > 25).length, fps: +(1000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length)).toFixed(1) });

// A browser session: open(url) gives { call(fn, arg), metrics(), close() }.
async function session() {
  if (engine === "safari") {
    let s;
    const ready = new Promise((r) => (s = r));
    let finish;
    const done = new Promise((r) => (finish = r));
    const run = withSafari(async (api) => { s(api); await done; });
    const api = await ready;
    return {
      open: async (u) => { await api.goto(u); return { call: (fn, arg) => api.run(`return await window.bench.${fn}(${JSON.stringify(arg)});`), metrics: async () => null, throttle: async () => false, close: async () => {} }; },
      end: async () => { finish(); await run; },
    };
  }
  const type = { chrome: chromium, chromium, firefox, webkit }[engine];
  // BENCH_BROWSER runs another build of the engine, such as an older Playwright Chromium already on the machine
  const browser = await type.launch(engine === "chrome" ? { channel: "chrome", headless: false } : { executablePath: process.env.BENCH_BROWSER });
  return {
    version: browser.version(),
    open: async (u) => {
      const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
      page.on("pageerror", (e) => console.log("  page error:", e.message));
      await page.goto(u);
      const cdp = CDP ? await page.context().newCDPSession(page) : null;
      if (cdp) await cdp.send("Performance.enable");
      return {
        call: (fn, arg) => page.evaluate(([fn, arg]) => window.bench[fn](arg), [fn, arg]),
        metrics: async () => cdp && Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value])),
        throttle: async (rate) => cdp && (await cdp.send("Emulation.setCPUThrottlingRate", { rate }), true),
        heap: async () => { if (!cdp) return null; await cdp.send("HeapProfiler.collectGarbage"); const m = await (await cdp.send("Performance.getMetrics")).metrics; return m.find((x) => x.name === "JSHeapUsedSize").value; },
        nodes: async () => cdp && (await cdp.send("Performance.getMetrics")).metrics.find((x) => x.name === "Nodes").value,
        close: () => page.close(),
      };
    },
    end: () => browser.close(),
  };
}
// Main-thread ms between two metric snapshots
const spent = (a, b) => a && b && Object.fromEntries(["TaskDuration", "ScriptDuration", "RecalcStyleDuration", "LayoutDuration"].map((k) => [k.replace("Duration", ""), +((b[k] - a[k]) * 1000).toFixed(1)]));
const per = (o, n) => o && Object.fromEntries(Object.entries(o).map(([k, v]) => [k, +(v / n).toFixed(2)]));

const S = await session(), results = { engine, browser: S.version, date: new Date().toISOString(), loadStart: os.loadavg(), libs: {} };
const dir = process.env.BENCH_RESULTS ?? "results";
fs.mkdirSync(at(dir), { recursive: true });
const save = () => fs.writeFileSync(at(`${dir}/${engine}.json`), JSON.stringify(results, null, 2));
try {
for (const lib of LIBS) {
  const r = (results.libs[lib] = {});
  r.idleGate = await idleGate(lib);
  // A fresh page per run. We time the frame the chart is made in, and in Chrome all main-thread time in the second
  // after, which includes work a library defers to later frames and its entry animation.
  const fresh = async (fn, arg) => {
    const p = await S.open(url(lib));
    try {
      const m0 = await p.metrics(), frame = await p.call(fn, arg);
      await new Promise((r) => setTimeout(r, 1000));
      return { frame, total: spent(m0, await p.metrics())?.Task };
    } finally { await p.close(); }
  };
  const rep = async (n, fn, arg) => {
    const a = [];
    for (let i = 0; i < n; i++) {
      a.push(await fresh(fn, arg));
    }
    const t = a.map((x) => x.total).filter((x) => x != null);
    return { frame: +median(a.map((x) => x.frame)).toFixed(1), total: t.length ? +median(t).toFixed(1) : null, samples: a };
  };
  r.mount = await rep(REPS.mount, "mount", { n: 20 });
  r.large = await rep(REPS.large, "mount", { n: 1000, band: 8 });
  r.dashboard = await rep(REPS.dashboard, "dashboard", { k: 50, n: 7 });
  { // one value changed 20 times: time to the drawn frame, and main-thread time per change
    const p = await S.open(url(lib));
    await p.call("prepare", { n: 20 });
    const m0 = await p.metrics(), lat = await p.call("updates", { times: 20, gap: 700 }), m1 = await p.metrics();
    r.update = { latency: +median(lat).toFixed(1), perChange: per(spent(m0, m1), 20) };
    await p.close();
  }
  for (const rate of CDP ? [1, 4] : [1]) { // a drag: one value changes every frame for 240 frames
    const p = await S.open(url(lib));
    await p.call("prepare", { n: 20 });
    if (rate > 1) await p.throttle(rate);
    const m0 = await p.metrics(), gaps = await p.call("drag", { frames: 240 }), m1 = await p.metrics();
    r[rate > 1 ? "drag4x" : "drag"] = { ...frames(gaps), perFrame: per(spent(m0, m1), 240) };
    await p.close();
  }
  if (CDP) { // memory and DOM size with the 50-chart dashboard
    const p = await S.open(url(lib));
    const h0 = await p.heap(), n0 = await p.nodes();
    await p.call("dashboard", { k: 50, n: 7 });
    await new Promise((res) => setTimeout(res, 1500));
    r.memory = { heapMB: +(((await p.heap()) - h0) / 1048576).toFixed(2), nodes: (await p.nodes()) - n0 };
    await p.close();
  }
  console.log(lib, JSON.stringify(r));
  save();
}
results.completed = new Date().toISOString();
results.loadEnd = os.loadavg();
save();
} catch (error) {
  results.failure = { message: error.message, idleSamples: error.samples, at: new Date().toISOString() };
  save();
  throw error;
} finally {
  await S.end();
  server.close();
}
