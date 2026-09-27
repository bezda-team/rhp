// The gallery: every chart is a Chart holding a Plot of slats, and some draw their own scale with a Scale.
// A slat owns its look and layout: its CSS, thickness, inset and gutter room travel with it. Its structural colors and
// font come from a theme: the page's (page.jsx) or one a demo passes to its Chart. Nothing here reads the page's CSS.
// Most charts sit in a Poster, a magazine-style panel that belongs to the page (page.src.html styles it).
// Each demo gets p.o() (orientation), p.js() (JS version on) and p.seed() (bumped by "New data").
// The code between show markers is what the page prints under each chart.
import { createSignal, createMemo, createComputed, on, onMount, onCleanup, splitProps, Show } from "solid-js";
import { Plot, Scale, Chart, Bar, Dot, Tick, Label, Cell, Area, slat, useOrientation, sortBy, every, nice, stackUp, shares, running, summary, bins, density } from "../../src/index.js";
// v1's assets (master's public/), bundled into the page as data URLs. Fruit art: FreeVector.com.
// The cloud photos are v1's, re-encoded at the size they are shown (640px on the short side), without their EXIF.
import grape from "./assets/grape.svg";
import watermelon from "./assets/watermelon.svg";
import pear from "./assets/pear.svg";
import banana from "./assets/banana.svg";
import orange from "./assets/orange.svg";
import peach from "./assets/peach.svg";
import strawberry from "./assets/strawberry.svg";
import stratocumulus from "./assets/stratocumulus.jpg";
import cumulonimbus from "./assets/cumulonimbus.jpg";
import altocumulus from "./assets/altocumulus.jpg";
import cirrus from "./assets/cirrus.jpg";
import nimbostratus from "./assets/nimbostratus.jpg";
import cumulus from "./assets/cumulus.jpg";
import cirrocumulus from "./assets/cirrocumulus.jpg";

// ── data helpers for the demos (not part of rhp) ──
const rand = (a, b) => a + Math.random() * (b - a);
const normal = (m, s) => m + s * Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
// n samples of a normal truncated to lo..hi, for points that must stay on the scale (rhp clips spans, not points)
const normalsIn = (n, lo, hi, m, s) => Array.from({ length: n }, () => { for (;;) { const v = normal(m, s); if (v >= lo && v <= hi) return v; } });
const sum = (a) => a.reduce((x, y) => x + y, 0);

// A magazine-style panel around a chart: kicker, headline, dek, the chart, a note. It is the page's: the page CSS
// styles .poster and its look (.medals, .coffee, …); the chart inside gets its colors and font from its theme.
// Any other prop goes on the panel: a demo that follows the pointer listens there, over its key and its chart.
function Poster(p) {
  const [own, rest] = splitProps(p, ["look", "kicker", "title", "dek", "note", "children"]);
  return (
    <figure class={"poster " + own.look} {...rest}>
      <figcaption>
        <span class="kicker">{own.kicker}</span>
        <span class="headline">{own.title}</span>
        <span class="dek">{own.dek}</span>
      </figcaption>
      {own.children}
      <Show when={own.note}><span class="note">{own.note}</span></Show>
    </figure>
  );
}

/*<show v1scale>*/
// v1's scale: a Scale in the Chart draws it, one slat per tick, a mark and its number.
// The marks start 16px above the first row, and the numbers sit over them, in the room this slat asks for.
// A mark is "zero" (solid, just before 0), "end" (solid, at the max), or between them `marks`:
// "line" (dashed, as long as the plot) or "tick" (13px long).
const V1Scale = slat({
  room: { horizontal: { before: 40, after: 13 }, vertical: { before: 24, end: 30, after: 13 } },
  css: `
    .mark { --rhp-tick-width: 4px; background: var(--rhp-muted); translate: none; }
    .mark:horizontal { top: -16px; bottom: -12.8px; height: auto; }
    .mark:vertical { left: -16px; right: -12.8px; width: auto; }
    .zero > .mark:horizontal { translate: -100% 0; }
    .zero > .mark:vertical { translate: 0 100%; }
    .line > .mark { background: none; }
    .line > .mark:horizontal { border-left: 4px dashed var(--rhp-grid); }
    .line > .mark:vertical { border-top: 4px dashed var(--rhp-grid); }
    .tick > .mark { background: var(--rhp-grid); }
    .tick > .mark:horizontal { bottom: auto; height: 13px; }
    .tick > .mark:vertical { right: auto; width: 13px; }
    .num { font-size: 13px; font-weight: 700; line-height: 19.5px; font-variant-numeric: normal; color: var(--rhp-muted); translate: none; --rhp-label-gap: 8px; }
    .zero > .num { --rhp-label-gap: 4px; }
    .num:horizontal { top: -20px; }
    .num:vertical { left: -20px; }
    .num.crowded { visibility: hidden; }`,
}, (t) => {
  // A number just before the end would run into the end mark, so it's left out, and only then: horizontal, when its
  // text (8px past its mark, about 8px a digit) would come within 3px of the end mark; vertical, when its line
  // (19.5px tall, 8px above its mark) would. t.toEnd is the tick's distance to the end, in px.
  const o = useOrientation();
  const crowded = () => !t.first && !t.last && t.toEnd < (o() === "vertical" ? 31 : 11 + 8 * String(Math.round(t.at)).length);
  return (
    <div class={t.first ? "zero" : t.last ? "end" : t.marks}>
      <Tick at={t.at} thick={1} class="mark" />
      <Label at={t.at} class={crowded() ? "num crowded" : "num"}>{Math.round(t.at)}</Label>
    </div>
  );
});
/*</show>*/

/*<show fruit>*/
const NAMES = ["Fruit A", "Fruit B", "Fruit C", "Fruit D", "Fruit E", "Fruit F", "Fruit G"];
const FRUITS = ["grape", "watermelon", "pear", "banana", "orange", "peach", "strawberry"];
const ART = [grape, watermelon, pear, banana, orange, peach, strawberry];
const COLORS = ["pink", "#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51", "#ce4257"];

const FruitSlat = slat({
  thickness: { horizontal: 79 }, // v1: seven rows in 552px; vertical: the rows share the width
  inset: "8px",
  room: { horizontal: { start: 112, end: 32 }, vertical: { start: 32, end: 30 } }, // for the names and values
  css: `
    .name { font-size: 16px; font-weight: 600; line-height: 24px; color: var(--rhp-muted); }
    .name:horizontal { text-align: center; --rhp-label-gap: 0px; }
    .bar { display: flex; align-items: center; overflow: hidden; --rhp-start-radius: 0px; --rhp-end-radius: 16px; }
    .bar:vertical { flex-direction: column-reverse; }
    .bar:hover { border: 4px solid var(--rhp-ink); }
    /* The art fills the bar's length up to 300px, is never under 50px, and the bar crops it. */
    .bar > img { display: block; flex: 1 1 auto; width: auto; height: auto; margin: 0; min-width: 0; min-height: 0; max-width: none; max-height: none; }
    .bar:horizontal > img { min-width: 50px; max-width: 300px; }
    .bar:vertical > img { min-height: 50px; max-height: 300px; }
    .value { font-size: 13px; font-weight: 700; line-height: 19.5px; font-variant-numeric: normal; color: var(--rhp-color); --rhp-label-gap: 8px; }
    .bar:hover ~ .value { color: var(--rhp-ink); }
    .dim { filter: saturate(40%); }
    .dim:hover { filter: saturate(110%); }`,
}, (d) => (
  <div class={d.dim ? "slat dim" : "slat"} style={{ "--rhp-color": d.color }}>
    <Label edge="start" class="name">{d.name}</Label>
    <Bar to={d.value} class="bar"><img src={d.art} alt={d.fruit} /></Bar>
    <Label at={d.value} class="value">{Math.round(d.value)}</Label>
  </div>
));

export function Fruit(p) {
  const data = createMemo(() => (p.seed() ? FRUITS.map(() => Math.round(rand(1, 30))) : [1, 2, 18, 3, 25, 13, 20]));
  const [a, setA] = createSignal(); // Fruit A from the slider; new data resets it
  createComputed(on(data, () => setA(undefined)));
  const values = createMemo(() => (a() == null ? data() : [a(), ...data().slice(1)]));
  const max = createMemo(() => Math.max(...values())); // v1's "Fit": the scale ends at the largest value
  const [ranked, setRanked] = createSignal(true);
  const [dim, setDim] = createSignal(false);
  return (
    <>
      <div class="buttons">
        <button class="mini" onClick={() => setRanked(!ranked())}>{ranked() ? "Initial" : "Rank"}</button>
        <button class="mini" onClick={() => setDim(!dim())}>{dim() ? "Saturate" : "Desaturate"}</button>
        <label class="slider">Fruit A
          <input type="range" min="0" max="100" value={values()[0]} onInput={(e) => setA(+e.currentTarget.value)} />
          <output>{values()[0]}</output>
        </label>
      </div>
      <Chart orientation={p.o()} scale={[0, max()]} height={480} animate={p.js()}>
        <Scale ticks={every(5, { ends: true })} marks="line">{V1Scale}</Scale>
        <Plot name={NAMES} fruit={FRUITS} art={ART} value={values()} color={COLORS} dim={dim()}
          order={ranked() ? sortBy("value", "desc") : undefined}>{FruitSlat}</Plot>
      </Chart>
    </>
  );
}
/*</show>*/

/*<show tutorial>*/
const QUARTERS = ["North", "East", "South", "West"];
const BEARING = { North: 0, East: 90, South: 180, West: 270 };
const HARBOUR = { font: "system-ui, sans-serif", ink: "#0b2a3c", muted: "#55707f", grid: "#c3d9e3", surface: "#e3f0f5" };

// v1's tutorial: the value hides until you hover its row, with CSS the slat owns. The compass needle points
// to the quarter the wind comes from. The fade is on the text inside the Label: a transition set on a block
// would replace the one rhp gives it, and the Label would jump to a new value instead of moving with its bar.
const WindSlat = slat({
  thickness: { horizontal: 60 },
  room: { horizontal: { start: 128, end: 64 }, vertical: { start: 64, end: 30 } },
  css: `
    .quarter { display: flex; align-items: center; gap: 10px; overflow: visible; font-size: 16px; font-weight: 700; }
    .quarter:horizontal { justify-content: flex-end; padding-right: 16px; }
    .quarter:vertical { flex-direction: column; gap: 6px; padding-top: 8px; font-size: 13px; }
    .dial { position: relative; flex: none; width: 30px; height: 30px; border-radius: 50%; background: #fff; box-shadow: 0 2px 6px rgb(11 42 60 / .2); }
    .needle { position: absolute; inset: 4px 11px; clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%); background: linear-gradient(#ff6b4a 50%, #0b2a3c 50%); }
    .gust { --rhp-radius: 99px; }
    .gust { background: linear-gradient(var(--rhp-toward-end), rgb(11 42 60 / 0), #0b2a3c); }
    .slat:hover .gust { background: linear-gradient(var(--rhp-toward-end), rgb(255 107 74 / 0), #ff6b4a); }
    .knots { font-size: 14px; font-weight: 800; color: #ff6b4a; }
    .knots > span { opacity: 0; transition: opacity .15s; }
    .knots:horizontal { --rhp-label-gap: 10px; }
    .slat:hover .knots > span { opacity: 1; }`,
}, (d) => (
  <div class="slat">
    <Label edge="start" class="quarter"><span class="dial"><i class="needle" style={{ rotate: BEARING[d.quarter] + "deg" }} /></span>{d.quarter}</Label>
    <Bar to={d.knots} thick="10px" class="gust" />
    <Label at={d.knots} class="knots"><span>{Math.round(d.knots)} kn</span></Label>
  </div>
));

