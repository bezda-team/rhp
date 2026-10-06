# Results

Machine: Apple M5, 10 logical CPUs, 24 GiB RAM, macOS 26.5.2; background load.
How it was measured: [README.md](README.md).
Smaller times, bundle sizes, memory use and dropped-frame counts are better.

Environment: [saved metadata](results-macos-m5-repeat-background-20261005/environment.json).
Local working tree, including pre-existing user CSS edits, the clipping/grid/checker fixes, and the scatter adapter's wrapper removal.
All poster generation and judging sessions from this evaluation ended before measurement began.
The strict CPU-idle attempt is preserved in results-macos-m5-repeat-20261005.
It never reached 90% idle during 120 seconds, so this separate repeat runs with background activity.
No idle-machine claim is made.
The shared checkout changed after the bundles were frozen: ManyDots implementation work is outside this benchmark.
All frozen bundle hashes still match.

## Size

A bar chart app, minified and gzipped, in kB.

| Library | Total | Without React or Solid |
|---|---:|---:|
| Plain DOM | 0.4 | 0.4 |
| Charts.css | 6.3 | 6.3 |
| D3 | 18.7 | 18.7 |
| rhp (CSS) | 27.6 | 18.2 |
| rhp (JS) | 27.6 | 18.2 |
| rhp (static) | 27.6 | 18.2 |
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
Started: 2026-10-05T22:42:46.441Z.
Completed: 2026-10-05T23:00:51.429Z.
Libraries: 16.

### Mount (ms)

"Frame" is the frame the chart is made in.
"Total" is all main-thread time in the second after, with deferred drawing and entry animations.

| Library | 20 bars: frame | total | 1,000 bars: frame | total | 50 charts: frame | total |
|---|---:|---:|---:|---:|---:|---:|
| Plain DOM | 4.9 | 6.6 | 14 | 23 | 9.6 | 11 |
| Charts.css | 6.5 | 7.8 | 20 | 26 | 13 | 15 |
| D3 | 11 | 12 | 23 | 25 | 16 | 19 |
| Observable Plot | 8.5 | 10 | 26 | 28 | 27 | 28 |
| rhp (CSS) | 13 | 14 | 64 | 66 | 27 | 29 |
| rhp (static) | 10 | 12 | 65 | 67 | 27 | 29 |
| rhp (JS) | 12 | 13 | 65 | 67 | 28 | 30 |
| Victory | 18 | 19 | 102 | 103 | 64 | 65 |
| Vega-Lite | 23 | 25 | 50 | 52 | 112 | 122 |
| Chart.js | 18 | 105 | 33 | 321 | 46 | 290 |
| Nivo | 20 | 92 | 255 | 809 | 111 | 297 |
| ECharts | 23 | 106 | 54 | 383 | 66 | 302 |
| Recharts | 23 | 99 | 113 | 556 | 145 | 379 |
| ApexCharts | 21 | 114 | 159 | 449 | 110 | 396 |
| Highcharts | 21 | 74 | 117 | 357 | 138 | 402 |
| AntV G2 | 33 | 79 | 231 | 620 | 242 | 565 |

### Updates

One value changes.
Latency: until its frame is drawn.
Main thread: all work for the change, animation frames included.
Drag: one value changes every frame for 240 frames.

| Library | Latency (ms) | Main thread per change (ms) | Drag: main thread per frame (ms) | Drag: dropped frames | Drag, CPU 4x slower: dropped frames |
|---|---:|---:|---:|---:|---:|
| Plain DOM | 1.0 | 1.1 | 0.6 | 0 | 0 |
| Charts.css | 1.1 | 1.2 | 0.9 | 0 | 0 |
| Vega-Lite | 1.2 | 1.5 | 0.7 | 0 | 0 |
| rhp (static) | 4.0 | 4.3 | 3.7 | 0 | 0 |
| Observable Plot | 4.9 | 5.0 | 4.1 | 0 | 0 |
| Victory | 6.6 | 6.5 | 4.6 | 0 | 1 |
| rhp (CSS) | 1.5 | 6.6 | 1.4 | 0 | 0 |
| D3 | 1.8 | 10 | 1.8 | 0 | 0 |
| rhp (JS) | 0.7 | 13 | 1.4 | 0 | 0 |
| Nivo | 15 | 35 | 5.2 | 0 | 1 |
| ECharts | 6.9 | 36 | 3.6 | 0 | 1 |
| Highcharts | 7.2 | 37 | 5.4 | 0 | 0 |
| Recharts | 9.4 | 51 | 5.2 | 0 | 1 |
| Chart.js | 15 | 58 | 3.7 | 0 | 0 |
| AntV G2 | 22 | 59 | 3.0 | 0 | 6 |
| ApexCharts | 15 | 63 | 5.6 | 0 | 2 |

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
| AntV G2 | 27.7 | 150 |
| Recharts | 29.0 | 6552 |

