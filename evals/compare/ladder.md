# The customization ladder

The same chart, made eight times, each step adding one thing to the step before.
Each step is its own complete HTML page, so a reader can see how much code it costs and how much of the previous step changes.

Data (the same in every step):

| name | 2024 | 2025 |
|---|---:|---:|
| Oslo | 61 | 64 |
| Lisbon | 48 | 57 |
| Vienna | 72 | 70 |
| Dublin | 39 | 45 |
| Prague | 55 | 52 |

Values are "share of commuters who walk, cycle or take transit, %".
Use the 2025 column unless a step says otherwise.

## Steps

1. **basic:** A horizontal bar chart of the five cities' 2025 values, each bar labeled with its city name.
   Any default look.
   Scale from 0 to 100.
2. **labels:** Sort the bars from highest to lowest.
   Put each value as a number just past the end of its bar.
   Draw Lisbon's bar in an accent color (#c2410c) and every other bar in grey (#b8b2a7).
   No gridlines, no legend.
3. **editorial:** Put the chart in an editorial frame: a headline above it that states the finding ("Lisbon gained the most ground"), a one-sentence subtitle below the headline, and a source line under the chart ("Source: illustrative data").
   Text in "Inter" from Google Fonts, headline in "Fraunces" (Google Fonts), page background #f6f3ee, text color #1f1a14, the whole frame at most 720px wide and centered.
4. **annotation:** Add a vertical reference line at 60 across the bars, with the label "EU target: 60%" at its top.
5. **phone:** On screens 480px wide or narrower, put each city's name above its bar instead of beside it, so the bars use the full width; nothing may overlap or be cut off at 390px.
6. **readout:** Pointing at a bar (mouse), tapping it (touch) or moving to it with the keyboard (Tab or arrow keys) shows a line of text above the chart: "<city>: <value>% in 2025, <+/-change> points since 2024".
   When nothing is picked, the line reads "Lisbon: 57% in 2025, +9 points since 2024".
7. **animate:** Add two buttons above the chart, "2024" and "2025".
   Clicking one switches every bar and its value label to that year's values with an animated transition.
   Bars keep their sorted order from step 2 (sorted by the 2025 values; do not re-sort).
   The readout from step 6 describes the shown year.
8. **pictogram:** Draw each city's value as a row of small person icons instead of a bar: one icon for every 10 percentage points, and the last icon partly filled for the remainder (57% is five full icons and one icon filled to 70%).
   Lisbon's icons are in the accent color, the others in grey; the icon is any simple person glyph you draw (an inline SVG, a canvas path or a CSS shape, no image files).
   Everything from steps 1 to 7 keeps working: the value labels just past the row, the 60% reference line, the phone layout, the readout, and the year buttons.
   The icons change with the year; a transition is welcome but not required in this step.

## Rules

- Each step is a single HTML file, `step-1-basic.html` through `step-8-pictogram.html`, loading the library from jsDelivr (`https://cdn.jsdelivr.net/npm/...`) and fonts from Google Fonts.
  No build step, no other libraries.
- Write each step idiomatically, using the shortest correct code, no extra features, and no comments beyond a few section labels.
- Each step must keep everything the previous steps did, except the optional pictogram animation noted above.

## Current implementations

All four libraries have all eight examples in `results/ladder/`.
The October 5 local continuation added the ApexCharts, Chart.js and D3 pictogram steps to the existing ladder; these are completed reference implementations, not new AI poster runs.
The existing Chart.js examples use its annotation and data-label plugins, an exception to the original no-other-libraries rule above.
Their implementation code is not included in the page-size count.
Every example pins its CDN dependencies: rhp 2.0.2, ApexCharts 7.8.0, Chart.js 4.5.1 with datalabels 2.2.0 and annotation 3.1.0, and D3 7.9.0.

ApexCharts draws the glyphs in a [plugin layer](https://apexcharts.com/docs/plugins/), retaining its bar chart for axes and input handling.
Chart.js uses its [drawing plugin hook](https://www.chartjs.org/docs/latest/developers/plugins.html) to paint canvas paths and clip the final glyph's fill.
D3 draws SVG glyphs; rhp uses a custom Dot slat.
The three new examples use the same person outline as the existing rhp example.

## Checking and measuring

From `evals/compare`, after installing its dependencies and a Playwright Chromium:

```sh
npm test
node harness/ladder-test.mjs results/ladder > results/ladder-interactions.json
python3 harness/ladder.py results/ladder > results/ladder.json
```

Set `RENDER_BROWSER=/path/to/chromium` to use another Chromium executable.
An optional comma-separated library list after the ladder directory limits a diagnostic run.
The checker exits nonzero for a missing example, a page error, sideways scrolling, an unreachable city readout, or a failed year switch.
It samples the readout after each pointer position and checks all five cities' values in both years.
It compares settled chart crops, with a small tolerance for rasterization, so a changed button or readout alone cannot pass the year-switch check.
These checks cover interaction and final states; they do not score design or measure the duration and smoothness of animation.
The new pictogram examples were also rendered and visually inspected at 1280px and 390px; their scan summaries are in `results/ladder-rendering.json`.
