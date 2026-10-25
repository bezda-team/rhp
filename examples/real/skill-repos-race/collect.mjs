// Saves the inputs of analyze.mjs:
//   live.json         each tracked repo read from the GitHub API now (needs an authenticated `gh`)
//   captures.json     the counts wayback.mjs read from archived pages, with each capture's URL
//   first-stars.json  the first day GH Archive (ClickHouse's public copy) recorded a star for each repo name
// usage: node collect.mjs <wayback cache folder>
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const [cache] = process.argv.slice(2);
const { tracked } = JSON.parse(fs.readFileSync(path.join(here, "repos.json"), "utf8"));
const write = (file, value) => fs.writeFileSync(path.join(here, file), JSON.stringify(value, null, 1) + "\n");

// Live counts, read one after another; readAt is the moment the last one was read
const repos = {};
for (const { full } of tracked) {
  const r = JSON.parse(execFileSync("gh", ["api", `repos/${full}`], { encoding: "utf8" }));
  if (r.full_name !== full) throw new Error(`${full} is now ${r.full_name}`);
  repos[full] = { id: String(r.id), created: r.created_at, stars: r.stargazers_count };
}
write("live.json", { readAt: new Date().toISOString().replace(/\.\d+Z$/, "Z"), repos });

// Archived counts: every capture read, including the ones rejected (another repository's page, or no count on it)
const captures = {};
for (const { full, aliases = [] } of tracked) {
  const file = path.join(cache, "pages", `${full.replace("/", "_")}.json`);
  const pages = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  const urls = new Map();
  for (const name of [full, ...aliases]) {
    const list = path.join(cache, "cdx", `${name.replace("/", "_")}.json`);
    if (!fs.existsSync(list)) continue;
    for (const [ts, original] of JSON.parse(fs.readFileSync(list, "utf8") || "[]").slice(1)) urls.set(ts, original);
  }
  captures[full] = Object.fromEntries(Object.entries(pages).sort().map(([ts, p]) => [ts, { url: `https://web.archive.org/web/${ts}/${urls.get(ts)}`, stars: p.stars ?? null, id: p.id ?? null, nwo: p.nwo ?? null }]));
}
write("captures.json", captures);

// The first star GH Archive recorded for each name a tracked repo had
const names = tracked.flatMap(({ full, aliases = [] }) => [full, ...aliases]);
const query = `SELECT repo_name, toString(min(created_at)) FROM github.repo_events_per_day WHERE event_type = 'WatchEvent' AND created_at >= '2025-08-01' AND repo_name IN (${names.map((n) => `'${n}'`).join(",")}) GROUP BY repo_name ORDER BY repo_name FORMAT TSV`;
const res = await fetch("https://sql-clickhouse.clickhouse.com/?user=demo", { method: "POST", body: query });
if (!res.ok) throw new Error(`ClickHouse: HTTP ${res.status}`);
write("first-stars.json", Object.fromEntries((await res.text()).trim().split("\n").map((line) => line.split("\t"))));
console.log(`Read ${tracked.length} repos`);
