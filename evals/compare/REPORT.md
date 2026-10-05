# rhp 2.0.2 against other chart libraries: interim report

**Status: stopped partway, to save AI credits.** This file covers what was measured, what the numbers say so far, and
what is left. Treat every AI-agent number below as preliminary: there is one run per condition, all on one poster
request.

## What is done

- **Landscape of AI tooling** (`results/landscape.md`). Libraries whose makers ship tools for coding agents and that run
  offline:
  - ApexCharts: skill and MCP, but the MCP only validates configs and never renders.
  - Microsoft Flint: MCP that renders a PNG, plus skills.
  - Semiotic: MCP that renders a PNG with evidence JSON, plus a skill.
  - amCharts 5: skill and an MCP for docs search.
  - AntV Infographic: skills only.

  Highcharts' three MCP servers are hosted only, and this sandbox blocks them. AntV Infographic's icons and fonts come
  from blocked hosts. Neither could be tested fairly. Only rhp's checker renders the agent's whole page in a browser,
  at several widths, and tries its interactions.
- **Harness** (`harness/`): task setup for each condition, the MCP bridge, a library-neutral renderer and scanner with a
  CDN mirror served from npm, blind judging, token accounting, and `run-headless.sh` for clean reruns. See
  [README.md](README.md).
- **Six AI runs finished**, all on the "ten tallest buildings" poster, using Claude Sonnet 5.5 subagents at the
  session's (max) effort. Every poster is in `results/posters/` and the numbers are in `results/runs.json`. All six
  render with no errors.

  | Condition | Cost | Time | Requests | Peak context | Output (est.) |
  |---|---:|---:|---:|---:|---:|
  | rhp, MCP only | $10.91 | 42 min | 99 | 528k | 278k |
  | ApexCharts, skill only | $12.18 | 42 min | 122 | 503k | 296k |
  | ApexCharts, no AI tools | $12.37 | 42 min | 134 | 487k | 286k |
  | rhp, skill + MCP | $13.11 | 59 min | 99 | 602k | 319k |
  | ApexCharts, skill + MCP | $13.36 | 52 min | 132 | 519k | 303k |
  | rhp, skill only | $15.51 | 46 min | 125 | 611k | 313k |

  The **keeling (CO₂) rhp skill + MCP** run also finished, but it was not collected. Run `node harness/collect.mjs`
  to add it.
- **Customization ladder** (`ladder.md`, code in `results/ladder/`, sizes in `results/ladder.json`). Non-blank lines
  at each step:

  | Library | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
  |---|---:|---:|---:|---:|---:|---:|---:|---:|
  | rhp | 30 | 31 | 47 | 56 | 67 | 88 | 95 | 104 |
  | ApexCharts | 15 | 19 | 30 | 31 | 38 | 50 | 59 | – |
  | Chart.js | 25 | 38 | 52 | 65 | 71 | 101 | 113 | – |
  | D3 | 37 | 43 | 55 | 64 | 73 | 87 | 100 | – |

  Steps: 1 basic, 2 labels, 3 editorial frame, 4 annotation, 5 phone layout, 6 readout, 7 animated year switch,
  8 pictogram.
- **API surface** (`results/surface.json`), as distinct option or prop names in each library's TypeScript config types:

  | Library | Option names | Declaration file size |
  |---|---:|---|
  | rhp | 76 | 396 lines |
  | Flint | 234 | |
  | Semiotic | 430 | |
  | ApexCharts | 605 | 5,104 lines |
  | AntV G2 | 774 | |
  | ECharts | 1,213 | |
  | Highcharts | 1,525 | |
- **AI tooling footprint** (`results/footprint.json`), in estimated tokens:

  | Library | Skill | References and examples | MCP tool definitions |
  |---|---|---|---|
  | rhp | 13.1k (SKILL.md) | 141k references, 153k recipes | 1.7k |
  | ApexCharts | 19.6k | about 70k | 8.4k |
  | Semiotic | | | 26.5k |
