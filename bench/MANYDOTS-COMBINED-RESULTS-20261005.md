# ManyDots combined optimization measurement (October 5, 2026)

The final implementation saves approximately 11.2 to 12.2 ms of initial-render main-thread time compared with the initial ManyDots prototype at 10,000 points.
Final medians are 62.1 to 64.6 ms across shared color, category classes, and distinct colors, so the 50 ms target remains unmet by approximately 12.1 to 14.6 ms.
Every paired sample improves in this controlled original-to-final comparison.
The median paired reductions are 17.3% to 20.2%, while reductions calculated from the separate variant medians are 14.8% to 16.4%.
This comparison measures the retained centering, scoped concrete CSS, and native DOM construction changes together.
The rejected native HTML parser is absent.

## Controlled original-to-final results

Times are milliseconds, with lower values better, and are medians of five fresh pages per variant.
The paired reduction is the median of five after/before ratios.
The saved-time column subtracts the separately calculated variant medians, so it is a different summary of the samples.

| 10,000-point appearance | Frame original | Frame final | Main thread original | Main thread final | Saved between medians | Median paired reduction | Above 50 ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| Shared color | 72.5 | 60.7 | 75.6 | 63.5 | 12.1 ms | 20.2% | 13.5 ms |
| Ten category classes | 71.5 | 59.5 | 74.3 | 62.1 | 12.2 ms | 17.3% | 12.1 ms |
| 10,000 distinct colors | 72.9 | 61.9 | 75.8 | 64.6 | 11.2 ms | 19.1% | 14.6 ms |

The initial-frame medians also remain above 50 ms, by approximately 9.5 to 11.9 ms.
The main-thread metric retains the original two-second CDP measurement window after rendering.
Both metrics use identical timing boundaries for before and after.

| Appearance | Variant | Script | Style calculation | Layout | DevTools commands | Task other |
|---|---|---:|---:|---:|---:|---:|
| Shared color | Original prototype | 13.7 | 30.9 | 10.9 | 1.8 | 17.4 |
| Shared color | Final | 14.0 | 25.0 | 11.2 | 1.9 | 11.2 |
| Category classes | Original prototype | 14.8 | 29.7 | 10.8 | 1.9 | 17.1 |
| Category classes | Final | 14.1 | 25.1 | 10.6 | 1.8 | 10.7 |
| Distinct colors | Original prototype | 15.7 | 29.7 | 9.7 | 1.8 | 16.4 |
| Distinct colors | Final | 16.4 | 24.5 | 10.5 | 1.7 | 11.3 |

V8 compilation duration is zero in every timing sample.
All initial and final CDP metrics, every metric delta, and duration deltas in milliseconds remain in the raw results.
Component medians are independently calculated and need not sum to the total median.

## What was removed

Style calculation medians drop approximately 4.7 to 5.9 ms in the combined comparison.
The collection now supplies concrete shared dimensions, color, clipping, and centering offsets through one locally scoped CSS rule.
Per-point category classes and distinct inline colors remain supported.
The independent scoped-CSS experiment also observed lower style calculation with this change.

TaskOtherDuration medians drop approximately 5.1 to 6.4 ms.
Ordinary resolved-size points now center through half-size margins or coordinate adjustments, removing their default percentage translate.
The independent centering experiment observed most of its saving in TaskOtherDuration.
The original diagnostic trace found PrePaint, Paint, and Layerize work in that portion of rendering.
There is no after-change trace that divides the final TaskOther saving among those individual phases or garbage collection.

The native DOM constructor for an empty collection skips previous-style bookkeeping and reorder checks and reuses prepared point descriptors as keyed records.
The independent fresh-DOM experiment showed modest, variable gains, including effectively unchanged shared-color medians.
Script and layout do not show consistent improvements between variant medians in this combined comparison.
The retained constructor improves the implementation's work without establishing a large isolated script saving.

The native HTML parser candidate was measured separately and rejected after increasing script and total time.
Its complete unsuccessful dataset remains available.
The final code uses ordinary DOM construction and style property setters.

The phase-specific experiments identify where the gains occurred, but their percentages are not added together.
The combined table above is a separate newly measured pair between the initial prototype and final source.
It compares ManyDots with ManyDots.
The earlier comparison against direct-root and wrapped Dot remains a separate experiment and does not supply the before timings in this table.

## DOM and compatibility

The original variant adds 10,032 connected elements and 10,046 total connected DOM nodes.
The final variant adds 10,033 elements and 10,048 nodes, corresponding to one local style element and its text.
Both retain one ordinary light-DOM element per point.
The gains come from the work around those points rather than reducing their number.

Document queries, native event propagation, per-point classes, distinct colors, appearance styles, keyed reuse, and SSR/hydration remain supported.
Known sizes use the faster centering path, while intrinsic dimensions and unresolved CSS variables retain browser-based translate centering.
Browsers without native CSS scope support use the inherited-default-variable fallback.
The benchmark measures opaque 4px circles on the supported scope and resolved-size paths.
Application effects and fallback paths do not have an equivalent speed guarantee from these measurements.

