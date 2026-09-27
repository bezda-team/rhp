// The gallery: every chart is a Chart holding a Plot of slats, and some draw their own scale with a Scale.
// A slat owns its look and layout: its CSS, band, inset and gutter room travel with it. Its structural colors and
// font come from a theme: the page's (page.jsx) or one a demo passes to its Chart. Nothing here reads the page's CSS.
// Most charts sit in a Poster, a magazine-style panel that belongs to the page (page.src.html styles it).
// Each demo gets p.o() (orientation), p.js() (JS version on) and p.seed() (bumped by "New data").
// The code between show markers is what the page prints under each chart.
import { createSignal, createMemo, createComputed, on, onCleanup, Show } from "solid-js";
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
function Poster(p) {
  return (
    <figure class={"poster " + p.look}>
      <figcaption>
        <span class="kicker">{p.kicker}</span>
        <span class="headline">{p.title}</span>
        <span class="dek">{p.dek}</span>
      </figcaption>
      {p.children}
      <Show when={p.note}><span class="note">{p.note}</span></Show>
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
    [data-rhp-o="h"].mark { top: -16px; bottom: -12.8px; height: auto; }
    [data-rhp-o="v"].mark { left: -16px; right: -12.8px; width: auto; }
    .zero > [data-rhp-o="h"].mark { translate: -100% 0; }
    .zero > [data-rhp-o="v"].mark { translate: 0 100%; }
    .line > .mark { background: none; }
    .line > [data-rhp-o="h"].mark { border-left: 4px dashed var(--rhp-grid); }
    .line > [data-rhp-o="v"].mark { border-top: 4px dashed var(--rhp-grid); }
    .tick > .mark { background: var(--rhp-grid); }
    .tick > [data-rhp-o="h"].mark { bottom: auto; height: 13px; }
    .tick > [data-rhp-o="v"].mark { right: auto; width: 13px; }
    .num { font-size: 13px; font-weight: 700; line-height: 19.5px; font-variant-numeric: normal; color: var(--rhp-muted); translate: none; padding: 0; }
    [data-rhp-o="h"].num { top: -20px; padding-left: 8px; }
    .zero > [data-rhp-o="h"].num { padding-left: 4px; }
    [data-rhp-o="v"].num { left: -20px; bottom: calc(var(--rhp-p) * 100% + 8px); }
    .zero > [data-rhp-o="v"].num { bottom: calc(var(--rhp-p) * 100% + 4px); }
    /* On a narrow plot a number close to the max would run into it, so it fades out below 30px from the end.
       tan(atan2(x, 1px)) is the length x as a plain number of px; 100cqw is the plot's length (horizontal). */
    .line > [data-rhp-o="h"].num, .tick > [data-rhp-o="h"].num { opacity: clamp(0, tan(atan2((1 - var(--rhp-p)) * 100cqw - 30px, 1px)), 1); }`,
}, (t) => (
  <div class={t.first ? "zero" : t.last ? "end" : t.marks}>
    <Tick at={t.at} thick={1} class="mark" />
    <Label at={t.at} class="num">{Math.round(t.at)}</Label>
  </div>
));
/*</show>*/

/*<show fruit>*/
const NAMES = ["Fruit A", "Fruit B", "Fruit C", "Fruit D", "Fruit E", "Fruit F", "Fruit G"];
const FRUITS = ["grape", "watermelon", "pear", "banana", "orange", "peach", "strawberry"];
const ART = [grape, watermelon, pear, banana, orange, peach, strawberry];
const COLORS = ["pink", "#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51", "#ce4257"];

const FruitSlat = slat({
  band: { horizontal: 79 }, // v1: seven rows in 552px; vertical: the rows share the width
  inset: "8px",
  room: { horizontal: { start: 112, end: 32 }, vertical: { start: 32, end: 30 } }, // for the names and values
  css: `
    .name { font-size: 16px; font-weight: 600; line-height: 24px; color: var(--rhp-muted); }
    [data-rhp-o="h"].name { text-align: center; padding: 0; }
    .bar { display: flex; align-items: center; overflow: hidden; }
    [data-rhp-o="h"].bar { border-radius: 0 16px 16px 0; }
    [data-rhp-o="v"].bar { border-radius: 16px 16px 0 0; flex-direction: column-reverse; }
    .bar:hover { border: 4px solid var(--rhp-ink); }
    /* The art fills the bar's length up to 300px, is never under 50px, and the bar crops it. */
    .bar > img { display: block; flex: 1 1 auto; width: auto; height: auto; margin: 0; min-width: 0; min-height: 0; max-width: none; max-height: none; }
    [data-rhp-o="h"].bar > img { min-width: 50px; max-width: 300px; }
    [data-rhp-o="v"].bar > img { min-height: 50px; max-height: 300px; }
    .value { font-size: 13px; font-weight: 700; line-height: 19.5px; font-variant-numeric: normal; color: var(--rhp-color); }
    [data-rhp-o="h"].value { padding-left: 8px; }
    [data-rhp-o="v"].value { padding-bottom: 8px; }
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
// to the quarter the wind comes from.
const WindSlat = slat({
  band: { horizontal: 60 },
  room: { horizontal: { start: 128, end: 64 }, vertical: { start: 64, end: 30 } },
  css: `
    .quarter { display: flex; align-items: center; gap: 10px; overflow: visible; font-size: 16px; font-weight: 700; }
    [data-rhp-o="h"].quarter { justify-content: flex-end; padding-right: 16px; }
    [data-rhp-o="v"].quarter { flex-direction: column; gap: 6px; padding-top: 8px; font-size: 13px; }
    .dial { position: relative; flex: none; width: 30px; height: 30px; border-radius: 50%; background: #fff; box-shadow: 0 2px 6px rgb(11 42 60 / .2); }
    .needle { position: absolute; inset: 4px 11px; clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%); background: linear-gradient(#ff6b4a 50%, #0b2a3c 50%); }
    .gust { --rhp-radius: 99px; }
    [data-rhp-o="h"].gust { background: linear-gradient(90deg, rgb(11 42 60 / 0), #0b2a3c); }
    [data-rhp-o="v"].gust { background: linear-gradient(0deg, rgb(11 42 60 / 0), #0b2a3c); }
    [data-rhp-o="h"].slat:hover .gust, .slat:hover > [data-rhp-o="h"].gust { background: linear-gradient(90deg, rgb(255 107 74 / 0), #ff6b4a); }
    .slat:hover > [data-rhp-o="v"].gust { background: linear-gradient(0deg, rgb(255 107 74 / 0), #ff6b4a); }
    .knots { opacity: 0; transition: opacity .15s; font-size: 14px; font-weight: 800; color: #ff6b4a; }
    [data-rhp-o="h"].knots { padding-left: 10px; }
    .slat:hover .knots { opacity: 1; }`,
}, (d) => (
  <div class="slat">
    <Label edge="start" class="quarter"><span class="dial"><i class="needle" style={{ rotate: BEARING[d.quarter] + "deg" }} /></span>{d.quarter}</Label>
    <Bar to={d.knots} thick="10px" class="gust" />
    <Label at={d.knots} class="knots">{Math.round(d.knots)} kn</Label>
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
  band: { horizontal: 79 },
  inset: "8px",
  room: { horizontal: { start: 96, end: 37 }, vertical: { start: 80, end: 30 } }, // for the photos and values
  css: `
    .photo { display: flex; align-items: center; justify-content: center; padding: 0; overflow: visible; }
    [data-rhp-o="h"].photo { top: 8px; bottom: 8px; translate: none; }
    [data-rhp-o="v"].photo { height: var(--rhp-room-start); }
    .circle { flex: none; aspect-ratio: 1; border-radius: 50%; border: 4px solid var(--rhp-grid); overflow: hidden; }
    [data-rhp-o="h"] > .circle { height: 100%; }
    [data-rhp-o="v"] > .circle { width: min(63px, 100% - 16px); }
    .circle > img { display: block; width: 100%; height: 100%; margin: 0; object-fit: cover; transform: scale(5); }
    .whisker, .box { --rhp-radius: 0px; }
    .cap { --rhp-tick-width: 4px; }
    [data-rhp-o="h"].cap { translate: 0 -50%; }
    [data-rhp-o="v"].cap { translate: -50% 0; }
    .box { display: flex; align-items: center; justify-content: center; overflow: hidden; background: none;
      border: 4px solid var(--rhp-color); color: var(--rhp-color); font-size: 16px; line-height: 24px; white-space: nowrap; }
    [data-rhp-o="v"].box > span { writing-mode: vertical-rl; rotate: 180deg; }
    .value { font-size: 13px; font-weight: 700; line-height: 19.5px; font-variant-numeric: normal; color: var(--rhp-color); }
    [data-rhp-o="h"].value { padding-left: 8px; margin-top: -1px; } /* v1: 1px above the middle */
    [data-rhp-o="v"].value { padding-bottom: 8px; }
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
  band: 60, // 52px dots, 8px apart: the page makes the value axis 11 × 60px long
  room: { horizontal: { start: 2, end: 2, before: 2, after: 4 }, vertical: { start: 4, end: 2, before: 2, after: 2 } },
  css: `
    [data-rhp-o="h"] > .row { overflow-x: clip; } /* dots past the ends of the scale are hidden */
    [data-rhp-o="v"] > .row { overflow-y: clip; }
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
  return (
    <div class="dots-fit">
      <div class="dots-window" onMouseEnter={hold} onMouseLeave={resume}>
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

// One count: a thin ribbon from 0, and the medal at its end with the count struck on it.
const MedalSlat = slat({
  css: `
    .ribbon { --rhp-radius: 2px; }
    [data-rhp-o="h"].ribbon { background: linear-gradient(90deg, transparent, var(--metal)); }
    [data-rhp-o="v"].ribbon { background: linear-gradient(0deg, transparent, var(--metal)); }
    .medal { display: grid; place-items: center; font: 800 11px/1 var(--rhp-font); font-variant-numeric: tabular-nums;
      background: radial-gradient(circle at 30% 26%, var(--shine), var(--metal) 46%, var(--edge));
      color: var(--stamp); box-shadow: 0 1px 2px rgb(0 0 0 / .28), inset 0 0 0 2px rgb(255 255 255 / .28); }
    .gold { --metal: #e0b43f; --shine: #fff4c4; --edge: #a87a14; --stamp: #3f2c02; }
    .silver { --metal: #bfc5cb; --shine: #ffffff; --edge: #858d95; --stamp: #22272c; }
    .bronze { --metal: #cf8a55; --shine: #ffe2c9; --edge: #8a4b23; --stamp: #2e1405; }`,
}, (m) => (
  <div class={m.metal}>
    <Bar to={m.value} thick="3px" class="ribbon" />
    <Dot at={m.value} size="24px" class="medal">{Math.round(m.value)}</Dot>
  </div>
));

const TeamSlat = slat({
  band: { horizontal: 84 },
  room: { horizontal: { start: 96, end: 22 }, vertical: { start: 46, end: 18 } },
  css: `
    .team { font: 700 22px/1 "Barlow Condensed", "Arial Narrow", sans-serif; letter-spacing: .03em; text-transform: uppercase; }
    .team small { display: block; margin-top: 3px; font: 500 11px/1 var(--rhp-font); letter-spacing: .06em; text-transform: none; color: var(--rhp-muted); }
    [data-rhp-o="h"].team { padding-right: 14px; }
    [data-rhp-o="v"].team { font-size: 18px; }`,
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
const CAFE = { font: "system-ui, sans-serif", ink: "#2b1b12", muted: "#8a7260", grid: "#e4d8c8", surface: "#f3ebe0" };

// One layer of a drink. `end` is the last layer with anything in it, which gets the cup's rounded end.
const LayerSlat = slat({
  css: `
    .layer { --rhp-radius: 0px; }
    [data-rhp-o="h"].espresso { background: linear-gradient(90deg, #24150c, #3f2415 65%, #8d5b33); border-radius: 12px 0 0 12px; }
    [data-rhp-o="v"].espresso { background: linear-gradient(0deg, #24150c, #3f2415 65%, #8d5b33); border-radius: 0 0 12px 12px; }
    [data-rhp-o="h"].milk { background: linear-gradient(90deg, #e6d4bb, #f5ecdf); border-left: 2px solid var(--rhp-surface); }
    [data-rhp-o="v"].milk { background: linear-gradient(0deg, #e6d4bb, #f5ecdf); border-bottom: 2px solid var(--rhp-surface); }
    .foam { background: radial-gradient(circle, #fff 1.4px, transparent 2px) 0 0 / 7px 7px, #fcf8f1; }
    [data-rhp-o="h"].foam { border-left: 2px solid var(--rhp-surface); }
    [data-rhp-o="v"].foam { border-bottom: 2px solid var(--rhp-surface); }
    [data-rhp-o="h"].end { border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
    [data-rhp-o="v"].end { border-top-left-radius: 12px; border-top-right-radius: 12px; }
    .empty { display: none; }`,
}, (l) => <Bar from={l.from} to={l.to} class={"layer " + l.part + (l.index === l.end ? " end" : "") + (l.to - l.from < 0.5 ? " empty" : "")} />);

const DrinkSlat = slat({
  inset: "10px",
  band: { horizontal: 58 },
  room: { horizontal: { start: 132, end: 60 }, vertical: { start: 46, end: 30 } },
  css: `
    .drink { font: italic 600 18px/1 Fraunces, Georgia, serif; }
    [data-rhp-o="h"].drink { padding-right: 16px; }
    [data-rhp-o="v"].drink { font-size: 13px; line-height: 1.1; white-space: normal; hyphens: auto; }
    .ml { font-size: 11px; font-weight: 600; letter-spacing: .08em; color: var(--rhp-muted); }
    [data-rhp-o="h"].ml { padding-left: 10px; }
    .cup { background: none; box-shadow: 0 10px 18px -12px rgb(43 27 18 / .55); --rhp-radius: 12px; }`,
}, (d) => {
  const layer = createMemo(() => stackUp(d.ml)); // { from, to } per layer
  return (
    <div>
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
const ChargeSlat = slat({
  css: `
    .charge { display: grid; place-items: center; overflow: hidden; --rhp-radius: 4px; color: #fff; font-size: 11px; font-weight: 700; }
    [data-rhp-o="h"].charge { height: 26px; clip-path: inset(0 1px); }
    [data-rhp-o="v"].charge { width: 62px; clip-path: inset(1px 0); }
    .charge.games { color: #2a1b00; }
    .charge.small > span { display: none; }
    @container (max-width: 300px) { [data-rhp-o="h"].charge.mid > span { display: none; } } /* a narrow battery needs 16% for a number */`,
}, (c) => (
  <Bar from={c.from} to={c.to} color={c.color} class={"charge " + c.app.toLowerCase() + (c.to - c.from < 9 ? " small" : c.to - c.from < 16 ? " mid" : "")}>
    <span>{Math.round(c.to - c.from)}%</span>
  </Bar>
));

// A battery: the shell a little larger than the track, the nub past its end, the charge inside.
const BatterySlat = slat({
  band: { horizontal: 52 },
  room: { horizontal: { start: 92, end: 18 }, vertical: { start: 30, end: 18 } },
  css: `
    .who { font-size: 15px; font-weight: 600; }
    [data-rhp-o="h"].who { padding-right: 16px; }
    .shell { background: none; border: 2px solid rgb(29 29 31 / .32); --rhp-radius: 10px; }
    [data-rhp-o="h"].shell { left: -5px; width: calc(100% + 10px); height: 36px; }
    [data-rhp-o="v"].shell { bottom: -5px; height: calc(100% + 10px); width: 72px; }
    .nub { background: rgb(29 29 31 / .32); }
    [data-rhp-o="h"].nub { width: 5px; height: 14px; translate: 7px -50%; border-radius: 0 3px 3px 0; }
    [data-rhp-o="v"].nub { height: 5px; width: 22px; translate: -50% -7px; border-radius: 3px 3px 0 0; }`,
}, (d) => {
  const cell = createMemo(() => stackUp(shares(d.use))); // each app as a share of 100, stacked
  return (
    <div>
      <Label edge="start" class="who">{d.name}</Label>
      <Bar to={100} class="shell" />
      <Tick at={100} class="nub" />
      <Plot overlap from={cell().from} to={cell().to} color={APP_COLORS} app={APPS}>{ChargeSlat}</Plot>
    </div>
  );
});

export function Segmented(p) {
  const use = createMemo(() => (p.seed() ? PEOPLE.map(() => APPS.map(() => rand(4, 40))) : USE));
  return (
    <Poster look="battery" kicker="A day on one charge" title="Where the battery goes"
      dek={<span class="keys">{APPS.map((a, i) => <span><i style={{ background: APP_COLORS[i] }} />{a}</span>)}</span>}>
      <Chart orientation={p.o()} scale={[0, 100]} ticks={false} height={300} animate={p.js()} theme={PHONE}>
        <Plot name={PEOPLE} use={use()}>{BatterySlat}</Plot>
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
const SpineSlat = slat({
  css: `
    .spine { --rhp-radius: 2px; }
    [data-rhp-o="h"].spine { top: auto; bottom: 0; translate: none; clip-path: inset(0 1px);
      background-image: linear-gradient(transparent 9%, rgb(255 255 255 / .4) 9% 11%, transparent 11% 89%, rgb(255 255 255 / .4) 89% 91%, transparent 91%); }
    [data-rhp-o="v"].spine { clip-path: inset(1px 0);
      background-image: linear-gradient(90deg, transparent 9%, rgb(255 255 255 / .4) 9% 11%, transparent 11% 89%, rgb(255 255 255 / .4) 89% 91%, transparent 91%); }`,
}, (u) => <Bar from={u.from} to={u.to} thick={tall(u.index)} color={binding(u.cloth, u.index)} class="spine" />);

const ShelfSlat = slat({
  band: { horizontal: 66 },
  room: { horizontal: { start: 96, end: 52 }, vertical: { start: 30, end: 38 } },
  css: `
    .shelf { border-bottom: 5px solid #c79f72; }
    .genre { font: 600 17px/1 Fraunces, Georgia, serif; }
    [data-rhp-o="h"].genre { padding-right: 16px; }
    .count { font: 800 18px/1 Fraunces, Georgia, serif; }
    .count small { display: block; margin-top: 1px; font: 500 11px/1 var(--rhp-font); color: var(--rhp-muted); }
    [data-rhp-o="h"].count { padding-left: 10px; }`,
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

// Men to the left of a spine of ages, women to the right: both Bars start SPINE away from 0.
const AgeSlat = slat({
  band: { horizontal: 30 },
  inset: 0.13,
  room: { horizontal: { start: 38, end: 38 }, vertical: { start: 26, end: 26 } },
  css: `
    [data-rhp-o="h"].men { border-radius: 99px 3px 3px 99px; }
    [data-rhp-o="h"].women { border-radius: 3px 99px 99px 3px; }
    [data-rhp-o="v"].men { border-radius: 3px 3px 99px 99px; }
    [data-rhp-o="v"].women { border-radius: 99px 99px 3px 3px; }
    .age { padding: 0; font-size: 11px; font-weight: 800; letter-spacing: .02em; }
    [data-rhp-o="h"].age { translate: -50% -50%; }
    [data-rhp-o="v"].age { translate: -50% 50%; }
    .pct { font-size: 11px; color: var(--rhp-muted); font-variant-numeric: tabular-nums; }`,
}, (d) => (
  <div>
    <Bar from={-(d.men + SPINE)} to={-SPINE} color="#1d6fa5" class="men" />
    <Bar from={SPINE} to={d.women + SPINE} color="#d9694c" class="women" />
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
    [data-rhp-o="h"].num { top: calc(100% + 8px); translate: -50% 0; }
    [data-rhp-o="v"].num { left: auto; right: calc(100% + 8px); translate: 0 50%; }
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
  band: { horizontal: 20 },
  inset: "1.5px",
  room: { horizontal: { start: 40, end: 40 }, vertical: { start: 26, end: 22 } },
  css: `
    .bin { --rhp-radius: 3px; }
    .deg { font-size: 11px; font-weight: 700; color: var(--rhp-muted); }
    .days { opacity: 0; font-size: 11px; font-weight: 800; transition: opacity .15s; }
    [data-rhp-o="h"].days { padding-left: 6px; }
    .slat:hover .days { opacity: 1; }
    .slat:hover .bin { filter: brightness(1.08) saturate(1.1); }`,
}, (d) => (
  <div class="slat">
    <Bar to={d.tally} color={warmth((d.x0 + d.x1) / 2)} class="bin" />
    <Show when={d.x0 % 4 === 0}><Label edge="start" class="deg">{d.x0}°</Label></Show>
    <Label at={d.tally} class="days">{d.tally}</Label>
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
const SampleSlat = slat({
  band: { horizontal: 12 },
  room: { start: 12, end: 12 },
  css: `
    .swing { --rhp-radius: 99px; opacity: var(--fade); }
    [data-rhp-o="h"].swing { background: linear-gradient(90deg, #6d28d9, #ec4899); }
    [data-rhp-o="h"].swing.down { background: linear-gradient(270deg, #6d28d9, #ec4899); }
    [data-rhp-o="v"].swing { background: linear-gradient(0deg, #6d28d9, #ec4899); }
    [data-rhp-o="v"].swing.down { background: linear-gradient(180deg, #6d28d9, #ec4899); }
    .tip { background: #fff; opacity: var(--fade); box-shadow: 0 0 10px 2px rgb(236 72 153 / .7); }`,
}, (d) => (
  <div style={{ "--fade": 1 - d.index / 46 }}>
    <Bar to={d.y} thick="4px" class={d.y < 0 ? "swing down" : "swing"} />
    <Dot at={d.y} size="7px" class="tip" />
  </div>
));

// The resting line, the only scale a waveform needs.
const RestSlat = slat({ css: `.rest { background: var(--rhp-grid); --rhp-tick-width: 1px; }` }, () => <div><Tick at={0} thick={1} class="rest" /></div>);

export function Stem(p) {
  const y = createMemo(() => {
    p.seed();
    const w = rand(0.45, 0.8), decay = rand(9, 18);
    return Array.from({ length: 36 }, (_, k) => Math.cos(k * w) * Math.exp(-k / decay));
  });
  return (
    <Poster look="sound" kicker="One strike · 36 samples" title="The sound of a bell" dek="Each swing is smaller than the last, until the note dies away.">
      <Chart orientation={p.o()} scale={[-1.05, 1.05]} height={280} animate={p.js()} theme={MIDNIGHT}>
        <Scale ticks={[0]}>{RestSlat}</Scale>
        <Plot y={y()}>{SampleSlat}</Plot>
      </Chart>
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

// The pitch scale is a keyboard: a Scale with a key per semitone, each drawn from d.at to d.next.
const KeySlat = slat({
  room: { horizontal: { after: 50 }, vertical: { before: 60 } },
  css: `
    .key { --rhp-radius: 0 0 3px 3px; background: #efe6d2; }
    .black .key { background: #1b1916; box-shadow: inset 0 0 0 1px #3a342b; }
    [data-rhp-o="h"].key { top: calc(100% + 6px); height: 24px; translate: none; clip-path: inset(0 .5px); }
    [data-rhp-o="v"].key { left: auto; right: calc(100% + 6px); width: 24px; translate: none; clip-path: inset(.5px 0); --rhp-radius: 3px 0 0 3px; }
    .c { font-size: 10px; font-weight: 700; color: var(--rhp-muted); padding: 0; }
    [data-rhp-o="h"].c { top: calc(100% + 34px); translate: -2px 0; }
    [data-rhp-o="v"].c { left: auto; right: calc(100% + 34px); translate: 0 50%; }`,
}, (k) => (
  <div class={black(k.at) ? "black" : "white"}>
    <Bar from={k.at} to={k.next} class="key" />
    <Show when={k.at % 12 === 0}><Label at={k.at} class="c">C{k.at / 12 - 1}</Label></Show>
  </div>
));

const InstrumentSlat = slat({
  band: { horizontal: 74 },
  inset: 0.05,
  room: { horizontal: { start: 140, end: 16 }, vertical: { start: 30, end: 12 } },
  css: `
    .name { font: italic 600 17px/1 Fraunces, Georgia, serif; }
    [data-rhp-o="h"].name { padding-right: 16px; }
    [data-rhp-o="v"].name { font-size: 14px; }
    .body { fill: var(--rhp-color); stroke: rgb(0 0 0 / .5); stroke-width: 1px; }
    .string { background: var(--rhp-ink); opacity: .85; }
    .median { background: var(--rhp-ink); box-shadow: 0 0 0 2px var(--rhp-color); }`,
}, (d) => {
  const shape = createMemo(() => density(d.notes, { points: 48 })); // [[note, density], ...]
  const box = createMemo(() => summary(d.notes));
  return (
    <div>
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
  return (
    <Poster look="strings" kicker="Where the strings play" title="The string section" dek="Every note each instrument plays in one movement, by pitch, over a piano keyboard." note="Illustrative data.">
      <Chart orientation={p.o()} scale={[26, 102]} height={360} animate={p.js()} theme={HALL}>
        <Scale ticks={every(1)}>{KeySlat}</Scale>
        <Plot name={STRINGS} notes={notes()} peak={peak()} varnish={VARNISH}>{InstrumentSlat}</Plot>
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
  band: { horizontal: 26 },
  // day names at the start; hour numbers over the first row (horizontal) or left of the first column (vertical)
  room: { horizontal: { start: 40, before: 18 }, vertical: { start: 24, before: 30 } },
  css: `.hour { --rhp-label-size: 10px; color: var(--rhp-muted); }
    .hour[data-rhp-o="h"] { width: auto; }`,
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
  band: { horizontal: 80 },
  room: { horizontal: { start: 84, end: 76 }, vertical: { start: 30, end: 30 } },
  css: `
    .arm { font-size: 15px; font-weight: 700; }
    [data-rhp-o="h"].arm { padding-right: 14px; }
    .mean { background: var(--rhp-ink); --rhp-tick-width: 3px; border-radius: 2px; }
    .avg { font-size: 12px; font-weight: 700; color: var(--rhp-ink); }
    .avg small { display: block; font-size: 10.5px; font-weight: 500; color: var(--rhp-muted); }
    [data-rhp-o="h"].avg { padding-left: 12px; }`,
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
  band: { horizontal: 50 },
  room: { horizontal: { start: 124, end: 70 }, vertical: { start: 38, end: 34, after: 18 } },
  css: `
    .peak-name { font-size: 15px; font-weight: 800; letter-spacing: -0.01em; }
    .peak-name small { display: block; margin-top: 2px; font-size: 11px; font-weight: 500; color: var(--rhp-muted); }
    [data-rhp-o="h"].peak-name { padding-right: 14px; }
    [data-rhp-o="v"].peak-name { font-size: 10px; white-space: normal; line-height: 1.1; hyphens: auto; }
    [data-rhp-o="v"].peak-name small { display: none; }
    .route { --rhp-radius: 99px; }
    [data-rhp-o="h"].route { background: linear-gradient(90deg, #d9772b, #13293d); }
    [data-rhp-o="v"].route { background: linear-gradient(0deg, #d9772b, #13293d); }
    .tent { width: 16px; height: 13px; border-radius: 0; background: #d9772b; clip-path: polygon(50% 0, 100% 100%, 0 100%); }
    .summit { width: 24px; height: 20px; border-radius: 0; clip-path: polygon(50% 0, 100% 100%, 0 100%);
      background: linear-gradient(#fff 34%, #13293d 34%); }
    [data-rhp-o="h"].summit { translate: -50% -60%; }
    [data-rhp-o="v"].summit { translate: -50% 30%; }
    .height { font-size: 13px; font-weight: 800; font-variant-numeric: tabular-nums; }
    [data-rhp-o="h"].height { padding-left: 16px; }
    [data-rhp-o="v"].height { padding-bottom: 14px; font-size: 11px; }`,
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
const WATCH = { font: "system-ui, sans-serif", ink: "#f5f5f7", muted: "#8e8e93", grid: "#1f1f24", surface: "#0a0a0c" };

// A goal: the track to 120%, the day's progress glowing along it, and a white line at the goal (100%).
const GoalSlat = slat({
  band: { horizontal: 62 },
  room: { horizontal: { start: 134, end: 58 }, vertical: { start: 70, end: 30 } },
  css: `
    .habit { display: flex; align-items: center; gap: 10px; overflow: visible; font-size: 15px; font-weight: 700; }
    [data-rhp-o="h"].habit { justify-content: flex-end; padding-right: 18px; }
    [data-rhp-o="v"].habit { flex-direction: column; gap: 4px; padding-top: 10px; font-size: 12px; text-align: center; }
    .habit small { display: block; font-size: 11px; font-weight: 500; color: var(--rhp-muted); }
    .icon { flex: none; width: 30px; height: 30px; padding: 6px; border-radius: 50%; fill: var(--rhp-color);
      background: color-mix(in srgb, var(--rhp-color) 18%, transparent); }
    .track { background: #1c1c22; --rhp-radius: 99px; }
    .done { --rhp-radius: 99px; box-shadow: 0 0 14px color-mix(in srgb, var(--rhp-color) 55%, transparent); }
    [data-rhp-o="h"].done { background: linear-gradient(90deg, color-mix(in srgb, var(--rhp-color) 25%, transparent), var(--rhp-color)); }
    [data-rhp-o="v"].done { background: linear-gradient(0deg, color-mix(in srgb, var(--rhp-color) 25%, transparent), var(--rhp-color)); }
    .goal { background: #fff; --rhp-tick-width: 2px; border-radius: 2px; }
    .pct { font-size: 14px; font-weight: 800; font-variant-numeric: tabular-nums; }
    [data-rhp-o="h"].pct { padding-left: 14px; }`,
}, (d) => (
  <div style={{ "--rhp-color": d.color }}>
    <Label edge="start" class="habit">
      <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d={GLYPH[d.habit]} /></svg>
      <span>{d.habit}<small>{d.goal}</small></span>
    </Label>
    <Bar to={120} thick="12px" class="track" />
    <Bar to={Math.min(120, d.pct)} thick="12px" class="done" />
    <Tick at={100} thick="24px" class="goal" />
    <Label edge="end" class="pct">{Math.round(d.pct)}%</Label>
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
const pounds = (v) => (v < 0 ? "−" : "") + "£" + Math.abs(Math.round(v)).toLocaleString("en-GB");

// A step from the running total before it to the one after; a hairline links it to the next step.
const StepSlat = slat({
  band: { horizontal: 46 },
  room: { horizontal: { start: 100, end: 66 }, vertical: { start: 40, end: 26, after: 18 } },
  css: `
    .item { font-size: 14px; font-weight: 600; }
    [data-rhp-o="h"].item { padding-right: 14px; }
    [data-rhp-o="v"].item { font-size: 11px; white-space: normal; line-height: 1.1; hyphens: auto; }
    .step { --rhp-radius: 6px; }
    .amount { font-size: 12px; font-weight: 800; font-variant-numeric: tabular-nums; }
    .in .amount { color: #0b8a63; }
    .out .amount { color: #d2423f; }
    [data-rhp-o="h"].amount { padding-left: 8px; }
    [data-rhp-o="v"].amount { font-size: 10.5px; }
    .link { background: #b5bcc8; }
    [data-rhp-o="h"].link { width: 1px; top: calc(50% + 12px); height: 22px; translate: -50% 0; }
    [data-rhp-o="v"].link { height: 1px; left: calc(50% + 12px); width: calc(100% - 24px); translate: 0 50%; }`,
}, (d) => (
  <div class={d.total ? "total" : d.to >= d.from ? "in" : "out"}>
    <Label edge="start" class="item">{d.item}</Label>
    <Bar from={d.from} to={d.to} thick="24px" color={d.total ? "#1c2433" : d.to >= d.from ? "#12b886" : "#f25f5c"} class="step" />
    <Show when={!d.total}><Tick at={d.to} class="link" /></Show>
    <Label at={Math.max(d.from, d.to)} class="amount">{d.total ? pounds(d.to) : pounds(d.to - d.from)}</Label>
  </div>
));

export function Waterfall(p) {
  const month = createMemo(() => (p.seed() ? [rand(3800, 4600), -rand(1300, 1600), -rand(400, 650), -rand(100, 260), -rand(180, 300), -rand(150, 500)] : MONTH));
  const steps = createMemo(() => {
    const r = running(month()); // step k goes from the total before it to the total after it
    return { from: [...r.from, 0], to: [...r.to, r.to.at(-1)] };
  });
  return (
    <Poster look="budget" kicker="Monthly budget" title="Where the salary goes" dek={<><b>{pounds(steps().to.at(-1))}</b> left to save this month.</>}>
      <Chart orientation={p.o()} scale={[0, 5000]} ticks={[0, 1000, 2000, 3000, 4000, 5000]} format={(v) => (v ? "£" + v / 1000 + "k" : "0")} height={320} animate={p.js()} theme={FINTECH}>
        <Plot item={LINES} from={steps().from} to={steps().to} total={LINES.map((_, i) => i === LINES.length - 1)}>{StepSlat}</Plot>
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
    [data-rhp-o="h"].band { top: 0; height: 100%; translate: none; }
    [data-rhp-o="v"].band { left: 0; width: 100%; translate: none; }
    .month { font-size: 10.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--rhp-muted); padding: 0; }
    [data-rhp-o="h"].month { top: -20px; translate: 6px 0; }
    [data-rhp-o="v"].month { left: -34px; translate: 0 -4px; }
    @container (max-width: 360px) { .odd > [data-rhp-o="h"].month { display: none; } } /* a narrow plot names every other month */`,
}, (t) => (
  <div class={t.index % 2 ? "odd" : ""}>
    <Bar from={t.at} to={t.next} class="band" />
    <Show when={!t.last}><Label at={t.at} class="month">{MONTH_NAMES[t.index]}</Label></Show>
  </div>
));

// A trade on site: the whole job as a thin gray bar, the part done by today in site orange.
const TradeSlat = slat({
  band: { horizontal: 44 },
  room: { horizontal: { start: 116, end: 16 }, vertical: { start: 40, end: 10 } },
  css: `
    .trade { font-size: 14px; font-weight: 700; }
    .trade small { display: block; font-size: 10.5px; font-weight: 500; color: var(--rhp-muted); }
    [data-rhp-o="h"].trade { padding-right: 14px; }
    [data-rhp-o="v"].trade { font-size: 10px; white-space: normal; line-height: 1.1; hyphens: auto; }
    [data-rhp-o="v"].trade small { display: none; }
    .job { background: #d8d5cf; --rhp-radius: 99px; }
    .done { background: #ff5a1f; --rhp-radius: 99px; }`,
}, (d) => (
  <div>
    <Label edge="start" class="trade">{d.trade}<small>wk {Math.round(d.start)}–{Math.round(d.end)}</small></Label>
    <Bar from={d.start} to={d.end} thick="10px" class="job" />
    <Show when={d.start < TODAY}><Bar from={d.start} to={Math.min(TODAY, d.end)} thick="10px" class="done" /></Show>
  </div>
));

// Today: a line across the plot, named below it (horizontal; the months are above) or at its end (vertical).
const TodaySlat = slat({
  room: { horizontal: { after: 24 } },
  css: `.now { background: #ff5a1f; --rhp-tick-width: 2px; } .now-label { font-size: 10.5px; font-weight: 800; letter-spacing: .08em; color: #ff5a1f; padding: 0; }
    [data-rhp-o="h"].now-label { top: calc(100% + 6px); translate: -50% 0; } [data-rhp-o="v"].now-label { left: auto; right: 4px; translate: 0 -2px; }`,
}, () => <div><Tick at={TODAY} thick={1} class="now" /><Label at={TODAY} class="now-label">TODAY</Label></div>);

export function Gantt(p) {
  const plan = createMemo(() => (p.seed() ? PLAN.map(([a, b]) => { const s = Math.max(0, a + Math.round(rand(-2, 2))); return [s, Math.min(32, Math.max(s + 2, b + Math.round(rand(-2, 2))))]; }) : PLAN));
  return (
    <Poster look="drawing" kicker={`Building a house · week ${TODAY} of 32`} title="From plot to keys" dek="Each bar is a trade on site; the orange part is done.">
      <Chart orientation={p.o()} scale={[0, 32]} height={340} animate={p.js()} theme={DRAWING}>
        <Scale ticks={every(4)}>{MonthBandSlat}</Scale>
        <Plot trade={TRADES} start={plan().map((w) => w[0])} end={plan().map((w) => w[1])} key="trade" order={sortBy("start")}>{TradeSlat}</Plot>
        <Plot overlap slats={1}>{TodaySlat}</Plot>
      </Chart>
    </Poster>
  );
}
/*</show>*/

/*<show candles>*/
const SALMON = { font: "system-ui, sans-serif", ink: "#33302e", muted: "#66605c", grid: "#eadbcc", surface: "#fff1e5" };
const dollars = (v) => "$" + v.toFixed(v < 100 ? 2 : 0);

// A day: the wick over the day's range, the body from the open to the close; teal up, claret down.
const DaySlat = slat({
  band: { horizontal: 15 },
  room: { horizontal: { start: 24, end: 64 }, vertical: { start: 10, end: 10 } }, // the axis numbers read "$42.5"
  css: `
    .wick { background: #807973; }
    .body { --rhp-radius: 1px; }
    .last { font-size: 11.5px; font-weight: 800; color: #fff; padding: 2px 6px; border-radius: 3px; background: var(--rhp-color); font-variant-numeric: tabular-nums; }
    [data-rhp-o="h"].last { margin-left: 8px; }
    [data-rhp-o="v"].last { left: auto; right: 0; translate: 0 -8px; }`,
}, (d) => {
  const color = () => (d.close >= d.open ? "#0d7680" : "#990f3d");
  return (
    <div>
      <Bar from={d.low} to={d.high} thick="1.5px" class="wick" />
      <Bar from={d.open} to={d.close} thick={0.72} color={color()} class="body" />
      <Show when={d.latest}><Label at={d.close} class="last" style={{ "--rhp-color": color() }}>{dollars(d.close)}</Label></Show>
    </div>
  );
});

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
  return (
    <Poster look="market" kicker="Share price · daily" title="A month on the market" dek="Each candle is a day: its body runs from the open to the close, its wick covers the day's range."
      note="Illustrative data.">
      <Chart orientation={p.o()} scale={[range().min, range().max]} ticks={range().ticks} format={(v) => "$" + v} height={300} animate={p.js()} theme={SALMON}>
        <Plot rows={days()}>{DaySlat}</Plot>
      </Chart>
    </Poster>
  );
}
/*</show>*/
