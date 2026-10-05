# Choosing the form: data, story, slat and recipe

Use this file in step 3 of the workflow, after the brief.
It goes from what the reader should see, to the form, to the slat that draws it, to the recipe to start from.
When the user named a form ("a donut", "a gantt"), use it, and start at the recipe catalog below.

## Contents

- Start from the reader's question
- The compositions rhp charts are made of
- The recipe catalog
- Orientation, size and phones
- Combining recipes
- What rhp does not draw, and the closest answer

## Start from the reader's question

Write the one question the chart answers before you pick a form.
The headline will be its answer.

| The reader wants to... | Data | Form | Recipe |
|---|---|---|---|
| see which is biggest, in order | one value per item | ranked horizontal bars | `bar` |
| compare a few periods or categories | one value per period | columns | `column` |
| see a ranking with a reference value | one value per item and a reference | lollipop with a baseline | `lollipop` |
| compare two to four values per item | a few values per item, same unit | grouped bars | `grouped-bars` |
| see totals and what they are made of | parts per item that add up | stacked bars | `stacked-bars` |
| compare how each whole splits | parts per item, as shares | 100% stacked bars | `stacked-100` |
| see two sides of zero (agree and disagree, gain and loss) | values above and below zero | diverging bars | `diverging-bars` |
| follow how one amount becomes another | a start, changes, an end | waterfall | `waterfall` |
| see a few parts of one whole | two to six parts | donut | `donut` |
| count out of 100 people or units | counts or shares of a population | waffle | `waffle` |
| see progress toward goals | a share of a target per goal | radial bars, or bullets | `radial-bars`, `bullet` |
| see actual against target | actual, target, quality bands | bullet | `bullet` |
| follow one measure over time | a value per date | line | `line` |
| compare a few measures over time | a value per date per series | multi-line | `multi-line` |
| see a quantity's volume over time | a value per hour or day | area | `area` |
| see change between two dates per item | two values per item | slope | `slope` |
| see the gap between two values per item | two values per item | dumbbell | `dumbbell` |
| see many small trends at a glance | a short series per item | sparklines in slats | `sparklines` |
| watch a ranking reshuffle over time | one value per item per step | a bar chart race | `race` |
| follow values that keep arriving | a feed of readings per item | a live board | `live` |
| see how one measure is spread | many samples | histogram | `histogram` |
| compare spreads of a few groups, summarized | samples per group | box plot | `box-plot` |
| compare full distributions of a few groups | samples per group | violin | `violin` |
| see every value of a few groups | samples per group, tens per group | strip plot | `strip` |
| see how two measures relate | two values per item | scatter | `scatter` |
| see two measures and a size | three values per item | bubble | `bubble` |
| see a value over two categories | a grid of values (day by hour) | heatmap | `heatmap` |
| see two groups across ordered bands | two values per band | pyramid | `pyramid` |
| see a schedule and its progress | tasks with start, end, progress | gantt | `gantt` |
| follow prices with their range | open, high, low, close per day | candlestick | `candlestick` |

If two forms fit, prefer the one whose marks the reader compares by length from a shared baseline (bars, columns, lollipops): length is read most precisely.
Use a donut only for two to six parts with one or two of them the story; otherwise use stacked or ranked bars.

## The compositions rhp charts are made of

Every rhp chart is one or more Plots of slats inside a Chart.
These are the patterns the recipes use; recognizing them lets you build a chart no recipe has.

1. **One value per slat**: an edge Label for the name, a Bar from 0 (or `from`) to the value, a value Label at its end.
   Recipes: `bar`, `column`, `lollipop` (a thin Bar and a Dot), `histogram`, `waterfall` (Bars from the running total before to the one after).
2. **Several values on one slat, same scale**: several blocks in the same slat, each at its own value.
   Recipes: `dumbbell` (two Dots and the Bar between them), `bullet` (band Bars, the actual Bar, a target Tick), `box-plot` (Bars for whiskers and box, Ticks for the median), `candlestick` (a thin Bar for the wick, a wide one for the body), `gantt` (planned, done and late Bars), `pyramid` (a Bar to each side of zero).
