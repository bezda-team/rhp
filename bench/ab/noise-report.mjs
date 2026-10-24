// For a run made by run-next.mjs: is the minimum of a page's warm mounts steadier than their median, how much did the
// page's main thread wait for a CPU (stall), and how wide is the run's own A/A interval with each estimator.
//   node noise-report.mjs results/strict-mount-chromium.json [metric=frame]
import fs from "node:fs";
import { compare, describe, median } from "./stats.mjs";
const r = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const m = process.argv[3] ?? "frame";
const [base] = r.variants;
const aa = r.variants.find((v) => v.endsWith("~aa"));
console.log(`${process.argv[2]}: ${r.engine}, warm = ${r.reduce}, A/A ${aa}`);
for (const s of Object.keys(r.samples)) {
  const rows = r.samples[s];
  const w = (k) => compare(rows[base].map((x) => x[k]), rows[aa].map((x) => x[k]));
  const width = (c) => (c.hi - c.lo).toFixed(1);
  const sp = (k) => describe(rows[base].map((x) => x[k]).filter((x) => x != null)).spread.toFixed(1);
  const stalls = r.variants.flatMap((v) => rows[v].map((x) => x["warm.stall"])).filter((x) => x != null);
  const coldStalls = r.variants.flatMap((v) => rows[v].map((x) => x["cold.stall"])).filter((x) => x != null);
  const frames = r.variants.flatMap((v) => rows[v].map((x) => x["cold.frame"])).filter((x) => x != null);
  console.log(`  ${s.padEnd(15)} warm ${m}: min spread ±${sp("warm." + m)}%, A/A width ${width(w("warm." + m))} pts | median spread ±${sp("warmMedian." + m)}%, A/A width ${width(w("warmMedian." + m))} pts` +
    ` | stall in cold frames: median ${median(coldStalls).toFixed(2)} ms, max ${Math.max(...coldStalls).toFixed(1)} ms (frame median ${median(frames).toFixed(1)} ms); worst warm stall per page: median ${median(stalls).toFixed(2)} ms`);
}
const idle = r.variants.flatMap((v) => Object.values(r.samples).flatMap((rows) => rows[v].map((x) => x.idle))).filter((x) => x != null);
const load = r.variants.flatMap((v) => Object.values(r.samples).flatMap((rows) => rows[v].map((x) => x.load))).filter((x) => x != null);
console.log(`  machine per sample: CPU idle ${Math.min(...idle).toFixed(0)}-${Math.max(...idle).toFixed(0)}% (median ${median(idle).toFixed(0)}), load ${Math.min(...load)}-${Math.max(...load)}`);
