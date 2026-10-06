// Diagnostic traces of an immutable ManyDots benchmark snapshot.
// node bench/manydots-trace.mjs --snapshot /path/from/prepare --results bench/results-manydots-trace-...
// This is phase attribution with tracing overhead, not a repeat of the untraced timing benchmark.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../package.json"));
const { chromium } = require("playwright");
const args = process.argv.slice(2);
const options = Object.fromEntries(args.flatMap((arg, i) => arg.startsWith("--") ? [[arg.slice(2), args[i + 1]]] : []));
if (!options.snapshot || !options.results) throw new Error("Pass --snapshot and --results");
const snapshot = path.resolve(options.snapshot), directory = path.resolve(options.results);
fs.mkdirSync(directory, { recursive: true });
if (fs.existsSync(path.join(directory, "results.json"))) throw new Error("Use a fresh results directory");
const inputs = JSON.parse(fs.readFileSync(path.join(snapshot, "inputs.json"), "utf8"));
const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
for (const [file, expected] of Object.entries(inputs.sourceHashes)) {
  if (hash(path.join(snapshot, file)) !== expected) throw new Error(`Modified source snapshot: ${file}`);
}
if (hash(path.join(snapshot, "out/benchmark.js")) !== inputs.bundleHash) throw new Error("Modified snapshot bundle");

const categories = ["-*", "devtools.timeline", "disabled-by-default-devtools.timeline", "disabled-by-default-devtools.timeline.frame",
  "blink.user_timing", "v8.execute", "v8", "cppgc", "toplevel"];
const cpu = () => os.cpus().reduce((sum, core) => ({ idle: sum.idle + core.times.idle,
  total: sum.total + Object.values(core.times).reduce((a, b) => a + b, 0) }), { idle: 0, total: 0 });
const idlePercent = (before, after) => (after.idle - before.idle) / (after.total - before.total) * 100;
const markNames = ["rhp-request-start", "rhp-data-ready", "rhp-mount-start", "rhp-mount-end", "rhp-harness-end", "rhp-window-end"];

function completeEvents(events, pid, tid) {
  const out = [], stack = [];
  const ordered = events.filter((event) => event.pid === pid && event.tid === tid).sort((a, b) => a.ts - b.ts);
  for (const event of ordered) {
    if (event.ph === "X" && event.dur > 0) out.push({ ...event, end: event.ts + event.dur });
    else if (event.ph === "B") stack.push(event);
    else if (event.ph === "E" && stack.length) {
      const begin = stack.pop();
      if (event.ts > begin.ts) out.push({ ...begin, ph: "X", dur: event.ts - begin.ts, end: event.ts });
    }
  }
  return out;
}

function phase(name) {
  if (/^(MajorGC|MinorGC|GCEvent|BlinkGC\.|CppGC\.|V8\.GC)/.test(name)) return "GC";
  if (name === "UpdateLayoutTree" || name === "RecalculateStyles") return "ExplicitStyleSpan";
  // Size-container recalculation is included in this coarse trace span but separately attributed by CDP probes.
  if (name === "Layout") return "LayoutIncludingInterleavedStyle";
  if (name === "PrePaint") return "PrePaint";
  if (name === "Paint" || name === "PaintSetup" || name === "PaintImage") return "Paint";
  if (name === "Layerize") return "Layerize";
  if (name === "Commit" || name === "BeginCommitCompositorFrame") return "Commit";
  if (name === "UpdateLayerTree" || name === "UpdateLayer" || name === "CompositeLayers") return "LayerUpdateOrComposite";
  if (/^(V8\.Compile|v8\.compile|V8\.Parse|v8\.parse|V8\.OptimizeCode|CompileScript|CompileCode)/.test(name)) return "Compile";
  if (["FunctionCall", "EvaluateScript", "EvaluateModule", "RunMicrotasks", "FireAnimationFrame", "EventDispatch", "TimerFire", "V8.Execute", "HandlePostMessage"].includes(name)) return "Script";
  return undefined;
}