- **Performance bench** (`bench/`): updated to ApexCharts 7.8 and added Highcharts, AntV G2 and Vega-Lite. It now has
  a headless `chromium` engine and a new `scale.mjs` that draws scatter plots of 1k and 10k points and lines of 1k and
  100k points. Everything is built and smoke-tested, but the full run is not done: the machine was busy with agents.

## What the numbers say so far

1. **Poster quality.** With max-effort Sonnet 5.5, ApexCharts agents made editorial-quality posters even with no AI
   tools, because the model already knows ApexCharts. They wrote long multi-figure pages. rhp agents made focused
   single-chart posters with custom marks, such as tower silhouettes drawn to scale. Judging has not been run, so
   there is no quality ranking yet.
2. **Cost.** At this effort, a run costs $11–16. About two thirds of that is cache reads, because the context grows to
   500–600k tokens and is re-read on every request. Mostly what is re-read is the agent's own code and thinking.
3. **Learning cost for rhp.** The model has never seen rhp 2, so the agent learns it from the docs before its first
   draft. With skill + MCP it read about 126k tokens of skill docs before the first draft, against about 37k for
   ApexCharts, and started drafting after 21 minutes against 12. Re-reading those docs cost about $3.4 per run for
   rhp's skill alone, about $2.0 for its MCP alone (which serves references in sections), and about $0.9 for
   ApexCharts' skill.
4. **MCP vs skill for rhp.** On this one poster the MCP alone was the cheapest rhp setup ($10.91) and the skill alone
   the most expensive ($15.51). The MCP returns long references in sections, while the skill lets the agent read
   whole files. This needs more prompts before it can be trusted.
5. **Agents without a renderer build one.** ApexCharts agents wrote their own Playwright screenshot pipelines and read
   ApexCharts' source to debug layout. rhp's checker gives that loop for free.
6. **Checker flakiness under load.** One rhp MCP-only agent spent about 10 minutes chasing intermittent `low-contrast`
   results from `rhp_check` on a busy machine (load average about 9 on 4 cores). The final file came back clean in
   6 out of 6 re-runs. The checker's settle timing under CPU load is worth checking.
7. **DX.** rhp's API is small (76 option names), but its ladder code is mid-sized: smaller than Chart.js and D3 at
   step 7, about 1.6 times ApexCharts' config-driven code. The phone layout (step 5) and the readout (step 6) cost the
   most. Room and thickness are not CSS, so a breakpoint needs two slat types chosen in JS. rhp handled the custom
   pictogram step (step 8) in +15/−6 lines.

## Shortcomings found in rhp's tools along the way

- `shape()` with a second `M` command silently produces an invalid CSS shape, and the clip is dropped (seen in ladder
  step 8).
- `ticks={false}` removes both the gridlines and the axis numbers, so there is no way to hide only the gridlines.
- The checker's results may depend on timing under heavy CPU load (see 6 above).

## Left to do

1. Finish the AI matrix: the remaining poster requests (keeling, day, paygap, cafe, coffee) for rhp vs ApexCharts with
   skill + MCP; Flint, Semiotic and amCharts on one request; rhp with no tools.
2. Blind judging: `node harness/judge.mjs prepare 1`, give each `judging/*/JUDGE.md` to a judge agent, then
   `node harness/judge.mjs collect`.
3. Ladder: step 8 for ApexCharts, Chart.js and D3; run `harness/ladder-test.mjs` to test interactions the same way
   for every library.
4. Performance on an idle machine:

   ```sh
   cd bench
   BENCH_RESULTS=results-linux BENCH_BROWSER=<chromium> node run.mjs chromium
   node scale.mjs build
   BENCH_RESULTS=results-linux node scale.mjs run
   ```

5. Cheaper reruns: `harness/run-headless.sh` gives exact token counts, and it can run at a normal effort level.
