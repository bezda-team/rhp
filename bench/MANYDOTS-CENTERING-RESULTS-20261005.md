# ManyDots centering measurement (October 5, 2026)

Replacing percentage translate centering with half-size offsets reduces 10,000-point initial-render main-thread time by approximately 8% to 14% in this paired comparison.
The resulting medians are 63.5 to 68.2 ms across shared color, category classes, and distinct colors.
The 50 ms target remains unmet, requiring a further 13.5 to 18.2 ms reduction in these cases.
This phase is measured independently of any subsequent CSS optimization.

## Paired results

Times are milliseconds, with lower values better, and are medians of five fresh pages per variant.
The reduction is the median of the five paired after/before ratios, rather than the ratio of independently aggregated medians.

| 10,000-point appearance | Frame before | Frame after | Main thread before | Main thread after | Paired main-thread reduction | Above 50 ms target |
|---|---:|---:|---:|---:|---:|---:|
| Shared color | 74.9 | 64.8 | 77.5 | 67.6 | 13.5% | 17.6 ms |
| Ten category classes | 71.0 | 60.8 | 74.0 | 63.5 | 14.2% | 13.5 ms |
| 10,000 distinct colors | 70.8 | 65.6 | 73.7 | 68.2 | 7.9% | 18.2 ms |

| Appearance | Variant | Script | Style calculation | Layout | DevTools commands | Task other |
|---|---|---:|---:|---:|---:|---:|
| Shared color | Before | 14.5 | 30.7 | 11.3 | 1.8 | 18.5 |
| Shared color | After | 14.8 | 29.2 | 10.6 | 1.7 | 11.4 |
| Category classes | Before | 14.6 | 29.8 | 10.4 | 1.8 | 16.5 |
| Category classes | After | 13.8 | 26.7 | 10.2 | 1.9 | 11.1 |
| Distinct colors | Before | 15.5 | 29.2 | 10.4 | 1.9 | 18.0 |
| Distinct colors | After | 16.2 | 27.1 | 11.1 | 1.7 | 11.5 |

V8 compilation duration is zero in every timing sample.
The raw results preserve all initial and final CDP metrics, all metric deltas, and duration deltas in milliseconds.
The component medians are independently calculated and need not sum to the total median.

Most of the gain appears in TaskOtherDuration, which falls by approximately 5.4 to 7.1 ms between the variant medians.
The [baseline trace](MANYDOTS-TRACE-20261005.md) identified PrePaint, Paint, and Layerize work in this portion of rendering.
The paired counters support a reduction in other rendering work, but do not identify the individual after-change paint phases without an after-change trace.
Style calculation remains the largest recorded component at approximately 27 to 29 ms.

## Change and compatibility

The common 4px point uses constant negative 2px margin offsets instead of percentage translate.
Other known dimensions use the corresponding half-size offset or coordinate adjustment, with zero-clamping for calculations that resolve to negative used sizes.
Intrinsic dimensions and unresolved CSS variables retain browser-based translate centering.
Per-point color, class, style, shape, native document access, and event behavior remain available.
Application transforms can still create stacking contexts when requested by their styles.
The benchmark uses opaque circular points with resolved 4px size, and does not measure every possible styling effect or fallback-size path.

Both variants add 10,032 connected elements and 10,046 total connected DOM nodes.
The improvement does not come from deleting point elements.

## Fair comparison

Both complete library variants are compiled into one minified browser bundle, loaded before the timing window.
They share the same captured current library source, with the before variant restoring only `src/manydots.jsx` and `src/manydots.css` from the original immutable prototype snapshot.
Source hashes confirm that exactly those two approved files differ between variants.
The original prototype snapshot and its original report and results remain unchanged.
Before timings are freshly measured in this experiment, not imported from the earlier report.

Both variants use one adapter, identical data and accessors, stable row-id keys, the original seeded coordinates, 4px points, a 600px-wide chart with 400px plot height, `[0, 100]` domains, identical axes, and static mode.
The viewport is 1,000 by 900 CSS pixels.
The original frozen frame harness is reused, with changes limited to the adapter import and outside-timing geometry selectors.
No diagnostic trace marks or tracing sessions are present during timing.
Main-thread time uses the original CDP TaskDuration protocol through the two-second window after rendering.
The three appearance cases preserve the same shared theme color, ten category classes, or one distinct inline color per point.

There are five alternating-order pairs for each styling mode, producing 30 measured fresh pages.
All samples were retained, and no timing runs were repeated.
The machine is an Apple M5 with 10 logical CPUs and 24 GiB memory, running macOS 26.5.2, Node 24.15.0, and Chromium 153.0.8010.12.
Dependency versions, source and bundle hashes, load averages, background CPU samples, and per-sample CPU idle are included in the raw results.

## Activity and variation

This is a paired comparison under recorded background activity, with no quiet-machine claim.
The component correctness checks and full regression suite finished, and their browser/build processes closed before timing.
Aggregate CPU idle ranged from 57.1% to 84.3% during measured samples.
The lowest-idle samples occurred near the end of the distinct-color case and were retained.
This variation does not establish a speed ordering between styling modes or a guaranteed production timing.

| Appearance | Before main-thread range | After main-thread range |
|---|---:|---:|
| Shared color | 74.0 to 82.1 ms | 63.9 to 75.9 ms |
| Category classes | 68.6 to 78.7 ms | 62.1 to 68.6 ms |
| Distinct colors | 72.5 to 78.7 ms | 67.1 to 70.7 ms |

## Correctness and artifacts

All point coordinates, sizes, colors, chart bounds, and collection bounds passed the frozen before/after checks in all three 10,000-point cases.
Every complete-chart screenshot comparison was pixel-identical, including the axes.
There were no page errors during correctness checks or any timing sample.
The final source also passed 120 ManyDots checks across Chromium, WebKit, and Firefox, covering centering, styles, reactive updates, SSR/hydration, node reuse, package entry points, and dimension fallbacks.
The full existing Chromium regression suite passed all 221 checks, with type checks and SSR/browser package checks passing.

- [Raw samples, full metric deltas, paired ratios, environment, and source hashes](results-manydots-centering-20261005/results.json)
- [Exact frozen before/after geometry and pixel checks](results-manydots-centering-20261005/correctness.json)
- [Variant input manifest](results-manydots-centering-20261005/inputs.json)
- [Baseline trace and attribution report](MANYDOTS-TRACE-20261005.md)
- [Paired runner and repeat instructions](manydots/README.md)

The paired snapshot remains at `/var/folders/h7/8z8nc01n3n77k9t2q52w68dr0000gn/T/rhp-manydots-pair-n5YjST`.
Its bundle SHA256 is `715cc786a72f321358362cc22922534b170071aeb374d4a3e186a06e3925dee0`.
A separate flat snapshot of the completed centering source was captured before further library edits at `/var/folders/h7/8z8nc01n3n77k9t2q52w68dr0000gn/T/rhp-manydots-iWO0HY`.
Its bundle SHA256 is `e32dd9eecda007e9c70fca08fd3de7456d8c2443eeafc0bb9ed6f151aa3d5637`.
That snapshot supplies the next optimization's baseline, keeping subsequent CSS effects separate from this centering change.
