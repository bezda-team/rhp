// The gallery: every plot is one slat definition plus a Plot in a Chart.
// A slat owns its look and layout: its CSS, band, inset and gutter room travel with it, and its colors are
// theme keys. Nothing here reads the page's CSS; the page gives the charts a theme object (page.jsx).
// Each demo gets p.o() (orientation), p.js() (JS version on) and p.seed() (bumped by "New data").
// The code between show markers is what the page prints under each chart.
import { createSignal, createMemo, onCleanup, Show } from "solid-js";
import { Plot, Chart, Bar, Dot, Tick, Label, Cell, Area, slat, series, useOrientation, sortBy, nice, stackUp, shares, running, summary, bins, density } from "../../src/index.js";

// ── data helpers for the demos (not part of rhp) ──
const rand = (a, b) => a + Math.random() * (b - a);
const normal = (m, s) => m + s * Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
const normals = (n, m, s) => Array.from({ length: n }, () => normal(m, s));
const sum = (a) => a.reduce((x, y) => x + y, 0);
const signed = (v) => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(Math.round(v));
// Shared by the demos' slats: a soft highlight on the hovered slat, in theme colors.
const HOVER = `.slat:hover { background: color-mix(in srgb, var(--rhp-ink) 6%, transparent); border-radius: 4px; }`;

/*<show fruit>*/
const FRUITS = ["Apple", "Banana", "Cherry", "Grape", "Kiwi", "Lemon", "Orange"];
const ICONS = ["🍎", "🍌", "🍒", "🍇", "🥝", "🍋", "🍊"];

const FruitSlat = slat({
  band: 32, // px per fruit along the stack
  room: { horizontal: { start: 104, end: 44 }, vertical: { start: 28, end: 20 } }, // for the names and values
  css: HOVER + `
    .icon { position: absolute; font-size: 13px; line-height: 1; }
    [data-rhp-o="h"] > .icon { right: 2px; top: 50%; translate: 0 -50%; }
    [data-rhp-o="v"] > .icon { top: 3px; left: 50%; translate: -50% 0; }`,
}, (d) => (
  <div class="slat">
    <Label edge="start">{d.name}</Label>
    <Bar to={d.value} color={d.color}><span class="icon">{d.icon}</span></Bar>
    <Label at={d.value}>{Math.round(d.value)}</Label>
  </div>
));

export function Fruit(p) {
  const values = createMemo(() => (p.seed(), FRUITS.map(() => Math.round(rand(2, 30)))));
  const [ranked, setRanked] = createSignal(true);
  return (
    <>
      <button class="mini" onClick={() => setRanked(!ranked())}>{ranked() ? "Show initial order" : "Rank"}</button>
      <Chart orientation={p.o()} scale={[0, 30]} animate={p.js()}>
        <Plot name={FRUITS} icon={ICONS} value={values()} color={series()}
          order={ranked() ? sortBy("value", "desc") : undefined}>{FruitSlat}</Plot>
      </Chart>
    </>
  );
}
/*</show>*/

/*<show tutorial>*/
const TutorialSlat = slat({
  css: HOVER + `
    .value { opacity: 0; transition: opacity .15s, left .15s, bottom .15s; }
    .slat:hover .value { opacity: 1; }`,
}, (d) => (
  <div class="slat">
    <Label edge="start">{d.label}</Label>
    <Bar to={d.value} color={d.color} />
    <Label at={d.value} class="value">{Math.round(d.value)}</Label>
  </div>
));

export function Tutorial(p) {
  const values = createMemo(() => (p.seed(), [10, 4, 6, 7].map((v) => Math.max(1, Math.round(v + rand(-3, 3))))));
  return (
    <Chart orientation={p.o()} scale={[0, 14]} animate={p.js()}>
      <Plot label={["North", "East", "South", "West"]} value={values()} color={["series-5", "series-6"]}>{TutorialSlat}</Plot>
    </Chart>
  );
}
/*</show>*/