export function Tutorial(p) {
  const knots = createMemo(() => (p.seed(), [12, 5, 7, 9].map((v) => Math.max(2, Math.round(v + rand(-3, 3))))));
  return (
    <Poster look="wind" kicker="Harbour log · this week" title="Where the wind blows from" dek="Average wind speed from each quarter. Hover a row to read it in knots.">
      <Chart orientation={p.o()} scale={[0, 15]} ticks={[0, 5, 10, 15]} format={(v) => v + " kn"} height={300} animate={p.js()} theme={HARBOUR}>
        <Plot quarter={QUARTERS} knots={knots()}>{WindSlat}</Plot>
      </Chart>
    </Poster>
  );
}
/*</show>*/

/*<show clouds>*/
const CLOUDS = ["stratocumulus", "cumulonimbus", "altocumulus", "cirrus", "nimbostratus", "cumulus", "cirrocumulus"];
const PHOTOS = [stratocumulus, cumulonimbus, altocumulus, cirrus, nimbostratus, cumulus, cirrocumulus];
const GREYS = ["#9fa2a4", "#cbdddf", "#a5aeb5", "#dbe7eb", "#dae6ec", "#c2d6e0", "#c9ced3"];
// v1's data: [low whisker, box start, box end, high whisker] per cloud
const WHISKERS = [[1, 3, 9, 10], [2, 3, 15, 20], [5, 9, 16, 18], [3, 4, 7, 9], [10, 18, 22, 25], [13, 15, 18, 22], [15, 20, 26, 27]];

const BoxSlat = slat({
  thickness: { horizontal: 79 },
  inset: "8px",
  room: { horizontal: { start: 96, end: 37 }, vertical: { start: 80, end: 30 } }, // for the photos and values
  css: `
    .photo { display: flex; align-items: center; justify-content: center; padding: 0; overflow: visible; }
    .photo:horizontal { top: 8px; bottom: 8px; translate: none; }
    .photo:vertical { height: var(--rhp-room-start); }
    .circle { flex: none; aspect-ratio: 1; border-radius: 50%; border: 4px solid var(--rhp-grid); overflow: hidden; }
    .photo:horizontal > .circle { height: 100%; }
    .photo:vertical > .circle { width: min(63px, 100% - 16px); }
    .circle > img { display: block; width: 100%; height: 100%; margin: 0; object-fit: cover; transform: scale(5); }
    .whisker, .box { --rhp-radius: 0px; }
    .cap { --rhp-tick-width: 4px; }
    .cap:horizontal { translate: 0 -50%; }
    .cap:vertical { translate: -50% 0; }
    .box { display: flex; align-items: center; justify-content: center; overflow: hidden; background: none;
      border: 4px solid var(--rhp-color); color: var(--rhp-color); font-size: 16px; line-height: 24px; white-space: nowrap; }
    .box:vertical > span { writing-mode: vertical-rl; rotate: 180deg; }
    .value { font-size: 13px; font-weight: 700; line-height: 19.5px; font-variant-numeric: normal; color: var(--rhp-color); --rhp-label-gap: 8px; }
    .value:horizontal { margin-top: -1px; } /* v1: 1px above the middle */
    .slat:hover .circle { border: 5px solid var(--rhp-muted); }
    .slat:hover .circle > img { transform: scale(1.5); }
    .slat:hover .box { border: 5px solid var(--rhp-muted); color: var(--rhp-muted); font-weight: 500; }
    .slat:hover :is(.whisker, .cap) { background: var(--rhp-muted); }
    .slat:hover .cap { --rhp-tick-width: 6px; }
    .slat:hover .value { color: var(--rhp-ink); }
    .dim { filter: saturate(10%); }
    .dim:hover { filter: saturate(110%); }`,
}, (d) => (
  <div class={d.dim ? "slat dim" : "slat"} style={{ "--rhp-color": d.color }}>
    <Label edge="start" class="photo"><div class="circle"><img src={d.photo} alt={d.name} /></div></Label>
    <Bar from={d.box[0]} to={d.box[1]} thick="6px" class="whisker" />
    <Bar from={d.box[2]} to={d.box[3]} thick="6px" class="whisker" />
    <Tick at={d.box[0]} thick="19px" class="cap" />
    <Tick at={d.box[3]} thick="19px" class="cap" />
    <Bar from={d.box[1]} to={d.box[2]} class="box"><span>{d.name}</span></Bar>
    <Label at={d.box[3]} class="value">{Math.round(d.box[3])}</Label>
  </div>
));

const whiskers = () => {
  const low = Math.round(rand(0, 14)), q1 = low + Math.round(rand(1, 6)), q3 = q1 + Math.round(rand(2, 8));
  return [low, q1, q3, q3 + Math.round(rand(1, 6))];
};

export function Clouds(p) {
  const data = createMemo(() => (p.seed() ? CLOUDS.map(whiskers) : WHISKERS));
  // The slider moves stratocumulus' box end (its 3rd value); the high whisker is pushed along past it, and
  // comes back when the box shrinks again. New data resets it.
  const [end, setEnd] = createSignal();
  createComputed(on(data, () => setEnd(undefined)));
  const boxes = createMemo(() => data().map((b, i) => (i === 0 && end() != null ? [b[0], b[1], Math.max(b[1], end()), Math.max(b[3], end())] : b)));
  const max = createMemo(() => Math.max(...boxes().map((b) => b[3]))); // "Fit"
  const [ranked, setRanked] = createSignal(true);
  const [dim, setDim] = createSignal(false);
  return (
    <>
      <div class="buttons">
        <button class="mini" onClick={() => setRanked(!ranked())}>{ranked() ? "Initial" : "Rank"}</button>
        <button class="mini" onClick={() => setDim(!dim())}>{dim() ? "Saturate" : "Desaturate"}</button>
        <label class="slider">stratocumulus box end
          <input type="range" min={boxes()[0][1]} max="40" value={boxes()[0][2]} onInput={(e) => setEnd(+e.currentTarget.value)} />
          <output>{boxes()[0][2]}</output>
        </label>
      </div>
      <div class="v1-card">{/* v1's white card, from the page's CSS */}
        <Chart orientation={p.o()} scale={[0, max()]} height={480} animate={p.js()}>
          <Scale ticks={every(5, { ends: true })} marks="tick">{V1Scale}</Scale>
          <Plot name={CLOUDS} photo={PHOTOS} color={GREYS} box={boxes()} dim={dim()}
            order={ranked() ? sortBy((d) => d.box[2], "desc") : undefined}>{BoxSlat}</Plot>
        </Chart>
      </div>
    </>
  );
}
/*</show>*/

/*<show dots>*/
// v1's logo: 9 rows of 30 dots; # is lit. The scale shows dots 10 to 20 of each row.
const LOGO = [
  "..............................",
  "..............#...............",
  "..............#...............",
  "...........##.##..##..........",
  "..........#...#.#.#.#.........",
  "..........#...#.#.##..........",
  "..................#...........",
  "..................#...........",
  "..............................",
];

const DotRow = slat({
  thickness: 60, // 52px dots, 8px apart: the page makes the value axis 11 × 60px long
  room: { horizontal: { start: 2, end: 2, before: 2, after: 4 }, vertical: { start: 4, end: 2, before: 2, after: 2 } },
  css: `
    .row:horizontal { overflow-x: clip; } /* dots past the ends of the scale are hidden */
    .row:vertical { overflow-y: clip; }
    .dot { box-shadow: rgba(0, 0, 0, 0.16) 0px 3px 6px, rgba(0, 0, 0, 0.23) 0px 3px 6px; }
    .dot:hover { box-shadow: rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px; filter: brightness(1.2); }`,
}, (d) => (
  <div class="row">
    <Plot overlap lit={[...d.art]} x={(c) => d.shift + c.index + 0.5}>
      {(c) => <Dot at={c.x} size="52px" color={c.lit === "#" ? "#f2cc8f" : "#3d405b"} class="dot" />}
    </Plot>
  </div>
));

export function Dots(p) {
  const still = LOGO.map(() => 0);
  const [shift, setShift] = createSignal(still);
  // Every 5 s the middle rows jump up to 4 dots left or 5 right, and the next time they come back.
  // A row reaches 10 dots past the start of the scale and 9 past its end, so no shift leaves a gap.
  const step = () => setShift((s) => (s.some((v) => v) ? still : LOGO.map((_, r) => (r === 0 || r === 8 ? 0 : Math.floor(rand(0, 10)) - 4))));
  let timer = setInterval(step, 5000);
  onCleanup(() => clearInterval(timer));
  const hold = () => (clearInterval(timer), setShift(still));
  const resume = () => (clearInterval(timer), (timer = setInterval(step, 5000)));
  // The window is 11 dots of 60px (with its gutters, 664px across, 544px when vertical); on a narrow page it zooms to fit.
  const [room, setRoom] = createSignal(Infinity);
  let fit;
  onMount(() => { const ro = new ResizeObserver(([e]) => setRoom(e.contentRect.width)); ro.observe(fit); onCleanup(() => ro.disconnect()); });
  const zoom = () => Math.min(1, room() / (p.o() === "vertical" ? 544 : 664));
  return (
    <div class="dots-fit" ref={fit}>
      <div class="dots-window" style={{ zoom: zoom() }} onMouseEnter={hold} onMouseLeave={resume}>
        <Chart orientation={p.o()} scale={[10, 21]} ticks={false} height={660} animate={p.js()} class="dots">
          <Plot art={LOGO} shift={shift()}>{DotRow}</Plot>
        </Chart>
      </div>
    </div>
  );
}
/*</show>*/

/*<show grouped>*/
const TEAMS = ["North", "East", "South", "West"];
const METALS = ["gold", "silver", "bronze"];
const MEDAL_TABLE = { font: "system-ui, sans-serif", ink: "#111214", muted: "#6d6a63", grid: "#e4ddd0", surface: "#f7f3ec" };

