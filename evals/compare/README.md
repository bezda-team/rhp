# rhp against chart libraries that ship AI tooling

How rhp 2.0.2 compares with chart libraries whose makers ship tools for AI coding agents (an Agent Skill, an MCP server, or both), when an agent is asked to make an editorial or infographic poster; how much code a chart costs as it is customized; and how much API each library asks a reader to learn.
The performance side is in [`bench/`](../../bench/).
The findings are in [REPORT.md](REPORT.md).

## What is here

| Path | What it is |
|---|---|
| `posters.json` | The six poster requests every agent got: ranked bars, a time series with annotations, a part-to-whole infographic, a dumbbell in a named house style, a heatmap, and a three-part infographic. Each gives its data. |
| `ladder.md` | The customization ladder: one bar chart made eight times, each step adding one thing (labels, an editorial frame, an annotation, a phone layout, a readout, animated year switching, pictogram marks). |
| `harness/make-task.mjs` | Prepares one run: an empty project, the condition's skill and MCP server, and `TASK.md`, the agent's instructions. Conditions are `<library>-<tooling>`: rhp, apex (ApexCharts), flint (Microsoft Flint), amcharts (amCharts 5) or semiotic, with `skill-mcp`, `skill`, `mcp` or `none`. |
| `harness/servers.mjs`, `mcpd.mjs`, `mcp-call.mjs` | The MCP servers, and a bridge that keeps them running and lets an agent call their tools from a shell. |
| `harness/run-headless.sh` | Runs one condition in a fresh headless Claude Code session with the real skill and MCP server; its transcript ends with Claude Code's exact usage and cost. The cleanest way to rerun. |
| `harness/render.mjs` | Renders a poster at 1280 and 390 px using cached, hashed CDN responses, scanning errors, charts drawn, sideways scroll, overlapping, cut-off and tiny text, and contrast between text and sampled background pixels. |
| `harness/run-codex.mjs`, `preview-server.mjs`, `collect-codex.mjs` | Runs isolated repetitions with equal browser access and collects exact CLI usage, unchanged HTML and rendering evidence in a separate cohort. |
| `harness/run-judges.mjs`, `publish-judging.mjs`, `summarize-codex.mjs` | Collects independent anonymous judgements, validates every score, preserves image hashes and averages judges within each generated poster. |
| `harness/analyze.py` | Token accounting from a transcript: per request input, cache writes and reads; output (exact in a headless transcript, estimated in a subagent's); where the context came from; what the agent read before its first draft; what the checkers reported. |
| `harness/collect.mjs`, `drafts.py` | Render and scan each finished run's poster and first draft, and add its accounting: `result.json` per run. |
| `harness/judge.mjs` | Blind judging: each request's posters under shuffled anonymous labels with a rubric; a judge agent writes `scores.json`. |
| `harness/ladder-test.mjs`, `ladder-test.test.mjs` | Browser checks for all twelve interactive ladder examples, plus regression fixtures for the checker. |
| `harness/aggregate.py`, `ladder.py`, `surface.mjs` | Tables: per run and per condition; the ladder's code sizes; the API surface each library's TypeScript declarations expose. |
| `results/` | The published numbers (`runs.json`, `judging.json`, `ladder.json`, `surface.json`, `footprint.json`, `ladder-interactions.json`, `ladder-rendering.json`), the landscape of AI tooling (`landscape.md`), every poster the agents made (`posters/`) and the ladder's code (`ladder/`). |

## Rerunning

```sh
cd evals/compare
npm install
npm run skills                                   # the competitors' skills, from GitHub and their packages
export RUNS=/tmp/rhp-compare-local-20261005        # use the same folder for generation, collection and judging
harness/run-headless.sh rhp-skill-mcp keeling claude-sonnet-5-5
harness/run-headless.sh apex-skill-mcp keeling claude-sonnet-5-5
node harness/collect.mjs                          # renders, scans and accounts for every finished run in $RUNS
```

`run-headless.sh` gives Claude Code permission to run commands and edit files in the run's folder without asking, so run it in a container or a machine you don't mind it working in.
Runs go to `$RUNS` (the system's temp folder by default), outside this repository, because rhp's agents must not read rhp's own source.
`SANDBOX_NOTE=0` drops the notes about a sandbox that blocks CDNs from `TASK.md`.

## Running the customization ladder locally

The ladder is complete for rhp, ApexCharts, Chart.js and D3.
See [ladder.md](ladder.md) for its rules, implementation notes and validation limits.

```sh
cd evals/compare
npm install
npx playwright-core install chromium
npm test
node harness/ladder-test.mjs results/ladder > results/ladder-interactions.json
python3 harness/ladder.py results/ladder > results/ladder.json
```

The renderer and ladder checker use Playwright's installed Chromium by default.
Set `RENDER_BROWSER=/path/to/chromium` to choose another build.
The interaction results record the browser version and resolved CDN package versions.


## Local poster continuation

`results/local-20261005/plan.json` lists the seventeen planned fresh runs: rhp and ApexCharts with skill + MCP on all six requests, the three additional libraries on skyscrapers, and rhp/ApexCharts without AI tools on skyscrapers.
The original six max-effort runs remain a separate cohort.
The local Claude Code preflight returned HTTP 429 with zero token usage.
The continuation uses a separate `gpt-6-astra` cohort at high effort, with three independent repetitions per condition.
It does not pool results with the original Sonnet cohort.

For headless Claude runs, `EVAL_EFFORT` defaults to `high`; the chosen effort and completion/failure status are written to each run's metadata.
Every run uses a strict MCP configuration, including an empty configuration for conditions without MCP, and conditions without a skill disable skill discovery.
A failed CLI result is recorded without `done`, so collection cannot count an account-limit response as a completed poster.
Use `SANDBOX_NOTE=0` on this machine because its network can reach jsDelivr; the working-directory boundary remains in the task either way.
Set the same explicit `RUNS` directory for setup, collection and judging.

```sh
RUNS=/tmp/rhp-compare-local-20261005 SANDBOX_NOTE=0 EVAL_EFFORT=high harness/run-headless.sh rhp-skill-mcp keeling claude-sonnet-5-5
RUNS=/tmp/rhp-compare-local-20261005 python3 harness/drafts.py /tmp/rhp-compare-local-20261005
RUNS=/tmp/rhp-compare-local-20261005 node harness/collect.mjs
```

To validate the saved posters independently of agent access:

```sh
node harness/review-published.mjs
```

That writes `results/poster-review-local.json` and local screenshots in `out/poster-review/` without altering the original posters or their generation accounting.
It checks rendering and layout; it does not produce blind quality scores.
The October 5 local review rendered all six saved posters at both widths.
It found two phone contrast warnings and no browser errors, sideways scrolling, overlapping text, clipped text or tiny-text flags.
See [REPORT.md](REPORT.md) for the findings and their limits.

The saved posters can also be prepared for independent judging without the original temporary run folders:

```sh
JUDGING=out/published-judging node harness/judge.mjs prepare-published 1 skyscrapers
# After a reviewer writes scores.json in the prepared packet:
JUDGING=out/published-judging node harness/judge.mjs collect
```

Preparation checks that the reviewed HTML hashes still match and that both screenshots exist.
The packet uses anonymous labels and keeps the answer key in a separate directory.
Preparation renders separate screenshots with visible library credit text, vendor-linked logos and amCharts canvas logos hidden while preserving their space.
Library names in a chart's accessible description do not identify that chart as a logo.
The original HTML and ordinary rendering scans remain unchanged.
The packet warns judges that visual styling can still suggest a library.
Score collection rejects missing entries, duplicate ranks and scores outside 1 to 10.

### Separate Codex cohort

```sh
export RUNS=/tmp/rhp-codex-high-browser-20261005
export COHORT="$PWD/results/codex-high-browser-20261005"
EVAL_CONCURRENCY=3 node harness/run-codex.mjs
node harness/collect-codex.mjs
export JUDGING="$PWD/out/codex-judging"
node harness/judge.mjs prepare 1
node harness/judge.mjs prepare 2
node harness/judge.mjs prepare 3
node harness/run-judges.mjs
node harness/judge.mjs collect
JUDGE_RESULTS="$COHORT" node harness/publish-judging.mjs
node harness/summarize-codex.mjs
```

The runner uses the current desktop app CLI by default; `EVAL_CODEX` overrides its executable.
Each attempt starts an ephemeral session with user config, plugins, apps and global skills disabled.
Only the condition's copied skills and required native MCP servers are exposed.
Every condition also gets an identical, dedicated Chromium connection and a project-local Playwright client.
The helper `browser.mjs` connects to that browser, and its local HTTP server serves only files in the run project.
This is necessary on macOS because the CLI sandbox prevents Chromium from starting, while MCP servers can start it outside that sandbox.
The initial `codex-high-20261005` pilot lacked this common connection and is excluded from the measured cohort because browser access was unequal.
The current renderer caches exact CDN responses and records their SHA-256 hashes.
This matches the assets available to the generating agents.
The older npm-based ESM reconstruction remains available with `render.mjs --cdn mirror` for offline investigation, but it is not used for the measured cohort.
It can differ from jsDelivr in named CommonJS exports and peer versions: the pilot's Semiotic page rendered with actual CDN assets but failed with the reconstructed React DOM module.
Projects live outside the repository, and prompts restrict reads and edits to that run's directory.
The rhp skill is frozen from the branch's committed version so the new unpublished grid API is not offered with the published library.
Poster attempts, exact CLI token usage, model, effort, timestamps, failures and HTML hashes are recorded in the cohort directory.
An existing attempt is adopted on resumption rather than regenerated, and completed conditions are skipped.
Dollar cost is unavailable from these subscription-backed CLI responses.
Generation usage is separate from preflight, excluded-pilot and judging usage.
Generation wall times can overlap when concurrency is above one and should not be interpreted as isolated latency measurements.
Judges run in fresh sessions with only anonymous screenshots and the shared rubric, without source HTML or keys.
Use the same `RUNS` and `JUDGING` for preparation and collection.
The final October 5 cohort contains 51 completed generations and 18 valid judging sessions.
Three earlier skyscraper judging sessions are preserved under `results/codex-high-browser-20261005/excluded-blinding/` and excluded from aggregates because blinding version 1 hid the Flint charts.
Version 2 preserves those charts, and the corrected packet was judged in three fresh sessions.
See `blinding-correction.json` in the cohort directory for the original and corrected image hashes.
