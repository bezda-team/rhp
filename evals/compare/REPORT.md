# rhp against other chart libraries

**Status: the three implementation fixes, 51 fresh poster runs, 18 valid independent judging sessions and a full benchmark repeat are complete.**
The original AI evaluation stopped partway to save credits.
The original Sonnet cohort has one run per condition, all on one poster request, so those findings remain preliminary.
The original six-run cohort remains separate from the new effort-controlled repetitions.
Both local benchmark datasets are available.
The requested idle-machine run remains outstanding because both quiet-window checks failed; the completed repeat explicitly records background load.

## What is done

- **Landscape of AI tooling** (`results/landscape.md`).
  The original investigation found these libraries whose makers ship tools for coding agents and that run offline:
  - ApexCharts: skill and MCP, but the MCP only validates configs and never renders.
  - Microsoft Flint: MCP that renders a PNG, plus skills.
  - Semiotic: MCP that renders a PNG with evidence JSON, plus a skill.
  - amCharts 5: skill and an MCP for docs search.
  - AntV Infographic: skills only.

  Highcharts' hosted MCP servers and AntV Infographic's icon/font hosts were blocked in the original sandbox, so neither could be tested fairly there.
  In that investigation, only rhp's checker rendered the agent's whole page in a browser at several widths and tried its interactions.
- **Harness** (`harness/`): isolated task setup for each condition, a common browser connection, the MCP bridge, a library-neutral renderer and scanner using exact CDN responses, anonymous judging, token accounting, and repeatable runners.
  See [README.md](README.md).
- **Six AI runs collected**, all on the "ten tallest buildings" poster, using Claude Sonnet 5.5 subagents at the session's max effort.
  Every poster is in `results/posters/` and the numbers are in `results/runs.json`.
  All six rendered with no errors in the original collection.

  | Condition | Cost | Time | Requests | Peak context | Output (est.) |
  |---|---:|---:|---:|---:|---:|
  | rhp, MCP only | $10.91 | 42 min | 99 | 528k | 278k |
  | ApexCharts, skill only | $12.18 | 42 min | 122 | 503k | 296k |
  | ApexCharts, no AI tools | $12.37 | 42 min | 134 | 487k | 286k |
  | rhp, skill + MCP | $13.11 | 59 min | 99 | 602k | 319k |
  | ApexCharts, skill + MCP | $13.36 | 52 min | 132 | 519k | 303k |
  | rhp, skill only | $15.51 | 46 min | 125 | 611k | 313k |

  The original handoff also reports a finished **keeling (CO₂), rhp skill + MCP** run that was not collected.
  Collect it with `node harness/collect.mjs` if the original `$RUNS` folder is available.
  That folder was not available in the local checkout or its temporary run locations.
- **Saved-poster review completed locally** with Chromium 153.0.8010.12 at 1280px and 390px.
  [poster-review-local.json](results/poster-review-local.json) records file hashes, resolved CDN versions and the full scan findings.
  All twelve views rendered without browser errors, sideways scrolling, overlapping text, clipped text or tiny-text flags.
  The screenshots were also visually inspected at both widths.

  | Existing condition | Phone height | Contrast flags across both widths |
  |---|---:|---:|
  | rhp, MCP only | 1,116px | 0 |
  | rhp, skill + MCP | 1,112px | 0 |
  | rhp, skill only | 1,082px | 0 |
  | ApexCharts, no AI tools | 4,351px | 1 |
  | ApexCharts, skill + MCP | 3,499px | 1 |
  | ApexCharts, skill only | 3,404px | 0 |

  Both contrast flags are on phones: the ApexCharts no-tools poster's `+149.1 m ahead of No. 2` annotation measured 4.10:1 at 14px, and the skill + MCP poster's `828` label measured 4.13:1 at 13px.
  These are scanner estimates against sampled background pixels, below its 4.5:1 threshold for this text size.
  The longer ApexCharts pages include additional figures or supporting sections; page height alone is not a quality score.
  The rhp skill + MCP poster changes to horizontal towers on phones, while the other five retain vertical charts.
  These checks cover initial rendering and layout, not poster interactions or blind design ranking.
  The original HTML and usage accounting are preserved.
  Three independent judging sessions now scored anonymous, shuffled packets in `out/published-judging-blind/` using `gpt-6-astra` at high effort.
  The original HTML is unchanged; separate screenshot renders hide visible library credit text and identifiable vector logos while preserving their layout space.
  The judge is told not to penalize blank credit areas.
  Visual style can still suggest a library, so anonymity is not guaranteed.
  [Judging evidence](results/published-judging-20261005/judging.json) preserves all eighteen score records, model usage, image hashes and the label keys.

  | Original condition | Mean overall / 10 | Mean rank / 6 | Rank range |
  |---|---:|---:|---:|
  | rhp, skill + MCP | 9.00 | 1.00 | 1 |
  | rhp, MCP only | 8.33 | 2.00 | 2 |
  | ApexCharts, skill + MCP | 8.00 | 3.33 | 3 to 4 |
  | ApexCharts, skill only | 7.67 | 4.33 | 4 to 5 |
  | rhp, skill only | 7.33 | 5.00 | 3 to 6 |
  | ApexCharts, no AI tools | 7.33 | 5.33 | 5 to 6 |

  Every pass preferred the rhp skill + MCP poster's readable phone adaptation and ranked the rhp MCP-only poster second.
  The skill-only rhp entry varied from third to sixth, illustrating judgement variation even on fixed screenshots.
  These are three independent model contexts, not three human reviewers or independent generation repetitions.
  Crops show at most 2,400 desktop pixels and 1,688 phone pixels; off-crop content and interactions are outside this rubric.
