// Reads each candidate repo from the GitHub API (needs an authenticated `gh`) and saves what bears on AI:
//   the repo's metadata, the AI agent files at its root and in .github, and every paragraph
//   of its contributing guide and pull request templates that mentions AI.
// usage: node scan.mjs [repo ...]   (default: every repo in candidates.json)
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, "scan");
fs.mkdirSync(out, { recursive: true });
const { candidates } = JSON.parse(fs.readFileSync(path.join(here, "candidates.json"), "utf8"));
const names = process.argv.slice(2).length ? process.argv.slice(2) : candidates.map((c) => c.full);

const api = (route) => {
  try {
    return JSON.parse(execFileSync("gh", ["api", route], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 << 20 }));
  } catch {
    return null;
  }
};
const text = (full, file, ref) => {
  const r = api(`repos/${full}/contents/${encodeURI(file)}?ref=${ref}`);
  return r && r.content ? Buffer.from(r.content, "base64").toString("utf8") : null;
};

// Files that are written for AI coding agents, or that hold a project's AI policy
const AGENT = /^(agents\.md|claude\.md|gemini\.md|\.cursorrules|\.cursor|\.claude|\.agents|\.windsurfrules|\.codex|\.gemini|copilot-instructions\.md|instructions|prompts|skills)$/i;
const POLICY = /^(ai[_-]?(policy|usage[_-]?policy|contributions?)?\.(md|rst|txt)|howtoai\.md|llms\.txt|ai_covenant\.md)$/i;
const CONTRIB = /^(contributing|pull_request_template)(\.(md|rst|txt|adoc))?$/i;
// A paragraph mentions AI when it names AI, an LLM, generative tools or a coding assistant
const MENTION = /\b(AI|A\.I\.|LLMs?|large language models?|generative|gen-?AI|Copilot|ChatGPT|Claude|Gemini|Cursor|coding (assistants?|agents?)|AI[- ](generated|assisted)|machine[- ]generated|vibe[- ]cod\w*)\b/;

for (const full of names) {
  const repo = api(`repos/${full}`);
  if (!repo) {
    console.log(`${full}: not found`);
    continue;
  }
  const ref = repo.default_branch;
  const list = (dir) => (api(`repos/${full}/contents/${dir}?ref=${ref}`) || []).map((f) => ({ path: f.path, type: f.type }));
  const root = list("");
  const github = list(".github");
  const docs = root.some((f) => f.path === "docs" && f.type === "dir") ? list("docs") : [];
  const nested = github.filter((f) => f.type === "dir" && /^(PULL_REQUEST_TEMPLATE|instructions|prompts|agents)$/i.test(path.basename(f.path))).flatMap((f) => list(f.path));
  const files = [...root, ...github, ...docs, ...nested];
  const agentFiles = files.filter((f) => AGENT.test(path.basename(f.path))).map((f) => f.path);
  const policyFiles = files.filter((f) => POLICY.test(path.basename(f.path))).map((f) => f.path);
  const contribFiles = files.filter((f) => f.type === "file" && (CONTRIB.test(path.basename(f.path)) || f.path.includes("PULL_REQUEST_TEMPLATE/"))).map((f) => f.path);
  const mentions = {};
  for (const file of [...policyFiles, ...contribFiles]) {
    const body = text(full, file, ref);
    if (!body) continue;
    const hits = body.split(/\n\s*\n/).filter((p) => MENTION.test(p)).map((p) => p.trim());
    if (hits.length) mentions[file] = hits;
  }
  const record = {
    full: repo.full_name,
    stars: repo.stargazers_count,
    license: repo.license?.spdx_id ?? null,
    archived: repo.archived,
    created: repo.created_at,
    pushed: repo.pushed_at,
    ref,
    homepage: repo.homepage,
    description: repo.description,
    agentFiles,
    policyFiles,
    contribFiles,
    mentions,
  };
  fs.writeFileSync(path.join(out, `${full.replace("/", "__")}.json`), JSON.stringify(record, null, 1) + "\n");
  console.log(`${full}: ${agentFiles.length} agent, ${policyFiles.length} policy, ${Object.keys(mentions).length} with mentions`);
}