/*<show clouds>*/
// [name, typical base altitude in km, spread]
const CLOUDS = [["Cirrus", 9, 1.3], ["Cirrostratus", 7.5, 1], ["Altocumulus", 4.5, 0.9], ["Altostratus", 4, 1.1],
  ["Nimbostratus", 2, 0.8], ["Stratocumulus", 1.4, 0.5], ["Cumulus", 1.6, 0.6], ["Stratus", 0.8, 0.35]];

const BoxSlat = slat({
  css: HOVER + `
    .box { background: color-mix(in srgb, var(--rhp-series-1) 20%, var(--rhp-surface)); border: 1.5px solid var(--rhp-series-1); }
    .median { --rhp-tick-width: 3px; }
    .outlier { background: transparent; border: 1.5px solid var(--rhp-series-2); }`,
}, (d) => (
  <div class="slat">
    <Label edge="start">{d.name}</Label>
    <Bar from={d.box.low} to={d.box.high} thick="2px" color="muted" />
    <Tick at={d.box.low} thick={0.36} color="muted" />
    <Tick at={d.box.high} thick={0.36} color="muted" />
    <Bar from={d.box.q1} to={d.box.q3} thick={0.64} class="box" />
    <Tick at={d.box.median} thick={0.64} color="series-1" class="median" />
    <Plot overlap at={d.box.outliers}>{(o) => <Dot at={o.at} size="5px" class="outlier" />}</Plot>
  </div>
));

export function Clouds(p) {
  const boxes = createMemo(() => (p.seed(), CLOUDS.map(([, km, s]) => summary(normals(40, km, s).map((v) => Math.max(0.1, v))))));
  return (
    <Chart orientation={p.o()} scale={[0, 14]} format={(v) => v + " km"} animate={p.js()}>
      <Plot name={CLOUDS.map((c) => c[0])} box={boxes()} key="name"
        order={sortBy((d) => d.box.median, "desc")}>{BoxSlat}</Plot>
    </Chart>
  );
}
/*</show>*/

/*<show dots>*/
const ART = [ // 9 rows of 30 dots; # is lit
  "..............................",
  "........#.....................",
  "........#.....................",
  "..#.##..#.##....#.##..........",
  "..##....##..#...##..#.........",
  "..#.....#...#...#...#.........",
  "..#.....#...#...##.#..........",
  "................#.............",
  "................#.............",
];

const DotRow = slat({
  band: { horizontal: 15 }, // vertical: the rows share the width
  room: { start: 6, end: 6 },
  css: `
    .row { --rhp-length-time: 1s; --rhp-length-ease: ease-in-out; }
    .lit { background: var(--rhp-series-2); }
    .dim { background: var(--rhp-grid); }`,
}, (d) => (
  <div class="row">
    <Plot overlap lit={[...d.art]} x={(c) => d.offset + c.index}>
      {(c) => <Dot at={c.x} size="7px" class={c.lit === "#" ? "lit" : "dim"} />}
    </Plot>
  </div>
));

export function Dots(p) {
  const shuffled = () => ART.map(() => Math.round(rand(0, 10)));
  const [offsets, setOffsets] = createSignal(ART.map(() => 5));
  const [paused, setPaused] = createSignal(false);
  const timer = setInterval(() => paused() || setOffsets(shuffled()), 1500);
  onCleanup(() => clearInterval(timer));
  return (
    <div onMouseEnter={() => (setPaused(true), setOffsets(ART.map(() => 5)))} onMouseLeave={() => setPaused(false)}>
      <Chart orientation={p.o()} scale={[0, 40]} ticks={false} height={256} animate={p.js() && { duration: 1000 }}>
        <Plot art={ART} offset={offsets()}>{DotRow}</Plot>
      </Chart>
    </div>
  );
}
/*</show>*/

/*<show grouped>*/
const REGIONS = ["North", "East", "South", "West"];
const YEARS = ["2023", "2024", "2025"];

const YearBar = slat({ inset: 0.08 }, (s) => <div><Bar to={s.value} color={s.color} /></div>);

const GroupSlat = slat({ band: { horizontal: 54 }, css: HOVER }, (d) => (
  <div class="slat">
    <Label edge="start">{d.name}</Label>
    <Plot thick={0.8} value={d.values} color={series()}>{YearBar}</Plot>
  </div>
));

