// Writes RESULTS.md from results/<browser>.json and out/sizes.json.
// BENCH_RESULTS and BENCH_OUT pick another folder of results and another file to write, BENCH_MACHINE names the machine.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url)), at = (f) => path.join(here, f);
const NAMES = {
  "rhp-css": "rhp (CSS)", "rhp-js": "rhp (JS)", "rhp-static": "rhp (static)", vanilla: "Plain DOM", chartscss: "Charts.css", d3: "D3", plot: "Observable Plot",
  chartjs: "Chart.js", echarts: "ECharts", apex: "ApexCharts", recharts: "Recharts", nivo: "Nivo", victory: "Victory",
  highcharts: "Highcharts", g2: "AntV G2", vegalite: "Vega-Lite",
};
const RESULTS = process.env.BENCH_RESULTS ?? "results";
const sizes = JSON.parse(fs.readFileSync(at("out/sizes.json"), "utf8"));
const runs = Object.fromEntries(fs.readdirSync(at(RESULTS)).filter((f) => f.endsWith(".json"))
  .map((f) => [f.slice(0, -5), JSON.parse(fs.readFileSync(at(RESULTS + "/" + f), "utf8"))]));
const kb = (b) => (b / 1000).toFixed(1);
const ms = (v) => (v == null ? "" : v < 10 ? v.toFixed(1) : Math.round(v).toString());
const table = (head, rows) => [`| ${head.join(" | ")} |`, `|${head.map((_, i) => (i ? "---:" : "---")).join("|")}|`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");
const order = (libs, key) => Object.keys(libs).sort((a, b) => key(libs[a]) - key(libs[b]));

let out = `# Results\n\nMachine: ${process.env.BENCH_MACHINE ?? "MacBook Air (Apple silicon), macOS 26"}. How it was measured: [README.md](README.md). Lower is better everywhere.\n`;

out += `\n## Size\n\nA bar chart app, minified and gzipped, in kB.\n\n`;
out += table(["Library", "Total", "Without React or Solid"], order(sizes, (s) => s.total).map((k) => [NAMES[k], kb(sizes[k].total), kb(sizes[k].withoutFramework)]));

for (const [engine, title] of [["chrome", "Chrome"], ["chromium", "Chromium (Playwright's build, headless)"]]) {
  const c = runs[engine]?.libs;
  if (!c) continue;
  out += `\n\n## ${title}\n\n### Mount (ms)\n\n"Frame" is the frame the chart is made in. "Total" is all main-thread time in the second after, with deferred drawing and entry animations.\n\n`;
  out += table(["Library", "20 bars: frame", "total", "1,000 bars: frame", "total", "50 charts: frame", "total"],
    order(c, (v) => v.dashboard.total).map((k) => [NAMES[k], ...["mount", "large", "dashboard"].flatMap((s) => [ms(c[k][s].frame), ms(c[k][s].total)])]));
  out += `\n\n### Updates\n\nOne value changes. Latency: until its frame is drawn. Main thread: all work for the change, animation frames included. Drag: one value changes every frame for 240 frames.\n\n`;
  out += table(["Library", "Latency (ms)", "Main thread per change (ms)", "Drag: main thread per frame (ms)", "Drag: dropped frames", "Drag, CPU 4x slower: dropped frames"],
    order(c, (v) => v.update.perChange.Task).map((k) => [NAMES[k], ms(c[k].update.latency), ms(c[k].update.perChange.Task), ms(c[k].drag.perFrame.Task), c[k].drag.long, c[k].drag4x.long]));
  out += `\n\n### Memory\n\nWhat the 50-chart dashboard adds.\n\n`;
  out += table(["Library", "JS heap (MB)", "DOM nodes"], order(c, (v) => v.memory.heapMB).map((k) => [NAMES[k], c[k].memory.heapMB.toFixed(1), c[k].memory.nodes]));
}
for (const engine of ["safari", "firefox", "webkit"]) {
  const r = runs[engine]?.libs;
  if (!r) continue;
  const title = { safari: "Safari", firefox: "Firefox", webkit: "WebKit (Playwright's build)" }[engine];
  out += `\n\n## ${title}\n\nMount: the frame the chart is made in (ms). Update: from the change to its drawn frame (ms). Drag: dropped frames out of 240.\n\n`;
  out += table(["Library", "20 bars", "1,000 bars", "50 charts", "Update", "Drag: dropped frames", "Drag: fps"],
    order(r, (v) => v.dashboard.frame).map((k) => [NAMES[k], ms(r[k].mount.frame), ms(r[k].large.frame), ms(r[k].dashboard.frame), ms(r[k].update.latency), r[k].drag.long, r[k].drag.fps]));
}
const file = process.env.BENCH_OUT ?? "RESULTS.md";
fs.writeFileSync(at(file), out + "\n");
console.log(`${file} written`);
