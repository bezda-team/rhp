# Results

Machine: Apple M5 MacBook Air, macOS 26, in use during the run (another project's study, VS Code, Chrome).
How it was measured: [README.md](README.md).
Smaller times, bundle sizes, memory use and dropped-frame counts are better.

## Size

A bar chart app, minified and gzipped, in kB.

| Library | Total | Without React or Solid |
|---|---:|---:|
| Plain DOM | 0.4 | 0.4 |
| rhp (JS) | 29.1 | 19.7 |
| rhp (CSS) | 29.1 | 19.7 |
| rhp-react (CSS) | 92.6 | 22.4 |
| rhp-react (JS) | 92.6 | 22.4 |
| Victory | 148.0 | 78.7 |
| Nivo | 159.8 | 90.7 |
| Recharts | 164.2 | 95.9 |

## Chromium (Playwright's build, headless)

Browser: 153.0.8010.12.
Started: 2026-11-12T07:06:33.548Z.
Completed: 2026-11-12T07:13:56.177Z.
Libraries: 8.

### Mount (ms)

"Frame" is the frame the chart is made in.
"Total" is all main-thread time in the second after, with deferred drawing and entry animations.

| Library | 20 bars: frame | total | 1,000 bars: frame | total | 50 charts: frame | total |
|---|---:|---:|---:|---:|---:|---:|
| Plain DOM | 4.4 | 5.9 | 21 | 26 | 6.9 | 8.6 |
| rhp (JS) | 15 | 17 | 53 | 54 | 29 | 31 |
| rhp (CSS) | 15 | 17 | 53 | 55 | 37 | 39 |
| rhp-react (CSS) | 16 | 17 | 55 | 56 | 40 | 41 |
| rhp-react (JS) | 16 | 18 | 55 | 57 | 40 | 41 |
| Victory | 20 | 22 | 104 | 105 | 63 | 65 |
| Nivo | 25 | 77 | 249 | 750 | 116 | 334 |
| Recharts | 26 | 49 | 114 | 556 | 145 | 380 |

### Updates

One value changes.
Latency: until its frame is drawn.
Main thread: all work for the change, animation frames included.
Drag: one value changes every frame for 240 frames.

| Library | Latency (ms) | Main thread per change (ms) | Drag: main thread per frame (ms) | Drag: dropped frames | Drag, CPU 4x slower: dropped frames |
|---|---:|---:|---:|---:|---:|
| Plain DOM | 1.3 | 1.4 | 0.5 | 0 | 0 |
| rhp (JS) | 0.3 | 3.9 | 0.7 | 0 | 0 |
| Victory | 6.5 | 6.2 | 3.1 | 0 | 1 |
| rhp-react (CSS) | 2.4 | 7.2 | 1.2 | 0 | 0 |
| rhp (CSS) | 2.3 | 8.2 | 1.4 | 0 | 0 |
| rhp-react (JS) | 1.5 | 13 | 1.3 | 0 | 0 |
| Nivo | 9.1 | 30 | 3.8 | 0 | 0 |
| Recharts | 10 | 56 | 4.0 | 0 | 1 |

### Memory

What the 50-chart dashboard adds.

| Library | JS heap (MB) | DOM nodes |
|---|---:|---:|
| Plain DOM | 0.1 | 2150 |
| rhp-react (CSS) | 2.8 | 3302 |
| rhp (CSS) | 3.0 | 3373 |
| rhp-react (JS) | 3.0 | 3302 |
| rhp (JS) | 3.1 | 3373 |
| Victory | 5.4 | 4352 |
| Nivo | 21.8 | 5900 |
| Recharts | 28.9 | 6552 |