// Sweep clipped synchronous intervals, attributing each time slice to its innermost recognized phase.
// Every busy slice is counted once. Unrecognized descendants retain their nearest recognized ancestor's phase.
function attribute(events, start, end) {
  const intervals = events.filter((event) => event.end > start && event.ts < end).map((event) => ({
    ...event, start: Math.max(start, event.ts), finish: Math.min(end, event.end), category: phase(event.name),
    task: event.name === "RunTask" || event.name.endsWith("::RunTask"),
  }));
  const boundaries = new Map();
  const at = (time) => {
    if (!boundaries.has(time)) boundaries.set(time, { add: [], remove: [] });
    return boundaries.get(time);
  };
  for (let i = 0; i < intervals.length; i++) {
    const event = intervals[i];
    if (!event.task && !event.category) continue;
    at(event.start).add.push(i); at(event.finish).remove.push(i);
  }
  const points = [...boundaries.keys()].sort((a, b) => a - b), active = new Set();
  const exclusive = {}, byName = {};
  let taskUnion = 0, phaseOutsideTasks = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const boundary = boundaries.get(points[i]);
    for (const id of boundary.remove) active.delete(id);
    for (const id of boundary.add) active.add(id);
    const duration = points[i + 1] - points[i];
    if (duration <= 0) continue;
    const entries = [...active].map((id) => intervals[id]);
    const busy = entries.some((event) => event.task);
    const recognized = entries.filter((event) => event.category).sort((a, b) =>
      b.ts - a.ts || a.dur - b.dur || Number(b.category === "GC") - Number(a.category === "GC"));
    const chosen = recognized[0];
    if (!busy && !chosen) continue;
    if (busy) taskUnion += duration;
    else phaseOutsideTasks += duration;
    const key = chosen?.category ?? "OtherTask";
    exclusive[key] = (exclusive[key] ?? 0) + duration;
    const name = chosen?.name ?? "UnattributedTaskSelfTime";
    byName[name] = (byName[name] ?? 0) + duration;
  }
  return { windowMs: (end - start) / 1000, taskUnionMs: taskUnion / 1000, phaseOutsideTasksMs: phaseOutsideTasks / 1000,
    exclusiveMs: Object.fromEntries(Object.entries(exclusive).map(([name, value]) => [name, value / 1000])),
    exclusiveByEventMs: Object.fromEntries(Object.entries(byName).sort((a, b) => b[1] - a[1]).map(([name, value]) => [name, value / 1000])) };
}

function analyze(trace) {
  const events = trace.traceEvents ?? trace;
  const markers = Object.fromEntries(markNames.map((name) => {
    const event = events.find((entry) => entry.name === name);
    if (!event) throw new Error(`Missing trace mark: ${name}`);
    return [name, event];
  }));
  const { pid, tid } = markers[markNames[0]];
  const main = completeEvents(events, pid, tid);
  const segments = {
    all: [markers["rhp-request-start"].ts, markers["rhp-window-end"].ts],
    preparation: [markers["rhp-request-start"].ts, markers["rhp-mount-start"].ts],
    mountScript: [markers["rhp-mount-start"].ts, markers["rhp-mount-end"].ts],
    renderToHarnessEnd: [markers["rhp-mount-end"].ts, markers["rhp-harness-end"].ts],
    tail: [markers["rhp-harness-end"].ts, markers["rhp-window-end"].ts],
  };
  return { rendererMain: { pid, tid, name: events.find((event) => event.ph === "M" && event.pid === pid && event.tid === tid && event.name === "thread_name")?.args?.name },
    markerOffsetsMs: Object.fromEntries(Object.entries(markers).map(([name, event]) => [name, (event.ts - markers["rhp-request-start"].ts) / 1000])),
    segments: Object.fromEntries(Object.entries(segments).map(([name, [start, end]]) => [name, attribute(main, start, end)])),
    styleLayoutInterpretation: "Layout trace spans include interleaved size-container style recalculation. ExplicitStyleSpan is not total style time. Use the separately attributed CDP RecalcStyleDuration and LayoutDuration counters for their split.",
    mainEventCounts: Object.fromEntries([...new Set(main.map((event) => event.name))].sort().map((name) => [name, main.filter((event) => event.name === name).length])),
    otherThreads: events.filter((event) => event.ph === "M" && event.name === "thread_name" && !(event.pid === pid && event.tid === tid)).map((event) => ({ pid: event.pid, tid: event.tid, name: event.args?.name })) };
}

async function readStream(session, stream) {
  const parts = [];
  for (;;) {
    const chunk = await session.send("IO.read", { handle: stream, size: 1024 * 1024 });
    parts.push(Buffer.from(chunk.data, chunk.base64Encoded ? "base64" : "utf8"));
    if (chunk.eof) break;
  }
  await session.send("IO.close", { handle: stream });
  return Buffer.concat(parts);
}