export function Grouped(p) {
  const values = createMemo(() => (p.seed(), REGIONS.map(() => YEARS.map(() => Math.round(rand(8, 40))))));
  return (
    <Chart orientation={p.o()} scale={[0, 40]} animate={p.js()}>
      <Plot name={REGIONS} values={values()}>{GroupSlat}</Plot>
    </Chart>
  );
}
/*</show>*/

/*<show stacked>*/
const StackSlat = slat({ css: HOVER }, (d) => {
  const seg = createMemo(() => stackUp(d.values)); // { from: [...], to: [...] }, one memo per slat
  return (
    <div class="slat">
      <Label edge="start">{d.name}</Label>
      <Plot overlap from={seg().from} to={seg().to} color={series()}>
        {(s) => <Bar from={s.from} to={s.to} color={s.color} />}
      </Plot>
      <Label at={seg().to.at(-1)}>{Math.round(seg().to.at(-1))}</Label>
    </div>
  );
});

export function Stacked(p) {
  const values = createMemo(() => (p.seed(), REGIONS.map(() => YEARS.map(() => Math.round(rand(5, 38))))));
  return (
    <Chart orientation={p.o()} scale={[0, 120]} animate={p.js()}>
      <Plot name={REGIONS} values={values()} key="name" order={sortBy((d) => d.values.reduce((a, b) => a + b), "desc")}>{StackSlat}</Plot>
    </Chart>
  );
}
/*</show>*/

/*<show segmented>*/
const ShareSlat = slat({
  css: HOVER + `
    .inside { position: absolute; inset: 0; display: grid; place-items: center; font-size: 11px; font-weight: 600;
      color: #fff; overflow: hidden; white-space: nowrap; }`,
}, (d) => {
  const seg = createMemo(() => stackUp(shares(d.values))); // each value as a share of 100
  return (
    <div class="slat">
      <Label edge="start">{d.name}</Label>
      <Plot overlap from={seg().from} to={seg().to} color={series()}>
        {(s) => <Bar from={s.from} to={s.to} color={s.color}><span class="inside">{Math.round(s.to - s.from)}%</span></Bar>}
      </Plot>
    </div>
  );
});

export function Segmented(p) {
  const values = createMemo(() => (p.seed(), REGIONS.map(() => YEARS.map(() => rand(5, 40)))));
  return (
    <Chart orientation={p.o()} scale={[0, 100]} format={(v) => v + "%"} animate={p.js()}>
      <Plot name={REGIONS} values={values()}>{ShareSlat}</Plot>
    </Chart>
  );
}
/*</show>*/

/*<show units>*/
const UNIT = 5;
const UnitSlat = slat({
  css: HOVER + `
    [data-rhp-o="h"].unit { clip-path: inset(0 1.5px); }
    [data-rhp-o="v"].unit { clip-path: inset(1.5px 0); }`,
}, (d) => (
  <div class="slat">
    <Label edge="start">{d.name}</Label>
    <Plot overlap slats={Math.ceil(d.value / UNIT)}
      from={(u) => u.index * UNIT} to={(u) => Math.min(d.value, (u.index + 1) * UNIT)}>
      {(u) => <Bar from={u.from} to={u.to} class="unit" />}
    </Plot>
    <Label at={d.value}>{Math.round(d.value)}</Label>
  </div>
));

export function Units(p) {
  const values = createMemo(() => (p.seed(), REGIONS.map(() => rand(6, 48))));
  return (
    <Chart orientation={p.o()} scale={[0, 50]} animate={p.js()}>
      <Plot name={REGIONS} value={values()}>{UnitSlat}</Plot>
    </Chart>
  );
}
/*</show>*/

/*<show pyramid>*/
const AGES = ["0–9", "10–19", "20–29", "30–39", "40–49", "50–59", "60–69", "70–79", "80+"];

