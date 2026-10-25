// Polite Wayback Machine reader of GitHub repo star counts.
// usage: node wayback.mjs <cache-dir> <stepDays> [repo ...]   (WB_FROM and WB_TO narrow the window)
// Reads the tracked repos and their former names from repos.json and their ids and creation from live.json.
// For each repo, lists captures of its current and former names (CDX, cached), picks the capture nearest to every
// stepDays-day target from the window start (or creation) to today, fetches the raw page and keeps
// { ts, stars, id, nwo } when the page's repository id matches. One request every GAP ms, with backoff on refusals.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const [cacheDir, stepArg, ...only] = process.argv.slice(2);
const STEP = +stepArg * 86400e3;
const GAP = 5000;
// The window, or a part of it to read more densely (WB_FROM and WB_TO, as 2026-03-10)
const START = process.env.WB_FROM ? Date.parse(process.env.WB_FROM) : Date.UTC(2025, 9, 12);
const END = process.env.WB_TO ? Date.parse(process.env.WB_TO) : Date.UTC(2026, 9, 25);
const { tracked } = JSON.parse(fs.readFileSync(path.join(here, "repos.json"), "utf8"));
const live = JSON.parse(fs.readFileSync(path.join(here, "live.json"), "utf8")).repos;
const ALIASES = Object.fromEntries(tracked.map((r) => [r.full, r.aliases ?? []]));

fs.mkdirSync(path.join(cacheDir, "cdx"), { recursive: true });
fs.mkdirSync(path.join(cacheDir, "pages"), { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let last = 0;
async function get(url) {
  for (let attempt = 0; ; attempt++) {
    const wait = last + GAP - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    try {
      const res = await fetch(url, { headers: { "User-Agent": "skill-repo-star-history/1.0 (research; one request per 5 s)" }, signal: AbortSignal.timeout(90e3) });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      return { status: res.status, text: await res.text() };
    } catch (e) {
      if (attempt >= 6) throw e;
      const pause = 60e3 * 2 ** Math.min(attempt, 3);
      console.error(`  ${e.cause?.code ?? e.message}; waiting ${pause / 1000} s`);
      await sleep(pause);
    }
  }
}

const stamp = (ts) => Date.UTC(+ts.slice(0, 4), +ts.slice(4, 6) - 1, +ts.slice(6, 8), +ts.slice(8, 10), +ts.slice(10, 12), +ts.slice(12, 14));
const repos = tracked.map(({ full }) => ({ id: live[full].id, name: full, created: live[full].created }));
for (const repo of repos.filter((r) => !only.length || only.includes(r.name))) {
  const slug = repo.name.replace("/", "_");
  // Captures of every name the repo had, one per day
  let caps = [];
  for (const name of [repo.name, ...(ALIASES[repo.name] ?? [])]) {
    const file = path.join(cacheDir, "cdx", `${name.replace("/", "_")}.json`);
    if (!fs.existsSync(file) || fs.statSync(file).size < 3) {
      const { text } = await get(`https://web.archive.org/cdx/search/cdx?url=github.com/${name}&from=20250901&to=20261025&output=json&filter=statuscode:200&fl=timestamp,original&collapse=timestamp:8`);
      fs.writeFileSync(file, text || "[]");
    }
    caps.push(...JSON.parse(fs.readFileSync(file, "utf8") || "[]").slice(1).map(([ts, original]) => ({ ts, original, at: stamp(ts) })));
  }
  caps.sort((a, b) => a.at - b.at);
  // The capture nearest to each target date, each capture at most once
  const from = Math.max(START, Date.parse(repo.created));
  const picks = new Map();
  for (let target = from; target <= END + STEP / 2; target += STEP) {
    let best = null;
    for (const c of caps) if (!best || Math.abs(c.at - target) < Math.abs(best.at - target)) best = c;
    if (best && Math.abs(best.at - target) <= STEP / 2) picks.set(best.ts, best);
  }
  const file = path.join(cacheDir, "pages", `${slug}.json`);
  const done = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  // New captures, and pages that loaded but whose count was not read (errors, or a markup the parser missed)
  const todo = [...picks.values()].filter((c) => !(c.ts in done) || done[c.ts].error || (done[c.ts].status === 200 && done[c.ts].stars == null));
  console.log(`${repo.name}: ${caps.length} captures, ${picks.size} picked, ${todo.length} to fetch`);
  for (const c of todo) {
    let row;
    try {
      const { status, text } = await get(`https://web.archive.org/web/${c.ts}id_/${c.original}`);
      // The counter's label until October 2026, then the page's embedded JSON
      const stars = text.match(/aria-label="(\d+) users? starred this repository"/)?.[1] ?? text.match(/"stargazerCount":(\d+)/)?.[1];
      const id = text.match(/octolytics-dimension-repository_id" content="(\d+)"/)?.[1];
      const nwo = text.match(/octolytics-dimension-repository_nwo" content="([^"]+)"/)?.[1];
      row = { status, stars: stars == null ? null : +stars, id: id ?? null, nwo: nwo ?? null, ok: stars != null && id === repo.id };
    } catch (e) {
      row = { error: String(e.message ?? e) };
    }
    done[c.ts] = row;
    fs.writeFileSync(file, JSON.stringify(done, null, 1));
    console.log(`  ${c.ts} ${row.ok ? row.stars : JSON.stringify(row)}`);
  }
}
