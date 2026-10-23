import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const source = JSON.parse(fs.readFileSync(path.join(here, 'source-snapshot.json'), 'utf8'));
const {years} = source;
const at = year => years.indexOf(year);

const series = source.series.map(s => {
  assert.equal(s.values.length, years.length);
  assert.equal(s.ci95.length, years.length);
  // Each year belongs to one of the series' survey methods; a change between two years is a direct comparison only
  // within one method
  const methodOf = year => s.methods.findIndex(m => m.years.includes(year));
  assert(years.every(year => methodOf(year) >= 0), `${s.id}: a year with no method`);
  for (const [i, value] of s.values.entries()) {
    if (value == null) { assert.equal(s.ci95[i], null); continue; }
    assert(Number.isFinite(value) && value >= 0 && value <= 100);
    if (s.ci95[i]) assert(s.ci95[i][0] <= value && value <= s.ci95[i][1]);
  }
  const method = years.map(methodOf);
  const change = s.values.map((value, i) => i > 0 && value != null && s.values[i - 1] != null && method[i] === method[i - 1] ? +(value - s.values[i - 1]).toFixed(1) : null);
  return {...s, method, change};
});
const nyts = series.find(s => s.id === 'nyts'), mtf12 = series.find(s => s.id === 'mtf12'), mtf10 = series.find(s => s.id === 'mtf10');

// The headline: each survey's change from 2019 (before the outbreak) to 2020 (after it), each within one method
assert.equal(nyts.method[at(2019)], nyts.method[at(2020)]);
const change = (s, a, b) => ({before: s.values[at(a)], after: s.values[at(b)], points: +(s.values[at(b)] - s.values[at(a)]).toFixed(1), percent: (s.values[at(b)] - s.values[at(a)]) / s.values[at(a)] * 100});
const headline = {from: 2019, to: 2020, nyts: change(nyts, 2019, 2020), mtf12: change(mtf12, 2019, 2020), mtf10: change(mtf10, 2019, 2020)};
assert.deepEqual([headline.nyts.before, headline.nyts.after], [27.5, 19.6]);
assert.equal(Math.round(-headline.nyts.percent), 29);
assert(nyts.ci95[at(2020)][1] < nyts.ci95[at(2019)][0], 'the two NYTS intervals do not overlap');
assert.deepEqual([headline.mtf12.before, headline.mtf12.after], [25.5, 24.7]);
assert.equal(Math.round(-headline.mtf12.percent), 3);
assert.deepEqual([headline.mtf10.before, headline.mtf10.after], [19.9, 19.3]);
headline.nyts.dropRounded = Math.round(-headline.nyts.percent);
headline.mtf12.dropRounded = Math.round(-headline.mtf12.percent);

const data = {...source, series, headline};
fs.writeFileSync(path.join(here, 'data.json'), JSON.stringify(data, null, 2) + '\n');
const lines = ['year,series,percent,ci95_lower,ci95_upper,survey_method'];
for (let i = 0; i < years.length; i++) for (const s of series) {
  if (s.values[i] == null) continue;
  lines.push([years[i], s.id, s.values[i], ...(s.ci95[i] ?? ['', '']), JSON.stringify(s.methods[s.method[i]].survey)].join(','));
}
fs.writeFileSync(path.join(here, 'estimates.csv'), lines.join('\n') + '\n');
console.log(JSON.stringify(headline, null, 2));