3. **Parts of each slat**: a Plot inside the slat, one inner slat per part.
   An `overlap` inner Plot puts the parts in one band, which makes a stack (`stacked-bars`, `stacked-100`, with `stackUp()` and `shares()`); an inner Plot without `overlap` lays the parts side by side across the band (`grouped-bars`).
4. **A grid**: a Plot of Cells inside each slat, one Cell per column of the grid.
   Recipes: `heatmap` (days by hours), `waffle` (ten slats of ten people).
5. **Points on two axes**: `cross={[min, max]}` on the Chart adds a second axis across the slats; an `overlap` Plot's slats then share the whole plot, and a Dot or Label takes `at` (along the scale) and `cross` (across it), a Line takes `[x, y]` points.
   Recipes: `scatter`, `bubble` (Dot size from a value), `line`, `multi-line`, `area` (a filled Line), `slope` (a Line of two points per item).
6. **Every value of a group in its band**: an `overlap` Plot of Dots inside each group's slat.
   Recipe: `strip`.
7. **A distribution's outline**: an Area from `density()` points, `mirror` for violins.
   Recipe: `violin`.
8. **Layers over the slats**: an overlay Plot drawn over the others with `style=${{ "pointer-events": "none" }}` and `room: {}` on its slat type: a crosshair, a today line, a baseline, outliers.
   Recipes: `candlestick` and `multi-line` (crosshairs), `gantt` (today), `lollipop` (the baseline), `box-plot` (outliers).
9. **A scale drawn your own way**: a `Scale` in the Chart, a Plot of ticks with `d.at`, `d.next`, `d.first`, `d.last`.
   Recipes: `gantt` (weeks), `line` and `multi-line` (decades), `scatter` and `bubble` (log scales), `area` (hours), `slope` (the two dates).
