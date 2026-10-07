# rhp pitfalls: symptoms, causes and fixes

Use this file when a chart does not look or behave as it should, or when the checker reports a finding you do not understand.
Find the symptom, then try its causes in order.
Every cause here was reproduced with rhp 2.0.1; the numbers in brackets point to the "Gotchas" list at the end of [api.md](api.md).

## Contents

- Mistakes that come from other libraries
- Nothing draws, or the chart is empty
- Bars, dots or labels in the wrong place
- Text sticks out, is cut off or overlaps
- The chart is tiny, squashed or the wrong size
- Values never update, or the chart jumps
- A click, hover, tap or key does nothing, or the wrong thing
- The layout jumps when the reader interacts
- Text and layers laid over the chart
- Styles or colors do not apply
- Console warnings rhp prints
- Mistakes in the work itself

## Mistakes that come from other libraries

rhp is not configured with an options object, and none of these exist: `<BarChart data=...>`, `<Chart type="bar">`, `series: [{ data }]`, `new Chart(ctx, config)`, `xAxis`, `yAxis`, `tooltip: { ... }`, `legend: { ... }`.
A chart is a `Chart` holding `Plot`s, each Plot draws one slat per row of data, and the slat is a function you write from blocks.
Start from a recipe, never from what another library does.

- **rhp 1 code** (`react-html-plots`, Legend-State observables, `@bezda/rhp-core`, `BarPlot`, `useObservable`): a different, retired library. Use rhp 2 only, from `@bezda/rhp@2`.
- **React JSX around rhp components** (`<Bar to={d.sold} />` inside a React component): React does not render Solid components. In React, write the chart with the `html` template from `@bezda/rhp/standalone` and mount it into an element (environments.md, React).
- **`solid-js` imported in a React, Vue or plain page** next to `@bezda/rhp/standalone`: two copies of Solid, and reactivity silently stops between them. Import everything from the standalone module.
- **`useState` or `useEffect` inside an rhp chart component**: use `createSignal`, `createMemo`, `createEffect` and `onCleanup` from the same module as rhp.
- **A tooltip library or an SVG overlay**: rhp charts are HTML. Show a readout with a signal and `Show` inside the slat, or in the poster's dek (interaction.md).

## Nothing draws, or the chart is empty

1. **The module failed to load.** An error like "does not provide an export named createSelector": the standalone module has no `Dynamic`, `Portal`, `createResource` or `ErrorBoundary`, and rhp 2.0.1 also lacks `createSelector`, `createComputed`, `on`, `mergeProps`, `splitProps`, `Switch` and `Match`, which 2.0.2 adds [28]. Return the template from a function for `Dynamic`, `render()` into the other element for `Portal`, fetch in `onMount` for `createResource`, and compare in a function (`on=${(d) => on() === d.index}`) on any version.
2. **The import map is missing or below the module script.** It must come before any `<script type="module">` and map `@bezda/rhp/standalone` to `https://cdn.jsdelivr.net/npm/@bezda/rhp@2/dist/standalone.js`.
3. **`render` got the result instead of a function.** Write ``render(() => html`<${MyChart} />`, element)``.
4. **The slat returns two elements, text, or nothing** [30]. Return one root element (`<div>`) holding the blocks.
5. **The Plot is outside a Chart** [29], or the Plot got the bare function instead of what `slat()` returned (the slat then has no CSS or layout).
6. **Data groups are empty** or the Plot has none of the names the slat reads: every slat reads `undefined` and draws at the start of the scale [16]. Check the names: `d.sold` needs a Plot prop `sold`; a list of objects goes in `rows`, not `data` [7].

## Bars, dots or labels in the wrong place

1. **The scale does not hold the data** [13]: bars are cut at the end, dots and ticks land outside the plot.
   Build it from the data: `const s = nice(Math.min(0, ...values), Math.max(0, ...values))`, then `scale=${[s.min, s.max]} ticks=${s.ticks}`.
2. **Negative values on a scale that starts at 0**: a value below the scale's min draws nothing; the scale above takes its min below 0.
   A Bar whose `to` is below its `from` runs backward.
