// Re-render published posters without altering the original runs or their usage accounting.
// node harness/review-published.mjs [poster directory] [output JSON]
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { render, summarize } from "./render.mjs";

const lab = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = path.resolve(process.argv[2] ?? path.join(lab, "results/posters"));
const output = path.resolve(process.argv[3] ?? path.join(lab, "results/poster-review-local.json"));
const browser = await chromium.launch({ executablePath: process.env.RENDER_BROWSER });
const review = { date: new Date().toISOString(), browser: browser.version(), widths: [1280, 390],
  kind: "published-poster-rendering", notes: ["Fresh browser scans of existing posters; no new generation, usage accounting or blind judging."], posters: {} };
try {
  for (const name of fs.readdirSync(directory).filter((file) => file.endsWith(".html")).sort()) {
    const file = path.join(directory, name);
    const scans = await render(file, path.join(lab, "out/poster-review", path.basename(name, ".html")), { browser });
    review.posters[name] = {
      sha256: crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
      summary: summarize(scans), cdn: scans.cdn,
      widths: Object.fromEntries(Object.entries(scans.widths).map(([width, scan]) => [width, {
        charts: scan.charts, pageHeight: scan.pageHeight, sideways: scan.sideways,
        overlaps: scan.overlapCount, cut: scan.cut, tiny: scan.tiny,
        lowContrast: scan.lowContrast, errors: scan.errors, failed: scan.failed,
      }])),
    };
    console.log(name, JSON.stringify(review.posters[name].summary));
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(review, null, 2) + "\n");
  }
} finally {
  await browser.close();
}
review.completed = new Date().toISOString();
fs.writeFileSync(output, JSON.stringify(review, null, 2) + "\n");
