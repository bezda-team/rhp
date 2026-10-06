// Scan the independent cohort, then create separate credit-redacted judging images.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { render, summarize } from "./render.mjs";
import { judgeImages } from "./judge-images.mjs";
const lab = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cohort = path.resolve(process.env.COHORT ?? path.join(lab, "results/codex-high-browser-20261005"));
const plan = JSON.parse(fs.readFileSync(path.join(cohort, "plan.json"), "utf8"));
const rows = JSON.parse(fs.readFileSync(path.join(cohort, "runs.json"), "utf8"));
const browser = await chromium.launch({ executablePath: process.env.RENDER_BROWSER });
const results = [];
try {
  for (const row of rows) {
    const run = path.join(plan.runs, row.runId);
    const resultFile = path.join(run, "result.json");
    if (fs.existsSync(resultFile)) {
      results.push(JSON.parse(fs.readFileSync(resultFile, "utf8")));
      continue;
    }
    const result = { ...row, scan: null, images: null, creditsRedacted: false };
    if (row.hasPoster) {
      const poster = path.join(run, "project/poster.html");
      const original = await render(poster, path.join(run, "render"), { browser, cdnMode: "direct" });
      result.scan = summarize(original);
      result.cdn = original.cdn;
      const blind = await render(poster, path.join(run, "render-blind"), { browser, redactCredits: true, cdnMode: "direct" });
      result.images = await judgeImages(path.join(run, "render-blind"));
      result.creditRedactions = Object.fromEntries(Object.entries(blind.widths).map(([width, scan]) => [width, scan.creditRedactions]));
      result.creditsRedacted = true;
      result.redactionVersion = blind.redactionVersion;
    }
    fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
    results.push(result);
    console.log(row.runId, JSON.stringify(result.scan));
  }
} finally { await browser.close(); }
fs.writeFileSync(path.join(cohort, "review.json"), JSON.stringify(results, null, 2));
