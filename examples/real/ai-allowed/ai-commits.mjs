// Counts the commits on each candidate repo's default branch that credit an AI tool, with GitHub's commit search
// (needs an authenticated `gh`; the search allows 30 requests a minute), and keeps up to three examples of each.
// usage: node ai-commits.mjs [repo ...]
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const { candidates } = JSON.parse(fs.readFileSync(path.join(here, "candidates.json"), "utf8"));
const names = process.argv.slice(2).length ? process.argv.slice(2) : candidates.map((c) => c.full);
// The trailers and authors that AI coding tools add to the commits they help write
const QUERIES = {
  claude: '"Co-authored-by: Claude"',
  claudeCode: '"Generated with Claude Code"',
  copilot: '"Co-authored-by: Copilot"',
  copilotAgent: "author:Copilot",
  assistedBy: '"Assisted-by:"',
};
const wait = (ms) => new Promise((done) => setTimeout(done, ms));

const out = path.join(here, "ai-commits.json");
const saved = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, "utf8")) : {};
for (const full of names) {
  const counts = {};
  for (const [key, q] of Object.entries(QUERIES)) {
    await wait(2200);
    let r = null;
    try {
      r = JSON.parse(execFileSync("gh", ["api", "-X", "GET", "search/commits", "-f", `q=repo:${full} ${q}`, "-f", "per_page=3", "-f", "sort=committer-date"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
    } catch {
      counts[key] = { error: true };
      continue;
    }
    counts[key] = {
      total: r.total_count,
      examples: r.items.map((c) => ({ sha: c.sha, date: c.commit.committer.date, title: c.commit.message.split("\n")[0], url: c.html_url })),
    };
  }
  saved[full] = { readAt: new Date().toISOString().replace(/\.\d+Z$/, "Z"), counts };
  fs.writeFileSync(out, JSON.stringify(saved, null, 1) + "\n");
  console.log(full, Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, v.total ?? "error"])));
}
