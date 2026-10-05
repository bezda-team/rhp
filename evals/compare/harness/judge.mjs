// Prepares blind judging: for each poster request, every finished run's screenshots under an anonymous label, in an
// order shuffled per pass, with the rubric. A judge agent reads JUDGE.md and writes scores.json next to it.
//   node judge.mjs prepare <pass> [poster ids]      writes judging/<poster>-p<pass>/JUDGE.md and key.json
//   node judge.mjs collect                          reads every scores.json, prints and writes judging/scores.json
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const RUNS = process.env.RUNS ?? path.join(here, "..", "runs");
const OUT = process.env.JUDGING ?? path.join(here, "..", "judging");
const posters = JSON.parse(fs.readFileSync(path.join(here, "..", "posters.json"), "utf8"));
const [cmd, passArg, ...ids] = process.argv.slice(2);

const rubric = `Score every entry from 1 to 10 on each criterion, using these anchors:

- **fidelity**: does it deliver what the request asked? 10 = every requested element is there and right (all the data, every value as given, the requested annotations, style, text); 7 = small omissions; 4 = a requested element missing or a value wrong; 1 = ignores the request.
- **data**: is the data shown honestly and readably? 10 = the right form for the data, encodings exact (bars from zero, scales and positions true to the values), values and labels match the data; 5 = some distortion, clutter or hard-to-read encoding; 1 = wrong or misleading.
- **design**: editorial and graphic quality. 10 = could run as it is in a top newsroom or magazine (clear hierarchy, a headline that says something, purposeful color, refined type and spacing, an idea of its own); 7 = professional and clean; 5 = a generic default chart with a title; 3 = amateurish; 1 = broken.
- **legibility**: can a reader read it on both screens? 10 = everything legible at desktop and phone size, nothing overlaps, nothing is cut off, good contrast, sensible use of the phone screen; 5 = noticeable problems on one screen; 1 = unreadable.
- **overall**: your holistic verdict on how good this poster is as an answer to the request.

Judge only what you see in the images and what the request asked; don't reward a feature for being there unless it helps the reader. Do not guess which tool or library made an entry, and don't let that matter. The phone image shows the first two screens (390 x 1,688 px) of the phone layout; the desktop image is the page at 1,280 px wide, cut at 2,400 px if it is longer.`;

if (cmd === "prepare") {
  const pass = Number(passArg ?? 1);
  for (const poster of posters) {
    if (ids.length && !ids.includes(poster.id)) continue;
    const entries = [];
    for (const id of fs.readdirSync(RUNS).sort()) {
      const f = path.join(RUNS, id, "result.json");
      if (!fs.existsSync(f)) continue;
      const r = JSON.parse(fs.readFileSync(f, "utf8"));
      if (!r.hasPoster || r.posterBytes === 0 || r.poster !== poster.id || r.exclude) continue;
      entries.push(r);
    }
    if (!entries.length) continue;
    // Seeded shuffle, different for every pass and poster
    let seed = [...`${poster.id}-${pass}`].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
    const order = entries.map((e) => [rand(), e]).sort((a, b) => a[0] - b[0]).map(([, e]) => e);
    const dir = path.join(OUT, `${poster.id}-p${pass}`);
    fs.mkdirSync(dir, { recursive: true });
    const key = {};
    const blocks = order.map((e, i) => {
      const label = `E${String(i + 1).padStart(2, "0")}`;
      key[label] = e.runId;
      const imgs = e.images ?? {};
      const lines = [`### ${label}`];
      // The judge sees copies under the anonymous label: the run's own paths name its library
      const copy = (img, name) => { const f = path.join(dir, `${label}-${name}.jpg`); fs.copyFileSync(img.file, f); return f; };
      if (imgs.desktop) lines.push(`- desktop: ${copy(imgs.desktop, "desktop")}${imgs.desktop.cropped ? ` (cut at 2,400 px; the page is ${imgs.desktop.fullHeight} px tall)` : ""}`);
      else lines.push("- desktop: (no image: the page did not render)");
      if (imgs.phone) lines.push(`- phone: ${copy(imgs.phone, "phone")}${imgs.phone.cropped ? ` (first two screens; the page is ${imgs.phone.fullHeight} px tall)` : ""}`);
      if (e.scan && !e.scan.renders) lines.push(`- note: the page threw errors or drew no chart when rendered`);
      return lines.join("\n");
    });
    // The key stays outside the judge's folder
    fs.mkdirSync(path.join(OUT, "keys"), { recursive: true });
    fs.writeFileSync(path.join(OUT, "keys", `${poster.id}-p${pass}.json`), JSON.stringify(key, null, 2));
    fs.writeFileSync(path.join(dir, "JUDGE.md"), `# Judging: ${poster.id}

You are an experienced graphics editor judging posters that different agents made for the same request. You see each
one as screenshots. Open every image listed below with the Read tool and look at it carefully before you score.

## The request

${poster.prompt.split("\n").map((l) => "> " + l).join("\n")}

Every agent was also told: save it as one self-contained HTML page; it should look good on a desktop and on a phone.

## Rubric

${rubric}

## Entries

${blocks.join("\n\n")}

## Your answer

Write a JSON file at ${path.join(dir, "scores.json")} with exactly this shape, then reply with "done":

\`\`\`json
{
  "entries": {
    "E01": { "fidelity": 0, "data": 0, "design": 0, "legibility": 0, "overall": 0, "issues": ["short phrases naming each problem you saw"], "strengths": ["short phrases"] }
  },
  "ranking": ["best label first", "...", "worst label last"],
  "notes": "a few sentences on what separated the best from the rest"
}
\`\`\`

Score every entry, and rank all of them (no ties).
`);
    console.log(`${dir}: ${order.length} entries`);
  }
} else if (cmd === "collect") {
  const all = [];
  for (const d of fs.readdirSync(OUT).sort()) {
    const sf = path.join(OUT, d, "scores.json"), kf = path.join(OUT, "keys", `${d}.json`);
    if (!fs.existsSync(sf) || !fs.existsSync(kf)) continue;
    const scores = JSON.parse(fs.readFileSync(sf, "utf8")), key = JSON.parse(fs.readFileSync(kf, "utf8"));
    const n = scores.ranking.length;
    for (const [label, s] of Object.entries(scores.entries)) {
      const rank = scores.ranking.indexOf(label) + 1;
      all.push({ judging: d, label, runId: key[label], ...s, rank, of: n, rankScore: n > 1 ? 1 - (rank - 1) / (n - 1) : 1 });
    }
  }
  fs.writeFileSync(path.join(OUT, "scores.json"), JSON.stringify(all, null, 2));
  for (const r of all) console.log(r.judging.padEnd(16), r.label, r.runId.padEnd(42), ["fidelity", "data", "design", "legibility", "overall"].map((k) => r[k]).join(" "), `rank ${r.rank}/${r.of}`);
}
