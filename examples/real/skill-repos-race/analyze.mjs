// Builds data.json from the saved inputs:
//   repos.json     the tracked skill repos (and the borderline ones left out, with reasons)
//   live.json      GitHub API reads: id, creation, current stars and when they were read
//   captures.json  star counts read from Internet Archive captures of each repo's GitHub page
//   first-stars.json  the first day GH Archive recorded a star for each repo name (its zero point)
// usage: node analyze.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (file) => JSON.parse(fs.readFileSync(path.join(here, file), "utf8"));
const { tracked } = read("repos.json");
const live = read("live.json");
const captures = read("captures.json");
const firstStars = read("first-stars.json");

const N = 10;
// A repo joins the race once it has 5,000 stars: the candidate search found every skill repo above that today, so on
// every day the race's ranking is complete
const ENTRY = 5000;
const DAY = 86400e3;
// The race runs from the day Anthropic launched Agent Skills to the moment the live counts were read, one frame a day
// at the time of day of that read
const end = Date.parse(live.readAt);
const start = end - Math.floor((end - Date.parse("2025-10-16T00:00:00Z")) / DAY) * DAY;
const frames = Math.round((end - start) / DAY) + 1;
const at = (k) => start + k * DAY;

const repos = tracked.map(({ full, aliases = [] }) => {
  const api = live.repos[full];
  if (!api) throw new Error(`No live read for ${full}`);
  // Observations: every capture whose page belongs to this repository, then the live count
  const seen = Object.entries(captures[full] ?? {})
    .filter(([, c]) => c.stars != null && c.id === api.id)
    .map(([ts, c]) => ({ at: Date.UTC(+ts.slice(0, 4), +ts.slice(4, 6) - 1, +ts.slice(6, 8), +ts.slice(8, 10), +ts.slice(10, 12), +ts.slice(12, 14)), stars: c.stars, ts }))
    .sort((a, b) => a.at - b.at);
  seen.push({ at: end, stars: api.stars, ts: "live" });
  // Zero point: the repository's creation, or the first day GH Archive saw a star for any of its names, if later
  // (a repository made public after it was created has no stars before)
  const first = [full, ...aliases].map((n) => firstStars[n]).filter(Boolean).sort()[0];
  const zero = Math.max(Date.parse(api.created), first ? Date.parse(`${first}T00:00:00Z`) : 0);
  const points = [{ at: Math.min(zero, seen[0].at), stars: 0 }, ...seen];
  const value = (t) => {
    if (t <= points[0].at) return 0;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      if (t <= b.at) return a.stars + (b.stars - a.stars) * ((t - a.at) / (b.at - a.at));
    }
    return points.at(-1).stars;
  };
  const stars = Array.from({ length: frames }, (_, k) => Math.round(value(at(k))));
  // Falls between observations (unstarring, or stars GitHub removed) are kept as observed, and listed
  const falls = seen.flatMap((p, i) => (i > 0 && p.stars < seen[i - 1].stars ? [{ at: p.ts, by: seen[i - 1].stars - p.stars }] : []));
  return { full, id: api.id, created: api.created.slice(0, 10), zero: new Date(points[0].at).toISOString().slice(0, 10), live: api.stars, observations: seen.length - 1, stars, falls };
});

// Each frame's top N among the tracked repos with ENTRY stars or more; the race keeps the repos that are ever in it
const ranks = Array.from({ length: frames }, (_, k) =>
  repos.map((_, i) => i).filter((i) => repos[i].stars[k] >= ENTRY).sort((a, b) => repos[b].stars[k] - repos[a].stars[k] || a - b));
const inRace = [...new Set(ranks.flatMap((r) => r.slice(0, N)))].sort((a, b) => repos[b].live - repos[a].live);
const raceIndex = new Map(inRace.map((i, j) => [i, j]));
const race = inRace.map((i) => {
  const r = repos[i];
  const places = ranks.map((list) => list.indexOf(i));
  const days = places.filter((p) => p >= 0 && p < N).length;
  const best = Math.min(...places.filter((p) => p >= 0)) + 1;
  return { ...r, best, daysInTop: days, firstInTop: new Date(at(places.findIndex((p) => p >= 0 && p < N))).toISOString().slice(0, 10) };
});
const top = ranks.map((list) => list.slice(0, N).map((i) => raceIndex.get(i)));

// Each week's stars gained by every tracked repo, as an average a day (the last week is shorter)
const weeks = [];
for (let k = 0; k < frames - 1; k += 7) {
  const to = Math.min(k + 7, frames - 1);
  const gained = repos.reduce((sum, r) => sum + r.stars[to] - r.stars[k], 0);
  weeks.push({ from: new Date(at(k)).toISOString().slice(0, 10), days: to - k, gained, perDay: Math.round(gained / (to - k)) });
}

// Facts for the text: the leader on each frame, and when the lead changed hands
const leaders = ranks.map((list) => list[0]);
const changes = leaders.flatMap((l, k) => (k > 0 && l != null && leaders[k - 1] != null && l !== leaders[k - 1] ? [{ day: new Date(at(k)).toISOString().slice(0, 10), from: repos[leaders[k - 1]].full, to: repos[l].full }] : []));
// The same as runs of frames: who led, from which frame to which
const leads = leaders.reduce((runs, l, k) => {
  if (l == null) return runs;
  if (runs.length && runs.at(-1).full === repos[l].full) runs.at(-1).to = k;
  else runs.push({ full: repos[l].full, from: k, to: k });
  return runs;
}, []);
const last = frames - 1;
const finalTop = ranks[last].slice(0, N).map((i) => ({ full: repos[i].full, stars: repos[i].stars[last] }));

const data = {
  source: "Star counts on archived GitHub repository pages (Internet Archive), the GitHub API's live counts, and GH Archive's first recorded star for each repo",
  start: new Date(start).toISOString(),
  end: new Date(end).toISOString(),
  frames,
  entry: ENTRY,
  tracked: repos.length,
  captures: repos.reduce((sum, r) => sum + r.observations, 0),
  repos: race.map(({ full, id, created, zero, live, observations, stars, falls, best, daysInTop, firstInTop }) => ({ full, id, created, zero, live, observations, best, daysInTop, firstInTop, falls, stars })),
  top,
  // Stars of all tracked repos together on each frame
  totals: Array.from({ length: frames }, (_, k) => repos.reduce((sum, r) => sum + r.stars[k], 0)),
  weeks,
  leads,
  facts: { leaderChanges: changes, finalTop, totalGained: repos.reduce((s, r) => s + r.stars[last] - r.stars[0], 0) },
  others: repos.filter((_, i) => !raceIndex.has(i)).map(({ full, live, observations, created }) => ({ full, live, observations, created })),
};
fs.writeFileSync(path.join(here, "data.json"), JSON.stringify(data, null, 1).replace(/\n\s+(-?\d+),?(?=\n)/g, (m) => m.replace(/\n\s+/, "")));
console.log(`${frames} frames, ${repos.length} tracked, ${race.length} in the race`);
console.log("Lead changes:", changes);
console.log("Final top 10:", finalTop);
for (const r of race) console.log(`${String(r.best).padStart(2)} ${String(r.daysInTop).padStart(3)}d  first ${r.firstInTop}  ${r.observations} obs  ${r.full}`);
