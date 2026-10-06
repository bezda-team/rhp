# ManyDots native-parser fresh mount measurement (October 5, 2026)

The native HTML parser candidate makes initial rendering slower in all three 10,000-point styling cases.
Median paired main-thread increases are 5.2% to 13.9%, and the candidate's total medians are 71.5 to 72.7 ms.
This experiment does not support keeping the parser optimization.
The 50 ms target remains unmet by 21.5 to 22.7 ms.
All samples remain available, including slower baseline samples and pairs where the candidate is faster.

## Paired results

Times are milliseconds, with lower values better, and are medians of five fresh pages per variant.
The increase columns use the median of the five paired after/before ratios, rather than a ratio of independently aggregated medians.

| 10,000-point appearance | Frame before | Frame after | Main thread before | Main thread after | Paired main-thread increase | Paired script increase | Above 50 ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| Shared color | 60.8 | 68.9 | 63.6 | 71.5 | 5.2% | 38.6% | 21.5 ms |
| Ten category classes | 61.8 | 70.0 | 64.7 | 72.7 | 13.9% | 54.0% | 22.7 ms |
| 10,000 distinct colors | 64.4 | 68.6 | 67.7 | 71.5 | 7.2% | 37.0% | 21.5 ms |

| Appearance | Variant | Script | Style calculation | Layout | DevTools commands | Task other |
|---|---|---:|---:|---:|---:|---:|
| Shared color | Before | 14.5 | 24.7 | 11.0 | 2.0 | 11.7 |
| Shared color | Parser candidate | 21.7 | 25.5 | 10.8 | 1.8 | 11.2 |
| Category classes | Before | 15.9 | 24.6 | 11.0 | 2.1 | 11.0 |
| Category classes | Parser candidate | 22.5 | 25.9 | 10.4 | 1.7 | 11.1 |
| Distinct colors | Before | 16.4 | 24.9 | 11.0 | 2.2 | 11.4 |
| Distinct colors | Parser candidate | 23.0 | 24.5 | 10.4 | 1.8 | 10.8 |

V8 compilation duration is zero in every timing sample.
The raw results preserve every initial and final CDP metric, every metric delta, and duration deltas in milliseconds.
Component medians are independently calculated and need not sum to the total median.

Script median increases by approximately 6.6 to 7.3 ms across the three cases.
Style calculation remains approximately 24.5 to 25.9 ms, layout approximately 10.4 to 10.8 ms, and task other approximately 10.8 to 11.2 ms in the candidate.
These counters establish that the candidate adds script cost in this experiment.
They do not isolate the contributions of CSS validation, markup serialization, native parsing, verification, or bookkeeping within that script cost.

## Candidate and correctness scope

The candidate serializes validated point CSS and escaped attributes into markup, then uses the native HTML parser for an initially empty point container.
It verifies the parsed point contract before adopting nodes and retains a native DOM construction fallback.
It reuses prepared point descriptors as keyed records.
Incremental updates and hydrated node reuse remain separate paths.
The same source change also fixes stale SSR inline-style cleanup, shared-default hydration updates, and vendor-prefixed pointStyle property names.
The measured rows use no pointStyle, perform no updates, and render fresh client charts without hydration.

Both variants add 10,033 connected elements and 10,048 total connected DOM nodes.
There remains one ordinary HTML element per point and one collection-local style element.
The candidate changes construction work without reducing the connected DOM population.

The final source passed 183 ManyDots checks, 61 each in Chromium, WebKit, and Firefox.
Those checks include initial rendering, SSR, hydration changes, parser escaping, CSS validation, keyed updates, and policy fallbacks.
Chromium's actual CSP test rejected attribute styles in the inert parser and exercised the native property-setter fallback.
WebKit and Firefox allowed inertly parsed attributes after adoption in that test, while their active parsing was blocked.
Trusted Types checks used warmed Solid templates and do not certify cold-app startup under Trusted Types.
The timed fixtures impose neither CSP nor Trusted Types restrictions.

