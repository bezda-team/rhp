# ManyDots baseline trace (October 5, 2026)

The baseline traces identify approximately 15 to 17 ms of renderer-main-thread PrePaint, Paint, and Layerize work at 10,000 points.
This supports testing centering that avoids unnecessary stacking contexts, but does not establish how much that change will save.
These are three individual diagnostic runs with tracing overhead, not replacement performance measurements.
The original untraced benchmark results remain unchanged.

## Renderer main-thread attribution

Each synchronous time slice is attributed to the innermost recognized phase and counted once.
Nested events are not added together, and raster/GPU threads are excluded from this table.
The observation window begins at the benchmark request and ends after the original two-second tail.

| Appearance | Script, excluding nested phases | Explicit style trace spans | Coarse Layout, including interleaved style | PrePaint | Paint | Layerize | Commit | GC | Other task self time |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Shared color | 30.7 | 2.8 | 49.5 | 6.1 | 7.0 | 4.1 | 0.1 | 3.7 | 8.2 |
| Category classes | 15.5 | 0.3 | 38.5 | 5.1 | 6.7 | 3.3 | 0.1 | 1.4 | 4.2 |
| Distinct colors | 16.3 | 0.3 | 40.1 | 5.3 | 6.8 | 4.1 | 0.1 | 1.5 | 4.3 |

This Chromium trace's coarse Layout span contains size-container style recalculation that lacks a corresponding broad UpdateLayoutTree span.
The explicit style trace column therefore does not represent total style calculation, and the coarse Layout column does not represent pure layout.
Chromium's Performance probes separately account for interleaved style recalculation, as shown in its [style-engine implementation](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/core/css/style_engine.cc).
The CDP counter table below gives the separate style/layout durations.

## Full Performance counters

Values are milliseconds over the diagnostic window.
The raw results preserve every metric's initial value, final value, and delta, including the heap, node, and count metrics.

| Appearance | Task | Script | Style calculation | Layout | V8 compilation | DevTools commands | Task other |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Shared color | 114.6 | 31.0 | 39.2 | 13.1 | 0.0 | 9.6 | 21.7 |
| Category classes | 76.4 | 15.9 | 28.8 | 10.0 | 0.0 | 3.1 | 18.6 |
| Distinct colors | 79.5 | 16.6 | 29.8 | 10.6 | 0.0 | 3.0 | 19.6 |

The first shared-color diagnostic is slower across several components, and was retained.
The category and distinct-color diagnostics show that compilation is not the unidentified cost in those runs.
GC includes pauses nested inside script as well as work elsewhere, so the GC trace column must not be added to the CDP Script counter as if those measures were exclusive.
The [Performance-agent implementation](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/core/inspector/inspector_performance_agent.cc) defines TaskOtherDuration after subtracting script, compilation, style, layout, and debugger-command durations.

## Method and limits

The immutable input is the final baseline snapshot at `/var/folders/h7/8z8nc01n3n77k9t2q52w68dr0000gn/T/rhp-manydots-akZNie`.
Its library source, fixtures, compiled bundle, original report, and original timing results were not modified.
Each appearance mode uses a fresh page with the existing 10,000-point fixture, geometry, axes, classes, and colors.
Injected diagnostic hooks mark the request, generated-data completion, first benchmark RAF callback, MessageChannel harness completion, and window end.
They do not alter the frozen files and are not used in the subsequent untraced paired benchmark.

The light trace includes timeline, frame, user-timing, V8, CppGC, and top-level task categories.
Screenshots, detailed paint capture, selector statistics, and sampling profiling were not enabled.
There was no trace data loss and there were no page errors.
Aggregate CPU idle ranged from 76.9% to 80.6%, with no quiet-machine claim.
All diagnostic browser processes closed after capture.

The exclusive trace window and CDP counter window have slightly different instrumentation boundaries.
Their totals are not expected to reconcile exactly, and tracing changes the overhead relative to the original untraced benchmark.
These captures identify phases to test; only a controlled paired untraced measurement can establish the centering change's actual performance effect.

- [Full metric counters, exclusive attribution, markers, and environment](results-manydots-trace-20261005/results.json)
- [Shared-color raw trace](results-manydots-trace-20261005/uniform.trace.json)
- [Category raw trace](results-manydots-trace-20261005/categories.trace.json)
- [Distinct-color raw trace](results-manydots-trace-20261005/unique.trace.json)
- [Diagnostic capture and analysis runner](manydots-trace.mjs)
