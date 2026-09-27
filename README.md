# rhp: reactive html plots

Website, with the guides and a gallery of live charts: https://rhp.vercel.app

rhp builds plots out of HTML and CSS with [SolidJS](https://www.solidjs.com). A plot is a stack of **slats**. A slat is one component, the template for every row or column, and it is made of **blocks**: Bar, Dot, Tick, Label, Cell and Area. rhp creates one slat per data row and places it. When a value changes, only the expressions that read it re-run, and a block writes only the CSS variables that changed. There is no render loop and no virtual DOM.

Version 2 is a rewrite. v1 ("react html plots") was a React library in three packages (`rhp-core`, `rhp-base`, `rhp`); its code is on the `v1` branch.

## Install

```sh
npm install @bezda/rhp solid-js
```

This is one package with one import. Solid is its only peer dependency. The CSS is injected by the package when the first chart mounts, so there is no stylesheet to import.

In a React app, `@bezda/rhp-react` (in `react/`) turns an rhp chart into a React component: `` toReact((props) => html`…`) ``, where `props` follows the component's props item by item. See its README.

With no build step, a page can import `@bezda/rhp/standalone`, one module with Solid included (29 kB gzipped), from a CDN. Slats are then written with Solid's `html` template tag instead of JSX, and a value that changes is wrapped in a function:

```html
<script type="module">
  import { Chart, Plot, Bar, Label, slat, html, render } from "https://cdn.jsdelivr.net/npm/@bezda/rhp@2/dist/standalone.js";

  const Row = slat({}, (d) => html`<div>
    <${Label} edge="start">${() => d.name}<//>
    <${Bar} to=${() => d.value} />
  </div>`);

  render(() => html`<${Chart} scale=${[0, 30]}>
    <${Plot} name=${["Apple", "Kiwi"]} value=${[12, 18]}>${Row}<//>
  <//>`, document.body);
</script>
```

## A plot

```jsx
import { Chart, Plot, Bar, Label, slat, sortBy, series } from "@bezda/rhp";

const Row = slat({
  thickness: 32,                     // px per slat along the stack
  room: { start: 104, end: 44 },     // px its labels need outside the plot
  css: `.slat:hover { background: color-mix(in srgb, var(--rhp-ink) 6%, transparent); }`,
}, (d) => (
  <div class="slat">
    <Label edge="start">{d.name}</Label>
    <Bar to={d.value} color={d.color} />
    <Label at={d.value}>{d.value}</Label>
  </div>
));

<Chart scale={[0, 30]} orientation="horizontal">
  <Plot name={["Apple", "Kiwi", "Lemon"]} value={values()} color={series()} order={sortBy("value", "desc")}>
    {Row}
  </Plot>
</Chart>
```

- Any Plot prop that is not a setting is a **data group**. Item i of each list goes to slat i as `d.name`, `d.value` and so on, and the longest list sets the slat count. A function of `d` is computed per slat and cached.
- `order` is a list of positions, or a function that returns one (`sortBy` is one such function). The slats slide to their positions and no DOM node moves.
- `key` gives rows an identity, so a removed row takes its own slat with it.
- `animate` on a Chart or Plot switches from CSS transitions to the JS version, where the numbers themselves move on one page clock.
- `static` on a Chart is for data that doesn't change: each row is drawn once and keeps no signals, memos or effects, so a chart of 1,000 rows holds a sixth of the memory. If the Plot's data, order or direction does change, every row is drawn again, without animation. Hover styles, themes, resizing and the scale still work. A Plot can set `static` on its own, for a still layer under a live one.

## Scales

A Chart draws a plain axis from `ticks` and `format`. To draw the scale your own way, put a `Scale` in the Chart. It is a Plot of ticks taken from the Chart's scale: one slat per tick, all in one band, keyed by value.

```jsx
import { Chart, Scale, Plot, Tick, Label, every } from "@bezda/rhp";

<Chart scale={[0, max()]}>
  <Scale ticks={every(5, { ends: true })}>
    {(t) => <div><Tick at={t.at} thick={1} /><Label at={t.at}>{t.at}</Label></div>}
  </Scale>
  <Plot name={names} value={values()}>{Row}</Plot>
</Chart>
```

- `ticks` is a list, a count of round values, or a function of the Chart's `[min, max]` such as `every(5)`.
- Each tick's slat sees `d.at`, `d.next` (the next tick), `d.first` and `d.last`. A slat can mark values or fill the intervals between them: bands, a ruler, a keyboard.
- `d.toEnd` is the tick's distance to the scale's end on screen, in px, measured. A slat can leave out a number that would run into the end: `class={d.toEnd < 30 ? "crowded" : ""}`. It works the same in every browser, where CSS arithmetic on container units does not (Safari).
- A tick at either end of the scale is keyed as that end, so the end line never slides when the max changes.
- A Chart with a Scale in it draws no axis of its own.

## Styling a slat

A slat's `css` is plain CSS for the classes you put in the slat.
Two additions cover what changes with the orientation:

- **`:horizontal` and `:vertical`** match a slat root or a block drawn in that orientation: `.bar:vertical { … }`, `.row:horizontal .name { … }`.
- **Knobs** are CSS variables rhp reads, named along the value axis, so one rule fits both orientations. The start is the scale's start side of a bar (its `from`), the end is its value (its `to`), also for a bar that runs backward.

| Knob | What it sets |
|---|---|
| `--rhp-radius` | a Bar's corners, one length (default 2px); for different corners, the next two or `border-radius` |
| `--rhp-start-radius`, `--rhp-end-radius` | the corners at one end: `--rhp-start-radius: 0` squares the base |
| `--rhp-gap` | empty space at a Bar's start: the gap between stacked segments or units |
| `--rhp-label-gap` | the space between a Label and its value, or the plot for an `edge` label |
| `--rhp-label-size` | a Label's font size (default 12px) |
| `--rhp-tick-width` | a Tick's width (default 2px) |
| `--rhp-cell-gap` | the space around a Cell (default 1px) |
| `--rhp-toward-end` | read it: the direction from a Bar's start to its end, for gradients: `linear-gradient(var(--rhp-toward-end), …)` |

Theme colors are `var(--rhp-ink)`, `var(--rhp-muted)`, `var(--rhp-series-1)` and so on, and a block's `color` is `var(--rhp-color)`.

## Interaction

- **Hover states are slat CSS.** `.row:hover .tip { opacity: 1 }` shows a value, lifts a mark or lights a band, with no state at all.
- **Put your own transitions on elements inside blocks.** rhp transitions a block's position and length (CSS version) or moves its numbers (JS version). A `transition` set on a block replaces rhp's, so the block would jump to new values. A medal's face inside a Dot, or a tag inside a Bar, can move and fade on its own time. `transition-delay` on a block is safe: it delays rhp's transition without replacing it.
- **Elements inside blocks meet the page's CSS.** The guard covers rhp's blocks and slat roots, not what a slat puts in them, so give inner elements class names a page won't use.
- **Handlers go on blocks or around the chart.** Blocks take `onClick`, `data-*` and `aria-*` like plain elements. A handler on an element around the chart can read `e.target.closest("[data-app]")`. Whatever it decides goes back into the Plot as data (`focus={app()}`), and the slats restyle from `d.focus`.
- **A Plot drawn over another takes the pointer.** Its box covers the chart. Give an overlay (a today line, a crosshair) `style={{ "pointer-events": "none" }}` so the pointer reaches the Plot under it.
- **Follow the pointer with `pointermove`, not `pointerover`.** When a hover changes the layout (a badge appears), the browser fires `pointerover` under a pointer that hasn't moved, and the choice can flip back.

## Screen readers

A chart reads as what it shows, with nothing to set up:

- **A Chart with a `label` is a figure with that name**: `<Chart label="Fruit sold this week">`. It also takes `aria-labelledby`, `aria-describedby` and any other `aria-*` prop, and `id`.
- **A Plot is a list, and each row a list item**, read in the order the rows are shown. Sorted rows slide on screen but keep their place in the page, so a sorted Plot lists them in display order in `aria-owns`, and gives each row an id for it (a slat's own id, if it sets one).
- **A row reads its text**: its Labels and anything else the slat writes. A row that shows only shapes (a bar with no value) needs words: add a Label, or text a screen reader reads but the page doesn't show (a visually hidden class, in the slat's CSS).
- **A slat root with a role of its own keeps it** (`role="group"`, a button). The axis and a Scale are left out: their numbers are for the eye.

## On a server

rhp draws charts on a server too, as HTML, with Solid's `renderToString` (SolidStart, Astro, or your own server). The page then shows the charts before any script runs, and the browser takes them over (`hydrate`) without drawing them again.

- **Nothing to change in the app.** `@bezda/rhp` resolves to its server build where Solid resolves to its own (Node, Deno, workers), and to its browser build in a browser.
- **The CSS comes with the charts.** Each chart writes the CSS it needs into the page (rhp's core once per render, and its slat types' CSS), and the browser swaps it for its own sheets when it takes over.
- **What a server can't know** it leaves to the browser: a Scale's `d.toEnd` (px measured on screen) is `Infinity` until then, and animations start from the first values the browser sees.

## Same look in any app

Slats are meant to be shared, so a slat looks and lays out the same in every app:

- **The slat owns its CSS and its sizes.** Its `css` applies to that slat type's own slats only (the slat root included). It never reaches the page or another slat type. `thickness`, `inset` and `room` are its layout.
- **A style editor can change a slat type's CSS live.** `restyle(Row, css)` rewrites that type's one stylesheet, and every slat of the type restyles in place without being made again. Half-typed CSS still stays inside the slat.
- **The app passes a theme object.** The keys are `series` (a list), `positive`, `negative`, `ink`, `muted`, `grid`, `surface`, `low`, `high` and `font`. Pass it with `<Theme value={…}>` around the app, or with `theme` on a Chart. Every `color` prop takes a theme key (`"series-3"`, `"positive"`) or any CSS color.
- **No page stylesheet changes a chart.** Every declaration rhp or a slat makes is `!important` inside `@layer rhp.place, rhp.slat, rhp.core`, and that layer order is declared first in the document. A zero-specificity guard covers the box, text and paint properties of rhp's elements, and the chart body inherits nothing from the page.
- **The page still controls the chart root's box**: width, margin, display, background and border, everything except its padding, which holds the gutters. It also controls opacity, cursor, filter and transform on any element.

A change reaches a chart's elements in the next frame, the one that shows it (Safari's transitions stall when a value changes outside a frame). Code that measures a block right after changing data, in a test for example, waits for a frame first: `await new Promise(requestAnimationFrame)`.

Charts are plain DOM, with no shadow root. `querySelector`, Testing Library, page click listeners and app classes for properties rhp doesn't set all keep working.

## Scripts

| | |
|---|---|
| `npm run build` | `dist/index.js`, the package: one ES module, Solid left to the app; `dist/server.js`, the same for a server; `dist/standalone.js`, rhp and Solid in one module for pages with no build step. |
| `npm run gallery` | `examples/gallery/out/slat-gallery.html`: 20 plots, each one slat, in both orientations and both animation versions. The first three replicate v1's demos with v1's assets (`examples/gallery/assets`); the others are magazine-style pieces. |
| `npm test` | Builds the test pages and the gallery, then checks them in Chromium with Playwright. Set `CHROMIUM=/path/to/chrome` to pick a browser. |
| `bench/` | rhp against eleven other chart setups (Chart.js, ECharts, Recharts, D3, Charts.css…): mount, update, drag, size and memory in Chrome, Safari, Firefox and WebKit. Results in `bench/RESULTS.md`, how to run in `bench/README.md`. |

## Layout

- `src/plot.jsx`: Plot, Scale, Chart, Axis, Theme.
- `src/blocks.jsx`: Bar, Dot, Tick, Label, Cell, Area.
- `src/style.js`: CSS injection, `slat()`, and the scoping of slat CSS.
- `src/rhp.css`: the core CSS, including the guard.
- `src/animate.js`: the JS version's page clock.
- `src/data.js`: `sortBy`, `cycle`, `every`, `nice`, `extent`, `stackUp`, `shares`, `running`, `summary`, `bins`, `density`.

Server rendering is not supported yet. The package is browser-only for now.
