import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const forecasts = JSON.parse(fs.readFileSync(path.join(here, 'forecasts.json')));
const audit = JSON.parse(fs.readFileSync(path.join(here, forecasts.selectionAudit)));
assert.equal(audit.asOf, forecasts.asOf, 'The selection review and data cutoff must agree');
const selected = [...audit.qualifyingReports].sort((a, b) => b.high - a.high || b.low - a.low || a.title.localeCompare(b.title)).slice(0, 4);
assert.deepEqual([...forecasts.rows.map(r => r.id)].sort(), selected.map(r => r.id).sort(), 'The chart must contain the four largest eligible forecasts in the source review');
const clean = text => text.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&rsquo;|&#8217;/g, '’').replace(/\s+/g, ' ').trim();
const tableRows = html => [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m => [...m[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(c => clean(c[1])));
const normalize = text => text.normalize('NFKD').replace(/[^a-z]/gi, '').toLowerCase();
let snapshot;
if (process.argv.includes('--offline')) {
  snapshot = JSON.parse(fs.readFileSync(path.join(here, 'source-snapshot.json')));
} else {
  const records = await Promise.all(forecasts.rows.map(async entry => {
    const response = await fetch(entry.source);
    assert(response.ok, `${response.status}: ${entry.source}`);
    const html = await response.text(), rows = tableRows(html);
    const money = label => Number(rows.find(c => c[0]?.replace(/:$/, '') === label)?.[1]?.match(/\$([\d,]+)/)?.[1]?.replaceAll(',', ''));
    const cast = html.match(/<h1>(?:Leading|Lead Ensemble Member)<\/h1>[\s\S]*?<\/table>/i)?.[0];
    const leading = tableRows(cast ?? '').map(r => r[0]);
    const directors = [...new Set(rows.filter(c => c.at(-1) === 'Director').map(c => c[0]))];
    const release = rows.find(c => c[0] === 'Domestic Releases:')?.[1]?.match(/([A-Z][a-z]+ \d+(?:st|nd|rd|th), 2026)/)?.[1];
    const companies = rows.find(c => c[0] === 'Production/Financing Companies:')?.[1];
    const image = html.match(/<div class=['"]thumbnail['"]>\s*<img[^>]*src=['"]([^'"]+)/i)?.[1];
    return {id: entry.id, source: entry.source, budget: money('Production Budget'), domestic: money('Domestic Box Office'), international: money('International Box Office'), worldwide: money('Worldwide Box Office'), release, directors, leading, companies, image};
  }));
  snapshot = {asOf: forecasts.asOf, retrievedAt: new Date().toISOString(), records};
}
assert.equal(snapshot.asOf, forecasts.asOf, 'The fact snapshot and forecast cutoff must agree');
assert.equal(snapshot.records.length, forecasts.rows.length);
const rows = forecasts.rows.map(entry => {
  const facts = snapshot.records.find(r => r.id === entry.id);
  assert(facts && facts.budget > 0 && facts.worldwide > 0 && facts.image && facts.release && facts.directors.length);
  assert.equal(facts.domestic + facts.international, facts.worldwide, `${entry.title}: domestic and international totals reconcile`);
  for (const name of entry.featuredStars) assert(facts.leading.some(star => normalize(star) === normalize(name)), `${entry.title}: verify leading credit for ${name}`);
  assert.equal(Math.min(...entry.report.estimates.flat()), entry.report.low);
  assert.equal(Math.max(...entry.report.estimates.flat()), entry.report.high);
  const reviewed = selected.find(r => r.id === entry.id);
  assert.equal(entry.report.low, reviewed.low, `${entry.title}: lower estimate matches the reviewed source`);
  assert.equal(entry.report.high, reviewed.high, `${entry.title}: upper estimate matches the reviewed source`);
  assert.equal(entry.report.url, reviewed.url, `${entry.title}: source matches the reviewed forecast`);
  assert(Date.parse(entry.report.date) <= Date.parse(forecasts.asOf));
  return {...entry, ...facts};
}).sort((a, b) => b.report.high - a.report.high || b.report.low - a.report.low || a.title.localeCompare(b.title));
for (const row of rows) row.forecastRank = 1 + rows.filter(other => other.report.high > row.report.high).length;
const data = {...forecasts, retrievedAt: snapshot.retrievedAt, rows};
if (!process.argv.includes('--offline')) fs.writeFileSync(path.join(here, 'source-snapshot.json'), JSON.stringify(snapshot, null, 2) + '\n');
fs.writeFileSync(path.join(here, 'data.json'), JSON.stringify(data, null, 2) + '\n');
console.log(JSON.stringify(rows.map(r => ({title: r.title, forecast: [r.report.low, r.report.high], director: r.directors, stars: r.leading, budget: r.budget, worldwide: r.worldwide})), null, 2));
