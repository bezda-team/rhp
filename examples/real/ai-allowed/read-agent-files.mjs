// Saves the text of every AI agent file the scan found (a folder: its file list), so each one can be read
// before a repo is counted: some agent files tell agents to stay away rather than how to work.
// usage: node read-agent-files.mjs [repo ...]
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const { candidates } = JSON.parse(fs.readFileSync(path.join(here, "candidates.json"), "utf8"));
const names = process.argv.slice(2).length ? process.argv.slice(2) : candidates.map((c) => c.full);
const api = (route) => {
  try {
    return JSON.parse(execFileSync("gh", ["api", route], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 << 20 }));
  } catch {
    return null;
  }
};

for (const full of names) {
  const file = path.join(here, "scan", `${full.replace("/", "__")}.json`);
  const record = JSON.parse(fs.readFileSync(file, "utf8"));
  record.agentText = {};
  for (const p of record.agentFiles) {
    const r = api(`repos/${full}/contents/${encodeURI(p)}?ref=${record.ref}`);
    if (Array.isArray(r)) record.agentText[p] = { files: r.map((f) => f.path) };
    else if (r?.content) record.agentText[p] = { text: Buffer.from(r.content, "base64").toString("utf8") };
    // A symlink (CLAUDE.md -> AGENTS.md) comes back with its target
    else if (r?.target) record.agentText[p] = { link: r.target };
  }
  fs.writeFileSync(file, JSON.stringify(record, null, 1) + "\n");
  console.log(`${full}: ${Object.keys(record.agentText).length} read`);
}
