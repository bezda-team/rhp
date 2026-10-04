# Interaction

How to pick the one interaction that serves a chart's story when the user names none, and how to build any interaction a user asks for.
rhp keeps no interaction state: the app holds it in a signal, passes it to the Plot as data, and the slat shows it.

Contents:

0. [The page skeleton](#0-the-page-skeleton)
1. [Pick the interaction from the story](#1-pick-the-interaction-from-the-story)
2. [Readout on hover, focus and tap](#2-readout-on-hover-focus-and-tap)
3. [Sort toggle](#3-sort-toggle)
4. [Switch datasets](#4-switch-datasets)
5. [Legend toggles](#5-legend-toggles)
6. [Crosshair and scrubber](#6-crosshair-and-scrubber)
7. [What-if slider](#7-what-if-slider)
8. [Click to select or cut a slat](#8-click-to-select-or-cut-a-slat)
9. [Keyboard](#9-keyboard)
10. [Play and pause over time](#10-play-and-pause-over-time)
11. [The rules](#11-the-rules)

Every example is a complete module script for the page in section 0.
Each one was run in Chromium at 1280px and 390px: the kit's checker reported no errors and no warnings, and a Playwright script hovered, tapped, clicked and pressed keys on it.
The "Checked" line under each example says what was tested.

## 0. The page skeleton

Paste an example's module script where the comment is.
The page's CSS styles what sits around the chart (the poster, the readout, buttons and sliders); everything inside the chart is styled by the slat's `css`.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Interaction</title>
<script type="importmap">{ "imports": { "@bezda/rhp/standalone": "https://cdn.jsdelivr.net/npm/@bezda/rhp@2/dist/standalone.js" } }</script>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px 16px; background: #e6e3dc; color: #1d232b; font-family: system-ui, sans-serif; }
  .poster { max-width: 760px; margin: 0 auto; padding: 24px 24px 16px; background: #fbfaf7; }
  .poster figcaption { display: grid; gap: 6px; margin-bottom: 16px; }
  .poster .kicker:empty, .poster .dek:empty { display: none; }
  .poster .headline { font: 700 28px/1.1 Georgia, serif; text-wrap: balance; }
  .poster .note { display: block; margin-top: 12px; font-size: 12px; line-height: 1.45; color: #5d6470; }
  /* The readout: one line, always the same height, so the chart under it never moves */
  .readout { height: 1.5em; margin: 0 0 10px; font-size: 15px; line-height: 1.5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-variant-numeric: tabular-nums; }
  /* Choice buttons: the pressed one is filled */
  .choices { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 14px; }
  .choices button, .control button { padding: 6px 12px; border: 1px solid #1d232b; border-radius: 99px; background: none; color: inherit; font: inherit; font-size: 14px; cursor: pointer; }
  .choices button[aria-pressed="true"] { background: #1d232b; color: #fbfaf7; }
  .choices i { display: inline-block; width: 10px; height: 10px; margin-right: 6px; border-radius: 2px; background: var(--c); }
  /* A line of controls: its name or a button, a slider, a value */
  .control { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; margin: 12px 0; font-size: 14px; font-variant-numeric: tabular-nums; }
  .control input[type="range"] { flex: 1 1 160px; accent-color: #1d232b; }
  /* Focus for buttons and sliders; a slat's focus style goes in its slat css (section 9) */
  :focus-visible { outline: 2px solid #b6421e; outline-offset: 2px; }
  @media (max-width: 480px) { .poster { padding: 18px 14px 12px; } .poster .headline { font-size: 23px; } }
</style>
</head>
<body>
<div id="chart"></div>
<script type="module">
// one example's module script
</script>
</body>
</html>
```

## 1. Pick the interaction from the story

When the user names an interaction, build exactly that, from the section that matches it.
When they name none, find the chart's story here and add that one interaction.

| The story | The interaction | Section | Recipes that have it |
|---|---|---|---|
| compare items: which is bigger, by how much | readout of the slat under the pointer, finger or focus, with the fields the bars do not show | 2 | bar, column, pyramid, donut |
| a ranking whose order depends on the measure | sort toggle | 3 | grouped-bars, bullet, dumbbell |
| values that change between years, periods or questions | switch between them; values move, slats re-sort | 4 | waterfall, radial-bars, diverging-bars |
| two scenarios (before and after, weekday and weekend, plan A and B) | switch between them | 4 | area, violin |
| change over time | crosshair or scrubber with a readout | 6 | line, multi-line, candlestick |
| part of a whole | legend toggles, or pick a part to follow it | 5 | stacked-bars, stacked-100, waffle |
| a distribution | readout of the bin, box or group | 2 | histogram, box-plot, strip |
| two measures per item | readout of the nearest point | 2, 6 | scatter, bubble, slope |
| what-if (a rate, a budget, a threshold) | range slider | 7 | none |
| a schedule | readout of the task, its dates and what it waits for | 2 | gantt |
| one item against the others | click to pick it as the baseline | 8 | none |
| one headline number | readout of what makes up the number | 2 | waffle |
| a ranking that changes over many periods | play and pause, with a slider for the period | 10 | race |

Add none when the user asks for a static chart, an image, "no interaction", or a chart for print, a PDF, a slide or an email (scripts do not run there).
When the slats already print every value they hold, a readout only repeats them: pick the interaction that adds something the chart does not show yet (another field, a sort, a switch, a comparison).

## 2. Readout on hover, focus and tap

Use it to compare items and read exact values, or fields the bars do not show.

```js
import { Chart, Plot, Bar, Label, Poster, slat, html, render, createSignal } from "@bezda/rhp/standalone";

// Data: rain in October (illustrative)
const CITY = ["City A", "City B", "City C", "City D", "City E", "City F"];
const RAIN = [184, 124, 81, 56, 37, 5];
const DAYS = [19, 17, 13, 11, 6, 2];
const say = (i) => `${CITY[i]}: ${RAIN[i]} mm of rain on ${DAYS[i]} days`;

// Slat type: the slat the reader is on is lit, and the others dim at once (no transition on a block)
const City = slat({
  thickness: 38,
  room: { start: 72, end: 60 },
  css: `
    .dim .bar { opacity: .3; }
    .dim .value { color: var(--rhp-muted); }
    .on .name, .on .value { font-weight: 700; }
    .city:focus-visible { outline: 2px solid #b6421e; outline-offset: -2px; }
  `,
}, (d) => html`
  <div class=${() => (d.on ? "city on" : d.dim ? "city dim" : "city")} data-row=${() => d.index} aria-label=${() => say(d.index)}>
    <${Label} edge="start" class="name">${() => d.city}<//>
    <${Bar} to=${() => d.rain} class="bar" color=${() => (d.on ? "#b6421e" : "series-1")} />
    <${Label} at=${() => d.rain} class="value">${() => d.rain} mm<//>
  </div>`);

// Chart component: one signal holds the row the reader is on, and one handler finds it from any event
function RainChart() {
  const [on, setOn] = createSignal(null);
  const pick = (e) => {
    const el = e.target.closest("[data-row]");
    setOn(el ? +el.dataset.row : null);
  };
  return html`
    <${Poster} title="City A gets more than three times City D's October rain"
      note="Illustrative data. Point at a city, tap it, or Tab into the chart and use the arrow keys."
      onPointerMove=${pick} onPointerDown=${pick} onFocusIn=${pick}
      onPointerLeave=${(e) => e.pointerType !== "touch" && setOn(null)}
      onFocusOut=${(e) => !e.currentTarget.contains(e.relatedTarget) && setOn(null)}>
      <p class="readout" aria-hidden="true">${() => (on() == null ? "Point at a city or tap it." : say(on()))}</p>
      <${Chart} scale=${[0, 200]} ticks=${[0, 50, 100, 150, 200]} label="Rain in October, in mm">
        <${Plot} keyboard=${true} city=${CITY} rain=${RAIN} days=${DAYS}
          on=${(d) => on() === d.index} dim=${(d) => on() != null && on() !== d.index}>${City}<//>
      <//>
    <//>`;
}

render(() => html`<${RainChart} />`, document.getElementById("chart"));
```

- **One signal, one handler.** `pick` reads the row from whatever the event landed on, with `closest("[data-row]")`, so a bar, a number or the name all count.
  It runs on `pointermove` (mouse and pen), `pointerdown` (a tap) and `focusin` (the keyboard).
- **Clearing.** `pointerleave` clears for a mouse but not for a finger: after a tap the finger lifts and the browser sends `pointerleave`, which must not undo the tap.
  A tap anywhere else in the poster finds no slat and clears; a tap outside it moves focus away from the slat, and `focusout` clears.
- **Lit and dimmed.** The Plot turns the signal into two per-row groups, `on` and `dim`; the slat turns them into classes, and its css does the rest.
  rhp fades the Bar's `color` itself; the opacity changes at once, because a `transition` on a block would replace rhp's own (rule 7 in section 11).
- **The readout** is one line of fixed height, so the chart under it never moves; keep its text short enough for 390px.
  It is `aria-hidden` because each slat's `aria-label` says the same to a screen reader.
- **In place of a line**, the readout can sit in the slat itself: `<${Show} when=${() => d.on}><${Label} at=…>…<//><//>` draws it in that one slat only (the pyramid and histogram recipes).

Checked: the checker reported a change for each slat it pointed at (City A, City C, City F); its Tab reached City A and ArrowDown moved focus to City B.
Playwright with a mouse: on City C's bar the readout named City C, City C was lit, the five others were at opacity .3 with rhp's transition still on their bars, and leaving the poster cleared it all.
At 390px with touch: a tap on City B kept the readout after the finger lifted, a tap on City E's number picked City E, and a tap on the headline or below the poster cleared it.
The chart's top stayed at the same y in every state.

## 3. Sort toggle

Use it when the order depends on what is counted, or when readers need to find an item by name.

```js
import { Chart, Plot, Bar, Label, Poster, slat, sortBy, html, render, createSignal } from "@bezda/rhp/standalone";

// Data: Paris 2024, the ten teams with the most gold medals (IOC final medal table)
const TEAMS = [
  { team: "USA", gold: 40, total: 126 }, { team: "China", gold: 40, total: 91 },
  { team: "Japan", gold: 20, total: 45 }, { team: "Australia", gold: 18, total: 53 },
  { team: "France", gold: 16, total: 64 }, { team: "Netherlands", gold: 15, total: 34 },
  { team: "Britain", gold: 14, total: 65 }, { team: "South Korea", gold: 13, total: 32 },
  { team: "Italy", gold: 12, total: 40 }, { team: "Germany", gold: 12, total: 33 },
];
const SORTS = [{ by: "gold", name: "Gold first" }, { by: "total", name: "All medals" }];

// Slat type: the gold medals from 0, the other medals after them, and both counts
const Team = slat({
  thickness: 32,
  room: { start: "auto", end: 64 },
  css: `
    .gold { --rhp-end-radius: 0px; }
    .rest { --rhp-start-radius: 0px; }
    .count b { color: #8a6100; }
  `,
}, (d) => html`
  <div aria-label=${() => `${d.team}: ${d.gold} gold, ${d.total} medals in all`}>
    <${Label} edge="start">${() => d.team}<//>
    <${Bar} to=${() => d.gold} color="#d4a017" class="gold" />
    <${Bar} from=${() => d.gold} to=${() => d.total} color="#a9afb8" class="rest" />
    <${Label} at=${() => d.total} class="count"><b>${() => d.gold}</b> · ${() => d.total}<//>
  </div>`);

// Chart component: the pressed button picks the sort, and the slats slide to their new places
function Medals() {
  const [by, setBy] = createSignal("gold");
  return html`
    <${Poster} title="Britain is seventh by gold medals and third by all medals"
      note="Paris 2024 medal table (IOC). Gold bar and first number: gold medals; whole bar and second number: all medals.">
      <div class="choices" role="group" aria-label="Sort the teams">
        ${SORTS.map((s) => html`
          <button type="button" aria-pressed=${() => by() === s.by} onClick=${() => setBy(s.by)}>${s.name}</button>`)}
      </div>
      <${Chart} scale=${[0, 130]} ticks=${[0, 25, 50, 75, 100, 125]} label="Medals won at Paris 2024 by the ten teams with the most gold">
        <${Plot} rows=${TEAMS} order=${() => sortBy(by(), "desc")}>${Team}<//>
      <//>
    <//>`;
}

render(() => html`<${Medals} />`, document.getElementById("chart"));
```

- `order` takes the function `sortBy(group, "asc" | "desc")` returns; wrapped in `() =>` it follows the signal.
  `sortBy` also takes a function of the row (`sortBy((d) => d.total - d.gold, "desc")`), and `null` keeps the data order.
- The slats slide to their places (`reorder="slide"`, the default), a focused slat keeps its focus, and rhp sets `aria-owns` so a screen reader reads them in the new order.
  Ties keep their places on screen (the USA and China both won 40 gold).
- The choice buttons are real `<button type="button">`s in a `role="group"` with an `aria-label`, and the one in force has `aria-pressed="true"`; `aria-pressed=${() => …}` writes `"true"` or `"false"`.

Checked: the checker's click on "All medals" changed the slats ("Gold first" was already pressed, so its click changed nothing).
Playwright found Britain's slat seventh from the top, then third after "All medals", with `aria-pressed` swapped and `aria-owns` set; Space on "Gold first" put it back.

## 4. Switch datasets

Use it for years, periods or scenarios of the same items: the reader compares one state with the next.

```js
import { Chart, Plot, Bar, Label, Poster, slat, sortBy, html, render, createSignal } from "@bezda/rhp/standalone";

// Data: cups sold on an average day at one café, by season (illustrative)
const DRINK = ["Latte", "Iced coffee", "Cappuccino", "Cold brew", "Hot chocolate", "Espresso"];
const SEASONS = [
  { name: "Winter", cups: [142, 18, 96, 9, 88, 61] },
  { name: "Spring", cups: [118, 64, 81, 37, 41, 58] },
  { name: "Summer", cups: [74, 151, 52, 118, 12, 49] },
  { name: "Autumn", cups: [131, 40, 90, 22, 63, 60] },
];

// Slat type: a drink's name, its bar and its cups
const Drink = slat({ thickness: 34, room: { start: "auto", end: 44 } }, (d) => html`
  <div>
    <${Label} edge="start">${() => d.drink}<//>
    <${Bar} to=${() => d.cups} />
    <${Label} at=${() => d.cups}>${() => d.cups}<//>
  </div>`);

// Chart component: a season's button swaps the data; the bars glide to their new lengths and the slats slide to their places
function Cafe() {
  const [season, setSeason] = createSignal(2);
  return html`
    <${Poster} title="In summer, iced coffee outsells the latte two to one"
      note="Illustrative data. Pick a season.">
      <div class="choices" role="group" aria-label="Season">
        ${SEASONS.map((s, k) => html`
          <button type="button" aria-pressed=${() => season() === k} onClick=${() => setSeason(k)}>${s.name}</button>`)}
      </div>
      <${Chart} scale=${[0, 160]} ticks=${[0, 40, 80, 120, 160]}
        label=${() => `Cups sold a day in ${SEASONS[season()].name.toLowerCase()}`}>
        <${Plot} drink=${DRINK} cups=${() => SEASONS[season()].cups} order=${sortBy("cups", "desc")}>${Drink}<//>
      <//>
    <//>`;
}

render(() => html`<${Cafe} />`, document.getElementById("chart"));
```

- The data group is a function of the signal (`cups=${() => SEASONS[season()].cups}`), so the chart follows the button.
- **The CSS version**, rhp's default (no `animate`): bars, dots and outlines glide over 0.15s and slats slide over 0.3s; printed numbers jump to their new text.
  A switch the reader clicks now and then keeps it.
- **The JS version** (`animate` on the Chart or a Plot) counts every number from its old value to its new one, so the printed numbers count along with the bars and slats pass each other when their values cross.
  It is for data that changes rapidly or continuously: a pointer, a slider or a drag that drives the data (sections 6 and 7), or a timer (section 10).
  The numbers are fractional while they move: round what you print (`Math.round(d.cups)`).
  Colors jump in the JS version.
- When the switch changes the range of the values, change the scale with it (`scale=${() => [0, top()]}`): the axis moves too.

Checked: the checker clicked the four buttons and each changed the slats.
Playwright read the Latte's label once a frame after "Winter": it went from 74 to 142 in one step while its bar grew over several frames, and the Latte moved to the top; with reduced motion the bar took its new length in one frame too.
With `animate=${{ duration: 600, slide: 500 }}` on the Chart and `Math.round(d.cups)` in the label (the JS version), the label counted through whole numbers from 74 to 142 while the bar grew.

## 5. Legend toggles

Use them when a stacked or grouped chart has several series and the reader wants to see some without the others.
A pressed button means the series is shown.

```js
import { Chart, Plot, Bar, Label, Poster, slat, stackUp, html, render, createSignal, createMemo } from "@bezda/rhp/standalone";

// Data: hours a week on screens outside school and work, by age (illustrative)
const KINDS = [
  { key: "video", name: "Video", color: "#2a78d6" },
  { key: "social", name: "Social", color: "#eb6834" },
  { key: "games", name: "Games", color: "#1baf7a" },
  { key: "work", name: "Work", color: "#c2419a" },
];
const AGES = [
  { age: "13-17", video: 14, social: 12, games: 9, work: 3 },
  { age: "18-29", video: 12, social: 10, games: 6, work: 8 },
  { age: "30-49", video: 9, social: 6, games: 3, work: 12 },
  { age: "50-64", video: 8, social: 4, games: 2, work: 10 },
  { age: "65+", video: 12, social: 3, games: 2, work: 1 },
];

// Slat types: a part is a Bar; a hidden part has no length, so the others close up with rhp's transition
const Part = (p) => html`<${Bar} from=${() => p.from} to=${() => p.to} color=${() => p.color} class="part" />`;
const Age = slat({ thickness: 40, room: { start: 56, end: 48 }, css: `.part { --rhp-radius: 0px; --rhp-gap: 2px; }` }, (d) => {
  const hours = createMemo(() => KINDS.map((k) => (d.shown.includes(k.key) ? d[k.key] : 0)));
  const stack = createMemo(() => stackUp(hours()));
  return html`
    <div aria-label=${() => `${d.age}: ` + KINDS.filter((k) => d.shown.includes(k.key)).map((k) => `${k.name} ${d[k.key]} h`).join(", ")}>
      <${Label} edge="start">${() => d.age}<//>
      <${Plot} overlap=${true} from=${() => stack().from} to=${() => stack().to} color=${KINDS.map((k) => k.color)}>${Part}<//>
      <${Label} at=${() => stack().to.at(-1)}>${() => hours().reduce((a, b) => a + b, 0)} h<//>
    </div>`;
});

// Chart component: the shown series are one signal, and the last one shown cannot be hidden
function ScreenTime() {
  const [shown, setShown] = createSignal(KINDS.map((k) => k.key));
  const flip = (key) => setShown((now) => (!now.includes(key) ? [...now, key] : now.length > 1 ? now.filter((k) => k !== key) : now));
  return html`
    <${Poster} title="From 30 to 64, work takes more screen time than anything else"
      note="Illustrative data. Press a series to hide it or show it again.">
      <div class="choices" role="group" aria-label="Series shown">
        ${KINDS.map((k) => html`
          <button type="button" aria-pressed=${() => shown().includes(k.key)} onClick=${() => flip(k.key)}><i style=${"--c: " + k.color}></i>${k.name}</button>`)}
      </div>
      <${Chart} scale=${[0, 40]} ticks=${[0, 10, 20, 30, 40]} format=${(v) => v + " h"} label="Hours a week on screens, by activity and age">
        <${Plot} rows=${AGES} shown=${(d) => shown()}>${Age}<//>
      <//>
    <//>`;
}

render(() => html`<${ScreenTime} />`, document.getElementById("chart"));
```

- **An array on a Plot is a column**, one item per row: `shown=${shown}` would give row 0 `"video"`, row 1 `"social"` (the checker warns that the groups' lengths differ).
  Hand every slat the whole array through a function of the row: `shown=${(d) => shown()}`.
- A hidden series stays in the stack with a length of 0, so its segments shrink away and the others slide together; nothing is added or removed.
- The scale stays put, so lengths stay comparable as series come and go; to zoom in on what is left, compute the scale from the shown totals with `nice()` in a `createMemo`.
- **Grouped bars:** give the Plot inside the slat an `order` with `null` for a hidden series, and the bars left share the band: `order=${() => { let k = 0; return KEYS.map((key) => (shown().includes(key) ? k++ : null)); }}`.
- **Pick one part instead of hiding** (the stacked-bars recipe moves the picked part to the start of every bar and ranks by it; stacked-100 and waffle light it everywhere).

Checked: the checker's clicks on Video, Social and Games each changed the chart; its click on Work changed nothing, because Work was then the only series shown.
Playwright hid Social and measured its five segments at 0px and the 13-17 total going from 38 h to 26 h, showed it again (38 h), and found that the last series shown stays pressed.

## 6. Crosshair and scrubber

Use it for change over time: the reader moves along the line and reads any point.

```js
import { Chart, Plot, Line, Tick, Dot, Poster, html, render, createSignal } from "@bezda/rhp/standalone";

// Data: visitors to a seaside town, in thousands a week (illustrative)
const VISITORS = [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 6, 8, 6, 4, 4, 4, 5, 5, 6, 8, 9, 12, 15, 18,
  21, 24, 27, 28, 29, 28, 27, 24, 21, 18, 15, 12, 9, 8, 6, 5, 5, 4, 4, 4, 4, 4, 4, 5, 6, 7];
const WEEKS = VISITORS.map((v, i) => i + 1);
const X = [1, 52];

// Slat types: the line, and the week picked (a hairline and a dot) on an overlay Plot
const Trend = (d) => html`<div><${Line} points=${() => d.points} /></div>`;
const Picked = (d) => html`
  <div>
    <${Tick} at=${() => d.week} thick=${1} color="muted" />
    <${Dot} at=${() => d.week} cross=${() => d.visitors} size="10px" />
  </div>`;

// Chart component: the pointer picks the week nearest to it, and the slider picks one with the keys
function Visitors() {
  const [i, setI] = createSignal(VISITORS.indexOf(Math.max(...VISITORS)));
  let plot;
  const point = (e) => {
    const r = plot.getBoundingClientRect(); // the Plot's box is the plot area: X[0] at its left, X[1] at its right
    const week = X[0] + ((e.clientX - r.left) / r.width) * (X[1] - X[0]);
    setI(WEEKS.reduce((best, w, k) => (Math.abs(w - week) < Math.abs(WEEKS[best] - week) ? k : best), 0));
  };
  const say = () => `Week ${WEEKS[i()]}: ${VISITORS[i()]},000 visitors`;
  return html`
    <${Poster} title="Summer brings seven times the visitors of winter"
      note="Illustrative data. Point at the chart, drag along it, or use the slider.">
      <p class="readout" aria-hidden="true">${say}</p>
      <div style="touch-action: pan-y; cursor: crosshair" onPointerMove=${point} onPointerDown=${point}>
        <${Chart} scale=${X} ticks=${[1, 13, 26, 39, 52]} format=${(v) => (v === 1 ? "Week 1" : v)} cross=${[0, 30]} crossTicks=${[0, 10, 20, 30]}
          crossFormat=${(v) => v + "k"} height=${220} label="Visitors a week, in thousands">
          <${Plot} overlap=${true} points=${[WEEKS.map((w, k) => [w, VISITORS[k]])]} ref=${(el) => (plot = el)}>${Trend}<//>
          <${Plot} overlap=${true} slats=${1} week=${() => WEEKS[i()]} visitors=${() => VISITORS[i()]} animate=${["week", "visitors"]} style=${{ "pointer-events": "none" }}>${Picked}<//>
        <//>
      </div>
      <label class="control">Week
        <input type="range" min="0" max=${WEEKS.length - 1} value=${i} aria-valuetext=${say} onInput=${(e) => setI(+e.currentTarget.value)}>
      </label>
    <//>`;
}

render(() => html`<${Visitors} />`, document.getElementById("chart"));
```

- **The pointer.** The Plot's element (`ref`) covers the plot area exactly, so the pointer's x gives a value on the scale; the nearest point is the one with the smallest distance, which works for unevenly spaced x too.
- **The overlay** is a second `overlap` Plot with one slat (`slats=${1}`) fed with the picked point; `pointer-events: none` lets the pointer through to the chart.
  A `Tick` with `thick=${1}` runs the full height of the plot; a `Place` can hold a callout of your own (the line recipe keeps its callout inside the plot with `translate: calc(var(--rhp-p) * -100%) 0`).
- **Motion.** The picked point changes at every move of the pointer, so the overlay Plot moves by the JS version (`animate=${["week", "visitors"]}`): the hairline and the dot glide through each new week on rhp's clock instead of restarting a CSS transition at every move.
- **Touch.** `touch-action: pan-y` on the wrapper lets a finger drag sideways along the chart to scrub while an up or down drag still scrolls the page.
- **Keys.** The range input is the keyboard's way in (arrows, Home, End, Page Up and Down) and a screen reader's (`aria-valuetext` says the point); it also gives a finger a large target.
- **Evenly spaced x (years):** the line and multi-line recipes catch the pointer with an invisible vertical Plot of one column per year with `keyboard=${true}`, so the arrows work on the chart itself and each column has its own text; use that up to a few hundred points.

Checked: the checker pointed at the chart and changed the slider, and both moved the readout and the hairline.
Playwright put the mouse at a quarter of the plot's width and read week 14 (1 + 0.25 × 51 = 13.75), with the hairline on week 14's x; on the slider, End then ArrowLeft gave week 51, Home week 1 (the same text in `aria-valuetext`), and Page Up moved on several weeks.
At 390px with touch, a sideways drag from week 10 to week 40 moved the readout to week 40, and the page did not scroll sideways.

## 7. What-if slider

Use it when the reader should try a value the data does not fix: a rate, a price, a budget, a threshold.

```js
import { Chart, Plot, Bar, Label, Poster, slat, nice, html, render, createSignal, createMemo } from "@bezda/rhp/standalone";

// Data: a 300,000 loan repaid monthly over 10 to 30 years
const AMOUNT = 300000;
const YEARS = [10, 15, 20, 25, 30];
const MAX_RATE = 8; // percent
const interest = (rate, years) => {
  const r = rate / 1200;
  const n = years * 12;
  return r === 0 ? 0 : ((AMOUNT * r) / (1 - (1 + r) ** -n)) * n - AMOUNT;
};
const top = nice(0, interest(MAX_RATE, 30)); // the most the slider can reach, so the axis never moves
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact" });

// Slat type
const Term = slat({ thickness: 40, room: { start: 76, end: 64 } }, (d) => html`
  <div>
    <${Label} edge="start">${() => d.years} years<//>
    <${Bar} to=${() => d.interest} />
    <${Label} at=${() => d.interest}>${() => money.format(d.interest)}<//>
  </div>`);

// Chart component: the slider sets the rate, and a memo works out every term's interest once per change
function Loan() {
  const [rate, setRate] = createSignal(5);
  const paid = createMemo(() => YEARS.map((y) => interest(rate(), y)));
  return html`
    <${Poster} title="A 30-year loan pays more than three times the interest of a 10-year one"
      note="Interest on a $300,000 loan repaid monthly. Move the slider to try another rate.">
      <label class="control">Interest rate
        <input type="range" min="0" max=${MAX_RATE} step="0.25" value="5" aria-valuetext=${() => rate().toFixed(2) + "%"} onInput=${(e) => setRate(+e.currentTarget.value)}>
        <b aria-hidden="true">${() => rate().toFixed(2)}%</b>
      </label>
      <${Chart} scale=${[top.min, top.max]} ticks=${top.ticks} format=${(v) => money.format(v)} label="Interest paid on a $300,000 loan, by term">
        <${Plot} years=${YEARS} interest=${paid} animate=${["interest"]}>${Term}<//>
      <//>
    <//>`;
}

render(() => html`<${Loan} />`, document.getElementById("chart"));
```

- Listen to `input` (it fires while the thumb moves), not `change` (only on release).
- The memo computes the values once per change, however many slats read them; pass it to the Plot as it is (`interest=${paid}`).
- The slider changes the values continuously while the thumb moves, so the Plot moves them by the JS version (`animate=${["interest"]}`): the bars and labels follow the thumb on rhp's clock instead of restarting a CSS transition at every step. In the JS version a Label prints the values in between, so format them (the compact currency format rounds them here).
- Fix the scale at the largest value the slider can reach, so the bars grow and shrink against an axis that stays still.
- The `<label>` around the input names it ("Interest rate"), and `aria-valuetext` gives a screen reader the value with its unit.
  The value shown on screen is `aria-hidden` so it stays out of the name, and it is not an `<output>`: an `<output>` is labelable too, so inside a label it takes the label from the input.

Checked: the checker set the slider to its far end, and the bars and labels changed.
Playwright pressed ArrowRight four times (5% to 6%) and read $82K to $100K for 10 years and $280K to $348K for 30 years, the values the formula gives; Chromium names the slider "Interest rate" and its value text is "6.00%".

## 8. Click to select or cut a slat

Use select to make one item the baseline for the others, and cut to take an item out (an outlier) and see the rest at a larger scale.

```js
import { Chart, Plot, Bar, Label, Poster, slat, html, render, createSignal } from "@bezda/rhp/standalone";

// Data: rain in October (illustrative)
const CITY = ["City A", "City B", "City C", "City D", "City E", "City F"];
const RAIN = [184, 124, 81, 56, 37, 5];

// Slat type: the name is a button, so Tab, Enter and Space pick a city as a click does
const City = slat({
  thickness: 38,
  room: { start: 84, end: 64 },
  css: `
    .city { cursor: pointer; }
    .name button { padding: 3px 7px; border: 0; border-radius: 4px; background: none; color: inherit; font: inherit; cursor: pointer; }
    .name button:focus-visible { outline: 2px solid #b6421e; outline-offset: 1px; }
    .picked .name button { background: var(--rhp-ink); color: var(--rhp-surface); }
  `,
}, (d) => html`
  <div class=${() => (d.picked ? "city picked" : "city")} data-row=${() => d.index}>
    <${Label} edge="start" class="name"><button type="button" aria-pressed=${() => d.picked}>${() => d.city}</button><//>
    <${Bar} to=${() => d.rain} color=${() => (d.picked ? "#b6421e" : "series-1")} />
    <${Label} at=${() => d.rain}>${() => (d.base == null || d.picked ? `${d.rain} mm` : `${(d.rain / d.base).toFixed(1)}×`)}<//>
  </div>`);

// Chart component: a click, a tap or Enter picks a city, a second one unpicks it, and Escape unpicks
function RainChart() {
  const [picked, setPicked] = createSignal(null);
  const choose = (e) => {
    const el = e.target.closest("[data-row]");
    if (el) setPicked((p) => (p === +el.dataset.row ? null : +el.dataset.row));
  };
  return html`
    <${Poster} title="City A gets 37 times as much October rain as City F"
      note="Illustrative data. Pick a city (click it, tap it, or Tab to its name and press Enter) to compare the others with it."
      onClick=${choose} onKeyDown=${(e) => e.key === "Escape" && setPicked(null)}>
      <${Chart} scale=${[0, 200]} ticks=${[0, 50, 100, 150, 200]} label="Rain in October, in mm">
        <${Plot} city=${CITY} rain=${RAIN} picked=${(d) => picked() === d.index}
          base=${() => (picked() == null ? null : RAIN[picked()])}>${City}<//>
      <//>
    <//>`;
}

render(() => html`<${RainChart} />`, document.getElementById("chart"));
```

- One `click` handler on the Poster serves a click anywhere on the slat and Enter or Space on the name's button (a button's key press is a click).
- A pick that stays (unlike a hover) needs a visible state and a way back: `aria-pressed` on the button, a second click, Escape.
- With many slats, a button in every slat is many Tab stops: drop the buttons, give the Plot `keyboard=${true}`, and pick on Enter: `onKeyDown=${(e) => (e.key === "Enter" ? choose(e) : e.key === "Escape" && setPicked(null))}` on the Poster.

To cut instead, keep the rows left in a signal, give the Plot a `key` so each slat follows its row, and name the row by its key, since `d.index` changes when rows leave:

```js
import { Chart, Plot, Bar, Label, Poster, slat, nice, html, render, createSignal, createMemo } from "@bezda/rhp/standalone";

// Data: rain in October (illustrative)
const CITIES = [
  { city: "City A", rain: 184 }, { city: "City B", rain: 124 }, { city: "City C", rain: 81 },
  { city: "City D", rain: 56 }, { city: "City E", rain: 37 }, { city: "City F", rain: 5 },
];

// Slat type: the name is a button that takes its city out
const City = slat({
  thickness: 38,
  room: { start: 96, end: 60 },
  css: `.name button { padding: 3px 7px; border: 1px solid var(--rhp-grid); border-radius: 4px; background: none; color: inherit; font: inherit; cursor: pointer; }`,
}, (d) => html`
  <div data-city=${() => d.city}>
    <${Label} edge="start" class="name"><button type="button" aria-label=${() => `Take ${d.city} out`}>${() => d.city} ×</button><//>
    <${Bar} to=${() => d.rain} />
    <${Label} at=${() => d.rain}>${() => d.rain} mm<//>
  </div>`);

// Chart component: the scale fits the rows left, so the others grow when the largest goes
function RainChart() {
  const [left, setLeft] = createSignal(CITIES);
  const top = createMemo(() => nice(0, Math.max(...left().map((r) => r.rain))));
  const cut = (e) => {
    const el = e.target.closest("[data-city]");
    if (!el || left().length === 1) return;
    const next = el.nextElementSibling ?? el.previousElementSibling;
    setLeft(left().filter((r) => r.city !== el.dataset.city));
    next?.querySelector("button")?.focus(); // the focused button is gone: focus its neighbor
  };
  return html`
    <${Poster} title="City A is the wettest of these cities in October" note="Illustrative data. Take a city out with its button." onClick=${cut}>
      <div class="choices"><button type="button" onClick=${() => setLeft(CITIES)}>Show all</button></div>
      <${Chart} scale=${() => [top().min, top().max]} ticks=${() => top().ticks} label="Rain in October, in mm">
        <${Plot} rows=${left} key="city">${City}<//>
      <//>
    <//>`;
}

render(() => html`<${RainChart} />`, document.getElementById("chart"));
```

Checked: the checker clicked the six name buttons and each changed the chart; in the cut example its clicks took the cities out one by one, and the click on the last one changed nothing (one city always stays).
Playwright clicked City F's bar and read City A at "36.8×", clicked it again to clear, went from City A's button with Tab twice and Enter to pick City C (City A read "2.3×"), and pressed Escape to clear; at 390px a tap on City D's bar picked City D.
With `keyboard` on the Plot and no buttons, Tab, ArrowDown twice and Enter picked City C.
In the cut example, Enter on "Take City A out" left five cities, moved the scale's end from 200 to 125 and focus to City B's button, and "Show all" brought City A back.

## 9. Keyboard

Give the keyboard what the pointer gets wherever slats are interactive: `keyboard=${true}` on the Plot the reader explores (section 2 has it).

- Tab stops at one slat (the one focused last, or the first shown), so the chart is one Tab stop however many slats it has.
- The arrow keys go to the slat shown before or after (Down and Right forward, Up and Left back, in either orientation), Home and End to the first and the last, in the order on screen.
- A slat keeps its focus when a sort moves it.
- Keys with Shift, Ctrl, Alt or Meta are left alone, and so are keys a handler inside the slat has already handled (`e.preventDefault()`).
- `onFocusIn` on the Poster runs the same `pick` as the pointer, and `onFocusOut` clears it when focus leaves the poster (section 2).
- Style focus in the slat's `css`: rhp resets the outline of a slat's root, so a page rule such as `:focus-visible { … }` does not reach it.
  Style `:focus-visible` next to `:hover` when there is a hover style:

```css
.city:is(:hover, :focus-visible) .bar { filter: brightness(1.1); }
.city:focus-visible { outline: 2px solid #b6421e; outline-offset: -2px; }
```

- Buttons, links and inputs inside a slat take focus on their own (section 8); their Plot needs no `keyboard`.
- One keyboard Plot per chart: overlays (a crosshair, a today line) and Scales take none.
- In an `overlap` Plot (a scatter), the arrows follow the order of the rows: sort the rows by x first so the arrows go left to right.

Checked (section 2's example): Tab reached City A, then ArrowDown went to City B, End to City F and Home to City A, each time with the readout on that city and a 2px solid outline on the slat; Shift+Tab out of the chart cleared the readout, and Tab back in returned to the slat focused last.
Without the slat's focus rule, the page's `:focus-visible` rule did not reach the slat (the browser's own ring showed).
In section 3's example with `keyboard` added, focused Britain kept its focus while the sort moved it from seventh to third.
In an `overlap` Plot of points at x 30, 10 and 20 (in that row order), Tab and ArrowRight went 30, 10, 20.

## 10. Play and pause over time

Use it when the story is how a ranking or a set of values changed over many periods (a bar chart race).
Never start it by itself: the reader presses Play.

```js
import { Chart, Plot, Bar, Label, Poster, slat, sortBy, html, render, createSignal, onCleanup } from "@bezda/rhp/standalone";

// Data: points per round of a league (3 for a win, 1 for a draw), and the table after each round (illustrative)
const TEAMS = ["Harbour", "Rovers", "United", "Athletic", "City", "Wanderers"];
const RESULTS = [
  [3, 0, 1, 1, 3, 0], [3, 3, 0, 1, 1, 0], [3, 1, 3, 0, 0, 1], [1, 3, 3, 0, 1, 0], [0, 3, 3, 1, 1, 0],
  [1, 3, 3, 0, 0, 1], [0, 1, 3, 3, 1, 0], [1, 3, 3, 0, 1, 0], [0, 1, 3, 3, 1, 0], [3, 0, 3, 1, 0, 1],
];
const TABLE = RESULTS.map((_, r) => TEAMS.map((_, t) => RESULTS.slice(0, r + 1).reduce((sum, round) => sum + round[t], 0)));
const LAST = RESULTS.length - 1;

// Slat type: the JS version counts the points, so the label rounds them
const Team = slat({ thickness: 36, room: { start: 84, end: 40 } }, (d) => html`
  <div>
    <${Label} edge="start">${() => d.team}<//>
    <${Bar} to=${() => d.points} color=${() => (d.team === "United" ? "#b6421e" : "series-1")} />
    <${Label} at=${() => d.points}>${() => Math.round(d.points)}<//>
  </div>`);

// Chart component: Play steps through the rounds on a timer, the slider picks one, and the timer stops with the chart
function League() {
  const [round, setRound] = createSignal(LAST); // the final table, which the headline is about
  const [playing, setPlaying] = createSignal(false);
  let timer;
  const pause = () => {
    clearInterval(timer);
    setPlaying(false);
  };
  const play = () => {
    if (round() === LAST) setRound(0);
    setPlaying(true);
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches; // values jump then: give each round longer
    timer = setInterval(() => (round() < LAST ? setRound(round() + 1) : pause()), still ? 2000 : 1000);
  };
  onCleanup(() => clearInterval(timer));
  return html`
    <${Poster} title="United climbed from fifth to win the league by seven points"
      note="Illustrative data. Press Play, or pick a round with the slider.">
      <div class="control">
        <button type="button" onClick=${() => (playing() ? pause() : play())}>${() => (playing() ? "Pause" : "Play")}</button>
        <input type="range" min="0" max=${LAST} value=${round} aria-label="Round" aria-valuetext=${() => `Round ${round() + 1} of ${LAST + 1}`}
          onInput=${(e) => { pause(); setRound(+e.currentTarget.value); }}>
        <output>Round ${() => round() + 1}</output>
      </div>
      <${Chart} scale=${[0, 25]} ticks=${[0, 5, 10, 15, 20, 25]} label="League points after each round"
        animate=${() => (playing() ? { duration: 1200, ease: "linear", slide: 400 } : { slide: 400 })}>
        <${Plot} team=${TEAMS} points=${() => TABLE[round()]} order=${sortBy("points", "desc")}>${Team}<//>
      <//>
    <//>`;
}

render(() => html`<${League} />`, document.getElementById("chart"));
```

- The timer is `setInterval`, stopped by Pause, by the slider, at the last round, and by `onCleanup` when the chart is removed (a page change in an app); without `onCleanup` it would keep running.
- The JS version makes the steps one continuous movement, and the slats pass each other as the points cross.
  While it plays, `ease: "linear"` and a duration a little longer than the step (1.2 steps: 1,200 ms for a round a second) keep the bars moving between rounds; for the slider, the default 150 ms lets the bars follow the thumb (the `race` recipe does the same).
- The button's text says what it will do (Play or Pause), so it has no `aria-pressed`.
- **Reduced motion:** rhp stops its own motion when the reader asks for less (values jump), and the race keeps each round on screen longer; your own CSS animations need `@media (prefers-reduced-motion: reduce) { … }`.

Checked: the checker clicked Play and moved the slider (which paused it).
Playwright saw a new round about once a second with a whole number in every label, Pause stop it, and the slider pause it and pick round 5.
Removing the chart while it played left no timer running; with `onCleanup` taken out, one was left.
Under reduced motion a round came every 2 seconds, and Harbour's bar jumped from one length to the next with no widths in between.

## 11. The rules

1. **rhp keeps no interaction state.** Hold it in a signal, pass it to the Plot as a data group (`on=${(d) => on() === d.index}`), and let the slat show it with a class, a color or a value.
   An array every slat needs goes through a function of the row (`shown=${(d) => shown()}`): an array on a Plot is a column.
2. **One handler for the chart.** Put `data-row` on each slat's root (or `data-city`, a key, when rows come and go), find it with `e.target.closest("[data-row]")`, and listen on the Poster or a wrapper `div`: a Chart drops handlers.
3. **Follow the pointer with `pointermove`**, catch a tap with `pointerdown`, and ignore a `pointerleave` from a finger.
4. **Never hover only.** What a hover shows, a tap and the keyboard show too, and the slat's text or `aria-label` says it to a screen reader.
5. **Keyboard wherever slats are interactive:** `keyboard=${true}` on the Plot, or real buttons and inputs; focus styles in the slat's css; never a clickable `div` as the only way in.
6. **Overlay Plots** (a crosshair, a hairline, a today line, markers) get `style=${{ "pointer-events": "none" }}`, or they take the pointer from the Plot under them.
7. **Effects are classes.** Never put a `transition` on a block (`.bar`, `.dot`, a Label) or on the slat's root: rhp moves them with its own, and yours would replace it or be ignored.
   Fade or grow an element inside a block (a `span` in a Label, a Bar's `::after`), or let the change happen at once.
8. **Readouts are one line of fixed height**, short enough for 390px, with tabular figures, so nothing jumps.
9. **Toggles and choices are `<button type="button">`s with `aria-pressed`,** in a `role="group"` with an `aria-label`; a button whose text changes (Play, Pause) has no `aria-pressed`.
10. **Motion:** never start it by itself; stop timers in `onCleanup`; rhp's own motion stops under reduced motion, and yours must check `matchMedia("(prefers-reduced-motion: reduce)")` or `@media (prefers-reduced-motion: reduce)`.
11. **html template traps:** a handler on a component (`<${Poster}>`, a block) takes its event, `(e) => …`, or it runs once while drawing; booleans are written `keyboard=${true}`; standalone has no `createSelector`, so compare in a per-row function; a value that changes is a function.
12. **Interactive charts are never `static`:** a static chart reads each signal once.
13. **Rows that come and go need `key`**, and handlers name the row by that key.
