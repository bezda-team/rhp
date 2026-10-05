# rhp against chart libraries that ship AI tooling

How rhp 2.0.2 compares with chart libraries whose makers ship tools for AI coding agents (an Agent Skill, an MCP
server, or both), when an agent is asked to make an editorial or infographic poster; how much code a chart costs as it
is customized; and how much API each library asks a reader to learn. The performance side is in [`bench/`](../../bench/).
The findings are in [REPORT.md](REPORT.md).

## What is here

| Path | What it is |
|---|---|
| `posters.json` | The six poster requests every agent got: ranked bars, a time series with annotations, a part-to-whole infographic, a dumbbell in a named house style, a heatmap, and a three-part infographic. Each gives its data. |
| `ladder.md` | The customization ladder: one bar chart made eight times, each step adding one thing (labels, an editorial frame, an annotation, a phone layout, a readout, animated year switching, pictogram marks). |
| `harness/make-task.mjs` | Prepares one run: an empty project, the condition's skill and MCP server, and `TASK.md`, the agent's instructions. Conditions are `<library>-<tooling>`: rhp, apex (ApexCharts), flint (Microsoft Flint), amcharts (amCharts 5) or semiotic, with `skill-mcp`, `skill`, `mcp` or `none`. |
| `harness/servers.mjs`, `mcpd.mjs`, `mcp-call.mjs` | The MCP servers, and a bridge that keeps them running and lets an agent call their tools from a shell. |
| `harness/run-headless.sh` | Runs one condition in a fresh headless Claude Code session with the real skill and MCP server; its transcript ends with Claude Code's exact usage and cost. The cleanest way to rerun. |
| `harness/render.mjs` | Renders a poster at 1280 and 390 px and scans it the same way whatever drew it: errors, charts drawn, sideways scroll, overlapping, cut-off and tiny text, and text contrast (the text's own color against the pixels behind it). CDN requests are answered from the npm registry's copy of the package, jsDelivr's `+esm` included. |
| `harness/analyze.py` | Token accounting from a transcript: per request input, cache writes and reads; output (exact in a headless transcript, estimated in a subagent's); where the context came from; what the agent read before its first draft; what the checkers reported. |
| `harness/collect.mjs`, `drafts.py` | Render and scan each finished run's poster and first draft, and add its accounting: `result.json` per run. |
| `harness/judge.mjs` | Blind judging: each request's posters under shuffled anonymous labels with a rubric; a judge agent writes `scores.json`. |
| `harness/aggregate.py`, `ladder.py`, `surface.mjs` | Tables: per run and per condition; the ladder's code sizes; the API surface each library's TypeScript declarations expose. |
| `results/` | The published numbers (`runs.json`, `judging.json`, `ladder.json`, `surface.json`, `footprint.json`), the landscape of AI tooling (`landscape.md`), every poster the agents made (`posters/`) and the ladder's code (`ladder/`). |

## Rerunning

```sh
cd evals/compare
npm install
npm run skills                                   # the competitors' skills, from GitHub and their packages
harness/run-headless.sh rhp-skill-mcp keeling claude-sonnet-5-5
harness/run-headless.sh apex-skill-mcp keeling claude-sonnet-5-5
node harness/collect.mjs                          # renders, scans and accounts for every finished run in $RUNS
```

`run-headless.sh` gives Claude Code permission to run commands and edit files in the run's folder without asking, so
run it in a container or a machine you don't mind it working in. Runs go to `$RUNS` (the system's temp folder by
default), outside this repository, because rhp's agents must not read rhp's own source. `SANDBOX_NOTE=0` drops the
notes about a sandbox that blocks CDNs from `TASK.md`.