// One count: a thin ribbon from 0, and the medal at its end with the count struck on it. Hover a count and its medal
// lifts off the table. The medal's face is an element inside the Dot: rhp moves the Dot, and the face can grow,
// rise and cast its shadow on its own time, in either animation version.
const MedalSlat = slat({
  css: `
    .ribbon { --rhp-radius: 2px; }
    .ribbon { background: linear-gradient(var(--rhp-toward-end), transparent, var(--metal)); }
    .medal { background: none; }
    .face { position: absolute; inset: 0; display: grid; place-items: center; border-radius: 50%;
      font: 800 11px/1 var(--rhp-font); font-variant-numeric: tabular-nums; color: var(--stamp);
      background: radial-gradient(circle at 30% 26%, var(--shine), var(--metal) 46%, var(--edge));
      box-shadow: 0 1px 2px rgb(0 0 0 / .28), inset 0 0 0 2px rgb(255 255 255 / .28);
      transition: scale .3s cubic-bezier(.3, 1.6, .5, 1), translate .3s cubic-bezier(.3, 1.6, .5, 1), box-shadow .3s; }
    .count:hover { z-index: 1; }
    .count:hover .face { scale: 1.45; translate: 0 -4px; box-shadow: 0 10px 14px -5px rgb(0 0 0 / .45), inset 0 0 0 2px rgb(255 255 255 / .45); }
    .count:hover .ribbon { filter: saturate(1.5); }
    .gold { --metal: #e0b43f; --shine: #fff4c4; --edge: #a87a14; --stamp: #3f2c02; }
    .silver { --metal: #bfc5cb; --shine: #ffffff; --edge: #858d95; --stamp: #22272c; }
    .bronze { --metal: #cf8a55; --shine: #ffe2c9; --edge: #8a4b23; --stamp: #2e1405; }`,
}, (m) => (
  <div class={"count " + m.metal}>
    <Bar to={m.value} thick="3px" class="ribbon" />
    <Dot at={m.value} size="24px" class="medal"><span class="face">{Math.round(m.value)}</span></Dot>
  </div>
));

const TeamSlat = slat({
  thickness: { horizontal: 84 },
  room: { horizontal: { start: 96, end: 22 }, vertical: { start: 46, end: 18 } },
  css: `
    .team { font: 700 22px/1 "Barlow Condensed", "Arial Narrow", sans-serif; letter-spacing: .03em; text-transform: uppercase; }
    .team small { display: block; margin-top: 3px; font: 500 11px/1 var(--rhp-font); letter-spacing: .06em; text-transform: none; color: var(--rhp-muted); }
    .team:horizontal { --rhp-label-gap: 14px; }
    .team:vertical { font-size: 18px; }`,
}, (d) => (
  <div>
    <Label edge="start" class="team">{d.name}<small>{sum(d.medals.map(Math.round))} medals</small></Label>
    <Plot thick={0.86} metal={METALS} value={d.medals}>{MedalSlat}</Plot>
  </div>
));

export function Grouped(p) {
  const medals = createMemo(() => (p.seed(), TEAMS.map(() => METALS.map(() => Math.round(rand(3, 24))))));
  return (
    <Poster look="medals" kicker="Regional Games · final table" title="Gold rush"
      dek={<span class="keys"><span><i class="gold" />Gold</span><span><i class="silver" />Silver</span><span><i class="bronze" />Bronze</span></span>}>
      <Chart orientation={p.o()} scale={[0, nice(0, Math.max(...medals().flat()), 4).max]} height={320} animate={p.js()} theme={MEDAL_TABLE}>
        {/* ranked like a medal table: golds first */}
        <Plot name={TEAMS} medals={medals()} key="name" order={sortBy((d) => d.medals[0] * 1e4 + d.medals[1] * 100 + d.medals[2], "desc")}>{TeamSlat}</Plot>
      </Chart>
    </Poster>
  );
}
/*</show>*/

/*<show stacked>*/
const DRINKS = ["Espresso", "Macchiato", "Cortado", "Flat white", "Cappuccino", "Latte"];
const RECIPES = [[30, 0, 0], [30, 0, 15], [30, 30, 0], [60, 100, 10], [60, 60, 60], [60, 150, 20]]; // ml of espresso, milk, foam
const LAYERS = ["espresso", "milk", "foam"];
const POURS = { espresso: "espresso", milk: "steamed milk", foam: "foam" };
const CAFE = { font: "system-ui, sans-serif", ink: "#2b1b12", muted: "#8a7260", grid: "#e4d8c8", surface: "#f3ebe0" };

// One layer of a drink. `end` is the last layer with anything in it, which gets the cup's rounded end.
// Hover a layer and it lifts out of the cup, with a tag over it naming the pour. The tag is an element inside the
// Bar: rhp guards its blocks from the page's CSS, not what a slat puts in them, so its class is one a page won't use.
const LayerSlat = slat({
  css: `
    .layer { --rhp-radius: 0px; }
    .espresso { background: linear-gradient(var(--rhp-toward-end), #24150c, #3f2415 65%, #8d5b33); --rhp-start-radius: 12px; }
    .milk { background: linear-gradient(var(--rhp-toward-end), #e6d4bb, #f5ecdf); --rhp-gap: 2px; }
    .foam { background: radial-gradient(circle, #fff 1.4px, transparent 2px) 0 0 / 7px 7px, #fcf8f1; --rhp-gap: 2px; }
    .end { --rhp-end-radius: 12px; }
    .empty { display: none; }
    .layer:hover { z-index: 1; box-shadow: 0 0 0 2px var(--rhp-surface), 0 12px 18px -8px rgb(43 27 18 / .7); }
    .pour { position: absolute; left: 50%; bottom: calc(100% + 10px); display: grid; justify-items: center; gap: 3px;
      padding: 7px 11px 6px; border-radius: 9px; background: #2b1b12; color: #f3ebe0; box-shadow: 0 6px 14px -6px rgb(43 27 18 / .6);
      font: 600 10.5px/1 var(--rhp-font); letter-spacing: .05em; white-space: nowrap; pointer-events: none;
      opacity: 0; translate: -50% 5px; transition: opacity .15s, translate .15s; }
    .pour b { font: italic 700 16px/1 Fraunces, Georgia, serif; letter-spacing: 0; }
    .pour::after { content: ""; position: absolute; top: 100%; left: 50%; translate: -50% 0; border: 5px solid transparent; border-top-color: #2b1b12; }
    .layer:hover > .pour { opacity: 1; translate: -50% 0; }`,
}, (l) => (
  <Bar from={l.from} to={l.to} class={"layer " + l.part + (l.index === l.end ? " end" : "") + (l.to - l.from < 0.5 ? " empty" : "")}>
    <span class="pour"><b>{Math.round(l.to - l.from)} ml</b>{POURS[l.part]}</span>
  </Bar>
));

const DrinkSlat = slat({
  inset: "10px",
  thickness: { horizontal: 58 },
  room: { horizontal: { start: 132, end: 60 }, vertical: { start: 46, end: 30 } },
  css: `
    .drink { font: italic 600 18px/1 Fraunces, Georgia, serif; }
    .drink:horizontal { --rhp-label-gap: 16px; }
    .drink:vertical { font-size: 13px; line-height: 1.1; white-space: normal; hyphens: auto; }
    .ml { font-size: 11px; font-weight: 600; letter-spacing: .08em; color: var(--rhp-muted); }
    .ml:horizontal { --rhp-label-gap: 10px; }
    .cup { background: none; box-shadow: 0 10px 18px -12px rgb(43 27 18 / .55); --rhp-radius: 12px; }
    .serving:hover { z-index: 1; } /* slats paint in data order: the drink under the pointer comes over the others */`,
}, (d) => {
  const layer = createMemo(() => stackUp(d.ml)); // { from, to } per layer
  return (
    <div class="serving">
      <Label edge="start" class="drink">{d.name}</Label>
      <Bar to={layer().to.at(-1)} class="cup" />
      <Plot overlap from={layer().from} to={layer().to} part={LAYERS} end={d.ml.findLastIndex((v) => v > 0.5)}>{LayerSlat}</Plot>
      <Label at={layer().to.at(-1)} class="ml">{Math.round(layer().to.at(-1))} ML</Label>
    </div>
  );
});

export function Stacked(p) {
  const ml = createMemo(() => (p.seed() ? RECIPES.map(([e, m, f]) => [e, Math.round(m * rand(0.75, 1.25)), Math.round(f * rand(0.75, 1.25))]) : RECIPES));
  return (
    <Poster look="coffee" kicker="The coffee bar, explained" title="Anatomy of a coffee"
      dek={<span class="keys"><span><i class="espresso" />Espresso</span><span><i class="milk" />Steamed milk</span><span><i class="foam" />Foam</span></span>}
      note="Typical pours in ml; every café pours its own.">
      <Chart orientation={p.o()} scale={[0, nice(0, Math.max(...ml().map(sum))).max]} ticks={3} height={320} animate={p.js()} theme={CAFE}>
        <Plot name={DRINKS} ml={ml()} key="name" order={sortBy((d) => sum(d.ml), "desc")}>{DrinkSlat}</Plot>
      </Chart>
    </Poster>
  );
}
/*</show>*/

/*<show segmented>*/
const PEOPLE = ["Student", "Commuter", "Gamer", "Traveller"];
const APPS = ["Video", "Social", "Games", "Music", "Maps"];
const APP_COLORS = ["#e5484d", "#5b5bd6", "#d98a00", "#c2418f", "#2f9e63"]; // an order whose neighbors stay apart for colorblind readers
const USE = [[26, 34, 8, 20, 12], [18, 22, 4, 26, 30], [20, 12, 48, 12, 8], [10, 14, 4, 14, 58]]; // % of a day's battery
const PHONE = { font: "system-ui, sans-serif", ink: "#1d1d1f", muted: "#6e6e73", grid: "#dcdce1", surface: "#f5f5f7" };

// One app's share of the charge. Its number shows only where it fits: 9% and up, 16% on a narrow battery.
// d.focus is the app under the pointer, from the poster: it stays lit in every battery and the others fade, so one
// app reads across people. Its number then shows on every segment, as a badge over one too thin to hold it.
const ChargeSlat = slat({
  css: `
    .charge { display: grid; place-items: center; overflow: hidden; --rhp-radius: 4px; color: #fff; font-size: 11px; font-weight: 700; }
    .charge:horizontal { height: 26px; clip-path: inset(0 1px); }
    .charge:vertical { width: 62px; clip-path: inset(1px 0); }
    .charge.games { color: #2a1b00; }
    .charge.small > span { display: none; }
    @container (max-width: 300px) { .charge.mid:horizontal > span { display: none; } } /* a narrow battery needs 16% for a number */
    .charge.off { opacity: .14; }
    .charge.on { overflow: visible; clip-path: none; } /* its badge may be bigger than it; the faded neighbors need no gap */
    .charge.on.small > span { display: block; position: absolute; left: 50%; top: 50%; translate: -50% -50%;
      padding: 3px 6px; border-radius: 5px; background: var(--rhp-color); box-shadow: 0 0 0 2px var(--rhp-surface); }
    @container (max-width: 300px) {
      .charge.on.mid:horizontal > span { display: block; position: absolute; left: 50%; top: 50%; translate: -50% -50%;
        padding: 3px 6px; border-radius: 5px; background: var(--rhp-color); box-shadow: 0 0 0 2px var(--rhp-surface); } }`,
}, (c) => {
  const share = () => c.to - c.from;
  const fits = () => (share() < 9 ? " small" : share() < 16 ? " mid" : "");
  const lit = () => (c.focus == null ? "" : c.focus === c.app ? " on" : " off");
  return (
    <Bar from={c.from} to={c.to} color={c.color} data-app={c.app} class={"charge " + c.app.toLowerCase() + fits() + lit()}>
      <span>{Math.round(share())}%</span>
    </Bar>
  );
});

