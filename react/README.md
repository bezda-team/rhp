# @bezda/rhp-react

rhp for React: charts built out of HTML elements placed by CSS, with React components.
It is [rhp](https://github.com/bezda-team/rhp) written for React, not a wrapper around the Solid version: the same Chart, Plot, slats and blocks, the same CSS, and the same charts on screen, pixel for pixel.

```sh
npm install @bezda/rhp-react
```

React 19 or later is its only peer dependency, and there is no stylesheet to import: rhp adds its CSS when the first chart appears.

## Example

```jsx
import { useState } from "react";
import { Chart, Plot, Bar, Label, slat } from "@bezda/rhp-react";

const Fruit = slat({ thickness: 32, room: { start: 80, end: 40 } }, (d) => (
  <div>
    <Label edge="start">{d.name}</Label>
    <Bar to={d.sold} />
    <Label at={d.sold}>{d.sold}</Label>
  </div>
));

export default function App() {
  const [sold, setSold] = useState([12, 18, 7]);
  return (
    <Chart scale={[0, 30]}>
      <Plot name={["Apples", "Bananas", "Cherries"]} sold={sold}>{Fruit}</Plot>
    </Chart>
  );
}
```

A **slat** is the template for one row of data: a function of the row, `d`, that returns one element.
Each prop of the Plot is a column of data (a **data group**), and each slat reads its row's values as `d.name` and `d.sold`.
A value that is not a list is every row's, and a shorter list wraps around.
**Blocks** (Bar, Dot, Tick, Label, Cell, Place, Area and Line) write their numbers as CSS variables, and rhp's CSS turns them into places on the Chart's scale.

Everything on [rhp's website](https://rhp.vercel.app) applies: the guides, the blocks, slat CSS, themes, gutters, the cross scale, keyboard, accessibility and the gallery.
Where the React version differs, it says so below.

## What React draws again

A chart is React components all the way down, and rhp-react keeps React's work to what changed.

- **A row whose values didn't change keeps its slat.**
  The Plot compares each row's values with the ones its slat was drawn from, and React draws again only the slats of rows that changed.
  A new list with one new number draws one slat again, whether the list is new or not.
- **A block writes only the CSS variables that changed.**
  It writes them in the next frame (as rhp does everywhere, so Safari's transitions don't stall under a slider), and React never writes them again.
- **A new scale draws nothing but the axis.**
  The Chart writes `--rhp-min` and `--rhp-max` on its own element and the CSS moves every block; no slat is drawn again.
- **Sorting moves slats without drawing them.**
  The Plot writes each slat's `--rhp-position` itself.
  A slat that reads `d.position` or `d.index` is drawn again when its own changes, and no other is.
- **A data group can be a function of the row**, worked out per row: `color={(d) => (d.v > 50 ? "positive" : "muted")}`.
  A slat is drawn again only where the function's result changed.
  A function you keep (hoisted, or in `useCallback`) runs again only for the rows whose values it reads changed.
- **Plot is memoized:** drawn again with the same props, it does nothing.

## Interaction

The state is your app's, and it goes back into the Plot as data.
For a highlight, a function of the row is cheaper than a list: only the two slats that change are drawn again.

```jsx
function Sales({ names, values }) {
  const [on, setOn] = useState(null);
  return (
    <Chart>
      <Plot name={names} v={values} on={(d) => d.index === on}>
        {(d) => (
          <div onPointerEnter={() => setOn(d.index)} onPointerLeave={() => setOn(null)}>
            <Label edge="start">{d.name}</Label>
            <Bar to={d.v} color={d.on ? "series-2" : "series-1"} />
            {d.on && <Label at={d.v}>{d.v}</Label>}
          </div>
        )}
      </Plot>
    </Chart>
  );
}
```

- **Handlers go on blocks and slat roots** like on any element: `onClick`, `onPointerEnter`, `onKeyDown`.
  With many slats, one handler around the chart with `data-row={d.index}` and `closest("[data-row]")` is simpler than one per slat.
- **A slat's root can be a component of your own.**
  rhp places the element it draws, as a slat root is placed; on a server, have it pass the props it is given to its root element (`<div {...props}>`), so the server's HTML places it too.
- **A slat can use hooks.** It is called while React draws its row, so a slat written as a component, `function Row(d) { const [open, setOpen] = useState(false); … }`, keeps its state while its row is there.
- **`d.index` and `d.position` are always the row's latest**, also when read later in a handler.
- **`keyboard`** on a Plot gives its slats one tab stop, with the arrow keys, Home and End in the order shown.

## Motion

Without `animate`, values move with CSS transitions (the CSS version).
With `animate` on a Chart or a Plot, the numbers themselves move on one page clock (the JS version), and a slat reading a moving value gets its in-between value in each frame, so a label counts along with its bar.
Only the slats whose values move are drawn in those frames.
`useAnimated(value, { duration, ease })` gives a value of your own app the same motion.

## On a server

Charts draw on a server with `react-dom/server` and are taken over by `hydrateRoot` with nothing drawn twice.
The CSS a chart needs goes into the page as React 19 stylesheets: each sheet is written once per page however many charts ask for it, and React puts it in the head.
In the browser rhp adopts its own sheets and turns the server's copies off.

- The package's module says `"use client"`, so in a Next.js app the charts are client components that the server still draws.
- A Chart works out its gutters from the Plots it is given as children.
  A Plot drawn by a component of your own inside the Chart is told to it once the page runs in the browser, so on a server give the Chart its Plots directly for the right room in the server's HTML.
- `linkedCss()` and `noCssGuard()` work as in rhp, with `@bezda/rhp-react/rhp.css` and `rhp-no-css-guard.css` to link.

## Differences from rhp for Solid

| rhp (Solid) | rhp-react |
|---|---|
| `class` | `className` |
| `key` on a Plot names a row's identity | `rowKey` (React keeps `key` for itself) |
| `style` as a string or an object of CSS names | `style` as React's object (CSS variables as keys) |
| `useOrientation()` gives a signal | `useOrientation()` gives the orientation |
| `animated(read, settings)` | `useAnimated(value, timing)` |
| `d.value` is read reactively | `d` holds the row's values; a slat whose values change is drawn again |
| `static`: every row is drawn again when the data changes | `static`: each row that changed is drawn again, as new elements |
| ManyDots' `key` | ManyDots' `rowKey` |

## Develop

```sh
npm install            # in rhp's folder: rhp-react's source shares rhp's src/ (its CSS, layout, data helpers and motion)
node react/build.mjs   # react/dist/
node react/test/run.mjs          # what rhp-react does, in Chromium (BROWSER=webkit or firefox for the others)
node react/test/ssr/run.mjs      # drawn on a server and taken over
node react/test/parity/run.mjs   # the same charts drawn by rhp and by rhp-react: the same elements and pixels
```

`bench/ab` times rhp-react against rhp (`node build.mjs base,react`, then `node run.mjs --variants base,react`).
