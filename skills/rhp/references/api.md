# rhp API reference

rhp 2 (`@bezda/rhp@2`, built on SolidJS 1.9).
Every statement here was checked against rhp's source and by running it in a browser, and every code block is a complete example that runs.
The `js` examples are the module script of [the page skeleton](#a-page-with-a-chart): they draw into `<div id="chart">`.

Contents: [1 The model](#1-the-model) · [2 Imports and the html template](#2-imports-and-the-html-template) · [3 Chart](#3-chart) · [4 Plot](#4-plot) · [5 slat()](#5-slat) · [6 Blocks](#6-blocks) · [ManyDots](#manydots-experimental-point-collection) · [7 Scales and axes](#7-scales-and-axes) · [8 Theme](#8-theme) · [9 Helpers](#9-helpers) · [10 Poster](#10-poster) · [11 CSS](#11-css) · [12 Motion](#12-motion) · [13 Accessibility and interaction](#13-accessibility-and-interaction) · [14 Limits](#14-limits) · [15 Gotchas](#15-gotchas)

## 1. The model

- A **Chart** is the frame: the value scale `[min, max]`, the orientation, the axis, the theme and the size.
  It holds one or more Plots, drawn over each other on the same scale.
- A **Plot** is a stack of slats, one per row of data.
  Each Plot prop that is not a setting is a **data group**: one column of the table (`fruit` = `["Apples", "Pears"]`, `sold` = `[12, 7]`).
- A **slat** is a function of one row, `d`, that returns one element.
  It reads the row as `d.fruit` and `d.sold`, plus `d.index` (the row's number) and `d.position` (its place on screen).
  rhp places that element in its band and moves it when the order changes.
- **Blocks** inside the slat (Bar, Dot, Tick, Label, Cell, Place, Area, Line) sit at their numbers on the Chart's scale.
- **ManyDots** is an experimental bulk point collection, placed directly inside a Chart with `cross`.
  It draws one plain HTML element per valid row without a Plot, slat, or Solid computation per point.
- **Orientation** is the direction bars run.
  `"horizontal"` (the default): bars run left to right and slats stack top to bottom.
  `"vertical"`: bars run bottom to top and slats stand side by side.
  One slat draws both ways.
- The **value axis** runs along the bars, and the **band** is the strip one slat takes across it (its thickness).
  Names follow the value axis: **start** is the scale's start side (left, or bottom when vertical) and **end** its far side (right, or top).
  Along the stack, **before** is the first slat's side (top, or left) and **after** the last slat's (bottom, or right).
- The **scale** is given, never computed: every block of every Plot in the Chart uses `scale`, so it must cover the data (`nice()` rounds it).
- **One slat per row**: the longest list among the data groups and `rows` sets how many slats there are (or `slats` does).

## 2. Imports and the html template

| Import | What it is | Where |
|---|---|---|
| `@bezda/rhp` | rhp for Solid apps (peer dependency `solid-js` ^1.9) | Solid (Vite, SolidStart), Astro islands: JSX |
| `@bezda/rhp/standalone` | rhp and Solid in one ES module | plain HTML (CDN and import map), React, Next.js, Vue, Svelte, Angular: html template |
| `@bezda/rhp/rhp.css` | rhp's core CSS as a file | only with `linkedCss()` (server rendering, many islands) |
| `@bezda/rhp/posters.css` | the gallery's Poster looks | optional; the kit's recipes write their own |
| `@bezda/rhp-react` | `toReact()` and everything in standalone | not on npm yet: in React apps, use `@bezda/rhp/standalone` with the small wrapper in environments.md |

Both `@bezda/rhp` and `@bezda/rhp/standalone` export rhp's whole API:

- components: `Chart`, `Plot`, `Scale`, `Axis`, `Theme`, `Poster`
- blocks: `Bar`, `Dot`, `Tick`, `Label`, `Cell`, `Place`, `Area`, `Line`
- experimental point collection: [`ManyDots`](#manydots-experimental-point-collection), in builds of this repository that export it
- functions: `slat`, `restyle`, `linkedCss`, `shape`, `at`, `useOrientation`, `series`, `cycle`, `sortBy`, `extent`, `every`, `nice`, `stackUp`, `shares`, `running`, `summary`, `bins`, `density`, `animated`, `curve`, `drawing`
- the object `THEME` (the default theme)

`@bezda/rhp/standalone` adds these from Solid, and nothing else: `render`, `html`, `createSignal`, `createMemo`, `createEffect`, `createRoot`, `createSelector`, `createComputed`, `on`, `onMount`, `onCleanup`, `batch`, `untrack`, `mergeProps`, `splitProps`, `For`, `Index`, `Show`, `Switch`, `Match`, `createStore`, `reconcile`, `produce`, `unwrap`.
`createSelector`, `createComputed`, `on`, `mergeProps`, `splitProps`, `Switch` and `Match` are there from rhp 2.0.2; 2.0.1 lacks them.
It has no `Dynamic`, `Portal`, `createResource` or `ErrorBoundary`.
Never import `solid-js` next to it: the module carries its own copy of Solid, and a signal from another copy is not tracked.

rhp adds its own CSS to the page when the first chart is drawn, so there is no stylesheet to link.

### The html template

Without a Solid build there is no JSX: charts are written with Solid's `html` tagged template.

| JSX (Solid app) | html template | Why |
|---|---|---|
| `<Bar to={d.sold} />` | `<${Bar} to=${() => d.sold} />` | a component is `<${Name}>`; a value that can change is a function |
| `<Plot …>{Fruit}</Plot>` | `<${Plot} …>${Fruit}<//>` | `<//>` closes a component (or self-close with `/>`) |
| `<Label>{d.name}</Label>` | `<${Label}>${() => d.name}<//>` | `${d.name}` is read once and never updates |
| `<Plot overlap>` | `<${Plot} overlap=${true}>` | a bare attribute passes `""`, which is false |
| `<Bar onClick={() => go()} />` | `<${Bar} onClick=${(e) => go()} />` | on a component, a function with no parameter is read as a value: it runs at render and is never attached |
| `scale={[0, 30]}` | `scale=${[0, 30]}` | numbers, arrays and objects go in `${}` |
| `style={{ "pointer-events": "none" }}` | `style=${{ "pointer-events": "none" }}` | Chart and Plot take a style object only (a string is dropped) |

The rules, in full:

1. On a component (`<${Chart}>`, `<${Plot}>`, a block, `<${Poster}>`, `<${Show}>`), every prop that is a function with no parameter is turned into a getter: `to=${() => d.sold}` is a value that follows `d.sold`.
   A signal or memo can be passed as it is: `sold=${sold}` follows the signal.
2. So a function that must stay a function needs a parameter: event handlers (`onClick=${(e) => …}`), per-row data groups (`warm=${(d) => d.temp > 15}`), `format=${(v) => v + "%"}`, `key=${(d) => d.id}`.
   The helpers `sortBy()`, `series()`, `cycle()` and `every()` already return such functions.
3. On a plain element (`<div>`, `<button>`), handlers attach normally, with or without a parameter.
4. Booleans are written out: `overlap=${true}`, `keyboard=${true}`, `static=${true}`, `animate=${true}`, `mirror=${true}`, `fill=${true}`, `smooth=${true}`.
5. A slat returns one element; whitespace around it is fine, and two elements side by side throw.
   Use a wrapper for an ordinary Plot or several blocks.
   In an `overlap` Plot or a Scale, a single block can be the root itself, with no extra wrapper.
6. Never destructure `d`: `({ sold }) => …` reads each value once.
   Read `d.sold` inside a function.
7. Use `class`, never `className`: on a block, `className` replaces rhp's class and the block is no longer drawn; on a plain element it does nothing.
8. A space between two tags is dropped: `<b>${() => d.name}</b> <em>12</em>` renders "Name12". Write it as `${" "}`, or keep it next to other text (`<b>Name</b>: <em>`).

### A page with a chart

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Fruit sold today</title>
  <script type="importmap">{ "imports": { "@bezda/rhp/standalone": "https://cdn.jsdelivr.net/npm/@bezda/rhp@2/dist/standalone.js" } }</script>
  <style>
    body { margin: 0; padding: 24px 16px; background: #fff; font-family: system-ui, sans-serif; }
    #chart { max-width: 760px; margin: 0 auto; }
  </style>
</head>
<body>
  <div id="chart"></div>
  <script type="module">
    import { Chart, Plot, Bar, Label, slat, html, render } from "@bezda/rhp/standalone";

    // Data
    const fruit = ["Apples", "Bananas", "Cherries"];
    const sold = [12, 18, 7];

    // Slat types
    const Fruit = slat({ thickness: 36 }, (d) => html`
      <div>
        <${Label} edge="start">${() => d.fruit}<//>
        <${Bar} to=${() => d.sold} />
        <${Label} at=${() => d.sold}>${() => d.sold}<//>
      </div>`);

    // Chart component
    const FruitChart = () => html`
      <${Chart} scale=${[0, 20]} label="Fruit sold today">
        <${Plot} fruit=${fruit} sold=${sold}>${Fruit}<//>
      <//>`;

    render(FruitChart, document.getElementById("chart"));
  </script>
</body>
</html>
```

The same chart in a Solid app.
In JSX, values need no `() =>`, bare booleans are true, handlers need no parameter, and Solid's own imports (`createSelector` included) come from `solid-js`.

```jsx
import { createSignal } from "solid-js";
import { Chart, Plot, Bar, Label, slat } from "@bezda/rhp";

const Fruit = slat({ thickness: 36 }, (d) => (
  <div>
    <Label edge="start">{d.fruit}</Label>
    <Bar to={d.sold} />
    <Label at={d.sold}>{d.sold}</Label>
  </div>
));

export default function FruitChart() {
  const [sold, setSold] = createSignal([12, 18, 7]);
  return (
    <>
      <button onClick={() => setSold([15, 9, 11])}>New day</button>
      <Chart scale={[0, 20]} label="Fruit sold today">
        <Plot keyboard fruit={["Apples", "Bananas", "Cherries"]} sold={sold()}>{Fruit}</Plot>
      </Chart>
    </>
  );
}
```

## 3. Chart

| Prop | Type | Default | What it does |
|---|---|---|---|
| `scale` | `[min, max]` | `[0, 100]` | the value axis. `min` must be below `max`: an equal or reversed pair draws Bars with no length and no axis. |
| `orientation` | `"horizontal"` or `"vertical"` | `"horizontal"` | the direction bars run |
| `height` | px | 240 when vertical or with `cross` | the **plot's** height (room and axis come on top). Horizontal: slats without `thickness` share it; slats with one keep theirs and `height` does nothing. |
| `aspect` | number above 0 | none | the **whole** chart's width over its height (`16 / 9`), room and axis included, at any width. `height` is then ignored (with a warning). Horizontal slats without `thickness` share the height; slats with one keep it (with a warning). |
| `ticks` | `number[]`, a count, `([min, max]) => number[]`, or `false` | about 5 round values | the axis: grid lines and numbers. A list keeps only values inside the scale. `false` draws no axis and leaves no room for it. |
| `grid` | boolean | `true` | `false` hides the value-axis grid lines while keeping the numbers and axis room. |
| `format` | `(value) => text or element` | the number as is | the text of each axis number |
| `animate` | `true` or `{ duration, ease, slide }` | off | the JS version of motion (section 12); the Plots inside take it |
| `theme` | theme object (section 8) | `THEME` | colors and font, over those of a `<Theme>` around it |
| `static` | boolean | `false` | for data that never changes: slats are drawn once and keep no signals; a data change draws them all again, without motion |
| `cross` | `[min, max]` | none | a second axis across the band (scatter plots, line charts; section 7) |
| `crossTicks`, `crossFormat` | like `ticks`, `format` | about 5, the number | the second axis |
| `crossGrid` | boolean | `true` | `false` hides only the second axis' grid lines, keeping its numbers. |
| `label` | string | none | names the chart for screen readers: the chart gets `role="figure"` and `aria-label` |
| `aria-labelledby`, `aria-describedby`, any `aria-*` | string | none | set on the chart's element; `aria-labelledby` also makes it a figure |
| `id`, `class`, `role` | string | none | set on the chart's element |
| `style` | object | none | inline style of the chart's element (a string is dropped) |
| `ref` | `(el) => …` | none | the chart's element |

A Chart passes nothing else to its element: `data-*`, `title`, `tabindex` and event handlers are dropped.
Put them on an element around the chart, or on the [Poster](#10-poster).

Children: one or more Plots (later ones drawn on top), a `Scale`, a `ManyDots` collection with a cross scale, and Solid control flow (`Show`) around them.
A Plot outside a Chart draws nothing usable: no CSS, no scale, no message.

**Size and room.** The chart's element (`.rhp-chart`) is a block as wide as its container.
Its padding is the room for names, values and axis numbers, so page CSS cannot change its padding.
What rhp gives by default (measured):

| | horizontal | vertical |
|---|---|---|
| slat thickness without `thickness` | 32px each (the chart grows with its slats); with `height` or `aspect`, they share it | the chart's width shared |
| plot height | slats × thickness | 240px, or `height` |
| room when the slat type sets no `room` | start 104px (names, left), end 44px (values, right) | start 28px (names, below), end 20px (values, above) |
| room for the axis numbers | 24px below; 14px past each end | 42px on the left; 8px past each end |
| room on any side otherwise | 2px | 2px |
| a Bar's thickness | 64% of the band (`inset` 18% on each side) | same |
| text | Labels 12px, axis numbers 11px with tabular figures, in the theme's font | same |

**aspect or height.** `aspect` keeps the chart's shape at every width (a vertical chart that should not get tall and thin on a phone).
`height` fixes the plot's height in px whatever the width.
A horizontal chart needs neither: with no `height` its slats are 32px each (or their `thickness`).

```js
import { Chart, Plot, Bar, Label, html, render } from "@bezda/rhp/standalone";

// Data: rain in mm
const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const rain = [84, 61, 58, 43, 49, 52];

// Slat types: a plain function is a slat too, with the default room
const Month = (d) => html`
  <div>
    <${Label} edge="start">${() => d.month}<//>
    <${Bar} to=${() => d.rain} />
    <${Label} at=${() => d.rain}>${() => d.rain}<//>
  </div>`;

// Chart component: vertical, 16:9 at any width
const RainChart = () => html`
  <${Chart} orientation="vertical" aspect=${16 / 9} scale=${[0, 100]} ticks=${[0, 25, 50, 75, 100]}
    label="Rain per month, in mm">
    <${Plot} month=${month} rain=${rain}>${Month}<//>
  <//>`;

render(RainChart, document.getElementById("chart"));
```

## 4. Plot

A Plot's child is the slat: a slat type from `slat()` or a plain function `(d) => element`.
Its settings:

| Setting | Type | Default | What it does |
|---|---|---|---|
| `rows` | array of objects | none | each object is a row; its fields read as `d.field`. A data group with the same name wins. |
| `key` | group name, or `(d) => id` | none | names each row, so a slat follows its row when rows are added or removed |
| `order` | `(number or null)[]`, or `(rows, current) => positions` | data order | each row's place on screen. `null` hides a row at once; ties and fractions are allowed. `sortBy()` makes the function. A function of your own gets the rows and their places on screen now (`null` for a hidden row), and runs again whenever what it reads changes (section 12 has one). |
| `reorder` | `"slide"`, `"move"`, `"refill"` | `"slide"` | slide: slats keep their place in the page and slide on screen (`aria-owns` gives the reading order). move: slats move in the page. refill: the elements stay in place and show other rows. |
| `overlap` | boolean | `false` | every slat shares one band: stacked segments, layers, strips of dots, scatter plots |
| `orientation` | `"horizontal"`, `"vertical"`, `"across"` | the Chart's or the Plot's around it | `"across"`: the other way from the Plot around it (heatmap cells) |
| `slats` | number | the longest list | the number of slats; past the data, rows repeat (lists wrap around) |
| `animate` | `true`, group names, or `{ groups, duration, ease, slide }` | the Chart's | the JS version for these data groups |
| `thick` | share of the band (`0.5`) or CSS length | `1` | inside a slat: how much of the band the Plot uses |
| `static` | boolean | the Chart's | draw the slats once (see Chart) |
| `keyboard` | boolean | `false` | the slats take focus (section 13) |
| `class` | string | none | added to `rhp-plot` on the Plot's element |
| `style` | object | none | the Plot's element (`{ "pointer-events": "none" }` for an overlay); a string is dropped |
| `ref` | `(el) => …` | none | the Plot's element |

**Data groups.** Every other prop is a data group, read in the slat as `d.<name>`:

- a list (an array or a typed array) gives item `i` to slat `i`, and a shorter list wraps around (item `i % length`);
- a single value is shared by every slat;
- a function of `d` (with a parameter) is worked out per row, can read other groups and signals, and is cached per row.

So `id`, `title`, `aria-*`, `data-*` and `onClick` on a Plot are data groups too, not attributes: put attributes on the slat's root element.
A list of objects goes in `rows`; `data=${…}` is only a group named `data`.
Data that changes is a signal, a memo or a function with no parameter: `sold=${sold}`, `rows=${() => cities()}`.
For a big list that changes one item at a time, a store (`createStore`) updates only that row's slat.
`d.index` is the row's number in the data (from 0) and `d.position` its place on screen (`null` when hidden).
A slat's `d.index` can change (with `key` when rows leave, and with `reorder="refill"`), so read it in a function: `data-row=${() => d.index}`.
Reading a name that is neither a group nor a field of `rows` gives `undefined`, without an error.

**Several Plots in one Chart** share the plot area and the scale, and later ones are drawn on top.
A Plot drawn over another takes the pointer from it: give it `style=${{ "pointer-events": "none" }}`.
A top-level Plot whose slat type sets no `room` asks for the default room (104px and 44px when horizontal), so give an overlay's slat `room: {}` when the chart's room is smaller.

**A Plot inside a slat** draws in that slat's band, on the same scale.
Without `overlap` its slats divide the band (grouped bars); with `overlap` they share it (stacked segments).
`orientation="across"` turns it, so its slats run along the value axis (one Cell per hour).
`thick` uses a part of the band.
A Plot inside a slat asks for no room, is not a list for screen readers, and does not take the Chart's `animate`.
A slat of an `overlap` Plot or a Scale may return a block itself (the stacked bars in section 9 do), including that block's own children.
Use that direct root for a single mark to avoid an extra wrapper; several blocks still need a common root.
In a Plot without `overlap`, keep the wrapper: a block as the slat's root loses part of its placing and may warn.

```js
import { Chart, Plot, Bar, Label, Tick, slat, sortBy, html, render, createSignal } from "@bezda/rhp/standalone";

// Data: rows as objects
const START = [
  { city: "City A", temp: 6 },
  { city: "City B", temp: 12 },
  { city: "City C", temp: 27 },
  { city: "City D", temp: 23 },
];

// Slat types
const City = slat({ thickness: 34, room: { start: 64, end: 48 } }, (d) => html`
  <div>
    <${Label} edge="start">${() => d.city}<//>
    <${Bar} to=${() => d.temp} color=${() => (d.warm ? "negative" : "series-1")} />
    <${Label} at=${() => d.temp}>${() => d.temp} ${() => d.unit}<//>
  </div>`);
// One line across the whole plot: an overlay Plot with one slat, asking for no room
const Mean = slat({ room: {} }, (d) => html`<${Tick} at=${() => d.mean} thick=${1} color="muted" />`);

// Chart component: rows with a key, a shared value, a per-row function, a sort that changes
const CityChart = () => {
  const [cities, setCities] = createSignal(START);
  const [dir, setDir] = createSignal("desc");
  const mean = () => cities().reduce((s, c) => s + c.temp, 0) / cities().length;
  return html`
    <div>
      <button onClick=${() => setDir(dir() === "desc" ? "asc" : "desc")}>Sort</button>
      <button onClick=${() => setCities(cities().slice(1))}>Remove the first city</button>
      <${Chart} scale=${[0, 30]}>
        <${Plot} rows=${() => cities()} key="city" unit="°C" warm=${(d) => d.temp > 15}
          order=${() => sortBy("temp", dir())}>${City}<//>
        <${Plot} overlap=${true} slats=${1} mean=${mean} style=${{ "pointer-events": "none" }}>${Mean}<//>
      <//>
    </div>`;
};

render(CityChart, document.getElementById("chart"));
```

Grouped bars, a Plot inside each slat:

```js
import { Chart, Plot, Bar, Label, slat, html, render } from "@bezda/rhp/standalone";

// Data: medals per team (gold, silver, bronze)
const team = ["North", "East", "South"];
const medals = [[12, 9, 14], [8, 15, 6], [17, 11, 9]];
const METAL = ["#c9a227", "#98a1ab", "#b8733b"];

// Slat types: a medal count is a slat of the Plot inside a team's slat
const Medal = (m) => html`<div><${Bar} to=${() => m.count} color=${() => m.color} /></div>`;
const Team = slat({ thickness: 66, room: { start: 56, end: 24 } }, (d) => html`
  <div>
    <${Label} edge="start">${() => d.team}<//>
    <${Plot} thick=${0.84} count=${() => d.medals} color=${METAL}>${Medal}<//>
  </div>`);

// Chart component
const MedalChart = () => html`
  <${Chart} scale=${[0, 20]} ticks=${[0, 5, 10, 15, 20]}>
    <${Plot} team=${team} medals=${medals}>${Team}<//>
  <//>`;

render(MedalChart, document.getElementById("chart"));
```

## 5. slat()

`slat(fn)` returns `fn` as it is.
`slat(layout, fn)` returns a slat type: a new function with the layout and the CSS attached (and `fn` left as it was).
Give the Plot what `slat()` returns.

| Layout | Type | Default | What it does |
|---|---|---|---|
| `css` | string, or a list of strings (joined in order) | none | CSS scoped to this type's slats (section 11) |
| `thickness` | px, or a CSS length (`"2.5rem"`, `"var(--pitch)"`) | 32px when horizontal without `height`; otherwise a share of the chart | a slat's size along the stack: its height in a horizontal chart, its width in a vertical one |
| `inset` | share of the band (`0.25`), or a CSS length (`"1px"`) | `0.18` | the empty part of the band on each side of a Bar or Tick (an Area or Line keeps half of it on each side) |
| `room` | `{ start, end, before, after }` in px, `"auto"` for start or end, or `"auto"` for both | the default room (section 3) | space outside the plot for what the slat draws there |

Every setting can differ by orientation: `thickness: { horizontal: 40, vertical: 60 }`, `room: { horizontal: { start: 120, end: 48 }, vertical: { start: 32 } }`.

**room.**
`start` holds the names (`<Label edge="start">`), `end` the values past the bars or `<Label edge="end">`, `before` and `after` the space before the first slat and after the last.
The chart takes the largest room any of its Plots ask for on each side, and at least the axis' room.
A `room` given replaces the default room entirely: a side left out gets 0, then the axis' minimum (14px at a horizontal chart's ends).
So `room: { start: 120 }` leaves 14px for numbers past the bars.
`"auto"` sizes start or end to the widest **edge** Label there, in CSS, on every change:

- it measures only Labels with `edge` that are direct children of the slat's root (one wrapped in another element gets no room, and rhp warns);
- a Label with `at` is never measured, so numbers past the bars need `end` in px: `room: { start: "auto", end: 48 }`;
- a name gets at most 40% of the chart's width (`--rhp-gutter-max`, settable in the slat's CSS) and ends in "…" past it;
- with hundreds of slats, or names that change often, give px: every change lays out all slats again.

**What the slat function gets.**
`d`, a live view of its row: `d.<group>`, `d.index`, `d.position`.
Read it inside functions (`${() => d.sold}`) and never destructure it.

**What it returns.**
One element, the slat's root, usually a `<div>` holding blocks and any other elements.
For a single block in an `overlap` Plot or a Scale, return that block directly instead.
rhp sets on the root: `data-rhp-slat` (the type's CSS scope), `data-rhp-o` (`h` or `v`), `role="listitem"` in a top-level Plot without `overlap` (unless the root has a role), an `id` when the slats are sorted (unless it has one), `hidden` when its position is `null`, `tabindex` with `keyboard`, and the style `--rhp-position`.
rhp places and sizes an ordinary Plot's root, absolutely, in its band: the slat's CSS can style it (background, border, radius, hover) but cannot move or resize it.
An `overlap` Plot or a Scale leaves a direct block's own geometry in control.
Elements of your own inside a wrapper are positioned by your CSS against the full slat's band.
Children inside a direct block use that block's box instead; keep a wrapper for independently positioned sibling marks or labels.
Keep a wrapper when a single mark needs a full-band hover or pointer target.

```js
import { Chart, Plot, Bar, Label, slat, series, html, render, createSignal } from "@bezda/rhp/standalone";

// Data: moons known in March 2024 (NASA); more have been found since
const planet = ["Jupiter", "Saturn", "Uranus", "Neptune"];
const moons = [95, 146, 28, 16];

// Slat types: layout per orientation, and CSS that only reaches these slats
const Planet = slat({
  thickness: { horizontal: 42 },
  inset: 0.24,
  room: { horizontal: { start: 76, end: 40 }, vertical: { start: 28, end: 22 } },
  css: `
    .slat:hover { background: color-mix(in srgb, var(--rhp-ink) 7%, transparent); border-radius: 8px; }
    .bar { --rhp-end-radius: 6px; }
    .value { font-weight: 700; }
    .name:vertical { font-size: 11px; }
  `,
}, (d) => html`
  <div class="slat">
    <${Label} edge="start" class="name">${() => d.planet}<//>
    <${Bar} class="bar" to=${() => d.moons} color=${() => d.color} />
    <${Label} at=${() => d.moons} class="value">${() => d.moons}<//>
  </div>`);

// Chart component: one button turns the chart
const MoonChart = () => {
  const [o, setO] = createSignal("horizontal");
  return html`
    <div>
      <button onClick=${() => setO(o() === "horizontal" ? "vertical" : "horizontal")}>Turn</button>
      <${Chart} orientation=${o} scale=${[0, 150]}>
        <${Plot} planet=${planet} moons=${moons} color=${series()}>${Planet}<//>
      <//>
    </div>`;
};

render(MoonChart, document.getElementById("chart"));
```

## 6. Blocks

Every block also takes `class`, `style` (an object or a string; published rhp 2.0.2 needs objects for changing styles, gotcha 4), `ref`, children, event handlers and any HTML attribute (`title`, `data-*`, `aria-*`).
`color` takes a theme key or any CSS color (section 8).
Bar, Dot, Tick, Label and Cell take `shape` (an outline from `shape()`, section 9).
Values are on the Chart's scale.

| Block | Draws | Props (default) | Past the scale |
|---|---|---|---|
| `Bar` | a span from `from` to `to`, across the band | `from` (0), `to` (0), `thick` (64% of the band: a number is a share, a string a CSS length), `color` (`series-1`), `shape`. With `to` below `from` the bar runs backward. Corners 2px. | cut at the scale's ends |
| `Dot` | a disc centered at `at` | `at`, `size` (`"10px"`), `across` (0.5: its place across the band, 0 to 1), `cross` (a value on the second axis, instead of `across`), `color` (`series-1`), `shape` | keeps its place, outside the plot |
| `Tick` | a 2px line across the band at `at` | `at`, `thick` (64% of the band), `color` (`ink`), `shape` | keeps its place, outside the plot |
| `Label` | text at a value, or beside the plot | `at`, `side` (`"after"`; `"before"` ends the text at the value), `edge` (`"start"` or `"end"`: in the room before or after the plot), `cross`, `shape`. No `color` prop: color it in CSS. | horizontal: one past the max stays at the end, one below the min sticks out; vertical: one below the min stays at the bottom, one past the max rises above the plot |
| `Cell` | the whole band (less 1px all round), colored by `value` from the theme's `low` (at min) to `high` (at max) | `value`, `color` (a fixed color instead), `shape`. Corners 2px. | colored as min or max |
| `Place` | nothing: a point at `at`, of no size, for elements of your own | `at`, `across` (0.5), `cross` | keeps its place |
| `Area` | a filled outline from `points`, grown from the band's edge (ridgeline) or both ways from its middle (`mirror`, violin) | `points` (`[[x, y], …]` sorted by x, y ≥ 0), `peak` (the largest y: the y that fills the band), `mirror` (false), `smooth` (false), `color` (`series-1`) | the outline is squeezed into the scale: keep every x inside it |
| `Line` | a 2px line through `points`; in a slat a sparkline, on a cross scale a line chart | `points` (`[[x, y], …]`; out of x order, a connected scatter), `peak` (largest y; in a slat only), `fill` (false: fills under the line), `base` (0: where the fill ends on a cross scale), `smooth` (false), `color` (`series-1`) | squeezed like Area |

Where things sit:

- A Dot whose `size` is a number takes that share of the slat's box in each direction, which makes an ellipse.
  Give a length (`"14px"`).
- A Label is 12px, on one line, with tabular figures.
  With `at` it starts 5px past the value (3px above it when vertical); with `side="before"` it ends there.
  With `edge="start"` it fills the start room, right-aligned with an 8px gap (horizontal), or sits centered under its column (vertical).
  With `edge="end"` it sits after the plot (6px gap) or above the column.
  An edge Label wider than its room ends in "…".
- A Label without `at` or `edge` has no place on the scale: it sits at the slat's left edge (horizontal) or top (vertical).
- An Area spans from its first x to its last, a Line from its smallest x to its largest; across, both take the band less the inset (82% of it by default, with 9% free on each side).
  An Area is filled with its color at 35% and stroked 1.5px; a Line is stroked 2px, and with `fill` filled at 22%.
- A Place's children are placed by your CSS from its point: `position: absolute; translate: -50% -50%` centers one.
- `color` sets `--rhp-color` on that block only, so a Label next to a Bar does not see the Bar's color.
  Set `--rhp-color` on the slat's root to share one, in a style object (`style=${() => ({ "--rhp-color": … })}`).

A Bar from one value to another, Dots at its ends, and a Tick:

```js
import { Chart, Plot, Bar, Dot, Tick, Label, slat, html, render } from "@bezda/rhp/standalone";

// Data: a day's low, mean and high in °C
const city = ["City A", "City B", "City C"];
const low = [-4, 3, 9], mean = [0, 7.5, 14], high = [4, 12, 19];

// Slat types
const Range = slat({ thickness: 40 }, (d) => html`
  <div>
    <${Label} edge="start">${() => d.city}<//>
    <${Bar} from=${() => d.low} to=${() => d.high} thick="4px" color="grid" />
    <${Dot} at=${() => d.low} size="12px" color="series-1" />
    <${Dot} at=${() => d.high} size="12px" color="series-2" />
    <${Tick} at=${() => d.mean} thick=${0.6} />
  </div>`);

// Chart component
const RangeChart = () => html`
  <${Chart} scale=${[-10, 25]} ticks=${[-10, 0, 10, 20]} format=${(v) => v + "°"}>
    <${Plot} city=${city} low=${low} mean=${mean} high=${high}>${Range}<//>
  <//>`;

render(RangeChart, document.getElementById("chart"));
```

Labels at values and at the edges, with values below zero:

```js
import { Chart, Plot, Bar, Label, slat, html, render } from "@bezda/rhp/standalone";

// Data: profit per month, in k€
const month = ["Jan", "Feb", "Mar", "Apr"];
const profit = [25, -12, 8, -30];

// Slat types: a negative bar runs backward, and its number ends just before its value
const Month = slat({ thickness: 36, room: { start: 44, end: 44 } }, (d) => html`
  <div>
    <${Label} edge="start">${() => d.month}<//>
    <${Bar} to=${() => d.profit} color=${() => (d.profit < 0 ? "negative" : "positive")} />
    <${Label} at=${() => d.profit} side=${() => (d.profit < 0 ? "before" : "after")}>${() => d.profit}<//>
    <${Label} edge="end">${() => (d.profit < 0 ? "loss" : "gain")}<//>
  </div>`);

// Chart component
const ProfitChart = () => html`
  <${Chart} scale=${[-40, 40]} ticks=${[-40, -20, 0, 20, 40]}>
    <${Plot} month=${month} profit=${profit}>${Month}<//>
  <//>`;

render(ProfitChart, document.getElementById("chart"));
```

Cells: a heatmap, one Plot of hours across each day's band:

```js
import { Chart, Plot, Cell, Label, slat, html, render } from "@bezda/rhp/standalone";

// Data: visitors per hour, from 9:00
const day = ["Fri", "Sat", "Sun"];
const visitors = [[2, 8, 21, 35, 30, 12], [4, 11, 26, 40, 34, 15], [9, 24, 38, 29, 18, 6]];

// Slat types: an hour is a Cell; a day holds a Plot of hours turned across its band
const Hour = slat({ css: `.cell { --rhp-radius: 3px; --rhp-cell-gap: 2px; }` }, (h) => html`
  <div><${Cell} class="cell" value=${() => h.count} title=${() => h.count + " visitors"} /></div>`);
const Day = slat({ thickness: 34, room: { start: 40 } }, (d) => html`
  <div>
    <${Label} edge="start">${() => d.day}<//>
    <${Plot} orientation="across" count=${() => d.visitors}>${Hour}<//>
  </div>`);

// Chart component: the scale colors the cells, from the theme's low to its high
const VisitorChart = () => html`
  <${Chart} scale=${[0, 40]} ticks=${false} theme=${{ low: "#f3ede4", high: "#9c3d10" }}>
    <${Plot} day=${day} visitors=${visitors}>${Day}<//>
  <//>`;

render(VisitorChart, document.getElementById("chart"));
```

A Place, holding an element of your own at a value:

```js
import { Chart, Plot, Bar, Label, Place, slat, html, render } from "@bezda/rhp/standalone";

// Data: heights in m
const peak = ["Everest", "K2", "Denali", "Mont Blanc"];
const metres = [8849, 8611, 6190, 4808];

// Slat types: the badge is centered on the Place's point
const Climb = slat({
  thickness: 44,
  room: { start: 84, end: 36 },
  css: `.badge { position: absolute; translate: -50% -50%; padding: 2px 7px; border-radius: 99px;
    background: var(--rhp-ink); color: var(--rhp-surface); font-size: 11px; font-weight: 700; white-space: nowrap; }`,
}, (d) => html`
  <div>
    <${Label} edge="start">${() => d.peak}<//>
    <${Bar} to=${() => d.metres} thick="6px" />
    <${Place} at=${() => d.metres}><span class="badge">${() => (d.metres / 1000).toFixed(1)} km</span><//>
  </div>`);

// Chart component
const PeakChart = () => html`
  <${Chart} scale=${[0, 9000]} ticks=${[0, 3000, 6000, 9000]} format=${(v) => v / 1000 + " km"}>
    <${Plot} peak=${peak} metres=${metres}>${Climb}<//>
  <//>`;

render(PeakChart, document.getElementById("chart"));
```

An Area per slat (violins from `density`) and a Tick at each median:

```js
import { Chart, Plot, Area, Tick, Label, slat, density, summary, html, render, createMemo } from "@bezda/rhp/standalone";

// Data: minutes to get to work, per town
const town = ["Ash", "Birch", "Cedar"];
const minutes = [
  [12, 15, 18, 20, 21, 22, 24, 25, 25, 27, 30, 34, 38, 45],
  [8, 9, 10, 12, 12, 13, 14, 15, 15, 16, 18, 20, 22, 26],
  [20, 25, 28, 30, 32, 33, 35, 36, 38, 40, 42, 45, 50, 55],
];

// Slat types: the outline over the whole scale, worked out once per change
const Town = slat({ thickness: 56, room: { start: 52, end: 24 } }, (d) => {
  const outline = createMemo(() => density(d.minutes, { domain: [0, 60], points: 49 }));
  const median = createMemo(() => summary(d.minutes).median);
  return html`
    <div>
      <${Label} edge="start">${() => d.town}<//>
      <${Area} points=${outline} mirror=${true} smooth=${true} />
      <${Tick} at=${median} thick=${0.5} />
    </div>`;
});

// Chart component
const CommuteChart = () => html`
  <${Chart} scale=${[0, 60]} ticks=${[0, 15, 30, 45, 60]} format=${(m) => m + " min"}>
    <${Plot} town=${town} minutes=${minutes}>${Town}<//>
  <//>`;

render(CommuteChart, document.getElementById("chart"));
```

A Line per slat (sparklines); one `peak` for all keeps them comparable:

```js
import { Chart, Plot, Line, Label, slat, html, render } from "@bezda/rhp/standalone";

// Data: visits per day of the week
const page = ["Home", "Pricing", "Docs"];
const visits = [[320, 280, 350, 300, 390, 180, 150], [90, 120, 110, 160, 150, 60, 40], [210, 240, 260, 230, 250, 120, 140]];

// Slat types
const Page = slat({ thickness: 44, room: { start: 64, end: 40 } }, (d) => html`
  <div>
    <${Label} edge="start">${() => d.page}<//>
    <${Line} points=${() => d.visits.map((v, i) => [i + 1, v])} peak=${400} fill=${true} />
    <${Label} edge="end">${() => d.visits[6]}<//>
  </div>`);

// Chart component
const VisitChart = () => html`
  <${Chart} scale=${[1, 7]} ticks=${[1, 2, 3, 4, 5, 6, 7]} format=${(day) => "MTWTFSS"[day - 1]}>
    <${Plot} page=${page} visits=${visits}>${Page}<//>
  <//>`;

render(VisitChart, document.getElementById("chart"));
```

`shape()`: an outline a block wears instead of its rectangle, written once for both orientations and both directions:

```js
import { Chart, Plot, Bar, Label, slat, shape, html, render } from "@bezda/rhp/standalone";

// Data: change in points
const team = ["Lions", "Hawks", "Bears", "Wolves"];
const change = [14, -6, 9, -11];

// Slat types: an arrow, 14px from its end to its point; a bar that runs backward points the other way
const arrow = shape(["M", 0, 0], ["L", "-14px", 0], ["L", 1, 0.5], ["L", "-14px", 1], ["L", 0, 1], ["Z"]);
const Team = slat({ thickness: 36, room: { start: 60, end: 20 } }, (d) => html`
  <div>
    <${Label} edge="start">${() => d.team}<//>
    <${Bar} to=${() => d.change} shape=${arrow} color=${() => (d.change < 0 ? "negative" : "positive")} />
  </div>`);

// Chart component
const ChangeChart = () => html`
  <${Chart} scale=${[-15, 15]} ticks=${[-15, -10, -5, 0, 5, 10, 15]}>
    <${Plot} team=${team} change=${change}>${Team}<//>
  <//>`;

render(ChangeChart, document.getElementById("chart"));
```

### ManyDots (experimental point collection)

`ManyDots` draws a bulk collection of points directly inside a `Chart` with `scale` and `cross`.
It is part of the upcoming npm 2.0.3 release.
It is a collection rather than a block in a slat, so do not wrap it in a `Plot` or supply a slat function.
Use a repository build that exports `ManyDots`; the version-2 CDN URL in the page skeleton does not guarantee this experimental API is available.
Both package entry points export it in that build, and Solid users can import `ManyDotsProps<T>` and `ManyDotsValue<T, V>` for its types.

Choose it explicitly for bulk HTML points, or keep `Dot` for individual blocks, rich point content, and Plot behavior at any point count.
Neither component switches into the other automatically, including at 500 points.

| Prop | Type | Default | What it does |
|---|---|---|---|
| `rows` | readonly array of rows | required | one point per row with finite coordinates |
| `at`, `cross` | number or `(row, index) => number` | required | coordinates on the Chart's value and cross scales |
| `key` | `(row, index) => identity` | source row index | stable identity for keyed updates; rendered keys must be unique |
| `size` | number, CSS length, or accessor | `"4px"` | diameter; a number means pixels, unlike Dot's band fraction |
| `color` | CSS color, theme key, or accessor | `"series-1"` | shared or individual point colors |
| `shape` | `shape()` outline or accessor | circular points | shared or individual point outlines |
| `pointClass` | string or accessor | none | space-separated application classes on each point |
| `pointStyle` | CSS properties object or accessor | none | individual appearance overrides |
| `class`, `classList`, `style`, `ref`, HTML attributes and events | normal div props | none | apply to the collection host; `style` accepts an object or string |

The appearance accessors above receive `(row, index)`.
Both domains must have finite, distinct endpoints, and nonfinite point coordinates are skipped.
Finite coordinates outside a domain keep their outside positions, so choose scales that cover the data.
Every rendered point retains its original row index in `data-rhp-index`, even when preceding rows are skipped.

**Appearance and DOM.**
The light-DOM host is `.rhp-manydots`, its point container is `.rhp-manydots-points`, and each point is a `.rhp-manydot` div.
There is no shadow root, so document queries, Testing Library queries, native events, and page-level event delegation see the points.
Use `pointClass` with ordinary application CSS for background color, radius, opacity, outlines, filters, transforms, and hover styles.
Shared defaults use one scoped stylesheet per collection, with a fallback for browsers without `@scope` support.
Per-point color and shape accessors write inline styles, which take precedence over ordinary class rules.
Size, color, and shape accessors also override the same properties supplied through `pointStyle`.
The collection owns coordinates and centering and guards position, dimensions, margins, padding, borders, and min/max dimensions.
Explicit width and height in `pointStyle` can override a shared size; appearance remains customizable without the slat's general text and font reset.

**Interaction and accessibility.**
CSS hover and native click, touch, and pointer events work on the plain HTML points.
Attach handlers to the host and recover the row with `data-rhp-index`; there is no per-point handler prop or built-in drag behavior.
Implement dragging with pointer events and pointer capture when needed, and use `getBoundingClientRect()` for overlays against the visible point box.
`ManyDots` does not implement Plot's automatic keyboard navigation, selection, or readout behavior and accepts no point children, `innerHTML`, or `textContent`.
Provide a Chart `label` and a textual summary, data table, or keyboard-accessible controls when readers need individual values.
The following complete module example includes a table whose buttons offer the same selection as clicking a point.
Validate the experimental collection's point count, geometry, appearance, native interactions, and accessible controls in the browser rather than treating a standard-chart checker report as complete bulk-point coverage.

```js
import { Chart, ManyDots, html, render, createSignal } from "@bezda/rhp/standalone";

const samples = [
  { id: "a", name: "Sample A", x: 20, y: 35, diameter: 8, color: "#a73157" },
  { id: "b", name: "Sample B", x: 60, y: 80, diameter: 10, color: "#18749a" },
  { id: "c", name: "Sample C", x: 85, y: 50, diameter: 6, color: "#6b4da1" },
];

function Measurements() {
  const [selected, setSelected] = createSignal(null);
  const chosen = () => samples.find(row => row.id === selected());
  const pick = event => {
    const point = event.target.closest?.(".rhp-manydot");
    if (point && event.currentTarget.contains(point)) {
      setSelected(samples[Number(point.dataset.rhpIndex)].id);
    }
  };
  return html`
    <section>
      <style>
        .measurement-point { cursor: pointer; }
        .measurement-point:hover { outline: 2px solid currentColor; outline-offset: 2px; }
      </style>
      <p>Click or tap a point, or choose a sample in the table.</p>
      <${Chart} scale=${[0, 100]} cross=${[0, 100]} height=${280} label="Illustrative sample measurements">
        <${ManyDots} rows=${samples} at=${row => row.x} cross=${row => row.y} key=${row => row.id}
          size=${row => row.diameter} color=${row => row.color} pointClass="measurement-point"
          pointStyle=${row => ({ opacity: selected() == null || selected() === row.id ? 1 : 0.35 })}
          onClick=${pick} />
      <//>
      <p aria-live="polite">${() => chosen() ? `${chosen().name}: x ${chosen().x}, y ${chosen().y}` : "No sample selected"}</p>
      <table>
        <caption>Illustrative sample values</caption>
        <thead><tr><th scope="col">Sample</th><th scope="col">X</th><th scope="col">Y</th></tr></thead>
        <tbody>${samples.map(row => html`
          <tr><th scope="row"><button type="button" onClick=${event => setSelected(row.id)}>${row.name}</button></th>
            <td>${row.x}</td><td>${row.y}</td></tr>`)}
        </tbody>
      </table>
    </section>`;
}

render(Measurements, document.getElementById("chart"));
```

**Updates and server rendering.**
Stable keys preserve leaf elements through replacement arrays, reordering, and removals.
One collection computation visits every row when a dependency changes, while unchanged points receive no managed style writes.
Dragging one point through reactive data therefore still requires a bulk row pass; update and drag performance have not been measured.
Data updates move points immediately, and JavaScript-driven Chart scale animation updates their resolved coordinates.
Server rendering emits the complete HTML collection, and hydration reuses its host, container, and points.
Initial leaves are adopted by row order because server keys are not serialized; keep server and client row order aligned when point DOM identity matters.
Managed classes, coordinates, and appearance declarations can be rewritten by the collection, while native listeners and metadata outside its managed fields survive ordinary updates.
See the [prototype guide](../../../examples/manydots/README.md) for centering and custom-size animation details and the [capabilities explanation](../../../examples/manydots/TRADEOFFS.md) for the measured initial-render tradeoffs.

## 7. Scales and axes

**The axis.** The Chart draws grid lines and numbers from `ticks` and `format`:

- `ticks` as a list: those values (values outside the scale are dropped);
- as a number: about that many round values (`5` by default; `[0, 30]` gives 0, 10, 20, 30);
- as a function of `[min, max]`: `every(10)`, or `every(5, { ends: true })` to add both ends;
- `false`: no axis, and no room for it.

`format` returns text or elements (`(v) => v + "%"`, or an element with a class that page CSS can style).
The numbers sit under a horizontal chart, centered on their lines, and left of a vertical one.
Their room is fixed (24px under, 14px past each end; 42px left of a vertical chart): long numbers stick out of the chart, so keep them short.

**A Scale of your own.** For a scale that looks different (dashed lines, numbers in pills, bands between ticks), put a `Scale` in the Chart; the Chart then draws no axis.
A Scale is an `overlap` Plot with one slat per tick, keyed by value, and takes `ticks` and `class` (other props are data groups).
A tick's slat gets `d.at` (its value), `d.next` (the next tick, or the scale's max), `d.first`, `d.last`, and `d.toEnd` (px from the tick to the scale's end, `Infinity` until measured).
It is hidden from screen readers.

```js
import { Chart, Scale, Plot, Bar, Tick, Label, slat, every, html, render } from "@bezda/rhp/standalone";

// Data: hours of sun per day in July
const city = ["City A", "City B", "City C", "City D"];
const sun = [12.4, 11.2, 8.4, 5.8];

// Slat types: a tick's slat draws a dashed line and its number under the plot
const Mark = slat({
  room: { after: 22 },
  css: `
    .line { --rhp-tick-width: 1px; background: none; border-left: 1px dashed var(--rhp-grid); }
    .num { top: calc(100% + 6px); translate: -50% 0; --rhp-label-gap: 0px; font-size: 11px; color: var(--rhp-muted); }
  `,
}, (t) => html`
  <div>
    <${Tick} class="line" at=${() => t.at} thick=${1} />
    <${Label} class="num" at=${() => t.at}>${() => t.at} h<//>
  </div>`);
const City = slat({ thickness: 34, room: { start: 64, end: 24 } }, (d) => html`
  <div>
    <${Label} edge="start">${() => d.city}<//>
    <${Bar} to=${() => d.sun} />
  </div>`);

// Chart component
const SunChart = () => html`
  <${Chart} scale=${[0, 14]}>
    <${Scale} ticks=${every(2)}>${Mark}<//>
    <${Plot} city=${city} sun=${sun}>${City}<//>
  <//>`;

render(SunChart, document.getElementById("chart"));
```

**A second axis: `cross`.** `cross={[min, max]}` adds a scale across the band.
In a horizontal chart it runs bottom to top (the value scale is x, `cross` is y); in a vertical chart it runs left to right (the value scale is y, `cross` is x).
An `overlap` Plot's slats then share the whole plot, and a Dot, Label or Place with `cross` sits at `at` on the value scale and at `cross` on the second one: a scatter plot.
A Line's y values go on the second axis: a line chart (`fill` fills down to `base`).
The second axis takes `crossTicks` and `crossFormat`, and its numbers go where the other orientation's would (left of a horizontal chart).
A chart with `cross` is 240px tall unless `height` or `aspect` says otherwise, and an overlap Plot on it gets no default room (names need room or sit at their points).
Dots, Places and Lines past the cross scale are drawn outside the plot.

```js
import { Chart, Plot, Dot, Label, html, render } from "@bezda/rhp/standalone";

// Data: cafés, their price and their rating
const cafe = ["Corner", "Roastery", "Kiosk", "Book & Bean", "Mill St"];
const price = [3.2, 4.5, 2.4, 3.8, 2.9];
const rating = [4.1, 4.8, 3.2, 4.4, 3.8];

// Slat types: a point and its name
const Cafe = (d) => html`
  <div>
    <${Dot} at=${() => d.price} cross=${() => d.rating} size="10px" />
    <${Label} at=${() => d.price} cross=${() => d.rating} style="--rhp-label-gap: 9px">${() => d.cafe}<//>
  </div>`;

// Chart component: price across, rating up
const CafeChart = () => html`
  <${Chart} scale=${[2, 6]} ticks=${[2, 3, 4, 5, 6]} format=${(p) => "€" + p}
    cross=${[3, 5]} crossTicks=${[3, 4, 5]} crossFormat=${(r) => r + "★"} height=${220}>
    <${Plot} overlap=${true} cafe=${cafe} price=${price} rating=${rating}>${Cafe}<//>
  <//>`;

render(CafeChart, document.getElementById("chart"));
```

A line chart: one Line in an overlap Plot (one slat), and a Dot per point in another:

```js
import { Chart, Plot, Line, Dot, html, render } from "@bezda/rhp/standalone";

// Data: average high in °C per month
const month = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const high = [15, 16, 19, 20, 23, 26, 28, 29, 27, 23, 18, 15];

// Chart component: the slats are plain functions
const HighChart = () => html`
  <${Chart} scale=${[0.5, 12.5]} ticks=${month} format=${(m) => "JFMAMJJASOND"[m - 1]}
    cross=${[10, 30]} crossTicks=${[10, 20, 30]} crossFormat=${(t) => t + "°"} height=${200}>
    <${Plot} overlap=${true} points=${[month.map((m, i) => [m, high[i]])]}>${(d) => html`
      <${Line} points=${() => d.points} fill=${true} base=${10} />`}<//>
    <${Plot} overlap=${true} month=${month} high=${high}>${(d) => html`
      <${Dot} at=${() => d.month} cross=${() => d.high} size="8px" />`}<//>
  <//>`;

render(HighChart, document.getElementById("chart"));
```

`Axis` (exported) is the component the Chart draws its axis with, from `ticks` (a list) and `format`; use the Chart's props or a Scale instead.

## 8. Theme

A theme is an object of colors and a font.
The Chart writes it on its element as CSS variables (`--rhp-ink`, `--rhp-series-1`…), together with rhp's own knobs.
So a page's `--rhp-*` variables, its font and its text color do not reach inside a chart: the theme is how they get in.

| Key | Default (`THEME`) | Used for |
|---|---|---|
| `series` | `["#2a78d6", "#eb6834", "#1baf7a", "#c2419a", "#7b5cd6", "#d39a12"]` | data colors `series-1`… (Bar, Dot, Area, Line default to `series-1`) |
| `ink` | `#1d232b` | all text in the chart, and the default Tick |
| `muted` | `#6b7280` | the axis numbers |
| `grid` | `rgba(128, 128, 128, .22)` | the grid lines |
| `surface` | `#ffffff` | nothing by default: a color for slat CSS (text on a bar, a badge); the chart's background is transparent |
| `positive`, `negative` | `#13894f`, `#c62828` | only where a block asks for them (`color="positive"`) |
| `low`, `high` | `#e8eef8`, `#1f4fa8` | a Cell's color at the scale's min and max (mixed in oklab between) |
| `font` | `system-ui, sans-serif` | every text in the chart |

A theme given replaces only the keys it names.
`Theme` gives a theme to every Chart inside it (`<${Theme} value=${{ font: "Georgia, serif" }}>…<//>`).
Themes nest (an inner one changes only its keys), and a Chart's own `theme` wins key by key.

**How a color resolves.** A block's `color` (and a data group holding colors) is:

- a theme key (`"series-3"`, `"positive"`, `"negative"`, `"ink"`, `"muted"`, `"grid"`, `"surface"`, `"low"`, `"high"`): it follows the theme, also when the theme changes;
- any other CSS color (`"#d4a72c"`, `"rgb(…)"`, `"oklch(…)"`): used as it is;
- `"var(--page-color)"` as a block's `color`: works, but rhp warns once per color ("reads a page variable; use a theme key"), because the chart would then look different in every page.
  A theme value may read a page variable without a warning (`theme=${{ ink: "var(--ink)", series: ["var(--accent)", "var(--quiet)"] }}`): it resolves at the chart, so a page's tokens (and their dark-mode values) drive the chart (design.md builds every look this way).

In slat CSS, the theme is `var(--rhp-ink)`, `var(--rhp-series-2)`… and a block's own color is `var(--rhp-color)`.
`series(n)` gives each row a series key by its index (`"series-1"` to `"series-n"`, then again).
`n` is 6 by default whatever the theme holds, so a theme of 4 colors needs `series(4)` (a missing series color falls back to `series-1`).

**Dark mode.** rhp has no dark theme of its own: give the Chart another theme when the page turns dark.

```js
import { Chart, Plot, Bar, Label, series, html, render, createSignal } from "@bezda/rhp/standalone";

// Data: each drink's share of a café's orders, in %
const drink = ["Latte", "Flat white", "Mocha", "Tea"];
const share = [31, 27, 12, 9];

// Themes: the same keys for light and dark
const LIGHT = { series: ["#1f5fbf", "#c4512b", "#13865c", "#8a3fb5"], ink: "#1d232b", muted: "#5f6773", grid: "rgba(0, 0, 0, .1)" };
const DARK = { series: ["#7fb0ff", "#ff9a73", "#5fd3a5", "#d39bff"], ink: "#e9ecf1", muted: "#a3abb7", grid: "rgba(255, 255, 255, .14)" };
const media = matchMedia("(prefers-color-scheme: dark)");
const [dark, setDark] = createSignal(media.matches);
media.addEventListener("change", (e) => setDark(e.matches));

// Slat types
const Drink = (d) => html`
  <div>
    <${Label} edge="start">${() => d.drink}<//>
    <${Bar} to=${() => d.share} color=${() => d.color} />
    <${Label} at=${() => d.share}>${() => d.share}%<//>
  </div>`;

// Chart component: the theme follows the signal, and the page paints its own background
const DrinkChart = () => html`
  <div style=${() => ({ background: dark() ? "#16181d" : "#ffffff", padding: "12px" })}>
    <${Chart} scale=${[0, 40]} theme=${() => (dark() ? DARK : LIGHT)}>
      <${Plot} drink=${drink} share=${share} color=${series(4)}>${Drink}<//>
    <//>
  </div>`;

render(DrinkChart, document.getElementById("chart"));
```

## 9. Helpers

Plain functions (no signals).
When their input changes, call them inside `createMemo` so they run once per change.

| Helper | Returns | Example (real output) |
|---|---|---|
| `nice(lo, hi, count = 5)` | a round scale `{ min, max, step, ticks }` | `nice(0, 87)` → `{ min: 0, max: 100, step: 20, ticks: [0, 20, 40, 60, 80, 100] }`; `nice(-23, 41)` → min -40, max 60, step 20 |
| `extent(values)` | `[smallest, largest]` (`[Infinity, -Infinity]` when empty) | `extent([5, -2, 9])` → `[-2, 9]` |
| `every(step, { ends })` | a ticks function of `[min, max]` (a step not above 0 throws) | `every(25)([0, 100])` → `[0, 25, 50, 75, 100]`; `every(5, { ends: true })([0, 27])` → `[0, 5, …, 25, 27]` |
| `stackUp(values)` | `{ from, to }`: positives stack up from 0, negatives down | `stackUp([5, -3, 4])` → from `[0, 0, 5]`, to `[5, -3, 9]` |
| `shares(values, total = 100)` | each value's share of the sum of absolute values, scaled to `total` | `shares([1, 1, 2])` → `[25, 25, 50]` |
| `running(changes)` | `{ from, to }`: running totals (waterfall) | `running([100, -30, 45])` → from `[0, 100, 70]`, to `[100, 70, 115]` |
| `summary(samples)` | `{ min, q1, median, q3, max, low, high, mean, outliers }`; low and high are the whisker ends (within 1.5 × IQR) | `summary([1, …, 9, 40])` → median 5.5, high 9, outliers `[40]` |
| `bins(samples, { domain, count = 10 })` | `{ x0, x1, tally }`: bin k covers x0[k] to x1[k] | `bins([1, 2, 2, 3, 9, 10], { count: 3 })` → x0 `[1, 4, 7]`, tally `[4, 0, 2]` |
| `density(samples, { domain, points = 40, bandwidth })` | `[[x, density], …]` for an Area (Gaussian kernel, Silverman's bandwidth) | keep `domain` inside the Chart's scale |
| `sortBy(key, "asc" or "desc")` | an `order` function; `key` is a group name or `(d) => value`; ties keep their places on screen | `order=${sortBy("sold", "desc")}` |
| `series(n = 6)` | a data group: `"series-1"`… by row index | `color=${series(4)}` |
| `cycle(list)` | a data group repeating `list` over the rows (does not set the number of rows) | `color=${cycle(["#111", "#999"])}` |
| `at(group, i)` | item i of a data group (a list wraps around, a single value is every row's) | `at([1, 2, 3], 4)` → `2` |
| `shape(...commands)` | an outline for a block's `shape`: SVG commands M, L, Q, C, Z | coordinates: a number is a share of the block's box (0 to 1), a string a CSS length, `"-14px"` measured back from the end; the first runs along the value axis, the second across the band |
| `curve(ease)` | a timing function of 0..1, from a CSS name, `[x1, y1, x2, y2]` or a function | `curve("ease-in-out")(0.5)` → `0.5` |
| `animated(read, settings)` | a reader `(ahead = 0) => value` that moves to each new value of `read()` on rhp's clock; `settings()` gives `{ duration, ease }` | `ease` must be a function: `{ duration: 400, ease: curve("ease-out") }` (a name throws) |
| `drawing(fn)` | runs `fn` with rhp's style writes made at once, not in the next frame | for data changed inside your own `requestAnimationFrame` |
| `useOrientation()` | the orientation of the Plot around, as an accessor | call it in a slat: `const o = useOrientation();` then `o()` |
| `restyle(slatType, css)` | gives a slat type made with `css` new CSS; its slats restyle in place | for style editors |
| `linkedCss()` | tells rhp the page links `@bezda/rhp/rhp.css` itself | call before the first chart; without the link rhp warns and adds its CSS anyway |

A shape must start with `M`.
Further `M` commands start separate subpaths, allowing disconnected pieces or holes with the opposite winding direction.
These work with native CSS `shape()` and the polygon fallback; curves in the fallback retain the existing approximation.

Stacked bars: `stackUp` per slat, and an overlap Plot whose slats are Bars:

```js
import { Chart, Plot, Bar, Label, slat, stackUp, html, render, createMemo } from "@bezda/rhp/standalone";

// Data: hours of the day spent on sleep, work and the rest
const day = ["Mon", "Tue", "Wed"];
const hours = [[8, 8, 8], [7, 9, 8], [8, 6, 10]];

// Slat types: a part is a Bar (an overlap Plot's slat may be a block); a day stacks its parts
const Part = (p) => html`<${Bar} from=${() => p.from} to=${() => p.to} color=${() => p.color} />`;
const Day = slat({ thickness: 40, room: { start: 44, end: 16 }, css: `.rhp-bar { --rhp-gap: 2px; }` }, (d) => {
  const stack = createMemo(() => stackUp(d.hours));
  return html`
    <div>
      <${Label} edge="start">${() => d.day}<//>
      <${Plot} overlap=${true} from=${() => stack().from} to=${() => stack().to} color=${["series-1", "series-2", "series-3"]}>${Part}<//>
    </div>`;
});

// Chart component
const DayChart = () => html`
  <${Chart} scale=${[0, 24]} ticks=${[0, 6, 12, 18, 24]} format=${(h) => h + " h"}>
    <${Plot} day=${day} hours=${hours}>${Day}<//>
  <//>`;

render(DayChart, document.getElementById("chart"));
```

A histogram: `bins` for the counts, `nice` for the scale, a vertical chart with one slat per bin:

```js
import { Chart, Plot, Bar, Label, slat, bins, nice, html, render } from "@bezda/rhp/standalone";

// Data: minutes per call
const calls = [2, 3, 3, 4, 4, 5, 5, 5, 6, 6, 6, 6, 7, 7, 7, 8, 8, 9, 9, 10, 11, 12, 12, 14, 15, 17, 19, 22, 26, 29];
const b = bins(calls, { domain: [0, 30], count: 10 });
const top = nice(0, Math.max(...b.tally)).max;

// Slat types: bins touch (inset 1px); each bin's lower edge is written at its left side
const Bin = slat({
  inset: "1px",
  css: `
    .bar { --rhp-radius: 0px; }
    .edge { left: -50%; right: 50%; font-size: 11px; color: var(--rhp-muted); }
  `,
}, (d) => html`
  <div>
    <${Bar} class="bar" to=${() => d.tally} />
    <${Label} edge="start" class="edge">${() => d.x0}<//>
  </div>`);

// Chart component
const CallChart = () => html`
  <${Chart} orientation="vertical" height=${200} scale=${[0, top]} label="Calls by length, in minutes">
    <${Plot} x0=${b.x0} tally=${b.tally}>${Bin}<//>
  <//>`;

render(CallChart, document.getElementById("chart"));
```

A box plot from `summary`, and a waterfall from `running`:

```js
import { Chart, Plot, Bar, Tick, Label, slat, summary, running, html, render, createMemo } from "@bezda/rhp/standalone";

// Data: delivery days per carrier, and a budget's steps
const carrier = ["Post", "Swift", "Cargo"];
const days = [[2, 3, 3, 4, 4, 4, 5, 5, 6, 9], [1, 1, 2, 2, 2, 3, 3, 3, 4, 4], [3, 4, 5, 5, 6, 6, 7, 8, 8, 12]];
const step = ["Sales", "Services", "Costs", "Tax"];
const r = running([60, 25, -40, -15]);

// Slat types: whiskers from low to high, the box from q1 to q3, a tick at the median
const Box = slat({ thickness: 40, room: { start: 56, end: 16 } }, (d) => {
  const s = createMemo(() => summary(d.days));
  return html`
    <div>
      <${Label} edge="start">${() => d.carrier}<//>
      <${Bar} from=${() => s().low} to=${() => s().high} thick="2px" color="muted" />
      <${Bar} from=${() => s().q1} to=${() => s().q3} />
      <${Tick} at=${() => s().median} color="surface" />
    </div>`;
});
// A step runs from the total before it to the total after it
const Step = slat({ thickness: 34, room: { start: 72, end: 40 } }, (d) => html`
  <div>
    <${Label} edge="start">${() => d.step}<//>
    <${Bar} from=${() => d.from} to=${() => d.to} color=${() => (d.to < d.from ? "negative" : "positive")} />
    <${Label} at=${() => Math.max(d.from, d.to)}>${() => d.to - d.from}<//>
  </div>`);

// Chart components
const BoxChart = () => html`
  <${Chart} scale=${[0, 12]} ticks=${[0, 3, 6, 9, 12]} format=${(v) => v + " d"}>
    <${Plot} carrier=${carrier} days=${days}>${Box}<//>
  <//>`;
const StepChart = () => html`
  <${Chart} scale=${[0, 100]}>
    <${Plot} step=${step} from=${r.from} to=${r.to}>${Step}<//>
  <//>`;

render(() => html`<div><${BoxChart} /><br /><${StepChart} /></div>`, document.getElementById("chart"));
```

## 10. Poster

`Poster` is markup for a magazine-style panel around a chart, and nothing else: it brings no CSS.

| Prop | What it does |
|---|---|
| `kicker` | the small line over the headline (text or elements) |
| `title` | the headline (not the HTML `title` attribute) |
| `dek` | the line or two under the headline |
| `note` | the small print under the chart (source, year); left out when not given |
| `look` | a class added to `poster` (a look of `posters.css`, or your own) |
| `class` | more classes |
| children | the chart, and anything else (a key, buttons) |
| anything else | set on the `<figure>`: `id`, `style`, `data-*`, `aria-*`, handlers (in the html template, `(e) => …`) |

It renders:

- `<figure class="poster">`, with the `look` and `class` added
  - `<figcaption>` holding `<span class="kicker">`, `<span class="headline">` and `<span class="dek">`
  - the children
  - `<span class="note">`, only when `note` is given

The three caption spans are always there (empty when not given) and inline: style them (`figcaption { display: grid }`).
A `<figure>` has the browser's margins (40px each side): set `.poster { margin: 0 }`.
The Poster is page markup, outside rhp's layers, so page CSS styles all of it.
The chart's own text takes the theme's `font`, not the poster's.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Bananas sell best</title>
  <script type="importmap">{ "imports": { "@bezda/rhp/standalone": "https://cdn.jsdelivr.net/npm/@bezda/rhp@2/dist/standalone.js" } }</script>
  <style>
    body { margin: 0; padding: 32px 16px; background: #e9e6e0; }
    .poster { max-width: 680px; margin: 0 auto; padding: 24px 24px 16px; background: #fbfaf7; color: #1d232b; font-family: Georgia, serif; }
    .poster figcaption { display: grid; gap: 6px; margin-bottom: 16px; }
    .poster .kicker { font: 600 11px/1.3 system-ui, sans-serif; letter-spacing: .12em; text-transform: uppercase; color: #8a5a12; }
    .poster .headline { font-size: 30px; font-weight: 700; line-height: 1.05; }
    .poster .dek { font-size: 15px; line-height: 1.45; color: #4d5560; }
    .poster .note { display: block; margin-top: 12px; font: 11px/1.4 system-ui, sans-serif; color: #6b7280; }
    @media (max-width: 480px) { .poster { padding: 18px 14px 12px; } .poster .headline { font-size: 25px; } }
  </style>
</head>
<body>
  <div id="chart"></div>
  <script type="module">
    import { Chart, Plot, Bar, Label, Poster, slat, html, render } from "@bezda/rhp/standalone";

    // Data
    const fruit = ["Bananas", "Apples", "Cherries"];
    const sold = [18, 12, 7];

    // Slat types
    const Fruit = slat({ thickness: 38, room: { start: 76, end: 36 } }, (d) => html`
      <div>
        <${Label} edge="start">${() => d.fruit}<//>
        <${Bar} to=${() => d.sold} color=${() => (d.index === 0 ? "#c2410c" : "#d9c3a5")} />
        <${Label} at=${() => d.sold}>${() => d.sold}<//>
      </div>`);

    // Chart component: the chart's text uses the theme's font
    const FruitPoster = () => html`
      <${Poster} kicker="Market stall" title="Bananas sell best" dek="Crates sold by midday on Saturday." note="Illustrative data.">
        <${Chart} scale=${[0, 20]} ticks=${[0, 5, 10, 15, 20]} label="Crates sold by midday"
          theme=${{ font: "system-ui, sans-serif", ink: "#1d232b", grid: "#e4ded3" }}>
          <${Plot} fruit=${fruit} sold=${sold}>${Fruit}<//>
        <//>
      <//>`;

    render(FruitPoster, document.getElementById("chart"));
  </script>
</body>
</html>
```

## 11. CSS

Where each kind of style goes:

| What | Where |
|---|---|
| slat blocks: bars, labels, hover, fonts per label | the slat type's `css` |
| ManyDots point appearance | `pointClass` with ordinary application CSS, or `pointStyle`, `color`, `size`, and `shape` |
| colors and the font of the whole chart | the Chart's `theme` (or `Theme`) |
| the chart's box: width, margin, background, border, radius | page CSS on the chart's element, or the Chart's `class` and `style` |
| the poster around it, and elements of your own outside the chart | page CSS |

**Slat CSS scope.** Every selector applies only inside this slat type's slats, the root included.
It never reaches the page, other slat types, or a slat of another type nested inside; it does reach a nested slat that is a plain function.
`:horizontal` and `:vertical` match a slat, block or Plot drawn that way (`.name:vertical { font-size: 11px }`).
For an element inside a block, put them on the block: `.bar:vertical .icon`.
A selector may start with `.rhp-chart` to depend on the chart (`.rhp-chart[data-rhp-o="v"] .bar`); it still applies only inside this type's slats.
`@keyframes` names are made private to the type: use them in the same CSS.
`::before` and `::after` work on the slat's root and on any element.

**Layers for slat blocks.** rhp makes its regular block and slat declarations `!important`, inside cascade layers declared first: `rhp.place`, then `rhp.slat`, then `rhp.core`.
For `!important` the first layer wins, and any layered `!important` beats every page rule (`!important` or not).
So a slat's CSS beats rhp's core (colors, corners, fonts, even a block's position), placement beats a slat's CSS (a slat's root, its motion), and the page reaches none of them.

**What page CSS can and cannot change on regular slat blocks** (measured):

| Page CSS on rhp's elements | Result |
|---|---|
| any property rhp sets: `background`, `color`, `font-*`, `border`, `border-radius`, `box-shadow`, `outline`, `padding`, `margin`, `display`, `transition`, `width`, `height`, `top`, `left` | ignored, even with `!important` |
| `opacity`, `cursor`, `filter`, `transform`, `rotate`, `scale`, `z-index`, `mix-blend-mode`, `pointer-events` (not on Area or Line) | applies (rhp leaves them to the page) |
| rhp's custom properties on an element inside the chart (`.rhp-bar { --rhp-radius: 8px }`) | applies, unless rhp sets that one inline there (a block's numbers, its `color`); on the chart's element only with `!important` (`--rhp-height: 300px !important`) |
| elements that are not rhp's (children you put in blocks or slats, elements from `format`) | applies, like anywhere in the page |
| the chart's element (`.rhp-chart`): `width`, `max-width`, `margin`, `background`, `border`, `border-radius`, `display` | applies; its padding is rhp's room |
| inherited text styles (`font-family`, `color`, `line-height` on body) | stop at the chart: everything inside starts from the theme |

Even where page CSS reaches rhp's custom properties, set them in the slat's `css`, or on the Chart's `style` object for the whole chart: page CSS never sets `--rhp-*` variables, so a chart keeps its whole look in its slat types and its theme.

**Classes and attributes rhp writes** (to aim a shared look at any chart):

| Selector | What it is |
|---|---|
| `.rhp-chart` | the chart's element; `data-rhp-o` (`h` or `v`), `data-rhp-animate="js"`, `data-rhp-cross`, `data-rhp-aspect` |
| `.rhp-body` | the grid inside it |
| `.rhp-axis`, `.rhp-gridline`, `.rhp-gridline > span` | the axis, a grid line, its number (`.rhp-axis[data-rhp-cross]`: the second axis) |
| `.rhp-plot` | a Plot; `data-rhp-overlap`, `data-rhp-reorder`; `.rhp-plot.rhp-scale` is a Scale |
| `.rhp-manydots`, `.rhp-manydots-points`, `.rhp-manydot[data-rhp-index]` | ManyDots host, point container, and point with its original row index |
| `[data-rhp-slat]` | a slat's root (the value is the type's scope) |
| `.rhp-bar` (`[data-rhp-back]` when it runs backward), `.rhp-dot`, `.rhp-tick`, `.rhp-cell`, `.rhp-place` | blocks |
| `.rhp-label[data-rhp-at]`, `.rhp-label[data-rhp-edge="start"]`, `.rhp-label[data-rhp-edge="end"]`, `[data-rhp-side="before"]` | Labels at a value, in the start room, in the end room |
| `svg.rhp-area > path`, `svg.rhp-line > path.rhp-under`, `path.rhp-stroke` | an Area's outline; a Line's fill and stroke |

**Variables a slat's CSS sets** (on a block, or on the slat's root to reach all its blocks):

| Variable | Default | What it does |
|---|---|---|
| `--rhp-radius` | `2px` | a Bar's and a Cell's corners; one length only (rhp warns otherwise) |
| `--rhp-start-radius`, `--rhp-end-radius` | `--rhp-radius` | a Bar's corners at its start, at its end (where `to` is) |
| `--rhp-gap` | `0` | empty space at a Bar's start (between stacked segments) |
| `--rhp-label-gap` | after a value 5px (3px vertical); start edge 8px (6px); end edge 6px (3px) | the space between a Label and its value or the plot |
| `--rhp-label-size` | `12px` | a Label's font size |
| `--rhp-tick-width` | `2px` | a Tick's width |
| `--rhp-cell-gap` | `1px` | the space around a Cell |
| `--rhp-color` | the block's `color` | a block's color; set on the slat's root, every block there without its own `color` takes it |
| `--rhp-length-time`, `--rhp-length-ease` | `.15s`, `ease-out` | how values move (CSS version) |
| `--rhp-slide-time`, `--rhp-slide-ease` | `.3s`, `ease-in-out` | how slats slide to new places |
| `--rhp-gutter-max` | `40cqw` | with `room: "auto"`, the widest a name (and the room) can be |

**Variables a slat's CSS reads**: the theme (`--rhp-ink`, `--rhp-muted`, `--rhp-grid`, `--rhp-surface`, `--rhp-series-1`…, `--rhp-positive`, `--rhp-negative`, `--rhp-low`, `--rhp-high`, `--rhp-font`), `--rhp-color` (the block's color), `--rhp-toward-end` (the direction from a Bar's start to its end: `linear-gradient(var(--rhp-toward-end), …)`), `--rhp-p` (where a Dot, Tick, Label or Place sits on the scale, 0 to 1: a Label's room to the scale's end is `calc((1 - var(--rhp-p)) * 100%)`), `--rhp-lo` and `--rhp-hi` (where a Bar, an Area or a Line starts and ends on the scale, 0 to 1, clipped to it: the donut and radial-bars recipes turn a Bar's into angles), `--rhp-min`, `--rhp-max`, a block's `--rhp-from`, `--rhp-to`, `--rhp-at`, `--rhp-value`, a slat's `--rhp-position`, and `--rhp-n` (how many places the slat's Plot has on screen).

**Styling the axis.** Page CSS and slat CSS cannot reach rhp's grid lines and numbers.
Their colors are the theme's `grid` and `muted`, their font the theme's `font`; `ticks` and `format` choose them (`format` may return an element with a class, which page CSS styles).
For anything else (dashes, bands, pills, numbers on top), draw a `Scale` (section 7).

**Transitions.** rhp moves blocks with transitions of its own, so a `transition` on a block replaces them and the block jumps to new values.
Put transitions (hover fades, growth) on elements inside blocks, or change properties without one.
With reduced motion rhp turns its own off; turn yours off too (`@media (prefers-reduced-motion: reduce)` in the slat's CSS).

**Animations.** A CSS animation works on a slat's root and on anything inside (a row that fades in, section 12).
A slat's CSS is made `!important`, and an `!important` declaration beats an animation, so an animation holds its own end state: `.out { animation: fade .3s forwards; }` with `@keyframes fade { to { opacity: 0; } }`; with `opacity: 0` declared beside it, the row is hidden at once and the fade never shows.

```js
import { Chart, Plot, Bar, Label, slat, html, render } from "@bezda/rhp/standalone";

// Data: moons known in March 2024 (NASA); more have been found since
const planet = ["Jupiter", "Saturn", "Uranus", "Neptune"];
const moons = [95, 146, 28, 16];

// Slat types: corners, a gradient along the bar, a value that darkens on hover with a fade inside the Label
const Planet = slat({
  thickness: 42,
  room: { start: 72, end: 44 },
  css: `
    .slat:hover { background: color-mix(in srgb, var(--rhp-ink) 6%, transparent); border-radius: 8px; }
    .bar {
      --rhp-start-radius: 0px;
      --rhp-end-radius: 12px;
      background: linear-gradient(var(--rhp-toward-end), var(--rhp-series-1), var(--rhp-series-5));
    }
    .name { font-weight: 600; }
    .value { --rhp-label-gap: 8px; --rhp-label-size: 14px; font-weight: 800; }
    .value span { opacity: .7; transition: opacity .15s; }
    .slat:hover .value span { opacity: 1; }
    @media (prefers-reduced-motion: reduce) { .value span { transition: none; } }
  `,
}, (d) => html`
  <div class="slat">
    <${Label} edge="start" class="name">${() => d.planet}<//>
    <${Bar} class="bar" to=${() => d.moons} />
    <${Label} at=${() => d.moons} class="value"><span>${() => d.moons}</span><//>
  </div>`);

// Chart component
const MoonChart = () => html`
  <${Chart} scale=${[0, 150]}>
    <${Plot} planet=${planet} moons=${moons}>${Planet}<//>
  <//>`;

render(MoonChart, document.getElementById("chart"));
```

## 12. Motion

When data changes, the chart follows by itself: a new value moves its block, a new order slides the slats.

**The CSS version** (the default): CSS transitions move `left`, `width`, `bottom`, `height` and `background-color` of Bars, Dots, Ticks, value Labels, Places, grid lines, Areas and Lines over 0.15s `ease-out` (a Cell's color too); an Area's or Line's outline moves the same way.
Slats slide over 0.3s `ease-in-out`.
Time them with `--rhp-length-time`, `--rhp-length-ease`, `--rhp-slide-time`, `--rhp-slide-ease` in a slat's CSS, or on the Chart's `style` object for the whole chart; `0s` makes values jump.

**The JS version** (`animate` on the Chart or a Plot): rhp counts each number from its old value to its new one on one clock for the page, over 150ms `ease-out` by default, and slats slide over 175ms, passing each other where their values are equal.
Everything drawn from a number moves with it, and `d.sold` itself returns the in-between values, so text that prints it shows fractions while it moves: round it (`Math.round(d.sold)`).
`animate=${true}`, or `{ duration, ease, slide }` (ms; `ease` a CSS name, `[x1, y1, x2, y2]` or a function).
A Plot's `animate` can name its groups: `["sold"]`, or `{ groups: ["sold"], duration: 400 }`.

What moves in the CSS version: whatever changes a block's `left`, `width`, `bottom`, `height` or background color (values, cross values, sizes, colors), an outline, the slats' places, and the axis when the scale changes.
What moves in the JS version: the numbers of the data groups it animates, the order, and the scale; nothing is transitioned, so colors jump.
What always jumps: text, a Dot's or Place's `across` in a horizontal chart, a turn of `orientation`, a change of room "auto", and everything when the reader asked for reduced motion.

**Which version to use.**
Data that changes now and then (a click that switches a year, a sort) keeps the CSS version: it costs almost nothing.
Data that changes rapidly or continuously (a live feed, a play button that moves through the data, a slider or a drag that drives the data, a bar chart race) uses the JS version for the elements that react to it: give the Plot `animate` with the groups that change (`animate=${["sold"]}`), or the Chart when the scale follows the data, so the axis moves with the marks.
In the CSS version each new value restarts a transition from where the mark is, so under steady change marks trail the data (and Safari can stall transitions that input events retarget); the JS version carries each move into the next value, and labels stay exactly on their bars.
Interaction effects (a hover highlight) stay CSS transitions on elements inside blocks in both versions.

How to time the JS version depends on whether the next value is known:
- **Playing back data you have** (a bar chart race, a year slider with Play): move a playhead `t`, a step with a fraction, on every frame (`requestAnimationFrame`), give the Plot the values at `t` (each on the straight line between the steps around it), and keep the default 150 ms. The marks glide through the steps without stopping at each one, and Pause leaves them between two steps (the example below; interaction.md section 10 adds the slider). Never step through the data with a timer: each mark would ease into a step and wait there.
- **A live feed**, whose next value is not known yet: ease linear into each new reading over a little more than one interval (`ease: "linear"`, `duration` 1.5 intervals in the `live` recipe). With the default ease-out, or a shorter duration, the marks stop between readings.

Measured in Chromium, for the JS version under steady change:
- Give the changing numbers as lists (`gdp=${() => gdpAt(t())}`), a single value or a field of `rows`: a group given as a function of the row (`(d) => ...`) is never moved by the JS version, it jumps.
- Played back by a playhead, the `race` recipe's bars changed width on every frame and ran about 66 ms (2 px) behind the playhead.
- For moves driven by a slider or a drag, keep the default 150 ms: with 300 ms the JS version trailed a drag as much as the CSS version (10.4 against 10.1 points of 100); with 150 ms it trailed 6.2.
- When the scale follows the data, `animate` goes on the Chart: on the Plot alone the scale jumps every step and the bars with it.
- For a history that scrolls (a live sparkline), animate one time value (`now`) and cut the window from it (`x = t - now`, kept inside the scale); animating the point arrays makes each vertex take its neighbor's value, so the line morphs in place instead of scrolling.
- A race that shows the top N of more rows hides the others with its order: `order=${(rows, now) => sortBy("gdp", "desc")(rows, now).map((p) => (p < N ? p : null))}`. A row hidden this way vanishes at once; the second example below lets rows leave and come in.
- In the JS version an order function reads each value half a slide ahead of what the marks show (measured: 75 of 100 read 253 ms into a linear 1 s move), so two rows pass each other where their values cross.
The `race` and `live` recipes put all of this together.
rhp writes style changes in the next animation frame; `drawing(fn)` writes those made inside your own `requestAnimationFrame` at once.

```js
import { Chart, Plot, Bar, Label, sortBy, html, render, createSignal, onCleanup } from "@bezda/rhp/standalone";

// Data: a vote counted in three rounds
const name = ["Maya", "Leo", "Ivy", "Omar"];
const ROUNDS = [[34, 21, 45, 12], [38, 30, 41, 22], [40, 44, 39, 25]];
const LAST = ROUNDS.length - 1;
const ROUND_MS = 1000; // how long a round takes while the count plays
// The votes at t, a round with a fraction: each on the straight line between the rounds around t
const votesAt = (t) => {
  const r = Math.min(Math.floor(t), LAST - 1);
  const f = t - r;
  return ROUNDS[r].map((v, i) => v * (1 - f) + ROUNDS[r + 1][i] * f);
};

// Slat types: the votes are fractional between rounds, so the label rounds them
const Candidate = (d) => html`
  <div>
    <${Label} edge="start">${() => d.name}<//>
    <${Bar} to=${() => d.votes} />
    <${Label} at=${() => d.votes}>${() => Math.round(d.votes)}<//>
  </div>`;

// Chart component: while the count plays, each frame moves the playhead t on by the time since the last frame (at most
// 250 ms, so a hidden tab resumes where it was). The votes change on every frame, so the bars move by the JS version
// with its default 150 ms. The frame loop stops at the last round, and when the chart is removed.
const VoteChart = () => {
  const [t, setT] = createSignal(0);
  let frame;
  const play = () => {
    cancelAnimationFrame(frame);
    setT(0);
    let last = null;
    const move = (now) => {
      setT(Math.min(LAST, t() + Math.min(now - (last ?? now), 250) / ROUND_MS));
      last = now;
      if (t() < LAST) frame = requestAnimationFrame(move);
    };
    frame = requestAnimationFrame(move);
  };
  onCleanup(() => cancelAnimationFrame(frame));
  return html`
    <div>
      <button onClick=${play}>Play the count</button>
      <${Chart} scale=${[0, 50]} animate=${{ slide: 400 }}>
        <${Plot} name=${name} votes=${() => votesAt(t())} order=${sortBy("votes", "desc")}>${Candidate}<//>
      <//>
    </div>`;
};

render(VoteChart, document.getElementById("chart"));
```

**A top-N race whose rows leave and come in.**
A row that leaves the top N slides to place N, just below the last place, fades there, and is hidden at the next step; a row that comes in fades in at its place.
Rows a source leaves out (a table of the top four each year) are `null` in the data.
Three parts do it:

- The order function: the rows in the race of the step nearest to `t`, by their value at `t`; a row that dropped out at that step takes place N until `t` reaches the step; every other row is `null`.
- A hidden Plot of N + 1 empty slats, as thick as the data's slats, under the data's Plot. While a row sits below the last place the data's Plot has N + 1 places, and the hidden Plot keeps the chart at that height all the time; without it the chart grows by one slat at every exit.
- Animations on the slat's root fade a row out at place N and in where it comes in (rhp keeps the root's transition for its slide). A slat's CSS is made `!important`, which beats an animation, so each animation holds its own end state (`forwards`) instead of a declaration beside it.

```js
import { Chart, Plot, Bar, Label, slat, html, render, createSignal, onCleanup } from "@bezda/rhp/standalone";

// Data: market shares in %, from a source that lists only the four largest makers each year: null where a maker is
// not among that year's four (illustrative; the makers are invented)
const N = 4;
const MAKER = ["Aster", "Birch", "Cedar", "Dune", "Ember", "Fjord"];
const SHARE = [
  [22, 18, 14, 11, null, null], // 2021
  [21, 19, 12, null, 13, null], // 2022: Dune drops out, Ember comes in
  [19, 21, null, null, 15, 12], // 2023: Cedar drops out, Fjord comes in
  [17, 22, null, null, 18, 13], // 2024
];
const LAST = SHARE.length - 1;
const YEAR_MS = 1500;
// The makers in each year's race: its N largest known shares
const RACE = SHARE.map((year) => new Set(MAKER.map((_, i) => i).filter((i) => year[i] != null).sort((a, b) => year[b] - year[a]).slice(0, N)));
// The shares at t, a year with a fraction: on the straight line between the years around t, or the known one when the
// other year has none (a maker that drops out keeps its last share while it slides out)
const sharesAt = (t) => {
  const k = Math.min(Math.floor(t), LAST - 1);
  const f = t - k;
  return SHARE[k].map((a, i) => {
    const b = SHARE[k + 1][i];
    return a == null ? b ?? 0 : b == null ? a : a * (1 - f) + b * f;
  });
};

// Slat types: a maker fades out at place N and fades in where it comes in; the animations keep their end state
const Maker = slat({
  thickness: 40,
  room: { start: 64, end: 52 },
  css: `
    .maker { animation: maker-in .3s; }
    .maker.out { animation: maker-out .3s forwards; }
    @keyframes maker-in { from { opacity: 0; } }
    @keyframes maker-out { to { opacity: 0; visibility: hidden; } }
    @media (prefers-reduced-motion: reduce) { .maker, .maker.out { animation: none; } .maker.out { visibility: hidden; } }
  `,
}, (d) => html`
  <div class=${() => (d.position === N ? "maker out" : "maker")}>
    <${Label} edge="start">${() => d.maker}<//>
    <${Bar} to=${() => d.share} />
    <${Label} at=${() => d.share}>${() => d.share.toFixed(1)}%<//>
  </div>`);
// N + 1 empty slats, drawn hidden under the data, keep the chart as tall as N + 1 places
const Band = slat({ thickness: 40, room: {} }, () => html`<div></div>`);

// Chart component: the playhead t moves on every frame while it plays, as in the example above
const ShareRace = () => {
  const [t, setT] = createSignal(0);
  // The makers in the race of the year nearest to t, by their share at t; a maker that has just dropped out takes
  // place N, below the last place, until t reaches its first year out; the others are hidden
  const places = (rows) => {
    const race = RACE[Math.round(t())];
    const ranked = [...race].sort((a, b) => rows[b].share - rows[a].share);
    return rows.map((_, i) => (race.has(i) ? ranked.indexOf(i) : RACE[Math.floor(t())].has(i) ? N : null));
  };
  let frame;
  const play = () => {
    cancelAnimationFrame(frame);
    setT(0);
    let last = null;
    const move = (now) => {
      setT(Math.min(LAST, t() + Math.min(now - (last ?? now), 250) / YEAR_MS));
      last = now;
      if (t() < LAST) frame = requestAnimationFrame(move);
    };
    frame = requestAnimationFrame(move);
  };
  onCleanup(() => cancelAnimationFrame(frame));
  return html`
    <div>
      <p><button onClick=${play}>Play</button>${" "}<b>${() => 2021 + Math.round(t())}</b></p>
      <${Chart} scale=${[0, 25]} ticks=${[0, 5, 10, 15, 20, 25]} animate=${{ slide: 300 }} label="Market shares of the four largest makers">
        <${Plot} slats=${N + 1} style=${{ visibility: "hidden" }}>${Band}<//>
        <${Plot} maker=${MAKER} share=${() => sharesAt(t())} order=${places}>${Maker}<//>
      <//>
    </div>`;
};

render(ShareRace, document.getElementById("chart"));
```

Measured in Chromium while it played, at 1280px and 390px: the chart kept its height in every frame (without the hidden Plot it changed between 186px and 226px), Dune was drawn at 15 heights between its place and place 4 while it faded and was then hidden, Ember faded in, and 2024 ended with its exact shares in order; under reduced motion the rows moved and appeared at once.

## 13. Accessibility and interaction

- **Name the chart**: `label="…"` (or `aria-labelledby`) makes it a figure with that name; `aria-describedby` and other `aria-*` props go on it too.
- **Slats are a list**: a top-level Plot is `role="list"` and each slat's root `role="listitem"`.
  A root with its own role keeps it (`role="group" aria-label=…`).
  Plots inside slats, overlap Plots (scatter points) and Scales are not lists.
  When `order` moves slats with `reorder="slide"`, `aria-owns` gives the reading order shown.
- **The axis is hidden** from screen readers (`aria-hidden`), and so is a Scale: each slat's own text must say its value.
- **A slat that shows only shapes reads nothing**: add a Label, or text only a screen reader reads.
- **Keyboard**: `keyboard=${true}` on a Plot makes its slats focusable.
  Tab stops at one slat (the one focused last, or the first shown); the arrow keys go to the slat shown before or after it, and Home and End to the first and last, in the order shown.
  A slat keeps focus when it moves.
  Keys with a modifier, and keys a handler inside the slat prevented, are left alone.
  Style `:focus-visible` next to `:hover`, in the slat's `css` (a page rule does not reach a slat).
- **Forced colors** (Windows contrast themes): Bars, Dots, Ticks, Cells, Areas and Lines keep their colors, and Bars, Dots, Ticks and Cells get a 1px outline in the system text color.
- **Reduced motion**: rhp's transitions and the JS version stop; values jump.

```js
import { Chart, Plot, Bar, Label, slat, html, render } from "@bezda/rhp/standalone";

// Data
const city = ["City A", "City B", "City C", "City D"];
const rain = [184, 124, 81, 56];

// Slat types: a focused slat shows what a hovered one shows; the hidden text says it in words
const City = slat({
  thickness: 36,
  room: { start: 72, end: 56 },
  css: `
    .slat:is(:hover, :focus-visible) { background: color-mix(in srgb, var(--rhp-ink) 8%, transparent); outline: none; }
    .tip { opacity: 0; transition: opacity .15s; }
    .slat:is(:hover, :focus-visible) .tip { opacity: 1; }
    .say { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  `,
}, (d) => html`
  <div class="slat">
    <${Label} edge="start">${() => d.city}<//>
    <${Bar} to=${() => d.rain} />
    <${Label} at=${() => d.rain} aria-hidden="true"><span class="tip">${() => d.rain} mm</span><//>
    <span class="say">${() => d.rain} mm of rain</span>
  </div>`);

// Chart component
const RainChart = () => html`
  <${Chart} scale=${[0, 200]} label="Rain in October, in mm">
    <${Plot} keyboard=${true} city=${city} rain=${rain}>${City}<//>
  <//>`;

render(RainChart, document.getElementById("chart"));
```

**Interaction state is the app's.** rhp keeps none: hold what the reader points at in a signal, feed it back to the Plot as data, and let the slat show it (interaction.md has the patterns).
Listen on an element around the chart (the Chart takes no handlers) and find the slat with `data-row` and `closest()`.
A mouse or a pen picks on `pointermove`, a tap or a click on `click` (a scroll never fires one, so never pick on `pointerdown`), the keyboard on `focusin`; an event on no slat keeps the pick, and leaving clears it:

```js
import { Chart, Plot, Bar, Label, Show, slat, html, render, createSignal } from "@bezda/rhp/standalone";

// Data
const city = ["City A", "City B", "City C", "City D", "City E"];
const rain = [184, 124, 81, 56, 37];
const days = [19, 17, 13, 11, 6];

// Slat types: the card exists only in the slat the reader is on
const City = slat({
  thickness: 34,
  room: { start: 72, end: 120 },
  css: `
    .slat.on .bar { filter: brightness(1.15); }
    .card { padding: 2px 8px; border-radius: 4px; background: var(--rhp-ink); color: var(--rhp-surface); }
  `,
}, (d) => html`
  <div class=${() => (d.on ? "slat on" : "slat")} data-row=${() => d.index}>
    <${Label} edge="start">${() => d.city}<//>
    <${Bar} class="bar" to=${() => d.rain} />
    <${Show} when=${() => d.on}>
      <${Label} at=${() => d.rain} class="card">${() => d.rain} mm, ${() => d.days} wet days<//>
    <//>
  </div>`);

// Chart component: the row the reader picked is a signal; on=${(d) => …} is worked out per row
const RainChart = () => {
  const [on, setOn] = createSignal(null);
  // The row of the slat an element is in, or null (between slats)
  const rowOf = (el) => {
    const root = el.closest("[data-row]");
    return root ? +root.dataset.row : null;
  };
  const pick = (e) => {
    const row = rowOf(e.target);
    if (row != null) setOn(row); // on no slat, the pick stays
  };
  // Leaving: back to the slat that has focus, or none
  const leave = (e) => {
    if (e.pointerType === "touch") return; // a finger sends pointerleave as it lifts after a tap
    setOn(e.currentTarget.contains(document.activeElement) ? rowOf(document.activeElement) : null);
  };
  return html`
    <div onPointerMove=${(e) => e.pointerType !== "touch" && pick(e)} onClick=${pick} onFocusIn=${pick}
      onPointerLeave=${leave} onFocusOut=${(e) => !e.currentTarget.contains(e.relatedTarget) && setOn(null)}>
      <${Chart} scale=${[0, 200]} label="Rain in October, in mm">
        <${Plot} keyboard=${true} city=${city} rain=${rain} days=${days} on=${(d) => on() === d.index}>${City}<//>
      <//>
    </div>`;
};

render(RainChart, document.getElementById("chart"));
```

## 14. Limits

rhp draws marks on one value scale (and an optional second one), as HTML elements.
It has no projections, layouts or 3D, and no chart types to configure: everything is blocks in slats.

| Asked for | rhp has no | The closest rhp answer |
|---|---|---|
| a map (choropleth, points on a map) | geography or projections | a sorted bar chart or dot plot of the regions; a tile grid map (one Cell per region at its row and column); a map image the user supplies, with Places over it, positioned by your CSS |
| a network or tree graph, a Sankey diagram, a chord diagram | node layouts or links | an adjacency matrix (a heatmap of Cells); stacked bars per stage for flows |
| 3D, a surface | depth | small multiples, or a heatmap (two categories and a color) |
| a treemap, a sunburst | nested rectangles | 100% segmented bars (`shares` and `stackUp`), or unit bars (a waffle) |
| a radar chart | a polar scale | grouped bars, a dot plot, or radial bars (the radial-bars recipe draws each bar as a ring arc in the slat's CSS, from `--rhp-hi` and `--rhp-position`) |
| a pie or donut | a wedge block | the donut recipe: an SVG path drawn in a Bar, sized by the shares |
| free-form drawing (arrows between points, shaded regions, curves) | a canvas | `shape()` on a block, an Area or Line, an inline SVG inside a Place or a Bar, or elements of your own in a slat |
| a log or time scale | scale types | turn values into numbers first (`Math.log10(v)` with `format` writing the real values; timestamps or day numbers with a date `format`) |
| a second value axis on the same side (two y axes) | it | two Charts side by side, or one value scaled into the other with its own Labels |

## 15. Gotchas

Every one of these was found by running rhp 2.0.1.

1. **Bare booleans are false in the html template.**
   `<${Plot} overlap>` passes `""`: no overlap, and the same for `keyboard`, `static`, `animate`, `mirror`, `fill` and `smooth`.
   Write `overlap=${true}`.
2. **A handler without a parameter on a component runs at render.**
   `<${Bar} onClick=${() => pick(d)}>` is read as a value: `pick` runs once per slat when the chart is drawn, and the click does nothing (or throws `c.call is not a function` when `pick` returned a value).
   Write `onClick=${(e) => pick(d)}`.
   The same holds for a handler on a `<${Poster}>` and for any function prop of a component; plain elements are not affected.
3. **`${d.sold}` never updates.**
   A value read without a function is read once.
   Wrap it, `${() => d.sold}`, and never destructure `d`.
4. **Use style objects on Chart, Plot and a slat's root.**
   `style="pointer-events: none"` on a Plot or Chart is dropped without a message; write `style=${{ "pointer-events": "none" }}`.
   On a slat's root, a string that changes or a style that becomes `undefined` replaces the whole style attribute and erases the stack position, so keep it an object.
   Published rhp 2.0.2 has the same problem on Blocks: a Bar can disappear and SVG geometry can be lost, so use `style=${() => ({ "--n": d.n })}` there too.
   Current source fixes the Block replacement bug for the upcoming 2.0.3 release; Blocks then retain their geometry when strings change or style is removed.
   Plain children that hold no rhp geometry can use changing strings.
5. **`className` breaks a block.**
   It replaces rhp's class, so the block is no longer drawn.
   Use `class`.
6. **The Chart drops `data-*`, `title`, `tabindex` and handlers.**
   Listen on an element around it, or on the Poster.
7. **A Plot's unknown props are data, not attributes.**
   `id`, `title`, `onClick`, `aria-label` on a Plot become `d.id`, `d.title`…
   Put attributes on the slat's root.
8. **A shorter list wraps around.**
   Data groups of different lengths do not fail: the longest sets the number of slats and the others repeat from the start.
   `slats` larger than the data repeats rows the same way.
9. **`d.index` can change for a slat** (with `key` when rows leave, and with `reorder="refill"`).
   Read it in a function: `data-row=${() => d.index}`.
10. **Giving `room` drops the default room.**
    `room: { start: 120 }` leaves 14px at the end, so value Labels past long bars stick out of the chart.
    Give every side you use.
11. **`room: "auto"` measures only edge Labels**, and only direct children of the slat's root.
    A Label with `at` at the end of a long bar sticks out: add `end` in px.
12. **The axis numbers have fixed room** (24px under, 14px past each end, 42px left of a vertical chart).
    Long `format` text sticks out of the chart: keep it short.
13. **The scale is not stretched to the data.**
    A Bar past the scale is cut at its end; a Dot, Tick or Place past it is drawn outside the plot.
    A value Label past a horizontal chart's max stays at the end, but one past a vertical chart's max rises above the plot, and one below a horizontal chart's min sticks out on the left.
    Build the scale from the data (`nice()`).
14. **Area and Line points past the scale squeeze the whole outline** into it instead of being cut.
    One point at 60 on a scale to 30 puts a peak at 15 at a quarter of the width, not half.
    Keep every x inside the scale, and give `density` a `domain` inside it.
15. **`scale` needs `min < max`.**
    An equal or reversed pair draws Bars with no length and no axis.
    To run bars right to left, use negative values and `format=${(v) => Math.abs(v)}`.
16. **NaN, `undefined` and `null` draw at the scale's start without an error**, and a Label prints "NaN".
    Clean the data first.
17. **A numeric Dot `size` makes an ellipse** (a share of the slat's width and height).
    Give a length: `size="12px"`.
18. **`series()` counts 6 colors whatever the theme holds.**
    With a theme of 4 series colors use `series(4)`, or rows 5 and 6 take `series-1`.
19. **A Label does not see its Bar's color.**
    `color` sets `--rhp-color` on that block only, so `.value { color: var(--rhp-color) }` on a sibling Label stays ink.
    Set `--rhp-color` on the slat's root in a style object (and leave `color` off the Bar), or color the Label itself.
20. **The page's font, colors and `--rhp-*` variables stop at the chart.**
    Give the font with `theme.font` and the colors with the theme; theme values may read the page's own variables (`ink: "var(--ink)"`), which do reach the chart.
    `color="var(--brand)"` on a block works but warns.
21. **Page CSS cannot restyle bars, labels, slats or the axis**, even with `!important`.
    It can set `opacity`, `cursor`, `filter`, `transform`, `z-index` and `pointer-events`; it also reaches rhp's `--rhp-*` variables, but those belong in the slat's `css` or the theme, never in page CSS.
    Style the inside of a chart in the slat's `css`.
22. **A `transition` on a block replaces rhp's own**, and the block jumps to new values.
    A transition on an ordinary Plot's slat root is ignored (rhp keeps the root's slide).
    Transition an element inside a block.
    Focus styles for slats go in the slat's `css`: rhp's core CSS resets `outline` on slat roots, so a page `:focus-visible` rule never reaches them.
23. **Slat CSS cannot move or resize an ordinary Plot's slat root** (`top`, `left`, `width`, `height` are rhp's).
    It can move blocks, including a direct block root in an `overlap` Plot or a Scale (a pie's wedge takes over its Bar's box).
24. **A chart collapses in a shrink-to-fit box.**
    As a plain flex item, in an `inline-block`, a float or a `width: fit-content` box, it is only as wide as its room (148px by default) with a plot 0px wide.
    Give it `flex: 1; min-width: 0`, or a width.
25. **A vertical chart's names are as wide as their columns** and end in "…" past that; with a fixed `thickness` the columns do not fill the chart.
    Keep names short, let them wrap (`.name:vertical { white-space: normal }`), or turn the chart.
26. **In the JS version `d.sold` is fractional while it moves**: round what you print.
27. **`animated()` takes `ease` only as a function**: `{ ease: curve("ease-in-out") }`.
    A name throws `d.ease is not a function`; `animate` on a Chart or Plot takes names.
28. **`standalone` has `createSelector` only from rhp 2.0.2** (with `createComputed`, `on`, `mergeProps`, `splitProps`, `Switch` and `Match`).
    For the slat the reader is on, a per-row data group works with every rhp 2: `on=${(d) => on() === d.index}`; `createSelector` saves work when a chart has hundreds of slats.
29. **A Plot outside a Chart draws nothing usable**, and a Scale outside one throws.
30. **A slat must return one element.**
    Two top-level elements or text throw "rhp: a slat must return one element".
    Return a single block directly only in an `overlap` Plot or a Scale.
    An ordinary Plot needs a wrapper to preserve the block's placing.
31. **The Poster brings no CSS**: a bare `<figure>` keeps 40px side margins and its caption spans run inline.
    Style `.poster`, `figcaption`, `.kicker`, `.headline`, `.dek` and `.note`.
32. **An overlay Plot with a plain slat function asks for the default room** (104px and 44px).
    Give its slat `room: {}` when the chart's room is smaller, and `style=${{ "pointer-events": "none" }}`.
33. **`static` charts ignore other signals.**
    A per-row function that reads a signal (a hovered row) runs once on a static chart, so keep interactive charts off `static`.
34. **Warnings rhp prints** (each once per page), all worth fixing: a block as an ordinary Plot's slat root; an edge Label inside another element with room "auto"; `aspect` with `height`, with slats that have a `thickness`, or not above 0; a page variable as a color; `--rhp-radius` with several lengths; an unknown ease; `linkedCss()` without the stylesheet.
35. **A space that stands alone between two tags is dropped** in the html template.
    `<b>${() => d.name}</b> <em>12</em>` renders "Name12".
    Write the space as `${" "}`, or keep it next to other text (`<b>Name</b>: <em>12</em>`).
36. **A Plot sits at `z-index: 1`.**
    A page element that overlaps a chart (a readout pinned with `position: sticky`, a menu that opens over the chart) is drawn under the slats unless its own `z-index` is 2 or more.