// A battery: the shell a little larger than the track, the nub past its end, the charge inside.
const BatterySlat = slat({
  thickness: { horizontal: 52 },
  room: { horizontal: { start: 92, end: 18 }, vertical: { start: 30, end: 18 } },
  css: `
    .who { font-size: 15px; font-weight: 600; }
    .who:horizontal { --rhp-label-gap: 16px; }
    .shell { background: none; border: 2px solid rgb(29 29 31 / .32); --rhp-radius: 10px; }
    .shell:horizontal { left: -5px; width: calc(100% + 10px); height: 36px; }
    .shell:vertical { bottom: -5px; height: calc(100% + 10px); width: 72px; }
    .nub { background: rgb(29 29 31 / .32); }
    .nub:horizontal { width: 5px; height: 14px; translate: 7px -50%; border-radius: 0 3px 3px 0; }
    .nub:vertical { height: 5px; width: 22px; translate: -50% -7px; border-radius: 3px 3px 0 0; }`,
}, (d) => {
  const cell = createMemo(() => stackUp(shares(d.use))); // each app as a share of 100, stacked
  return (
    <div>
      <Label edge="start" class="who">{d.name}</Label>
      <Bar to={100} class="shell" />
      <Tick at={100} class="nub" />
      <Plot overlap from={cell().from} to={cell().to} color={APP_COLORS} app={APPS} focus={d.focus}>{ChargeSlat}</Plot>
    </div>
  );
});

export function Segmented(p) {
  const use = createMemo(() => (p.seed() ? PEOPLE.map(() => APPS.map(() => rand(4, 40))) : USE));
  // The app in focus: the one the pointer is on, in the key or in a battery, else the one clicked. The key buttons and
  // the segments carry data-app, and the poster listens for both. A click, or Enter on a key, pins an app or unpins it.
  // The pointer counts when it moves: a still pointer over a badge that comes or goes isn't a new choice.
  const [hovered, setHovered] = createSignal(null), [pinned, setPinned] = createSignal(null);
  const app = () => hovered() ?? pinned();
  const under = (e) => e.target.closest("[data-app]")?.dataset.app ?? null;
  const pin = (e) => {
    const a = under(e);
    if (!a) return;
    setPinned(pinned() === a ? null : a);
    setHovered(null); // the click is the latest word, until the pointer moves again
  };
  return (
    <Poster look="battery" kicker="A day on one charge" title="Where the battery goes"
      onPointerMove={(e) => setHovered(under(e))} onPointerLeave={() => setHovered(null)} onClick={pin}
      dek={<span class="keys">{APPS.map((a, i) => (
        <button type="button" data-app={a} aria-pressed={pinned() === a} classList={{ off: app() != null && app() !== a }}>
          <i style={{ background: APP_COLORS[i] }} />{a}
        </button>
      ))}</span>}
      note="Point at an app, in the key or in a battery, to follow it through everyone's day; click to keep it.">
      <Chart orientation={p.o()} scale={[0, 100]} ticks={false} height={300} animate={p.js()} theme={PHONE}>
        <Plot name={PEOPLE} use={use()} focus={app()}>{BatterySlat}</Plot>
      </Chart>
    </Poster>
  );
}
/*</show>*/

/*<show units>*/
const GENRES = ["Mystery", "Sci-fi", "History", "Poetry"];
const CLOTH = ["#1f3a5f", "#7a2e3b", "#2f5d50", "#b0772b"]; // one binding per genre
const PER_SPINE = 5;
const LIBRARY = { font: "system-ui, sans-serif", ink: "#2a2118", muted: "#7d6b58", grid: "#e8dcc8", surface: "#f7f1e6" };
const tall = (i) => 0.7 + ((i * 0.618034) % 1) * 0.24; // each spine's height, a fixed pseudo-random share of the shelf
const binding = (c, i) => { const t = [0, 10, -8, 5, -12, 8, -4][i % 7]; return `color-mix(in oklab, ${c}, ${t > 0 ? "white" : "black"} ${Math.abs(t)}%)`; };

// Five books: a spine standing on the shelf (horizontal) or lying on the pile (vertical). The last one is thinner.
// Hover a book and it slides half out. The Bar holds the book's place; the book is an element inside it, so it
// can move and cast its shadow on its own time.
const SpineSlat = slat({
  css: `
    .spine { background: none; }
    .spine:horizontal { top: auto; bottom: 0; translate: none; }
    .book { position: absolute; border-radius: 2px; background-color: var(--rhp-color);
      transition: translate .25s cubic-bezier(.2, .9, .3, 1.15), box-shadow .25s; }
    .spine:horizontal > .book { inset: 0 1px;
      background-image: linear-gradient(transparent 9%, rgb(255 255 255 / .4) 9% 11%, transparent 11% 89%, rgb(255 255 255 / .4) 89% 91%, transparent 91%); }
    .spine:vertical > .book { inset: 1px 0;
      background-image: linear-gradient(90deg, transparent 9%, rgb(255 255 255 / .4) 9% 11%, transparent 11% 89%, rgb(255 255 255 / .4) 89% 91%, transparent 91%); }
    .spine:hover { z-index: 1; }
    .spine:horizontal:hover > .book { translate: 0 -12px; box-shadow: 0 8px 10px -6px rgb(42 33 24 / .45); }
    .spine:vertical:hover > .book { translate: 14px 0; box-shadow: -6px 4px 10px -6px rgb(42 33 24 / .45); }`,
}, (u) => <Bar from={u.from} to={u.to} thick={tall(u.index)} color={binding(u.cloth, u.index)} class="spine"><i class="book" /></Bar>);

const ShelfSlat = slat({
  thickness: { horizontal: 66 },
  room: { horizontal: { start: 96, end: 52 }, vertical: { start: 30, end: 38 } },
  css: `
    .shelf { border-bottom: 5px solid #c79f72; }
    .genre { font: 600 17px/1 Fraunces, Georgia, serif; }
    .genre:horizontal { --rhp-label-gap: 16px; }
    .count { font: 800 18px/1 Fraunces, Georgia, serif; }
    .count small { display: block; margin-top: 1px; font: 500 11px/1 var(--rhp-font); color: var(--rhp-muted); }
    .count:horizontal { --rhp-label-gap: 10px; }`,
}, (d) => (
  <div class="shelf">
    <Label edge="start" class="genre">{d.genre}</Label>
    <Plot overlap slats={Math.ceil(d.books / PER_SPINE)} cloth={d.cloth}
      from={(u) => u.index * PER_SPINE} to={(u) => Math.min(d.books, (u.index + 1) * PER_SPINE)}>{SpineSlat}</Plot>
    <Label at={d.books} class="count">{Math.round(d.books)}<small>books</small></Label>
  </div>
));

export function Units(p) {
  const books = createMemo(() => (p.seed(), GENRES.map(() => Math.round(rand(6, 48)))));
  return (
    <Poster look="books" kicker="Book club · the year's reading" title="A year in books" dek="Each spine is five books; a thin one is what's left over.">
      <Chart orientation={p.o()} scale={[0, 50]} ticks={false} height={300} animate={p.js()} theme={LIBRARY}>
        <Plot genre={GENRES} cloth={CLOTH} books={books()}>{ShelfSlat}</Plot>
      </Chart>
    </Poster>
  );
}
/*</show>*/

/*<show pyramid>*/
const AGES = ["0–9", "10–19", "20–29", "30–39", "40–49", "50–59", "60–69", "70–79", "80+"];
const MEN = [3.6, 4.2, 4.9, 5.5, 6.7, 7.3, 6.8, 5.7, 4.1]; // % of the population in each band
const SPINE = 1.7; // scale units kept clear each side of 0, for the age labels
const CENSUS = { font: "system-ui, sans-serif", ink: "#1f2933", muted: "#687482", grid: "#e2ddd3", surface: "#f4f1ea" };

// Men to the left of a spine of ages, women to the right: both Bars start SPINE away from 0 and run outward.
const AgeSlat = slat({
  thickness: { horizontal: 30 },
  inset: 0.13,
  room: { horizontal: { start: 38, end: 38 }, vertical: { start: 26, end: 26 } },
  css: `
    .side { --rhp-start-radius: 3px; --rhp-end-radius: 99px; }
    .age { padding: 0; font-size: 11px; font-weight: 800; letter-spacing: .02em; }
    .age:horizontal { translate: -50% -50%; }
    .age:vertical { translate: -50% 50%; }
    .pct { font-size: 11px; color: var(--rhp-muted); font-variant-numeric: tabular-nums; }`,
}, (d) => (
  <div>
    <Bar from={-SPINE} to={-(d.men + SPINE)} color="#1d6fa5" class="side" />
    <Bar from={SPINE} to={d.women + SPINE} color="#d9694c" class="side" />
    <Label at={0} class="age">{d.age}</Label>
    <Label at={-(d.men + SPINE)} side="before" class="pct">{d.men.toFixed(1)}</Label>
    <Label at={d.women + SPINE} class="pct">{d.women.toFixed(1)}</Label>
  </div>
));

export function Pyramid(p) {
  const men = createMemo(() => (p.seed() ? MEN.map((v) => v * rand(0.88, 1.12)) : MEN));
  const women = createMemo(() => men().map((v, i) => v * (0.97 + i * 0.045)));
  const widest = createMemo(() => Math.max(9, Math.ceil(Math.max(...men(), ...women())))); // the scale fits the widest band
  const oldestFirst = AGES.map((_, i) => AGES.length - 1 - i); // position of each row: order is data
  return (
    <Poster look="census" kicker="Census · share of the population" title="An ageing country"
      dek={<span class="keys"><span><i style={{ background: "#1d6fa5" }} />Men</span><span><i style={{ background: "#d9694c" }} />Women</span><span>% in each age band</span></span>}
      note="Illustrative figures.">
      <Chart orientation={p.o()} scale={[-(widest() + SPINE), widest() + SPINE]} ticks={false} height={320} animate={p.js()} theme={CENSUS}>
        <Plot age={AGES} men={men()} women={women()} order={p.o() === "horizontal" ? oldestFirst : undefined}>{AgeSlat}</Plot>
      </Chart>
    </Poster>
  );
}
/*</show>*/

/*<show diverging>*/
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const NIGHT = { font: "system-ui, sans-serif", ink: "#e8ecf2", muted: "#8b93a1", grid: "#262d39", surface: "#0d1117" };
const degrees = (v) => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(1) + "°";
// °C from normal on a diverging ramp: blue below, a neutral gray at 0, red above.
const HEAT = [[-2.5, [44, 123, 182]], [-1.2, [120, 177, 214]], [0, [140, 147, 160]], [1.2, [245, 128, 88]], [2.5, [200, 40, 50]]];
const heat = (t) => {
  const k = Math.max(1, HEAT.findIndex(([x]) => x >= t)), [x0, c0] = HEAT[Math.min(k, HEAT.length - 1) - 1], [x1, c1] = HEAT[Math.min(k, HEAT.length - 1)];
  const f = Math.min(1, Math.max(0, (t - x0) / (x1 - x0)));
  return `rgb(${c0.map((c, i) => Math.round(c + (c1[i] - c) * f)).join(" ")})`;
};