The final correctness fixes also handle stale SSR inline declarations, changed hydration defaults, CSS shorthand ordering, and vendor-prefixed style property names.
This experiment measures neither updates nor hydration.
The [capabilities and tradeoffs](../examples/manydots/TRADEOFFS.md) document describes the complete public contract and limitations.

## Fair comparison

The original implementation comes from the immutable prototype snapshot at `/var/folders/h7/8z8nc01n3n77k9t2q52w68dr0000gn/T/rhp-manydots-akZNie`.
Both complete library variants are compiled into one minified browser bundle and loaded before timing.
Both share captured current library source, with the before variant restoring only `src/manydots.jsx` and `src/manydots.css` from that snapshot.
Source hashes confirm that exactly those two files differ between the measured variants.

The only common-source difference from the original flat snapshot is `blocks.jsx`, which renames and exports the existing CSS-value validator and updates its unchanged internal call sites.
Both measured libraries use that same common helper implementation, and the original ManyDots component does not call the new export.
No other common library source files differ from the original flat snapshot.
All previous reports, raw results, and immutable snapshots remain preserved.

Both variants receive identical seeded coordinates, data objects, stable row-id keys, 4px points, 600px chart width, 400px plot height, `[0, 100]` domains, axes, and static mode.
The viewport is 1,000 by 900 CSS pixels.
The three styling modes use one shared theme color, ten reusable category classes, or one distinct RGB color per point.
The original frozen requestAnimationFrame and MessageChannel frame protocol and two-second CDP window are unchanged.
No tracing sessions or trace marks are used during timing.

Five alternating-order pairs per styling mode produce 30 measured fresh pages.
All samples were retained, and no timing runs were repeated.
This additional controlled comparison answers the request for total retained savings without combining percentages from separate phase experiments.
The machine is an Apple M5 with 10 logical CPUs and 24 GiB memory, running macOS 26.5.2, Node 24.15.0, and Chromium 153.0.8010.12.
Dependency versions, hashes, load averages, background CPU samples, and per-run CPU idle are included in the raw results.

## Activity, correctness, and limits

This is a paired comparison under recorded background activity, with no quiet-machine claim.
The ManyDots correctness checks and full regression suite finished, and their browser/build processes closed before timing.
The isolated fresh-DOM run finished and its browser closed before this combined run began.
Aggregate CPU idle ranged from 76.1% to 88.7% during measured samples.
All 15 final samples are faster than their corresponding original samples, including pairs with lower recorded CPU idle.

| Appearance | Original main-thread range | Final main-thread range |
|---|---:|---:|
| Shared color | 69.0 to 86.2 ms | 58.9 to 65.1 ms |
| Category classes | 71.9 to 76.1 ms | 59.8 to 66.4 ms |
| Distinct colors | 69.2 to 81.6 ms | 60.2 to 66.3 ms |

Every point's coordinates, diameter, and color passed the frozen before/after checks in all three 10,000-point cases.
Chart and collection bounds matched, and all three complete-chart screenshots were pixel-identical, including the axes.
There were no page errors during correctness checks or any timing sample.
The final source passed 183 ManyDots checks, 61 each in Chromium, WebKit, and Firefox, and the existing full Chromium suite passed all 221 checks, with types and SSR/browser package checks passing.
Trusted Types checks used warmed Solid templates and do not certify cold-app startup under Trusted Types.

These measurements establish static initial-render performance in one Chromium version on one machine.
They do not establish hover, update, animation, SSR, hydration, memory, mobile, or fallback-browser performance, nor an automatic point-count crossover.
They do not establish a speed ordering between the three styling modes or guarantee these timings in production.

## Artifacts

- [All combined paired samples, full metric deltas, environment, and hashes](results-manydots-combined-20261005/results.json)
- [Exact frozen geometry and pixel checks](results-manydots-combined-20261005/correctness.json)
- [Variant input manifest](results-manydots-combined-20261005/inputs.json)
- [Independent centering measurement](MANYDOTS-CENTERING-RESULTS-20261005.md)
- [Independent scoped concrete CSS measurement](MANYDOTS-SCOPED-CSS-RESULTS-20261005.md)
- [Independent retained fresh-DOM measurement](MANYDOTS-FRESH-DOM-RESULTS-20261005.md)
- [Rejected native-parser experiment](MANYDOTS-FRESH-MOUNT-RESULTS-20261005.md)
- [Initial ManyDots versus Dot measurement](MANYDOTS-RESULTS-20261005.md)
- [Original diagnostic trace and attribution](MANYDOTS-TRACE-20261005.md)
- [Paired runner and repeat instructions](manydots/README.md)

The paired snapshot remains at `/var/folders/h7/8z8nc01n3n77k9t2q52w68dr0000gn/T/rhp-manydots-pair-GFHkth`.
Its bundle SHA256 is `f181aea6e7f0b73136d02f6d16087d18091366f377731b920d9a7bd7bd179019`.