3. **Area or Line points past the scale squeeze the whole outline** [14]: keep every x inside the scale; give `density()` a `domain` inside it.
4. **A reversed or equal scale** (`[100, 0]`, `[5, 5]`) draws nothing [15]. For bars that run the other way, use negative values and print them with `format=${(v) => Math.abs(v)}`.
5. **NaN, undefined or null** draw at the scale's start and print "NaN" [16]: clean or filter the data first.
6. **Every slat got one item of a list meant for all of them**: an array given to a Plot is a column, item i for row i. To give every slat the same list (the series still shown, a set of picked names), pass a function of the row: `shown=${(d) => shown()}`.
7. **Lists of different lengths** wrap around without an error [8]: the third slat of a 3-item list shown beside a 5-item list repeats the first values. Give every data group the same length.
8. **A Dot is an oval**: its `size` was a number [17].
   Give a length, `size="12px"`.
   `ManyDots` has a different size contract: its numbers mean pixels, so `size=${12}` is a 12px point.
9. **A vertical Plot over a horizontal chart draws 0px-tall columns**: in rhp 2.0.1, a second top-level Plot with `orientation="vertical"` in a horizontal Chart whose slat type has `room: "auto"` gets columns as wide as the chart and no height. Give the slats room in px, or put the Plot in a chart with `cross` (as the line recipe does).
10. **A scatter or line chart puts everything on one line**: with Dot slats, the Chart needs `cross=${[min, max]}`, the Plot needs `overlap=${true}`, and each Dot needs `cross=${() => d.y}`.
    The experimental [ManyDots collection](api.md#manydots-experimental-point-collection) goes directly inside a Chart with `cross` and takes its own `rows`, `at`, and `cross` accessors.

## Text sticks out, is cut off or overlaps

1. **Value labels past the bars stick out at the end**: `room.end` is too small, or a `room` you gave dropped the defaults [10]. Give every side you use, in px: `room: { start: 120, end: 56 }`.
2. **Names are cut off or stick out at the start**: give `room.start` in px, or `"auto"` with the edge Labels as direct children of the slat's root [11]; cap long names with `max-width` and an ellipsis in the slat CSS, or let them wrap.
3. **Names under a vertical chart end in "..."** [25]: they are as wide as their columns. Shorten them, let them wrap (`.name:vertical { white-space: normal; }`), or make the chart horizontal on phones.
4. **Axis numbers stick out** [12]: the axis has fixed room, so keep `format` short ("1.2M", not "1,200,000 people").
5. **Labels of neighboring slats overlap**: the slats are too thin for their text. Raise `thickness`, shorten the labels, show fewer of them (only the highlighted slat, or every other one), or turn the chart.
6. **A label overlaps its own bar's end**: give the slat CSS `--rhp-label-gap` (the space between a Label and its value).
7. **The value label of the longest bar runs into the next column or out of the chart**: leave headroom on the scale (build it from about 1.1 times the largest value with `nice()`), or give `room.end` its width.
8. **Wide numbers on a cross axis stick out on the left**: the cross axis gets 42px for its numbers; numbers such as 30,000 need the slat type's `room.start` at about 48px.
9. **A value Label over the last column of a vertical chart sticks out**: give `room.after` half the label's width.
10. **Text overlaps on a phone only**: test at 390px. Use a media query or a container query on the page for the poster, and `:vertical` / `:horizontal` rules for the slat.
11. **Two words run together in a readout** ("All regions12") [35]: Solid's html template drops a space that stands alone between two tags. Write it as `${" "}`.
12. **The first or last name under a column sticks out of the chart**: a label centered under its column with `translate: -50%` runs past the plot's ends.
    Align the first one's start and the last one's end with the plot, or give `room.before` and `room.after` half its width.
13. **Axis numbers run together at 320px**: the names' and the values' room leave a narrow plot.
    Give the Chart fewer ticks when the window is narrow (`ticks=${() => (narrow() ? every(10) : every(5))}`, with `narrow` a signal from `matchMedia("(max-width: 400px)")`), shorter numbers, or less room.
14. **Small parts lose their names**: hiding a label that does not fit is never the only fallback.
    Put it outside its mark with a short leader, or in a key beside the chart in the marks' order; on a phone use short codes before dropping names (design.md section 7).

## The chart is tiny, squashed or the wrong size

1. **It is 148px wide with an empty plot** [24]: it sits in a flex row, an `inline-block`, a float or a `fit-content` box. Give its wrapper `flex: 1; min-width: 0`, or a width.
2. **A vertical chart is a flat strip**: it is 240px tall by default; set `height`.
3. **A horizontal chart's slats are 32px thick and the chart is too tall or too short**: set `thickness` on the slat type, or `height` on the Chart to make slats share it.
4. **The chart keeps a shape on every screen**: `aspect` on the Chart keeps width over height, and ignores `height` (rhp warns).

## Values never update, or the chart jumps

1. **`${d.sold}` was read once** [3]: wrap it, `${() => d.sold}`; never destructure `d`.
2. **The Plot got a signal's value once**: pass the accessor (`sold=${sold}`) or a function (`sold=${() => data().sold}`), not `sold=${sold()}` at the top of a component that runs once.
3. **The Chart is `static`** [33]: a static chart ignores signals other than its data. Remove `static` from interactive charts.
4. **Slats swap data when rows are removed**: give the Plot a `key` (`key="city"`).
5. **Blocks jump to new values instead of moving** [22]: a `transition` on a block replaces rhp's own. Put your transition on an element inside the block.
6. **Numbers show long decimals while they move** [26]: in the JS version (`animate`) values are fractional mid-way; round what you print.
7. **Bars vanish, or a slat jumps to the first place, after the data changes** [4]: a `style` given as a string that changed (or turned to nothing) replaced the variables rhp keeps in the element's style.
   Give a slat root's changing style as an object: `style=${() => ({ "--n": d.n })}`.
   Blocks need the same workaround on published rhp 2.0.2; current source fixes Block style replacements for the upcoming 2.0.3 release.
8. **`animate` is on, but a value still jumps**: the JS version never moves a group given as a function of the row (`v=${(d) => ...}`). Give the changing numbers as a list (`v=${() => values()}`), a single value or a field of `rows`.
9. **A race stops at each step, or a live feed's marks stop between readings**: to play back data you have, never step through it with a timer; move a playhead on every frame, give the Plot the values interpolated between the steps around it, and keep the JS version's default 150 ms, so the marks glide and Pause leaves them between steps (interaction.md section 10). For a live feed, whose next value is not known yet, ease linear into each new reading over a little more than one interval (`ease: "linear"`, 1.5 intervals); with ease-out or a shorter duration the marks rest between readings.
10. **Marks trail behind data that changes rapidly or continuously** (a live feed, a slider or drag that drives the data, a play button, a bar chart race): in the default CSS version every new value restarts a CSS transition from wherever the mark is, so under steady change the marks always lag, and Safari can stall transitions that input events retarget. Give the Plot `animate` for the data groups that change (`animate=${["value"]}`, or `animate=${true}`), or the Chart when the scale moves with the data: rhp's JS clock carries each move into the next value. Measured with a slider changing the data every frame: the CSS version trailed the data by 10 points of 100, the JS version by 6.

## A click, hover, tap or key does nothing, or the wrong thing

1. **A handler on a component has no parameter** [2]: `onClick=${() => pick()}` runs while drawing and is never attached. Write `onClick=${(e) => pick()}`. This holds for blocks and the Poster; plain elements are fine, and the Chart takes no handler at all (next item).
2. **The handler is on the Chart** [6]: the Chart drops handlers, `data-*` and `title`. Put them on the Poster or a wrapper element.
3. **A bare boolean** [1]: `<${Plot} keyboard>` passes an empty string, which is false. Write `keyboard=${true}` (also `overlap`, `static`, `animate`, `mirror`, `fill`, `smooth`).
4. **An overlay Plot covers the slats under it**: give it `style=${{ "pointer-events": "none" }}` (an object: a string is dropped on Chart and Plot [4]).
5. **The row is lost**: put `data-row=${() => d.index}` on the slat's root and find it with `e.target.closest("[data-row]")` from one handler on the poster.
6. **A scroll on a phone changes the pick, or the readout flickers between slats**: the pick runs on `pointerdown` or on a finger's `pointermove` (every scroll starts with both), or it clears when the pointer is on no slat.
   Pick on `pointermove` only for a mouse or a pen (`e.pointerType !== "touch"`), on `click` for a tap or a click, and on `focusin` for the keyboard; leave the pick as it is on no slat, and clear it on `pointerleave` and `focusout` (interaction.md, section 2).
7. **The keyboard cannot reach it**: add `keyboard=${true}` to the Plot whose slats are interactive, and handle `focusin` like `pointermove`.
8. **A focus handler throws on some elements**: `e.target.closest("[data-row]")` can return null; check it before reading `dataset`.
9. **The chart vanished for screen readers**: `role="slider"` makes everything inside it presentational, so it must never wrap the chart; put it on its own element.
10. **A slider has no name for screen readers**: an `<output>` inside the `<label>` takes the label from the input, because an output is labelable too. Show the value in a `<span>` or `<b>` with `aria-hidden="true"` and give the input `aria-valuetext`.

## The layout jumps when the reader interacts

The checker warns (`layout-jump`) when a control or the chart moves after one of its interactions; these are the usual causes. It tries only some controls, so try every one yourself and compare.

1. **Text that changes with a switch moves the controls below it** (a headline or a dek per question): stack every version in one grid cell (a wrapper with `display: grid`, each version at `grid-area: 1 / 1`, `visibility: hidden` except the current one), so the cell is always as tall as the longest version.
   Align the versions to the cell's end (`align-self: end`) when the chart is below them, so a short version leaves no empty line above the chart.
2. **A readout that wraps on a phone pushes the chart down**: give it a `min-height` for its longest text at 320px (`min-height: 2lh`, or `3lh`), counting the longest numbers and dates that gain a year ("Jan 4, 2027").
3. **Numbers that change width shift what follows them**: use `font-variant-numeric: tabular-nums`, and give a column of numbers a fixed room; in an "auto" end room, align them across slats with `justify-self: stretch` and `justify-content: flex-end` on the label.
4. **Every bar slides when a slat is lit**: the lit name turns bold in a `room.start` of "auto", which measures the widest name again and moves the plot.
   Change only the lit name's color, or keep its bold width at rest: room in px, or the bold text drawn hidden under the name (`.name::after { content: attr(data-name); display: block; height: 0; overflow: hidden; visibility: hidden; font-weight: 700; }`, with `data-name=${() => d.name}` on the Label; measured: the bars held still at 1280px, where a plain bold name moved them 10.8px).
5. **A button whose text changes (Play, Pause) moves its neighbors**: stack both texts in one grid cell, the hidden one `visibility: hidden`, so the button is always as wide as the longer one.

## Text and layers laid over the chart

A bold composition sets a headline, a picture or a key over the plot's empty part.
These are the traps it brings.

1. **A focus ring strikes through the text laid over the plot**: an outline on the slat's root runs the whole length of the plot.
   Draw the ring on the mark instead: `.slat:focus-visible { outline: none; }` and `.slat:focus-visible .bar { outline: 2px solid var(--rhp-ink); outline-offset: 2px; }`, with `class="bar"` on the Bar.
   A mark that wears a `shape()` or a mask shows no outline, because both cut it away: ring the slat's name instead (`.slat:focus-visible .name { outline: 2px solid var(--rhp-ink); outline-offset: 3px; }`), as `silhouettes` does.
   Never take the slat's ring away without drawing another.
2. **Gridlines run through the value labels**: a label just past a bar's end sits on the next gridline when the value is near a tick.
   Give the number the paper as its background, on a span inside the Label so the Label keeps the gap rhp gives it (its own padding): `<${Label} at=${() => d.v} class="value"><span class="num">${() => d.v}</span><//>`, with `.num { margin: 0 -3px; padding: 0 3px; background: var(--rhp-surface); }` in the slat's css.
   The grid is drawn under the slats, so the line stops at the text.
   The theme's `surface` must be the paper (`surface: "var(--paper)"`; it is white by default), and the box suits a flat paper only: over a grain or a texture it shows as a patch.
   Not next to a reference line, which stays whole (design.md section 7).
3. **Taps on the marks pick nothing**: a layer laid over the chart (a picture, a glow, a caption box) takes every pointer event when it is drawn above rhp's plot (`z-index: 1`): at `z-index: 2` or more, or at 1 after the Plot in the page.
   Give it `pointer-events: none`.
   What the reader presses must be the slat or an element inside it: a mark that takes no pointer events sends the press to the chart under it, which cannot take focus, so the focused slat loses focus and the pick clears.
   Give the mark `pointer-events: auto` (`donut`), or, when the chart picks by the pointer's place, put `onMouseDown=${(e) => e.preventDefault()}` on the element under the marks (`dial`).
4. **The text laid over the plot runs into the marks with other data**: its place was set by hand (a fixed `top`, a share of the width) for these values.
   Set it for your data, then check a copy whose values all sit near the largest, so the plot has no empty part, at every width, and look at the screenshots: the checker reports words over value labels, not words over bare marks.
   Where the words meet a mark, set them above the chart at that width.

## Styles or colors do not apply

1. **Page CSS aimed at bars, labels or the axis** [21]: it cannot change their color, background, font, border, radius, shadow, padding or transition, even with `!important`. Move those rules into the slat type's `css`.
2. **`className`** [5]: on a block it replaces rhp's class and the block vanishes. Use `class`.
3. **The chart ignores the page's font or colors** [20]: give them in the Chart's `theme` (`font`, `ink`, `muted`, `grid`, `series`, ...).
4. **`var(--brand)` as a color warns** [20]: put the brand colors in the theme instead.
5. **Rows 5 and 6 take the first series color** [18]: `series()` counts six colors; with a shorter theme list call `series(n)`.
6. **A value label does not take its bar's color** [19]: set `--rhp-color` on the slat's root in a style object (and leave `color` off the Bar), or color the label itself.
7. **The poster looks unstyled** [31]: the Poster brings no CSS. Style `.poster`, `figcaption`, `.kicker`, `.headline`, `.dek` and `.note` in the page.
8. **Focus rings on slats do not show your style** [22]: rhp's core CSS resets `outline` on slat roots, so a page `:focus-visible` rule never reaches them. Put `.slat:focus-visible { ... }` in the slat type's `css`.
9. **The poster's styles do not apply inside a framework component**: scoped component styles (Vue `scoped`, Svelte, Astro, Angular's emulated encapsulation) never reach elements rhp makes. Use a plain CSS file; environments.md section 14 has every framework's verified caveats.
10. **Padding on the chart's element does nothing**: rhp's room owns it. Pad a wrapper instead.
11. **A white label is unreadable on some segments**: a label needs 4.5:1 on each segment's color. Darkening a segment can break the color-blind check against its neighbor, so switch that label to the ink color instead.
12. **A transition on the slat's root does nothing** [22]: rhp keeps the root's own transition (its slide). Transition an element inside a block instead.
13. **A rule in the slat's CSS matches nothing**: the class is on a different element than you think. Classes you put on blocks go on the block's own element (`.rhp-bar.bar`); `:horizontal` and `:vertical` go on the slat or a block, not on an element inside a block.
14. **A pinned readout or a menu over the chart is drawn under the bars** [36]: give it `z-index: 2` or more.
15. **The marks are invisible when the component is shown on its own**: its theme reads the app's variables with no fallback (`series: ["var(--chart-1)", …]`), so on a page without the app's CSS (the checker's page, a test, Storybook) every mark is transparent.
    Give each a fallback with the app's own value: `"var(--chart-1, oklch(0.646 0.222 41.116))"` (design.md section 8).

## Console warnings rhp prints

Each is worth fixing [34]:

| Warning starts with | Fix |
|---|---|
| "a Bar is a slat's root here" (or Dot, Label...) | wrap the block in an element: ``(d) => html`<div><${Bar} .../></div>` `` |
| "an edge Label is inside another element" | make the edge Label a direct child of the slat's root, or give room in px |
| "aspect takes a number above 0" | `aspect=${16 / 9}` |
| "a Chart with an aspect takes its height from its width" | remove `height` |
| "a flat Chart with an aspect has rows with a thickness" | remove `thickness` from the slat type |
| "... reads a page variable; use a theme key" | put the color in the Chart's `theme` and use its key |
| "--rhp-radius takes one length" | one length, or `--rhp-start-radius` and `--rhp-end-radius` |
| "unknown ease" | a CSS name, four cubic-bezier numbers, or a function |
| "linkedCss() was called, but this page doesn't link" | link `@bezda/rhp/rhp.css`, or remove `linkedCss()` |

## Mistakes in the work itself

These are not rhp errors, but they decide whether the user gets what they asked for.

- **Dropping or changing a request**: every explicit request in the brief is in the result, exactly (their colors, their title, their sort order, "no poster"). A warning is fixed without removing a requested feature.
- **Invented numbers presented as fact**: data you supplied names its source and year, or the note says "Illustrative data".
- **A series the user did not ask for**: what is left when their parts do not reach 100% is a quiet, unlabeled remainder explained in the note, not a new series with its own color and key entry; the brief lists it under Asked as a deviation.
- **A headline that is not true for the data**: recompute every number in the headline, the dek and the note from the final data ("four in ten" was false for 52%).
- **Text computed from data that turns false on other data**: "rose ∞%" from a zero first week, "as many as" for a change from none, "held steady" because the first and last values match after a peak, "led for eight years" counted only inside the chart's window.
  SKILL.md step 6 has the rules; step 8's hardest data finds them.
- **Mixed releases**: real yearly figures taken partly from first estimates and partly from later revisions can reverse a move between two years.
  Take each year from the latest release that covers it.
- **A real name on invented numbers**: never put a real country, city, company or person on illustrative data; use real figures with their source, or plain invented names ("Riverton", "a monsoon city", "Team A") and say "invented" in the note.
- **A magazine poster dropped into an app**: inside an existing app, use the app's fonts and colors (design.md).
- **Hover-only information**: everything a hover shows also shows on focus and on tap.
- **Not looking at the phone screenshot**: most layout problems appear only at 390px.
- **Random data in a deliverable**: use fixed numbers unless the user asked for live or generated data.
