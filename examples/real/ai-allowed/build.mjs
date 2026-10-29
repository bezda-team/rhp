// Builds the two posters from the saved inputs:
//   top-*.json      GitHub's most-starred repositories (the search that sets the order of the candidates)
//   selection.json  which repositories are left out and why, and which are AI projects
//   checked.json    each project's live star count and its verified evidence (verify.mjs)
// usage: node build.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const read = (file) => JSON.parse(fs.readFileSync(path.join(here, file), "utf8"));
const selection = read("selection.json");
const checked = read("checked.json");
const { projects: evidence } = read("evidence.json");
const searched = [1, 2, 3, 4].flatMap((page) => read(`top-${page}.json`).items);

// The 50 first repositories of the search that the rule keeps; each must have been checked
const kept = [];
for (const { full_name: full } of searched) {
  if (selection.leftOut[full]) continue;
  if (!checked.projects[full]) throw new Error(`${full} is neither left out nor checked`);
  kept.push(full);
  if (kept.length === 50) break;
}

// Shorter words for the infographic's cards ("card") and the chart's box ("box"): each must be part of one of the
// project's verified excerpts
const shorter = (full, c, key) => {
  const words = evidence[full].file[key];
  if (!words) return undefined;
  for (const w of words) if (!c.file.quote.some((q) => q.includes(w))) throw new Error(`${full}: ${key} words not in its quote: ${w}`);
  return words;
};

const projects = kept.map((full) => {
  const c = checked.projects[full];
  return {
    full, name: c.name, short: c.short ?? null, stars: c.stars, ai: full in selection.ai, stance: c.stance, basis: c.basis,
    // The excerpts a poster prints: all of them, or the ones evidence.json picks when they are too long together
    file: c.file && { repo: c.file.repo, path: c.file.path, quote: (evidence[full].file.show ?? c.file.quote.map((_, i) => i)).map((i) => c.file.quote[i]), card: shorter(full, c, "card"), box: shorter(full, c, "box"), url: c.file.url },
    agentFile: c.agentFile && { path: c.agentFile.path, url: c.agentFile.url },
    commit: c.commit && { sha: c.commit.sha, date: c.commit.date, trailer: c.commit.trailer, url: c.commit.url },
  };
}).sort((a, b) => b.stars - a.stars);

const page = JSON.stringify({ readAt: checked.readAt, projects });
const download = fs.readFileSync(path.join(root, "skills/rhp/references/download.md"), "utf8").match(/```html\n([\s\S]*?)\n```/)[1];
// Each poster's page scrolls through all 50; its Reddit variant shows what fits the image: the chart's top 16 bars, the
// infographic's six featured cards
for (const [template, out, limit = 0] of [["chart.template.html", "ai-allowed-chart.html"], ["chart.template.html", "ai-allowed-chart-reddit.html", 16], ["infographic.template.html", "ai-allowed-infographic.html"], ["infographic.template.html", "ai-allowed-infographic-reddit.html", 6]]) {
  if (!fs.existsSync(path.join(here, template))) continue;
  const html = fs.readFileSync(path.join(here, template), "utf8").replace("__DATA__", () => page).replace("__LIMIT__", () => limit).replace("__DOWNLOAD__", () => download);
  fs.writeFileSync(path.join(here, out), html);
  console.log(`Built ${out}`);
}
