// How precise the harness is, from a run's own data: interval width against the number of rounds, cold and warm
// spread, what two runs of the old method (a median of 5 consecutive samples) would disagree by, and the canary.
import fs from "node:fs";
import { compare, describe, median } from "./stats.mjs";
const r = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const metrics = (process.argv[3] ?? "cold.frame,warm.frame").split(",");
for (const scenario of Object.keys(r.samples)) {
  const rows = r.samples[scenario];
  console.log(`\n${scenario}`);
  for (const m of metrics) {
    const b = rows.base.map((s) => s?.[m]);
    const aa = rows["base-b"]?.map((s) => s?.[m]);
    const width = (n, v) => { const c = compare(b.slice(0, n), rows[v].map((s) => s?.[m]).slice(0, n)); return `${(c.hi - c.lo).toFixed(1)}`; };
    const ns = [6, 8, 10, 12].filter((n) => n <= b.length);
    const d = describe(b);
    // the old method: the median of 5 samples in a row, twice, from the same code (rounds 0-4 and 5-9)
    const old = b.length >= 10 ? ((median(b.slice(5, 10)) / median(b.slice(0, 5)) - 1) * 100).toFixed(1) : "-";
    console.log(`  ${m.padEnd(11)} spread ±${d.spread.toFixed(1)}%  A/A interval width (pts) at n=${ns.join("/")}: ${aa ? ns.map((n) => width(n, "base-b")).join("/") : "-"}` +
      `  noguard: ${rows.noguard ? ns.map((n) => width(n, "noguard")).join("/") : "-"}  two old-method runs of base differ by ${old}%`);
  }
}
const canary = r.machine.map((m) => m.canary);
console.log(`\ncanary (plain DOM, 1,000 rows, every round): median ${median(canary).toFixed(1)} ms, range ${Math.min(...canary).toFixed(1)}-${Math.max(...canary).toFixed(1)}; ` +
  `power ${[...new Set(r.machine.map((m) => m.power))].join("/")}, speed limit ${[...new Set(r.machine.map((m) => m.cpuSpeedLimit))].join("/")}, load ${Math.min(...r.machine.map((m) => m.load[0]))}-${Math.max(...r.machine.map((m) => m.load[0]))}`);
