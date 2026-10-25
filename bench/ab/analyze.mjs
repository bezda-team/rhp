// Tables from run.mjs results: each variant's change against the base, with its 95% interval, for chosen metrics.
//   node analyze.mjs results/a.json [results/b.json ...] [--metrics cold.frame,warm.frame,warm.style] [--json out.json]
// Also reports the A/A control (base-b) and how many of its intervals leave out zero, which should be about 5%.
import fs from "node:fs";
import { compare, describe, fmt, fmtChange } from "./stats.mjs";

const files = process.argv.slice(2).filter((a) => !a.startsWith("--") && !process.argv[process.argv.indexOf(a) - 1]?.startsWith("--"));
const opt = (name, fallback) => {
  const i = process.argv.indexOf("--" + name);
  return i < 0 ? fallback : process.argv[i + 1];
};
const wanted = opt("metrics", null)?.split(",");
const jsonOut = opt("json", null);
const table = [];
let aa = 0;
let aaClear = 0;

for (const file of files) {
  const r = JSON.parse(fs.readFileSync(file, "utf8"));
  const [base] = r.variants;
  for (const scenario of Object.keys(r.samples)) {
    const rows = r.samples[scenario];
    const metrics = wanted ?? Object.keys(rows[base].find(Boolean) ?? {}).filter((k) => !/Count$/.test(k));
    console.log(`\n${scenario}  (${r.engine} ${r.browser}, ${r.protocol}${r.query ? " " + r.query : ""}, ${rows[base].filter(Boolean).length} rounds)`);
    console.log("  " + "variant".padEnd(16) + metrics.map((m) => m.padStart(30)).join(""));
    for (const v of r.variants) {
      const cells = metrics.map((m) => {
        const series = (x) => rows[x].map((s) => s?.[m]);
        if (v === base) {
          const d = describe(series(v).filter((x) => x != null));
          return `${fmt(d.median, 2)} ms (±${fmt(d.spread)}%)`;
        }
        const c = compare(series(base), series(v));
        if (v === "base-b") {
          aa++;
          if (c.clear) aaClear++;
        }
        table.push({ file, engine: r.engine, protocol: r.protocol, query: r.query, scenario, variant: v, metric: m, base: describe(series(base).filter((x) => x != null)).median, ...c });
        return fmtChange(c);
      });
      console.log("  " + v.padEnd(16) + cells.map((c) => c.padStart(30)).join(""));
    }
  }
}

console.log(`\nA/A control: ${aaClear} of ${aa} base-b intervals leave out zero (${aa ? ((aaClear / aa) * 100).toFixed(0) : 0}%, expected about 5%)`);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(table, null, 2));