const PyramidSlat = slat({ css: HOVER }, (d) => (
  <div class="slat">
    <Label edge="start">{d.age}</Label>
    <Bar from={-d.male} to={0} color="series-1" />
    <Bar from={0} to={d.female} color="series-4" />
    <Label at={-d.male} side="before">{d.male.toFixed(1)}</Label>
    <Label at={d.female}>{d.female.toFixed(1)}</Label>
  </div>
));

export function Pyramid(p) {
  const people = createMemo(() => (p.seed(), AGES.map((_, i) => Math.max(0.6, 7.5 - i * 0.55 + rand(-1, 1)))));
  const women = createMemo(() => people().map((v) => v * rand(0.9, 1.15)));
  const oldestFirst = AGES.map((_, i) => AGES.length - 1 - i); // position of each row: order is data
  return (
    <Chart orientation={p.o()} scale={[-10, 10]} format={(v) => Math.abs(v) + "%"} animate={p.js()}>
      <Plot age={AGES} male={people()} female={women()}
        order={p.o() === "horizontal" ? oldestFirst : undefined}>{PyramidSlat}</Plot>
    </Chart>
  );
}
/*</show>*/

/*<show diverging>*/
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];

const NetSlat = slat({ css: HOVER }, (d) => (
  <div class="slat">
    <Label edge="start">{d.month}</Label>
    <Bar to={d.net} color={d.net < 0 ? "negative" : "positive"} />
    <Label at={d.net} side={d.net < 0 ? "before" : undefined}>{signed(d.net)}</Label>
  </div>
));

export function Diverging(p) {
  const net = createMemo(() => (p.seed(), MONTHS.map(() => Math.round(rand(-40, 45)))));
  return (
    <Chart orientation={p.o()} scale={[-50, 50]} animate={p.js()}>
      <Plot month={MONTHS} net={net()}>{NetSlat}</Plot>
    </Chart>
  );
}
/*</show>*/

/*<show histogram>*/
const BinSlat = slat({
  band: { horizontal: 17 },
  inset: "1px", // bins touch
  room: { horizontal: { start: 36, end: 8 }, vertical: { start: 22, end: 8 } },
  css: HOVER,
}, (d) => (
  <div class="slat">
    <Bar to={d.tally} />
    <Show when={d.index % 4 === 0}><Label edge="start">{d.x0}</Label></Show>
  </div>
));

export function Histogram(p) {
  const samples = createMemo(() => (p.seed(), normals(400, rand(40, 60), rand(9, 15))));
  const b = createMemo(() => bins(samples(), { domain: [0, 100], count: 20 })); // { x0, x1, tally }
  return (
    <Chart orientation={p.o()} scale={[0, nice(0, Math.max(...b().tally)).max]} animate={p.js()}>
      <Plot x0={b().x0} tally={b().tally}>{BinSlat}</Plot>
    </Chart>
  );
}
/*</show>*/

/*<show stem>*/
const StemSlat = slat({ band: { horizontal: 13 }, room: { start: 8, end: 8 } }, (d) => (
  <div class="slat">
    <Bar to={d.y} thick="2px" />
    <Dot at={d.y} size="7px" />
  </div>
));

export function Stem(p) {
  const y = createMemo(() => {
    p.seed();
    const w = rand(0.35, 0.7), decay = rand(8, 20);
    return Array.from({ length: 32 }, (_, k) => Math.cos(k * w) * Math.exp(-k / decay));
  });
  return (
    <Chart orientation={p.o()} scale={[-1, 1]} animate={p.js()}>
      <Plot y={y()}>{StemSlat}</Plot>
    </Chart>
  );
}
/*</show>*/

/*<show violin>*/
const ViolinSlat = slat({
  band: { horizontal: 54 },
  inset: 0.06,
  css: HOVER + `.median { background: var(--rhp-surface); border: 2px solid var(--rhp-ink); }`,
}, (d) => {
  const shape = createMemo(() => density(d.samples, { points: 48 })); // [[x, density], ...]
  const box = createMemo(() => summary(d.samples));
  return (
    <div class="slat">
      <Label edge="start">{d.name}</Label>
      <Area points={shape()} mirror peak={d.peak} color={d.color} />
      <Bar from={box().q1} to={box().q3} thick="5px" color="ink" />
      <Dot at={box().median} size="7px" class="median" />
    </div>
  );
});