The existing full Chromium suite passed all 221 checks after fixing an unrelated deterministic gallery-test assertion, and both comparison checks passed.
Type checks and SSR/browser package checks passed.
The gallery test now verifies the nonempty contiguous MIDI range and its endpoints rather than requiring more than 20 lit keys for every valid random note set.
That correction changes no library source or frozen benchmark inputs.

## Fair comparison

The baseline is the flat snapshot of completed centering and scoped concrete CSS at `/var/folders/h7/8z8nc01n3n77k9t2q52w68dr0000gn/T/rhp-manydots-p4zh8M`.
Both complete library variants are compiled into one minified browser bundle and loaded before timing.
They share captured current library source, with the before variant restoring the approved ManyDots files from that baseline.
Source hashes confirm that only `src/manydots.jsx` differs between variants.
The stylesheet and all other library source files are identical.
Previous reports, raw results, and baseline snapshots remain unchanged.

Both variants receive identical seeded coordinates, data objects, stable row-id keys, 4px opaque points, 600px chart width, 400px plot height, `[0, 100]` domains, axes, and static mode.
The viewport is 1,000 by 900 CSS pixels.
The three styling modes use one shared theme color, ten category classes, or one distinct RGB color per point.
The original frozen requestAnimationFrame and MessageChannel protocol and two-second CDP TaskDuration window are unchanged.
No diagnostic tracing sessions or trace marks are used during timing.

Five alternating-order pairs per styling mode produce 30 measured fresh pages.
All 30 samples were retained, and no timing runs were repeated.
The machine is an Apple M5 with 10 logical CPUs and 24 GiB memory, running macOS 26.5.2, Node 24.15.0, and Chromium 153.0.8010.12.
Dependency versions, source and bundle hashes, load averages, background CPU samples, and per-run CPU idle are included in the raw results.

## Activity and limits

This is a paired comparison under recorded background activity, with no quiet-machine claim.
The ManyDots correctness checks and full regression suite finished, and their browser/build processes closed before timing.
Aggregate CPU idle ranged from 77.0% to 88.2% during measured samples.
The first shared-color baseline sample is slower than later samples and remains in the dataset.
Some candidate samples are faster than their corresponding baseline, and they also remain in the dataset.

| Appearance | Before main-thread range | Parser main-thread range |
|---|---:|---:|
| Shared color | 59.0 to 84.3 ms | 66.7 to 72.2 ms |
| Category classes | 59.5 to 70.1 ms | 67.4 to 73.7 ms |
| Distinct colors | 60.4 to 68.6 ms | 67.5 to 73.1 ms |

This experiment measures static initial rendering with native CSS scope support and the unrestricted parser path.
It does not establish update, hover, animation, memory, SSR, hydration, fallback-browser, or mobile performance.
It does not justify adding earlier phase percentages together or claiming an original-to-final combined speedup.
The previously prepared original-to-parser comparison was not timed because this isolated candidate regresses.

## Artifacts

Every point's coordinates, diameter, and color passed the frozen before/after checks across all three 10,000-point cases.
Chart and collection bounds matched, and all three complete-chart screenshot comparisons were pixel-identical, including the axes.
There were no page errors during correctness checks or any timing sample.

- [All paired samples, full metric deltas, environment, and hashes](results-manydots-fresh-mount-20261005/results.json)
- [Exact frozen geometry and pixel checks](results-manydots-fresh-mount-20261005/correctness.json)
- [Variant input manifest](results-manydots-fresh-mount-20261005/inputs.json)
- [Scoped concrete CSS measurement](MANYDOTS-SCOPED-CSS-RESULTS-20261005.md)
- [Centering measurement](MANYDOTS-CENTERING-RESULTS-20261005.md)
- [Original prototype measurement](MANYDOTS-RESULTS-20261005.md)
- [Original baseline trace and attribution](MANYDOTS-TRACE-20261005.md)
- [Paired runner and repeat instructions](manydots/README.md)

The paired snapshot remains at `/var/folders/h7/8z8nc01n3n77k9t2q52w68dr0000gn/T/rhp-manydots-pair-CdTdbT`.
Its bundle SHA256 is `cc2f64194e90cc86b5af9b3e495bf4e0b670bf7a7442e56f8fdec5bbca6cd6ed`.
