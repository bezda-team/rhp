# rhp: reactive html plots

rhp builds plots out of HTML and CSS with [SolidJS](https://www.solidjs.com). A plot is a stack of **slats**. A slat is one component, the template for every row or column, and it is made of **blocks**: Bar, Dot, Tick, Label, Cell and Area. rhp creates one slat per data row and places it. When a value changes, only the expressions that read it re-run, and a block writes only the CSS variables that changed. There is no render loop and no virtual DOM.

Version 2 is a rewrite. v1 ("react html plots") was a React library in three packages (`rhp-core`, `rhp-base`, `rhp`); it stays on the `master` branch.

## Install

```sh
npm install @bezda/rhp solid-js
```

This is one package with one import. Solid is its only peer dependency. The CSS is injected by the package when the first chart mounts, so there is no stylesheet to import.

## A plot

```jsx
import { Chart, Plot, Bar, Label, slat, sortBy, series } from "@bezda/rhp";

const Row = slat({
  band: 32,                          // px per slat along the stack
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

## Same look in any app

Slats are meant to be shared, so a slat looks and lays out the same in every app:

- **The slat owns its CSS and its sizes.** Its `css` applies to that slat type's own slats only (the slat root included). It never reaches the page or another slat type. `band`, `inset` and `room` are its layout.
- **The app passes a theme object.** The keys are `series` (a list), `positive`, `negative`, `ink`, `muted`, `grid`, `surface`, `low`, `high` and `font`. Pass it with `<Theme value={…}>` around the app, or with `theme` on a Chart. Every `color` prop takes a theme key (`"series-3"`, `"positive"`) or any CSS color.
- **No page stylesheet changes a chart.** Every declaration rhp or a slat makes is `!important` inside `@layer rhp.place, rhp.slat, rhp.core`, and that layer order is declared first in the document. A zero-specificity guard covers the box, text and paint properties of rhp's elements, and the chart body inherits nothing from the page.
- **The page still controls the chart root's box**: width, margin, display, background and border, everything except its padding, which holds the gutters. It also controls opacity, cursor, filter and transform on any element.

Charts are plain DOM, with no shadow root. `querySelector`, Testing Library, page click listeners and app classes for properties rhp doesn't set all keep working.

## Scripts

| | |
|---|---|
| `npm run build` | `dist/index.js`, the package: one ES module, Solid left to the app. |
| `npm run gallery` | `examples/gallery/out/slat-gallery.html`: 20 plots, each one slat, in both orientations and both animation versions. |
| `npm test` | Builds the test pages and the gallery, then checks them in Chromium with Playwright. Set `CHROMIUM=/path/to/chrome` to pick a browser. |

## Layout

- `src/plot.jsx`: Plot, Chart, Axis, Theme.
- `src/blocks.jsx`: Bar, Dot, Tick, Label, Cell, Area.
- `src/style.js`: CSS injection, `slat()`, and the scoping of slat CSS.
- `src/rhp.css`: the core CSS, including the guard.
- `src/animate.js`: the JS version's page clock.
- `src/data.js`: `sortBy`, `cycle`, `nice`, `extent`, `stackUp`, `shares`, `running`, `summary`, `bins`, `density`.

Server rendering is not supported yet. The package is browser-only for now.