export function Violin(p) {
  const samples = createMemo(() => (p.seed(), [0, 1, 2, 3].map((k) =>
    [...normals(50, 3 + k * 1.3 + rand(-0.6, 0.6), 0.9), ...normals(25, 5.5 + rand(-1, 1.5), 0.6)])));
  // One peak for every violin, so their widths compare: a value shared by all slats, not a list.
  const peak = createMemo(() => Math.max(...samples().flatMap((s) => density(s, { points: 48 }).map((q) => q[1]))));
  return (
    <Chart orientation={p.o()} scale={[0, 10]} animate={p.js()}>
      <Plot name={["Alpha", "Beta", "Gamma", "Delta"]} samples={samples()} peak={peak()} color={series()}>{ViolinSlat}</Plot>
    </Chart>
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
const spread = (i) => 0.15 + ((i * 0.618034) % 1) * 0.7; // a fixed place across the band per dot

const StripSlat = slat({ band: { horizontal: 51 }, css: HOVER + `.mean { --rhp-tick-width: 2.5px; }` }, (d) => (
  <div class="slat">
    <Label edge="start">{d.name}</Label>
    <Plot overlap at={d.samples}>{(s) => <Dot at={s.at} across={spread(s.index)} size="6px" color={d.color} />}</Plot>
    <Tick at={d.samples.reduce((a, b) => a + b) / d.samples.length} thick={0.9} color="ink" class="mean" />
  </div>
));

export function Strip(p) {
  const samples = createMemo(() => (p.seed(), [0, 1, 2].map((k) => normals(30, 30 + k * 18 + rand(-6, 6), rand(6, 11)))));
  return (
    <Chart orientation={p.o()} scale={[0, 100]} animate={p.js()}>
      <Plot name={["Control", "Dose A", "Dose B"]} samples={samples()} color={series()}>{StripSlat}</Plot>
    </Chart>
  );
}
/*</show>*/

/*<show range>*/
const COUNTRIES = ["Norway", "Chile", "Kenya", "Japan", "Peru", "Spain", "Ghana"];

const RangeSlat = slat({ css: HOVER }, (d) => (
  <div class="slat">
    <Label edge="start">{d.name}</Label>
    <Bar from={d.before} to={d.after} thick="3px" color="grid" />
    <Dot at={d.before} color="muted" />
    <Dot at={d.after} color="series-1" />
  </div>
));

export function Range(p) {
  const before = createMemo(() => (p.seed(), COUNTRIES.map(() => rand(20, 70))));
  const after = createMemo(() => before().map((v) => Math.min(98, v + rand(-8, 28))));
  return (
    <Chart orientation={p.o()} scale={[0, 100]} format={(v) => v + "%"} animate={p.js()}>
      <Plot name={COUNTRIES} before={before()} after={after()} key="name"
        order={sortBy((d) => d.after - d.before, "desc")}>{RangeSlat}</Plot>
    </Chart>
  );
}
/*</show>*/

/*<show bullet>*/
const KPIS = ["Revenue", "Profit", "Orders", "New users", "Retention"];

const shade = (k) => `color-mix(in srgb, var(--rhp-ink) ${k}%, var(--rhp-surface))`;
const BulletSlat = slat({
  inset: 0.12,
  css: HOVER + `.range { --rhp-radius: 0px; } .target { --rhp-tick-width: 3px; }`,
}, (d) => (
  <div class="slat">
    <Label edge="start">{d.name}</Label>
    <Bar to={120} color={shade(7)} class="range" />
    <Bar to={d.ranges[1]} color={shade(15)} class="range" />
    <Bar to={d.ranges[0]} color={shade(26)} class="range" />
    <Bar to={d.value} thick={0.3} color="ink" />
    <Tick at={100} thick={0.7} color="series-2" class="target" />
  </div>
));

export function Bullet(p) {
  const value = createMemo(() => (p.seed(), KPIS.map(() => rand(55, 118))));
  const ranges = KPIS.map(() => [rand(50, 65), rand(75, 90)]); // poor below the first, fair below the second
  return (
    <Chart orientation={p.o()} scale={[0, 120]} format={(v) => v + "%"} animate={p.js()}>
      <Plot name={KPIS} value={value()} ranges={ranges}>{BulletSlat}</Plot>
    </Chart>
  );
}
/*</show>*/

/*<show waterfall>*/
const STEPS = ["Start", "Sales", "Services", "Costs", "Tax", "Refunds", "End"];

const StepSlat = slat({ css: HOVER }, (d) => (
  <div class="slat">
    <Label edge="start">{d.step}</Label>
    <Bar from={d.from} to={d.to} color={d.total ? "muted" : d.to >= d.from ? "positive" : "negative"} />
    <Label at={Math.max(d.from, d.to)}>{d.total ? Math.round(d.to) : signed(d.to - d.from)}</Label>
  </div>
));

export function Waterfall(p) {
  const changes = createMemo(() => (p.seed(), [40, rand(20, 45), rand(10, 25), -rand(15, 40), -rand(5, 15), -rand(2, 10)]));
  const steps = createMemo(() => {
    const r = running(changes()); // step k goes from the total before it to the total after it
    return { from: [0, ...r.from.slice(1), 0], to: [r.to[0], ...r.to.slice(1), r.to.at(-1)] };
  });
  return (
    <Chart orientation={p.o()} scale={[0, 120]} animate={p.js()}>
      <Plot step={STEPS} from={steps().from} to={steps().to} total={[true, false, false, false, false, false, true]}>{StepSlat}</Plot>
    </Chart>
  );
}
/*</show>*/

/*<show gantt>*/
const TASKS = ["Research", "Design", "Prototype", "Tests", "Docs", "Launch"];

const TaskSlat = slat({ css: HOVER + `.task { background: color-mix(in srgb, var(--rhp-color) 35%, var(--rhp-surface)); }` }, (d) => (
  <div class="slat">
    <Label edge="start">{d.task}</Label>
    <Bar from={d.start} to={d.end} color={d.color} class="task" />
    <Bar from={d.start} to={d.start + (d.end - d.start) * d.done} thick={0.22} color="ink" />
  </div>
));

export function Gantt(p) {
  const start = createMemo(() => (p.seed(), TASKS.map((_, i) => Math.round(i * 4 + rand(-2, 3)))));
  const end = createMemo(() => start().map((s) => s + Math.round(rand(3, 9))));
  const TODAY = 14;
  return (
    <Chart orientation={p.o()} scale={[0, 32]} format={(v) => "d" + v} animate={p.js()}>
      <Plot task={TASKS} start={start()} end={end()} done={start().map((s) => Math.min(1, Math.max(0, (TODAY - s) / 6)))}
        color={series()} key="task" order={sortBy("start")}>{TaskSlat}</Plot>
      {/* a second Plot in the same Chart: one slat that spans the whole body */}
      <Plot overlap slats={1}>{() => <Tick at={TODAY} thick={1} color="negative" />}</Plot>
    </Chart>
  );
}
/*</show>*/

/*<show candles>*/
const CandleSlat = slat({ band: { horizontal: 14 }, room: { start: 8, end: 8 } }, (d) => (
  <div class="slat">
    <Bar from={d.low} to={d.high} thick="1.5px" color="muted" />
    <Bar from={d.open} to={d.close} thick={0.7} color={d.close >= d.open ? "positive" : "negative"} />
  </div>
));

export function Candles(p) {
  const days = createMemo(() => {
    p.seed();
    let price = 50;
    return Array.from({ length: 22 }, () => {
      const open = price, close = Math.max(20, open + rand(-6, 6));
      price = close;
      return { open, close, low: Math.min(open, close) - rand(0, 4), high: Math.max(open, close) + rand(0, 4) };
    });
  });
  return (
    <Chart orientation={p.o()} scale={[20, 80]} animate={p.js()}>
      <Plot rows={days()}>{CandleSlat}</Plot>
    </Chart>
  );
}
/*</show>*/
