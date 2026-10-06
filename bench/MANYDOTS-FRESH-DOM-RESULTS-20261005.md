# ManyDots fresh DOM construction measurement (October 5, 2026)

A dedicated native DOM construction path gives a modest and variable initial-render benefit at 10,000 points.
Median paired main-thread reductions are 6.0% to 7.6%, but separately calculated shared-color medians remain effectively unchanged at 63.1 and 63.3 ms.
The category and distinct-color medians improve by approximately 2.6 and 2.7 ms.
The resulting medians of 62.5 to 63.4 ms still miss the 50 ms target.
This retained path uses native DOM methods and contains no HTML parser optimization.

## Paired results

Times are milliseconds, with lower values better, and are medians of five fresh pages per variant.
Reduction columns use the median of the five paired after/before ratios, rather than a ratio of independently aggregated medians.
Each mode has three pairs where after is faster and two where after is slower.
The paired ratios and separate variant medians summarize this variation differently, particularly in the shared-color case.

| 10,000-point appearance | Frame before | Frame after | Main thread before | Main thread after | Paired main-thread reduction | Paired script reduction | Above 50 ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| Shared color | 60.2 | 60.4 | 63.1 | 63.3 | 7.6% | 9.4% | 13.3 ms |
| Ten category classes | 63.3 | 60.7 | 66.1 | 63.4 | 6.0% | 11.8% | 13.4 ms |
| 10,000 distinct colors | 62.3 | 60.2 | 65.3 | 62.5 | 6.2% | 6.4% | 12.5 ms |

| Appearance | Variant | Script | Style calculation | Layout | DevTools commands | Task other |
|---|---|---:|---:|---:|---:|---:|
| Shared color | Before | 14.1 | 24.9 | 10.7 | 1.9 | 11.4 |
| Shared color | After | 14.3 | 24.9 | 10.6 | 1.8 | 11.3 |
| Category classes | Before | 15.5 | 25.3 | 11.1 | 1.9 | 11.4 |
| Category classes | After | 14.1 | 25.5 | 11.0 | 1.6 | 11.2 |
| Distinct colors | Before | 16.1 | 24.9 | 10.7 | 2.0 | 11.6 |
| Distinct colors | After | 15.4 | 24.1 | 10.6 | 1.9 | 11.0 |

V8 compilation duration is zero in every timing sample.
The raw results preserve all initial and final CDP metrics, all metric deltas, and duration deltas in milliseconds.
Component medians are independently calculated and need not sum to the total median.
The category and distinct-color script medians improve by approximately 1.5 and 0.7 ms, while the shared-color script median increases approximately 0.2 ms.
These measurements support only a modest benefit, without establishing a reliable 6% to 8% improvement on arbitrary machines or production plots.

## Work changed

New points have no previous style state or existing position in the collection.
The dedicated constructor assigns their class, row index, and managed CSS directly, then attaches their elements together through a DocumentFragment.
It reuses each prepared point descriptor as its keyed record, avoiding a second record allocation, previous-style bookkeeping, and reorder checks for an empty collection.
The same empty-collection path also handles later population or repopulation, although those operations are not timed here.
The existing keyed update path continues to handle populated collections and hydration.

The source also fixes stale SSR inline-style cleanup, shared-default hydration updates, shorthand declaration ordering, and vendor-prefixed pointStyle property names.
These fixes are included rather than omitted for measurement.
The timed fixtures render fresh client charts with no updates, hydration, or pointStyle overrides.
Only `src/manydots.jsx` differs between the measured variants.
The common stylesheet, completed centering, and scoped concrete defaults are identical.

Both variants add 10,033 connected elements and 10,048 total connected DOM nodes.
The collection still contains one ordinary HTML element per point and one local style element.
This change reduces construction bookkeeping while keeping the same DOM population and native style setters.

The earlier native HTML parser candidate added approximately 6.6 to 7.3 ms of script median and regressed total time in every styling mode.
That implementation was removed before this experiment.
Its report and all 30 samples remain preserved separately.
This new measurement is justified by the changed implementation, with no repeated timing runs on either implementation.