// The month's band is tinted with its own color, like a warming stripe.
const MonthSlat = slat({
  inset: 0.22,
  room: { horizontal: { start: 40, end: 44 }, vertical: { start: 26, end: 12, after: 14 } },
  css: `
    .month { background: color-mix(in srgb, var(--heat) 16%, transparent); }
    .mon { font-size: 12px; font-weight: 700; color: var(--rhp-muted); text-transform: uppercase; letter-spacing: .06em; }
    .rise { --rhp-radius: 3px; }
    .deg { font-size: 11px; font-weight: 700; font-variant-numeric: tabular-nums; }`,
}, (d) => (
  <div class="month" style={{ "--heat": heat(d.anomaly) }}>
    <Label edge="start" class="mon">{d.month}</Label>
    <Bar to={d.anomaly} color={heat(d.anomaly)} class="rise" />
    <Label at={d.anomaly} side={d.anomaly < 0 ? "before" : undefined} class="deg">{degrees(d.anomaly)}</Label>
  </div>
));

// The scale: hairlines each degree, and the 0 line, the normal, drawn brighter.
const NormalSlat = slat({
  room: { horizontal: { after: 28 }, vertical: { before: 56 } },
  css: `
    .line { background: var(--rhp-grid); --rhp-tick-width: 1px; }
    .zero .line { background: var(--rhp-muted); }
    .num { font-size: 10.5px; color: var(--rhp-muted); padding: 0; }
    .num:horizontal { top: calc(100% + 8px); translate: -50% 0; }
    .num:vertical { left: auto; right: calc(100% + 8px); translate: 0 50%; }
    .zero .num { color: var(--rhp-ink); font-weight: 700; }`,
}, (t) => (
  <div class={t.at === 0 ? "zero" : ""}>
    <Tick at={t.at} thick={1} class="line" />
    <Label at={t.at} class="num">{t.at === 0 ? "normal" : degrees(t.at)}</Label>
  </div>
));

export function Diverging(p) {
  const anomaly = createMemo(() => (p.seed(), MONTHS.map(() => Math.round(rand(-1.4, 2.4) * 10) / 10)));
  return (
    <Poster look="climate" kicker="A year of monthly temperatures" title="Hotter than normal" dek="Each month against its 1991–2020 average, in °C." note="Illustrative figures.">
      <Chart orientation={p.o()} scale={[-3, 3]} height={300} animate={p.js()} theme={NIGHT}>
        <Scale ticks={[-2, -1, 0, 1, 2]}>{NormalSlat}</Scale>
        <Plot month={MONTHS} anomaly={anomaly()}>{MonthSlat}</Plot>
      </Chart>
    </Poster>
  );
}
/*</show>*/

/*<show histogram>*/
const COAST = { font: "system-ui, sans-serif", ink: "#1f2a37", muted: "#6b7686", grid: "#e1e7ee", surface: "#f7f9fb" };
// A bin's own temperature as its color: cool blue through sand to hot red (a heat scale, shown in the key).
const WARMTH = [[4, [59, 130, 196]], [14, [120, 181, 196]], [20, [233, 196, 106]], [27, [238, 129, 72]], [34, [196, 52, 44]]];
const warmth = (t) => {
  const k = Math.min(WARMTH.length - 1, Math.max(1, WARMTH.findIndex(([x]) => x >= t))), [x0, c0] = WARMTH[k - 1], [x1, c1] = WARMTH[k];
  const f = Math.min(1, Math.max(0, (t - x0) / (x1 - x0)));
  return `rgb(${c0.map((c, i) => Math.round(c + (c1[i] - c) * f)).join(" ")})`;
};
// A mild coastal city: 365 daily highs around a seasonal swing.
const year = () => Array.from({ length: 365 }, (_, day) => 17.5 + 7 * Math.sin((2 * Math.PI * (day - 110)) / 365) + normal(0, 2.2));

const BinSlat = slat({
  thickness: { horizontal: 20 },
  inset: "1.5px",
  room: { horizontal: { start: 40, end: 40 }, vertical: { start: 26, end: 22 } },
  css: `
    .bin { --rhp-radius: 3px; }
    .deg { font-size: 11px; font-weight: 700; color: var(--rhp-muted); }
    .days { font-size: 11px; font-weight: 800; }
    .days > span { opacity: 0; transition: opacity .15s; }
    .days:horizontal { --rhp-label-gap: 6px; }
    .slat:hover .days > span { opacity: 1; }
    .slat:hover .bin { filter: brightness(1.08) saturate(1.1); }`,
}, (d) => (
  <div class="slat">
    <Bar to={d.tally} color={warmth((d.x0 + d.x1) / 2)} class="bin" />
    <Show when={d.x0 % 4 === 0}><Label edge="start" class="deg">{d.x0}°</Label></Show>
    <Label at={d.tally} class="days"><span>{d.tally}</span></Label>
  </div>
));

export function Histogram(p) {
  const b = createMemo(() => (p.seed(), bins(year(), { domain: [4, 34], count: 15 }))); // 2 °C bins: { x0, x1, tally }
  const hottestFirst = b().x0.map((_, i) => b().x0.length - 1 - i);
  return (
    <Poster look="weather" kicker="A year of daily highs · °C" title="365 afternoons"
      dek={<>How many days reached each temperature. <span class="heat-key">cool<i />hot</span></>} note="Illustrative data; hover a bar for its count of days.">
      <Chart orientation={p.o()} scale={[0, nice(0, Math.max(...b().tally)).max]} format={(v) => v + " d"} height={300} animate={p.js()} theme={COAST}>
        <Plot x0={b().x0} x1={b().x1} tally={b().tally} order={p.o() === "horizontal" ? hottestFirst : undefined}>{BinSlat}</Plot>
      </Chart>
    </Poster>
  );
}
/*</show>*/

/*<show stem>*/
const MIDNIGHT = { font: "system-ui, sans-serif", ink: "#f4f1ff", muted: "#8f89a8", grid: "#2a2638", surface: "#0e0c14" };

// One sample: a stem from rest, glowing at its tip, fading as the ring dies away (--fade).
// A new strike reaches the samples one after another (--k, 8 ms apart), so it runs down the wave like the sound does.
// A delay adds to the transition rhp gives a block without replacing it. (The JS version moves every sample at once.)
const SampleSlat = slat({
  thickness: { horizontal: 12 },
  room: { start: 12, end: 12 },
  css: `
    .swing, .tip { transition-delay: calc(var(--k) * 8ms); }
    .swing { --rhp-radius: 99px; opacity: var(--fade); }
    .swing { background: linear-gradient(var(--rhp-toward-end), #6d28d9, #ec4899); }
    .tip { background: #fff; opacity: var(--fade); box-shadow: 0 0 10px 2px rgb(236 72 153 / .7); }`,
}, (d) => (
  <div style={{ "--fade": 1 - d.index / 46, "--k": d.index }}>
    <Bar to={d.y} thick="4px" class="swing" />
    <Dot at={d.y} size="7px" class="tip" />
  </div>
));

// The resting line, the only scale a waveform needs.
const RestSlat = slat({ css: `.rest { background: var(--rhp-grid); --rhp-tick-width: 1px; }` }, () => <div><Tick at={0} thick={1} class="rest" /></div>);

export function Stem(p) {
  const [strikes, setStrikes] = createSignal(0); // each strike rings with a new pitch and decay
  const y = createMemo(() => {
    p.seed(), strikes();
    const w = rand(0.45, 0.8), decay = rand(9, 18);
    return Array.from({ length: 36 }, (_, k) => Math.cos(k * w) * Math.exp(-k / decay));
  });
  const strike = () => setStrikes(strikes() + 1);
  return (
    <Poster look="sound" kicker="One strike · 36 samples" title="The sound of a bell" dek="Each swing is smaller than the last, until the note dies away. Click the wave to strike the bell again.">
      <div class="strike" role="button" tabindex="0" aria-label="Strike the bell again" onClick={strike}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), strike())}>
        <Chart orientation={p.o()} scale={[-1.05, 1.05]} height={280} animate={p.js()} theme={MIDNIGHT}>
          <Scale ticks={[0]}>{RestSlat}</Scale>
          <Plot y={y()}>{SampleSlat}</Plot>
        </Chart>
      </div>
    </Poster>
  );
}
/*</show>*/

/*<show violin>*/
const STRINGS = ["Violin", "Viola", "Cello", "Double bass"];
const TESSITURA = [[55, 100, 76, 6.5], [48, 88, 66, 6], [36, 81, 54, 6.5], [28, 67, 42, 5.5]]; // lowest, highest (MIDI note), centre, spread
const VARNISH = ["#d08a3c", "#b0652a", "#8a4719", "#6a3312"]; // darker wood for the bigger instruments
const HALL = { font: "system-ui, sans-serif", ink: "#f3e9d2", muted: "#a89a80", grid: "#26221c", surface: "#121110" };
const black = (m) => [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);
const noteName = (m) => ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"][((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);

// The pitch scale is a keyboard: a Scale with a key per semitone, each drawn from d.at to d.next, and every C named.
// d.low, d.high and d.tint come from the instrument under the pointer: the keys it reaches light up in its varnish,
// and the names mark its lowest and highest notes instead.
const KeySlat = slat({
  room: { horizontal: { after: 50 }, vertical: { before: 60 } },
  css: `
    .key { border-radius: 0 0 3px 3px; background: #efe6d2; } /* a key's four corners: border-radius (--rhp-radius takes one length) */
    .black .key { background: #1b1916; box-shadow: inset 0 0 0 1px #3a342b; }
    .key:horizontal { top: calc(100% + 6px); height: 24px; translate: none; clip-path: inset(0 .5px); }
    .key:vertical { left: auto; right: calc(100% + 6px); width: 24px; translate: none; clip-path: inset(.5px 0); border-radius: 3px 0 0 3px; }
    .c { font-size: 10px; font-weight: 700; color: var(--rhp-muted); padding: 0; }
    .c:horizontal { top: calc(100% + 34px); translate: -2px 0; }
    .c:vertical { left: auto; right: calc(100% + 34px); translate: 0 50%; }
    .lit.white .key { background: color-mix(in oklab, var(--tint), white 45%); }
    .lit.black .key { background: var(--tint); box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--tint), black 35%); }
    .lit .c { color: color-mix(in oklab, var(--tint), white 55%); }`,
}, (k) => {
  const lit = () => k.low != null && k.at >= k.low && k.at <= k.high;
  const named = () => (k.low == null ? k.at % 12 === 0 : k.at === k.low || k.at === k.high);
  return (
    <div class={(black(k.at) ? "black" : "white") + (lit() ? " lit" : "")} style={{ "--tint": k.tint }}>
      <Bar from={k.at} to={k.next} class="key" />
      <Show when={named()}><Label at={k.at} class="c">{noteName(k.at)}</Label></Show>
    </div>
  );
});

