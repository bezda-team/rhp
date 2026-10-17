import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const here = path.dirname(fileURLToPath(import.meta.url));
const url = "https://www.epa.gov/power-sector/progress-report-emissions-reductions";
const snapshotFile = path.join(here, "source-snapshot.json");
const fuels = ["Coal", "Gas", "Oil", "Other"];
let snapshot;
if (process.argv.includes("--offline")) {
  snapshot = JSON.parse(fs.readFileSync(snapshotFile, "utf8"));
} else {
  const response = await fetch(url);
  assert(response.ok, `EPA returned ${response.status}`);
  const source = await response.text();
  const read = (name) => {
    const match = source.match(new RegExp(`var\\s+${name}\\s*=\\s*(\\[[^;]+\\]);`));
    assert(match, `Missing EPA array ${name}`);
    return JSON.parse(match[1].replaceAll("'", '"'));
  };
  const years = read("fig3Years").map(Number);
  const series = Object.fromEntries(fuels.flatMap((fuel) => ["Top", "Bottom"].map((part) => {
    const name = `so2${fuel}Data${part}`;
    return [name, read(name)];
  })));
  snapshot = {
    url, retrievedAt: new Date().toISOString(),
    sha256: createHash("sha256").update(source).digest("hex"),
    figure: "Figure 4: Comparison of SO2 Emissions and Generation, fuel-specific series",
    years, series,
    units: { Top: "US short tons of sulfur dioxide", Bottom: "megawatt-hours of electricity" },
    sourceScopeNote: "The data reflect totals for units required to comply with each program in each respective year. CSAPR-only SO2 units are not included before 2015. Fuel type represents primary fuel type; units might combust more than one fuel.",
  };
  fs.writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2) + "\n");
}
assert.deepEqual(snapshot.years, Array.from({ length: 24 }, (_, i) => 2000 + i));
for (const values of Object.values(snapshot.series)) {
  assert.equal(values.length, snapshot.years.length);
  assert(values.every((n) => Number.isFinite(n) && n >= 0));
}
const total = (part, i) => fuels.reduce((sum, fuel) => sum + snapshot.series[`so2${fuel}Data${part}`][i], 0);
const rows = snapshot.years.map((year, i) => ({
  year, so2Tons: total("Top", i), generationMWh: total("Bottom", i),
  so2Index: total("Top", i) / total("Top", 0) * 100,
  generationIndex: total("Bottom", i) / total("Bottom", 0) * 100,
  coalGenerationMWh: snapshot.series.so2CoalDataBottom[i],
  gasGenerationMWh: snapshot.series.so2GasDataBottom[i],
}));
const last = rows.at(-1);
assert.equal(rows[0].so2Tons, 11201497);
assert.equal(last.so2Tons, 650359);
assert.equal(Math.round(100 - last.so2Index), 94);
assert.equal(Math.round(100 - last.generationIndex), 2);
const data = {
  source: url, retrievedAt: snapshot.retrievedAt, first: 2000, last: 2023,
  scope: "U.S. power plants in EPA's Acid Rain Program and CSAPR SO2 comparison, with coverage in each respective year.",
  method: "Sum coal, gas, oil and other series from EPA Figure 4 separately for emissions and generation. Divide each annual total by its own 2000 total and multiply by 100. Both series share one index axis; it does not compare tons to MWh.",
  caveat: "Program coverage changes over time; CSAPR-only SO2 units enter in 2015. These are covered power plants, not all U.S. emissions or all electricity generation. Emissions are not a measure of rainfall pH or complete ecosystem recovery.",
  rows,
  claims: {
    so2ReductionPercent: 100 - last.so2Index,
    generationChangePercent: last.generationIndex - 100,
    coalGenerationChangePercent: (last.coalGenerationMWh / rows[0].coalGenerationMWh - 1) * 100,
    wetSulfateReduction: {
      percent: 73, region: "Eastern United States", from: "2000 to 2002 average", to: "2020 to 2022 average",
      source: "https://www.epa.gov/power-sector/progress-report-atmospheric-deposition",
    },
  },
};
fs.writeFileSync(path.join(here, "data.json"), JSON.stringify(data, null, 2) + "\n");
console.log(JSON.stringify({ years: rows.length, so2ReductionPercent: data.claims.so2ReductionPercent, generationChangePercent: data.claims.generationChangePercent }));
