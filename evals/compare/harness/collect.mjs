// Collects every finished run: renders its poster (render.mjs), makes the judge's images, and adds the run's token
// accounting (analyze.py). Writes runs/<id>/result.json and prints a table.
//   node collect.mjs [run id filter]
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { chromium } from "playwright-core";
import { render, summarize } from "./render.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const RUNS = process.env.RUNS ?? path.join(here, "..", "runs");
const filter = process.argv[2];
const force = process.argv.includes("--force");

// Judge images: the desktop page down to 2,400px, and the phone's first two screens (390 x 1,688)
async function judgeImages(dir) {
  const out = {};
  for (const [w, maxH, name] of [[1280, 2400, "desktop"], [390, 1688, "phone"]]) {
    const src = path.join(dir, `shot-${w}.png`);
    if (!fs.existsSync(src)) continue;
    const meta = await sharp(src).metadata();
    const file = path.join(dir, `${name}.jpg`);
    await sharp(src).extract({ left: 0, top: 0, width: meta.width, height: Math.min(meta.height, maxH) }).jpeg({ quality: 85 }).toFile(file);
    out[name] = { file, fullHeight: meta.height, cropped: meta.height > maxH };
  }
  return out;
}

const browser = await chromium.launch({ executablePath: process.env.RENDER_BROWSER });
const rows = [];
for (const id of fs.readdirSync(RUNS).sort()) {
  if (filter && !id.includes(filter)) continue;
  const run = path.join(RUNS, id);
  const metaFile = path.join(run, "meta.json");
  if (!fs.existsSync(metaFile)) continue;
  const meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
  if (!meta.transcript || !fs.existsSync(meta.transcript) || !meta.done) continue;
  const resultFile = path.join(run, "result.json");
  if (fs.existsSync(resultFile) && !force) { rows.push(JSON.parse(fs.readFileSync(resultFile, "utf8"))); continue; }
  const usage = JSON.parse(execFileSync("python3", [path.join(here, "analyze.py"), meta.transcript], { encoding: "utf8" }));
  const poster = path.join(run, "project", "poster.html");
  let scan = null, images = null;
  if (fs.existsSync(poster)) {
    const outDir = path.join(run, "render");
    const r = await render(poster, outDir, { browser });
    scan = summarize(r);
    images = await judgeImages(outDir);
  }
  // The first draft (drafts.py saves it from the transcript), scanned the same way
  let draftScan = null;
  const draft = path.join(run, "first-draft.html");
  if (fs.existsSync(draft)) draftScan = summarize(await render(draft, path.join(run, "render-draft"), { browser, widths: [1280, 390] }));
  const files = fs.existsSync(path.join(run, "project")) ? execFileSync("find", [path.join(run, "project"), "-path", "*/.claude", "-prune", "-o", "-path", "*/node_modules", "-prune", "-o", "-type", "f", "-print"], { encoding: "utf8" }).trim().split("\n").filter(Boolean).map((f) => path.relative(path.join(run, "project"), f)) : [];
  const result = { ...meta, hasPoster: fs.existsSync(poster), posterBytes: fs.existsSync(poster) ? fs.statSync(poster).size : 0, projectFiles: files, scan, draftScan, images, usage };
  fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
  rows.push(result);
}
await browser.close();
const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? Math.round(n / 1e3) + "k" : String(n));
for (const r of rows) {
  const t = r.usage.totals;
  console.log([r.runId.padEnd(42), r.hasPoster ? "poster" : "NONE  ", (r.scan?.renders ? "renders" : "broken ").padEnd(8),
    `req ${t.requests}`, `ctx ${fmt(t.context_max)}`, `read ${fmt(t.cache_read)}`, `write ${fmt(t.cache_write_5m + t.cache_write_1h)}`, `out ${fmt(t.output_est)}`,
    `$${t.cost_usd?.toFixed(2)}`, `${Math.round(r.usage.wall_seconds / 60)}min`, r.scan ? `ovl ${r.scan.overlaps} cut ${r.scan.cut} lowc ${r.scan.lowContrast} tiny ${r.scan.tiny} side ${r.scan.sideways.join("/") || "-"}` : ""].join("  "));
}
