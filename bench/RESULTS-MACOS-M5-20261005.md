# Results

Machine: Apple M5, 10 logical CPUs, 24 GiB, macOS 26.5.2.
How it was measured: [README.md](README.md).
Smaller times, bundle sizes, memory use and dropped-frame counts are better.

Environment: [saved metadata](results-macos-m5-20261005/environment.json).
Local worktree, existing user CSS edits preserved.
Other desktop applications active; no evaluation agents running during timings.
The first scale run is retained in scale-cdp-nodes.json; the corrected scale.json counts connected elements because the original CDP counter could decrease during garbage collection.

## Size

A bar chart app, minified and gzipped, in kB.

| Library | Total | Without React or Solid |
|---|---:|---:|
| Plain DOM | 0.4 | 0.4 |
| Charts.css | 6.3 | 6.3 |
| D3 | 18.7 | 18.7 |
| rhp (CSS) | 27.5 | 18.2 |
| rhp (JS) | 27.5 | 18.2 |
| rhp (static) | 27.5 | 18.2 |
| Chart.js | 47.9 | 47.9 |
| Observable Plot | 93.1 | 93.1 |
| Highcharts | 104.9 | 104.9 |
| Victory | 148.0 | 78.7 |
| Nivo | 159.8 | 90.7 |
| ECharts | 161.2 | 161.2 |
| Recharts | 164.2 | 95.9 |
| ApexCharts | 284.6 | 284.6 |
| Vega-Lite | 304.0 | 304.0 |
| AntV G2 | 407.6 | 407.6 |

## Chromium (Playwright's build, headless)

Browser: 153.0.8010.12.
Started: 2026-10-05T19:00:05.117Z.
Completed: 2026-10-05T19:14:53.419Z.
Libraries: 16.

### Mount (ms)

"Frame" is the frame the chart is made in.
"Total" is all main-thread time in the second after, with deferred drawing and entry animations.

| Library | 20 bars: frame | total | 1,000 bars: frame | total | 50 charts: frame | total |
|---|---:|---:|---:|---:|---:|---:|
| Charts.css | 5.1 | 6.8 | 19 | 27 | 8.8 | 10 |
| Plain DOM | 5.3 | 7.0 | 18 | 26 | 9.8 | 11 |
| D3 | 9.6 | 11 | 24 | 26 | 18 | 20 |
| Observable Plot | 8.9 | 10 | 25 | 26 | 26 | 27 |
| rhp (CSS) | 12 | 14 | 64 | 66 | 27 | 29 |
| rhp (JS) | 11 | 13 | 65 | 67 | 27 | 29 |
| rhp (static) | 12 | 14 | 61 | 63 | 28 | 29 |
| Victory | 18 | 19 | 101 | 102 | 63 | 64 |
| Vega-Lite | 23 | 25 | 50 | 52 | 104 | 120 |
| Chart.js | 18 | 93 | 33 | 344 | 46 | 284 |
| Nivo | 19 | 98 | 248 | 761 | 112 | 298 |
| ECharts | 23 | 109 | 53 | 371 | 63 | 319 |
| Recharts | 24 | 95 | 111 | 564 | 144 | 369 |
| ApexCharts | 20 | 91 | 160 | 446 | 112 | 391 |
| Highcharts | 21 | 68 | 113 | 370 | 140 | 420 |
| AntV G2 | 33 | 86 | 232 | 626 | 243 | 547 |

### Updates

One value changes.
Latency: until its frame is drawn.
Main thread: all work for the change, animation frames included.
Drag: one value changes every frame for 240 frames.

| Library | Latency (ms) | Main thread per change (ms) | Drag: main thread per frame (ms) | Drag: dropped frames | Drag, CPU 4x slower: dropped frames |
|---|---:|---:|---:|---:|---:|
| Plain DOM | 1.4 | 1.4 | 0.6 | 0 | 0 |
| Charts.css | 1.9 | 1.9 | 0.8 | 0 | 0 |
| Vega-Lite | 2.0 | 2.3 | 0.7 | 0 | 0 |
| rhp (static) | 4.9 | 5.2 | 3.7 | 0 | 0 |
| Observable Plot | 5.2 | 5.5 | 3.8 | 0 | 0 |
| Victory | 8.4 | 8.4 | 5.8 | 0 | 0 |
| rhp (CSS) | 2.4 | 8.8 | 1.5 | 0 | 0 |
| D3 | 2.8 | 8.8 | 1.6 | 0 | 0 |
| rhp (JS) | 1.2 | 13 | 1.3 | 0 | 0 |
| Highcharts | 7.6 | 33 | 5.1 | 0 | 0 |
| Nivo | 9.5 | 42 | 5.6 | 0 | 1 |
| ECharts | 16 | 48 | 4.7 | 1 | 1 |
| ApexCharts | 16 | 49 | 5.6 | 0 | 3 |
| Chart.js | 16 | 54 | 3.9 | 0 | 1 |
| AntV G2 | 23 | 73 | 3.6 | 0 | 7 |
| Recharts | 12 | 81 | 5.2 | 0 | 1 |