## Scale

Chromium 153.0.8010.12, started 2026-10-05T23:00:51.785Z.
Completed: 2026-10-05T23:08:27.811Z.
Libraries: 10.
Median of five fresh pages per scenario.
The frame time covers the call's frame; total covers main-thread work through the two seconds after that frame.
DOM elements are connected elements added to the document, counted outside the timing window.

### 1,000 scatter points

| Library | Frame (ms) | Total (ms) | DOM elements | Errors |
|---|---:|---:|---:|---:|
| D3 | 11 | 12 | 1073 | 0 |
| Observable Plot | 12 | 13 | 1046 | 0 |
| rhp (static) | 26 | 27 | 1031 | 0 |
| Vega-Lite | 31 | 33 | 1112 | 0 |
| Highcharts | 25 | 122 | 1057 | 0 |
| AntV G2 | 55 | 221 | 2 | 0 |
| Chart.js | 27 | 267 | 3 | 0 |
| ApexCharts | 33 | 280 | 1092 | 0 |
| ECharts | 32 | 342 | 4 | 0 |
| Recharts | 82 | 515 | 3084 | 0 |

### 10,000 scatter points

| Library | Frame (ms) | Total (ms) | DOM elements | Errors |
|---|---:|---:|---:|---:|
| Observable Plot | 27 | 29 | 10046 | 0 |
| D3 | 29 | 31 | 10073 | 0 |
| Vega-Lite | 72 | 73 | 10112 | 0 |
| ECharts | 29 | 130 | 5 | 0 |
| rhp (static) | 165 | 177 | 10031 | 0 |
| Highcharts | 75 | 250 | 10057 | 0 |
| Chart.js | 89 | 840 | 3 | 0 |
| ApexCharts | 141 | 1151 | 10092 | 0 |
| Recharts | 565 | 1662 | 30084 | 0 |
| AntV G2 | 273 | 2276 | 2 | 0 |

### 1,000 line points

| Library | Frame (ms) | Total (ms) | DOM elements | Errors |
|---|---:|---:|---:|---:|
| D3 | 8.7 | 9.8 | 64 | 0 |
| Observable Plot | 11 | 12 | 47 | 0 |
| rhp (static) | 10 | 12 | 31 | 0 |
| Vega-Lite | 27 | 28 | 122 | 0 |
| Highcharts | 21 | 48 | 57 | 0 |
| ApexCharts | 18 | 55 | 94 | 0 |
| AntV G2 | 29 | 75 | 2 | 0 |
| ECharts | 22 | 127 | 4 | 0 |
| Chart.js | 26 | 216 | 3 | 0 |
| Recharts | 27 | 278 | 84 | 0 |

### 100,000 line points

| Library | Frame (ms) | Total (ms) | DOM elements | Errors |
|---|---:|---:|---:|---:|
| D3 | 29 | 36 | 64 | 0 |
| Observable Plot | 45 | 57 | 37 | 0 |
| rhp (static) | 42 | 58 | 31 | 0 |
| ECharts | 93 | 109 | 4 | 0 |
| Vega-Lite | 122 | 157 | 107 | 0 |
| AntV G2 | 163 | 291 | 2 | 0 |
| Highcharts | 121 | 645 | 61 | 0 |
| ApexCharts | 62 | 971 | 91 | 0 |
| Chart.js | 592 | 1245 | 3 | 0 |
| Recharts | 375 | 1964 | 84 | 0 |