- **Fresh poster matrix completed as a separate model cohort.**
  The Claude Code preflight returned HTTP 429 with zero token usage.
  The authorized continuation uses `gpt-6-astra` at high effort, with three repetitions of each of seventeen conditions.
  [The new cohort plan](results/codex-high-browser-20261005/plan.json) includes matched rhp/ApexCharts baselines on all six requests.
  Each condition receives the same dedicated Chromium connection and project-local Playwright client, verified in a sandboxed preflight.
  The initial Codex pilot in `results/codex-high-20261005/` is preserved but excluded: the CLI sandbox blocked Chromium launches, while rhp's MCP could render outside it, giving conditions unequal visual feedback.
  The current renderer uses exact CDN responses with content hashes, matching the agents' browser assets.
  The legacy npm-based ESM mirror also produced a false failure on the pilot's Semiotic page by omitting React DOM's named `createRoot` export; the same unchanged page rendered with actual CDN assets.
  Neither that mirror failure nor the pilot's quality results are counted against a library in the corrected cohort.
  [The tooling snapshot](results/codex-high-browser-20261005/tooling-snapshot.json) records installed package versions and skill file hashes.
  The original max-effort results remain separate.
  The headless harness now records model effort and failures, isolates MCP configuration, and does not expose skills in conditions without them.
  Accounting now handles Claude's timestamp-free stream events using the exact final duration and usage, leaving unobservable pre-draft time empty.
  Nine JavaScript harness tests and four headless/accounting Python tests pass.
- **Customization ladder complete** ([ladder.md](ladder.md), code in `results/ladder/`, sizes in `results/ladder.json`).
  Non-blank lines at each step:

  | Library | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
  |---|---:|---:|---:|---:|---:|---:|---:|---:|
  | rhp | 30 | 31 | 47 | 56 | 67 | 88 | 95 | 104 |
  | ApexCharts | 15 | 19 | 30 | 31 | 38 | 50 | 59 | 76 |
  | Chart.js | 25 | 38 | 52 | 65 | 71 | 101 | 113 | 144 |
  | D3 | 37 | 43 | 55 | 64 | 73 | 87 | 100 | 111 |

  Steps: 1 basic, 2 labels, 3 editorial frame, 4 annotation, 5 phone layout, 6 readout, 7 animated year switch, 8 pictogram.
  ApexCharts, Chart.js and D3 now have step 8, retaining fractional fills, the target line, phone layout, readouts and year switching.
  The examples pin their library versions.
  Page-size counts exclude downloaded library/plugin implementations; the Chart.js examples use two plugins, an exception to the original no-other-libraries brief.
