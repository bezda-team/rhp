// Recomputes, from data.json, every number the poster, the post and the README state, and checks the data
// usage: node audit.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const d = JSON.parse(fs.readFileSync(path.join(here, "data.json"), "utf8"));
const live = JSON.parse(fs.readFileSync(path.join(here, "live.json"), "utf8"));
const DAY = 86400e3;
const LAST = d.frames - 1;
const at = (k) => new Date(Date.parse(d.start) + k * DAY).toISOString().slice(0, 10);
const n = (v) => v.toLocaleString("en-US");
const repo = (full) => d.repos.find((r) => r.full === full);
const problems = [];

// The last frame is the live read, and every race repo ends on its live count
if (Date.parse(d.start) + LAST * DAY !== Date.parse(live.readAt)) problems.push("the last frame is not the live read");
for (const r of d.repos) if (r.stars[LAST] !== live.repos[r.full].stars) problems.push(`${r.full} does not end on its live count`);
// Every frame's top ten is sorted, past the entry bar, and complete when ten repos are past it
d.top.forEach((ids, k) => {
  const v = ids.map((i) => d.repos[i].stars[k]);
  if (v.some((x, j) => j > 0 && x > v[j - 1])) problems.push(`frame ${k} is not sorted`);
  if (v.some((x) => x < d.entry)) problems.push(`frame ${k} has a repo under the entry bar`);
});

const [first, second, third] = d.top[LAST].map((i) => d.repos[i]);
console.log(`Read at ${live.readAt}; ${d.frames} frames from ${at(0)} to ${at(LAST)}`);
console.log(`Tracked ${d.tracked}, in the race ${d.repos.length}, captures used ${n(d.captures)}`);
console.log("\nFinal top ten:");
d.top[LAST].forEach((i, j) => console.log(`  ${j + 1}. ${d.repos[i].full} ${n(d.repos[i].stars[LAST])}`));
console.log(`\nGap first to second: ${n(first.stars[LAST] - second.stars[LAST])} (${first.full} over ${second.full})`);
console.log(`Gap second to third: ${n(second.stars[LAST] - third.stars[LAST])}`);
// The poster's projection: when the second would pass the first if both kept their pace of the last 30 days
const gap = first.stars[LAST] - second.stars[LAST];
const closing = (second.stars[LAST] - second.stars[LAST - 30] - (first.stars[LAST] - first.stars[LAST - 30])) / 30;
if (closing > 0) console.log(`Closing ${closing.toFixed(1)} stars a day over 30 days: passes in ${(gap / closing).toFixed(1)} days, ${at(LAST + gap / closing)}`);
else console.log("Not closing over the last 30 days: no projection");
console.log("\nLeaders:");
for (const l of d.leads) console.log(`  ${l.full}: ${at(l.from)} to ${at(l.to)}, ${l.to - l.from + 1} days (${((l.to + 1 - l.from) / 30.44).toFixed(2)} months)`);
console.log(`\n${second.full}: first stars ${second.zero}, created ${second.created}, entered the top ten ${second.firstInTop}`);
for (const days of [7, 30, 90]) {
  const k = LAST - days;
  console.log(`Last ${days} days: ` + [first, second, third].map((r) => `${r.full} +${n(r.stars[LAST] - r.stars[k])}`).join(", "));
}
console.log(`\nStars gained by all ${d.tracked} tracked repos since launch: ${n(d.totals[LAST] - d.totals[0])}`);
const busiest = [...d.weeks].sort((a, b) => b.perDay - a.perDay)[0];
console.log(`Busiest week: from ${busiest.from}, ${n(busiest.perDay)} stars a day`);
console.log(`Ten repos past ${n(d.entry)} from ${at(d.top.findIndex((ids) => ids.length >= 10))}`);
console.log(`First repo past ${n(d.entry)}: ${at(d.top.findIndex((ids) => ids.length > 0))}`);
console.log("\nObservations and falls per race repo:");
for (const r of d.repos) console.log(`  ${r.full}: ${r.observations} captures, best #${r.best}, ${r.daysInTop} days in the top ten${r.falls.length ? `, falls ${r.falls.map((f) => `${f.at} -${n(f.by)}`).join(" ")}` : ""}`);
console.log(problems.length ? `\nPROBLEMS:\n${problems.join("\n")}` : "\nAll checks pass");