const InstrumentSlat = slat({
  thickness: { horizontal: 74 },
  inset: 0.05,
  room: { horizontal: { start: 140, end: 16 }, vertical: { start: 30, end: 12 } },
  css: `
    .name { font: italic 600 17px/1 Fraunces, Georgia, serif; }
    .name:horizontal { --rhp-label-gap: 16px; }
    .name:vertical { font-size: 14px; }
    .body { fill: var(--rhp-color); stroke: rgb(0 0 0 / .5); stroke-width: 1px; }
    .string { background: var(--rhp-ink); opacity: .85; }
    .median { background: var(--rhp-ink); box-shadow: 0 0 0 2px var(--rhp-color); }
    .on .body { filter: brightness(1.2) drop-shadow(0 0 10px color-mix(in srgb, var(--rhp-color) 60%, transparent)); }
    .off { opacity: .3; }`,
}, (d) => {
  const shape = createMemo(() => density(d.notes, { points: 48 })); // [[note, density], ...]
  const box = createMemo(() => summary(d.notes));
  return (
    <div data-instrument={d.index} class={d.pick == null ? "" : d.pick === d.index ? "on" : "off"}>
      <Label edge="start" class="name">{d.name}</Label>
      <Area points={shape()} mirror peak={d.peak} color={d.varnish} class="body" />
      <Bar from={box().q1} to={box().q3} thick="3px" class="string" />
      <Dot at={box().median} size="8px" class="median" />
    </div>
  );
});

export function Violin(p) {
  const notes = createMemo(() => (p.seed(), TESSITURA.map(([lo, hi, mid, sd]) => normalsIn(80, lo, hi, mid, sd))));
  // One peak for every instrument, so their widths compare: a value shared by all slats, not a list.
  const peak = createMemo(() => Math.max(...notes().flatMap((s) => density(s, { points: 48 }).map((q) => q[1]))));
  // The instrument under the pointer (when it moves), and the keys it reaches (a note is on the key it falls in).
  const [pick, setPick] = createSignal(null);
  const point = (e) => { const i = e.target.closest("[data-instrument]")?.dataset.instrument; setPick(i == null ? null : +i); };
  const reach = createMemo(() => (pick() == null ? {} : {
    low: Math.floor(Math.min(...notes()[pick()])), high: Math.floor(Math.max(...notes()[pick()])), tint: VARNISH[pick()],
  }));
  return (
    <Poster look="strings" kicker="Where the strings play" title="The string section" dek="Every note each instrument plays in one movement, by pitch, over a piano keyboard."
      note="Illustrative data. Point at an instrument to find its range on the keyboard."
      onPointerMove={point} onPointerDown={point} onPointerLeave={(e) => e.pointerType !== "touch" && setPick(null)}>
      <Chart orientation={p.o()} scale={[26, 102]} height={360} animate={p.js()} theme={HALL}>
        <Scale ticks={every(1)} low={reach().low} high={reach().high} tint={reach().tint}>{KeySlat}</Scale>
        <Plot name={STRINGS} notes={notes()} peak={peak()} varnish={VARNISH} pick={pick()}>{InstrumentSlat}</Plot>
      </Chart>
    </Poster>
  );
}
/*</show>*/

/*<show heatmap>*/
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const HourCell = (day) => (h) => {
  const o = useOrientation(); // the cells' own orientation: across the day's
  return (
    <div>
      <Cell value={h.v} title={`${day.day} ${h.index}:00, ${Math.round(h.v)}`} />
      <Show when={day.index === 0 && h.index % 3 === 0}>
        <Label edge={o() === "vertical" ? "end" : "start"} class="hour">{h.index}</Label>
      </Show>
    </div>
  );
};

const DayRow = slat({
  thickness: { horizontal: 26 },
  // day names at the start; hour numbers over the first row (horizontal) or left of the first column (vertical)
  room: { horizontal: { start: 40, before: 18 }, vertical: { start: 24, before: 30 } },
  css: `.hour { --rhp-label-size: 10px; color: var(--rhp-muted); }
    .hour:horizontal { width: auto; }`,
}, (d) => (
  <div class="slat">
    <Label edge="start">{d.day}</Label>
    <Plot orientation="across" v={d.hours}>{HourCell(d)}</Plot>
  </div>
));

export function Heatmap(p) {
  const hours = createMemo(() => (p.seed(), DAYS.map((_, day) => Array.from({ length: 24 }, (_, h) =>
    Math.max(0, 70 * Math.exp(-((h - 13 - (day > 4 ? 2 : 0)) ** 2) / 18) + rand(0, 30) - (day > 4 ? 15 : 0))))));
  return (
    <Chart orientation={p.o()} scale={[0, 100]} ticks={false} height={320} animate={p.js()}>
      <Plot day={DAYS} hours={hours()}>{DayRow}</Plot>
    </Chart>
  );
}
/*</show>*/

/*<show strip>*/
const ARMS = ["Placebo", "Dose A", "Dose B"];
const TRIAL = [[12, 3.2], [9, 2.6], [6.8, 2.2]]; // days to recover: mean and spread
const CAPSULE = ["#7b8794", "#0e9f8a", "#6d4bd8"]; // the placebo gray, so the doses stand out
const CLINIC = { font: "system-ui, sans-serif", ink: "#0f3d3a", muted: "#5f7f7b", grid: "#d4e9e4", surface: "#f3faf8" };
const across = (i) => 0.16 + ((i * 0.618034) % 1) * 0.68; // a fixed place across the band per patient
const tilt = (i) => Math.round((((i * 0.381966) % 1) - 0.5) * 140); // and a fixed tilt, in degrees

// One patient: a two-tone capsule at their number of days.
const PatientSlat = slat({
  css: `.pill { width: 17px; height: 7px; border-radius: 99px;
    background: linear-gradient(90deg, var(--rhp-color) 50%, #fff 50%);
    box-shadow: 0 1px 2px rgb(15 61 58 / .25), inset 0 0 0 1px rgb(15 61 58 / .14); }`,
}, (s) => <Dot at={s.at} across={across(s.index)} color={s.color} class="pill" style={{ rotate: tilt(s.index) + "deg" }} />);

const ArmSlat = slat({
  thickness: { horizontal: 80 },
  room: { horizontal: { start: 84, end: 76 }, vertical: { start: 30, end: 30 } },
  css: `
    .arm { font-size: 15px; font-weight: 700; }
    .arm:horizontal { --rhp-label-gap: 14px; }
    .mean { background: var(--rhp-ink); --rhp-tick-width: 3px; border-radius: 2px; }
    .avg { font-size: 12px; font-weight: 700; color: var(--rhp-ink); }
    .avg small { display: block; font-size: 10.5px; font-weight: 500; color: var(--rhp-muted); }
    .avg:horizontal { --rhp-label-gap: 12px; }`,
}, (d) => {
  const mean = createMemo(() => sum(d.days) / d.days.length);
  return (
    <div>
      <Label edge="start" class="arm">{d.arm}</Label>
      <Plot overlap at={d.days} color={d.color}>{PatientSlat}</Plot>
      <Tick at={mean()} thick={0.9} class="mean" />
      <Label edge="end" class="avg">{mean().toFixed(1)} days<small>average</small></Label>
    </div>
  );
});

export function Strip(p) {
  const days = createMemo(() => (p.seed(), TRIAL.map(([m, s]) => normalsIn(30, 1, 23, m, s))));
  return (
    <Poster look="clinic" kicker="Trial results · days to recover" title="Back on your feet sooner" dek="Each capsule is one patient; the dark line is the group's average." note="Illustrative data.">
      <Chart orientation={p.o()} scale={[0, 24]} ticks={[0, 8, 16, 24]} format={(v) => v + " d"} height={320} animate={p.js()} theme={CLINIC}>
        <Plot arm={ARMS} days={days()} color={CAPSULE}>{ArmSlat}</Plot>
      </Chart>
    </Poster>
  );
}
/*</show>*/

/*<show range>*/
const PEAKS = ["Everest", "K2", "Aconcagua", "Denali", "Kilimanjaro", "Elbrus", "Mont Blanc"];
const WHERE = ["Nepal · China", "Pakistan · China", "Argentina", "Alaska", "Tanzania", "Russia", "France · Italy"];
const CAMP = [5364, 5150, 4300, 2200, 1800, 2350, 1035]; // the usual base camp, m
const SUMMIT = [8849, 8611, 6961, 6190, 5895, 5642, 4806];
const ALPINE = { font: "system-ui, sans-serif", ink: "#13293d", muted: "#5d7285", grid: "#cad8e4", surface: "#e6eef5" };
const metres = (v) => Math.round(v).toLocaleString("en-GB") + " m";

// A climb: the route from the tent at base camp to the snow-capped peak.
const ClimbSlat = slat({
  thickness: { horizontal: 50 },
  room: { horizontal: { start: 124, end: 70 }, vertical: { start: 38, end: 34, after: 18 } },
  css: `
    .peak-name { font-size: 15px; font-weight: 800; letter-spacing: -0.01em; }
    .peak-name small { display: block; margin-top: 2px; font-size: 11px; font-weight: 500; color: var(--rhp-muted); }
    .peak-name:horizontal { --rhp-label-gap: 14px; }
    .peak-name:vertical { font-size: 10px; white-space: normal; line-height: 1.1; hyphens: auto; }
    .peak-name:vertical small { display: none; }
    .route { --rhp-radius: 99px; }
    .route { background: linear-gradient(var(--rhp-toward-end), #d9772b, #13293d); }
    .tent { width: 16px; height: 13px; border-radius: 0; background: #d9772b; clip-path: polygon(50% 0, 100% 100%, 0 100%); }
    .summit { width: 24px; height: 20px; border-radius: 0; clip-path: polygon(50% 0, 100% 100%, 0 100%);
      background: linear-gradient(#fff 34%, #13293d 34%); }
    .summit:horizontal { translate: -50% -60%; }
    .summit:vertical { translate: -50% 30%; }
    .height { font-size: 13px; font-weight: 800; font-variant-numeric: tabular-nums; }
    .height:horizontal { --rhp-label-gap: 16px; }
    .height:vertical { padding-bottom: 14px; font-size: 11px; }`,
}, (d) => (
  <div>
    <Label edge="start" class="peak-name">{d.peak}<small>{d.where}</small></Label>
    <Bar from={d.camp} to={d.summit} thick="3px" class="route" />
    <Dot at={d.camp} class="tent" />
    <Dot at={d.summit} class="summit" />
    <Label at={d.summit} class="height">{metres(d.summit)}</Label>
  </div>
));

export function Range(p) {
  const [by, setBy] = createSignal("summit");
  return (
    <>
      <div class="buttons"><button class="mini" onClick={() => setBy(by() === "summit" ? "climb" : "summit")}>{by() === "summit" ? "Sort by the climb" : "Sort by the summit"}</button></div>
      <Poster look="alpine" kicker="Seven great climbs" title="Base camp to summit" dek="From the tent at the usual base camp to the top, in metres."
        note="Base camps vary by route; summit heights from recent surveys.">
        <Chart orientation={p.o()} scale={[0, 9000]} ticks={[0, 4000, 8000]} format={(v) => v / 1000 + " km"} height={340} animate={p.js()} theme={ALPINE}>
          <Plot peak={PEAKS} where={WHERE} camp={CAMP} summit={SUMMIT} key="peak"
            order={sortBy((d) => (by() === "summit" ? d.summit : d.summit - d.camp), "desc")}>{ClimbSlat}</Plot>
        </Chart>
      </Poster>
    </>
  );
}
/*</show>*/