- **Ladder interaction checks pass for all twelve interactive examples**, steps 6 through 8 in all four libraries.
  [ladder-interactions.json](results/ladder-interactions.json) records the Chromium version, date, resolved packages, reached cities and year-switch results.
  Every example reaches all five correct 2025 readouts with desktop mouse, phone touch and desktop keyboard input.
  Steps 7 and 8 also pass a desktop 2025 → 2024 → 2025 round trip: changed chart pixels, restored chart appearance and all five correct readouts in each year.
  No page errors or sideways scrolling were observed in these checks.
  The checker now uses the installed Playwright Chromium or `RENDER_BROWSER`, samples after every pointer position, fails for missing examples or year controls, and compares settled chart crops instead of whole-page screenshots.
  It ignores antialiasing and tolerates 0.1% changed pixels for fractional rasterization; semantic readout checks remain exact for city, value and year.
  Five regression tests verify the checker, including a frozen chart whose buttons and readout still update.
- **Pictogram rendering checked at 1280px and 390px** for the three new examples.
  All six views render without errors, sideways scrolling, or scanner-reported overlaps, clipped text, tiny text or low-contrast text.
  Screenshots were also visually inspected for the glyphs, partial fills, labels and reference line.
  [ladder-rendering.json](results/ladder-rendering.json) contains the scan summaries.
  Canvas text is not fully covered by the DOM scanner, so the Chart.js screenshots were inspected directly.
  These checks establish interaction and final states, not animation smoothness or a blind design ranking.
- **API surface** (`results/surface.json`), as distinct option or prop names in each library's TypeScript config types, measured in the original investigation:

  | Library | Option names | Declaration file size |
  |---|---:|---|
  | rhp | 76 | 396 lines |
  | Flint | 234 | |
  | Semiotic | 430 | |
  | ApexCharts | 605 | 5,104 lines |
  | AntV G2 | 774 | |
  | ECharts | 1,213 | |
  | Highcharts | 1,525 | |
- **AI tooling footprint** (`results/footprint.json`), in estimated tokens from the original investigation:

  | Library | Skill | References and examples | MCP tool definitions |
  |---|---|---|---|
  | rhp | 13.1k (SKILL.md) | 141k references, 153k recipes | 1.7k |
  | ApexCharts | 19.6k | about 70k | 8.4k |
  | Semiotic | | | 26.5k |
- **Local performance measurements** ([full results](../../bench/RESULTS-MACOS-M5-20261005.md)).
  All sixteen bar-chart adapters completed in headless Chromium on an Apple M5 with ten logical CPUs and 24 GiB RAM.
  The scale suite completed all forty library/scenario combinations, with five fresh pages per combination: 1,000 and 10,000 scatter points, and 1,000 and 100,000 line points, across ten libraries.
  Both suites completed without observed page errors, and all scale timings are finite with nonnegative element counts.
  The suite covers small and large mounts, a fifty-chart dashboard, single-value updates, dragging at normal speed and 4x CPU throttling, and dashboard memory.
  Bundle sizes, browser version, dependency versions, bundle hashes and machine load are saved in `bench/results-macos-m5-20261005/`.
  Other desktop applications remained active, so these are local measurements with background load.
  The existing measurements from the other machine are preserved.
  A scale-counter defect discovered during the run was fixed: connected DOM elements are now counted outside the timing window, avoiding negative counts from detached nodes being garbage-collected.
  The original scale run is retained as `scale-cdp-nodes.json` for inspection.

## Effort-controlled poster results

All **51 independent generations** completed, three for each of seventeen conditions.
All 102 desktop and phone views rendered without browser errors or page-wide horizontal overflow.
Scanner findings remain in the raw results; intentional scroll containers, overlapping accessibility layers and canvas text limit what those counts establish.
The original six max-effort Sonnet runs and the excluded twenty-attempt Codex pilot are separate cohorts.

The final evaluation has **18 independent judging sessions and 153 score records**, using `gpt-6-astra` at high effort.
Each generated poster receives three scores from fresh, anonymous, independently shuffled judging contexts.
The table first averages those three scores within each generated poster, then reports the mean and sample standard deviation across its three independent generations.
Repeated judging does not increase the generation sample size.
The judges use the same model family as the generators; this is not a human panel or evidence of agreement across model families.
The fixed desktop and phone crops do not establish interaction quality or assess content beyond the crop.

