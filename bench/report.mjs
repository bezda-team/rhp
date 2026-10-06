// Writes RESULTS.md from results/<browser>.json and out/sizes.json.
// BENCH_RESULTS and BENCH_OUT pick another folder of results and another file to write, BENCH_MACHINE names the machine.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url)), at = (f) => path.join(here, f);
const NAMES = {
  rhp: "rhp (static)", "rhp-css": "rhp (CSS)", "rhp-js": "rhp (JS)", "rhp-static": "rhp (static)", vanilla: "Plain DOM", chartscss: "Charts.css", d3: "D3", plot: "Observable Plot",
  chartjs: "Chart.js", echarts: "ECharts", apex: "ApexCharts", recharts: "Recharts", nivo: "Nivo", victory: "Victory",
  highcharts: "Highcharts", g2: "AntV G2", vegalite: "Vega-Lite",
};
const RESULTS = process.env.BENCH_RESULTS ?? "results";
const savedSizes = at(`${RESULTS}/sizes.json`);
const sizes = JSON.parse(fs.readFileSync(fs.existsSync(savedSizes) ? savedSizes : at("out/sizes.json"), "utf8"));
const runs = Object.fromEntries(fs.readdirSync(at(RESULTS)).filter((f) => f.endsWith(".json"))
  .map((f) => [f.slice(0, -5), JSON.parse(fs.readFileSync(at(RESULTS + "/" + f), "utf8"))]));