/*<show bullet>*/
const HABITS = ["Move", "Sleep", "Steps", "Water", "Mindful"];
const GOALS = ["600 kcal", "8 hours", "10,000", "2 litres", "10 minutes"];
const NEON = ["#f43f5e", "#8b5cf6", "#d97706", "#0b9cc9", "#65a30d"]; // in this order, neighbouring rows stay apart for colorblind eyes
const GLYPH = { // 24 × 24 icons
  Move: "M13 2 4 14h7l-1 8 9-12h-7z",
  Sleep: "M20 14.5A8.5 8.5 0 1 1 9.5 4 7 7 0 0 0 20 14.5z",
  Steps: "M8 3c1.8 0 3 2.2 3 5s-1.2 5-3 5-3-2.2-3-5 1.2-5 3-5zm8 7c1.8 0 3 2.2 3 5s-1.2 5-3 5-3-2.2-3-5 1.2-5 3-5z",
  Water: "M12 2.5s-6.5 7.5-6.5 12a6.5 6.5 0 0 0 13 0c0-4.5-6.5-12-6.5-12z",
  Mindful: "M5 19C5 10 11 4 20 4c0 9-6 15-15 15z",
};
// What a share of each goal comes to, in the goal's own unit.
const AMOUNT = {
  Move: (f) => Math.round(600 * f) + " kcal",
  Sleep: (f) => { const m = Math.round(480 * f); return `${Math.floor(m / 60)}h ${m % 60}m`; },
  Steps: (f) => Math.round(10000 * f).toLocaleString("en-GB") + " steps",
  Water: (f) => (2 * f).toFixed(1) + " litres",
  Mindful: (f) => Math.round(10 * f) + " min",
};
const WATCH = { font: "system-ui, sans-serif", ink: "#f5f5f7", muted: "#8e8e93", grid: "#1f1f24", surface: "#0a0a0c" };

// A goal: the track to 120%, the day's progress glowing along it, and a white line at the goal (100%).
// Hover a goal and its progress burns brighter, with a bubble at its tip saying what it comes to.
const GoalSlat = slat({
  thickness: { horizontal: 62 },
  room: { horizontal: { start: 134, end: 58 }, vertical: { start: 70, end: 30 } },
  css: `
    .habit { display: flex; align-items: center; gap: 10px; overflow: visible; font-size: 15px; font-weight: 700; }
    .habit:horizontal { justify-content: flex-end; padding-right: 18px; }
    .habit:vertical { flex-direction: column; gap: 4px; padding-top: 10px; font-size: 12px; text-align: center; }
    .habit small { display: block; font-size: 11px; font-weight: 500; color: var(--rhp-muted); }
    .icon { flex: none; width: 30px; height: 30px; padding: 6px; border-radius: 50%; fill: var(--rhp-color);
      background: color-mix(in srgb, var(--rhp-color) 18%, transparent); }
    .track { background: #1c1c22; --rhp-radius: 99px; }
    .done { --rhp-radius: 99px; box-shadow: 0 0 14px color-mix(in srgb, var(--rhp-color) 55%, transparent); }
    .done { background: linear-gradient(var(--rhp-toward-end), color-mix(in srgb, var(--rhp-color) 25%, transparent), var(--rhp-color)); }
    .goal { background: #fff; --rhp-tick-width: 2px; border-radius: 2px; }
    .pct { font-size: 14px; font-weight: 800; font-variant-numeric: tabular-nums; }
    .pct:horizontal { --rhp-label-gap: 14px; }
    .row:hover .done { box-shadow: 0 0 24px 2px color-mix(in srgb, var(--rhp-color) 80%, transparent); filter: brightness(1.2); }
    .row:hover .icon { background: color-mix(in srgb, var(--rhp-color) 34%, transparent); }
    .tip { width: 0; height: 0; padding: 0; translate: none; } /* a point at the tip of the progress; the bubble hangs from it */
    .tip > span { position: absolute; left: 0; bottom: 14px; padding: 5px 9px; border-radius: 99px; background: var(--rhp-color); color: #0a0a0c;
      font-size: 11.5px; font-weight: 800; box-shadow: 0 0 16px color-mix(in srgb, var(--rhp-color) 60%, transparent);
      opacity: 0; translate: -50% 4px; transition: opacity .15s, translate .15s; }
    .row:hover .tip > span { opacity: 1; translate: -50% 0; }
    .row:hover .pct { opacity: 0; } /* the bubble can reach the end gutter */`,
}, (d) => (
  <div class="row" style={{ "--rhp-color": d.color }}>
    <Label edge="start" class="habit">
      <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d={GLYPH[d.habit]} /></svg>
      <span>{d.habit}<small>{d.goal}</small></span>
    </Label>
    <Bar to={120} thick="12px" class="track" />
    <Bar to={Math.min(120, d.pct)} thick="12px" class="done" />
    <Tick at={100} thick="24px" class="goal" />
    <Label edge="end" class="pct">{Math.round(d.pct)}%</Label>
    <Label at={Math.min(120, d.pct)} class="tip"><span>{AMOUNT[d.habit](d.pct / 100)}</span></Label>
  </div>
));

export function Bullet(p) {
  const pct = createMemo(() => (p.seed() ? HABITS.map(() => rand(45, 125)) : [86, 104, 71, 58, 115]));
  return (
    <Poster look="watch" kicker="Health · today" title="Today's goals" dek="How far each daily goal got. The white line is the goal.">
      <Chart orientation={p.o()} scale={[0, 120]} ticks={false} height={300} animate={p.js()} theme={WATCH}>
        <Plot habit={HABITS} goal={GOALS} color={NEON} pct={pct()}>{GoalSlat}</Plot>
      </Chart>
    </Poster>
  );
}
/*</show>*/

/*<show waterfall>*/
const LINES = ["Salary", "Rent", "Groceries", "Transport", "Bills", "Going out", "Saved"];
const MONTH = [4200, -1450, -520, -180, -230, -300]; // £ in, then out; what is left is saved
const FINTECH = { font: "system-ui, sans-serif", ink: "#1c2433", muted: "#6b7385", grid: "#edf0f4", surface: "#ffffff" };
const STEP = { in: "#12b886", out: "#f25f5c", total: "#1c2433" }; // money in, money out, what is left
const pounds = (v) => (v < 0 ? "−" : "") + "£" + Math.abs(Math.round(v)).toLocaleString("en-GB");

// A step from the running total before it to the one after; a hairline links it to the next step.
// An expense is a button: click it (its name or its bar) to cut it from the month. A cut step has no length, and a
// dashed outline keeps its place, so the steps after it and the savings move up by what it cost.
const StepSlat = slat({
  thickness: { horizontal: 46 },
  room: { horizontal: { start: 100, end: 66 }, vertical: { start: 40, end: 26, after: 18 } },
  css: `
    .item { font-size: 14px; font-weight: 600; }
    .item:horizontal { --rhp-label-gap: 14px; }
    .item:vertical { font-size: 11px; white-space: normal; line-height: 1.1; hyphens: auto; }
    .item button { all: unset; cursor: pointer; border-radius: 3px; text-decoration: underline 1.5px dotted #b5bcc8; text-underline-offset: 3px; }
    .item button:focus-visible { outline: 2px solid #0b8a63; outline-offset: 2px; }
    .out:hover .item button { text-decoration-color: #d2423f; }
    .cut .item button { color: #8a93a3; text-decoration: line-through 1.5px #d2423f; }
    .step { --rhp-radius: 6px; }
    .out .step, .ghost { cursor: pointer; }
    .out:hover .step { box-shadow: 0 6px 12px -6px rgb(210 66 63 / .8); }
    .ghost { background: none; border: 1.5px dashed #f25f5c; opacity: 0; }
    .cut .ghost { opacity: .75; }
    .amount { font-size: 12px; font-weight: 800; font-variant-numeric: tabular-nums; }
    .in .amount { color: #0b8a63; }
    .out .amount { color: #d2423f; }
    .cut .amount { color: #8a93a3; text-decoration: line-through; }
    .amount:horizontal { --rhp-label-gap: 8px; }
    .amount:vertical { font-size: 10.5px; }
    .link { background: #b5bcc8; }
    .link:horizontal { width: 1px; top: calc(50% + 12px); height: 22px; translate: -50% 0; }
    .link:vertical { height: 1px; left: calc(50% + 12px); width: calc(100% - 24px); translate: 0 50%; }`,
}, (d) => {
  const kind = () => (d.total ? "total" : d.amount > 0 ? "in" : "out");
  return (
    <div class={kind() + (d.cut ? " cut" : "")}>
      <Label edge="start" class="item">
        <Show when={kind() === "out"} fallback={d.item}><button type="button" data-line={d.index} aria-pressed={d.cut}>{d.item}</button></Show>
      </Label>
      <Show when={kind() === "out"}><Bar from={d.from} to={d.from + d.amount} thick="24px" data-line={d.index} class="ghost" /></Show>
      <Bar from={d.from} to={d.to} thick="24px" color={STEP[kind()]} data-line={kind() === "out" ? d.index : undefined} class="step" />
      <Show when={!d.total}><Tick at={d.to} class="link" /></Show>
      <Label at={Math.max(d.from, d.to)} class="amount">{d.total ? pounds(d.to) : pounds(d.amount)}</Label>
    </div>
  );
});

export function Waterfall(p) {
  const month = createMemo(() => (p.seed() ? [rand(3800, 4600), -rand(1300, 1600), -rand(400, 650), -rand(100, 260), -rand(180, 300), -rand(150, 500)] : MONTH));
  const [cut, setCut] = createSignal([]); // the rows of the expenses cut; new data brings them all back
  createComputed(on(month, () => setCut([])));
  const toggle = (e) => {
    const i = e.target.closest("[data-line]")?.dataset.line;
    if (i != null) setCut((c) => (c.includes(+i) ? c.filter((k) => k !== +i) : [...c, +i]));
  };
  const steps = createMemo(() => {
    const r = running(month().map((v, i) => (cut().includes(i) ? 0 : v))); // step k goes from the total before it to the total after it
    return { from: [...r.from, 0], to: [...r.to, r.to.at(-1)] };
  });
  return (
    <Poster look="budget" kicker="Monthly budget" title="Where the salary goes" onClick={toggle}
      dek={<><b>{pounds(steps().to.at(-1))}</b> left to save this month.</>} note="Click an expense to cut it from the month; click it again to bring it back.">
      <Chart orientation={p.o()} scale={[0, 5000]} ticks={[0, 1000, 2000, 3000, 4000, 5000]} format={(v) => (v ? "£" + v / 1000 + "k" : "0")} height={320} animate={p.js()} theme={FINTECH}>
        <Plot item={LINES} from={steps().from} to={steps().to} amount={[...month(), null]} cut={LINES.map((_, i) => cut().includes(i))}
          total={LINES.map((_, i) => i === LINES.length - 1)}>{StepSlat}</Plot>
      </Chart>
    </Poster>
  );
}
/*</show>*/