The first skyscraper judging packet exposed a blinding defect: the harness treated Vega's accessible chart description as a visible logo and hid all three Flint charts.
The rule is fixed and covered by a regression test.
All six corrected Flint views match the original rendered PNGs byte for byte.
All three affected twenty-one-entry judging passes were replaced by fresh sessions, and their original scores are explicitly excluded.
See the [correction evidence](results/codex-high-browser-20261005/blinding-correction.json) and [excluded judgments](results/codex-high-browser-20261005/excluded-blinding/judging.json).
The final redactions contain only amCharts canvas logos and explicit rhp credit text; visual style can still reveal a library.

### Matched skill + MCP conditions

| Request | rhp overall / 10 | ApexCharts overall / 10 |
|---|---:|---:|
| Skyscrapers | 8.78 ± 0.69 | 8.00 ± 0.00 |
| CO₂ | 8.67 ± 0.58 | 7.78 ± 0.38 |
| Daily routine | 9.00 ± 0.33 | 8.00 ± 0.00 |
| Pay gap | 8.89 ± 0.19 | 7.89 ± 0.51 |
| Café | 8.67 ± 0.58 | 7.67 ± 0.33 |
| Coffee | 8.44 ± 0.51 | 8.56 ± 0.51 |

With equal weight for all six requests, mean overall scores are **8.74 for rhp and 7.98 for ApexCharts**.
rhp leads on five requests; coffee is nearly tied, with ApexCharts ahead by 0.11 points.
Judges generally preferred direct labels, specific editorial findings, complete phone heatmaps and phone layouts that keep metadata beside the marks.
These six requests and three generations per condition show a pattern, not a general library ranking or a statistically established advantage.

Across the eighteen matched generations per library, median usage and CLI wall time are:

| Library, skill + MCP | Fresh input tokens | Cached input tokens | Output tokens | Wall time |
|---|---:|---:|---:|---:|
| rhp | 95.3k | 548.8k | 7.8k | 220s |
| ApexCharts | 45.5k | 313.6k | 7.9k | 203s |

rhp used about 2.1 times the median fresh input while producing a similar amount of output.
These are exact CLI usage counters summarized across the runs; subscription-backed dollar cost is unavailable.
Generation usage is separate from preflight, excluded-pilot and judging usage.
Wall time excludes project setup and common-browser startup, and generations ran three at a time, so it is not a serial throughput benchmark.

### Skyscraper tooling comparison

All rows below have three generations and three judges per generation.
“No tools” means no library skill or MCP; the common coding and browser tools remain available.
Usage and time columns are medians across the three generations.

| Condition | Overall / 10 | Fresh input | Cached input | Output | Wall time |
|---|---:|---:|---:|---:|---:|
| rhp, skill + MCP | 8.78 ± 0.69 | 95.2k | 608.8k | 10.1k | 252s |
| rhp, no tools | 8.67 ± 0.33 | 41.2k | 160.4k | 7.4k | 181s |
| ApexCharts, no tools | 8.44 ± 0.19 | 19.5k | 159.7k | 8.1k | 219s |
| Semiotic, skill + MCP | 8.11 ± 0.84 | 81.3k | 1438.2k | 11.1k | 357s |
| ApexCharts, skill + MCP | 8.00 ± 0.00 | 36.9k | 199.7k | 7.1k | 176s |
| amCharts, skill + MCP | 7.89 ± 0.51 | 83.6k | 1843.6k | 15.7k | 492s |
| Flint, skill + MCP | 7.33 ± 0.33 | 54.9k | 695.9k | 10.6k | 274s |

On this one request, rhp without tools nearly matches its skill + MCP quality score with substantially less fresh input.
ApexCharts without tools scores above its skill + MCP condition in this small sample.
Extra tooling did not automatically improve these posters, and the 0.11-point rhp difference is small relative to generation variation.
amCharts and Semiotic consumed particularly large cached-input totals; fresh input and output remain separate so those totals are not mistaken for dollar costs.

[Run accounting](results/codex-high-browser-20261005/runs.json), [render checks](results/codex-high-browser-20261005/review.json), [final judgments](results/codex-high-browser-20261005/judging.json) and [generation-level statistics](results/codex-high-browser-20261005/summary.json) preserve the evidence.