## Fair comparison and activity

The baseline is the flat snapshot of completed centering and scoped concrete CSS at `/var/folders/h7/8z8nc01n3n77k9t2q52w68dr0000gn/T/rhp-manydots-p4zh8M`.
Both complete libraries are compiled into one minified browser bundle and loaded before timing.
Both variants use captured current common source, and the before variant restores the approved ManyDots files from the baseline.
Source hashes confirm that only `src/manydots.jsx` differs.
The baseline and all previous reports and raw results remain unchanged.

Both variants receive identical seeded coordinates, data objects, stable row-id keys, 4px opaque points, 600px chart width, 400px plot height, `[0, 100]` domains, axes, and static mode.
The viewport is 1,000 by 900 CSS pixels.
The appearance cases use one shared theme color, ten reusable category classes, or one distinct RGB color per point.
The original frozen requestAnimationFrame and MessageChannel protocol and two-second CDP TaskDuration window are unchanged.
No tracing sessions or trace marks are used during timing.

There are five alternating-order pairs per styling mode, producing 30 measured fresh pages.
All samples were retained, and no timing runs were repeated.
The machine is an Apple M5 with 10 logical CPUs and 24 GiB memory, running macOS 26.5.2, Node 24.15.0, and Chromium 153.0.8010.12.
Dependency versions, hashes, load averages, background CPU samples, and per-run CPU idle are included in the raw results.

This is a paired comparison under recorded background activity, with no quiet-machine claim.
The ManyDots correctness checks and full regression suite finished, and their browser/build processes closed before timing.
Aggregate CPU idle ranged from 84.4% to 89.1% during measured samples.
The slow first shared-color baseline sample and every pair where after is slower remain in the dataset.

| Appearance | Before main-thread range | After main-thread range |
|---|---:|---:|
| Shared color | 57.9 to 86.9 ms | 58.3 to 65.3 ms |
| Category classes | 60.7 to 67.7 ms | 59.4 to 66.2 ms |
| Distinct colors | 60.9 to 66.7 ms | 59.5 to 67.4 ms |

This experiment measures static initial rendering with native CSS scope support.
It does not establish update, hover, animation, memory, SSR, hydration, fallback-browser, or mobile performance.
It does not establish an ordering between styling modes or a point-count crossover.

## Correctness and artifacts

Every point's coordinates, diameter, and color passed the frozen before/after checks across all three 10,000-point cases.
Chart and collection bounds matched, and all three complete-chart screenshot comparisons were pixel-identical, including the axes.
There were no page errors during correctness checks or any timing sample.
Final source passed 183 ManyDots checks, 61 each in Chromium, WebKit, and Firefox, including fresh population, keyed updates, SSR, hydration, shorthand handling, and policy checks.
The existing full Chromium suite passed all 221 checks, with types and SSR/browser package checks passing.
Trusted Types checks used warmed Solid templates and do not certify cold-app startup under Trusted Types.

- [All paired samples, full metric deltas, environment, and hashes](results-manydots-fresh-dom-20261005/results.json)
- [Exact frozen geometry and pixel checks](results-manydots-fresh-dom-20261005/correctness.json)
- [Variant input manifest](results-manydots-fresh-dom-20261005/inputs.json)
- [Rejected native-parser experiment](MANYDOTS-FRESH-MOUNT-RESULTS-20261005.md)
- [Scoped concrete CSS measurement](MANYDOTS-SCOPED-CSS-RESULTS-20261005.md)
- [Independent centering measurement](MANYDOTS-CENTERING-RESULTS-20261005.md)
- [Controlled original-to-final measurement](MANYDOTS-COMBINED-RESULTS-20261005.md)
- [Paired runner and repeat instructions](manydots/README.md)

The paired snapshot remains at `/var/folders/h7/8z8nc01n3n77k9t2q52w68dr0000gn/T/rhp-manydots-pair-jsUl5O`.
Its bundle SHA256 is `78f47cbd14a1483636b237acedd213dfc5c734fec151a509b3483d2edd1604b5`.
