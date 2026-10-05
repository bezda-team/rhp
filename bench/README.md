# rhp against other chart libraries

Every library draws the same chart: a horizontal bar chart with a name and a value per bar, on a fixed 0 to 100 scale, 600px wide.
Each one is written the way its own docs suggest, with its default settings, including its default animation.

| Library | Draws with | Animation by default |
|---|---|---|
| rhp, CSS version | HTML and CSS | CSS transitions, 150 ms |
| rhp, JS version | HTML and CSS | JS, 150 ms |
| rhp, static | HTML and CSS, rows drawn once | none: a change draws the rows again |
| Plain DOM | divs, widths set by hand | none (the floor) |
| Charts.css | an HTML table and CSS | none |
| D3, by hand | SVG | a 150 ms transition, as rhp |
| Observable Plot | SVG, drawn again on each change | none |
| Chart.js | canvas | 1000 ms |
| ECharts | canvas | 300 ms |
| ApexCharts | SVG | 350 ms |
| Recharts (React) | SVG | 400 ms |
| Nivo (React) | SVG | spring |
| Victory (React) | SVG | none |
| Highcharts | SVG | its default |
| AntV G2 | canvas (AntV G) | its default |
| Vega-Lite (vega-embed) | canvas, compiled and drawn asynchronously | none |

The adapters are in `libs/`, one file each.
The React libraries render with `flushSync`, so an update is drawn in the frame it is made, like the others.

## What is measured

- **Mount:** one chart of 20 bars, one of 1,000 bars (8px each), and a dashboard of 50 charts of 7 bars. The chart is made at the start of a frame; the time is that frame's work, from the call until the frame is drawn. Chrome also reports all main-thread time in the second after, which includes drawing a library defers to later frames and its entry animation. Median of 10 runs (5 for the large chart and the dashboard), a fresh page each.
- **Update:** one value changes, 20 times, 700 ms apart. Latency is the time from the change to its frame being drawn. In Chrome, main-thread time per change includes every animation frame that follows.
- **Drag:** one value changes in every frame for 240 frames, as when a slider is dragged. Frame gaps show dropped frames, and in Chrome, main-thread time per frame. Chrome runs it again with the CPU slowed 4x, like a mid-range phone; there only dropped frames count, because Chrome's time counters don't scale with the slowdown.
- **Size:** the adapter bundled and minified, then gzipped: what an app ships for this chart. "Without framework" leaves out React or Solid.
- **Memory:** in Chrome, the JS heap and the number of DOM nodes the 50-chart dashboard adds, after garbage collection.

## Running it

```sh
cd bench
npm install
npm run build              # out/: one page per library, and out/sizes.json
node run.mjs chrome        # or firefox, webkit, safari; writes results/<browser>.json
node run.mjs chrome rhp-css,d3   # only some libraries
npm run report             # RESULTS.md from results/ and out/sizes.json
```

`chrome` runs the installed Chrome, headed, through Playwright; `chromium` runs Playwright's Chromium headless (with `BENCH_BROWSER=<path>` for a build already on the machine), for a machine without Chrome such as a Linux container; `firefox` and `webkit` run Playwright's builds.
`BENCH_RESULTS=<folder>` writes the results to another folder, and `BENCH_RESULTS=<folder> BENCH_OUT=<file> BENCH_MACHINE=<text> npm run report` writes a separate results page from them.
`safari` runs the real Safari through `safaridriver` (enable it once with `safaridriver --enable`, and allow remote automation in Safari's Develop menu).
Close other apps while it runs: timings are only as steady as the machine.

## Scale: scatter plots and lines with many points

`scale.mjs` draws one chart of many points in each library of `scale/`: a scatter plot of 1,000 and 10,000 dots, and a line of 1,000 and 100,000 points, with each library's defaults (rhp's charts are `static`, as its docs say for data that never changes).
It reports the frame the chart is made in, all main-thread time in the 2 seconds after, and the DOM elements it adds, the median of 5 fresh pages.

```sh
node scale.mjs build                       # out-scale/: one page per library
node scale.mjs run                         # Chromium; BENCH_BROWSER and BENCH_RESULTS as above; writes <results>/scale.json
```

An rhp scatter plot is one slat per point, each an HTML element, so its cost grows with the points the way the DOM's does; a Line is one SVG path, whatever its length.
