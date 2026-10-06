---
name: rhp
description: Makes charts, graphs, plots, infographics and data visualizations with rhp (@bezda/rhp, reactive html plots), charts built from HTML elements and CSS with SolidJS that run in a plain HTML page, React, Next.js, Vue, Svelte, Solid or Astro. Use it whenever the user asks to create, restyle, fix or extend a chart and rhp is the library to use, which is when they name rhp or @bezda/rhp, the project depends on @bezda/rhp, or the project has no chart library yet. Covers bar, column, grouped, stacked, 100% stacked, diverging, waterfall, line, area, scatter, bubble, slope, sparkline, histogram, box, violin, strip, dumbbell, gantt, candlestick, donut, radial, waffle, heatmap, lollipop, bullet and pyramid charts, bar chart races and live data, with magazine-style poster design, interaction, and a tool that renders the chart and reports problems.
license: MIT
metadata:
  author: Bezda (rhp)
  library: "@bezda/rhp@2"
  homepage: https://rhp.vercel.app
---

# Making charts with rhp

rhp draws charts out of HTML elements placed by CSS.
You describe one **slat** (the element drawn for one row of data) from a few **blocks** (Bar, Dot, Tick, Label, Cell, Place, Area, Line), and rhp draws a slat for every row of the data and keeps each one in its place.
For bulk scatter points, the experimental [`ManyDots` collection](references/api.md#manydots-experimental-point-collection) can draw plain HTML points directly inside a Chart with `cross`, without a Plot or a slat per point.
Use a repository build that exports it; a version-2 package or CDN URL alone does not establish prototype availability.

**You do not know rhp yet.**
rhp 2 was written in September 2026, after your training data.
An older, unrelated rhp 1 ("react-html-plots", React components with Legend-State, packages `@bezda/rhp@0.0.x`, `@bezda/rhp-core`, `@bezda/rhp-base`) may be in your memory: never use any of it.
Write rhp code only from this skill's recipes and references, never from memory, and check what you wrote with the checker before you hand it over.

## The workflow

Follow these eight steps in order, for every chart, however short or detailed the request.

### 1. Write the brief

Before any code, write a short brief in your reply:

```
Brief
Asked (must all be in the result):
- "<the user's words>" -> what that means for the chart
- ...
Chosen (the user left these open):
- form, environment and file, data, look, interaction, motion (CSS by default; JS for data that changes rapidly), size
```

- Put under **Asked** every explicit request, quoting the user's words: the data and its numbers, the chart type, titles and text, colors, fonts, size, orientation, sort order, labels, legend, interactions, animation, framework, file name, and anything they said not to do.
- Everything else goes under **Chosen**, filled with the defaults below.
- A request is never dropped, swapped for something "better" or quietly reduced. If rhp cannot do something exactly, say so in the brief and do the closest thing.
- A part of the data the user did not name (what is left when their parts do not reach 100%) is a quiet remainder: unlabeled, in the quiet color, with no key entry, and explained in the note, never a new series with its own color.
  Write it under **Asked**, beside the request it changes, as a deviation.
- An explicit request beats every default here: "no title", "no poster", "static", "no animation", "minimal", "dark", "use Chart.js colors" all win.
- Ask a question only when the request cannot be built at all without the answer. Otherwise choose, build, and say what you chose.

### 2. Find where the chart goes

Look at the project before you write anything: read package.json (dependencies and devDependencies) and go down this table; the first row that matches wins, because a Next.js app also has `react`, a SvelteKit app `svelte`, a Nuxt app `vue`.

| What you find | Write the chart as | [environments.md](references/environments.md) |
|---|---|---|
| no project, an empty folder, a chatbot conversation, or "an HTML file" | one `.html` file that loads rhp from jsDelivr (it needs a connection) | section 3 |
| `astro` | a Solid island with `@astrojs/solid-js`, otherwise a custom element | section 12 |
| `next` | a React component the server never renders (loaded with `next/dynamic` and `ssr: false`) | section 8 |
| `nuxt` | a Vue component | section 9 |
| `@sveltejs/kit` | a Svelte component | section 10 |
| `@solidjs/start` | a JSX component importing `@bezda/rhp` | section 4 |
| `@angular/core` | a standalone component | section 11 |
| `solid-js` (with `vite-plugin-solid`) | a JSX component importing `@bezda/rhp` | section 4 |
| `react` | a React component that mounts an html-template chart from `@bezda/rhp/standalone` | section 7 |
| `vue` | a Vue component | section 9 |
| `svelte` | a Svelte component | section 10 |

`solid-js` in node_modules alone does not make a Solid app: npm installs it with `@bezda/rhp` in every app.

Name a new file after its subject (`languages.html`, `RainfallChart.jsx`), and put it where the project keeps similar files.
Install with the project's package manager (`npm install @bezda/rhp`) unless the chart is a plain HTML page, which loads rhp from jsDelivr.

### 3. Design the slat, then pick the recipes to start from

An rhp chart has no chart type to configure.
It is one slat, the element drawn for each row of data, composed from blocks, so you design that slat:

1. **What is one row?** A country, a month, a task, a runner, an hour of a weekday. That is what the Plot gets, one slat per row.
2. **What must the reader see in that row?** Its name, its value as a bar or a dot, a range from one value to another, a target, a trend, its share, an icon. Each of those is a block (`Label`, `Bar`, `Dot`, `Tick`, `Line`, `Area`, `Cell`, `Place`) or an element of your own inside one.
3. **What sits on top of the slats?** A second Plot over the first (`overlap`) draws layers: a scatter, a line, a crosshair, a marker for today.
4. **What does each slat hold of its own?** A Plot inside a slat draws small multiples: a heatmap's cells, a grouped bar's bars, a strip of dots.

[forms.md](references/forms.md) maps data and stories to forms and to these compositions; use the form the user named, if they named one.
Then open the closest recipe in `recipes/` and read it whole.
Every recipe is a complete, tested, designed chart page, a worked example of one composition: start from it, keep its structure and its techniques, and replace its data, text, look and details.
When the story needs a slat no recipe has (a name, a bar, a sparkline and a target in one slat), combine the techniques of several recipes.

For a bulk scatter collection, consider `ManyDots` instead of creating one slat per point.
Keep `Dot` when you need rich point content or Plot's automatic keyboard navigation, selection, or readout behavior.
Both remain explicit choices at any count, with no automatic switch at 500 points.
Read the [ManyDots API and accessible example](references/api.md#manydots-experimental-point-collection) before using it.
It preserves per-point color, size, shape, classes, and appearance styles and supports native hover, click, touch, and pointer events through its host.
Point metadata uses the original `data-rhp-index`; drag behavior and keyboard-accessible controls are supplied by the application.
Its numeric sizes mean pixels, updates are immediate and scan the rows, and initial SSR hydration requires aligned row order when DOM identity matters.

| Recipe | Use it for |
|---|---|
| `bar` | ranked categories, long names (horizontal bars) |
| `column` | values over a few periods or categories (vertical bars) |
| `grouped-bars` | two to four values side by side per category |
| `stacked-bars` | parts adding up to a total per category |
| `stacked-100` | shares of 100% per category |
| `diverging-bars` | values either side of zero, survey agree / disagree |
| `waterfall` | how a start value becomes an end value, step by step |
| `line` | one series over time |
| `multi-line` | several series over time |
| `area` | one quantity over time, filled |
| `scatter` | two measures per item |
| `bubble` | two measures plus a size per item |
| `slope` | change between two dates per item |
| `sparklines` | many small series side by side, a table of trends |
| `race` | a ranking that changes step by step, played over time (JS motion) |
| `live` | values that arrive from a feed without pause (JS motion) |
| `histogram` | the distribution of one measure |
| `box-plot` | distributions compared by group, summarized |
| `violin` | distributions compared by group, their full outline |
| `strip` | every value of a few groups as dots |
| `dumbbell` | two values per item and the gap between them |
| `gantt` | tasks over time, a schedule |
| `candlestick` | open, high, low and close prices |
| `donut` | a few parts of one whole |
| `radial-bars` | progress toward goals, in a ring |
| `waffle` | counts out of 100, people or units |
| `heatmap` | a value over two categories (weekday by hour) |
| `lollipop` | ranked values, lighter than bars |
| `bullet` | actual against target, with bands |
| `pyramid` | two sides of one population by age |

The rhp MCP server's `rhp_recipe` tool (`rhp:rhp_recipe`) returns the same recipes when the files are not on disk.

### 4. Design it

Unless the user gave a style, the chart is an original **editorial poster**: a magazine, advertisement or feature-article infographic designed for this subject.
Read [design.md](references/design.md) and follow its procedure; in short:

- The poster carries a **kicker** (the topic, a few words), a **headline that states the finding** ("Bananas outsell everything else", not "Fruit sales"), a **dek** (context and how to read the chart), the chart, and a **note** (source and year, or "Illustrative data"; no source line when the user gave the data and no source).
- Derive the look from the subject: a material or setting, a palette, a type pairing, how the marks are drawn, and one ornament.
  Make it your own, not a copy of the recipe's look or of another chart you made: never reuse a recipe's headline formula, kicker wording or readout band as they are.
- Color has a purpose: one accent for the story, quieter colors for the rest. Direct labels beat legends.
- The series or item the headline names leads at rest: lit, labeled and in the accent before the reader does anything.
  When the user's color for it is weak on the background, keep the color and outline or label its marks.
- It must read on a phone (390px wide) as well as on a desktop, with the chart in the phone's first screen.

When the user gives a style, a brand, colors or fonts, use exactly those: the palette and the type are theirs.
The layout, the frame, the marks and one idea from the subject are still yours to design, with design.md's legibility rules.

Inside an existing app with a look of its own (its fonts, CSS variables, Tailwind theme or component library), the chart takes the app's fonts and colors instead of a poster's.
Keep the editorial habits that help any chart: a title that states the finding, direct labels, a source line.

### 5. Give it an interaction

Unless the user said otherwise, the chart gets one interaction that serves its story, from [interaction.md](references/interaction.md): a readout on hover, focus and tap for comparing items, a sort or a switch between years for rankings, a crosshair for time, a toggle for series.
It works with a mouse, a finger and the keyboard, and nothing is shown only on hover.
A readout follows a mouse or a pen as it moves; a tap, a click or the keyboard picks a slat, and a scroll never does (pick on `click`, never on `pointerdown`); between slats the pick stays; leaving the poster gives the pick back to the slat that has focus, or clears it.
The example below does all of it.
The hint for an interaction sits beside its control, in words that fit every device ("Tap or point at a fruit"), never in the source note.
When the user asks for a "static" chart, an image-like chart or no interaction, add none.
A chart with fixed data and no interaction gets `static=${true}` on its Chart: rhp draws it once and keeps no signals.

### 6. Build it from the recipe

- Keep the recipe's code format and section order: data, then slat types, then the chart component, then mounting.
  With `ManyDots`, omit slat types and put the collection directly inside the Chart.
- Use the user's data exactly, every value, in their units.
  With no data given: when the subject is factual, use real figures and name the source and year in the note; with network access, take them from the primary source (the agency or publisher that makes them) rather than from memory, and from memory use only figures you know well.
  Otherwise use plausible figures and the note says "Illustrative data".
  Never present invented numbers as fact, and never put a real name (a country, a city, a company, a person) on them: give invented items plain invented names and say "invented" or "fictional" in the note.
- When an item was renamed recently, show the name most readers know beside the new one ("X (formerly Twitter)").
- A request about the user's own data with none given ("chart my spending") gets illustrative numbers in one obvious data block at the top of the script, with the note's text in the same block, so the user changes both in one place.
  The headline and the dek compute their numbers from that data, so they stay true for the user's own.
  The handoff says exactly how to put their own numbers in, or offers to read a file they point to.
- Compute the scale from the data: `nice(Math.min(0, ...values), Math.max(0, ...values))` (rule 2 below).
- Compute the ranks, the leader and every number in the headline and the dek from a sorted copy of the data, never from its input order: a Plot's `order` sorts only what it draws.
- Look up anything you are unsure of in [api.md](references/api.md) rather than guessing a prop.
- Keep the code short and plain: comments at section heads and where a reader needs one.

### 7. Check it, look at it, fix it

Run the checker on the file after the first full draft and again after every fix, until it reports no errors and no warnings:

- with the rhp MCP server: call its `rhp_check` tool (`rhp:rhp_check`) with the file's absolute path;
- otherwise run `npx -y @bezda/rhp-mcp check <file>` (add `--dark` when the page has a dark mode).

A chart component that takes its data from the app cannot be drawn on its own: check a small entry file that draws it with fixed data, as environments.md section 13 shows.
For the experimental `ManyDots` collection, use a build that exports it and also check its rendered point count, coordinates, per-point appearance, native interactions, and keyboard-accessible alternative directly in the browser.
A clean standard-chart checker report alone does not establish coverage of its bulk points.

It builds the chart, renders it in a browser at 1280px and 390px, tries its interaction, and reports runtime errors, props rhp does not have, data the slat reads but the Plot lacks, values past the scale, overlapping or cut-off text, marks sticking out, sideways scrolling, low contrast and tiny text, with a fix for each.
Its screenshots show the page with reduced motion asked for, so a chart that animates on load is pictured at rest; its interactions run with motion on.
They go to a folder in the system's temp directory, and the report gives their paths; `--out <dir>` puts them elsewhere.
Keep screenshots, and any test files of your own, out of the user's project.
Then open the screenshots and look at them as a demanding art director would: hierarchy, spacing, alignment, color, legibility on the phone, and whether the headline is true for the data.
Fix what you see, and check again.

Never make a warning go away by removing something the user asked for.
If the checker cannot run here (no Node, no browser, a chatbot without tools), go through the rules in "Rules that prevent most bugs" below one by one against your code instead, and say in the handoff that the chart was not rendered.

### 8. Audit and hand over

- Go through every **Asked** item of the brief against the final code and screenshots, and fix anything missing.
- Recompute every number in the headline, the dek and the note from the final data: a claim must be true for the numbers shown.
- Try every control once more and compare before and after: nothing else on the page may move (pitfalls.md, "The layout jumps").
- Check once more at four widths (`--widths 1280,1024,768,390`, or `widths` in `rhp_check`): layouts that change between 390px and 1280px (a breakpoint, a turned chart, a panel beside the chart) are where most layout bugs are.
- When the chart will take other data (the user's own, live or generated), check a copy with the hardest data it may get: the longest names, values ten times larger, twice as many rows.
- Then tell the user, briefly: what you made, where it is and how to open or run it (an HTML file opens with a double-click, and needs a connection for rhp), what you chose for them (form, look, interaction, data source or "illustrative"), and anything you could not do, with the reason.
  For a short request, those few lines are the whole handoff: no test logs, tool versions or local paths.
  To name the checker, give the command anyone can run, `npx -y @bezda/rhp-mcp check <file>`.

## How an rhp chart is built

```
Poster                      optional panel: kicker, headline, dek, the chart, note
└─ Chart                    the frame: scale, orientation, axis, theme, height or aspect
   └─ Plot                  one stack of slats; every prop that is not a setting is a column of data
      └─ slat (d) => <div>  one element per row of data, made of blocks placed by d's values
         ├─ Label edge="start"   the row's name, before the chart
         ├─ Bar to={d.value}     a bar from 0 (or from) to the value
         └─ Label at={d.value}   the value's number, just past the bar
```

- **Chart** sets the value axis: `scale={[min, max]}`, `orientation` ("horizontal", the default, or "vertical"), `ticks`, `format`, `theme`, and `height` or `aspect`. A Chart can hold several Plots drawn on the same scale.
- **Plot** gets the data. Each list prop is a column of data (`name={[...]}`, `sold={[...]}`), each single value is shared by every row, and each function of `d` is computed per row. A list of objects goes in `rows`. Its own settings are `order`, `reorder`, `key`, `rows`, `overlap`, `orientation`, `slats`, `animate`, `thick`, `static`, `keyboard`, `class`, `style`, `ref`.
- **The slat** is a function of `d`, one row: it reads `d.name`, `d.sold`, `d.index` (the row's place in the data) and `d.position` (its place on screen), and returns one root element holding blocks.
- **`slat(settings, fn)`** turns that function into a slat type with its own scoped CSS and layout: `css`, `thickness` (px per slat), `room` (px outside the plot for names and numbers, or "auto"), `inset`.
- **Blocks** sit at values on the scale: `Bar from to`, `Dot at`, `Tick at`, `Label at` or `edge`, `Cell value`, `Place at`, `Area points`, `Line points`. Each also takes `class`, `style`, handlers, `data-*` and children, and all but Label and Place take `color`.
- **A second axis** (`cross={[min, max]}` on the Chart) turns an `overlap` Plot into a scatter plot or a line chart: `Dot at={x} cross={y}`, `Line points={[[x, y], ...]}`.
- **Helpers** prepare numbers: `nice`, `extent`, `every`, `stackUp`, `shares`, `running`, `summary`, `bins`, `density`, `sortBy`, `series`, `cycle`.
- **Everything is HTML.** A slat and its blocks are ordinary elements: put text, images, inline SVG icons and other elements inside them, and style them with any CSS in the slat type's `css` (gradients, textures, type, custom outlines with `shape()`). That freedom is where an original design comes from.

A complete chart in the plain HTML format (the format of every recipe), with a poster and a hover, focus and tap readout:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bananas outsell everything</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&family=Inter:wght@400;600&display=swap">
<script type="importmap">{ "imports": { "@bezda/rhp/standalone": "https://cdn.jsdelivr.net/npm/@bezda/rhp@2/dist/standalone.js" } }</script>
<style>
  body { margin: 0; padding: 40px 16px; background: #e8e4dc; }
  .poster { max-width: 720px; margin: 0 auto; padding: 28px 28px 18px; background: #fbf8f1; color: #1f1a14; font-family: Inter, system-ui, sans-serif; }
  .poster figcaption { display: grid; gap: 6px; margin-bottom: 18px; }
  .poster .kicker { font-size: 11px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: #8a5a12; }
  .poster .headline { font: 700 clamp(27px, 4.7vw, 34px)/1.05 Fraunces, Georgia, serif; text-wrap: balance; }
  .poster .dek { font-size: 15px; line-height: 1.45; color: #4d453b; max-width: 52ch; }
  .poster .note { display: block; margin-top: 14px; font-size: 11.5px; color: #6f665a; }
  /* The dek is the readout: on a phone it keeps two lines, its longest text at 320px, so a pick never moves the chart */
  @media (max-width: 480px) { .poster { padding: 20px 16px 14px; } .poster .dek { min-height: 2lh; } }
</style>
</head>
<body>
<div id="chart"></div>
<script type="module">
import { Chart, Plot, Bar, Label, Poster, slat, nice, html, render, createSignal } from "@bezda/rhp/standalone";

// Data, and what depends on it
const fruit = ["Bananas", "Apples", "Cherries", "Pears", "Plums"];
const sold = [18, 12, 7, 5, 3];
const scale = nice(Math.min(0, ...sold), Math.max(0, ...sold)); // 0 to 20, ticks every 5
const lead = sold.indexOf(Math.max(...sold)); // the fruit the headline names: lit until the reader picks another

// Slat type: one slat per row; its CSS reaches only these slats
const Fruit = slat({
  thickness: 40,
  room: { start: "auto", end: 44 },
  css: `
    .name { font-size: 14px; font-weight: 600; }
    .bar { --rhp-end-radius: 6px; }
    .value { font-size: 13px; font-variant-numeric: tabular-nums; }
    .slat.on .value { font-weight: 700; }
  `,
}, (d) => html`
  <div class=${() => (d.on ? "slat on" : "slat")} data-row=${() => d.index}>
    <${Label} edge="start" class="name">${() => d.fruit}<//>
    <${Bar} to=${() => d.sold} color=${() => (d.on ? "#c2410c" : "#e0a65b")} />
    <${Label} at=${() => d.sold} class="value">${() => d.sold}<//>
  </div>`);

// Chart component: the app holds the state (which slat the reader picked)
function FruitChart() {
  const [on, setOn] = createSignal(null);
  // The row of the slat an element is in, or null (between slats, on the axis or the text)
  const rowOf = (el) => {
    const root = el.closest("[data-row]");
    return root ? +root.dataset.row : null;
  };
  // A mouse or a pen picks as it moves, a tap or a click picks, the keyboard picks; on no slat the pick stays
  const pick = (e) => {
    const row = rowOf(e.target);
    if (row != null) setOn(row);
  };
  // Leaving the poster: back to the slat that has focus (a keyboard's or a click's pick), or none
  const leave = (e) => {
    if (e.pointerType === "touch") return; // a finger sends pointerleave as it lifts after a tap
    setOn(e.currentTarget.contains(document.activeElement) ? rowOf(document.activeElement) : null);
  };
  return html`
    <${Poster}
      kicker="Market stall, Saturday"
      title="Bananas outsell everything else"
      dek=${() => (on() == null ? "Crates sold by midday. Tap or point at a fruit." : `${fruit[on()]}: ${sold[on()]} crates by midday.`)}
      note="Illustrative data."
      onPointerMove=${(e) => e.pointerType !== "touch" && pick(e)} onClick=${pick} onFocusIn=${pick}
      onPointerLeave=${leave} onFocusOut=${(e) => !e.currentTarget.contains(e.relatedTarget) && setOn(null)}>
      <${Chart} scale=${[scale.min, scale.max]} ticks=${scale.ticks} label="Crates of fruit sold by midday"
        theme=${{ font: "Inter, system-ui, sans-serif", ink: "#1f1a14", muted: "#6f665a", grid: "#e6dfd2" }}>
        <${Plot} keyboard=${true} fruit=${fruit} sold=${sold} on=${(d) => (on() ?? lead) === d.index}>${Fruit}<//>
      <//>
    <//>`;
}

render(() => html`<${FruitChart} />`, document.getElementById("chart"));
</script>
</body>
</html>
```

In a Solid app the same chart is JSX: `<Bar to={d.sold} />` instead of `<${Bar} to=${() => d.sold} />`, imports from `@bezda/rhp` and `solid-js`; [environments.md](references/environments.md) has the exact rules.

## Rules that prevent most bugs

Data:

1. **Data names must match.** A slat reads `d.sold` only if the Plot has a prop `sold`. A list of objects goes in `rows={[...]}`, never `data={...}`: `data` would just be a column named "data". Any prop a Plot does not know (`id`, `title`, `onClick`) is a column too, and an array is always a column, item i for row i: to give every slat the same list, pass a function of the row (`shown=${(d) => shown()}`).
2. **The scale must hold the data.** `scale={[min, max]}` with min below max covers every value: a Bar past it is cut off, and Dots, Ticks, Places and the points of an Area or a Line past it land outside or squeeze the outline.
   Build it from the data, `const s = nice(Math.min(0, ...values), Math.max(0, ...values))`, which keeps 0 and holds negative values too, and give the Chart `scale=${[s.min, s.max]} ticks=${s.ticks}`.
3. **Rows that come and go need a `key`** on the Plot (`key="city"`), or slats swap data instead of leaving. `d.index` can change then, so read it in a function: `data-row=${() => d.index}`.
4. **Format numbers** with `Intl.NumberFormat` (thousands, units, percentages, currency) and use `font-variant-numeric: tabular-nums` where numbers line up. In the JS version (`animate`), values in between are fractional: round what you print.

The html template (every format except Solid JSX):

5. **A component is `<${Bar} ...>`**, closed by `<//>` or `/>`.
6. **A value that can change is a function:** `${() => d.sold}`. `${d.sold}` is read once and never updates. Never destructure `d`. Lists and numbers that never change can be passed as they are (`fruit=${fruit}`).
7. **A boolean on a component needs a value:** `keyboard=${true}`, `overlap=${true}`, `static=${true}`, `fill=${true}`, `smooth=${true}`. A bare `keyboard` passes an empty string, which is false, and silently does nothing.
8. **A handler on a component takes its event:** `onClick=${(e) => pick(e)}`. A function with no parameter on a component (a block or a Poster) runs once while drawing and is never attached. Handlers on plain elements (`div`, `button`) work either way, and the Chart takes none at all (rule 16).
9. **`class`, never `className`**: on a block, `className` replaces rhp's own class and the block disappears.
10. **A space between two tags disappears**: `<b>${() => d.name}</b> <em>12</em>` renders "Name12". Write the space as `${" "}` or keep text next to it (`<b>Name</b>: <em>`).
11. **`style` on a Chart or a Plot is an object** (`style=${{ "pointer-events": "none" }}`); a string is dropped. Blocks and plain elements take either.

Structure and layout:

12. **One root element per slat.**
    In an ordinary Plot, use a wrapper (`<div>`) holding its blocks.
    In an `overlap` Plot or a Scale, a single block can be the root itself, including its own children, so avoid an extra wrapper.
    Those children use the block's box, not the full slat's band.
    Several blocks still need a common root.
    Keep a wrapper for a full-band hover or pointer target, even with one block.
    Give the Plot the slat type `slat()` returns, not the function you passed to it.
13. **Import from one place.** In a Solid app, import rhp from `@bezda/rhp` and Solid from `solid-js`. Everywhere else, import everything from `@bezda/rhp/standalone` (rhp, `html`, `render`, `createSignal`, `createMemo`, `createEffect`, `Show`, `For`, `Index`, `onMount`, `onCleanup`, `batch`, `untrack`, `createStore`, `reconcile`), which carries its own Solid: never add a second `solid-js` beside it. From rhp 2.0.2 it also has `createSelector`, `createComputed`, `on`, `mergeProps`, `splitProps`, `Switch` and `Match` (2.0.1 lacks them); it has no `Dynamic`, `Portal`, `createResource` or `ErrorBoundary`. For the slat the reader is on, a per-row comparison (`on=${(d) => on() === d.index}`) works with every rhp 2.
14. **Make room for text.** Names before the plot need `room.start` (px or "auto"), numbers past the bars need `room.end`. A `room` you give replaces the defaults on every side, so set each side you need. "auto" measures only edge Labels that are direct children of the slat's root. Long names need `max-width` with an ellipsis, or wrapping, in the slat CSS.
15. **Size the chart.** A horizontal chart without `height` gives each slat 32px unless the slat type sets `thickness`; a vertical chart is 240px tall unless you set `height`. A chart inside a flex row, an inline-block or a `fit-content` box collapses: give it `flex: 1; min-width: 0` or a width.
16. **Put handlers and `data-*` on the Poster or a wrapper element, not on the Chart**: the Chart keeps only `id`, `class`, `role`, `style`, `ref`, `label` and `aria-*`.

Style and color:

17. **Style regular slat blocks with the slat's `css` and the Chart's `theme`.**
    rhp's block CSS is `!important` inside cascade layers, so page CSS cannot change a block's color, background, font, border, radius, shadow, padding or transition.
    Page CSS styles the poster around the chart and the chart's box.
    Focus styles for slats (`.slat:focus-visible`) go in the slat's `css` too: a page `:focus-visible` rule never reaches a slat.
    `ManyDots` instead uses `pointClass` and ordinary application CSS or `pointStyle` for appearance, while the collection guards point geometry.
18. **Color with theme keys or CSS colors**: `color="series-2"`, `"positive"`, `"negative"`, `"muted"` or `"#c2410c"`. Set the palette in the Chart's `theme` (`series`, `ink`, `muted`, `grid`, `surface`, `positive`, `negative`, `low`, `high`, `font`). Theme values may read the page's own variables (`ink: "var(--ink)"`), so the poster and the chart share one set of tokens and dark mode is a few lines of CSS (design.md); a block's `color` may not (rhp warns), and page CSS never sets rhp's own `--rhp-*` variables. `series()` counts six colors: with a shorter `series` list, call `series(n)`. A Label does not take its Bar's color: color the slat root (`--rhp-color` in its style) or the Label's own text.
19. **A Dot's `size` is a length** (`size="12px"`); a bare number stretches it into an oval.
20. **Overlay Plots** (a crosshair, a marker over other Plots) need `style=${{ "pointer-events": "none" }}` so the pointer reaches the Plot under them.

Motion:

21. **Data that changes rapidly or continuously moves by the JS version.** When the data will change faster than a transition lasts, or without pause (a live feed, a play button that moves through the data, a slider or a drag that drives the data, a bar chart race), give the Plot `animate` for the data groups that change: `animate=${["sold"]}`, or `animate=${true}` for all of its numbers, or `animate=${{ groups: ["sold"], duration: 1200, ease: "linear" }}` to time them (here for a feed with a reading every 800 ms). The blocks drawn from those values then move on rhp's JS clock, which carries each move through the next new value instead of restarting a CSS transition on every change, and labels stay exactly on their bars. When the scale follows the data too, put `animate` on the Chart, so the axis moves with the marks. A Plot inside a slat needs its own `animate`. Give the changing numbers as lists (`gdp=${() => gdpAt(t())}`): the JS version never moves a group given as a function of the row (`(d) => ...`). To play back data you have (a race, a year slider with Play), move a playhead `t` on every frame, give the Plot the values interpolated between the steps around it, and keep the default 150 ms: the marks glide without stopping at each step, and Pause leaves them between steps (interaction.md section 10). For a live feed, whose next value is not known yet, ease linear into each new reading over a little more than one interval (`ease: "linear"`, 1.5 intervals), or the marks stop between readings. For a slider or a drag keep the default 150 ms. Round the numbers you print while they move. The `race` and `live` recipes show all of it. Data that changes now and then (a click that switches years) keeps the default CSS version.
22. **Interaction effects stay CSS, in both versions**: a hover highlight or a growing focus ring is a CSS transition on an element inside a block. Never put `transition` on a block itself (`.bar { transition: ... }`): rhp moves blocks with its own transitions and yours would replace them, so the block jumps.

The full list, with the mistake and the fix for each, is [pitfalls.md](references/pitfalls.md).

## References

Read the ones the chart needs; each is self-contained.

- [forms.md](references/forms.md): which chart for which data and story, and which recipe to start from.
- [design.md](references/design.md): the poster, art direction from the subject, look kits, palettes, type, layout, annotation, dark mode.
- [interaction.md](references/interaction.md): which interaction for which story, with complete code for each.
- [environments.md](references/environments.md): plain HTML, Solid, Astro, React, Next.js, Vue, Svelte and Angular, each verified, and the html template to JSX rules.
- [api.md](references/api.md): every component, prop, helper and CSS variable, exactly.
- [pitfalls.md](references/pitfalls.md): mistakes and their fixes.
- `recipes/*.html`: the tested starting points listed in step 3.

Live gallery and docs: https://rhp.vercel.app
