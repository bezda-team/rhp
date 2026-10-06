# ManyDots prototype measurement (October 5, 2026)

The light-DOM `ManyDots` prototype reduces 10,000-point initial-render main-thread time by 57% to 60% relative to direct-root `Dot`, while preserving independently styled points.
Its uniform case takes 75.1 ms compared with 174.3 ms for direct-root `Dot` and 252.7 ms for the original wrapped structure measured from the same source snapshot.
That leaves 29.7% of the wrapped cost, approximately 3.37 times faster, so this prototype does not meet the requested 10% to 15% cost target.

## Initial-render results

Times are milliseconds, with lower values better.
Each time is the median of five fresh pages.
The reduction column is the median of the five paired `ManyDots / Dot` ratios, rather than a ratio calculated from separately aggregated medians.

| Points | Appearance | Dot frame | ManyDots frame | Dot main thread | ManyDots main thread | Paired main-thread reduction |
|---|---|---:|---:|---:|---:|---:|
| 1,000 | One shared color | 26.1 | 14.9 | 27.3 | 16.7 | 38.9% |
| 1,000 | Ten category classes | 26.7 | 17.0 | 28.5 | 18.4 | 34.7% |
| 1,000 | 1,000 distinct colors | 26.3 | 15.3 | 27.7 | 16.8 | 38.6% |
| 10,000 | One shared color | 168.9 | 72.0 | 174.3 | 75.1 | 56.9% |
| 10,000 | Ten category classes | 166.1 | 69.4 | 181.9 | 71.7 | 59.5% |
| 10,000 | 10,000 distinct colors | 169.0 | 71.1 | 176.4 | 74.5 | 57.6% |

Distinct inline colors did not materially worsen `ManyDots` performance in this run.
The differences between its three 10,000-point appearance medians are small compared with the sample variation, so this does not establish a speed ordering between the styling modes.

## Diagnostic components

These are Chromium duration counters over the same timing window.
They are diagnostic components, not a complete accounting of main-thread work, and independently calculated medians need not sum to the total median.

| Points | Appearance | Variant | Script | Style calculation | Layout |
|---|---|---|---:|---:|---:|
| 1,000 | Shared color | Dot | 10.2 | 10.1 | 3.7 |
| 1,000 | Shared color | ManyDots | 5.9 | 3.4 | 3.6 |
| 1,000 | Category classes | Dot | 11.3 | 10.2 | 3.3 |
| 1,000 | Category classes | ManyDots | 9.6 | 3.2 | 2.9 |
| 1,000 | Distinct colors | Dot | 11.2 | 9.8 | 3.4 |
| 1,000 | Distinct colors | ManyDots | 7.1 | 3.3 | 2.9 |
| 10,000 | Shared color | Dot | 33.7 | 95.6 | 17.6 |
| 10,000 | Shared color | ManyDots | 15.1 | 29.5 | 10.4 |
| 10,000 | Category classes | Dot | 32.2 | 95.7 | 15.6 |
| 10,000 | Category classes | ManyDots | 14.8 | 29.2 | 10.3 |
| 10,000 | Distinct colors | Dot | 37.1 | 93.7 | 15.8 |
| 10,000 | Distinct colors | ManyDots | 15.5 | 28.2 | 10.4 |

Style calculation falls from approximately 94 to 96 ms to 28 to 30 ms at 10,000 points.
Script and layout costs also improve, despite essentially unchanged element counts relative to direct-root `Dot`.
The result demonstrates the combined benefit of bulk construction, avoiding the general slat machinery and broad point guard, and writing resolved percentage coordinates.
It does not isolate the contribution of each mechanism.
Style calculation remains the largest of the recorded diagnostic components.

## Original wrapped reference and target

The 10,000-point uniform reference restores `<div><Dot /></div>` while keeping every library source file, chart option, coordinate, and color identical to the other variants.
It does not reuse timings from the earlier wrapper experiment.

| Variant | Frame | Main thread | Script | Style calculation | Layout |
|---|---:|---:|---:|---:|---:|---:|
| Wrapped Dot | 247.3 | 252.7 | 35.0 | 144.0 | 37.0 |
| Direct-root Dot | 168.9 | 174.3 | 33.7 | 95.6 | 17.6 |
| ManyDots | 72.0 | 75.1 | 15.1 | 29.5 | 10.4 |

The target is 25.3 to 37.9 ms, calculated as 10% to 15% of this run's wrapped main-thread median.
`ManyDots` leaves 29.7% of the wrapped cost using the paired median ratio, a 70.3% reduction.
Further optimization is needed to reach the target, and the remaining cost cannot be attributed solely to CSS from these counters.

## DOM counts

Counts are additions to the page, collected after the timing window.
All samples at a given size and variant have the same counts.

