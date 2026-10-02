# rhp: reactive html plots

Website, with the guides and a gallery of live charts: https://rhp.vercel.app

rhp builds plots out of HTML elements placed by CSS with [SolidJS](https://www.solidjs.com), rather than drawing them into an SVG or a canvas. You never write HTML: you write Solid components, and rhp puts the elements in the page. A plot is a stack of **slats**. A slat is one component, the template for every row or column, and it is made of **blocks**: Bar, Dot, Tick, Label, Cell, Place, Area and Line. rhp creates one slat per data row and places it. When a value changes, only the expressions that read it re-run, and a block writes only the CSS variables that changed. There is no render loop and no virtual DOM.

Version 2 started as a simplification of v1's design, then improved on its performance and functionality. v1 ("react html plots") was a React library in three packages (`rhp-core`, `rhp-base`, `rhp`); its code is on the `v1` branch.

## Install

```sh
npm install @bezda/rhp solid-js
```

This is one package with one import. Solid is its only peer dependency. The CSS is injected by the package when the first chart mounts, so there is no stylesheet to import.

The package picks its build where it is used: a Solid app's own build (SolidStart, Astro, Vite with vite-plugin-solid) takes its source and compiles it with the app, for the server and for the browser; elsewhere, Node, Deno and workers get its server build, and a browser its browser build.

In a React app, `@bezda/rhp-react` (in `react/`) turns an rhp chart into a React component: `` toReact((props) => html`…`) ``, where `props` follows the component's props item by item. See its README.

With no build step, a page can import `@bezda/rhp/standalone`, one module with Solid included (29 kB gzipped), from a CDN. Slats are then written with Solid's `html` template tag instead of JSX, and a value that changes is wrapped in a function:

```html
<script type="module">
  import { Chart, Plot, Bar, Label, slat, html, render } from "https://cdn.jsdelivr.net/npm/@bezda/rhp@2/dist/standalone.js";

  const Fruit = slat({}, (d) => html`<div>
    <${Label} edge="start">${() => d.name}<//>
    <${Bar} to=${() => d.value} />
  </div>`);

  render(() => html`<${Chart} scale=${[0, 30]}>
    <${Plot} name=${["Apple", "Kiwi"]} value=${[12, 18]}>${Fruit}<//>
  <//>`, document.body);
</script>
```

## A plot

```jsx
import { Chart, Plot, Bar, Label, slat, sortBy, series } from "@bezda/rhp";

const Fruit = slat({
  thickness: 32,                     // px per slat along the stack
  room: { start: 104, end: 44 },     // px its labels need outside the plot, or "auto"
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
    {Fruit}
  </Plot>
</Chart>
```

- Any Plot prop that is not a setting is a **data group**. Item `i` of each list goes to slat `i` as `d.name`, `d.value` and so on, and the longest list sets the slat count. A function of `d` is computed per slat and cached, and computed again when the group is given a new function.
- `order` is a list of positions, or a function that returns one (`sortBy` is one such function). The slats slide to their positions and no DOM node moves.
- `key` gives rows an identity, so a removed row takes its own slat with it.
- `animate` on a Chart or Plot switches from CSS transitions to the JS version, where the numbers themselves move on one page clock.
- `room` is the space outside the plot, in px, for what a slat draws there: names at the start, values at the end, and before and after the stack. With `room: "auto"` (or `start: "auto"`, `end: "auto"`), a side is as wide as its widest edge label, in CSS, the same on a server; a slat's CSS sizes those labels (`max-width`, wrapping) and the gutter follows, up to `--rhp-gutter-max` (40% of the chart). A side given in px stays as it is. Only an edge label that is a child of the slat's root element is measured, and rhp warns about one inside another element. When the widest label changes, the gutter and the track resize at once, without animating. Auto gutters lay slats out as a grid that spans the gutters (a slat's background reaches under its name), and every change to an edge label lays out all the slats again, which Safari is slowest at. Give `room` in px for hundreds of slats, for names that change often (new data, or `reorder="refill"`), or when many of your readers use Safari. In Firefox, a name that wraps onto more lines under a column (vertical) needs `room` in px: Firefox sizes that gutter for one line.
- `static` on a Chart is for data that doesn't change: each slat is drawn once and keeps no signals, memos or effects, so a chart of 1,000 slats holds a sixth of the memory. If the Plot's data, order or direction does change, every slat is drawn again, without animation. Hover styles, themes, resizing and the scale still work. A Plot can set `static` on its own, for a still layer under a live one.

## Scales

A Chart draws a plain axis from `ticks` and `format`. To draw the scale your own way, put a `Scale` in the Chart. It is a Plot of ticks taken from the Chart's scale: one slat per tick, all in one band, keyed by value.

```jsx
import { Chart, Scale, Plot, Tick, Label, every } from "@bezda/rhp";

<Chart scale={[0, max()]}>
  <Scale ticks={every(5, { ends: true })}>
    {(t) => <div><Tick at={t.at} thick={1} /><Label at={t.at}>{t.at}</Label></div>}
  </Scale>
  <Plot name={names} value={values()}>{Slat}</Plot>
</Chart>
```

- `ticks` is a list, a count of round values, or a function of the Chart's `[min, max]` such as `every(5)`.
- Each tick's slat sees `d.at`, `d.next` (the next tick), `d.first` and `d.last`. A slat can mark values or fill the intervals between them: bands, a ruler, a keyboard.
- A number can be left out when it would run into the scale's end, in CSS: a Label's room from its value to the end is `calc((1 - var(--rhp-p)) * 100%)` in its `max-width` (vertical: `max-height`), so `max-width: calc(((1 - var(--rhp-p)) * 100% - 30px) * 1000); overflow: hidden` gives a number with less than 30px no size at all. It is the same on a server and in every browser. `d.toEnd` is the same distance in px, measured on screen, for code; it is `Infinity` until the browser has measured it.
- A tick at either end of the scale is keyed as that end, so the end line never slides when the max changes.
- A Chart with a Scale in it draws no axis of its own.
- A value past the scale: a Bar stops at the scale's end.
  A value Label stays at the end on the side where the page would grow (past the end of a horizontal chart, below the start of a vertical one), still showing its value, and on the other side it is drawn where its value is.
  A Dot, Tick or Place is always drawn where its value is, so one far past the end can widen the page: give the slat's root `overflow: clip` to keep them inside the plot.

## A second axis

`cross={[min, max]}` on a Chart adds a second scale that runs across the slats, for scatter plots and line charts.
It is optional: a Chart without it draws as it always has, and the CSS for it is added the first time a chart has one.

```jsx
import { Chart, Plot, Dot, Label, Line } from "@bezda/rhp";

<Chart scale={[1, 12]} cross={[0, 30]} height={240} crossFormat={(v) => v + "°"}>
  <Plot overlap month={months} temp={temps()}>
    {(d) => <div><Dot at={d.month} cross={d.temp} /><Label at={d.month} cross={d.temp}>{d.temp}</Label></div>}
  </Plot>
  <Plot overlap points={[trend()]}>{(d) => <div><Line points={d.points} /></div>}</Plot>
</Chart>
```

- An overlap Plot's slats all share the whole plot, so a Dot or Label with `cross` sits at its `at` on the scale and its `cross` on the cross scale.
  In a horizontal Chart the scale runs left to right and the cross scale bottom to top; in a vertical Chart, the other way round.
- `Line` draws a line through `[x, y]` points, with x on the scale and y on the cross scale.
  `fill` fills under it, down to `base` (0 by default).
  Points out of x's order make a connected scatter plot.
- Without a cross scale, a Line in a slat is a sparkline: its y runs across the slat's band, up to `peak` (the largest y by default).
- The Chart draws the cross axis from `crossTicks` and `crossFormat`, like `ticks` and `format`, and makes room for its numbers.
  A horizontal Chart with a cross scale is 240px tall unless `height` says otherwise.
  An overlap Plot on a cross scale gets no room for names, since its points have none.

## A fixed shape

`aspect={16 / 9}` on a Chart fixes its shape: at any width, the whole chart, its room included, is that many times as wide as it is tall.
It is CSS's `aspect-ratio`, so the shape holds from the first paint and on a server, with nothing measured.
The chart's height then comes from its width, so `height` is ignored.
A horizontal chart's slats without a thickness share that height, and slats with one keep theirs.
Without `aspect`, a chart lays out as it always has: its width from the page, its height from `height` or its slats.

## Posters

`<Poster>` is the panel the gallery's examples sit in: a kicker, a headline, a dek, the chart and a note.
It is markup only. `look` adds a class for its look, and any other prop goes on its `<figure>`.

```jsx
import { Poster, Chart } from "@bezda/rhp";
import "@bezda/rhp/posters.css"; // the gallery's looks, if you want them

<Poster look="day" kicker="A day" title="Four hours to yourself" dek="…" note="Illustrative.">
  <Chart …>…</Chart>
</Poster>
```

The looks are a stylesheet of their own, so a page that doesn't import it pays nothing for them.
They are plain page CSS, outside rhp's layers, so a page's own rules can change any of them.
They name their fonts (Bricolage Grotesque, Fraunces, Barlow Condensed and IBM Plex Mono) and fall back to the system's.

## Styling a slat

A slat's `css` is plain CSS for the classes you put in the slat.
Two additions cover what changes with the orientation:

- **`:horizontal` and `:vertical`** match a slat root or a block drawn in that orientation: `.bar:vertical { … }`, `.slat:horizontal .name { … }`.
- **A look is a list of CSS.** `css: [WEATHER, own]` takes someone else's look as it is and adds to it, and the pieces are joined in order, so yours wins. A look with its layout is an ordinary object to export and import: `slat(WEATHER, (d) => …)`.
- **A look aims at what rhp writes**, not at the class names one chart happens to use: `.rhp-bar`, `.rhp-dot`, `.rhp-tick`, `.rhp-cell`, `.rhp-label[data-rhp-edge="start"]` (the name beside a slat) and `.rhp-label[data-rhp-at]` (a value on the scale). Those are on every chart, so a look fits charts written before it. What is particular to one chart stays in that chart's own CSS.
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

## Hanging your own elements on the chart

A `Place` draws nothing. It has no size and no color, and whatever a slat puts inside it sits at its value, so an element of your own needs no CSS to find where it goes.

```jsx
<Place at={d.value} part="note"><span class="bubble">{d.value} kg</span></Place>
```

`at` is the value axis, `across` (0 to 1) places it across the band, and on a Chart with a cross scale `cross` places it on that scale. It is the block for a bubble, a badge, a needle or a photo: the ones that are yours to draw, where rhp only has to say where.

## Interaction

- **Hover states are slat CSS.** `.slat:hover .tip { opacity: 1 }` shows a value, lifts a mark or lights a band, with no state at all.
- **Put your own transitions on elements inside blocks.** rhp transitions a block's position and length (CSS version) or moves its numbers (JS version). A `transition` set on a block replaces rhp's, so the block would jump to new values. A medal's face inside a Dot, or a tag inside a Bar, can move and fade on its own time. `transition-delay` on a block is safe: it delays rhp's transition without replacing it.
- **Elements inside blocks meet the page's CSS.** The guard covers rhp's blocks and slat roots, not what a slat puts in them, so give inner elements class names a page won't use.
- **Handlers go on blocks or around the chart.**
  Blocks take `onClick`, `data-*` and `aria-*` like plain elements, and a slat's root is an ordinary element, so a slat wires its own handlers and already knows its row: `(d) => <div onClick={() => pick(d.index)}>`.
  A handler on an element around the chart reads the row from the event instead (`e.target.closest("[data-row]")`).
  Whatever it decides goes back into the Plot as data (`focus={app()}`), and the slats restyle from `d.focus`.
- **A Plot drawn over another takes the pointer.** Its box covers the chart. Give an overlay (a today line, a crosshair) `style={{ "pointer-events": "none" }}` so the pointer reaches the Plot under it.
- **Keyboard: `keyboard` on a Plot makes its slats take focus.**
  Tab stops at one slat (the slat focused last, or else the first shown), the arrow keys go to the slat shown before or after it, and Home and End to the first and the last.
  What a hover shows can show on focus too: `.slat:is(:hover, :focus-visible) .tip { opacity: 1 }` in the slat's CSS, or an `onFocus` handler on the slat.
  A slat keeps its focus when the rows are sorted, moved in the page or drawn again.
  A key that something inside the slat handles (a field, or a handler that calls `preventDefault`) stays with it.

**One element for the slat the reader is on.**
A tip, a callout, a menu or a readout shows for one slat at a time, so only one of them belongs in the page.
One in every slat, hidden until the reader is on it, puts a node per slat in the DOM tree to show a single node.
Holding the row the reader is on in a signal draws it in that slat alone, and rhp needs nothing of its own for it: the row is in the event, and a slat is an ordinary element.

```jsx
import { createSignal, createSelector, Show } from "solid-js";

const [on, setOn] = createSignal(null);   // the row the reader is on
const isOn = createSelector(on);          // only the slats that change are drawn again
const rowAt = (e) => { const el = e.target.closest("[data-row]"); return el ? +el.dataset.row : null; };

const Slat = slat({ thickness: 32, room: { start: 80, end: 40 } }, (d) => (
  <div data-row={d.index}>
    <Label edge="start">{d.name}</Label>
    <Bar to={d.value} />
    <Show when={isOn(d.index)}><Label at={d.value} class="tip">{d.value}</Label></Show>
  </div>
));

<div onPointerMove={(e) => setOn(rowAt(e))} onPointerDown={(e) => setOn(rowAt(e))}
  onPointerLeave={(e) => e.pointerType !== "touch" && setOn(null)}
  onFocusIn={(e) => setOn(rowAt(e))} onFocusOut={(e) => !e.currentTarget.contains(e.relatedTarget) && setOn(null)}>
  <Chart scale={[0, 30]}>
    <Plot name={names} value={values()} keyboard>{Slat}</Plot>
  </Chart>
</div>
```

- **The row comes from the event.**
  `data-row={d.index}` on the slat root names its row, and `closest` finds it from whatever the pointer is actually on, a block or an element inside one.
  An edge label is drawn outside the plot, in the gutter, and is still inside the slat root, so pointing at a name counts as pointing at its row.
  When rows come and go, hold the row's key rather than its number (`data-row={d.name}`, and drop the `+`), because removing a row moves the numbers of the rows after it.
- **`Show` is what saves the nodes.**
  The tip exists in the slat the reader is on and nothing is in the page for the others, so a chart of 500 slats holds one tip instead of 500.
  It is also where anything expensive belongs: an image, a sparkline, a menu, a panel of numbers.
- **`createSelector` keeps the work to two slats.**
  Moving from one slat to the next draws those two again, not all of them.
  The state passed in as a value (`on={on()}`) is read by every slat instead, which is the cost this pattern is here to avoid.
  A data group that is a function of the row (`on={(d) => isOn(d.index)}`) is worked out per slat and cached, so it stays at two.
- **Follow the pointer with `pointermove`, not `pointerover`.**
  When a hover changes the layout (a badge appears), the browser fires `pointerover` under a pointer that hasn't moved, and the choice can flip back.
  `pointerdown` covers a tap, and letting a `pointerleave` whose `pointerType` is `"touch"` pass keeps what the tap chose once the finger lifts.
- **`focusin` and `focusout` give a keyboard the same tip.**
  With `keyboard` on the Plot the slats take focus, so Tab and the arrow keys move the tip exactly as the pointer does.
  A tip that only follows `:hover` is nothing to a reader who doesn't use a pointer.
- **The state is yours.**
  A legend key, a click that pins a row (`on() ?? pinned()`), another chart or a timer can all write it, and rhp has no interaction state of its own to get in the way.
  It reaches anything outside the chart too, like a readout above it.
- **What isn't per slat is a Plot of its own.**
  A crosshair, a today line or a band across the plot is one Plot over the other, fed with the picked row's values: `<Plot overlap slats={on() == null ? 0 : 1} close={rows()[on()]?.close} style={{ "pointer-events": "none" }}>`.
  It draws nothing at all while nothing is picked.

## Screen readers

A chart reads as what it shows, with nothing to set up:

- **A Chart with a `label` is a figure with that name**: `<Chart label="Fruit sold this week">`. It also takes `aria-labelledby`, `aria-describedby` and any other `aria-*` prop, and `id`.
- **A chart's slats are a list**, each slat a list item, read in the order the slats are shown. Sorted slats slide on screen but keep their place in the page, so a sorted Plot lists them in display order in `aria-owns`, and gives each slat an id for it (a slat's own id, if it sets one). A Plot inside a slat (a heatmap's cells) and an overlap Plot (dots in one band, an overlay) are part of their slats, not lists of their own.
- **A slat reads its text**: its Labels and anything else the slat writes. A slat that shows only shapes (a bar with no value) needs words: add a Label, or text a screen reader reads but the page doesn't show (a visually hidden class, in the slat's CSS).
- **A slat root with a role of its own keeps it** (`role="group"`, a button). The axis and a Scale are left out: their numbers are for the eye.

## On a server

rhp draws charts on a server too, as HTML, with Solid's `renderToString` (SolidStart, Astro, or your own server). The page then shows the charts before any script runs, and the browser takes them over (`hydrate`) without drawing them again.

- **Nothing to change in the app.** A Solid app's build compiles rhp's source with the app; otherwise `@bezda/rhp` resolves to its server build where Solid resolves to its own (Node, Deno, workers), and to its browser build in a browser.
- **The CSS comes with the charts.** Each chart writes the CSS it needs into the page (rhp's core once per render, and its slat types' CSS), and the browser swaps it for its own sheets when it takes over.
- **Many charts, or islands (Astro): link the stylesheet once.** Each island is its own render, so each would bring rhp's core CSS. Link `@bezda/rhp/rhp.css` in the page's head instead (`import "@bezda/rhp/rhp.css"` with a bundler), and call `linkedCss()` where the app starts, on the server and in the browser: charts then leave the core out of their HTML, and the browser uses the page's copy. If the page doesn't link it after all, the first chart says so in the console and brings its own.
- **Charts with no JavaScript at all.** Render them without hydration (an Astro component with no `client:` directive, or `renderToString(() => <NoHydration><App /></NoHydration>)`), and the HTML and its CSS are the chart: for static pages and for PDFs printed from a browser. Email clients drop most of the CSS rhp uses (custom properties, layers), so it isn't for email.
- **Values from users stay values.** A value that would add a declaration of its own (a `;` or `!` outside its strings and brackets, or a bracket or quote it leaves open) is left out of the HTML, as a browser leaves it out, and a `</style` in a slat's CSS can't end the `<style>` it is written into.
- **What a server can't know** it leaves to the browser: `d.toEnd` (px measured on screen) is `Infinity` until then (the CSS above does the same job on the server), and animations start in the browser, from the values the page shows, as they do when the browser draws the chart itself.

## Same look in any app

Slats are meant to be shared, so a slat looks and lays out the same in every app:

- **The slat owns its CSS and its sizes.** Its `css` applies to that slat type's own slats only (the slat root included). It never reaches the page or another slat type. `thickness`, `inset` and `room` are its layout.
- **A style editor can change a slat type's CSS live.** `restyle(Slat, css)` rewrites that type's one stylesheet, and every slat of the type restyles in place without being made again. Half-typed CSS still stays inside the slat.
- **The app passes a theme object.** The keys are `series` (a list), `positive`, `negative`, `ink`, `muted`, `grid`, `surface`, `low`, `high` and `font`. Pass it with `<Theme value={…}>` around the app, or with `theme` on a Chart. Every `color` prop takes a theme key (`"series-3"`, `"positive"`) or any CSS color.
- **No page stylesheet changes a chart.** Every declaration rhp or a slat makes is `!important` inside `@layer rhp.place, rhp.slat, rhp.core`, and that layer order is declared first in the document. A zero-specificity guard covers the box, text and paint properties of rhp's elements, and the chart body inherits nothing from the page.
- **Marks stay visible in forced colors** (Windows contrast themes): bars, dots, ticks, cells, areas and lines keep their own colors, and bars, dots, ticks and cells get a 1px outline in the system's text color.
- **The page still controls the chart root's box**: width, margin, display, background and border, everything except its padding, which holds the gutters, and its height when it has an `aspect`. It also controls opacity, cursor, filter and transform on any element.

A change reaches a chart's elements in the next frame, the one that shows it (Safari's transitions stall when a value changes outside a frame).
A change made inside the app's own `requestAnimationFrame` callback can come after rhp's callback in that frame, and then shows a frame late; made inside `drawing()`, it reaches the elements at once: `requestAnimationFrame(() => drawing(() => setValue(v)))`.
Code that measures a block right after changing data, in a test for example, waits for a frame first: `await new Promise(requestAnimationFrame)`.

Charts are plain DOM, with no shadow root. `querySelector`, Testing Library, page click listeners and app classes for properties rhp doesn't set all keep working.

## Scripts

| | |
|---|---|
| `npm run build` | `dist/index.js`, the package: one ES module, Solid left to the app; `dist/server.js`, the same for a server; `dist/standalone.js`, rhp and Solid in one module for pages with no build step. |
| `npm run gallery` | `examples/gallery/out/slat-gallery.html`: 20 plots, each one slat, in both orientations and both animation versions. The first three replicate v1's demos with v1's assets (`examples/gallery/assets`); the others are magazine-style pieces. |
| `npm test` | Builds the test pages and the gallery, then checks them in Chromium with Playwright, and checks the types with `tsc`. Set `BROWSER=webkit` or `BROWSER=firefox` for the other engines (GitHub Actions runs all three on every push), or `CHROMIUM=/path/to/chrome` to pick a Chromium. |
| `bench/` | rhp against eleven other chart setups (Chart.js, ECharts, Recharts, D3, Charts.css…): mount, update, drag, size and memory in Chrome, Safari, Firefox and WebKit. Results in `bench/RESULTS.md`, how to run in `bench/README.md`. |

## Layout

- `src/plot.jsx`: Plot, Scale, Chart, Axis, Theme.
- `src/blocks.jsx`: Bar, Dot, Tick, Label, Cell, Area, Line.
- `src/poster.jsx`: Poster.
- `src/posters.css`: the gallery's poster looks, copied to `dist/posters.css` for a page that imports them. Not part of rhp's own CSS.
- `src/style.js`: CSS injection, `slat()`, the scoping of slat CSS, `linkedCss()` and the CSS a server writes.
- `src/rhp.css`: the core CSS, including the guard.
- `src/gutters.css`: gutters sized by their labels (`room: "auto"`), added the first time a chart asks for them.
- `src/cross.css`: the second axis (`cross`), added the first time a chart has one.
- `src/env.js`: whether rhp draws on a server (Solid's `isServer`); rhp's own builds make it a constant.
- `src/animate.js`: the JS version's page clock.
- `src/data.js`: `sortBy`, `cycle`, `every`, `nice`, `extent`, `stackUp`, `shares`, `running`, `summary`, `bins`, `density`.

Tests: `test/run.mjs` builds the pages, including an app rendered on a server and taken over in the browser (`test/ssr*.jsx`), rhp's whole gallery drawn the same way, and a Vite app that takes rhp's source (`test/vite`), then checks them in Chromium (or in WebKit or Firefox, with `BROWSER`).
