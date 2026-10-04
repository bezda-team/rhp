# Environments

## Contents

1. [Find the environment](#1-find-the-environment): the detection table
2. [The example chart](#2-the-example-chart): its data, its CSS, its fonts
3. [Plain HTML page](#3-plain-html-page)
4. [Solid](#4-solid): Vite, TypeScript, SolidStart
5. [Solid JSX and the html template](#5-solid-jsx-and-the-html-template): the conversion rules
6. [The chart module and the mount helper](#6-the-chart-module-and-the-mount-helper): for every app that is not a Solid app
7. [React](#7-react): the wrapper, Vite, TypeScript
8. [Next.js](#8-nextjs): App Router, Pages Router
9. [Vue and Nuxt](#9-vue-and-nuxt)
10. [Svelte and SvelteKit](#10-svelte-and-sveltekit)
11. [Angular](#11-angular)
12. [Astro](#12-astro): a custom element, or a Solid island
13. [Check a chart inside an app](#13-check-a-chart-inside-an-app)
14. [Caveats for every app](#14-caveats-for-every-app)
15. [What was verified, and the versions](#15-what-was-verified-and-the-versions)

Where an rhp chart goes in a plain HTML page and in Solid, React, Next.js, Vue, Nuxt, Svelte, SvelteKit, Angular and Astro apps.
Every section builds the same small poster chart, with its data passed in by the app, and every one was built and checked in a browser on 2026-10-03 with `@bezda/rhp` 2.0.1 (section 15).

## 1. Find the environment

Read package.json (`dependencies` and `devDependencies`) and the config files at the project's root.
Go down the table and take the first row that matches: Next.js apps also have `react`, Nuxt apps `vue`, SvelteKit apps `svelte`.

| Files | package.json has | Environment | Write the chart as | Section |
|---|---|---|---|---|
| no package.json; a chatbot answer; "an HTML file" | | plain page | one `.html` file, rhp from jsDelivr | 3 |
| `astro.config.*` | `astro` and `@astrojs/solid-js` | Astro with Solid | a Solid island (JSX) | 12 |
| `astro.config.*` | `astro` | Astro | a custom element drawing an html-template chart | 12 |
| `next.config.*`, `app/` or `src/app/` | `next` | Next.js App Router | a React component the server never renders | 8 |
| `next.config.*`, `pages/` or `src/pages/` | `next` | Next.js Pages Router | a React component loaded with `ssr: false` | 8 |
| `nuxt.config.*` | `nuxt` | Nuxt | a Vue component | 9 |
| `src/routes/`, `sveltekit()` in `vite.config.*` or a `svelte.config.*` | `@sveltejs/kit` | SvelteKit | a Svelte component | 10 |
| `src/entry-server.*`, `src/routes/` | `@solidjs/start` | SolidStart | a JSX component | 4 |
| `angular.json` | `@angular/core` | Angular | a standalone component | 11 |
| `vite.config.*` with `solid()` | `solid-js`, `vite-plugin-solid` | Solid | a JSX component | 4 |
| `vite.config.*` with `react()` | `react`, `react-dom` | React | a React component around an html-template chart | 7 |
| `vite.config.*` with `vue()` | `vue` | Vue | a Vue component | 9 |
| `vite.config.*` with `svelte()` | `svelte` | Svelte | a Svelte component | 10 |
| a bundler and none of the above | | modules | the chart module and `mountChart`, from the app's own script | 6 |

- When a Next.js app has both `app/` and `pages/`, the folder of the page that shows the chart decides.
- A `tsconfig.json` and `.ts` or `.tsx` sources mean TypeScript: each section has the typed files.
- `solid-js` in `node_modules` or in the lock file does not make a Solid app: npm installs it with `@bezda/rhp` in every app, as a peer dependency, and it is not added to package.json.
  Only `solid-js` in package.json, together with `vite-plugin-solid`, `@solidjs/start` or `@astrojs/solid-js`, makes a Solid app.
- Install in every app with the project's package manager: `npm install @bezda/rhp`.
  Only npm was tested; pnpm, yarn and bun were not.
- Not tested: React apps that render on a server outside Next.js (React Router in framework mode, Remix, Gatsby), Preact, Qwik, Lit, Ember, Nuxt 3, SvelteKit 2.
  For those, use section 6: draw the chart in the browser in the component's mount hook, dispose it in its unmount hook, and check the page in a browser.

## 2. The example chart

Every section builds the same poster: the seven tallest buildings as a ranked bar chart, with a one-line readout that names the tower the reader points at, taps, or reaches with Tab and the arrow keys.
Three parts are the same in every app.

**The data** comes from the app as `rows`, a list of `{ name, city, year, height }`.
Here it is a module of its own (`towers.js`); in a real app it comes from a fetch, a database or the page's server data, and reaches the chart the same way.

```js
// The seven tallest finished buildings, height to the architectural top in metres (CTBUH, 2025)
export const TOWERS = [
  { name: "Burj Khalifa", city: "Dubai", year: 2010, height: 828 },
  { name: "Merdeka 118", city: "Kuala Lumpur", year: 2023, height: 679 },
  { name: "Shanghai Tower", city: "Shanghai", year: 2015, height: 632 },
  { name: "Makkah Royal Clock Tower", city: "Mecca", year: 2012, height: 601 },
  { name: "Ping An Finance Center", city: "Shenzhen", year: 2017, height: 599 },
  { name: "Lotte World Tower", city: "Seoul", year: 2017, height: 555 },
  { name: "One World Trade Center", city: "New York", year: 2014, height: 541 },
];
```

**The poster's CSS** (`towers-chart.css`) is an ordinary stylesheet for the panel around the chart: the Poster's `figcaption`, `.kicker`, `.headline`, `.dek` and `.note`, and the readout.
The chart inside takes its look from the slat type's `css` and the Chart's `theme`, never from this file.

```css
/* The towers poster: the page's own CSS for the panel around the chart (rhp styles the chart itself) */
.towers { box-sizing: border-box; width: 100%; max-width: 880px; margin: 0 auto; padding: 28px 28px 20px; border-radius: 4px; color: #17191c; font: 15px/1.45 "Archivo", system-ui, sans-serif; letter-spacing: normal; text-align: start; background: linear-gradient(rgb(23 25 28 / .05) 1px, transparent 1px) 0 0 / 22px 22px, linear-gradient(90deg, rgb(23 25 28 / .05) 1px, transparent 1px) 0 0 / 22px 22px, #f3f1ec; box-shadow: 0 1px 2px rgb(0 0 0 / .08), 0 12px 32px rgb(0 0 0 / .1); }
.towers figcaption { display: grid; gap: 10px; margin-bottom: 18px; }
.towers .kicker { font-size: 12px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #c2381b; }
.towers .headline { font: 700 clamp(34px, 7vw, 60px)/.95 "Antonio", "Arial Narrow", sans-serif; text-transform: uppercase; text-wrap: balance; }
.towers .dek { max-width: 44ch; color: #4a4e55; }
.towers .readout { max-width: none; height: 22px; margin: 0 0 10px; font-size: 15px; line-height: 22px; white-space: nowrap; color: #4a4e55; }
.towers .readout b { color: #17191c; }
.towers .note { display: block; margin-top: 16px; font-size: 12px; color: #5d6168; }
@media (max-width: 480px) { .towers { padding: 20px 16px 16px; } .towers .readout { font-size: 13px; } }
```

The panel sets its own font, color, `letter-spacing` and `text-align`, and the readout sets `max-width: none` and its margins, because an app's own CSS reaches the poster (section 14).

**The fonts** are Antonio (the headline) and Archivo (the text) from Google Fonts.
Each section says where these tags go:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Antonio:wght@700&family=Archivo:wght@400;600;700&display=swap">
```

| Environment | The chart's files | The poster's CSS | The fonts | On the server |
|---|---|---|---|---|
| plain page | one `.html` file | `<style>` in the head | `<link>` in the head | no server |
| Solid | `TowersChart.jsx` | imported by `TowersChart.jsx` | `index.html` | no server |
| SolidStart | `TowersChart.jsx` | imported by `TowersChart.jsx` | `src/entry-server.jsx` | drawn, then hydrated |
| React | `Towers.jsx` | imported by `Towers.jsx` | `index.html` | no server |
| Next.js App Router | `Towers.tsx`, loaded by `ClientOnlyTowers.tsx` | imported by `ClientOnlyTowers.tsx` | `next/font` in `app/layout.tsx` | not drawn; rhp not loaded |
| Next.js Pages Router | `Towers.jsx`, loaded with `ssr: false` | imported by `pages/_app.js` | `pages/_document.js` | not drawn; rhp not loaded |
| Vue | `towers-chart.js`, `Towers.vue` | imported by `Towers.vue` | `index.html` | no server |
| Nuxt | `towers-chart.js`, `Towers.vue` | imported by `Towers.vue` | `nuxt.config.ts` | an empty box |
| Svelte | `towers-chart.js`, `Towers.svelte` | imported by `Towers.svelte` | `index.html` | no server |
| SvelteKit | `towers-chart.ts`, `Towers.svelte` | imported by `Towers.svelte` | `src/app.html` | an empty box |
| Angular | `towers-chart.ts`, `towers.ts` | `styleUrl` with `ViewEncapsulation.None` | `src/index.html` | not tested |
| Astro | `towers-chart.js`, `Towers.astro` | imported in the frontmatter | the page's `<head>` | an empty element |
| Astro with Solid | `TowersChart.jsx` as an island | imported by `TowersChart.jsx` | the page's `<head>` | drawn, then hydrated |

## 3. Plain HTML page

Use it when there is no project, in a chatbot's answer, or when the user asks for an HTML file.
rhp comes from jsDelivr through an import map, so the page needs no install and no build step.
Its module script has the sections every recipe has: data, slat types, the chart, then `render`.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The tallest buildings</title>
<script type="importmap">{ "imports": { "@bezda/rhp/standalone": "https://cdn.jsdelivr.net/npm/@bezda/rhp@2/dist/standalone.js" } }</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Antonio:wght@700&family=Archivo:wght@400;600;700&display=swap">
<style>
  body { margin: 0; padding: 32px 16px; background: #d9d7d2; }
  .towers { box-sizing: border-box; width: 100%; max-width: 880px; margin: 0 auto; padding: 28px 28px 20px; border-radius: 4px; color: #17191c; font: 15px/1.45 "Archivo", system-ui, sans-serif; letter-spacing: normal; text-align: start; background: linear-gradient(rgb(23 25 28 / .05) 1px, transparent 1px) 0 0 / 22px 22px, linear-gradient(90deg, rgb(23 25 28 / .05) 1px, transparent 1px) 0 0 / 22px 22px, #f3f1ec; box-shadow: 0 1px 2px rgb(0 0 0 / .08), 0 12px 32px rgb(0 0 0 / .1); }
  .towers figcaption { display: grid; gap: 10px; margin-bottom: 18px; }
  .towers .kicker { font-size: 12px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #c2381b; }
  .towers .headline { font: 700 clamp(34px, 7vw, 60px)/.95 "Antonio", "Arial Narrow", sans-serif; text-transform: uppercase; text-wrap: balance; }
  .towers .dek { max-width: 44ch; color: #4a4e55; }
  .towers .readout { max-width: none; height: 22px; margin: 0 0 10px; font-size: 15px; line-height: 22px; white-space: nowrap; color: #4a4e55; }
  .towers .readout b { color: #17191c; }
  .towers .note { display: block; margin-top: 16px; font-size: 12px; color: #5d6168; }
  @media (max-width: 480px) { .towers { padding: 20px 16px 16px; } .towers .readout { font-size: 13px; } }
</style>
</head>
<body>
<div id="chart"></div>
<script type="module">
  import { Chart, Plot, Bar, Label, Poster, slat, sortBy, html, render, createSignal, createMemo, Show } from "@bezda/rhp/standalone";

  // Data: the seven tallest finished buildings, height to the architectural top in metres (CTBUH, 2025)
  const TOWERS = [
    { name: "Burj Khalifa", city: "Dubai", year: 2010, height: 828 },
    { name: "Merdeka 118", city: "Kuala Lumpur", year: 2023, height: 679 },
    { name: "Shanghai Tower", city: "Shanghai", year: 2015, height: 632 },
    { name: "Makkah Royal Clock Tower", city: "Mecca", year: 2012, height: 601 },
    { name: "Ping An Finance Center", city: "Shenzhen", year: 2017, height: 599 },
    { name: "Lotte World Tower", city: "Seoul", year: 2017, height: 555 },
    { name: "One World Trade Center", city: "New York", year: 2014, height: 541 },
  ];

  // Slat types: one tower, with its name, its bar (one line per floor) and its height; the tower the reader is on turns red
  const Tower = slat({
    thickness: 44,
    room: { start: "auto", end: 60 },
    css: `
      .tower { cursor: default; outline: none; }
      .tower:focus-visible { background: rgb(23 25 28 / .06); }
      .name { max-width: 10em; font-size: 14px; font-weight: 600; line-height: 1.15; white-space: normal; text-align: end; }
      .bar { --rhp-radius: 0px; background: repeating-linear-gradient(var(--rhp-toward-end), #2a2e34 0 6px, #464b53 6px 7px); }
      .on .bar { background: repeating-linear-gradient(var(--rhp-toward-end), #c2381b 0 6px, #d9614a 6px 7px); }
      .height { font-size: 13px; font-weight: 700; color: var(--rhp-muted); }
      .on .height { color: #c2381b; }
    `,
  }, (d) => html`
    <div class=${() => (d.on ? "tower on" : "tower")} data-name=${() => d.name}>
      <${Label} edge="start" class="name">${() => d.name}<//>
      <${Bar} to=${() => d.height} class="bar" />
      <${Label} at=${() => d.height} class="height">${() => d.height} m<//>
    </div>`);

  // The chart: a poster with a one-line readout over the towers, ranked by height.
  // Its data comes in as props.rows, a list of { name, city, year, height }.
  function TowersChart(props) {
    const [on, setOn] = createSignal(null); // the name of the tower the reader picked
    const current = createMemo(() => props.rows.find((t) => t.name === on()));
    const tallest = createMemo(() => Math.max(...props.rows.map((t) => t.height)));
    // The name of the tower an element is in, or null (between towers, on the text)
    const nameOf = (el) => el.closest("[data-name]")?.dataset.name ?? null;
    // A mouse or a pen picks as it moves, a tap or a click picks, the keyboard picks; on no tower the pick stays
    const pick = (e) => {
      const name = nameOf(e.target);
      if (name != null) setOn(name);
    };
    // Leaving the poster: back to the tower that has focus (a keyboard's or a click's pick), or none
    const leave = (e) => {
      if (e.pointerType === "touch") return; // a finger sends pointerleave as it lifts after a tap
      setOn(e.currentTarget.contains(document.activeElement) ? nameOf(document.activeElement) : null);
    };

    return html`
      <${Poster} class="towers"
        kicker="Skyscrapers, 2025"
        title=${"Burj Khalifa still towers 149\u00a0m over the rest"}
        dek="The seven tallest finished buildings in the world, by height to their architectural top."
        note="Source: Council on Tall Buildings and Urban Habitat (CTBUH), 2025."
        onPointerMove=${(e) => e.pointerType !== "touch" && pick(e)}
        onClick=${pick}
        onFocusIn=${pick}
        onPointerLeave=${leave}
        onFocusOut=${(e) => !e.currentTarget.contains(e.relatedTarget) && setOn(null)}>
        <p class="readout">
          <${Show} when=${current} fallback="Point at a tower, tap it, or Tab to it.">
            ${(t) => html`<b>${() => t().name}</b> in ${() => t().city}, finished ${() => t().year}`}
          <//>
        </p>
        <${Chart} scale=${() => [0, tallest()]} ticks=${false} label="The seven tallest buildings, by height"
          theme=${{ font: '"Archivo", system-ui, sans-serif', ink: "#17191c", muted: "#5d6168" }}>
          <${Plot} rows=${() => props.rows} key="name" order=${sortBy("height", "desc")} on=${(d) => on() === d.name} keyboard=${true}>${Tower}<//>
        <//>
      <//>`;
  }

  // Render: the chart into #chart, with its data
  render(() => TowersChart({ rows: TOWERS }), document.getElementById("chart"));
</script>
</body>
</html>
```

- It opens from the disk (`file://`) in Chrome 154, Safari 26.5 and Firefox 155 (Playwright's build), and from any web server.
- Keep the module script inline.
  A page that loads its own module file (`<script type="module" src="chart.js">`) does not run from the disk in Chrome (a blocked cross-origin request) or in Safari; it runs in Firefox, and in every browser when the folder is served (`npx serve`).
- `@bezda/rhp@2` in the URL takes the latest rhp 2 release.
  Pin the version (`@bezda/rhp@2.0.1`) for a page that must never change.

## 4. Solid

Detect: `solid-js` and `vite-plugin-solid` in package.json (Vite), or `@solidjs/start` (SolidStart).
Install: `npm install @bezda/rhp`; it uses the app's own `solid-js` (rhp needs 1.9 or a later 1.x).
Import rhp from `@bezda/rhp` and Solid from `solid-js`, never from `@bezda/rhp/standalone`, which carries a second copy of Solid.

```
index.html                    the fonts (section 2)
src/charts/TowersChart.jsx    the chart, a Solid component
src/charts/towers-chart.css   the poster's CSS (section 2)
src/data/towers.js            the data (section 2)
src/App.jsx                   the app passes its data
```

`src/charts/TowersChart.jsx` is the JSX version of section 3's chart, line for line (section 5 has the rules):

```jsx
// The towers poster in a Solid app: rhp with JSX
import { createMemo, createSignal, Show } from "solid-js";
import { Chart, Plot, Bar, Label, Poster, slat, sortBy } from "@bezda/rhp";
import "./towers-chart.css";

// Slat types: one tower, with its name, its bar (one line per floor) and its height; the tower the reader is on turns red
const Tower = slat({
  thickness: 44,
  room: { start: "auto", end: 60 },
  css: `
    .tower { cursor: default; outline: none; }
    .tower:focus-visible { background: rgb(23 25 28 / .06); }
    .name { max-width: 10em; font-size: 14px; font-weight: 600; line-height: 1.15; white-space: normal; text-align: end; }
    .bar { --rhp-radius: 0px; background: repeating-linear-gradient(var(--rhp-toward-end), #2a2e34 0 6px, #464b53 6px 7px); }
    .on .bar { background: repeating-linear-gradient(var(--rhp-toward-end), #c2381b 0 6px, #d9614a 6px 7px); }
    .height { font-size: 13px; font-weight: 700; color: var(--rhp-muted); }
    .on .height { color: #c2381b; }
  `,
}, (d) => (
  <div class={d.on ? "tower on" : "tower"} data-name={d.name}>
    <Label edge="start" class="name">{d.name}</Label>
    <Bar to={d.height} class="bar" />
    <Label at={d.height} class="height">{d.height} m</Label>
  </div>
));

// The chart: a poster with a one-line readout over the towers, ranked by height.
// Its data comes in as props.rows, a list of { name, city, year, height }.
export function TowersChart(props) {
  const [on, setOn] = createSignal(null); // the name of the tower the reader picked
  const current = createMemo(() => props.rows.find((t) => t.name === on()));
  const tallest = createMemo(() => Math.max(...props.rows.map((t) => t.height)));
  // The name of the tower an element is in, or null (between towers, on the text)
  const nameOf = (el) => el.closest("[data-name]")?.dataset.name ?? null;
  // A mouse or a pen picks as it moves, a tap or a click picks, the keyboard picks; on no tower the pick stays
  const pick = (e) => {
    const name = nameOf(e.target);
    if (name != null) setOn(name);
  };
  // Leaving the poster: back to the tower that has focus (a keyboard's or a click's pick), or none
  const leave = (e) => {
    if (e.pointerType === "touch") return; // a finger sends pointerleave as it lifts after a tap
    setOn(e.currentTarget.contains(document.activeElement) ? nameOf(document.activeElement) : null);
  };

  return (
    <Poster class="towers"
      kicker="Skyscrapers, 2025"
      title={"Burj Khalifa still towers 149\u00a0m over the rest"}
      dek="The seven tallest finished buildings in the world, by height to their architectural top."
      note="Source: Council on Tall Buildings and Urban Habitat (CTBUH), 2025."
      onPointerMove={(e) => e.pointerType !== "touch" && pick(e)}
      onClick={pick}
      onFocusIn={pick}
      onPointerLeave={leave}
      onFocusOut={(e) => !e.currentTarget.contains(e.relatedTarget) && setOn(null)}>
      <p class="readout">
        <Show when={current()} fallback="Point at a tower, tap it, or Tab to it.">
          {(t) => <><b>{t().name}</b> in {t().city}, finished {t().year}</>}
        </Show>
      </p>
      <Chart scale={[0, tallest()]} ticks={false} label="The seven tallest buildings, by height"
        theme={{ font: '"Archivo", system-ui, sans-serif', ink: "#17191c", muted: "#5d6168" }}>
        <Plot rows={props.rows} key="name" order={sortBy("height", "desc")} on={(d) => on() === d.name} keyboard>{Tower}</Plot>
      </Chart>
    </Poster>
  );
}
```

`src/App.jsx`:

```jsx
import { TowersChart } from "./charts/TowersChart.jsx";
import { TOWERS } from "./data/towers.js";

export default function App() {
  return (
    <main style={{ padding: "32px 16px" }}>
      <TowersChart rows={TOWERS} />
    </main>
  );
}
```

- `rows` can be a signal, a store or a resource: `<TowersChart rows={rows()} />`.
  A store changed in place (`setStore("rows", 2, "height", 700)`) moves that one bar (checked).
- With `key="name"` on the Plot, new data keeps each tower's slat: the element stays and its bar moves (checked).
- Solid removes the chart with its owner (a `<Show>`, a route): there is nothing to clean up (checked).
- Development: the Vite dev server updates the chart after an edit to the chart or the data without a reload (checked).

**TypeScript** (`TowersChart.tsx`): the same file with these lines changed, checked with `tsc -b` under TypeScript 6.0's defaults, which are strict:

```tsx
export type TowerRow = { name: string; city: string; year: number; height: number };
const Tower = slat<TowerRow & { on: boolean }>({
export function TowersChart(props: { rows: TowerRow[] }) {
  const [on, setOn] = createSignal<string | null>(null); // the name of the tower the reader picked
  const nameOf = (el: Element) => el.closest("[data-name]")?.getAttribute("data-name") ?? null;
  const pick = (e: Event) => {
    const name = nameOf(e.target as Element);
  const leave = (e: PointerEvent) => {
    const focused = document.activeElement;
    setOn(focused && (e.currentTarget as Element).contains(focused) ? nameOf(focused) : null);
      onFocusOut={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setOn(null)}>
        <Plot rows={props.rows} key="name" order={sortBy("height", "desc")} on={(d: TowerRow) => on() === d.name} keyboard>{Tower}</Plot>
```

The data file imports the type: `import type { TowerRow } from "../charts/TowersChart";`.

**SolidStart**: the same `TowersChart.jsx` in `src/components/`, used by a route, with the data in `src/data/towers.js`.
`src/routes/index.jsx`:

```jsx
import { Title } from "@solidjs/meta";
import { TowersChart } from "~/components/TowersChart";
import { TOWERS } from "~/data/towers";

export default function Home() {
  return (
    <main>
      <Title>The tallest buildings</Title>
      <TowersChart rows={TOWERS} />
    </main>
  );
}
```

The fonts go in the document's head in `src/entry-server.jsx`:

```jsx
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Antonio:wght@700&family=Archivo:wght@400;600;700&display=swap" />
          {assets}
        </head>
```

- SolidStart draws the chart on the server and hydrates it in the browser (checked: the server's HTML holds the 7 slats, and the browser logs no hydration warning).
- The starter's `src/app.css` styles every `p` (`max-width: 14rem; margin: 2rem auto`): without its own `max-width: none` the readout was cut at 390px (checked).

## 5. Solid JSX and the html template

Recipes, plain pages and every app that is not a Solid app write charts with the html template; a Solid app writes JSX.
Section 3's script and section 4's component are the same chart, line for line.

| | html template (`@bezda/rhp/standalone`) | Solid JSX (`@bezda/rhp` and `solid-js`) |
|---|---|---|
| imports | everything from `@bezda/rhp/standalone`: rhp, `html`, `render`, `createSignal`, `createMemo`, `Show`, `For` | rhp from `@bezda/rhp`; `createSignal`, `createMemo`, `Show`, `For`, `createSelector` from `solid-js`; `render` from `solid-js/web` |
| a component | `<${Bar} to=${...} />` | `<Bar to={...} />` |
| closing a component | `<//>` | `</Label>` |
| a value that changes | a function: `to=${() => d.height}` | the expression: `to={d.height}` |
| text with a value | `${() => d.height} m` | `{d.height} m` |
| a value that never changes | `scale=${[0, 30]}`, `rows=${TOWERS}` | `scale={[0, 30]}`, `rows={TOWERS}` |
| a signal or a memo | as it is (`when=${current}`) or in a function (`${() => current()}`) | called: `when={current()}` |
| a boolean prop | `keyboard=${true}` | `keyboard` |
| a handler on a component | takes its event: `onPointerMove=${(e) => ...}` | any function: `onClick={() => ...}` |
| a handler on a plain element | any function | any function |
| a CSS class | `class="name"`, `class=${() => ...}` | `class="name"`, `class={...}` |
| a style object | `style=${{ "pointer-events": "none" }}` | `style={{ "pointer-events": "none" }}` |
| several root elements | allowed, except in a slat | in a fragment `<>...</>`, except in a slat |

`Show` with a child function, and `For`:

```js
// html template
<${Show} when=${current} fallback="Point at a tower, tap it, or Tab to it.">
  ${(t) => html`<b>${() => t().name}</b> in ${() => t().city}`}
<//>
<${For} each=${list}>${(item) => html`<li>${item}</li>`}<//>
```

```jsx
// Solid JSX
<Show when={current()} fallback="Point at a tower, tap it, or Tab to it.">
  {(t) => <><b>{t().name}</b> in {t().city}</>}
</Show>
<For each={list()}>{(item) => <li>{item}</li>}</For>
```

A slat, and drawing the chart into an element:

```js
// html template
const Tower = slat({ thickness: 44 }, (d) => html`<div>...</div>`);
render(() => TowersChart({ rows: TOWERS }), document.getElementById("chart"));
```

```jsx
// Solid JSX
const Tower = slat({ thickness: 44 }, (d) => <div>...</div>);
render(() => <TowersChart rows={TOWERS} />, document.getElementById("root"));
```

Each of these was checked in both formats:

1. `Show`'s child function runs once and gets an accessor (`t`).
   In the template, read it in functions (`${() => t().name}`): `${t().name}` kept the first tower's name when the reader moved to another tower.
   JSX makes `{t().name}` follow it.
2. A bare boolean attribute is `true` in JSX and `""` (false) in the template: a bare `keyboard` gave the template's chart no tab stops.
3. A handler with no parameter on a component is attached in JSX.
   In the template it runs once while drawing, is never attached, and a click then throws `c.call is not a function`.
4. A style object takes CSS property names: `"pointer-events"` works, and `pointerEvents` (React's spelling) is ignored, in both.
5. `className` on a block replaces rhp's class, in both: the element is no longer drawn as a bar (it spans the whole slat).
   Use `class`.
6. `For` takes the signal as it is in the template (`each=${list}`) or a function (`each=${() => list()}`); both follow it.
7. In TypeScript, the template's `${...}` values have no types, so give every function parameter inside it a type: `(e: PointerEvent) =>`, `(d: TowerRow) =>`, `(t: () => TowerRow) =>`.
   Strict mode (TypeScript 6's default) rejects them untyped (TS7006), and so does TSX for a Plot's data props: `on={(d: TowerRow) => ...}`.
8. The template module has no `createSelector`, `Switch`, `Match`, `splitProps` or `mergeProps` (api.md, section 2): compare in a function (`on=${(d) => on() === d.name}`) and use `Show`.

## 6. The chart module and the mount helper

In every app that is not a Solid app, the chart is an ES module written with the html template, and a small helper draws it into an element and hands it new data.
Vue, Nuxt, Svelte, SvelteKit, Angular and Astro use the module as it is; React and Next.js put the same code in their component's file (section 7).

The chart module, `towers-chart.js`: section 3's script without the data and the `render` call, with the chart exported.

```js
// The towers poster, written with rhp's html template: the same file in every app that is not a Solid app
import { Chart, Plot, Bar, Label, Poster, slat, sortBy, html, createSignal, createMemo, Show } from "@bezda/rhp/standalone";

// Slat types: one tower, with its name, its bar (one line per floor) and its height; the tower the reader is on turns red
const Tower = slat({
  thickness: 44,
  room: { start: "auto", end: 60 },
  css: `
    .tower { cursor: default; outline: none; }
    .tower:focus-visible { background: rgb(23 25 28 / .06); }
    .name { max-width: 10em; font-size: 14px; font-weight: 600; line-height: 1.15; white-space: normal; text-align: end; }
    .bar { --rhp-radius: 0px; background: repeating-linear-gradient(var(--rhp-toward-end), #2a2e34 0 6px, #464b53 6px 7px); }
    .on .bar { background: repeating-linear-gradient(var(--rhp-toward-end), #c2381b 0 6px, #d9614a 6px 7px); }
    .height { font-size: 13px; font-weight: 700; color: var(--rhp-muted); }
    .on .height { color: #c2381b; }
  `,
}, (d) => html`
  <div class=${() => (d.on ? "tower on" : "tower")} data-name=${() => d.name}>
    <${Label} edge="start" class="name">${() => d.name}<//>
    <${Bar} to=${() => d.height} class="bar" />
    <${Label} at=${() => d.height} class="height">${() => d.height} m<//>
  </div>`);

// The chart: a poster with a one-line readout over the towers, ranked by height.
// Its data comes in as props.rows, a list of { name, city, year, height }.
export function TowersChart(props) {
  const [on, setOn] = createSignal(null); // the name of the tower the reader picked
  const current = createMemo(() => props.rows.find((t) => t.name === on()));
  const tallest = createMemo(() => Math.max(...props.rows.map((t) => t.height)));
  // The name of the tower an element is in, or null (between towers, on the text)
  const nameOf = (el) => el.closest("[data-name]")?.dataset.name ?? null;
  // A mouse or a pen picks as it moves, a tap or a click picks, the keyboard picks; on no tower the pick stays
  const pick = (e) => {
    const name = nameOf(e.target);
    if (name != null) setOn(name);
  };
  // Leaving the poster: back to the tower that has focus (a keyboard's or a click's pick), or none
  const leave = (e) => {
    if (e.pointerType === "touch") return; // a finger sends pointerleave as it lifts after a tap
    setOn(e.currentTarget.contains(document.activeElement) ? nameOf(document.activeElement) : null);
  };

  return html`
    <${Poster} class="towers"
      kicker="Skyscrapers, 2025"
      title=${"Burj Khalifa still towers 149\u00a0m over the rest"}
      dek="The seven tallest finished buildings in the world, by height to their architectural top."
      note="Source: Council on Tall Buildings and Urban Habitat (CTBUH), 2025."
      onPointerMove=${(e) => e.pointerType !== "touch" && pick(e)}
      onClick=${pick}
      onFocusIn=${pick}
      onPointerLeave=${leave}
      onFocusOut=${(e) => !e.currentTarget.contains(e.relatedTarget) && setOn(null)}>
      <p class="readout">
        <${Show} when=${current} fallback="Point at a tower, tap it, or Tab to it.">
          ${(t) => html`<b>${() => t().name}</b> in ${() => t().city}, finished ${() => t().year}`}
        <//>
      </p>
      <${Chart} scale=${() => [0, tallest()]} ticks=${false} label="The seven tallest buildings, by height"
        theme=${{ font: '"Archivo", system-ui, sans-serif', ink: "#17191c", muted: "#5d6168" }}>
        <${Plot} rows=${() => props.rows} key="name" order=${sortBy("height", "desc")} on=${(d) => on() === d.name} keyboard=${true}>${Tower}<//>
      <//>
    <//>`;
}
```

- Importing it touches no browser API (`slat()` runs at import, and works in Node), so frameworks that render on a server can import it; only drawing needs the browser.

The mount helper, `rhp-mount.js`; copy it as it is:

```js
// Draws an rhp chart into an element of an app that is not a Solid app (React, Vue, Svelte, Angular, a plain script),
// and hands it new props later. Copy this file as it is.
import { render, createStore, reconcile, unwrap } from "@bezda/rhp/standalone";

// The chart keeps its own copy of plain data (arrays and plain objects): Solid's store changes the objects it holds, and
// those must not be the app's. Anything else (a Date, a Map, a function) is passed as it is.
function copy(value) {
  if (Array.isArray(value)) return value.map(copy);
  if (value === null || typeof value !== "object") return value;
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return value;
  const out = {};
  for (const key of Object.keys(value)) out[key] = copy(value[key]);
  return out;
}

// mountChart(TowersChart, element, { rows }) draws the chart into the element and returns
//   set({ rows }): new values for the props it names; only what differs reaches the chart (one new number moves one bar)
//   dispose(): removes the chart; call it when the element goes away
export function mountChart(chart, element, props = {}) {
  const [state, setState] = createStore(copy(props));
  const dispose = render(() => chart(state), element);
  return {
    set: (next) => setState(reconcile({ ...unwrap(state), ...copy(next) })),
    dispose,
  };
}
```

- `mountChart(chart, element, props)` draws the chart into the element and returns `set(props)` and `dispose()`.
- The props live in a Solid store and new values arrive through `reconcile`, so only what differs changes: one new height moves one bar, and with the Plot's `key` each tower keeps its slat (checked).
- It copies plain data first, because `reconcile` changes the store's objects in place, and those must never be the app's objects (checked: the app's lists were unchanged after the chart switched between them).
- `dispose()` removes the chart and empties the element (checked).

**TypeScript**: `towers-chart.ts` and `rhp-mount.ts`.

```ts
// The towers poster, written with rhp's html template: the same file in every app that is not a Solid app
import { Chart, Plot, Bar, Label, Poster, slat, sortBy, html, createSignal, createMemo, Show } from "@bezda/rhp/standalone";

// One row of the data
export type TowerRow = { name: string; city: string; year: number; height: number };

// Slat types: one tower, with its name, its bar (one line per floor) and its height; the tower the reader is on turns red
const Tower = slat<TowerRow & { on: boolean }>({
  thickness: 44,
  room: { start: "auto", end: 60 },
  css: `
    .tower { cursor: default; outline: none; }
    .tower:focus-visible { background: rgb(23 25 28 / .06); }
    .name { max-width: 10em; font-size: 14px; font-weight: 600; line-height: 1.15; white-space: normal; text-align: end; }
    .bar { --rhp-radius: 0px; background: repeating-linear-gradient(var(--rhp-toward-end), #2a2e34 0 6px, #464b53 6px 7px); }
    .on .bar { background: repeating-linear-gradient(var(--rhp-toward-end), #c2381b 0 6px, #d9614a 6px 7px); }
    .height { font-size: 13px; font-weight: 700; color: var(--rhp-muted); }
    .on .height { color: #c2381b; }
  `,
}, (d) => html`
  <div class=${() => (d.on ? "tower on" : "tower")} data-name=${() => d.name}>
    <${Label} edge="start" class="name">${() => d.name}<//>
    <${Bar} to=${() => d.height} class="bar" />
    <${Label} at=${() => d.height} class="height">${() => d.height} m<//>
  </div>`);

// The chart: a poster with a one-line readout over the towers, ranked by height. Its data comes in as props.rows.
export function TowersChart(props: { rows: TowerRow[] }) {
  const [on, setOn] = createSignal<string | null>(null); // the name of the tower the reader picked
  const current = createMemo(() => props.rows.find((t) => t.name === on()));
  const tallest = createMemo(() => Math.max(...props.rows.map((t) => t.height)));
  // The name of the tower an element is in, or null (between towers, on the text)
  const nameOf = (el: Element) => el.closest("[data-name]")?.getAttribute("data-name") ?? null;
  // A mouse or a pen picks as it moves, a tap or a click picks, the keyboard picks; on no tower the pick stays
  const pick = (e: Event) => {
    const name = nameOf(e.target as Element);
    if (name != null) setOn(name);
  };
  // Leaving the poster: back to the tower that has focus (a keyboard's or a click's pick), or none
  const leave = (e: PointerEvent) => {
    if (e.pointerType === "touch") return; // a finger sends pointerleave as it lifts after a tap
    const focused = document.activeElement;
    setOn(focused && (e.currentTarget as Element).contains(focused) ? nameOf(focused) : null);
  };

  return html`
    <${Poster} class="towers"
      kicker="Skyscrapers, 2025"
      title=${"Burj Khalifa still towers 149\u00a0m over the rest"}
      dek="The seven tallest finished buildings in the world, by height to their architectural top."
      note="Source: Council on Tall Buildings and Urban Habitat (CTBUH), 2025."
      onPointerMove=${(e: PointerEvent) => e.pointerType !== "touch" && pick(e)}
      onClick=${pick}
      onFocusIn=${pick}
      onPointerLeave=${leave}
      onFocusOut=${(e: FocusEvent) => !(e.currentTarget as Element).contains(e.relatedTarget as Node | null) && setOn(null)}>
      <p class="readout">
        <${Show} when=${current} fallback="Point at a tower, tap it, or Tab to it.">
          ${(t: () => TowerRow) => html`<b>${() => t().name}</b> in ${() => t().city}, finished ${() => t().year}`}
        <//>
      </p>
      <${Chart} scale=${() => [0, tallest()]} ticks=${false} label="The seven tallest buildings, by height"
        theme=${{ font: '"Archivo", system-ui, sans-serif', ink: "#17191c", muted: "#5d6168" }}>
        <${Plot} rows=${() => props.rows} key="name" order=${sortBy("height", "desc")} on=${(d: TowerRow) => on() === d.name} keyboard=${true}>${Tower}<//>
      <//>
    <//>`;
}
```

```ts
// Draws an rhp chart into an element of an app that is not a Solid app (React, Vue, Svelte, Angular, a plain script),
// and hands it new props later. Copy this file as it is.
import { render, createStore, reconcile, unwrap } from "@bezda/rhp/standalone";
import type { JSX } from "solid-js";

// The chart keeps its own copy of plain data (arrays and plain objects): Solid's store changes the objects it holds, and
// those must not be the app's. Anything else (a Date, a Map, a function) is passed as it is.
function copy<T>(value: T): T {
  if (Array.isArray(value)) return value.map(copy) as T;
  if (value === null || typeof value !== "object") return value;
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return value;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) out[key] = copy(item);
  return out as T;
}

export interface MountedChart<P> {
  /** New values for the props it names; only what differs reaches the chart (one new number moves one bar). */
  set(next: Partial<P>): void;
  /** Removes the chart; call it when the element goes away. */
  dispose(): void;
}

// mountChart(TowersChart, element, { rows }) draws the chart into the element
export function mountChart<P extends object>(chart: (props: P) => JSX.Element, element: HTMLElement, props: P): MountedChart<P> {
  const [state, setState] = createStore<P>(copy(props));
  const dispose = render(() => chart(state), element);
  return {
    set: (next) => setState(reconcile({ ...unwrap(state), ...copy(next) })),
    dispose,
  };
}
```

- `closest("[data-name]")?.getAttribute("data-name")` instead of `dataset.name`: Angular's default `noPropertyAccessFromIndexSignature` rejects `dataset.name`.
- `import type { JSX } from "solid-js"` reads the types of the `solid-js` that npm installed with rhp; nothing from it runs.

## 7. React

Detect: `react` and `react-dom` in package.json (Vite has `@vitejs/plugin-react`); Next.js is section 8.
Install: `npm install @bezda/rhp`.
`@bezda/rhp-react` is not on npm: use the wrapper below.

```
index.html                    the fonts (section 2)
src/rhp/rhp-mount.js          the mount helper (section 6), as it is
src/rhp/RhpChart.jsx          the React wrapper, as it is
src/charts/Towers.jsx         the chart and the React component that draws it
src/charts/towers-chart.css   the poster's CSS (section 2)
src/data/towers.js            the data (section 2)
src/App.jsx                   the app passes its data
```

The wrapper, `src/rhp/RhpChart.jsx`:

```jsx
"use client";
// <RhpChart chart={TowersChart} rows={towers} />: an rhp chart in a React app. Copy this file as it is.
import { useEffect, useLayoutEffect, useRef } from "react";
import { mountChart } from "./rhp-mount.js";

// The chart is drawn before the browser paints, so there is no empty frame (a server render runs neither hook)
const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;

// chart is a function of props that returns an html template, defined at the top level of a module (never inside a
// component). Every other prop goes to it, except className and style, which go on the <div> it draws into.
export function RhpChart({ chart, className, style, ...props }) {
  const box = useRef(null);
  const drawn = useRef(null);

  // After each render: draw the chart the first time, or again when `chart` is a new function (its module was edited
  // during development); otherwise hand it the props that are no longer the same value.
  useBeforePaint(() => {
    const now = drawn.current;
    if (now?.chart !== chart) {
      now?.mounted.dispose();
      drawn.current = { chart, props, mounted: mountChart(chart, box.current, props) };
      return;
    }
    const changed = {};
    for (const key of new Set([...Object.keys(now.props), ...Object.keys(props)])) {
      if (now.props[key] !== props[key]) changed[key] = props[key];
    }
    now.props = props;
    if (Object.keys(changed).length) now.mounted.set(changed);
  });

  // Remove the chart when the component goes away (StrictMode's trial unmount included: the effect above redraws it)
  useBeforePaint(() => () => {
    drawn.current?.mounted.dispose();
    drawn.current = null;
  }, []);

  return <div ref={box} className={className} style={style} />;
}
```

- `<RhpChart chart={TowersChart} rows={rows} />`: every prop except `chart`, `className` and `style` goes to the chart; `className` and `style` go on the `<div>` it draws into.
- After each render it hands the chart only the props that are a different value, and `reconcile` then passes on only what differs inside them.
  Give it a new array when the data changes (React's own rule): a list changed in place keeps the same value, and the chart does not see the change.
- `chart` must be a function defined at the top level of a module: a new function (an arrow written inside a component) draws a new chart on every render.
- StrictMode mounts, unmounts and mounts again in development: the wrapper removes the first chart, and the page has one (checked).
- When the component unmounts, the chart is disposed (checked: nothing left).
- The `"use client"` line is for Next.js; Vite's build ignored it without a warning.

The chart and its component, `src/charts/Towers.jsx`: section 6's `towers-chart.js` with three changes.
Its first lines import the wrapper and the CSS, `TowersChart` is no longer exported, and the component comes last:

```jsx
// The towers poster: an rhp chart written with the html template, and the React component that draws it
import { Chart, Plot, Bar, Label, Poster, slat, sortBy, html, createSignal, createMemo, Show } from "@bezda/rhp/standalone";
import { RhpChart } from "../rhp/RhpChart.jsx";
import "./towers-chart.css";

// ... the slat type and the chart function of section 6, unchanged, but with no "export" before "function TowersChart" ...

// The React component: <Towers rows={towers} />
export function Towers(props) {
  return <RhpChart chart={TowersChart} {...props} />;
}
```

`src/App.jsx`:

```jsx
import { Towers } from "./charts/Towers.jsx";
import { TOWERS } from "./data/towers.js";

export default function App() {
  return (
    <main style={{ padding: "32px 16px" }}>
      <Towers rows={TOWERS} />
    </main>
  );
}
```

- Why the chart sits in the component's file: Next.js's Fast Refresh treats a module whose exports are all capitalized functions as React components, so an edit to a separate chart module that exports only `TowersChart` never reached the page: the chart stayed as it was until a reload (checked).
  In one file, an edit re-renders `Towers`, which draws the new chart.
  The Vite dev server passed the separate module's edits on, but one file works in both.
- Fast Refresh: an edit to `Towers.jsx`, the data, `RhpChart.jsx`, `rhp-mount.js` or `App.jsx` updated the page without a reload, with one chart (checked).

**TypeScript**: `src/rhp/rhp-mount.ts` (section 6), `src/rhp/RhpChart.tsx`, and `src/charts/Towers.tsx`, which is section 6's `towers-chart.ts` with the same three changes.
Checked with `tsc -b` (TypeScript 6.0, strict by default) and `vite build`.

```tsx
"use client";
// <RhpChart chart={TowersChart} rows={towers} />: an rhp chart in a React app. Copy this file as it is.
import { useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";
import type { JSX } from "solid-js";
import { mountChart, type MountedChart } from "./rhp-mount";

// The chart is drawn before the browser paints, so there is no empty frame (a server render runs neither hook)
const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;

type Chart<P> = (props: P) => JSX.Element;
type Drawn<P> = { chart: Chart<P>; props: P; mounted: MountedChart<P> };

// chart is a function of props that returns an html template, defined at the top level of a module (never inside a
// component). Every other prop goes to it, except className and style, which go on the <div> it draws into.
export function RhpChart<P extends object>({ chart, className, style, ...rest }: { chart: Chart<P>; className?: string; style?: CSSProperties } & P) {
  const props = rest as unknown as P;
  const box = useRef<HTMLDivElement>(null);
  const drawn = useRef<Drawn<P> | null>(null);

  // After each render: draw the chart the first time, or again when `chart` is a new function (its module was edited
  // during development); otherwise hand it the props that are no longer the same value.
  useBeforePaint(() => {
    const now = drawn.current;
    if (now?.chart !== chart) {
      now?.mounted.dispose();
      drawn.current = { chart, props, mounted: mountChart(chart, box.current!, props) };
      return;
    }
    const before = now.props as Record<string, unknown>;
    const after = props as Record<string, unknown>;
    const changed: Record<string, unknown> = {};
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (before[key] !== after[key]) changed[key] = after[key];
    }
    now.props = props;
    if (Object.keys(changed).length) now.mounted.set(changed as Partial<P>);
  });

  // Remove the chart when the component goes away (StrictMode's trial unmount included: the effect above redraws it)
  useBeforePaint(() => () => {
    drawn.current?.mounted.dispose();
    drawn.current = null;
  }, []);

  return <div ref={box} className={className} style={style} />;
}
```

```tsx
// The towers poster: an rhp chart written with the html template, and the React component that draws it
import { Chart, Plot, Bar, Label, Poster, slat, sortBy, html, createSignal, createMemo, Show } from "@bezda/rhp/standalone";
import { RhpChart } from "../rhp/RhpChart";
import "./towers-chart.css";

// ... the type, the slat type and the chart function of section 6's towers-chart.ts, unchanged, but with no "export" before "function TowersChart" ...

// The React component: <Towers rows={towers} />
export function Towers(props: { rows: TowerRow[] }) {
  return <RhpChart chart={TowersChart} {...props} />;
}
```

The data file imports the type: `import type { TowerRow } from "../charts/Towers";`.

## 8. Next.js

**App Router** (`app/`): the chart is a client component that the server never renders.
The page imports a small client file that loads the chart with `next/dynamic` and `ssr: false`, so the server neither draws the chart nor loads rhp.
Checked: `next build` passes (Next.js 16.3 with Turbopack, TypeScript), the prerendered page has no chart in it, and no server file contains rhp.

```
app/layout.tsx                          the fonts, with next/font
app/page.tsx                            a server component: it has the data and renders <ClientOnlyTowers rows={...} />
components/towers/ClientOnlyTowers.tsx  loads Towers.tsx in the browser only, and imports the poster's CSS
components/towers/Towers.tsx            the chart and the React component (section 7), with "use client"
components/towers/towers-chart.css      the poster's CSS, with the font variables
lib/rhp/RhpChart.tsx                    the React wrapper (section 7), as it is
lib/rhp/rhp-mount.ts                    the mount helper (section 6), as it is
data/towers.ts                          the data
```

`components/towers/ClientOnlyTowers.tsx`:

```tsx
"use client";
import dynamic from "next/dynamic";
import "./towers-chart.css";

// What pages render: <ClientOnlyTowers rows={towers} />. The chart is drawn in the browser only: the server sends an
// empty box and never loads rhp. The CSS is imported here so that it comes with the page.
export const ClientOnlyTowers = dynamic(() => import("./Towers").then((m) => m.Towers), { ssr: false });
```

`app/page.tsx`:

```tsx
import { ClientOnlyTowers } from "@/components/towers/ClientOnlyTowers";
import { TOWERS } from "@/data/towers";

// A server component: it holds (or fetches) the data and passes it to the chart
export default function Home() {
  return (
    <main className="px-4 py-8">
      <ClientOnlyTowers rows={TOWERS} />
    </main>
  );
}
```

`components/towers/Towers.tsx` is section 7's `Towers.tsx` with `"use client"` first, the wrapper imported from `@/lib/rhp/RhpChart`, no CSS import, and the next/font variable in the theme:

```tsx
"use client";
// The towers poster: an rhp chart written with the html template, and the React component that draws it
import { Chart, Plot, Bar, Label, Poster, slat, sortBy, html, createSignal, createMemo, Show } from "@bezda/rhp/standalone";
import { RhpChart } from "@/lib/rhp/RhpChart";

// ... and in the Chart:
theme=${{ font: "var(--font-archivo), system-ui, sans-serif", ink: "#17191c", muted: "#5d6168" }}>
```

`app/layout.tsx`: next/font serves the fonts from the app under generated names, so the CSS and the theme name them by their variables:

```tsx
import type { Metadata } from "next";
import { Antonio, Archivo, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The poster's fonts, as CSS variables its CSS and the chart's theme use
const antonio = Antonio({ variable: "--font-antonio", subsets: ["latin"] });
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${antonio.variable} ${archivo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

In `towers-chart.css`, the two font stacks become `var(--font-archivo), system-ui, sans-serif` (on `.towers`) and `var(--font-antonio), "Arial Narrow", sans-serif` (on `.headline`).

- `ssr: false` is allowed only in a client component: with `dynamic(..., { ssr: false })` in `app/page.tsx`, `next build` failed ("`ssr: false` is not allowed with `next/dynamic` in Server Components").
  That is why the page imports `ClientOnlyTowers.tsx`.
- The rows pass from the server component to the client as props, so they must be data React can send: plain objects, arrays, strings and numbers (checked with those).
- The server's HTML has no chart, so the content below it moves down once the chart is drawn; give the parent a `min-height` if that matters.
- Development: StrictMode (on by default in the App Router) leaves one chart, and Fast Refresh updated the page after an edit to every file, without a reload (checked).
- Keep the data out of `components/towers/`: a `towers.ts` beside `Towers.tsx` broke the build, because macOS and Windows ignore case in file names and `import("./Towers")` found the data file (TS1149, checked).

**Pages Router** (`pages/`): a page may call `dynamic` with `ssr: false` itself.
`Towers.jsx` is section 7's file with the wrapper imported from `@/lib/rhp/RhpChart.jsx` and no CSS import.

`pages/index.js`:

```jsx
import dynamic from "next/dynamic";
import { TOWERS } from "@/data/towers.js";

// The chart is drawn in the browser only: the server sends an empty box and never loads rhp
const Towers = dynamic(() => import("@/components/towers/Towers.jsx").then((m) => m.Towers), { ssr: false });

// The data comes from the server, at build time here (getServerSideProps works the same way)
export function getStaticProps() {
  return { props: { towers: TOWERS } };
}

export default function Home({ towers }) {
  return (
    <main style={{ padding: "32px 16px" }}>
      <Towers rows={towers} />
    </main>
  );
}
```

`pages/_app.js` and `pages/_document.js`:

```jsx
import "@/styles/globals.css";
import "@/components/towers/towers-chart.css";

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
```

```jsx
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Antonio:wght@700&family=Archivo:wght@400;600;700&display=swap" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

- The Pages Router allows global CSS only in `pages/_app.js`: importing `towers-chart.css` in `Towers.jsx` failed `next build` ("Global CSS cannot be imported from files other than your Custom <App>", checked).
- Checked: `next build`, `next start`, no rhp in the server output.

## 9. Vue and Nuxt

**Vue** (Vite): `npm install @bezda/rhp`.

```
index.html                    the fonts (section 2)
src/rhp/rhp-mount.js          the mount helper (section 6)
src/charts/towers-chart.js    the chart module (section 6)
src/charts/towers-chart.css   the poster's CSS (section 2)
src/data/towers.js            the data (section 2)
src/components/Towers.vue     the component that draws the chart
src/App.vue                   the app passes its data
```

`src/components/Towers.vue`:

```vue
<script setup>
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from "vue";
import { mountChart } from "../rhp/rhp-mount.js";
import { TowersChart } from "../charts/towers-chart.js";
import "../charts/towers-chart.css";

const props = defineProps({ rows: { type: Array, required: true } });
const box = useTemplateRef("box");
let chart;

onMounted(() => {
  chart = mountChart(TowersChart, box.value, { rows: props.rows });
});
// deep: a change inside the list (one tower's height) reaches the chart too
watch(() => props.rows, (rows) => chart.set({ rows }), { deep: true });
onBeforeUnmount(() => chart.dispose());
</script>

<template>
  <div ref="box"></div>
</template>
```

`src/App.vue`:

```vue
<script setup>
import Towers from "./components/Towers.vue";
import { TOWERS } from "./data/towers.js";
</script>

<template>
  <main style="padding: 32px 16px">
    <Towers :rows="TOWERS" />
  </main>
</template>
```

- `watch(..., { deep: true })` hands the chart a change inside the list too (checked: `rows.value[2].height = 700` moved that bar).
- `onBeforeUnmount` disposes the chart (checked with `v-if`).
- Import the CSS file in the script.
  A `<style scoped>` block does not reach the chart: Vue compiled `.towers` to `.towers[data-v-...]`, and rhp's elements have no such attribute (checked: no background).
- Development: an edit to the chart module, the data, the component or the mount helper updated the page without a reload, with one chart (checked).

**Nuxt** (Nuxt 4, whose source folder is `app/`): the same component, in `app/components/Towers.vue` (Nuxt imports components by name), with its imports written from `~/`:

```js
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from "vue";
import { mountChart } from "~/rhp/rhp-mount.js";
import { TowersChart } from "~/charts/towers-chart.js";
import "~/charts/towers-chart.css";
```

The helper, the chart module and the CSS go in `app/rhp/` and `app/charts/`, the data in `app/data/towers.js`.
`app/pages/index.vue` (with `app/app.vue` holding `<NuxtPage />`):

```vue
<script setup>
import { TOWERS } from "~/data/towers.js";
</script>

<template>
  <main style="padding: 32px 16px">
    <Towers :rows="TOWERS" />
  </main>
</template>
```

`nuxt.config.ts`, with the fonts:

```ts
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  // The poster's fonts
  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Antonio:wght@700&family=Archivo:wght@400;600;700&display=swap' },
      ],
    },
  },
})
```

- The server renders the component's empty `<div>`, and `onMounted` draws the chart in the browser after hydration (checked: no chart in the server's HTML, no warning in the browser).
- Do not name it `Towers.client.vue`.
  During hydration Nuxt runs a `.client` component's `onMounted` before its template exists, so the ref is null and drawing failed (`Cannot read properties of null (reading 'firstChild')`, checked).
  The plain component needs nothing more.

## 10. Svelte and SvelteKit

**Svelte** (Vite, Svelte 5): `npm install @bezda/rhp`.

```
index.html                       the fonts (section 2)
src/lib/rhp/rhp-mount.js         the mount helper (section 6)
src/lib/charts/towers-chart.js   the chart module (section 6)
src/lib/charts/towers-chart.css  the poster's CSS (section 2)
src/lib/data/towers.js           the data (section 2)
src/lib/Towers.svelte            the component that draws the chart
src/App.svelte                   the app passes its data
```

`src/lib/Towers.svelte`:

```svelte
<script>
  import { onMount } from "svelte";
  import { mountChart } from "./rhp/rhp-mount.js";
  import { TowersChart } from "./charts/towers-chart.js";
  import "./charts/towers-chart.css";

  let { rows } = $props();
  let box;
  let chart;

  onMount(() => {
    chart = mountChart(TowersChart, box, { rows });
    return () => chart.dispose();
  });

  // Runs after onMount, then whenever rows changes, in place too (set reads every row, so Svelte tracks them all)
  $effect(() => chart.set({ rows }));
</script>

<div bind:this={box}></div>
```

`src/App.svelte`:

```svelte
<script>
  import Towers from "./lib/Towers.svelte";
  import { TOWERS } from "./lib/data/towers.js";
</script>

<main style="padding: 32px 16px">
  <Towers rows={TOWERS} />
</main>
```

- `$effect` runs after `onMount` (it is declared after it), then whenever `rows` changes, inside the list too: `set` reads every row, so Svelte tracks them all (checked: `rows[2].height = 700` on a `$state` list moved that bar).
- `onMount`'s returned function disposes the chart (checked with `{#if}`).
- Import the CSS file in the script.
  A component's `<style>` is scoped: Svelte dropped the poster's rules as "Unused CSS selector" (checked).
- Development: an edit to the chart module, the data, the component or the mount helper updated the page without a reload (checked).

**SvelteKit** (SvelteKit 3, TypeScript as its starter sets it up): the same component with types, the typed helper and chart module (section 6) in `src/lib/rhp/` and `src/lib/charts/`, and the data from the page's `load`.

`src/lib/Towers.svelte`:

```svelte
<!-- <Towers rows={towers} />: the towers poster. The server renders the empty box; the chart is drawn in the browser. -->
<script lang="ts">
  import { onMount } from "svelte";
  import { mountChart, type MountedChart } from "./rhp/rhp-mount";
  import { TowersChart, type TowerRow } from "./charts/towers-chart";
  import "./charts/towers-chart.css";

  let { rows }: { rows: TowerRow[] } = $props();
  let box: HTMLDivElement;
  let chart: MountedChart<{ rows: TowerRow[] }>;

  onMount(() => {
    chart = mountChart(TowersChart, box, { rows });
    return () => chart.dispose();
  });

  // Runs after onMount, then whenever rows changes, in place too (set reads every row, so Svelte tracks them all)
  $effect(() => chart.set({ rows }));
</script>

<div bind:this={box}></div>
```

`src/routes/+page.ts` and `src/routes/+page.svelte`:

```ts
import { TOWERS } from "#lib/data/towers.js";
import type { PageLoad } from "./$types";

// The page's data: from a file here; a fetch or a database works the same way
export const load: PageLoad = () => ({ towers: TOWERS });
```

```svelte
<script lang="ts">
  import Towers from "#lib/Towers.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<main style="padding: 32px 16px">
  <Towers rows={data.towers} />
</main>
```

The fonts go in `src/app.html`, before `%sveltekit.head%`:

```html
		<link rel="preconnect" href="https://fonts.googleapis.com" />
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
		<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Antonio:wght@700&family=Archivo:wght@400;600;700&display=swap" />
		%sveltekit.head%
```

- SvelteKit 3 maps `#lib/*` to `src/lib/*` (package.json `imports`).
  Write the file's extension, and `.js` for a `.ts` file (`#lib/data/towers.js`): without it, `svelte-check` could not find the module (checked).
  A SvelteKit 2 project writes `$lib/...` instead (not tested).
- The server renders the empty box; `onMount` and `$effect` run in the browser only.
  The server imports the chart module, which is safe (section 6).
- Checked: `svelte-check` (0 errors, 0 warnings), `vite build`, `vite preview`.
  A local build prints adapter-auto's "Could not detect a supported production environment", which is expected.

## 11. Angular

Angular 22, standalone components, zoneless (the default of a new app): `npm install @bezda/rhp`.

```
src/index.html                     the fonts
src/app/rhp/rhp-mount.ts           the mount helper (section 6, TypeScript)
src/app/towers/towers-chart.ts     the chart module (section 6, TypeScript)
src/app/towers/towers-chart.css    the poster's CSS (section 2)
src/app/towers/towers.ts           the component that draws the chart
src/app/data/towers.ts             the data
src/app/app.ts                     the app passes its data
```

`src/app/towers/towers.ts`:

```ts
import { Component, ElementRef, OnDestroy, ViewEncapsulation, afterNextRender, effect, input, viewChild } from "@angular/core";
import { mountChart, type MountedChart } from "../rhp/rhp-mount";
import { TowersChart, type TowerRow } from "./towers-chart";

// <app-towers [rows]="towers" />: the towers poster
@Component({
  selector: "app-towers",
  template: `<div #box></div>`,
  styleUrl: "./towers-chart.css",
  // rhp makes the chart's elements, not this template, so the poster's CSS must not be scoped to the template
  encapsulation: ViewEncapsulation.None,
})
export class Towers implements OnDestroy {
  readonly rows = input.required<TowerRow[]>();
  private readonly box = viewChild.required<ElementRef<HTMLDivElement>>("box");
  private chart?: MountedChart<{ rows: TowerRow[] }>;

  constructor() {
    // Draw the chart after the first render, in the browser only (never during server rendering)
    afterNextRender(() => {
      this.chart = mountChart(TowersChart, this.box().nativeElement, { rows: this.rows() });
    });
    // Hand it the new rows whenever the input changes
    effect(() => {
      const rows = this.rows();
      this.chart?.set({ rows });
    });
  }

  ngOnDestroy() {
    this.chart?.dispose();
  }
}
```

`src/app/app.ts`:

```ts
import { Component, signal } from '@angular/core';
import { Towers } from './towers/towers';
import { TOWERS } from './data/towers';

// The app holds the data and passes it to the chart
@Component({
  imports: [Towers],
  selector: 'app-root',
  template: `
    <main style="padding: 32px 16px">
      <app-towers [rows]="towers()" />
    </main>
  `,
})
export class App {
  protected readonly towers = signal(TOWERS);
}
```

The fonts, in `src/index.html`'s head:

```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Antonio:wght@700&family=Archivo:wght@400;600;700&display=swap">
```

- `afterNextRender` draws the chart after the first render, in the browser only, so the component suits Angular's server rendering too (not tested: the tested app has none).
- `effect` hands the chart new rows whenever the input changes.
  Give it a new array (signals compare by reference): `rows.update((rows) => rows.map(...))` moved one bar (checked).
- `ngOnDestroy` disposes the chart (checked with `@if`).
- The poster's CSS is the component's `styleUrl` with `encapsulation: ViewEncapsulation.None`.
  With Angular's default (emulated) encapsulation, the CSS is scoped to the component's template and never reaches rhp's elements (checked: no background).
  `src/styles.css` works too.
- Never import a CSS file from a `.ts` file: TypeScript 6 fails the build with TS2882 (no types for a side-effect import, checked).
- Checked: `ng build`, the built `dist/angular/browser` served as static files.
  Apps that still use zone.js were not tested.

## 12. Astro

**Without a framework integration**, a custom element in an Astro component draws the html-template chart in the browser.
`src/components/Towers.astro`, with the helper and the chart module (section 6) in `src/rhp/` and `src/charts/`:

```astro
---
// <Towers rows={towers} />: the towers poster in an Astro page, drawn in the browser by a custom element
import "../charts/towers-chart.css";

const { rows } = Astro.props;
---

<towers-chart data-rows={JSON.stringify(rows)}></towers-chart>

<script>
  import { mountChart } from "../rhp/rhp-mount.js";
  import { TowersChart } from "../charts/towers-chart.js";

  // The chart is drawn when the element enters the page and removed when it leaves (view transitions included).
  // A script can give it new data: element.dataset.rows = JSON.stringify(rows)
  class TowersChartElement extends HTMLElement {
    static observedAttributes = ["data-rows"];
    chart?: ReturnType<typeof mountChart>;

    rows() {
      return JSON.parse(this.dataset.rows ?? "[]");
    }

    connectedCallback() {
      this.chart = mountChart(TowersChart, this, { rows: this.rows() });
    }

    attributeChangedCallback() {
      this.chart?.set({ rows: this.rows() });
    }

    disconnectedCallback() {
      this.chart?.dispose();
      this.chart = undefined;
    }
  }

  customElements.define("towers-chart", TowersChartElement);
</script>

<style>
  towers-chart { display: block; }
</style>
```

`src/pages/index.astro`:

```astro
---
import Towers from "../components/Towers.astro";
import { TOWERS } from "../data/towers.js";
---

<html lang="en">
	<head>
		<meta charset="utf-8" />
		<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
		<link rel="icon" href="/favicon.ico" />
		<meta name="viewport" content="width=device-width" />
		<meta name="generator" content={Astro.generator} />
		<title>Astro</title>
		<link rel="preconnect" href="https://fonts.googleapis.com" />
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
		<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Antonio:wght@700&family=Archivo:wght@400;600;700&display=swap" />
	</head>
	<body>
		<main style="padding: 32px 16px">
			<Towers rows={TOWERS} />
		</main>
	</body>
</html>
```

- The data goes into the element as JSON in `data-rows`; the server's HTML has the element and no chart.
- A script can give it new data (`element.dataset.rows = JSON.stringify(rows)`), and removing the element disposes the chart (checked).
- Import the CSS in the frontmatter.
  A component's `<style>` is scoped: Astro compiled `.towers` to `.towers[data-astro-cid-...]`, which rhp's elements never have (checked: no background).
  The `towers-chart { display: block; }` rule works there because the element is in the component's own markup.

**With `@astrojs/solid-js`** (`integrations: [solidJs()]` in `astro.config.mjs`), the JSX chart of section 4 is an island:

```astro
---
import { TowersChart } from "../components/TowersChart.jsx";
import { TOWERS } from "../data/towers.js";
---
```

The island, in the page's body:

```astro
<TowersChart client:load rows={TOWERS} />
```

- `client:load`: Astro draws the chart on the server and hydrates it in the browser (checked: the server's HTML has the poster and its 7 slats, and the browser logs no hydration warning).
- `client:visible` does the same once the chart scrolls into view, and `client:only="solid-js"` sends nothing from the server and draws in the browser; both checked.

## 13. Check a chart inside an app

The checker mounts a file's default export, or its only exported component, with no props.
A chart that takes its data from the app therefore needs a small entry file that draws it with fixed data, its CSS and its fonts.
Write it next to the chart, run the checker on it, and keep it or delete it: the app never imports it.

For a chart module (Vue, Nuxt, Svelte, SvelteKit, Astro):

```js
// The chart with fixed data, for the checker: npx -y @bezda/rhp-mcp check src/charts/towers-chart.check.js
// The app never imports this file. It loads the chart's CSS and the fonts the app loads.
import { TowersChart } from "./towers-chart.js";
import { TOWERS } from "../data/towers.js";
import "./towers-chart.css";

document.head.insertAdjacentHTML("beforeend", '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Antonio:wght@700&family=Archivo:wght@400;600;700&display=swap">');

export default () => TowersChart({ rows: TOWERS });
```

For React and Next.js, render the component; the project's package.json (react without solid-js), or an import from `react`, tells the checker that the file is React:

```jsx
// The chart with fixed data, for the checker: npx -y @bezda/rhp-mcp check src/charts/towers.check.jsx
// The app never imports this file. It loads the fonts the app's index.html loads.
import { StrictMode } from "react";
import { Towers } from "./Towers.jsx";
import { TOWERS } from "../data/towers.js";

document.head.insertAdjacentHTML("beforeend", '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Antonio:wght@700&family=Archivo:wght@400;600;700&display=swap">');

export default function Check() {
  return <StrictMode><Towers rows={TOWERS} /></StrictMode>;
}
```

For Solid:

```jsx
// The chart with fixed data, for the checker: npx -y @bezda/rhp-mcp check src/charts/TowersChart.check.jsx
// The app never imports this file. It loads the fonts the app's index.html loads.
import { TowersChart } from "./TowersChart.jsx";
import { TOWERS } from "../data/towers.js";

document.head.insertAdjacentHTML("beforeend", '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Antonio:wght@700&family=Archivo:wght@400;600;700&display=swap">');

export default function Check() {
  return <TowersChart rows={TOWERS} />;
}
```

- Next.js: the entry defines the next/font variables too:

```tsx
document.head.insertAdjacentHTML("beforeend", `
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Antonio:wght@700&family=Archivo:wght@400;600;700&display=swap">
  <style>:root { --font-antonio: "Antonio"; --font-archivo: "Archivo"; }</style>`);
```

- TypeScript apps take `.ts` and `.tsx` entries, and their build type-checks them like any other file.
- Angular: name the entry `.js`, so that the app's TypeScript build (which includes every `src/**/*.ts`) skips it; a `.ts` entry with a CSS import failed `ng build` (TS2882).
- The checker found no problems in each of the eleven entries tested: React, React with TypeScript, Next.js, Solid, Solid with TypeScript, Vue, Nuxt, Svelte, SvelteKit, Astro and Angular.

## 14. Caveats for every app

1. The app's own CSS reaches the poster: inherited text styles (font, color, `letter-spacing`, `text-align`, line height) and rules for elements (`p`, `figure`).
   SolidStart's starter CSS (`p { max-width: 14rem }`) cut the readout at 390px until the readout set `max-width: none` (checked).
   Give the poster's root its own font, color, `letter-spacing` and `text-align`, and your own elements inside it their own sizes and margins.
2. Scoped component styles never reach the chart (Vue `scoped`, Svelte, Astro, Angular's emulated encapsulation): rhp makes the chart's elements, not the component's template.
   Use a plain CSS file, imported where section 2's table says.
3. Inside the chart, style with the slat type's `css` and the Chart's `theme` only: page CSS cannot change rhp's blocks (api.md, section 11).
4. Only Solid draws the chart on the server (SolidStart, Astro islands).
   Everywhere else the server sends an empty box and the browser draws the chart, so the content below moves down once; give the box a `min-height` if that matters.
5. macOS and Windows ignore case in file names: `towers.ts` beside `Towers.tsx` made `./Towers` load the data file (checked in Next.js).
   Give such files different names or folders.
6. In an app that is not a Solid app, import everything from `@bezda/rhp/standalone` and nothing from `solid-js` (api.md, section 2).
7. Solid's html template compiles each template with `new Function`, so a page whose Content-Security-Policy forbids `unsafe-eval` cannot draw html-template charts: allow it for that page, or use a Solid app with JSX, which needs no eval.

## 15. What was verified, and the versions

On 2026-10-03, on macOS 26.5 with Node 24.15.0 and npm 11.12.1, with `@bezda/rhp` 2.0.1 installed from npm (from jsDelivr for the plain page), each environment passed:

- its production build, with no warning about the chart's code;
- the built app, served by its production server (`vite preview`, `next start`, `node .output/server/index.mjs`, or a static server for Astro's and Angular's output), opened in Playwright 1.63's Chromium at 1280px and 390px: no console error or warning, one chart with 7 slats, no sideways scroll, the readout on one line for every tower on hover, the readout cleared when the pointer leaves, Tab and the arrow keys, and a tap on a touch phone;
- a test page where the app's state changes the data (one height changes and a tower is added, then back), changes a row in place where the framework allows it, and removes and adds the chart: each tower keeps its slat, the app's data stays unchanged, and nothing is left behind;
- a look at the screenshots.

On 2026-10-04 the chart's pointer handlers changed (a tap or a click picks on `click`, a scroll never picks, a pick stays between towers and on the focused tower).
The plain page and the Solid component were checked again in Playwright's Chromium (mouse, keyboard, a tap and a scroll at 390px, and the kit's checker), and the TypeScript files with `tsc` in the Solid and Angular projects; every other environment draws the same chart module.

| Environment | Versions | Also checked |
|---|---|---|
| plain page | Chrome 154, Safari 26.5.2 and Firefox 155 (Playwright's build) from `file://`; Playwright's Chromium | |
| Solid | solid-js 1.9.15, vite 8.3.2, vite-plugin-solid 2.11.14 | dev server updates |
| Solid with TypeScript | the same, typescript 6.0.3 | `tsc -b` |
| SolidStart | @solidjs/start 2.0.5, @solidjs/router 1.0.0, nitro 3.0.260610-beta, solid-js 1.9.15, vite 8.3.2 | the server's HTML has the chart |
| React | react 19.3.0, react-dom 19.3.0, vite 8.3.2, @vitejs/plugin-react 6.1.1 | StrictMode, Fast Refresh |
| React with TypeScript | the same, typescript 6.0.3 | `tsc -b` |
| Next.js App Router | next 16.3.8 (Turbopack), react 19.2.8, typescript 5.9.3, tailwindcss 4.3.3 | no rhp on the server, StrictMode, Fast Refresh |
| Next.js Pages Router | next 16.3.8, react 19.2.8 | no rhp on the server |
| Vue | vue 3.5.43, vite 8.3.2, @vitejs/plugin-vue 6.0.9 | dev server updates |
| Nuxt | nuxt 4.5.2, vue 3.5.43, vite 8.3.2, nitropack 2.13.4 | |
| Svelte | svelte 5.57.1, vite 8.3.2, @sveltejs/vite-plugin-svelte 7.3.1 | dev server updates |
| SvelteKit | @sveltejs/kit 3.0.0, svelte 5.57.1, vite 8.3.2, @sveltejs/adapter-auto 8.0.0, svelte-check 4.7.6, typescript 6.0.3 | `svelte-check` |
| Angular | @angular/core 22.2.1, @angular/build 22.2.1, @angular/cli 22.2.1, typescript 6.0.3 | zoneless |
| Astro | astro 7.3.5, vite 8.3.2 | |
| Astro with Solid | astro 7.3.5, @astrojs/solid-js 7.0.2, solid-js 1.9.15 | `client:load`, `client:visible`, `client:only` |
