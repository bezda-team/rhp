# The customization ladder

The same chart, made seven times, each step adding one thing to the step before. Each step is its own complete HTML
page, so a reader can see what the step cost: how much code, how many of the library's own names, and how much of the
previous step had to change.

Data (the same in every step):

| name | 2024 | 2025 |
|---|---:|---:|
| Oslo | 61 | 64 |
| Lisbon | 48 | 57 |
| Vienna | 72 | 70 |
| Dublin | 39 | 45 |
| Prague | 55 | 52 |

Values are "share of commuters who walk, cycle or take transit, %". Use the 2025 column unless a step says otherwise.

## Steps

1. **basic** — A horizontal bar chart of the five cities' 2025 values, each bar labeled with its city name. Any
   default look. Scale from 0 to 100.
2. **labels** — Sort the bars from highest to lowest. Put each value as a number just past the end of its bar. Draw
   Lisbon's bar in an accent color (#c2410c) and every other bar in grey (#b8b2a7). No gridlines, no legend.
3. **editorial** — Put the chart in an editorial frame: a headline above it that states the finding ("Lisbon gained
   the most ground"), a one-sentence subtitle below the headline, and a source line under the chart
   ("Source: illustrative data"). Text in "Inter" from Google Fonts, headline in "Fraunces" (Google Fonts), page
   background #f6f3ee, text color #1f1a14, the whole frame at most 720px wide and centered.
4. **annotation** — Add a vertical reference line at 60 across the bars, with the label "EU target: 60%" at its top.
5. **phone** — On screens 480px wide or narrower, put each city's name above its bar instead of beside it, so the bars
   use the full width; nothing may overlap or be cut off at 390px.
6. **readout** — Pointing at a bar (mouse), tapping it (touch) or moving to it with the keyboard (Tab or arrow keys)
   shows a line of text above the chart: "<city>: <value>% in 2025, <+/-change> points since 2024". When nothing is
   picked, the line reads "Lisbon: 57% in 2025, +9 points since 2024".
7. **animate** — Add two buttons above the chart, "2024" and "2025". Clicking one switches every bar and its value
   label to that year's values with an animated transition (bars keep their sorted order from step 2 — sorted by the
   2025 values; do not re-sort). The readout from step 6 describes the shown year.

## Rules

- Each step is a single HTML file, `step-1-basic.html` ... `step-7-animate.html`, loading the library from jsDelivr
  (`https://cdn.jsdelivr.net/npm/...`) and fonts from Google Fonts. No build step, no other libraries.
- Write each step the way the library's own documentation does it: idiomatic, the shortest correct code, no extra
  features, no comments beyond a few section labels.
- Each step must keep everything the previous steps did.

## Step 8 (added after the first seven)

8. **pictogram** — Draw each city's value as a row of small person icons instead of a bar: one icon for every 10
   percentage points, and the last icon partly filled for the remainder (57% is five full icons and one icon filled to
   70%). Lisbon's icons are in the accent color, the others in grey; the icon is any simple person glyph you draw (an
   inline SVG or a CSS shape, no image files). Everything from steps 1 to 7 keeps working: the value labels just past
   the row, the 60% reference line, the phone layout, the readout, and the year buttons (the icons change with the
   year; a transition is welcome but not required). File: `step-8-pictogram.html`.
