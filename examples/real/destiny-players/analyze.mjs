// Reconstruct complete daily Steam concurrency peaks across the three 2026 news windows.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import assert from "node:assert/strict";

const here = path.dirname(fileURLToPath(import.meta.url));
const offline = process.argv.includes("--offline");
const day = 86400000;
const sourceUrl = "https://steamcharts.com/app/1085660/chart-data.json";
const snapshots = [
  { id: "june-archive", file: "archive-2026-06-07.json", url: `https://web.archive.org/web/20260607233823id_/${sourceUrl}`, from: "2026-05-01", through: "2026-05-08" },
  { id: "august-archive", file: "archive-2026-08-06.json", url: `https://web.archive.org/web/20260806171356id_/${sourceUrl}`, from: "2026-05-09", through: "2026-07-19" },
  { id: "current", file: "raw-steamcharts.json", url: sourceUrl, from: "2026-07-20", through: "2026-10-16" },
];
const get = async (url, file) => {
  if (offline) return JSON.parse(await fs.readFile(path.join(here, file), "utf8"));
  const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  let body = Buffer.from(await response.arrayBuffer());
  if (body[0] === 0x1f && body[1] === 0x8b) body = gunzipSync(body);
  return JSON.parse(body.toString("utf8"));
};
const aggregate = (raw, from, through, source) => {
  const grouped = new Map();
  for (const [timestamp, players] of raw) {
    const date = new Date(timestamp).toISOString().slice(0, 10);
    if (date < from || date > through) continue;
    assert.ok(Number.isInteger(players) && players >= 0);
    const row = grouped.get(date) ?? { date, peak: 0, samples: 0, source };
    row.peak = Math.max(row.peak, players);
    row.samples++;
    grouped.set(date, row);
  }
  return [...grouped.values()].sort((a, b) => a.date.localeCompare(b.date));
};
// Explicit daily windows exclude older monthly maxima, including first-of-month points in coarse history.
// Neither archived capture's incomplete final day enters the combined series.
const raw = await Promise.all(snapshots.map(s => get(s.url, s.file)));
const rows = snapshots.flatMap((s, i) => aggregate(raw[i], s.from, s.through, s.id));
assert.equal(rows.length, 169);
rows.forEach((row, i) => assert.equal(row.date, new Date(Date.parse("2026-05-01") + i * day).toISOString().slice(0, 10)));

const overlaps = [[0, 1, "2026-05-09", "2026-06-06"], [1, 2, "2026-07-20", "2026-08-05"]].map(([a, b, from, through]) => {
  const left = aggregate(raw[a], from, through);
  const right = new Map(aggregate(raw[b], from, through).map(row => [row.date, row.peak]));
  for (const row of left) assert.equal(row.peak, right.get(row.date), `Overlapping source snapshots disagree on ${row.date}`);
  return { from, through, days: left.length, exactAgreement: true };
});
for (const [month, expected] of [["2026-05", 28510], ["2026-06", 167867], ["2026-07", 93088], ["2026-08", 46519], ["2026-09", 37341]]) {
  const peak = Math.max(...rows.filter(row => row.date.startsWith(month)).map(row => row.peak));
  assert.equal(peak, expected, `Daily peaks must reconcile with the published ${month} monthly maximum`);
}
const weekend = (from, through) => {
  const picked = rows.filter(row => row.date >= from && row.date <= through);
  assert.equal(picked.length, 2);
  assert.ok(picked.every(row => [0, 6].includes(new Date(row.date).getUTCDay())));
  const peak = Math.max(...picked.map(row => row.peak));
  return { from, through, peak, peakDate: picked.find(row => row.peak === peak).date };
};
const compare = (before, after) => ({ before, after, change: after.peak / before.peak - 1 });
const may = compare(weekend("2026-05-16", "2026-05-17"), weekend("2026-05-23", "2026-05-24"));
const september = compare(weekend("2026-09-19", "2026-09-20"), weekend("2026-09-26", "2026-09-27"));
const newsUrl = "https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=3065800&count=100&feeds=steam_community_announcements&maxlength=2000";
const news = offline ? await get("", "announcement.json") : (await get(newsUrl)).appnews.newsitems.find(item => item.title === "The Next Chapter for Bungie");
assert.equal(new Date(news.date * 1000).toISOString().slice(0, 10), "2026-09-21");
const previous = JSON.parse(await fs.readFile(path.join(here, "data.json"), "utf8"));
const data = {
  game: "Destiny 2", appid: 1085660,
  capturedAt: offline ? previous.capturedAt : new Date().toISOString(),
  from: "2026-05-01", through: "2026-10-16",
  sourceUrl, sourcePage: "https://steamcharts.com/app/1085660", sourceMethod: "https://steamcharts.com/about",
  definition: "Daily recorded peak concurrent Steam players in UTC, reconstructed from the current Steam Charts feed and two Internet Archive captures of the same feed. Explicit source windows exclude coarse monthly history and incomplete capture days. Recent hourly observations are reduced by UTC day with max. These are sampled concurrency peaks, not unique players, daily active users, purchases, or all-platform totals.",
  snapshots, overlaps,
  announcement: { ...previous.announcement, timestamp: new Date(news.date * 1000).toISOString() },
  events: [
    { id: "may", date: "2026-05-21", label: "Final-update announcement", detail: "Bungie says planned live-service updates will end after June 9; the game will remain playable.", url: "https://www.bungie.net/7/en/News/Article/d2_may_21_2026" },
    { id: "release", date: "2026-06-09", label: "Final update released", detail: "Monument of Triumph launches, alongside the complete-content collection and June price reductions.", url: "https://help.bungie.net/hc/en-us/articles/49848696022548-Destiny-2-Monument-of-Triumph-and-Update-9-7-0-Support-Guide" },
    { id: "september", date: "2026-09-21", label: "Unvaulting announcement", detail: "Bungie announces work to restore vaulted campaigns, destinations, and raids.", url: previous.announcement.publisherUrl },
    { id: "october", date: "2026-10-16", label: "Hiring reports", detail: "A reported Destiny role draws attention, but the linked official listing now names Marathon. Too little follow-up exists to assess an activity effect.", url: "https://careers.playstation.com/senior-ux-designer-contract/job/6212202004", reportUrl: "https://www.reddit.com/r/DestinyTheGame/comments/1x7dnea/bungiesony_has_started_hiring_for_destiny_2_roles/" },
  ],
  comparisons: { may, september, october: { status: "Too early to assess", reason: "No complete post-report weekend is in the data, and the linked listing now names Marathon." } },
  maximum: rows.reduce((a, b) => a.peak > b.peak ? a : b),
  weekends: [september.before, september.after, weekend("2026-10-03", "2026-10-04"), weekend("2026-10-10", "2026-10-11")],
  change: september.change,
  rows,
};
for (const [i, snapshot] of snapshots.entries()) await fs.writeFile(path.join(here, snapshot.file), `${JSON.stringify(raw[i])}\n`);
await fs.writeFile(path.join(here, "announcement.json"), `${JSON.stringify(news, null, 2)}\n`);
await fs.writeFile(path.join(here, "data.json"), `${JSON.stringify(data, null, 2)}\n`);
await fs.writeFile(path.join(here, "daily-peaks.csv"), ["date_utc,recorded_peak,feed_points,source", ...rows.map(row => `${row.date},${row.peak},${row.samples},${row.source}`)].join("\n") + "\n");
console.log(JSON.stringify({ days: rows.length, comparisons: data.comparisons, maximum: data.maximum, overlaps }, null, 2));