| Points | Variant | Connected elements | All connected DOM nodes |
|---|---|---:|---:|
| 1,000 | Direct-root Dot | 1,031 | 1,045 |
| 1,000 | ManyDots | 1,032 | 1,046 |
| 10,000 | Wrapped Dot | 20,031 | 20,045 |
| 10,000 | Direct-root Dot | 10,031 | 10,045 |
| 10,000 | ManyDots | 10,032 | 10,046 |

`ManyDots` adds one inner collection container while retaining one ordinary HTML element per point.
Its improvement over direct-root `Dot` comes from reducing work per point rather than reducing the number of points in the DOM.
The CDP node counter is retained in the raw data only as a diagnostic because it includes detached nodes and can change after garbage collection.

## Method, fairness, and limits

Every variant was built into one minified browser bundle from one frozen snapshot of all current library source files, including pre-existing working-tree changes.
Loading and parsing that bundle occur before the timing window.
The data use the original scale benchmark's seed of 42, with identical coordinates and objects passed to each variant.
The chart is 600px wide, with a 400px plot height, scale and cross domains of `[0, 100]`, 4px points, identical axes, and static mode.
The viewport is 1,000 by 900 CSS pixels.

Every Chart sets its first theme color to `#2878b5`.
Uniform fixtures omit the point color prop in both `Dot` and `ManyDots`, so the legacy baseline does not incur an unnecessary per-point color variable.
Category fixtures use ten shared class names, with `--rhp-color` scoped to legacy Dot points and direct `background-color` scoped to ManyDots points.
The distinct-color fixtures use the color accessor for ManyDots and the equivalent per-point color prop for Dot.
Every generated color is distinct within each distinct-color fixture.
ManyDots uses a stable row-id key accessor.

There are five paired repetitions of each case on fresh Chromium pages, with variant order reversed on alternate repetitions.
The uniform 10,000-point case contains all three variants, producing 65 measured pages in total.
The frame protocol matches the existing scale benchmark's `requestAnimationFrame` callback followed by `MessageChannel` completion.
Main-thread time uses the CDP `TaskDuration` delta through the two-second window after rendering.
Script, style, and layout use the corresponding duration counters over that same window.
All geometry, screenshot, and DOM-count checks occur outside the timing window.

The machine is an Apple M5 with 10 logical CPUs and 24 GiB memory, running macOS 26.5.2 and Node 24.15.0.
Chromium is 153.0.8010.12, Playwright is 1.63.0, and Solid is 1.9.15.
The raw results include the remaining tool versions, source hashes, dependency lock hash, bundle hash, load averages, background CPU samples, and per-run CPU idle.

This is a paired comparison under recorded background activity, with no quiet-machine claim.
The ManyDots correctness checks and full regression suite finished, and their browser/build processes closed before timing.
Aggregate CPU idle during measured samples ranged from 64.6% to 83.6%.
All samples were retained, including the slower first 1,000-point Dot sample and the lower-idle 10,000-point category sample.

| 10,000-point case | Dot main-thread range | ManyDots main-thread range |
|---|---:|---:|
| Shared color | 168.1 to 181.8 ms | 70.6 to 77.0 ms |
| Category classes | 176.0 to 189.0 ms | 70.4 to 77.1 ms |
| Distinct colors | 176.0 to 183.1 ms | 70.5 to 77.0 ms |

Wrapped Dot ranges from 246.9 to 268.0 ms in its uniform reference.
These timings describe initial rendering on this machine, not an isolated-machine guarantee or a statistical confidence interval.
They do not establish update, hover, animation, SSR-speed, or memory performance, and do not determine a crossover threshold between components.

## Correctness and artifacts

The final frozen bundle passed all point coordinate, diameter, and color checks on thirteen fresh fixture pages.
All seven complete-chart screenshot comparisons were pixel-identical, including the axes, at both point counts and every styling mode, plus the wrapped reference.
Chart and collection bounds matched exactly.
There were no page errors during correctness checks or any of the 65 measured pages.

- [Raw timings, all samples, environment, source hashes, and paired ratios](results-manydots-20261005/results.json)
- [Exact geometry, color, and pixel checks](results-manydots-20261005/correctness.json)
- [Frozen input manifest](results-manydots-20261005/inputs.json)
- [Benchmark runner](manydots.mjs)
- [Fixtures and repeat instructions](manydots/README.md)

The frozen source, compiled bundle, and screenshots remain locally at `/var/folders/h7/8z8nc01n3n77k9t2q52w68dr0000gn/T/rhp-manydots-akZNie`.
Its bundle SHA256 is `1ee0c835069f1e91e1aac336009b34c4ce9819f56c77b1640ac95210bc3418e0`.
To measure a later source change, prepare a new snapshot and repeat correctness before timing, using a fresh results directory.
