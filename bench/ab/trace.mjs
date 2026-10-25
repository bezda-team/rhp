// Where a mount's frame goes in Chromium, from a trace: main-thread self time by phase (script, style, layout,
// pre-paint, paint, layerize, commit, GC), and with --selectors, Chrome's selector statistics for its style passes.
//   node trace.mjs --variant base --scenario bars1000 [--runs 5] [--selectors]
// Tracing adds overhead, so these numbers explain where time goes; run.mjs is what measures it.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { median } from "./stats.mjs";
const RHP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const { chromium } = await import(`${RHP}/node_modules/playwright/index.mjs`);

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) => {
  const i = process.argv.indexOf("--" + name);
  return i < 0 ? fallback : process.argv[i + 1];
};
const variant = arg("variant", "base");
const scenario = arg("scenario", "bars1000");
const runs = +arg("runs", 5);
const selectors = process.argv.includes("--selectors");
const warm = process.argv.includes("--warm"); // measure a second mount of the chart instead of the first
const update = arg("update", null); // trace one change of this kind (one, all, scale) and the 24 frames after it, not the mount
const outDir = arg("dir", "out");
const query = arg("query", ""); // added to the page's URL (pre=1, css=selection: see page.js)
const jsonOut = arg("json", null); // also write the medians, counts and selector table here

const server = http.createServer((q, r) => {
  const f = path.join(here, outDir, new URL(q.url, "http://x").pathname);
  if (!fs.existsSync(f)) return r.writeHead(404).end();
  r.writeHead(200, { "content-type": f.endsWith(".html") ? "text/html" : "text/javascript", "cross-origin-opener-policy": "same-origin", "cross-origin-embedder-policy": "require-corp" }).end(fs.readFileSync(f));
}).listen(0, "127.0.0.1");
await new Promise((r) => server.on("listening", r));

const PHASES = [
  ["style", /^(UpdateLayoutTree|RecalculateStyles|ScheduleStyleRecalculation|StyleInvalidator.*|InvalidateLayout|UpdateStyle.*)$/],
  ["layout", /^(Layout|UpdateLayout|LayoutShift|IntersectionObserverController::computeIntersections|ResizeObserver.*)$/],
  ["prepaint", /^(PrePaint|UpdateLayerTree)$/],
  ["paint", /^(Paint|PaintImage|PaintSetup|RasterTask|Decode.*)$/],
  ["layerize", /^(Layerize|UpdateLayer|CompositeLayers)$/],
  ["commit", /^(Commit|ProxyMain::BeginMainFrame::commit.*)$/],
  ["gc", /(GC|Scavenge|MarkCompact|Sweep|Finalize|Minor|Major)/],
  ["script", /^(FunctionCall|EvaluateScript|v8\.run|v8\.callFunction|V8\.Execute|FireAnimationFrame|TimerFire|EventDispatch|RunMicrotasks|v8\.compile|V8\.CompileCode|v8\.parseOnBackground|CompileScript|v8\.produceCache|RunTask|HandlePostMessage)$/],
];
const phaseOf = (name) => (PHASES.find(([, re]) => re.test(name)) ?? ["other"])[0];

const browser = await chromium.launch({ channel: "chromium", headless: true });
const categories = ["devtools.timeline", "disabled-by-default-devtools.timeline", "blink.user_timing", "v8", "disabled-by-default-v8.gc", "blink"];
if (selectors) categories.push("disabled-by-default-blink.debug");

const results = [];
const selectorTotals = new Map();

