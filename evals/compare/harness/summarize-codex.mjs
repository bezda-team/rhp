// Average judges within each generated poster before comparing independent generations.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const lab = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cohort = path.resolve(process.env.COHORT ?? path.join(lab, "results/codex-high-browser-20261005"));
const runs = JSON.parse(fs.readFileSync(path.join(cohort, "runs.json"), "utf8"));
const reviews = fs.existsSync(path.join(cohort, "review.json")) ? JSON.parse(fs.readFileSync(path.join(cohort, "review.json"), "utf8")) : [];
const judging = fs.existsSync(path.join(cohort, "judging.json")) ? JSON.parse(fs.readFileSync(path.join(cohort, "judging.json"), "utf8")) : { scores: [] };
const stats = values => {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return null;
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  return { n: v.length, mean, median: (v[Math.floor((v.length - 1) / 2)] + v[Math.ceil((v.length - 1) / 2)]) / 2, min: v[0], max: v.at(-1), sd: v.length > 1 ? Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / (v.length - 1)) : null };
};
const entries = runs.map(run => {
  const scores = judging.scores.filter(score => score.runId === run.runId);
  const quality = Object.fromEntries(["fidelity", "data", "design", "legibility", "overall", "rankScore"].map(k => [k, stats(scores.map(s => s[k]))]));
  const review = reviews.find(review => review.runId === run.runId);
  return { runId: run.runId, poster: run.poster, condition: run.condition, rep: run.rep, status: run.status, hasPoster: run.hasPoster, wallSeconds: run.wallSeconds, scan: review?.scan ?? null, usage: run.usage, quality };
});
const groups = [];
for (const key of [...new Set(entries.map(e => `${e.poster}/${e.condition}`))].sort()) {
  const selected = entries.filter(e => `${e.poster}/${e.condition}` === key);
  groups.push({ key, attempts: selected.length, complete: selected.filter(e => e.status === "complete" && e.hasPoster).length,
    reviewed: selected.filter(e => e.scan).length,
    rendered: selected.filter(e => e.scan?.renders).length,
    wallSeconds: stats(selected.map(e => e.wallSeconds)),
    tokens: Object.fromEntries(["input_tokens", "cached_input_tokens", "output_tokens", "reasoning_output_tokens"].map(k => [k, stats(selected.map(e => e.usage?.[k]))])),
    uncachedInput: stats(selected.map(e => e.usage ? e.usage.input_tokens - e.usage.cached_input_tokens : null)),
    quality: Object.fromEntries(["fidelity", "data", "design", "legibility", "overall", "rankScore"].map(k => [k, stats(selected.map(e => e.quality[k]?.mean))])) });
}
const summary = { updated: new Date().toISOString(), generationRuns: runs.length, reviewed: reviews.length, judgingSessions: judging.sessions?.length ?? 0,
  method: "Each generated poster is one observation. Judge scores are averaged within that poster before condition means and sample standard deviations are calculated. Null means unavailable, not zero. Failures remain in denominators.", groups, entries };
fs.writeFileSync(path.join(cohort, "summary.json"), JSON.stringify(summary, null, 2));
for (const g of groups) console.log(g.key, `complete=${g.complete}/${g.attempts}`, `rendered=${g.rendered}`, `overall=${g.quality.overall?.mean.toFixed(2) ?? "pending"}`, `median_input=${g.tokens.input_tokens?.median ?? "unavailable"}`);
