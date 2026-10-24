// The charts the benchmark draws. Every value comes from a formula of its index (no generator, seeded or not), so
// every variant and every run draws exactly the same thing.
import { render } from "solid-js/web";
import { createSignal } from "solid-js";
import { Chart, Plot, Bar, Label, Dot, Cell, Line, ManyDots, slat } from "rhp";

const names = (n) => Array.from({ length: n }, (_, i) => "Item " + (i + 1));
const values = (n, t = 0) => Array.from({ length: n }, (_, i) => 10 + ((i * 37 + t * 11) % 80));
// The same bars with 1 value for all, or with every value different (to see what values that repeat save)
const VALUES = { 1: (n) => Array(n).fill(50), 1000: (n) => Array.from({ length: n }, (_, i) => +(10 + ((i * 37) % 1000) * 0.08).toFixed(2)) };
// Points spread over the square by the golden ratio and the plastic number (a fixed pattern, not a random one)
const points = (n) => Array.from({ length: n }, (_, i) => ({ x: ((i * 0.6180339887498949) % 1) * 100, y: ((i * 0.7548776662466927) % 1) * 100 }));
const wave = (n) => Array.from({ length: n }, (_, i) => [i, Math.sin(i / 50) * 1.4 + Math.sin(i / 7) * 0.3]);

// A bar chart: a name, a bar and its value per row (the bench's chart)
function bars({ n, thickness, animate, still, distinct }) {
  return (el) => {
    const [vals, setVals] = createSignal(distinct ? VALUES[distinct](n) : values(n));
    const [scale, setScale] = createSignal([0, 100]);
    const [order, setOrder] = createSignal(null);
    const Row = slat({ thickness }, (d) => (
      <div>
        <Label edge="start">{d.name}</Label>
        <Bar to={d.value} />
        <Label at={d.value}>{d.value}</Label>
      </div>
    ));
    const list = names(n);
    const dispose = render(() => (
      <Chart scale={scale()} animate={animate} static={still}>
        <Plot name={list} value={vals()} order={order()}>{Row}</Plot>
      </Chart>
    ), el);
    return {
      dispose,
      update(kind, t) {
        // sort: every row trades places (reversed), then back, so every slat root gets a new --rhp-position
        if (kind === "sort") return setOrder(t % 2 ? null : Array.from({ length: n }, (_, i) => n - 1 - i));
        if (kind === "one") {
          const v = vals().slice();
          v[n >> 1] = t % 2 ? 30 : 70;
          setVals(v);
        } else if (kind === "all") {
          setVals(values(n, t + 1));
        } else if (kind === "scale") {
          setScale(t % 2 ? [0, 100] : [0, 150]);
        }
      },
    };
  };
}

// Bars whose slat CSS reads --rhp-position inside the slat (on the name), as the docs' radial bars do
function positioned({ n }) {
  return (el) => {
    const Row = slat({ thickness: 8, css: ".n { translate: calc(var(--rhp-position) * -0.004px) -50%; }" }, (d) => (
      <div>
        <Label edge="start" class="n">{d.name}</Label>
        <Bar to={d.value} />
        <Label at={d.value}>{d.value}</Label>
      </div>
    ));
    const list = names(n);
    const dispose = render(() => (
      <Chart scale={[0, 100]}>
        <Plot name={list} value={values(n)}>{Row}</Plot>
      </Chart>
    ), el);
    return { dispose };
  };
}

// A heatmap whose slat CSS reads --rhp-position on the cells of the Plot inside each row: there it is the cell's column
function nestedPositioned({ rows, cols }) {
  return (el) => {
    const days = Array.from({ length: rows }, (_, i) => "Day " + (i + 1));
    const hours = days.map((_, r) => Array.from({ length: cols }, (_, c) => (r * 13 + c * 29) % 100));
    const Hour = (h) => <div><Cell value={h.v} class="cell" /></div>;
    const Day = slat({ thickness: { horizontal: 12 }, room: { start: 48 }, css: ".cell { opacity: calc(0.3 + var(--rhp-position) * 0.03); }" }, (d) => (
      <div>
        <Label edge="start">{d.day}</Label>
        <Plot orientation="across" v={d.hours}>{Hour}</Plot>
      </div>
    ));
    const dispose = render(() => (
      <Chart scale={[0, 100]} ticks={false}>
        <Plot day={days} hours={hours}>{Day}</Plot>
      </Chart>
    ), el);
    return { dispose };
  };
}

// k charts of n bars each, made at once (a dashboard)
function dashboard({ k, n }) {
  return (el) => {
    const Row = slat({ thickness: 24 }, (d) => (
      <div>
        <Label edge="start">{d.name}</Label>
        <Bar to={d.value} />
        <Label at={d.value}>{d.value}</Label>
      </div>
    ));
    const list = names(n);
    const dispose = render(() => Array.from({ length: k }, (_, c) => (
      <Chart scale={[0, 100]}>
        <Plot name={list} value={values(n, c)}>{Row}</Plot>
      </Chart>
    )), el);
    return { dispose };
  };
}