## Original cohort and first benchmark findings

1. **Poster quality.**
   With max-effort Sonnet 5.5, ApexCharts agents made editorial-quality posters even with no AI tools, because the model already knows ApexCharts.
   They wrote long multi-figure pages.
   rhp agents made focused single-chart posters with custom marks, such as tower silhouettes drawn to scale.
   Three independent judging passes consistently ranked rhp skill + MCP first and rhp MCP-only second on this one request.
   These fixed-poster judgements do not establish general library quality.
2. **Cost.**
   At this effort, a run costs $11 to $16.
   About two thirds is cache reads, because the context grows to 500k to 600k tokens and is re-read on every request.
   Mostly what is re-read is the agent's own code and thinking.
3. **Learning cost for rhp.**
   In the original cohort, the rhp agent read its documentation before its first draft.
   With skill + MCP it read about 126k tokens of skill docs before the first draft, against about 37k for ApexCharts, and started drafting after 21 minutes against 12.
   Re-reading those docs cost about $3.4 per run for rhp's skill alone, about $2.0 for its MCP alone (which serves references in sections), and about $0.9 for ApexCharts' skill.
4. **MCP vs skill for rhp.**
   On this one poster the MCP alone was the cheapest rhp setup ($10.91) and the skill alone the most expensive ($15.51).
   The MCP returns long references in sections, while the skill lets the agent read whole files.
   This needs more prompts before it can be trusted.
5. **Agents without a renderer build one.**
   ApexCharts agents wrote their own Playwright screenshot pipelines and read ApexCharts' source to debug layout.
   rhp's checker supplies that loop.
6. **Checker flakiness under load.**
   One rhp MCP-only agent spent about 10 minutes chasing intermittent `low-contrast` results from `rhp_check` on a busy machine (load average about 9 on 4 cores).
   The final file came back clean in 6 out of 6 reruns.
   A new regression reproduced a false contrast failure during a five-second entry animation under 8x CPU throttling.
   The checker now honors a ten-second readiness budget, waits after screenshot-triggered layout changes, and returns `page-unsettled` when it cannot obtain a stable measurement.
   It does not report successful checks for an unsettled page.
7. **DX.**
   rhp's API is small (76 option names), but its ladder code is mid-sized: smaller than Chart.js and D3 at step 7, about 1.6 times ApexCharts' config-driven code.
   The phone layout (step 5) and the readout (step 6) cost the most.
   Room and thickness are not CSS, so a breakpoint needs two slat types chosen in JS.
   Step 8 adds/removes 15/6 non-blank lines for rhp, 20/3 for ApexCharts, 33/2 for Chart.js and 22/11 for D3.
   These are sizes of the supplied implementations, not a proof of minimum code or an AI productivity ranking.
8. **Local bar-chart performance.**
   rhp's three adapters mount fifty-chart dashboards in 28.9 to 29.4ms of total main-thread work, compared with D3 at 20.2ms, Observable Plot at 27.4ms, Chart.js at 284.4ms and ApexCharts at 390.9ms.
   rhp's CSS adapter takes 65.5ms for 1,000 bars, compared with D3 at 25.8ms.
   All three rhp adapters record zero dropped frames in the 240-update drag at both normal speed and 4x CPU throttling.
   The rhp CSS bar-chart bundle is 27.5kB gzipped including Solid, or 18.2kB without it; D3 is 18.7kB, Chart.js 47.9kB and ApexCharts 284.6kB for these adapters.
   Libraries keep their documented defaults, including different animations and deferred work, so these results compare the supplied implementations rather than equalized rendering kernels.
   They support rhp for these small-chart workloads without showing a universal speed advantage.
9. **Large-point performance.**
   For 10,000 scatter points, rhp takes 238.5ms in the initial frame and 243.2ms of total main-thread work, adding 20,031 connected elements.
   D3 takes 27.6ms in the initial frame and 29.7ms total, adding 10,073 elements.
   The rhp line implementation scales much better: 100,000 points take 39.7ms in the initial frame and 56.3ms total, with 31 connected elements added.
   D3's corresponding line takes 30.9ms in the initial frame and 37.7ms total.
   These adapters make dense scatter plots a substantially more expensive workload for rhp than long lines.

