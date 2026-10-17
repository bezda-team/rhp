// Query Valve's documented API for aggregate current recommendations by original review year.
// Individual reviews and account identifiers are deliberately not saved.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const here = path.dirname(fileURLToPath(import.meta.url));
const start = Date.parse("2016-01-01T00:00:00Z") / 1000;
const end = Date.parse("2026-10-17T00:00:00Z") / 1000 - 1;
const base = "https://api.steampowered.com/IUserReviewsService/GetAppReviews/v1/";
const capturedAt = new Date().toISOString();

async function query(from, through) {
  const input = {
    appid: 275850,
    filter: 1,
    languages: ["all"],
    purchase_type: 1,
    review_type: 0,
    num_per_page: 1,
    filter_offtopic_activity: false,
    date_range_start: from,
    date_range_end: through,
  };
  const url = `${base}?input_json=${encodeURIComponent(JSON.stringify(input))}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Steam API returned ${response.status}`);
  const { response: result } = await response.json();
  const summary = result.query_summary;
  assert.equal(summary.total_reviews, result.total_matching);
  assert.equal(summary.total_positive + summary.total_negative, summary.total_reviews);
  assert.ok(result.reviews.every(review => review.timestamp_created >= from && review.timestamp_created <= through));
  return {
    positive: summary.total_positive,
    negative: summary.total_negative,
    total: summary.total_reviews,
    query: input,
    url,
  };
}

const rows = [];
for (let year = 2016; year <= 2026; year++) {
  const from = Date.UTC(year, 0, 1) / 1000;
  const through = Math.min(end, Date.UTC(year + 1, 0, 1) / 1000 - 1);
  const result = await query(from, through);
  rows.push({ year, ...result, positiveShare: result.positive / result.total });
  console.log(`${year}: ${result.positive} positive, ${result.negative} negative`);
}
const aggregate = await query(start, end);
for (const field of ["positive", "negative", "total"]) {
  assert.equal(rows.reduce((sum, row) => sum + row[field], 0), aggregate[field], `Year totals must reconcile: ${field}`);
}
const recent = rows.filter(row => row.year >= 2020);
const recentPositive = recent.reduce((sum, row) => sum + row.positive, 0);
const recentTotal = recent.reduce((sum, row) => sum + row.total, 0);
const data = {
  appid: 275850,
  game: "No Man's Sky",
  capturedAt,
  completedAt: new Date().toISOString(),
  coverageStart: "2016-01-01T00:00:00Z",
  coverageEnd: "2026-10-16T23:59:59Z",
  sourcePage: "https://store.steampowered.com/app/275850/No_Mans_Sky/",
  apiDocumentation: "https://partner.steamgames.com/doc/webapi/IUserReviewsService",
  definition: "Current public thumbs-up/down recommendations, grouped by the UTC year the review was originally created. All languages and purchase types, including off-topic activity. Updated reviews use their current recommendation. Not historical rating snapshots or a count of unique players.",
  rows,
  aggregate,
  launchYearNegativeShare: rows[0].negative / aggregate.negative,
  since2020PositiveShare: recentPositive / recentTotal,
};
await fs.writeFile(path.join(here, "data.json"), `${JSON.stringify(data, null, 2)}\n`);
const csv = ["year,positive,negative,total,positive_share", ...rows.map(row => [row.year, row.positive, row.negative, row.total, row.positiveShare].join(","))].join("\n");
await fs.writeFile(path.join(here, "reviews-by-year.csv"), `${csv}\n`);
console.log(JSON.stringify({ launchYearNegativeShare: data.launchYearNegativeShare, since2020PositiveShare: data.since2020PositiveShare, aggregate }, null, 2));