for (let k = 0; k < runs; k++) {
  const context = await browser.newContext({ viewport: { width: 1000, height: 900 } });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/${variant}.html?s=${scenario}${query ? "&" + query : ""}`);
  await page.waitForFunction(() => window.bench);
  if (warm || update) {
    await page.evaluate(() => window.bench.mount());
    await page.evaluate(() => window.bench.settle(300));
    if (!update) await page.evaluate(() => window.bench.unmount());
  }
  await page.evaluate(() => window.bench.settle(300));
  await browser.startTracing(page, { categories });
  await page.evaluate(async (update) => {
    performance.mark("bench-start");
    if (update) await window.bench.update(update, 0);
    else await window.bench.mount();
    performance.mark("bench-end");
  }, update);
  await page.evaluate(() => window.bench.sleep(200));
  const buffer = await browser.stopTracing();
  await context.close();

  const events = JSON.parse(buffer.toString()).traceEvents;
  // The page's main thread
  const main = events.find((e) => e.name === "thread_name" && e.args?.name === "CrRendererMain" && events.some((x) => x.pid === e.pid && x.name === "bench-start"));
  const onMain = events.filter((e) => e.pid === main.pid && e.tid === main.tid);
  const mark = (name) => events.find((e) => e.name === name && e.pid === main.pid)?.ts;
  const t0 = mark("bench-start");
  const t1 = mark("bench-end");

  // Self time of each complete event inside the window, by nesting on the main thread
  const spans = onMain.filter((e) => e.ph === "X" && e.dur != null && e.ts >= t0 && e.ts <= t1).sort((a, b) => a.ts - b.ts || b.dur - a.dur);
  const stack = [];
  const self = new Map();
  const byPhase = {};
  for (const e of spans) {
    while (stack.length && stack[stack.length - 1].ts + stack[stack.length - 1].dur <= e.ts) {
      stack.pop();
    }
    const parent = stack[stack.length - 1];
    if (parent) self.set(parent, self.get(parent) - e.dur);
    self.set(e, e.dur);
    stack.push(e);
  }
  const names = {};
  for (const [e, us] of self) {
    const ph = phaseOf(e.name);
    byPhase[ph] = (byPhase[ph] ?? 0) + us / 1000;
    names[e.name] = (names[e.name] ?? 0) + us / 1000;
  }
  byPhase.window = (t1 - t0) / 1000;
  // Counts that don't depend on the machine: elements restyled by each style pass, objects each layout touched
  const counts = { styled: 0, stylePasses: 0, layoutDirty: 0, layoutTotal: 0, layouts: 0 };
  for (const e of spans) {
    if (e.name === "UpdateLayoutTree") {
      counts.stylePasses++;
      counts.styled += e.args?.elementCount ?? 0;
    } else if (e.name === "Layout") {
      counts.layouts++;
      counts.layoutDirty += e.args?.beginData?.dirtyObjects ?? 0;
      counts.layoutTotal += e.args?.beginData?.totalObjects ?? 0;
    }
  }
  results.push({ byPhase, names, counts });

  if (selectors) {
    for (const e of onMain) {
      if (e.name !== "SelectorStats" || e.ts < t0 || e.ts > t1) continue;
      for (const s of e.args?.selector_stats?.selector_timings ?? []) {
        const t = selectorTotals.get(s.selector) ?? { elapsed: 0, attempts: 0, matches: 0, fastRejects: 0 };
        t.elapsed += s["elapsed (us)"] / 1000 / runs;
        t.attempts += s.match_attempts / runs;
        t.matches += s.match_count / runs;
        t.fastRejects += s.fast_reject_count / runs;
        selectorTotals.set(s.selector, t);
      }
    }
  }
}

await browser.close();
server.close();

const phases = [...new Set(results.flatMap((r) => Object.keys(r.byPhase)))];
console.log(`${variant} ${scenario}${update ? " update:" + update : warm ? " (warm)" : ""}: main-thread self time, median of ${runs} traces (ms)`);
for (const ph of phases) {
  console.log(`  ${ph.padEnd(10)} ${median(results.map((r) => r.byPhase[ph] ?? 0)).toFixed(2)}`);
}
console.log("  counts (first trace):", JSON.stringify(results[0].counts));
const allNames = [...new Set(results.flatMap((r) => Object.keys(r.names)))];
const top = allNames.map((n) => [n, median(results.map((r) => r.names[n] ?? 0))]).sort((a, b) => b[1] - a[1]).slice(0, 18);
console.log("  top events by self time:");
for (const [n, ms] of top) {
  console.log(`    ${ms.toFixed(2).padStart(7)}  ${n}`);
}
if (jsonOut) {
  const out = {
    variant, scenario, warm, update, runs, query,
    phases: Object.fromEntries(phases.map((ph) => [ph, median(results.map((r) => r.byPhase[ph] ?? 0))])),
    top: top.map(([n, ms]) => ({ name: n, ms })),
    counts: results.map((r) => r.counts),
    selectors: selectors ? [...selectorTotals].sort((a, b) => b[1].elapsed - a[1].elapsed).slice(0, 40).map(([sel, t]) => ({ sel, ...t })) : null,
  };
  fs.mkdirSync(path.dirname(path.resolve(jsonOut)), { recursive: true });
  fs.writeFileSync(jsonOut, JSON.stringify(out, null, 2));
}
if (selectors) {
  const list = [...selectorTotals].sort((a, b) => b[1].elapsed - a[1].elapsed).slice(0, 25);
  const total = [...selectorTotals.values()].reduce((s, t) => s + t.elapsed, 0);
  console.log(`  selector matching total ${total.toFixed(2)} ms; top selectors (ms, attempts, matches):`);
  for (const [sel, t] of list) {
    console.log(`    ${t.elapsed.toFixed(2).padStart(6)} ${String(Math.round(t.attempts)).padStart(7)} ${String(Math.round(t.matches)).padStart(7)}  ${sel.slice(0, 150)}`);
  }
}
