# Results

Machine: MacBook Air (Apple silicon), macOS 26. How it was measured: [README.md](README.md). Lower is better everywhere.

## Size

A bar chart app, minified and gzipped, in kB.

| Library | Total | Without React or Solid |
|---|---:|---:|
| Plain DOM | 0.4 | 0.4 |
| Charts.css | 6.3 | 6.3 |
| D3 | 18.7 | 18.7 |
| rhp (CSS) | 21.3 | 12.2 |
| rhp (JS) | 21.3 | 12.2 |
| rhp (static) | 21.3 | 12.2 |
| Chart.js | 47.9 | 47.9 |
| Observable Plot | 93.1 | 93.1 |
| Victory | 148.0 | 78.7 |
| ApexCharts | 155.3 | 155.3 |
| Nivo | 159.9 | 90.7 |
| ECharts | 161.2 | 161.2 |
| Recharts | 164.2 | 95.9 |

## Chrome

### Mount (ms)

"Frame" is the frame the chart is made in. "Total" is all main-thread time in the second after, with deferred drawing and entry animations.

| Library | 20 bars: frame | total | 1,000 bars: frame | total | 50 charts: frame | total |
|---|---:|---:|---:|---:|---:|---:|
| Plain DOM | 3.1 | 5.8 | 13 | 22 | 5.9 | 8.8 |
| Charts.css | 3.7 | 6.5 | 17 | 25 | 7.8 | 11 |
| D3 | 6.0 | 8.8 | 19 | 22 | 14 | 17 |
| rhp (CSS) | 8.0 | 11 | 58 | 62 | 23 | 26 |
| rhp (JS) | 8.1 | 11 | 57 | 61 | 24 | 26 |
| Observable Plot | 7.4 | 10 | 25 | 28 | 24 | 27 |
| rhp (static) | 7.8 | 11 | 57 | 60 | 23 | 27 |
| Victory | 15 | 18 | 98 | 100 | 59 | 62 |
| Chart.js | 14 | 61 | 28 | 262 | 40 | 225 |
| ECharts | 21 | 78 | 49 | 326 | 61 | 229 |
| Nivo | 19 | 90 | 249 | 810 | 109 | 292 |
| Recharts | 23 | 82 | 110 | 551 | 144 | 379 |
| ApexCharts | 21 | 199 | 2198 | 2903 | 141 | 872 |

### Updates

One value changes. Latency: until its frame is drawn. Main thread: all work for the change, animation frames included. Drag: one value changes every frame for 240 frames.

| Library | Latency (ms) | Main thread per change (ms) | Drag: main thread per frame (ms) | Drag: dropped frames | Drag, CPU 4x slower: dropped frames |
|---|---:|---:|---:|---:|---:|
| Plain DOM | 2.0 | 2.1 | 1.3 | 0 | 0 |
| Charts.css | 2.7 | 2.5 | 1.7 | 0 | 0 |
| rhp (static) | 4.1 | 4.1 | 2.7 | 0 | 0 |
| Observable Plot | 5.5 | 5.3 | 3.4 | 0 | 0 |
| Victory | 8.2 | 8.7 | 4.3 | 0 | 0 |
| D3 | 3.3 | 8.8 | 2.1 | 0 | 1 |
| rhp (CSS) | 2.5 | 9.0 | 1.4 | 0 | 0 |
| rhp (JS) | 1.1 | 12 | 1.2 | 0 | 0 |
| Chart.js | 16 | 35 | 3.5 | 0 | 0 |
| ECharts | 6.7 | 42 | 3.8 | 0 | 0 |
| Nivo | 10 | 44 | 4.8 | 0 | 1 |
| Recharts | 11 | 77 | 4.7 | 0 | 1 |
| ApexCharts | 18 | 180 | 27 | 118 | 238 |

### Memory

What the 50-chart dashboard adds.

| Library | JS heap (MB) | DOM nodes |
|---|---:|---:|
| Charts.css | 0.1 | 2250 |
| Plain DOM | 0.1 | 2150 |
| D3 | 0.5 | 3550 |
| rhp (static) | 1.5 | 3273 |
| Observable Plot | 1.8 | 3800 |
| rhp (CSS) | 2.6 | 3273 |
| rhp (JS) | 2.8 | 3273 |
| Chart.js | 4.4 | 150 |
| Victory | 5.4 | 4352 |
| ApexCharts | 5.6 | 8952 |
| ECharts | 6.7 | 201 |
| Nivo | 21.8 | 5900 |
| Recharts | 29.0 | 6552 |