10. **Shapes drawn from Bars**: the slat's CSS gives a Bar a new box, and the Bar draws a wedge or an arc from its values.
    Recipes: `donut` (an SVG wedge inside each Bar, from `stackUp()` of `shares()`), `radial-bars` (rings drawn in CSS from the Bar's `--rhp-hi`).
    Start from these recipes; the CSS is the hard part.

Inside any slat, add ordinary elements where the story needs them: an icon or a flag in the name Label, a note beside the highlighted slat, a small image in a Place.

## The recipe catalog

Each recipe is a complete page in `recipes/<name>.html` with a designed poster, fixed data and one interaction.
The interaction listed is the recipe's; interaction.md has the others.

| Recipe | Shows | Composition | Interaction |
|---|---|---|---|
| `bar` | ranked categories, long names, the top one highlighted | 1 | readout on hover, focus and tap |
| `column` | values over twelve months, a season marked | 1, vertical | a scrub with a running total |
| `grouped-bars` | two values per category | 3 (side by side) | sort switch |
| `stacked-bars` | totals made of parts | 3 (stack) | a key that moves one part to the start and ranks by it |
| `stacked-100` | shares of each whole | 3 (stack of shares) | a key that lights one part in every bar |
| `diverging-bars` | survey answers either side of zero | 2 (Bars to both sides) | a switch between questions |
| `waterfall` | a profit bridge | 1 (Bars between running totals) | a switch between periods |
| `lollipop` | ranked prices against a reference | 1 + 8 | a switch between values and differences |
| `bullet` | actual against target with bands | 2 | sort by value or by share of target |
| `donut` | a few parts of one whole | 10 | the slice read out in place |
| `radial-bars` | progress on five goals | 10 | a day switch |
| `waffle` | 100 people by group | 4 | a picker that lights related units |
| `heatmap` | a value by weekday and hour | 4 | readout of a cell; turns on phones |
| `line` | one series over time | 5 + 9 | a callout that follows pointer, tap and arrow keys |
| `multi-line` | several series over time | 5 + 8 + 9 | a crosshair with every series' value |
| `area` | one quantity over a day | 5 + 9 | a switch between two days, the other kept as a thin line |
| `scatter` | two measures per item | 5 + 9 | readout of the nearest point |
| `bubble` | two measures and a size | 5 + 9 | readout of the bubble under the pointer |
| `slope` | change between two dates | 5 + 9 | the line nearest the pointer picked out |
| `dumbbell` | two values per item and the gap | 2 | re-sort by level or by change |
| `histogram` | one measure's spread | 1, vertical, `bins()` | readout of a bin and the share ahead of it |
| `box-plot` | spreads of groups, summarized | 2 + 8, `summary()` | readout of a group |
| `violin` | full distributions of groups | 7, `density()` | a switch that morphs the shapes |
| `strip` | every value of a few groups | 6 | readout of a dot |
| `pyramid` | two sides of a population by age | 2 | an age picked lights everyone that age or older |
| `gantt` | tasks over weeks, progress, today | 2 + 8 + 9 | readout of a task and its dependencies |
| `candlestick` | daily open, high, low, close | 2 + 8 | a crosshair and price readout |
| `sparklines` | a table of trends, one per slat, each scaled to itself | 1 + a Line in each slat + 8 | a year scrubber (pointer, tap, drag; a keyboard slider) |
| `race` | a ranking that reshuffles step by step, played over time | 1, JS motion, the scale following the leader | play and pause, a year slider, a readout |
| `live` | values arriving from a feed, each slat with its last minute scrolling | 1 + a Line from one animated `now` | pause and resume, a readout |

Adapting a recipe:

- **More or fewer slats**: a horizontal chart grows with its slats (`thickness`); keep 18px or more per slat for a name, 28px or more for a name and a value. Over about 30 rows, show the top ones and say so in the dek, or switch to a form that summarizes (a histogram, a box plot).
- **Negative values**: give the scale a min below 0 (`nice(min, max)`), and put value Labels for negative bars on the other side (`side="before"`).
- **Long names**: room in px for the longest, or `max-width` with an ellipsis, or wrap; on phones consider the other orientation.
- **More series**: grouped bars stay readable to four series; stacks to five or six parts; lines to five or six series, with direct labels at the line ends. Beyond that, highlight one or two and mute the rest, or split into small multiples (a Plot inside each slat).
- **Other units**: change `format` and the value Labels with `Intl.NumberFormat`, and the units in the headline, dek or axis.

## Orientation, size and phones

- **Horizontal** (the default): rankings, long names, many items. Names sit in the start room, values at the bar ends.
- **Vertical**: time periods and short category names, up to about 24 columns on a desktop and 12 on a phone. Give it a `height` (240px by default is usually too short for a poster: 300 to 420px).
- **Two axes** (`cross`): time series, scatter and bubble charts. Give the Chart a `height` that suits the data's spread (260 to 420px).
- **Phones (390px wide)**: everything must still fit. Shorten or wrap names, drop a secondary label, use fewer ticks, or switch orientation with a `matchMedia` signal (the `heatmap` recipe turns its grid on phones; `column` keeps months short).

## Combining recipes

When the story needs a slat no recipe has, take each part from the recipe that has it.

- **A table of trends with a target or a rank**: `sparklines` plus a Tick for the target from `bullet`, or `order=${sortBy("latest", "desc")}` from `bar` (a Line in a slat without `cross` is scaled to its own slat; give `peak` to compare slats).
- **Ranked bars with a target**: `bar` plus the target Tick from `bullet`.
- **A ranking that changes over time** (a bar chart race): start from `race`, which moves by the JS version because its data changes without pause.
- **A tile grid map** (states or countries as cells laid out like a map): a Plot of rows, each slat a Plot of Cells (the `heatmap` composition), with empty cells where there is no state.

## What rhp does not draw, and the closest answer

Say plainly in your brief when a request is outside rhp, then build the closest rhp answer and say why in the handoff.

| Asked for | Closest rhp answer |
|---|---|
| a geographic map (choropleth) | a tile grid map (each region a Cell placed in a grid that echoes the map), or ranked bars of the regions |
| a network or a flow diagram (sankey) | stacked bars of what goes where, or a matrix heatmap of from-to pairs |
| a treemap or a sunburst | a waffle for shares, or stacked bars for parts of parts |
| a radar (spider) chart | a dot plot or grouped bars across the same axes |
| a 3D chart | the 2D form of the same data |
| a word cloud | ranked bars of the words |
| a free-form drawing or an image | Place blocks to position your own elements, or an image next to the chart |
