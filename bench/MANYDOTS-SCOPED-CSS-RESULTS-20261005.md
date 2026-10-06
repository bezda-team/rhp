# ManyDots scoped concrete CSS measurement (October 5, 2026)

Collection-local concrete CSS reduces 10,000-point style calculation by approximately 9% to 15% in this paired comparison.
Total main-thread time improves by approximately 4% to 6%, with resulting medians of 63.8 to 66.9 ms across the three styling modes.
The 50 ms target remains unmet by approximately 13.8 to 16.9 ms.
This phase measures only scoped concrete styling after the completed centering change.

## Paired results

Times are milliseconds, with lower values better, and are medians of five fresh pages per variant.
The reduction columns use the median of the five paired after/before ratios, rather than a ratio of independently aggregated medians.

| 10,000-point appearance | Frame before | Frame after | Main thread before | Main thread after | Paired main-thread reduction | Paired style reduction | Above 50 ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| Shared color | 65.7 | 62.0 | 68.1 | 64.7 | 5.7% | 15.3% | 14.7 ms |
| Ten category classes | 62.9 | 61.1 | 65.6 | 63.8 | 3.7% | 8.7% | 13.8 ms |
| 10,000 distinct colors | 66.7 | 64.2 | 69.6 | 66.9 | 4.7% | 8.9% | 16.9 ms |

| Appearance | Variant | Script | Style calculation | Layout | DevTools commands | Task other |
|---|---|---:|---:|---:|---:|---:|
| Shared color | Before | 14.2 | 29.6 | 11.3 | 1.8 | 11.8 |
| Shared color | After | 14.2 | 25.1 | 11.2 | 2.0 | 12.0 |
| Category classes | Before | 14.4 | 27.1 | 10.6 | 1.8 | 12.0 |
| Category classes | After | 15.2 | 25.0 | 11.0 | 1.8 | 11.5 |
| Distinct colors | Before | 16.4 | 28.0 | 11.0 | 2.0 | 12.0 |
| Distinct colors | After | 16.2 | 25.6 | 10.8 | 1.8 | 11.7 |

V8 compilation duration is zero in every timing sample.
The raw results preserve all initial and final CDP metrics, all metric deltas, and duration deltas in milliseconds.
Component medians are independently calculated and need not sum to the total median.

Style calculation improves by approximately 2.1 to 4.5 ms between variant medians, but remains the largest recorded component at approximately 25 ms.
Script, layout, and other rendering work do not show a comparable improvement in this phase.
The measurement establishes a modest benefit from the combined scoped concrete styling change, rather than a complete solution to the remaining rendering cost.

## Change and compatibility

The optimized collection writes one local style element containing concrete shared dimensions, color, and clipping declarations inside native CSS `@scope`.
The implicit scope root is the containing point collection, keeping independently styled collections separate in light DOM.
The declaration order explicitly establishes `rhp.place`, `rhp.slat`, and `rhp.core` before the scoped core rules, preserving existing RHP layer precedence during SSR.
Unsupported browsers retain the existing inherited-default-variable fallback.
Per-point inline colors, category classes, other appearance overrides, native queries, events, SSR, and hydration remain supported.

Before adds 10,032 connected elements and 10,046 total connected DOM nodes.
After adds 10,033 elements and 10,048 total nodes, corresponding to the local style element and its text.
There remains one ordinary HTML element per point.

## Fair comparison

The baseline is the flat snapshot of completed centering source at `/var/folders/h7/8z8nc01n3n77k9t2q52w68dr0000gn/T/rhp-manydots-iWO0HY`.
Both complete library variants are compiled into one minified browser bundle, loaded before timing.
They share the same captured current library source, with the before variant restoring only `src/manydots.jsx` and `src/manydots.css` from that baseline.
Source hashes confirm that exactly these two files differ between the measured variants.

The common `blocks.jsx` helper differs from the earlier flat snapshot solely by renaming and exporting the existing CSS-value validator, plus updating its unchanged internal call sites.
Both measured variants use the same helper implementation, and the before component does not call the new export.
No other library source files differ from the centering baseline.
The previous centering report, its raw results, and both prior frozen snapshots remain unchanged.
Before timings are newly measured here, so the reported CSS effect is not calculated by comparing medians from separate experiments.

Both variants use the same adapter, seeded coordinates, data, stable row-id keys, 4px points, 600px chart width, 400px plot height, `[0, 100]` domains, axes, and static mode.
The viewport is 1,000 by 900 CSS pixels.
The three styling modes use one shared theme color, ten category classes, or one distinct RGB color per point.
The frozen original frame protocol and two-second CDP TaskDuration window are unchanged.
No diagnostic trace marks or tracing sessions are used during timing.

There are five alternating-order pairs per styling mode, producing 30 measured fresh pages.
All samples were retained, and no timing runs were repeated.
The machine is an Apple M5 with 10 logical CPUs and 24 GiB memory, running macOS 26.5.2, Node 24.15.0, and Chromium 153.0.8010.12.
Dependency versions, source and bundle hashes, load averages, background CPU samples, and per-run CPU idle are included in the raw results.

## Activity and variation

This is a paired comparison under recorded background activity, with no quiet-machine claim.
The component correctness checks and full regression suite finished, and their browser/build processes closed before timing.
Aggregate CPU idle ranged from 72.2% to 82.0% during measured samples.
The slower first shared-color baseline sample and pairs where after was slower were retained.
These data establish neither a speed ordering between styling modes nor a guaranteed production timing.

| Appearance | Before main-thread range | After main-thread range |
|---|---:|---:|
| Shared color | 67.3 to 102.1 ms | 62.9 to 65.0 ms |
| Category classes | 64.7 to 69.0 ms | 62.8 to 70.6 ms |
| Distinct colors | 63.9 to 74.7 ms | 61.6 to 67.9 ms |

This experiment measures initial rendering with native CSS scope support.
It does not establish update, animation, hover, memory, or fallback-browser performance.

## Correctness and artifacts

Every point's coordinates, diameter, and color passed the frozen before/after checks across all three 10,000-point cases.
Chart and collection bounds matched, and all three complete-chart screenshot comparisons were pixel-identical, including the axes.
There were no page errors during correctness checks or any timing sample.
The final source passed 150 ManyDots checks across Chromium, WebKit, and Firefox, including native scope support, fallback styling, independently styled collections, parsed and raw SSR, hydration, and existing layer precedence.
The full existing Chromium regression suite passed all 221 checks, with type checks and SSR/browser package checks passing.

- [All paired samples, full metric deltas, environment, and source hashes](results-manydots-scoped-css-20261005/results.json)
- [Exact frozen geometry and pixel checks](results-manydots-scoped-css-20261005/correctness.json)
- [Variant input manifest](results-manydots-scoped-css-20261005/inputs.json)
- [Independent centering measurement](MANYDOTS-CENTERING-RESULTS-20261005.md)
- [Original baseline trace and attribution](MANYDOTS-TRACE-20261005.md)
- [Paired runner and repeat instructions](manydots/README.md)

The paired snapshot remains at `/var/folders/h7/8z8nc01n3n77k9t2q52w68dr0000gn/T/rhp-manydots-pair-C8KDfz`.
Its bundle SHA256 is `3c5b4c8d63d7a5fcb0a62bd2442fe5ad1821827835d0a9e2c6610947359323e0`.