### Memory

What the 50-chart dashboard adds.

| Library | JS heap (MB) | DOM nodes |
|---|---:|---:|
| Charts.css | 0.1 | 2250 |
| Plain DOM | 0.1 | 2150 |
| D3 | 0.5 | 3550 |
| rhp (static) | 1.7 | 3373 |
| Observable Plot | 1.8 | 3800 |
| rhp (CSS) | 2.8 | 3373 |
| rhp (JS) | 3.0 | 3373 |
| Chart.js | 4.4 | 150 |
| Victory | 5.4 | 4352 |
| ApexCharts | 5.6 | 7402 |
| Highcharts | 5.6 | 7250 |
| ECharts | 6.7 | 201 |
| Vega-Lite | 13.8 | 6104 |
| Nivo | 21.8 | 5900 |
| AntV G2 | 27.8 | 150 |
| Recharts | 28.9 | 6552 |

## Scale

Chromium 153.0.8010.12, started 2026-10-05T19:24:26.990Z.
Completed: 2026-10-05T19:32:01.681Z.
Libraries: 10.
Median of five fresh pages per scenario.
The frame time covers the call's frame; total covers main-thread work through the two seconds after that frame.
DOM elements are connected elements added to the document, counted outside the timing window.

### 1,000 scatter points

| Library | Frame (ms) | Total (ms) | DOM elements | Errors |
|---|---:|---:|---:|---:|
| D3 | 9.5 | 11 | 1073 | 0 |
| Observable Plot | 12 | 13 | 1046 | 0 |
| Vega-Lite | 29 | 31 | 1112 | 0 |
| rhp (static) | 32 | 33 | 2031 | 0 |
| Highcharts | 26 | 145 | 1057 | 0 |
| AntV G2 | 54 | 224 | 2 | 0 |
| ApexCharts | 32 | 315 | 1092 | 0 |
| Chart.js | 26 | 333 | 3 | 0 |
| ECharts | 31 | 337 | 4 | 0 |
| Recharts | 77 | 518 | 3084 | 0 |

### 10,000 scatter points

| Library | Frame (ms) | Total (ms) | DOM elements | Errors |
|---|---:|---:|---:|---:|
| Observable Plot | 27 | 29 | 10046 | 0 |
| D3 | 28 | 30 | 10073 | 0 |
| Vega-Lite | 71 | 72 | 10112 | 0 |
| ECharts | 28 | 125 | 5 | 0 |
| Highcharts | 74 | 233 | 10057 | 0 |
| rhp (static) | 239 | 243 | 20031 | 0 |
| Chart.js | 89 | 809 | 3 | 0 |
| ApexCharts | 129 | 1126 | 10092 | 0 |
| Recharts | 551 | 1607 | 30084 | 0 |
| AntV G2 | 254 | 2258 | 2 | 0 |

### 1,000 line points

| Library | Frame (ms) | Total (ms) | DOM elements | Errors |
|---|---:|---:|---:|---:|
| D3 | 9.3 | 10 | 64 | 0 |
| Observable Plot | 10 | 11 | 47 | 0 |
| rhp (static) | 13 | 14 | 31 | 0 |
| Vega-Lite | 26 | 27 | 122 | 0 |
| Highcharts | 19 | 46 | 57 | 0 |
| ApexCharts | 19 | 51 | 94 | 0 |
| AntV G2 | 25 | 74 | 2 | 0 |
| ECharts | 22 | 158 | 4 | 0 |
| Chart.js | 25 | 271 | 3 | 0 |
| Recharts | 24 | 375 | 84 | 0 |

### 100,000 line points

| Library | Frame (ms) | Total (ms) | DOM elements | Errors |
|---|---:|---:|---:|---:|
| D3 | 31 | 38 | 64 | 0 |
| rhp (static) | 40 | 56 | 31 | 0 |
| Observable Plot | 45 | 58 | 37 | 0 |
| ECharts | 92 | 109 | 4 | 0 |
| Vega-Lite | 120 | 152 | 107 | 0 |
| AntV G2 | 154 | 275 | 2 | 0 |
| Highcharts | 113 | 573 | 61 | 0 |
| ApexCharts | 55 | 819 | 91 | 0 |
| Chart.js | 565 | 1141 | 3 | 0 |
| Recharts | 352 | 1900 | 84 | 0 |
