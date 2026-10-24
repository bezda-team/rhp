// Runs variants of rhp against each other, paired and interleaved.
//   node run.mjs --engine chromium --variants base,base-b,noguard --scenarios bars1000,dash50 --protocol mount
//                [--rounds 20] [--warm 4] [--out results/name.json] [--quiet 0.85]
// Protocols:
//   mount           a fresh page per sample: the first chart on the page (cold), then `warm` more mounts of the same
//                   chart after unmounting it (warm), each timed by its frame and, in Chromium, by the browser's counters
//   update:<kind>   a chart, then 6 changes of one kind (one, all, scale): the work of each of the 24 frames after it
//   stream:<kind>   a change in every frame for 120 frames: the work of each frame and the gaps between frames
// Every round measures each variant once, in a rotating order, and the pairs of a round are compared.
// The machine is never assumed quiet. Every run carries its own A/A control (the base again, as "<base>~aa", unless
// --no-aa), every warm number is the minimum of the page's warm mounts (--reduce median for the median), every sample
// records how long the page's main thread waited for a CPU during its frame (stall: wall time minus thread time), and
// the summary says when a change is smaller than the run's own noise.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { state, quiet } from "./machine.mjs";
import { compare, describe, roundOrder, fmt, fmtChange, median } from "./stats.mjs";
const RHP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const { chromium, firefox, webkit } = await import(`${RHP}/node_modules/playwright/index.mjs`);

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) => {
  const i = process.argv.indexOf("--" + name);
  return i < 0 ? fallback : process.argv[i + 1];
};
const engine = arg("engine", "chromium");
const variants = arg("variants", "base").split(",");
if (!process.argv.includes("--no-aa") && !variants.includes(variants[0] + "~aa") && !variants.includes("base-b")) variants.splice(1, 0, variants[0] + "~aa");
const bundleOf = (v) => v.split(/[?~]/)[0];
const scenarios = arg("scenarios", "bars1000").split(",");
const protocol = arg("protocol", "mount");
const rounds = +arg("rounds", 20);
// Adaptive: with --target (a percentage), rounds go on past --rounds until every variant's 95% interval on --key is at
// most that wide on each side, or --max-rounds is reached. (Looking at the data as it comes widens the false alarm rate
// a little; this is for reaching a precision, and the A/A control shows what it does.)
const target = arg("target", null) == null ? null : +arg("target");
const maxRounds = +arg("max-rounds", rounds);
const keyMetric = arg("key", null);
const warm = +arg("warm", 4);
const outDir = arg("dir", "out");
const outFile = path.resolve(here, arg("out", `results/${engine}-${protocol.replace(":", "-")}-${Date.now()}.json`));
// 0: don't wait for the machine (the default; the state is recorded with every sample)
const quietShare = +arg("quiet", 0);
const reduce = arg("reduce", "min");
const dpr = +arg("dpr", 1);
// The browser's counters in thread time (CPU time of the page's main thread, which leaves out time the thread waited
// while other programs ran) or in wall time
const clock = arg("clock", "thread");
const CDP = engine === "chromium" || engine === "chrome";

// Pages are served over http with cross-origin isolation, so performance.now() is precise (5 µs in Chromium, not 100)
const server = http.createServer((q, r) => {
  const f = path.join(here, outDir, new URL(q.url, "http://x").pathname);
  if (!fs.existsSync(f)) return r.writeHead(404).end();
  r.writeHead(200, {
    "content-type": f.endsWith(".html") ? "text/html" : "text/javascript",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-embedder-policy": "require-corp",
    "cache-control": "no-store",
  }).end(fs.readFileSync(f));
}).listen(0, "127.0.0.1");
await new Promise((r) => server.on("listening", r));
// --query adds to every page's URL (css=selection, pre=1: see page.js)
const query = arg("query", "");
// A variant can carry its own query (base?pre=1), so two setups of one bundle are paired in one run
const url = (variant, scenario) => {
  const own = variant.split("~")[0].split("?")[1];
  return `http://127.0.0.1:${server.address().port}/${bundleOf(variant)}.html?s=${scenario}${query ? "&" + query : ""}${own ? "&" + own : ""}`;
};