const result = { started: new Date().toISOString(), diagnostic: true, inputs, categories,
  machine: { cpu: os.cpus()[0].model, cores: os.cpus().length, node: process.version, platform: os.platform(), release: os.release(), loadStart: os.loadavg() },
  method: { n: 10000, variant: "manydots", freshPages: true, viewport: { width: 1000, height: 900 }, totalWindowMs: 2000,
    immutableSnapshot: true, markers: "Injected diagnostic hooks only, frozen source and bundle untouched",
    note: "Tracing changes overhead. These are attribution diagnostics, not comparable untraced benchmark timings. Renderer-main synchronous intervals are attributed exclusively; raster/GPU threads are kept separate." },
  cases: {} };
const save = () => fs.writeFileSync(path.join(directory, "results.json"), JSON.stringify(result, null, 2) + "\n");
save();
const browser = await chromium.launch({ executablePath: process.env.BENCH_BROWSER });
result.machine.browser = browser.version();
try {
  for (const appearance of ["uniform", "categories", "unique"]) {
    const page = await browser.newPage({ viewport: result.method.viewport });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const tracing = await browser.newBrowserCDPSession();
    let recording = false;
    try {
      await page.goto(pathToFileURL(path.join(snapshot, "out/benchmark.html")).href);
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Performance.enable");
      const metrics = async () => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map(({ name, value }) => [name, value]));
      await page.evaluate(() => {
        let rows;
        Object.defineProperty(window.bench, "rows", { configurable: true,
          get: () => rows, set: (value) => { rows = value; performance.mark("rhp-data-ready"); } });
        const nativeRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = (callback) => nativeRAF.call(window, (timestamp) => {
          window.requestAnimationFrame = nativeRAF;
          performance.mark("rhp-mount-start");
          callback(timestamp);
          performance.mark("rhp-mount-end");
        });
      });
      const available = (await tracing.send("Tracing.getCategories")).categories;
      const absent = categories.filter((category) => category !== "-*" && !available.includes(category));
      if (absent.length) throw new Error(`Unsupported trace categories: ${absent.join(", ")}`);
      await tracing.send("Tracing.start", { transferMode: "ReturnAsStream", streamFormat: "json", streamCompression: "none",
        traceConfig: { recordMode: "recordUntilFull", traceBufferSizeInKb: 256000, includedCategories: categories } });
      recording = true;
      const initialCPU = cpu(), initial = await metrics();
      const frame = await page.evaluate(async (appearance) => {
        performance.mark("rhp-request-start");
        const frame = await window.bench.run({ n: 10000, variant: "manydots", appearance });
        performance.mark("rhp-harness-end");
        return frame;
      }, appearance);
      await page.waitForTimeout(2000);
      await page.evaluate(() => performance.mark("rhp-window-end"));
      const final = await metrics(), finalCPU = cpu();
      const complete = new Promise((resolve) => tracing.once("Tracing.tracingComplete", resolve));
      await tracing.send("Tracing.end");
      recording = false;
      const finished = await complete;
      if (finished.dataLossOccurred || !finished.stream) throw new Error("Trace lost data or returned no stream");
      const data = await readStream(tracing, finished.stream);
      fs.writeFileSync(path.join(directory, `${appearance}.trace.json`), data);
      const trace = JSON.parse(data.toString("utf8"));
      const deltas = Object.fromEntries(Object.keys(final).map((name) => [name, final[name] - (initial[name] ?? 0)]));
      const durationDeltasMs = Object.fromEntries(Object.entries(deltas).filter(([name]) => /Duration$|^(ThreadTime|ProcessTime)$/.test(name)).map(([name, value]) => [name, value * 1000]));
      const analysis = analyze(trace);
      result.cases[appearance] = { frame, errors, aggregateCPUIdlePercent: idlePercent(initialCPU, finalCPU),
        initialMetrics: initial, finalMetrics: final, metricDeltas: deltas, durationDeltasMs, traceBytes: data.length,
        traceDataLossOccurred: finished.dataLossOccurred, analysis };
      if (errors.length) throw new Error(`Page errors: ${errors.join(" | ")}`);
      save();
      console.log(`${appearance}: CDP ${JSON.stringify(durationDeltasMs)}\nEXCLUSIVE ${JSON.stringify(analysis.segments.all)}`);
    } finally {
      if (recording) await tracing.send("Tracing.end").catch(() => {});
      await tracing.detach();
      await page.close();
    }
  }
  result.completed = new Date().toISOString();
  result.machine.loadEnd = os.loadavg();
  save();
} catch (error) {
  result.failure = { message: error.message, at: new Date().toISOString() };
  save();
  throw error;
} finally {
  await browser.close();
}
