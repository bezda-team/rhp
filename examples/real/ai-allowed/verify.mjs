// Checks every claim in evidence.json against the repos themselves (needs an authenticated `gh`), and saves checked.json:
//   a quoted file: read at the repo's current commit; every excerpt must appear in it word for word
//     (markdown and reStructuredText markup aside), and the permalink points at the line it starts on
//   an agent file: must exist at the repo's current commit
//   a commit: its message must carry the AI trailer (markup aside); without a sha, the latest commit on the default branch with it
//   every project: its live star count
// usage: node verify.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const { projects } = JSON.parse(fs.readFileSync(path.join(here, "evidence.json"), "utf8"));
const gh = (...args) => JSON.parse(execFileSync("gh", ["api", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 << 20 }));
const wait = (ms) => new Promise((done) => setTimeout(done, ms));

// The words of a text, without markup: **bold**, `code`, [links](url), and the line breaks of wrapped paragraphs
const plain = (text) => text
  .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
  .replace(/\*\*|__|`/g, "")
  .replace(/[‘’]/g, "'")
  .replace(/\s+/g, " ")
  .trim();

const heads = new Map();
const head = (repo) => {
  if (!heads.has(repo)) {
    const branch = gh(`repos/${repo}`).default_branch;
    heads.set(repo, { branch, sha: gh(`repos/${repo}/commits/${branch}`).sha });
  }
  return heads.get(repo);
};
const read = (repo, file, sha) => Buffer.from(gh(`repos/${repo}/contents/${encodeURI(file)}?ref=${sha}`).content, "base64").toString("utf8");

const checked = {};
const failures = [];
for (const [full, p] of Object.entries(projects)) {
  const live = gh(`repos/${full}`);
  const out = { name: p.name, short: p.short, stance: p.stance, basis: p.basis, note: p.note, stars: live.stargazers_count, description: live.description };
  if (p.file) {
    const { sha } = head(p.file.repo);
    const raw = read(p.file.repo, p.file.path, sha);
    const words = plain(raw);
    const missing = p.file.quote.filter((q) => !words.includes(plain(q)));
    if (missing.length) failures.push(`${full}: not in ${p.file.repo}/${p.file.path}: ${missing.join(" | ")}`);
    // The line the first excerpt starts on: the first line holding its opening words
    const opening = plain(p.file.quote[0]).split(" ").slice(0, 5).join(" ");
    const line = raw.split("\n").findIndex((l) => plain(l).includes(opening)) + 1;
    out.file = { repo: p.file.repo, path: p.file.path, quote: p.file.quote, sha, line, url: `https://github.com/${p.file.repo}/blob/${sha}/${p.file.path}${line ? `#L${line}` : ""}` };
  }
  if (p.agentFile) {
    const { sha } = head(p.agentFile.repo);
    read(p.agentFile.repo, p.agentFile.path, sha);
    out.agentFile = { repo: p.agentFile.repo, path: p.agentFile.path, sha, url: `https://github.com/${p.agentFile.repo}/blob/${sha}/${p.agentFile.path}` };
  }
  if (p.commit) {
    let sha = p.commit.sha;
    if (!sha) {
      await wait(2200);
      const found = gh("-X", "GET", "search/commits", "-f", `q=repo:${p.commit.repo} "${p.commit.trailer}"`, "-f", "sort=committer-date", "-f", "per_page=5");
      // Search matches words loosely, so take the newest commit whose message really carries the trailer
      const hit = found.items.find((c) => plain(c.commit.message).toLowerCase().includes(p.commit.trailer.toLowerCase()));
      sha = hit?.sha;
    }
    const c = sha ? gh(`repos/${p.commit.repo}/commits/${sha}`) : null;
    const trailer = c?.commit.message.split("\n").map(plain).find((l) => l.toLowerCase().includes(p.commit.trailer.toLowerCase()));
    if (!trailer) failures.push(`${full}: no commit with "${p.commit.trailer}"`);
    else out.commit = { repo: p.commit.repo, sha, date: c.commit.committer.date, title: c.commit.message.split("\n")[0], trailer: trailer.trim(), url: c.html_url };
  }
  checked[full] = out;
  console.log(`${full}: ${out.stance}${out.file ? " file" : ""}${out.agentFile ? " agent-file" : ""}${out.commit ? " commit " + out.commit.date.slice(0, 10) : ""}`);
}
fs.writeFileSync(path.join(here, "checked.json"), JSON.stringify({ readAt: new Date().toISOString().replace(/\.\d+Z$/, "Z"), projects: checked }, null, 1) + "\n");
if (failures.length) {
  console.log(`\n${failures.length} failed:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`\nAll ${Object.keys(checked).length} checked`);
