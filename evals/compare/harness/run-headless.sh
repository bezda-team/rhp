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
effort=${EVAL_EFFORT:-high}
run=$(HEADLESS=1 node "$here/make-task.mjs" "$condition" "$poster" "$rep" "$model")
cd "$run/project"
allowed="Bash Read Write Edit Glob Grep Skill"
if [ ! -f "$run/mcp.json" ]; then printf '%s\n' '{"mcpServers":{}}' > "$run/mcp.json"; fi
mcp=(--mcp-config "$run/mcp.json" --strict-mcp-config)
allowed="$allowed $(node -e 'for (const k of Object.keys(require(process.argv[1]).mcpServers)) process.stdout.write(`mcp__${k} `)' "$run/mcp.json")"
skills=()
case "$condition" in *-none|*-mcp) if [[ "$condition" != *-skill-mcp ]]; then skills=(--disable-slash-commands); fi ;; esac
start=$(date -u +%Y-%m-%dT%H:%M:%SZ)
status=0
claude -p "$(cat "$run/TASK.md")" --model "$model" --effort "$effort" --output-format stream-json --verbose \
  --setting-sources project --tools "Bash,Read,Write,Edit,Glob,Grep,Skill" --allowedTools $allowed \
  --permission-mode acceptEdits "${mcp[@]}" "${skills[@]}" > "$run/transcript.jsonl" 2> "$run/stderr.log" || status=$?
node -e '
  const fs = require("fs"), [meta, start, effort, exitCode] = process.argv.slice(1);
  const m = JSON.parse(fs.readFileSync(meta, "utf8"));
  const transcript = meta.replace(/meta\.json$/, "transcript.jsonl");
  const events = fs.readFileSync(transcript, "utf8").split("\n").filter(Boolean).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
  const result = events.findLast(event => event.type === "result");
  const complete = Number(exitCode) === 0 && result && !result.is_error && result.subtype === "success";
  Object.assign(m, { transcript, launched: start, ended: new Date().toISOString(), effort, runner: "claude-headless", status: complete ? "complete" : "failed" });
  if (complete) m.done = m.ended;
  else m.error = result?.result ?? `CLI exited ${exitCode} without a successful result`;
  fs.writeFileSync(meta, JSON.stringify(m, null, 2));
  if (!complete) { console.error(m.error); process.exit(1); }
' "$run/meta.json" "$start" "$effort" "$status"
echo "$run"
