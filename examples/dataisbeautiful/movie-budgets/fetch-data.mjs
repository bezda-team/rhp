import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const INDEX = 'https://www.the-numbers.com/box-office-records/worldwide/all-movies/cumulative/released-in-2026';
const AS_OF = '2026-10-17';
const clean = text => text.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&rsquo;|&#8217;/g, '’').replace(/&ldquo;|&rdquo;/g, '"').replace(/\s+/g, ' ').trim();
const tableRows = html => [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m => [...m[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(c => ({ html: c[1], text: clean(c[1]) })));
async function get(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response;
}
if (process.argv.includes('--offline')) {
  const snapshot = JSON.parse(fs.readFileSync(path.join(here, 'source-snapshot.json')));
  finish(snapshot);
} else {
  const indexHtml = await (await get(INDEX)).text();
  const entries = tableRows(indexHtml).filter(c => c.length >= 3 && /^\d+$/.test(c[0].text) && /\/movie\//.test(c[1].html)).map(c => ({
    title: c[1].text,
    source: new URL(c[1].html.match(/href=["']([^"']+)/i)[1], INDEX).href,
    indexWorldwide: Number(c[2].text.replace(/[^\d]/g, '')),
  }));
  assert.equal(entries.length, 100, 'The annual source must include the complete top 100');
  const records = new Array(entries.length);
  let next = 0;
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (next < entries.length) {
      const i = next++, entry = entries[i];
      const html = await (await get(entry.source)).text();
      const rows = tableRows(html);
      const money = label => {
        const row = rows.find(c => c[0]?.text.replace(/:$/, '') === label);
        const m = row?.[1]?.text.match(/\$([\d,]+)/);
        return m ? Number(m[1].replaceAll(',', '')) : null;
      };
      const release = rows.find(c => c[0]?.text === 'Domestic Releases:')?.[1]?.text.match(/([A-Z][a-z]+ \d+(?:st|nd|rd|th), 2026)/)?.[1] ?? null;
      const image = html.match(/<div class=['"]thumbnail['"]>\s*<img[^>]*src=['"]([^'"]+)/i)?.[1] ?? null;
      const title = clean(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? entry.title).replace(/\s*\(2026(?:[^)]*)?\)$/, '');
      records[i] = { ...entry, title, budget: money('Production Budget'), domestic: money('Domestic Box Office'), international: money('International Box Office'), worldwide: money('Worldwide Box Office'), release, image };
    }
  }));
  const snapshot = { asOf: AS_OF, retrievedAt: new Date().toISOString(), index: INDEX, selection: 'Ten largest reported production budgets among the top 100 worldwide-grossing 2026 releases listed by The Numbers, with a 2026 US theatrical release by the cutoff.', records };
  fs.writeFileSync(path.join(here, 'source-snapshot.json'), JSON.stringify(snapshot, null, 2).replaceAll("\u2014", "\\u2014") + '\n' );
  finish(snapshot);
}
function finish(snapshot) {
  const eligible = snapshot.records.filter(r => r.budget != null && r.worldwide != null && r.release && new Date(r.release.replace(/(\d+)(st|nd|rd|th)/, '$1')).getTime() <= Date.parse(AS_OF + 'T23:59:59Z'));
  eligible.sort((a, b) => b.budget - a.budget || b.worldwide - a.worldwide || a.title.localeCompare(b.title));
  const rows = eligible.slice(0, 10).map((r, i) => ({ ...r, id: r.source.split('/').at(-1).replace(/[^a-zA-Z0-9]+/g, '-').replace(/-$/, '').toLowerCase(), rank: i + 1, grossToBudget: r.worldwide / r.budget }));
  assert.equal(rows.length, 10);
  for (const r of rows) {
    assert(r.budget > 0 && r.worldwide > 0 && r.image && r.source);
    assert.equal(r.domestic + r.international, r.worldwide, r.title + ': domestic plus international must reconcile');
    assert.equal(r.indexWorldwide, r.worldwide, r.title + ': annual chart and movie page must agree at capture');
  }
  const sameBudget = rows.filter(r => r.budget === rows[0].budget).sort((a, b) => b.worldwide - a.worldwide);
  const data = { asOf: snapshot.asOf, retrievedAt: snapshot.retrievedAt, index: snapshot.index, selection: snapshot.selection, screened: snapshot.records.length, reportedBudgetCount: snapshot.records.filter(r => r.budget != null).length, eligibleCount: eligible.length, rows, sameBudget: { budget: rows[0].budget, highest: sameBudget[0].title, lowest: sameBudget.at(-1).title, grossRatio: sameBudget[0].worldwide / sameBudget.at(-1).worldwide } };
  fs.writeFileSync(path.join(here, 'data.json'), JSON.stringify(data, null, 2) + '\n');
  const quote = value => '"' + String(value).replaceAll('"', '""') + '"';
  const columns = ['rank', 'title', 'budget', 'domestic', 'international', 'worldwide', 'grossToBudget', 'release', 'source', 'image'];
  fs.writeFileSync(path.join(here, 'movie-budgets.csv'), columns.join(',') + '\n' + rows.map(r => columns.map(c => quote(r[c])).join(',')).join('\n') + '\n');
  console.log(JSON.stringify({ screened: data.screened, eligible: eligible.length, rows: rows.map(r => ({ title: r.title, budget: r.budget, worldwide: r.worldwide, multiple: +r.grossToBudget.toFixed(2) })), sameBudget: data.sameBudget }, null, 2));
}