const kb = (b) => (b / 1000).toFixed(1);
const ms = (v) => (v == null ? "" : v < 10 ? v.toFixed(1) : Math.round(v).toString());
const table = (head, rows) => [`| ${head.join(" | ")} |`, `|${head.map((_, i) => (i ? "---:" : "---")).join("|")}|`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");
const order = (libs, key) => Object.keys(libs).sort((a, b) => key(libs[a]) - key(libs[b]));

let out = `# Results\n\nMachine: ${process.env.BENCH_MACHINE ?? "MacBook Air (Apple silicon), macOS 26"}.\nHow it was measured: [README.md](README.md).\nSmaller times, bundle sizes, memory use and dropped-frame counts are better.\n`;
if (runs.environment) {
  const notes = runs.environment.notes.flatMap(note => note.split(/(?<=[.!?])\s+(?=[A-Z])/)).join("\n");
  out += `\nEnvironment: [saved metadata](${RESULTS}/environment.json).\n${notes}\n`;
}

out += `\n## Size\n\nA bar chart app, minified and gzipped, in kB.\n\n`;
out += table(["Library", "Total", "Without React or Solid"], order(sizes, (s) => s.total).map((k) => [NAMES[k], kb(sizes[k].total), kb(sizes[k].withoutFramework)]));

for (const [engine, title] of [["chrome", "Chrome"], ["chromium", "Chromium (Playwright's build, headless)"]]) {
  const all = runs[engine]?.libs;
  if (!all) continue;
  const c = Object.fromEntries(Object.entries(all).filter(([, v]) => v.mount && v.large && v.dashboard && v.update && v.drag && v.drag4x && v.memory));
  out += `\n\n## ${title}\n\nBrowser: ${runs[engine].browser ?? "version not recorded"}.\nStarted: ${runs[engine].date}.\n${runs[engine].completed ? `Completed: ${runs[engine].completed}.` : runs[engine].loadStart ? "Status: incomplete checkpoint." : "Completion time was not recorded."}\nLibraries: ${Object.keys(c).length}.\n\n### Mount (ms)\n\n"Frame" is the frame the chart is made in.\n"Total" is all main-thread time in the second after, with deferred drawing and entry animations.\n\n`;
  if (runs[engine].failure) out += `Run stopped: ${runs[engine].failure.message}.\nIncomplete adapters are omitted from the tables.\n\n`;
  if (Object.values(c).some(v => v.idleGate)) out += `Each adapter qualified after three consecutive two-second samples with at least 90% aggregate CPU idle.\nRecorded baselines and individual mount samples are in the result JSON.\n\n`;
  out += table(["Library", "20 bars: frame", "total", "1,000 bars: frame", "total", "50 charts: frame", "total"],
    order(c, (v) => v.dashboard.total).map((k) => [NAMES[k], ...["mount", "large", "dashboard"].flatMap((s) => [ms(c[k][s].frame), ms(c[k][s].total)])]));
  out += `\n\n### Updates\n\nOne value changes.\nLatency: until its frame is drawn.\nMain thread: all work for the change, animation frames included.\nDrag: one value changes every frame for 240 frames.\n\n`;
  out += table(["Library", "Latency (ms)", "Main thread per change (ms)", "Drag: main thread per frame (ms)", "Drag: dropped frames", "Drag, CPU 4x slower: dropped frames"],
    order(c, (v) => v.update.perChange.Task).map((k) => [NAMES[k], ms(c[k].update.latency), ms(c[k].update.perChange.Task), ms(c[k].drag.perFrame.Task), c[k].drag.long, c[k].drag4x.long]));
  out += `\n\n### Memory\n\nWhat the 50-chart dashboard adds.\n\n`;
  out += table(["Library", "JS heap (MB)", "DOM nodes"], order(c, (v) => v.memory.heapMB).map((k) => [NAMES[k], c[k].memory.heapMB.toFixed(1), c[k].memory.nodes]));
}
for (const engine of ["safari", "firefox", "webkit"]) {
  const r = runs[engine]?.libs;
  if (!r) continue;
  const title = { safari: "Safari", firefox: "Firefox", webkit: "WebKit (Playwright's build)" }[engine];
  out += `\n\n## ${title}\n\nMount: the frame the chart is made in (ms).\nUpdate: from the change to its drawn frame (ms).\nDrag: dropped frames out of 240.\n\n`;
  out += table(["Library", "20 bars", "1,000 bars", "50 charts", "Update", "Drag: dropped frames", "Drag: fps"],
    order(r, (v) => v.dashboard.frame).map((k) => [NAMES[k], ms(r[k].mount.frame), ms(r[k].large.frame), ms(r[k].dashboard.frame), ms(r[k].update.latency), r[k].drag.long, r[k].drag.fps]));
}
if (runs.scale) {
  const nodeDescription = runs.scale.nodeMetric === "connected-elements"
    ? "DOM elements are connected elements added to the document, counted outside the timing window."
    : "DOM nodes are the increase reported by Chromium, including detached nodes awaiting garbage collection.";
  out += `\n\n## Scale\n\nChromium ${runs.scale.browser ?? "(version not recorded)"}, started ${runs.scale.date}.\n${runs.scale.completed ? `Completed: ${runs.scale.completed}.` : runs.scale.loadStart ? "Status: incomplete checkpoint." : "Completion time was not recorded."}\nLibraries: ${Object.keys(runs.scale.libs).length}.\nMedian of five fresh pages per scenario.\nThe frame time covers the call's frame; total covers main-thread work through the two seconds after that frame.\n${nodeDescription}\n\n`;
  for (const [scenario, label] of [["scatter-1000", "1,000 scatter points"], ["scatter-10000", "10,000 scatter points"], ["line-1000", "1,000 line points"], ["line-100000", "100,000 line points"]]) {
    const libs = Object.fromEntries(Object.entries(runs.scale.libs).filter(([, v]) => v[scenario]));
    out += `### ${label}\n\n` + table(["Library", "Frame (ms)", "Total (ms)", runs.scale.nodeMetric === "connected-elements" ? "DOM elements" : "DOM nodes", "Errors"],
      order(libs, (v) => v[scenario].total).map((lib) => {
        const v = libs[lib][scenario];
        return [NAMES[lib], ms(v.frame), ms(v.total), v.nodes, v.errors];
      })) + "\n\n";
  }
}
const file = process.env.BENCH_OUT ?? "RESULTS.md";
fs.writeFileSync(at(file), out.trimEnd() + "\n");
console.log(`${file} written`);