## Safari

Mount: the frame the chart is made in (ms). Update: from the change to its drawn frame (ms). Drag: dropped frames out of 240.

| Library | 20 bars | 1,000 bars | 50 charts | Update | Drag: dropped frames | Drag: fps |
|---|---:|---:|---:|---:|---:|---:|
| Plain DOM | 5.0 | 32 | 21 | 3.0 | 0 | 60 |
| D3 | 7.0 | 29 | 24 | 4.0 | 0 | 59.9 |
| Charts.css | 7.0 | 49 | 26 | 4.0 | 1 | 59.8 |
| Chart.js | 14 | 32 | 27 | 16 | 0 | 60 |
| Observable Plot | 10 | 30 | 33 | 6.0 | 1 | 59.7 |
| rhp (static) | 14 | 82 | 53 | 8.0 | 0 | 60 |
| rhp (CSS) | 14 | 82 | 54 | 3.0 | 0 | 59.9 |
| rhp (JS) | 15 | 82 | 54 | 2.0 | 0 | 59.9 |
| ECharts | 22 | 46 | 59 | 9.0 | 0 | 60 |
| Victory | 21 | 107 | 61 | 8.0 | 1 | 59.8 |
| Nivo | 26 | 345 | 125 | 16 | 0 | 59.9 |
| Recharts | 29 | 114 | 170 | 13 | 2 | 59.8 |
| ApexCharts | 27 | 3334 | 182 | 25 | 51 | 42 |

## Firefox

Mount: the frame the chart is made in (ms). Update: from the change to its drawn frame (ms). Drag: dropped frames out of 240.

| Library | 20 bars | 1,000 bars | 50 charts | Update | Drag: dropped frames | Drag: fps |
|---|---:|---:|---:|---:|---:|---:|
| Plain DOM | 4.0 | 17 | 8.0 | 1.0 | 1 | 60.1 |
| Charts.css | 5.0 | 23 | 10 | 3.0 | 1 | 60.1 |
| D3 | 5.0 | 24 | 20 | 2.0 | 1 | 59.9 |
| rhp (static) | 9.0 | 61 | 39 | 7.0 | 2 | 59.6 |
| Observable Plot | 7.0 | 31 | 41 | 7.0 | 1 | 60.1 |
| rhp (CSS) | 10 | 62 | 41 | 3.0 | 1 | 60 |
| rhp (JS) | 9.0 | 64 | 42 | 2.0 | 1 | 59.9 |
| Chart.js | 8.0 | 33 | 61 | 12 | 1 | 60 |
| Victory | 15 | 122 | 90 | 9.0 | 1 | 59.9 |
| ECharts | 16 | 64 | 98 | 10 | 1 | 59.9 |
| ApexCharts | 20 | 3857 | 228 | 23 | 204 | 30.8 |
| Recharts | 23 | 139 | 261 | 15 | 1 | 60 |
| Nivo | 29 | 785 | 364 | 19 | 1 | 60 |

## WebKit (Playwright's build)

Mount: the frame the chart is made in (ms). Update: from the change to its drawn frame (ms). Drag: dropped frames out of 240.

| Library | 20 bars | 1,000 bars | 50 charts | Update | Drag: dropped frames | Drag: fps |
|---|---:|---:|---:|---:|---:|---:|
| Plain DOM | 2.0 | 25 | 9.0 | 3.0 | 1 | 59.8 |
| D3 | 5.0 | 22 | 17 | 3.0 | 0 | 59.9 |
| Charts.css | 4.0 | 50 | 18 | 3.0 | 0 | 60 |
| Observable Plot | 9.0 | 29 | 32 | 8.0 | 1 | 59.7 |
| Chart.js | 9.0 | 24 | 44 | 17 | 1 | 59.5 |
| rhp (static) | 9.0 | 92 | 54 | 10 | 1 | 59.7 |
| rhp (JS) | 10 | 90 | 55 | 2.0 | 0 | 59.9 |
| rhp (CSS) | 9.0 | 93 | 57 | 3.0 | 1 | 59.8 |
| Victory | 19 | 132 | 72 | 7.0 | 1 | 59.7 |
| ECharts | 24 | 52 | 78 | 8.0 | 0 | 59.9 |
| Nivo | 21 | 310 | 135 | 16 | 0 | 59.9 |
| Recharts | 27 | 148 | 165 | 12 | 1 | 59.6 |
| ApexCharts | 27 | 4933 | 289 | 25 | 165 | 37.8 |