## Implementation defects fixed locally

- `shape()` now translates subsequent `M` commands to CSS `move to` commands.
  The polygon fallback preserves separate subpaths and oppositely wound holes.
  Browser hit-testing verifies both orientations and both directions, with native CSS shapes and the fallback.
- `grid={false}` hides the value-axis gridlines while preserving tick labels and their space.
  `crossGrid={false}` controls cross-axis gridlines independently.
  `ticks={false}` retains its existing meaning of removing the axis.
  Runtime behavior, reactive updates, TypeScript declarations, guard validation and API documentation are updated.
- The checker waits for fonts, finite animations and DOM stability before measuring geometry and text colors.
  An unsettled page produces an explicit error instead of unreliable contrast findings.
  The delayed-animation regression passes under 8x CPU throttling.

The full library and MCP suites passed for these fixes before the later ManyDots work.
The shape and grid regressions also pass against the current checkout in Chromium and WebKit, and the TypeScript fixture passes.
The delayed-rendering regression passes under 8x CPU throttling.
The evaluation harness passes nine JavaScript tests and four Python tests after the blinding correction.
These source changes are local and have not been published to npm.
The new poster cohort evaluates the published packages with matching frozen rhp documentation; the performance repeat uses a frozen snapshot of the patched local source.

## Performance repeat

The [full repeat results](../../bench/RESULTS-MACOS-M5-REPEAT-20261005.md) cover all sixteen bar adapters and all forty scale combinations in Chromium 153.0.8010.12 on the same Apple M5.
Validation checked 320 individual bar-mount samples and 200 scale samples: timings are finite and nonnegative, connected-element counts are nonnegative, and no browser rendering errors were observed.
All twenty-six frozen JavaScript bundle hashes match the recorded inputs.

Median total main-thread work, in milliseconds:

| Workload | Adapter | First local run | Repeat |
|---|---|---:|---:|
| Fifty charts | rhp CSS | 28.9 | 29.0 |
| Fifty charts | D3 | 20.2 | 19.1 |
| Fifty charts | Observable Plot | 27.4 | 27.8 |
| Fifty charts | Chart.js | 284.4 | 289.8 |
| Fifty charts | ApexCharts | 390.9 | 396.1 |
| 10,000 scatter points | rhp | 243.2 | 177.0 |
| 10,000 scatter points | D3 | 29.7 | 30.5 |
| 100,000 line points | rhp | 56.3 | 58.1 |
| 100,000 line points | D3 | 37.7 | 36.0 |

The small-chart timings are similar across these two local runs.
All three rhp bar adapters again recorded zero dropped frames in the 240-update drag at normal speed and under 4x CPU throttling.
The rhp CSS fifty-chart samples range from 26.1 to 33.6ms, with a 29.0ms median; individual samples are retained so the median does not conceal that spread.

The repeated rhp scatter adapter removes the unnecessary wrapper around each Dot, reducing 10,000-point connected elements from 20,031 to 10,031.
Its 177.0ms result reflects that implementation change as well as different background activity, so the difference from the first run is not an isolated idle-machine effect.
The separate [paired wrapper comparison](../../bench/SCATTER-WRAPPER-RESULTS-20261005.md) investigates that adapter change directly.
The frozen inputs predate the later ManyDots implementation added concurrently to the shared checkout.
These scale results measure the Dot adapter and do not evaluate ManyDots.
The [environment record](../../bench/results-macos-m5-repeat-background-20261005/environment.json) preserves the source and bundle hashes and identifies subsequent checkout changes.

Both idle attempts stopped before any timed measurements:

| Attempt | CPU-idle range during 120 seconds | Required baseline |
|---|---:|---|
| Before the repeat | 66.45% to 84.38% | At least 90% for three consecutive two-second samples |
| After the repeat | 57.88% to 83.80% | Same |

All sixty samples from each attempt are saved [before](../../bench/results-macos-m5-repeat-20261005/chromium.json) and [after](../../bench/results-macos-m5-idle-after-repeat-20261005/chromium.json) the completed background-load repeat.
The idle-machine run is the only requested step still outstanding.
It requires a quieter machine; the completed repeat supports comparison under the recorded background activity.
