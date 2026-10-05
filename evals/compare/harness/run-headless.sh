#!/usr/bin/env bash
# Runs one condition of the poster experiment in a fresh, headless Claude Code session, with the library's real skill
# (installed in the project) and its real MCP server (--mcp-config), and keeps the stream-json transcript, whose
# "result" event has the run's exact token usage and cost. This is the cleanest way to rerun the experiment.
#   harness/run-headless.sh <condition> <poster id> [model] [rep]
# Needs Claude Code, Node 20+, `npm install` in this folder and `npm run skills`. Runs Bash and edits without asking
# (acceptEdits plus allowed tools), so run it on a machine or container you don't mind it working in.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
condition=$1 poster=$2 model=${3:-claude-sonnet-5-5} rep=${4:-1}
run=$(HEADLESS=1 node "$here/make-task.mjs" "$condition" "$poster" "$rep" "$model")
cd "$run/project"
allowed="Bash Read Write Edit Glob Grep Skill"
mcp=()
if [ -f "$run/mcp.json" ]; then
  mcp=(--mcp-config "$run/mcp.json" --strict-mcp-config)
  allowed="$allowed $(node -e 'for (const k of Object.keys(require(process.argv[1]).mcpServers)) process.stdout.write(`mcp__${k} `)' "$run/mcp.json")"
fi
start=$(date -u +%Y-%m-%dT%H:%M:%SZ)
claude -p "$(cat "$run/TASK.md")" --model "$model" --output-format stream-json --verbose \
  --setting-sources project --tools "Bash,Read,Write,Edit,Glob,Grep,Skill" --allowedTools $allowed \
  --permission-mode acceptEdits "${mcp[@]}" > "$run/transcript.jsonl"
node -e '
  const fs = require("fs"), [meta, start] = [process.argv[1], process.argv[2]];
  const m = JSON.parse(fs.readFileSync(meta, "utf8"));
  Object.assign(m, { transcript: m.transcript ?? meta.replace(/meta\.json$/, "transcript.jsonl"), launched: start, done: new Date().toISOString() });
  fs.writeFileSync(meta, JSON.stringify(m, null, 2));
' "$run/meta.json" "$start"
echo "$run"