// A scatter plot of n Dots, each the root of its own slat (the scale bench's form)
function dots({ n }) {
  return (el) => {
    const pts = points(n);
    const Point = slat({}, (d) => <Dot at={d.x} cross={d.y} size="4px" />);
    const dispose = render(() => (
      <Chart scale={[0, 100]} cross={[0, 100]} height={400} static={true}>
        <Plot overlap={true} rows={pts}>{Point}</Plot>
      </Chart>
    ), el);
    return { dispose };
  };
}

function manyDots({ n }) {
  return (el) => {
    const pts = points(n);
    const dispose = render(() => (
      <Chart scale={[0, 100]} cross={[0, 100]} height={400} static={true}>
        <ManyDots rows={pts} at={(d) => d.x} cross={(d) => d.y} size="4px" />
      </Chart>
    ), el);
    return { dispose };
  };
}

// A heatmap: rows of cells across (the gallery's heatmap without its hour labels)
function heatmap({ rows, cols, unique }) {
  return (el) => {
    const days = Array.from({ length: rows }, (_, i) => "Day " + (i + 1));
    const hours = days.map((_, r) => Array.from({ length: cols }, (_, c) => (unique ? +(((r * 13 + c * 29) % 100) + ((r * cols + c) % 25) * 0.04).toFixed(2) : (r * 13 + c * 29) % 100)));
    const Hour = (h) => <div><Cell value={h.v} /></div>;
    const Day = slat({ thickness: { horizontal: 12 }, room: { start: 48 } }, (d) => (
      <div>
        <Label edge="start">{d.day}</Label>
        <Plot orientation="across" v={d.hours}>{Hour}</Plot>
      </div>
    ));
    const dispose = render(() => (
      <Chart scale={[0, 100]} ticks={false}>
        <Plot day={days} hours={hours}>{Day}</Plot>
      </Chart>
    ), el);
    return { dispose };
  };
}

function line({ n }) {
  return (el) => {
    const pts = wave(n);
    const Curve = slat({}, (d) => <Line points={d.points} />);
    const dispose = render(() => (
      <Chart scale={[0, n - 1]} cross={[-2, 2]} height={400} static={true}>
        <Plot overlap={true} points={[pts]}>{Curve}</Plot>
      </Chart>
    ), el);
    return { dispose };
  };
}

// Plain DOM, the same 1,000 rows by hand: the floor, and a check on how fast the machine is from round to round
function plain({ n }) {
  return (el) => {
    const root = document.createElement("div");
    root.style.cssText = "position:relative;font:12px system-ui;padding-left:104px";
    const vals = values(n);
    for (let i = 0; i < n; i++) {
      const row = document.createElement("div");
      row.style.cssText = "position:relative;height:8px";
      const name = document.createElement("span");
      name.style.cssText = "position:absolute;right:100%;padding-right:8px;white-space:nowrap";
      name.textContent = "Item " + (i + 1);
      const bar = document.createElement("div");
      bar.style.cssText = `position:absolute;left:0;top:18%;height:64%;width:${vals[i]}%;background:#2a78d6;border-radius:2px`;
      const num = document.createElement("span");
      num.style.cssText = `position:absolute;left:${vals[i]}%;padding-left:5px;white-space:nowrap`;
      num.textContent = vals[i];
      row.append(name, bar, num);
      root.append(row);
    }
    el.append(root);
    return { dispose: () => root.remove() };
  };
}

export const SCENARIOS = {
  bars20: bars({ n: 20, thickness: 24 }),
  bars1000: bars({ n: 1000, thickness: 8 }),
  bars1000js: bars({ n: 1000, thickness: 8, animate: true }),
  bars1000static: bars({ n: 1000, thickness: 8, still: true }),
  bars1000u1: bars({ n: 1000, thickness: 8, distinct: 1 }),
  positioned1000: positioned({ n: 1000 }),
  nestedPositioned: nestedPositioned({ rows: 20, cols: 24 }),
  bars1000u1000: bars({ n: 1000, thickness: 8, distinct: 1000 }),
  heat50u: heatmap({ rows: 50, cols: 50, unique: true }),
  dash50: dashboard({ k: 50, n: 7 }),
  dots1000: dots({ n: 1000 }),
  dots10k: dots({ n: 10000 }),
  manydots10k: manyDots({ n: 10000 }),
  heat50: heatmap({ rows: 50, cols: 50 }),
  line100k: line({ n: 100000 }),
  plain1000: plain({ n: 1000 }),
};
