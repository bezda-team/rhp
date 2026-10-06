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
Each one was run in Chromium at 1280px and 390px: the kit's checker reported no errors and no warnings (except in the cut example, section 8), and a Playwright script hovered, tapped, scrolled, clicked and pressed keys on it.
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
  .poster .headline { font: 700 clamp(23px, 3.7vw, 28px)/1.1 Georgia, serif; text-wrap: balance; }
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
  .control button { min-width: 5.5em; } /* Play and Pause take the same width, so the slider beside them stays put */
  .control output { min-width: 4.5em; } /* "Round 1" to "Round 10" take the same width too */
  /* Focus for buttons and sliders; a slat's focus style goes in its slat css (section 9) */
  :focus-visible { outline: 2px solid #b6421e; outline-offset: 2px; }
  @media (max-width: 480px) { .poster { padding: 18px 14px 12px; } }
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
const LEAD = RAIN.indexOf(Math.max(...RAIN)); // the city the headline names: lit until the reader picks one

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

// Chart component: one signal holds the row the reader picked, and three handlers keep it
function RainChart() {
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
    <${Poster} title="City A gets more than three times City D's October rain" note="Illustrative data."
      onPointerMove=${(e) => e.pointerType !== "touch" && pick(e)} onClick=${pick} onFocusIn=${pick}
      onPointerLeave=${leave} onFocusOut=${(e) => !e.currentTarget.contains(e.relatedTarget) && setOn(null)}>
      <p class="readout" aria-hidden="true">${() => (on() == null ? "Tap or point at a city." : say(on()))}</p>
      <${Chart} scale=${[0, 200]} ticks=${[0, 50, 100, 150, 200]} label="Rain in October, in mm">
        <${Plot} keyboard=${true} city=${CITY} rain=${RAIN} days=${DAYS}
          on=${(d) => (on() ?? LEAD) === d.index} dim=${(d) => on() != null && on() !== d.index}>${City}<//>
      <//>
    <//>`;
}

render(() => html`<${RainChart} />`, document.getElementById("chart"));
```

- **One signal, three handlers.** `pick` finds the slat from whatever the event landed on, with `closest("[data-row]")`, so a bar, a number or the name all count.
  An event on no slat (a gap, the axis, the headline) leaves the pick as it is, so the readout never flickers on its way from one slat to the next.
- **Who picks.** A mouse or a pen picks on `pointermove`, so the readout follows it; a finger does not, because a finger that moves is scrolling the page.
  A tap or a click picks on `click`, which a scroll never fires, so scrolling a phone never changes the pick.
  Never pick on `pointerdown`: every scroll starts with one.
  The keyboard picks on `focusin`.
- **Clearing.** `pointerleave` hands the pick back to the slat that has focus (the keyboard's pick, or a click's, since a click focuses the slat), or clears it when no slat in the poster has focus.
  It ignores a finger, whose `pointerleave` comes as it lifts after a tap.
  `focusout` clears when focus leaves the poster: a tap anywhere else takes focus from the slat.
  A control that is not a slat (a slider, or a date that is a `role="slider"`) keeps the pointer's pick on leave only while it has keyboard focus, `slider.matches(":focus-visible")`: a mouse click focuses it too, and with `document.activeElement` alone the pointer's last pick would stay after the pointer left.
- **At rest**, the city the headline names is lit (`on() ?? LEAD`), and the readout gives the hint, in words that fit every device, or a fact the headline does not state; never the headline again, which spends the line next to the data on words the reader has just read.
- **The hint names a way in that the reader cannot see.** A control only the keyboard finds, such as a date that is a `role="slider"` with no handle, is named in it: "Point at a year, or Tab to the date and use the arrow keys."
- **Lit and dimmed.** The Plot turns the signal into two per-row groups, `on` and `dim`; the slat turns them into classes, and its css does the rest.
  rhp fades the Bar's `color` itself; the opacity changes at once, because a `transition` on a block would replace rhp's own (rule 7 in section 11).
- **The readout** is one line of fixed height, so the chart under it never moves; keep its text short enough for 390px.
  It is `aria-hidden` because each slat's `aria-label` says the same to a screen reader.
- **Next to the slat.** The readout can sit in the slat itself: `<${Show} when=${() => d.on}><${Label} at=…>…<//><//>` draws it in that one slat only (the pyramid and histogram recipes).
  Do that when the chart is taller than about half a phone's screen, or pin the readout to the screen while the chart is in view: `position: sticky; bottom: 0` on a readout after the chart, with `z-index: 2`, the paper as its background and a hairline on its top edge (`box-shadow: 0 -1px 0 #d9d4ca`), so it reads as a strip laid over the chart.
  A readout above the chart pins (`top: 0`, and the hairline on its bottom edge) only while a pick exists, with a class such as `.readout.picked`: pinned at rest, it covers the plot's top as soon as the reader scrolls to the chart.
  A readout above a tall chart is out of sight when the reader taps a low slat, and without `z-index: 2` the slats cover a pinned one (rhp's plot is at `z-index: 1`).

Checked: the checker reported a change for each slat it pointed at (City A, City C, City F) and tapped (City A, City F); its Tab reached City A and ArrowDown moved focus to City B.
Playwright with a mouse: at rest City A was lit and the readout gave the hint; on City C's bar the readout named City C, City C was lit, and the five others were at opacity .3 with rhp's transition still on their bars; from City F down onto the axis the readout stayed on City F; leaving the poster cleared it all.
With focus on City A, the mouse over City D took the readout, and leaving the poster gave it back to City A.
At 390px with touch: a tap on City B kept the readout after the finger lifted, a scroll that started on City E moved the page and left the readout on City B, a tap on City E's number picked City E, and a tap on the headline or below the poster cleared it.
With slats 110px thick (a chart taller than a 390 × 664 screen), a readout pinned with `position: sticky` and `z-index: 2`, after the chart or above it, showed City B on screen, and City E after a scroll, with its hairline edge; without `z-index: 2` the slats covered it.
Scrolled to the chart before any pick, the readout above it that pins only while a pick exists was out of the way, and one pinned at rest covered the plot's top.
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
    <${Poster} title="In summer, iced coffee outsells the latte two to one" note="Illustrative data.">
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
  It is for data that changes rapidly or continuously: a pointer, a slider or a drag that drives the data (sections 6 and 7), or a playhead that plays it back (section 10).
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
      dek="Hours a week on screens outside school and work. Press a series to hide it or show it again." note="Illustrative data.">
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
const Trend = (d) => html`<${Line} points=${() => d.points} />`;
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
  let start = [0, 0]; // where the last finger went down
  // A finger that moves more sideways than up or down scrubs; one that moves up or down scrolls the page
  const sideways = (e) => Math.abs(e.clientX - start[0]) > Math.abs(e.clientY - start[1]);
  return html`
    <${Poster} title="Summer brings seven times the visitors of winter"
      dek="Visitors a week. Tap or point at the chart, or drag along it." note="Illustrative data.">
      <p class="readout" aria-hidden="true">${say}</p>
      <div style="touch-action: pan-y; cursor: crosshair" onPointerDown=${(e) => (start = [e.clientX, e.clientY])}
        onPointerMove=${(e) => (e.pointerType !== "touch" || sideways(e)) && point(e)} onClick=${point}>
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
- **Touch.** `touch-action: pan-y` on the wrapper lets an up or down drag scroll the page, and a tap picks the week under it (`click`).
  A finger scrubs only when it moves more sideways than up or down: the browser sends a few `pointermove`s before it takes over a scroll, and those must not move the pick.
  `pointerdown` only notes where the finger started; picking there would move the pick at the start of every scroll.
- **Keys.** The range input is the keyboard's way in (arrows, Home, End, Page Up and Down) and a screen reader's (`aria-valuetext` says the point); it also gives a finger a large target.
- **Evenly spaced x (years):** the line and multi-line recipes catch the pointer with an invisible vertical Plot of one column per year with `keyboard=${true}`, so the arrows work on the chart itself and each column has its own text; use that up to a few hundred points.

Checked: the checker pointed at the chart and changed the slider, and both moved the readout and the hairline.
Playwright put the mouse at a quarter of the plot's width and read week 14 (1 + 0.25 × 51 = 13.75), with the hairline on week 14's x; on the slider, End then ArrowLeft gave week 51, Home week 1 (the same text in `aria-valuetext`), and Page Up moved on several weeks.
At 390px with touch, a scroll that started on week 10 moved the page and left the readout on week 31, a tap on week 20 picked it, and a sideways drag from week 10 to week 40 moved the readout to week 40 without scrolling the page sideways.
Chromium sent two or three `pointermove`s before it took over the scroll: without the check on the direction, they moved the pick to week 10.

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
const ticks = top.ticks.filter((v, k) => k % 2 === 0); // every other one: "$100K" is 35px wide, and the plot 120px at 320px
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
      note="Interest on a $300,000 loan repaid monthly.">
      <label class="control">Interest rate
        <input type="range" min="0" max=${MAX_RATE} step="0.25" value="5" aria-valuetext=${() => rate().toFixed(2) + "%"} onInput=${(e) => setRate(+e.currentTarget.value)}>
        <b aria-hidden="true">${() => rate().toFixed(2)}%</b>
      </label>
      <${Chart} scale=${[top.min, top.max]} ticks=${ticks} format=${(v) => money.format(v)} label="Interest paid on a $300,000 loan, by term">
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
      dek="Tap or click a city to compare the others with it." note="Illustrative data."
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
    <${Poster} title="City A is the wettest of these cities in October"
      dek="Take a city out with its button to see the others at a larger scale." note="Illustrative data." onClick=${cut}>
      <div class="choices"><button type="button" onClick=${() => setLeft(CITIES)}>Show all</button></div>
      <${Chart} scale=${() => [top().min, top().max]} ticks=${() => top().ticks} label="Rain in October, in mm">
        <${Plot} rows=${left} key="city">${City}<//>
      <//>
    <//>`;
}

render(() => html`<${RainChart} />`, document.getElementById("chart"));
```

Checked: the checker clicked the six name buttons and each changed the chart; in the cut example its clicks took the cities out one by one, and the click on the last one changed nothing (one city always stays).
In the cut example its only warnings are `layout-jump` ones for the name buttons below the city taken out: they move up with their slats, which is the interaction itself.
Playwright clicked City F's bar and read City A at "36.8×", clicked it again to clear, went from City A's button with Tab twice and Enter to pick City C (City A read "2.3×"), and pressed Escape to clear; at 390px a tap on City D's bar picked City D.
With `keyboard` on the Plot and no buttons, Tab, ArrowDown twice and Enter picked City C.
In the cut example, Enter on "Take City A out" left five cities, moved the scale's end from 200 to 125 and focus to City B's button, and "Show all" brought City A back.

## 9. Keyboard

Give the keyboard what the pointer gets wherever slats are interactive: `keyboard=${true}` on the Plot the reader explores (section 2 has it).

- Tab stops at one slat (the one focused last, or the first shown), so the chart is one Tab stop however many slats it has.
- The arrow keys go to the slat shown before or after (Down and Right forward, Up and Left back, in either orientation), Home and End to the first and the last, in the order on screen.
- A slat keeps its focus when a sort moves it.
- Keys with Shift, Ctrl, Alt or Meta are left alone, and so are keys a handler inside the slat has already handled (`e.preventDefault()`).
- `onFocusIn` on the Poster runs the same `pick` as the pointer, `onFocusOut` clears it when focus leaves the poster, and a mouse that leaves the poster hands the pick back to the focused slat (section 2).
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
Do not start it by itself: the reader presses Play.
A race is the one exception: it may start once by itself when half of it scrolls into view (the race recipe does), never under reduced motion, and never again after the reader has used a control.

The app holds a playhead `t`, a period with a fraction, and the Plot gets the values at `t`: each one on the straight line between its values in the two periods around `t`.
While it plays, every frame moves `t` on by the time since the last frame, so the bars glide through the periods without stopping at each one.
Pause leaves `t` where it is, between two periods too, so the reader can read the values in between.
The slider is the playhead's handle: its value follows `t` while it plays, and with `step="any"` a drag or a key puts `t` wherever the handle stops.

```js
import { Chart, Plot, Bar, Label, Poster, slat, sortBy, html, render, createSignal, onCleanup } from "@bezda/rhp/standalone";

// Data: points per round of a league (3 for a win, 1 for a draw), and the table after each round (illustrative)
const TEAMS = ["Harbour", "Rovers", "United", "Athletic", "City", "Wanderers"];
const RESULTS = [
  [3, 0, 1, 1, 3, 0], [3, 3, 0, 1, 1, 0], [3, 1, 3, 0, 0, 1], [1, 3, 3, 0, 1, 0], [0, 3, 3, 1, 1, 0],
  [1, 3, 3, 0, 0, 1], [0, 1, 3, 3, 1, 0], [1, 3, 3, 0, 1, 0], [0, 1, 3, 3, 1, 0], [3, 0, 3, 1, 0, 1],
];
const TABLE = RESULTS.map((_, r) => TEAMS.map((_, i) => RESULTS.slice(0, r + 1).reduce((sum, round) => sum + round[i], 0)));
const LAST = RESULTS.length - 1;
// The points at t, a round with a fraction: each team's on the straight line between the rounds around t
const pointsAt = (t) => {
  const r = Math.min(Math.floor(t), LAST - 1);
  const f = t - r;
  return TABLE[r].map((p, i) => p * (1 - f) + TABLE[r + 1][i] * f);
};

// Slat type: the points are fractional between rounds, so the label rounds them
const Team = slat({ thickness: 36, room: { start: 84, end: 40 } }, (d) => html`
  <div>
    <${Label} edge="start">${() => d.team}<//>
    <${Bar} to=${() => d.points} color=${() => (d.team === "United" ? "#b6421e" : "series-1")} />
    <${Label} at=${() => d.points}>${() => Math.round(d.points)}<//>
  </div>`);

// Chart component: the playhead t, a round with a fraction, is the app's state. Play moves it on with time, Pause
// leaves it where it is, the slider puts it where the handle is, and the frame loop stops with the chart.
function League() {
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const roundMs = still ? 2000 : 1000; // under reduced motion the values jump, so each round stays longer
  const [t, setT] = createSignal(LAST); // the final table, which the headline is about
  const [playing, setPlaying] = createSignal(false);
  const round = () => Math.round(t()); // the nearest whole round, whose figures the bars are closest to
  let frame;
  const pause = () => {
    cancelAnimationFrame(frame);
    setPlaying(false);
  };
  // Each frame moves t on by the time since the last frame (at most 250 ms, so a hidden tab resumes where it was).
  // Under reduced motion t moves only when it reaches a whole round.
  const play = () => {
    if (t() === LAST) setT(0); // from the last round, it starts again
    let p = t();
    let last = null;
    const move = (now) => {
      p = Math.min(LAST, p + Math.min(now - (last ?? now), 250) / roundMs);
      last = now;
      setT(still ? Math.max(t(), Math.floor(p)) : p);
      if (p < LAST) frame = requestAnimationFrame(move);
      else pause();
    };
    setPlaying(true);
    frame = requestAnimationFrame(move);
  };
  // A drag, a tap or a key on the slider pauses, and t goes where the handle is, between two rounds too
  const seek = (e) => {
    pause();
    setT(+e.currentTarget.value);
  };
  onCleanup(() => cancelAnimationFrame(frame));
  const where = () => (Number.isInteger(t()) ? `Round ${t() + 1} of ${LAST + 1}` : `Between rounds ${Math.floor(t()) + 1} and ${Math.ceil(t()) + 1}`);
  return html`
    <${Poster} title="United climbed from fifth to win the league by seven points" note="Illustrative data.">
      <div class="control">
        <button type="button" onClick=${() => (playing() ? pause() : play())}>${() => (playing() ? "Pause" : "Play")}</button>
        <input type="range" min="0" max=${LAST} step="any" value=${t} aria-label="Round" aria-valuetext=${where} onInput=${seek}>
        <output>Round ${() => round() + 1}</output>
      </div>
      <${Chart} scale=${[0, 25]} ticks=${[0, 5, 10, 15, 20, 25]} label="League points after each round" animate=${{ slide: 400 }}>
        <${Plot} team=${TEAMS} points=${() => pointsAt(t())} order=${sortBy("points", "desc")}>${Team}<//>
      <//>
    <//>`;
}

render(() => html`<${League} />`, document.getElementById("chart"));
```

- The playhead moves in a `requestAnimationFrame` loop, stopped by Pause, by the slider, at the last round, and by `onCleanup` when the chart is removed (a page change in an app); without `onCleanup` it would keep running.
- The points change on every frame, so the Chart moves them by the JS version (`animate`) with its default 150 ms: the bars follow the playhead a few pixels behind it, and the slats pass each other as the points cross.
  Do not step through the rounds with a timer and a long transition instead: each bar would ease into a round and wait there, and Pause could only stop on a round.
- The slider's `value` follows `t`, so the handle moves while it plays and stays where Pause leaves `t`.
  A drag or a tap on the slider pauses and puts `t` where the handle is.
  The slider's own keys move `t` too, by the browser's step: an arrow moves a hundredth of the range in Chrome and Safari and one round in Firefox, and Home and End go to the first and the last round.
- The labels round the points, which are fractional between rounds; the output names the nearest round, and `aria-valuetext` says where `t` is ("Round 4 of 10", or "Between rounds 4 and 5").
  The output keeps one width (`min-width` in the page's CSS): when "Round 9" became "Round 10", a wider output would shorten the slider and the handle would jump back.
- The button's text says what it will do (Play or Pause), so it has no `aria-pressed`.
- **Reduced motion:** rhp stops its own motion when the reader asks for less (values jump), and the playhead moves a whole round at a time, each round kept on screen for two seconds; your own CSS animations need `@media (prefers-reduced-motion: reduce) { … }`.

**Option: snap the slider to important points.**
Snap only when the timeline has points worth reading exactly all along it: the `race` recipe snaps to its years, because each year is a measured value and the values between them are interpolated.
A drag or a tap then lands on the nearest point, and the keys move from the point nearest to `t`, so a reader can pause and move the handle to a point to read its exact figures.
Play and Pause stay the same: the bars still glide, and Pause still stops between points.
Replace `seek` with these lines, and give the slider `onKeyDown=${key}`:

```js
// The slider's keys: how many rounds each one moves
const KEYS = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -3, PageUp: 3, Home: -Infinity, End: Infinity };
// A drag or a tap lands on the nearest round. The handle is set here too, because t does not change (and so does not
// move the handle) when it was that round already.
const seek = (e) => {
  pause();
  setT(Math.round(+e.currentTarget.value));
  e.currentTarget.value = t();
};
// The keys move from the nearest round, handled here so that every browser moves the same
const key = (e) => {
  const by = KEYS[e.key];
  if (by === undefined || e.altKey || e.ctrlKey || e.metaKey) return;
  e.preventDefault();
  pause();
  setT(Math.min(LAST, Math.max(0, round() + by)));
};
```

A timeline with no such points keeps the continuous slider.

Checked: the checker clicked Play, moved the slider and pressed an arrow key on it, and reported no errors and no warnings.
Playwright saw Play start again from round 1, `t` rise on every frame at one round a second with a whole number in every label, and Rovers' bar change width on every frame for 2 seconds, about 3 px (66 ms) behind the playhead.
Pause between rounds 3 and 4 left the handle there and every bar at the points interpolated at the paused `t` (none at either round's points), and nothing moved in the next 1.5 seconds.
A drag of the handle left `t` where it was dropped (5.11, between rounds 6 and 7), ArrowRight moved it on by 0.09, and a key pressed while it played paused it; it played to round 10 and stopped there, and Play started it again from round 1.
The slider kept its length when "Round 9" became "Round 10", at 1280px and at 390px; without the output's `min-width` it lost 8.6px.
Removing the chart while it played left no frame loop running; with `onCleanup` taken out, the loop kept asking for frames.
Under reduced motion a round came every 2 seconds, Harbour's bar jumped from one length to the next with no widths in between, and Play from between two rounds kept `t` there until the next round.
With the option's lines in place of `seek`, Pause still stopped between rounds, and every drag and key landed on a whole round with every bar at its points.

## 11. The rules

1. **rhp keeps no interaction state.** Hold it in a signal, pass it to the Plot as a data group (`on=${(d) => on() === d.index}`), and let the slat show it with a class, a color or a value.
   An array every slat needs goes through a function of the row (`shown=${(d) => shown()}`): an array on a Plot is a column.
2. **One handler for the chart.** Put `data-row` on each slat's root (or `data-city`, a key, when rows come and go), find it with `e.target.closest("[data-row]")`, and listen on the Poster or a wrapper `div`: a Chart drops handlers.
3. **A mouse or a pen picks on `pointermove`; a tap or a click on `click`; the keyboard on `focusin`.**
   Never pick on `pointerdown`, and on a finger's `pointermove` only when it moves sideways along a scrubber (section 6): a scroll on a phone starts with both.
   An event on no slat keeps the pick, and `pointerleave` (never a finger's) hands it back to the focused slat or clears it; a control that is not a slat (a slider) keeps it only while it matches `:focus-visible`, since a mouse click focuses it too.
4. **Never hover only.** What a hover shows, a tap and the keyboard show too, and the slat's text or `aria-label` says it to a screen reader.
   The hint names a control only the keyboard finds ("or Tab to the date and use the arrow keys").
5. **Keyboard wherever slats are interactive:** `keyboard=${true}` on the Plot, or real buttons and inputs; focus styles in the slat's css; never a clickable `div` as the only way in.
   Never `outline: none` on a focusable slat unless the slat's css draws another mark of focus that is as easy to see (a ring around the mark, an ink stroke on it).
6. **Overlay Plots** (a crosshair, a hairline, a today line, markers) get `style=${{ "pointer-events": "none" }}`, or they take the pointer from the Plot under them.
7. **Effects are classes.** Never put a `transition` on a block (`.bar`, `.dot`, a Label) or on the slat's root: rhp moves them with its own, and yours would replace it or be ignored.
   Fade or grow an element inside a block (a `span` in a Label, a Bar's `::after`), or let the change happen at once.
8. **Readouts are one line of fixed height**, short enough for 320px, with tabular figures, so nothing jumps; a readout of several lines keeps a `min-height` for its longest text at 320px.
   At rest it gives the hint or a fact the headline does not state, never the headline again.
   On a phone, a chart taller than about half the screen shows the reading next to the picked slat, or pins the readout (section 2).
9. **Toggles and choices are `<button type="button">`s with `aria-pressed`,** in a `role="group"` with an `aria-label`; a button whose text changes (Play, Pause) has no `aria-pressed`.
10. **Motion:** do not start playback by itself (a race may, once, when half of it is in view; never under reduced motion or after the reader used a control); stop timers and frame loops in `onCleanup`; rhp's own motion stops under reduced motion, and yours must check `matchMedia("(prefers-reduced-motion: reduce)")` or `@media (prefers-reduced-motion: reduce)`.
11. **html template traps:** a handler on a component (`<${Poster}>`, a block) takes its event, `(e) => …`, or it runs once while drawing; booleans are written `keyboard=${true}`; compare in a per-row function (`on=${(d) => on() === d.index}`), which works with every rhp 2 (`createSelector` is there from 2.0.2); a value that changes is a function.
12. **Interactive charts are never `static`:** a static chart reads each signal once.
13. **Rows that come and go need `key`**, and handlers name the row by that key.