const launch = {
  chromium: () => chromium.launch({ channel: "chromium", headless: true }),
  chrome: () => chromium.launch({ channel: "chrome", headless: true }),
  firefox: () => firefox.launch({ headless: true }),
  webkit: () => webkit.launch({ headless: true }),
}[engine];
const browser = await launch();

const DURATIONS = { task: "TaskDuration", script: "ScriptDuration", style: "RecalcStyleDuration", layout: "LayoutDuration" };
const COUNTS = { styleCount: "RecalcStyleCount", layoutCount: "LayoutCount" };

async function open(variant, scenario) {

  const context = await browser.newContext({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: dpr });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url(variant, scenario), { waitUntil: "load" });
  await page.waitForFunction(() => window.bench);
  // Timer precision depends on it (Chromium 5 µs isolated, 100 µs not; Firefox 20 µs or 1 ms)
  results.isolated ??= await page.evaluate(() => self.crossOriginIsolated);
  let cdp = null;
  let wallCdp = null;
  if (CDP) {
    cdp = await context.newCDPSession(page);
    await cdp.send("Performance.enable", { timeDomain: clock === "thread" ? "threadTicks" : "timeTicks" });
    // A second session on the same page counts in wall time, so each sample has both clocks for the same window
    if (clock === "thread") {
      wallCdp = await context.newCDPSession(page);
      await wallCdp.send("Performance.enable", { timeDomain: "timeTicks" });
    }
  }

  const read = async (session) => Object.fromEntries((await session.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
  const metrics = async () => {
    if (!cdp) return null;
    const [own, wall] = await Promise.all([read(cdp), wallCdp ? read(wallCdp) : null]);
    if (wall) own.WallTaskDuration = wall.TaskDuration;
    return own;
  };
  const delta = (a, b) => {
    if (!a || !b) return {};
    const out = {};
    for (const [k, name] of Object.entries(DURATIONS)) {
      out[k] = (b[name] - a[name]) * 1000;
    }
    for (const [k, name] of Object.entries(COUNTS)) {
      out[k] = b[name] - a[name];
    }
    // Main-thread task time in wall time minus in thread time: how long its tasks waited for a CPU
    if (a.WallTaskDuration != null) out.wait = Math.max(0, (b.WallTaskDuration - a.WallTaskDuration) - (b.TaskDuration - a.TaskDuration)) * 1000;
    return out;
  };
  const gc = async () => {
    if (cdp) await cdp.send("HeapProfiler.collectGarbage");
  };

  return { page, errors, metrics, delta, gc, close: () => context.close() };
}

// One page of the mount protocol: the first mount (cold) and `warm` mounts after it
async function mountSample(variant, scenario) {

  const p = await open(variant, scenario);
  try {
    const one = async () => {
      await p.page.evaluate(() => window.bench.settle(150));
      await p.gc();
      const m0 = await p.metrics();
      const r = await p.page.evaluate(() => window.bench.mount());
      const mf = await p.metrics();
      await p.page.evaluate(() => window.bench.sleep(300));
      const m1 = await p.metrics();
      // In thread time, the frame's work; the wall time it took beyond that is time the thread waited for a CPU
      const f = p.delta(m0, mf);
      // How long the mount frame's tasks waited for a CPU (both clocks, same window)
      const stall = f.wait ?? null;
      const { wait, ...rest } = p.delta(m0, m1);
      return { frame: r.frame, call: r.script, stall, ...rest };
    };
    const cold = await one();
    const census = await p.page.evaluate(() => window.bench.census());
    const warmRuns = [];
    for (let i = 0; i < warm; i++) {
      await p.page.evaluate(() => window.bench.unmount());
      warmRuns.push(await one());
    }
    const out = {};
    for (const [k, v] of Object.entries(cold)) {
      out["cold." + k] = v;
    }
    const pick = reduce === "min" ? (a) => Math.min(...a.filter((x) => x != null)) : median;
    for (const k of Object.keys(cold)) {
      if (!warmRuns.length || cold[k] == null) continue;
      out["warm." + k] = k === "stall" ? Math.max(...warmRuns.map((w) => w[k])) : pick(warmRuns.map((w) => w[k]));
      if (reduce === "min" && k !== "stall") out["warmMedian." + k] = median(warmRuns.map((w) => w[k]));
    }
    return { metrics: out, census, errors: p.errors };
  } finally {
    await p.close();
  }
}

// One page of the update protocol: 6 changes of one kind, 24 frames each
async function updateSample(variant, scenario, kind) {

  const p = await open(variant, scenario);
  try {
    await p.page.evaluate(() => window.bench.mount());
    await p.page.evaluate(() => window.bench.settle(800));
    const runs = [];
    for (let t = 0; t < 6; t++) {
      await p.gc();
      await p.page.evaluate(() => window.bench.settle(100));
      const m0 = await p.metrics();
      const f = await p.page.evaluate(([kind, t]) => window.bench.update(kind, t), [kind, t]);
      const m1 = await p.metrics();
      const work = f.map((x) => x.work);
      runs.push({
        first: work[0], second: work[1], frames: work.reduce((a, b) => a + b, 0), peak: Math.max(...work),
        busy: work.filter((w) => w > 1).length, ...p.delta(m0, m1),
      });
    }
    const out = {};
    for (const k of Object.keys(runs[0])) {
      out[k] = median(runs.map((r) => r[k]));
    }
    return { metrics: out, errors: p.errors };
  } finally {
    await p.close();
  }
}

// One page of the stream protocol: a change in every frame for 120 frames
async function streamSample(variant, scenario, kind) {

  const p = await open(variant, scenario);
  try {
    await p.page.evaluate(() => window.bench.mount());
    await p.page.evaluate(() => window.bench.settle(800));
    await p.gc();
    const m0 = await p.metrics();
    const f = await p.page.evaluate((kind) => window.bench.stream(kind, 120, 24), kind);
    const m1 = await p.metrics();
    const work = f.slice(0, 120).map((x) => x.work);
    const gaps = f.slice(1, 121).map((x, i) => x.ts - f[i].ts);
    const d = p.delta(m0, m1);
    const out = { work: median(work), workP90: [...work].sort((a, b) => a - b)[Math.floor(work.length * 0.9)], dropped: gaps.filter((g) => g > 25).length };
    for (const k of Object.keys(d)) {
      out[k] = d[k] / 120;
    }
    return { metrics: out, errors: p.errors };
  } finally {
    await p.close();
  }
}

const [kindName, kindArg] = protocol.split(":");
const sample = { mount: mountSample, update: (v, s) => updateSample(v, s, kindArg), stream: (v, s) => streamSample(v, s, kindArg) }[kindName];
if (!sample) throw new Error("no protocol " + protocol);

const manifest = JSON.parse(fs.readFileSync(path.join(here, outDir, "manifest.json"), "utf8"));
const results = {
  engine, browser: browser.version(), protocol, rounds, target, maxRounds, warm, dpr, clock, query, variants, scenarios,
  bundles: Object.fromEntries(variants.map((v) => [v, manifest[bundleOf(v)]])), reduce, quietShare,
  start: state(), machine: [], canary: [], samples: {}, census: {}, errors: [],
};
fs.mkdirSync(path.dirname(outFile), { recursive: true });
const save = () => fs.writeFileSync(outFile, JSON.stringify(results, null, 2));

try {
  for (const scenario of scenarios) {
    results.samples[scenario] = Object.fromEntries(variants.map((v) => [v, []]));
    for (let r = 0; r < Math.max(rounds, target == null ? 0 : maxRounds); r++) {
      if (r >= rounds && target != null && precise(scenario, target)) break;
      const wait = quietShare > 0 ? await quiet({ share: quietShare }) : { waited: 0, met: null };
      const m = { scenario, round: r, ...state(), quiet: wait };
      // The canary: plain DOM, the same work every round, so a slower machine shows up apart from the variants
      const c = await mountSample(bundleOf(variants[0]), "plain1000");
      m.canary = c.metrics["cold.frame"];
      results.machine.push(m);
      for (const v of roundOrder(variants, r)) {
        const before = state();
        const s = await sample(v, scenario);
        results.samples[scenario][v][r] = { ...s.metrics, idle: state().idleSinceLast, load: before.load[0] };
        if (s.census) (results.census[scenario] ??= {})[v] ??= s.census;
        if (s.errors.length) results.errors.push({ scenario, variant: v, round: r, errors: s.errors });
      }
      process.stdout.write(`\r${scenario} round ${r + 1}/${target == null ? rounds : rounds + "-" + maxRounds} (canary ${fmt(m.canary)} ms, load ${m.load[0]}, quiet wait ${wait.waited} ms)   `);
      save();
    }
    process.stdout.write("\n");
    summarize(scenario);
  }
  results.end = state();
  save();
} finally {
  await browser.close();
  server.close();
}

// Whether every variant's interval on the key metric is within the target, on each side of its estimate
function precise(scenario, pct) {

  const rows = results.samples[scenario];
  const key = keyMetric ?? { mount: "warm.frame", update: "frames", stream: "work" }[kindName];
  const base = rows[variants[0]].map((x) => x?.[key]);

  return variants.slice(1).every((v) => {
    const c = compare(base, rows[v].map((x) => x?.[key]));
    return Number.isFinite(c.lo) && Math.max(c.change - c.lo, c.hi - c.change) <= pct;
  });
}

function summarize(scenario) {

  const rows = results.samples[scenario];
  const keys = Object.keys(rows[variants[0]].find(Boolean) ?? {}).filter((k) => !["idle", "load"].includes(k) && !/Count$/.test(k));
  const census = results.census[scenario];
  if (census) {
    const base = census[variants[0]];
    for (const v of variants) {
      const c = census[v];
      if (c && (c.elements !== base.elements || c.geometry !== base.geometry)) console.log(`  ! ${v} draws differently: ${c.elements} elements, geometry ${c.geometry} (base ${base.elements}, ${base.geometry})`);
    }
  }
  const n = rows[variants[0]].filter(Boolean).length;
  const aa = variants.find((v) => v === variants[0] + "~aa" || v === "base-b");
  console.log(`\n${scenario} (${engine}, ${protocol}, ${n} rounds, warm = ${reduce})`);
  for (const k of keys) {
    const series = (v) => rows[v].map((s) => s?.[k]);
    const b = series(variants[0]);
    // The run's own noise: how far its A/A interval reaches from zero
    const floor = aa ? (() => { const c = compare(b, series(aa)); return Math.max(Math.abs(c.lo), Math.abs(c.hi)); })() : null;
    const line = variants.map((v) => {
      const d = describe(series(v).filter((x) => x != null));
      const c = v === variants[0] ? null : compare(b, series(v));
      const within = c && v !== aa && floor != null && Math.abs(c.change) <= floor ? " (within noise)" : "";
      return `${v} ${fmt(d.median, 2)} (±${fmt(d.spread)}%)${c ? " " + fmtChange(c) + within : ""}`;
    });
    console.log(`  ${k.padEnd(18)} ${line.join(" | ")}${floor != null ? `  [noise ±${floor.toFixed(1)}%]` : ""}`);
  }
}
