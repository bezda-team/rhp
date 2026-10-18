import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const source = JSON.parse(fs.readFileSync(path.join(here, 'source-snapshot.json'), 'utf8'));
const series = source.series.map(s => {
  assert.equal(s.values.length, source.years.length);
  assert.equal(s.ci95.length, source.years.length);
  for (const [i,value] of s.values.entries()) {
    assert(Number.isFinite(value) && value >= 0 && value <= 100);
    assert(s.ci95[i][0] <= value && value <= s.ci95[i][1]);
  }
  const first = s.values[0], last = s.values.at(-1);
  return {...s, changePoints: +(last-first).toFixed(1), changePercent: (last-first)/first*100};
});
const total = series.find(s => s.id === 'any');
for (let i=0;i<source.years.length;i++) for (const s of series) assert(s.values[i] <= total.values[i]);
assert.equal(total.changePoints, -7);
assert.equal(Math.round(-total.changePercent), 42);
assert.equal(series.find(s => s.id === 'pouches').changePoints, 0.9);
const data = {...source, series, declineRounded: Math.round(-total.changePercent)};
fs.writeFileSync(path.join(here,'data.json'), JSON.stringify(data,null,2)+'\n');
const lines = ['year,series,percent,ci95_lower,ci95_upper'];
for (let i=0;i<source.years.length;i++) for(const s of series) lines.push([source.years[i],s.id,s.values[i],...s.ci95[i]].join(','));
fs.writeFileSync(path.join(here,'estimates.csv'),lines.join('\n')+'\n');
console.log(JSON.stringify(series.map(({name,changePoints,changePercent})=>({name,changePoints,changePercent})),null,2));