/*<show gantt>*/
const TRADES = ["Groundworks", "Frame", "Roof", "Services", "Interiors", "Garden"];
const PLAN = [[0, 6], [5, 13], [12, 17], [14, 23], [20, 30], [27, 32]]; // weeks from the start of March
const MONTH_NAMES = ["Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
const TODAY = 14;
const DRAWING = { font: "system-ui, sans-serif", ink: "#141414", muted: "#77736d", grid: "#e7e4de", surface: "#fbfaf7" };

// The months are a Scale of intervals: a slat per 4 weeks, from d.at to d.next, every other one shaded.
const MonthBandSlat = slat({
  room: { horizontal: { before: 26 }, vertical: { before: 40 } },
  css: `
    .band { background: none; --rhp-radius: 0px; }
    .odd .band { background: rgb(20 20 20 / .035); }
    .band:horizontal { top: 0; height: 100%; translate: none; }
    .band:vertical { left: 0; width: 100%; translate: none; }
    .month { font-size: 10.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--rhp-muted); padding: 0; }
    .month:horizontal { top: -20px; translate: 6px 0; }
    .month:vertical { left: -34px; translate: 0 -4px; }
    @container (max-width: 360px) { .odd > .month:horizontal { display: none; } } /* a narrow plot names every other month */`,
}, (t) => (
  <div class={t.index % 2 ? "odd" : ""}>
    <Bar from={t.at} to={t.next} class="band" />
    <Show when={!t.last}><Label at={t.at} class="month">{MONTH_NAMES[t.index]}</Label></Show>
  </div>
));

// A trade on site: the whole job as a thin gray bar, the part done by today in site orange.
// Hover a trade and the drawing dimensions it: a line with end marks alongside the bar, and its length in weeks.
const TradeSlat = slat({
  thickness: { horizontal: 44 },
  room: { horizontal: { start: 116, end: 16 }, vertical: { start: 40, end: 10 } },
  css: `
    .trade { font-size: 14px; font-weight: 700; }
    .trade small { display: block; font-size: 10.5px; font-weight: 500; color: var(--rhp-muted); }
    .trade:horizontal { --rhp-label-gap: 14px; }
    .trade:vertical { font-size: 10px; white-space: normal; line-height: 1.1; hyphens: auto; }
    .trade:vertical small { display: none; }
    .job { background: #d8d5cf; --rhp-radius: 99px; }
    .done { background: #ff5a1f; --rhp-radius: 99px; }
    .row:hover .job { background: #c4c0b8; }
    .row:hover .trade { color: #ff5a1f; }
    .dim, .weeks { visibility: hidden; }
    .row:hover :is(.dim, .weeks) { visibility: visible; }
    .dim { background: var(--rhp-ink); --rhp-radius: 0px; }
    .dim:horizontal { translate: 0 -13px; }
    .dim:vertical { translate: 13px 0; }
    .dim::before, .dim::after { content: ""; position: absolute; background: var(--rhp-ink); }
    .dim:horizontal::before, .dim:horizontal::after { top: -4px; width: 1px; height: 9px; }
    .dim:horizontal::before { left: 0; } .dim:horizontal::after { right: 0; }
    .dim:vertical::before, .dim:vertical::after { left: -4px; height: 1px; width: 9px; }
    .dim:vertical::before { bottom: 0; } .dim:vertical::after { top: 0; }
    .weeks { padding: 0 4px; font-size: 10.5px; font-weight: 800; letter-spacing: .06em; background: var(--rhp-surface); }
    .weeks:horizontal { translate: -50% calc(-50% - 13px); } /* on the line, breaking it, as on a drawing */
    .weeks:vertical { left: calc(50% + 13px); translate: -50% 50%; }`,
}, (d) => (
  <div class="row">
    <Label edge="start" class="trade">{d.trade}<small>wk {Math.round(d.start)}–{Math.round(d.end)}</small></Label>
    <Bar from={d.start} to={d.end} thick="10px" class="job" />
    <Show when={d.start < TODAY}><Bar from={d.start} to={Math.min(TODAY, d.end)} thick="10px" class="done" /></Show>
    <Bar from={d.start} to={d.end} thick="1px" class="dim" />
    <Label at={(d.start + d.end) / 2} class="weeks">{Math.round(d.end - d.start)} WK</Label>
  </div>
));

// Today: a line across the plot, named below it (horizontal; the months are above) or at its end (vertical).
const TodaySlat = slat({
  room: { horizontal: { after: 24 } },
  css: `.now { background: #ff5a1f; --rhp-tick-width: 2px; } .now-label { font-size: 10.5px; font-weight: 800; letter-spacing: .08em; color: #ff5a1f; padding: 0; }
    .now-label:horizontal { top: calc(100% + 6px); translate: -50% 0; } .now-label:vertical { left: auto; right: 4px; translate: 0 -2px; }`,
}, () => <div><Tick at={TODAY} thick={1} class="now" /><Label at={TODAY} class="now-label">TODAY</Label></div>);

export function Gantt(p) {
  const plan = createMemo(() => (p.seed() ? PLAN.map(([a, b]) => { const s = Math.max(0, a + Math.round(rand(-2, 2))); return [s, Math.min(32, Math.max(s + 2, b + Math.round(rand(-2, 2))))]; }) : PLAN));
  return (
    <Poster look="drawing" kicker={`Building a house · week ${TODAY} of 32`} title="From plot to keys" dek="Each bar is a trade on site; the orange part is done. Point at one to measure it.">
      <Chart orientation={p.o()} scale={[0, 32]} height={340} animate={p.js()} theme={DRAWING}>
        <Scale ticks={every(4)}>{MonthBandSlat}</Scale>
        <Plot trade={TRADES} start={plan().map((w) => w[0])} end={plan().map((w) => w[1])} key="trade" order={sortBy("start")}>{TradeSlat}</Plot>
        {/* today, over the trades; the pointer passes through it to them */}
        <Plot overlap slats={1} style={{ "pointer-events": "none" }}>{TodaySlat}</Plot>
      </Chart>
    </Poster>
  );
}
/*</show>*/

/*<show candles>*/
const SALMON = { font: "system-ui, sans-serif", ink: "#33302e", muted: "#66605c", grid: "#eadbcc", surface: "#fff1e5" };
const dollars = (v) => "$" + v.toFixed(v < 100 ? 2 : 0);

// A day: the wick over the day's range, the body from the open to the close; teal up, claret down.
// Its root carries data-day, so the poster knows which day is under the pointer; that day's band is shaded.
const DaySlat = slat({
  thickness: { horizontal: 15 },
  room: { horizontal: { start: 24, end: 64 }, vertical: { start: 10, end: 30 } }, // the axis numbers read "$42.5"; vertical, the last price's badge can stand 28px above the top
  css: `
    .day:hover { background: rgb(51 48 46 / .07); }
    .wick { background: #807973; }
    .body { --rhp-radius: 1px; }
    .last { font-size: 11.5px; font-weight: 800; color: #fff; padding: 2px 6px; border-radius: 3px; background: var(--rhp-color); font-variant-numeric: tabular-nums; }
    .last:horizontal { margin-left: 8px; }
    .last:vertical { left: auto; right: 0; translate: 0 -8px; }`,
}, (d) => {
  const color = () => (d.close >= d.open ? "#0d7680" : "#990f3d");
  return (
    <div class="day" data-day={d.index}>
      <Bar from={d.low} to={d.high} thick="1.5px" class="wick" />
      <Bar from={d.open} to={d.close} thick={0.72} color={color()} class="body" />
      <Show when={d.latest}><Label at={d.close} class="last" style={{ "--rhp-color": color() }}>{dollars(d.close)}</Label></Show>
    </div>
  );
});

// The day under the pointer: a dashed line across the chart at its close, and its price over the axis numbers.
// It draws in the axis gutter, so it asks for no room of its own (a top-level Plot whose slat gives none gets the default gutters).
const CrossSlat = slat({
  room: {},
  css: `
    .cross { background: none; --rhp-tick-width: 0px; }
    .cross:horizontal { border-left: 1px dashed var(--rhp-ink); }
    .cross:vertical { border-top: 1px dashed var(--rhp-ink); }
    .price { padding: 3px 6px; border-radius: 3px; background: var(--rhp-ink); color: var(--rhp-surface); font-size: 11px; font-weight: 800; }
    .price:horizontal { top: calc(100% + 1px); translate: -50% 0; }
    .price:vertical { left: auto; right: calc(100% + 3px); translate: 0 50%; }`,
}, (c) => (
  <div>
    <Tick at={c.close} thick={1} class="cross" />
    <Label at={c.close} class="price">{dollars(c.close)}</Label>
  </div>
));

export function Candles(p) {
  const days = createMemo(() => {
    p.seed();
    let price = 48;
    return Array.from({ length: 22 }, (_, i) => {
      const open = price, close = Math.max(20, open + rand(-3.2, 3.6));
      price = close;
      return { open, close, low: Math.min(open, close) - rand(0.2, 2.2), high: Math.max(open, close) + rand(0.2, 2.2), latest: i === 21 };
    });
  });
  const range = createMemo(() => nice(Math.min(...days().map((d) => d.low)), Math.max(...days().map((d) => d.high)), 4)); // fitted to the month
  // The day under the pointer (when it moves: the readout's height may change under a still one); the readout shows it,
  // or the latest day.
  const [day, setDay] = createSignal(null);
  const point = (e) => { const i = e.target.closest("[data-day]")?.dataset.day; setDay(i == null ? null : +i); };
  const read = createMemo(() => {
    const i = day() ?? days().length - 1, d = days()[i], before = i ? days()[i - 1].close : d.open;
    return { ...d, day: i + 1, change: ((d.close - before) / before) * 100 };
  });
  return (
    <Poster look="market" kicker="Share price · daily" title="A month on the market" dek="Each candle is a day: its body runs from the open to the close, its wick covers the day's range."
      note="Illustrative data. Point at a day for its prices." onPointerMove={point} onPointerDown={point} onPointerLeave={(e) => e.pointerType !== "touch" && setDay(null)}>
      <p class="ohlc">
        <b>Day {read().day}</b><span>Open {dollars(read().open)}</span><span>High {dollars(read().high)}</span><span>Low {dollars(read().low)}</span>
        <span>Close <b class={read().change >= 0 ? "up" : "down"}>{dollars(read().close)} {read().change >= 0 ? "▲" : "▼"} {Math.abs(read().change).toFixed(1)}%</b></span>
      </p>
      <Chart orientation={p.o()} scale={[range().min, range().max]} ticks={range().ticks} format={(v) => "$" + v} height={300} animate={p.js()} theme={SALMON}>
        <Plot rows={days()}>{DaySlat}</Plot>
        <Plot overlap slats={day() == null ? 0 : 1} close={days()[day()]?.close} style={{ "pointer-events": "none" }}>{CrossSlat}</Plot>
      </Chart>
    </Poster>
  );
}
/*</show>*/
