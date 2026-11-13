# Environments

## Contents

1. [Find the environment](#1-find-the-environment): the detection table
2. [The example chart](#2-the-example-chart): its data, its CSS, its fonts
3. [Plain HTML page](#3-plain-html-page)
4. [Solid](#4-solid): Vite, TypeScript, SolidStart
5. [Solid JSX and the html template](#5-solid-jsx-and-the-html-template): the conversion rules
6. [The chart module and the mount helper](#6-the-chart-module-and-the-mount-helper): for every app that is not a Solid or React app
7. [React](#7-react): rhp-react, Vite, TypeScript, from a recipe
8. [Next.js](#8-nextjs): App Router, Pages Router
9. [Vue and Nuxt](#9-vue-and-nuxt)
10. [Svelte and SvelteKit](#10-svelte-and-sveltekit)
11. [Angular](#11-angular)
12. [Astro](#12-astro): a custom element, or a Solid island
13. [Check a chart inside an app](#13-check-a-chart-inside-an-app)
14. [Caveats for every app](#14-caveats-for-every-app)
15. [What was verified, and the versions](#15-what-was-verified-and-the-versions)

Where an rhp chart goes in a plain HTML page and in Solid, React, Next.js, Vue, Nuxt, Svelte, SvelteKit, Angular and Astro apps.
Every section builds the same small poster chart, with its data passed in by the app, and every one was built and checked in a browser on 2026-10-03 with `@bezda/rhp` 2.0.1, React and Next.js again on 2026-11-12 with `@bezda/rhp-react` 2.3.0 (section 15).

## 1. Find the environment

Read package.json (`dependencies` and `devDependencies`) and the config files at the project's root.
Go down the table and take the first row that matches: Next.js apps also have `react`, Nuxt apps `vue`, SvelteKit apps `svelte`.

| Files | package.json has | Environment | Write the chart as | Section |
|---|---|---|---|---|
| no package.json; a chatbot answer; "an HTML file" | | plain page | one `.html` file, rhp from jsDelivr | 3 |
| `astro.config.*` | `astro` and `@astrojs/solid-js` | Astro with Solid | a Solid island (JSX) | 12 |
| `astro.config.*` | `astro` | Astro | a custom element drawing an html-template chart | 12 |
| `next.config.*`, `app/` or `src/app/` | `next` | Next.js App Router | a client component with `@bezda/rhp-react`, which the server draws too | 8 |
| `next.config.*`, `pages/` or `src/pages/` | `next` | Next.js Pages Router | a React component with `@bezda/rhp-react` | 8 |
| `nuxt.config.*` | `nuxt` | Nuxt | a Vue component | 9 |
| `src/routes/`, `sveltekit()` in `vite.config.*` or a `svelte.config.*` | `@sveltejs/kit` | SvelteKit | a Svelte component | 10 |
| `src/entry-server.*`, `src/routes/` | `@solidjs/start` | SolidStart | a JSX component | 4 |
| `angular.json` | `@angular/core` | Angular | a standalone component | 11 |
| `vite.config.*` with `solid()` | `solid-js`, `vite-plugin-solid` | Solid | a JSX component | 4 |
| `vite.config.*` with `react()` | `react`, `react-dom` | React | a React component with `@bezda/rhp-react` | 7 |
| `vite.config.*` with `vue()` | `vue` | Vue | a Vue component | 9 |
| `vite.config.*` with `svelte()` | `svelte` | Svelte | a Svelte component | 10 |
| a bundler and none of the above | | modules | the chart module and `mountChart`, from the app's own script | 6 |

- When a Next.js app has both `app/` and `pages/`, the folder of the page that shows the chart decides.
- A `tsconfig.json` and `.ts` or `.tsx` sources mean TypeScript: each section has the typed files.
- `solid-js` in `node_modules` or in the lock file does not make a Solid app: npm installs it with `@bezda/rhp` in every app, as a peer dependency, and it is not added to package.json.
  Only `solid-js` in package.json, together with `vite-plugin-solid`, `@solidjs/start` or `@astrojs/solid-js`, makes a Solid app.
- Install in every app with the project's package manager: `npm install @bezda/rhp`, or `npm install @bezda/rhp-react` in React and Next.js apps.
  Only npm was tested; pnpm, yarn and bun were not.
- Not tested: React apps that render on a server outside Next.js (React Router in framework mode, Remix, Gatsby), Preact, Qwik, Lit, Ember, Nuxt 3, SvelteKit 2.
  React apps use section 7 (rhp-react draws on any React 19 server, but only Next.js was tested); for the others, use section 6: draw the chart in the browser in the component's mount hook, dispose it in its unmount hook, and check the page in a browser.

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
| Next.js App Router | `Towers.tsx`, a client component | imported by `Towers.tsx` | `next/font` in `app/layout.tsx` | drawn, then hydrated |
| Next.js Pages Router | `Towers.jsx` | imported by `pages/_app.js` | `pages/_document.js` | drawn, then hydrated |
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
For a poster page, copy the complete [PNG download block](download.md) before `</body>`, after the chart's module script.

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
  For a page that must never change, replace the `2` with the latest release's exact version, which `npm view @bezda/rhp version` prints.

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

Recipes, plain pages and every app that is neither a Solid nor a React app write charts with the html template; a Solid app writes Solid JSX, and a React app writes React JSX with rhp-react (section 7).
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
8. The template module has no `Dynamic` or `Portal`, and before rhp 2.0.2 no `createSelector`, `Switch`, `Match`, `splitProps` or `mergeProps` (api.md, section 2): compare in a function (`on=${(d) => on() === d.name}`) and use `Show`, which work with every rhp 2.

## 6. The chart module and the mount helper

In every app that is neither a Solid app nor a React app, the chart is an ES module written with the html template, and a small helper draws it into an element and hands it new data.
Vue, Nuxt, Svelte, SvelteKit, Angular and Astro use the module as it is; React and Next.js use rhp-react instead (section 7).

The chart module, `towers-chart.js`: section 3's script without the data and the `render` call, with the chart exported.

```js
// The towers poster, written with rhp's html template: the same file in every app that is not a Solid or React app
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
// Draws an rhp chart into an element of an app that is not a Solid app (Vue, Svelte, Angular, a plain script),
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
// The towers poster, written with rhp's html template: the same file in every app that is not a Solid or React app
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
// Draws an rhp chart into an element of an app that is not a Solid app (Vue, Svelte, Angular, a plain script),
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
Install: `npm install @bezda/rhp-react`; it needs React 19 or later and nothing else (no Solid, no stylesheet to import).
Import everything from `@bezda/rhp-react`, never from `@bezda/rhp` or `@bezda/rhp/standalone`, which are rhp for Solid.

rhp-react is rhp written with React: the same Chart, Plot, slats and blocks as React components, the same CSS, and the same chart on screen.
A slat is a function of the row that returns React JSX, and the chart's state is React state.

```
index.html                    the fonts (section 2)
src/charts/Towers.jsx         the chart, a React component
src/charts/towers-chart.css   the poster's CSS (section 2)
src/data/towers.js            the data (section 2)
src/App.jsx                   the app passes its data
```

`src/charts/Towers.jsx` is section 4's Solid component written for React (the rules are below):

```jsx
// The towers poster in a React app: rhp-react
import { useState } from "react";
import { Chart, Plot, Bar, Label, Poster, slat, sortBy } from "@bezda/rhp-react";
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
  <div className={d.on ? "tower on" : "tower"} data-name={d.name}>
    <Label edge="start" className="name">{d.name}</Label>
    <Bar to={d.height} className="bar" />
    <Label at={d.height} className="height">{d.height} m</Label>
  </div>
));

const BY_HEIGHT = sortBy("height", "desc");
const LOOK = { font: '"Archivo", system-ui, sans-serif', ink: "#17191c", muted: "#5d6168" };

// The name of the tower an element is in, or null (between towers, on the text)
const nameOf = (el) => el?.closest("[data-name]")?.dataset.name ?? null;

// The chart: a poster with a one-line readout over the towers, ranked by height.
// Its data comes in as rows, a list of { name, city, year, height }.
export function Towers({ rows }) {
  const [on, setOn] = useState(null); // the name of the tower the reader picked
  const current = rows.find((t) => t.name === on);
  const tallest = Math.max(...rows.map((t) => t.height));
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
    <Poster className="towers"
      kicker="Skyscrapers, 2025"
      title={"Burj Khalifa still towers 149 m over the rest"}
      dek="The seven tallest finished buildings in the world, by height to their architectural top."
      note="Source: Council on Tall Buildings and Urban Habitat (CTBUH), 2025."
      onPointerMove={(e) => e.pointerType !== "touch" && pick(e)}
      onClick={pick}
      onFocus={pick}
      onPointerLeave={leave}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOn(null)}>
      <p className="readout">
        {current ? <><b>{current.name}</b> in {current.city}, finished {current.year}</> : "Point at a tower, tap it, or Tab to it."}
      </p>
      <Chart scale={[0, tallest]} ticks={false} label="The seven tallest buildings, by height" theme={LOOK}>
        <Plot rows={rows} rowKey="name" order={BY_HEIGHT} on={(d) => on === d.name} keyboard>{Tower}</Plot>
      </Chart>
    </Poster>
  );
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

- `rows` is the app's data, from props or state. Give the chart a new array when it changes (React's own rule): only the slats whose values changed are drawn again.
  With `rowKey="name"` on the Plot, each tower keeps its slat when towers are added or removed: the element stays and its bar moves (checked: one height changes and a tower is added, then back).
- Keep slat types, `sortBy(...)` and objects like the theme at the top level of the module, as above.
  A slat written inside the component is a new function in every render, so every slat is drawn again.
- A data group can be a function of the row, worked out per row: `on={(d) => on === d.name}` tells each slat whether it is the picked one, and only the two slats that change are drawn again.
- A slat can use hooks: it is called while React draws its row (`function Row(d) { const [open, setOpen] = useState(false); … }`).
- StrictMode (in Vite's starter) leaves one chart, and the JS version (`animate`) moves in it (checked).
- When the component unmounts, nothing of the chart is left (checked).
- Fast Refresh: an edit to `Towers.jsx` or the data updated the page without a reload, with one chart (checked).

**From a recipe or a Solid example**: recipes are written with the html template, and sections 3 to 5 with Solid.
The chart is the same in React; only the way it is written changes:

| html template or Solid | rhp-react |
|---|---|
| `import { … } from "@bezda/rhp/standalone"` or `"@bezda/rhp"` | `import { … } from "@bezda/rhp-react"` |
| `` html`<${Label} edge="start">${() => d.name}<//>` `` | `<Label edge="start">{d.name}</Label>` |
| a reactive read, `${() => d.sold}` or `{d.sold}` in Solid JSX | `{d.sold}`: `d` holds the row's values, and a slat whose values change is drawn again |
| `class="tower"` | `className="tower"` |
| `key="name"` on a Plot (or ManyDots) | `rowKey="name"` (React keeps `key` for itself) |
| `style="--rhp-radius: 0px"` | `style={{ "--rhp-radius": "0px" }}` |
| `const [on, setOn] = createSignal(null)`, read as `on()` | `const [on, setOn] = useState(null)`, read as `on` |
| `createMemo(() => …)` | a value worked out in the component (`const tallest = Math.max(…)`), or `useMemo` for heavy work |
| `` <${Show} when=${current} fallback="…">${(t) => …}<//> `` | `{current ? … : "…"}` |
| `` <${For} each=${list}>${(item) => …}<//> `` | `{list.map((item) => <… key={item.id} />)}` |
| `onFocusIn`, `onFocusOut` | `onFocus`, `onBlur` (React's bubble) |
| `onMount`, `createEffect`, `onCleanup` | `useEffect` |
| `animated(read, settings)` | `useAnimated(value, timing)` |
| `useOrientation()()` (a signal) | `useOrientation()` (the orientation) |
| data groups as functions of the props, `rows=${() => props.rows}` | the values, `rows={rows}` |

Everything else (the slat type's settings and `css`, the Chart's and the Plot's props, the blocks, `theme`, `animate`, `keyboard`, the helpers) is the same.

**TypeScript** (`Towers.tsx`): the same file with these lines changed, checked with `tsc -b` under TypeScript 7.0's defaults, which are strict:

```tsx
import { useState, type PointerEvent, type SyntheticEvent } from "react";
export type TowerRow = { name: string; city: string; year: number; height: number };
const Tower = slat<TowerRow & { on: boolean }>({
const nameOf = (el: Element | null) => el?.closest("[data-name]")?.getAttribute("data-name") ?? null;
export function Towers({ rows }: { rows: TowerRow[] }) {
  const [on, setOn] = useState<string | null>(null); // the name of the tower the reader picked
  const pick = (e: SyntheticEvent) => {
    const name = nameOf(e.target as Element);
  const leave = (e: PointerEvent<HTMLElement>) => {
```

- A function data group needs no type: in `on={(d) => on === d.name}`, `d` is the slat's row (`TowerRow & { on: boolean }`), and a field it doesn't have is an error.
- The data file imports the type: `import type { TowerRow } from "../charts/Towers";`.

## 8. Next.js

**App Router** (`app/`): the chart is a client component, and the server draws it too.
The page's HTML has the chart, and the browser takes it over.
Checked: `next build` passes (Next.js 16.4 with Turbopack, TypeScript), the prerendered page has the 7 slats in their places, and `next dev` logs no hydration warning.

```
app/layout.tsx                      the fonts, with next/font
app/page.tsx                        a server component: it has the data and renders <Towers rows={...} />
components/towers/Towers.tsx        the chart (section 7), with "use client"
components/towers/towers-chart.css  the poster's CSS, with the font variables
data/towers.ts                      the data
```

`components/towers/Towers.tsx` is section 7's `Towers.tsx` with `"use client"` first and the next/font variable in the theme:

```tsx
"use client";
// The towers poster in a React app: rhp-react
import { useState, type PointerEvent, type SyntheticEvent } from "react";
import { Chart, Plot, Bar, Label, Poster, slat, sortBy } from "@bezda/rhp-react";
import "./towers-chart.css";

// ... and the theme:
const LOOK = { font: "var(--font-archivo), system-ui, sans-serif", ink: "#17191c", muted: "#5d6168" };
```

`app/page.tsx`:

```tsx
import { Towers } from "@/components/towers/Towers";
import { TOWERS } from "@/data/towers";

// A server component: it holds (or fetches) the data and passes it to the chart, which the server draws too
export default function Home() {
  return (
    <main style={{ padding: "32px 16px" }}>
      <Towers rows={TOWERS} />
    </main>
  );
}
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${antonio.variable} ${archivo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

In `towers-chart.css`, the two font stacks become `var(--font-archivo), system-ui, sans-serif` (on `.towers`) and `var(--font-antonio), "Arial Narrow", sans-serif` (on `.headline`).

- `"use client"` goes on the chart's file because a slat type is a function, and a server component cannot pass a function to a client component.
  rhp-react's own components are client components, so a server component can also render `<Chart>` and `<Plot>` itself, with a slat type it imports from a `"use client"` module (checked).
- The rows pass from the server component to the client as props, so they must be data React can send: plain objects, arrays, strings and numbers (checked with those).
- rhp's CSS goes into the page's head with the chart, once however many charts the page has: nothing to import or link.
- Development: StrictMode (on by default in the App Router) leaves one chart, and Fast Refresh updated the page after an edit to `Towers.tsx` and to the data, without a reload (checked).
- Keep the data out of `components/towers/`: macOS and Windows ignore case in file names, so with a `towers.ts` beside `Towers.tsx` an import of `./Towers` can find the data file (it broke the build, TS1149, checked).
- create-next-app's own page pads its `main` with `px-16` at every width, which leaves the chart 262px of a 390px phone and 192px of a 320px one.
  When you add the chart to that page, let its box break out of the padding on phones: `<div className="-mx-12 self-stretch sm:mx-0">` around it (the `main` is a flex column, so the stretched box takes the margins back).
  Measured in Next.js 16's starter: 358px at 390, 288px at 320, no sideways scroll, and the same box as before from 640px.

**Pages Router** (`pages/`): the page imports the chart like any component, and the server draws it.
`Towers.jsx` is section 7's file with no CSS import.

`pages/index.js`:

```jsx
import { Towers } from "@/components/towers/Towers.jsx";
import { TOWERS } from "@/data/towers.js";

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
- Checked: `next build`, `next start` (the page's HTML has the 7 slats), and Fast Refresh in `next dev`.

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
- A React chart is drawn with the app's own `@bezda/rhp-react`, and gets every check but one: how rhp's components are used is checked for `@bezda/rhp` only, so the report says nothing about it.
- Angular: name the entry `.js`, so that the app's TypeScript build (which includes every `src/**/*.ts`) skips it; a `.ts` entry with a CSS import failed `ng build` (TS2882).
- The checker found no problems in each of the eleven entries tested on 2026-10-03: React, React with TypeScript, Next.js, Solid, Solid with TypeScript, Vue, Nuxt, Svelte, SvelteKit, Astro and Angular.
  On 2026-11-12 the React and Next.js entries with rhp-react, and section 3's page, each got one warning from a check added since (`selection-hover-stays`): after a click picks a tower, hovering another and moving onto the poster's text keeps the hovered one.

## 14. Caveats for every app

1. The app's own CSS reaches the poster: inherited text styles (font, color, `letter-spacing`, `text-align`, line height) and rules for elements (`p`, `figure`).
   SolidStart's starter CSS (`p { max-width: 14rem }`) cut the readout at 390px until the readout set `max-width: none` (checked).
   Give the poster's root its own font, color, `letter-spacing` and `text-align`, and your own elements inside it their own sizes and margins.
2. Scoped component styles never reach the chart (Vue `scoped`, Svelte, Astro, Angular's emulated encapsulation): rhp makes the chart's elements, not the component's template.
   Use a plain CSS file, imported where section 2's table says.
3. Style regular slat blocks with the slat type's `css` and the Chart's `theme`: page CSS cannot change their protected appearance (api.md, section 11).
   The experimental [ManyDots collection](api.md#manydots-experimental-point-collection) instead accepts application classes and `pointStyle` for point appearance while retaining its geometry guard.
   In frameworks with scoped component CSS, put those application classes in the plain CSS file too.
4. Solid (SolidStart, Astro islands) and rhp-react (Next.js) draw the chart on the server.
   Everywhere else the server sends an empty box and the browser draws the chart, so the content below moves down once; give the box a `min-height` if that matters.
5. Data the app loads (a fetch, a Refresh button, a feed) has three more states than the chart: loading, failed and empty.
   Draw each in the chart's place, at the chart's height: a quiet "Loading…", a line that says what failed with a way to try again, and a sentence for no data ("No activity yet"), never an empty plot, an axis of 0.2, 0.4…, or a headline computed from nothing.
6. macOS and Windows ignore case in file names: `towers.ts` beside `Towers.tsx` made `./Towers` load the data file (checked in Next.js).
   Give such files different names or folders.
7. In a React or Next.js app, import everything from `@bezda/rhp-react`.
   In any other app that is not a Solid app, import everything from `@bezda/rhp/standalone` and nothing from `solid-js` (api.md, section 2).
8. Solid's html template compiles each template with `new Function`, so a page whose Content-Security-Policy forbids `unsafe-eval` cannot draw html-template charts: allow it for that page, or use JSX (a Solid app, or rhp-react), which needs no eval.
9. A chart takes the width of its box and has none of its own, so a box that sizes to its content shrinks it to the content beside it, or to nothing: a flex item with `margin: auto`, an inline-block, a float, `width: fit-content`.
   Both starters have a flex column (Next.js's `body`, Vite's `#root`): there a `<main style={{ maxWidth: 640, margin: "40px auto" }}>` left the plot 0px wide in Next.js and as wide as the buttons above it in Vite (checked).
   Give that box a width (`width: 100%`, as the poster's CSS does), or in a flex row `flex: 1` and `min-width: 0`; rhp warns in the console when a chart's plot stays 0px wide.

## 15. What was verified, and the versions

On 2026-10-03, on macOS 26.5 with Node 24.15.0 and npm 11.12.1, with `@bezda/rhp` 2.0.1 installed from npm (from jsDelivr for the plain page), each environment passed:

- its production build, with no warning about the chart's code;
- the built app, served by its production server (`vite preview`, `next start`, `node .output/server/index.mjs`, or a static server for Astro's and Angular's output), opened in Playwright 1.63's Chromium at 1280px and 390px: no console error or warning, one chart with 7 slats, no sideways scroll, the readout on one line for every tower on hover, the readout cleared when the pointer leaves, Tab and the arrow keys, and a tap on a touch phone;
- a test page where the app's state changes the data (one height changes and a tower is added, then back), changes a row in place where the framework allows it, and removes and adds the chart: each tower keeps its slat, the app's data stays unchanged, and nothing is left behind;
- a look at the screenshots.

On 2026-10-04 the chart's pointer handlers changed (a tap or a click picks on `click`, a scroll never picks, a pick stays between towers and on the focused tower).
The plain page and the Solid component were checked again in Playwright's Chromium (mouse, keyboard, a tap and a scroll at 390px, and the kit's checker), and the TypeScript files with `tsc` in the Solid and Angular projects; every other environment draws the same chart module.

On 2026-11-12, on macOS 26.5.2 with Node 24.15.0 and npm 11.12.1, React and Next.js were built again with rhp-react (`@bezda/rhp-react` 2.3.0, packed from the repository before its release), in new apps from Vite's and create-next-app's starters.
Each passed the checks above (without a row changed in place: a React app gives the chart new data) in Playwright 1.63's Chromium, WebKit and Firefox.
Next.js also passed `next dev` with no hydration warning, and its server's HTML had the 7 slats in their places.

| Environment | Versions | Also checked |
|---|---|---|
| plain page | Chrome 154, Safari 26.5.2 and Firefox 155 (Playwright's build) from `file://`; Playwright's Chromium | |
| Solid | solid-js 1.9.15, vite 8.3.2, vite-plugin-solid 2.11.14 | dev server updates |
| Solid with TypeScript | the same, typescript 6.0.3 | `tsc -b` |
| SolidStart | @solidjs/start 2.0.5, @solidjs/router 1.0.0, nitro 3.0.260610-beta, solid-js 1.9.15, vite 8.3.2 | the server's HTML has the chart |
| React | react 19.3.1, react-dom 19.3.1, vite 8.3.8, @vitejs/plugin-react 6.3.0 | StrictMode, Fast Refresh |
| React with TypeScript | the same, typescript 7.0.2 | `tsc -b` |
| Next.js App Router | next 16.4.6 (Turbopack), react 19.3.0, typescript 5.9.3 | the server's HTML, no hydration warning, StrictMode, Fast Refresh |
| Next.js Pages Router | next 16.4.6, react 19.3.0 | the server's HTML, Fast Refresh |
| Vue | vue 3.5.43, vite 8.3.2, @vitejs/plugin-vue 6.0.9 | dev server updates |
| Nuxt | nuxt 4.5.2, vue 3.5.43, vite 8.3.2, nitropack 2.13.4 | |
| Svelte | svelte 5.57.1, vite 8.3.2, @sveltejs/vite-plugin-svelte 7.3.1 | dev server updates |
| SvelteKit | @sveltejs/kit 3.0.0, svelte 5.57.1, vite 8.3.2, @sveltejs/adapter-auto 8.0.0, svelte-check 4.7.6, typescript 6.0.3 | `svelte-check` |
| Angular | @angular/core 22.2.1, @angular/build 22.2.1, @angular/cli 22.2.1, typescript 6.0.3 | zoneless |
| Astro | astro 7.3.5, vite 8.3.2 | |
| Astro with Solid | astro 7.3.5, @astrojs/solid-js 7.0.2, solid-js 1.9.15 | `client:load`, `client:visible`, `client:only` |
