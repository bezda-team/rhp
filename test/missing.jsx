// The page for the missing data tests (missing-run.mjs): every block given each kind of missing value, outlines with
// gaps, values that go missing and come back in both versions, and a keyed chart that is sorted and filtered.
import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { Chart, Plot, Bar, Dot, Tick, Label, Cell, Place, Area, Line, sortBy } from "../src/index.js";

const KINDS = ["null", "undefined", "NaN", "Infinity", "-Infinity", "zero", "five"];
const VALUES = [null, undefined, NaN, Infinity, -Infinity, 0, 5];

// Every block reading one value, and blocks that keep their defaults or are named only at an edge
const Probe = (d) => (
  <div data-kind={d.kind}>
    <Label edge="start" class="name">{d.kind}</Label>
    <Bar to={d.v} class="bar" />
    <Bar from={d.v} to={5} class="from" />
    <Bar to={d.v} title="extra props" class="spread" />
    <Bar class="bare" />
    <Dot at={d.v} class="dot" />
    <Tick at={d.v} class="tick" />
    <Label at={d.v} class="label">L</Label>
    <Label edge="end" class="edge">{String(d.v)}</Label>
    <Place at={d.v} class="place"><b>P</b></Place>
    <Cell value={d.v} class="cell" />
  </div>
);

// On a cross scale, the y can be missing too
const Point = (d) => (
  <div data-kind={d.kind}>
    <Dot at={1} cross={d.v} class="dot" />
    <Label at={1} cross={d.v} class="label">L</Label>
    <Place at={1} cross={d.v} class="place"><b>P</b></Place>
  </div>
);

const GAP = [[0, 2], [1, 6], [2, null], [3, 8], [4, 5]];
const WHOLE = [[0, 2], [1, 6], [2, 4], [3, 8], [4, 5]];
const MOVED = [[0, 2], [1, 6], [2, null], [3, 8], [4, 9]]; // a gap that opens while another point moves
const [shapePoints, setShapePoints] = createSignal(GAP);
const Shapes = () => (
  <div>
    <Line points={GAP} class="gap" />
    <Line points={[[0, 2], [1, 6], null, [3, 8], [4, 5]]} class="null-point" />
    <Line points={[[0, 2], [NaN, 6], [2, 3], [3, 8], [4, 5]]} class="lone-start" />
    <Line points={[[0, 2], [1, Infinity], [2, 3]]} class="lone-both" />
    <Line points={WHOLE} class="whole" />
    <Line points={MOVED} class="moved" />
    <Line points={[[1, 2], [2, 6], [undefined, 9], [3, 8]]} class="box" />
    <Line points={GAP} fill class="fill" />
    <Line points={shapePoints()} class="moving" />
  </div>
);
const Spread = () => (
  <div>
    <Area points={GAP} class="area" />
    <Area points={GAP} mirror class="mirror" />
    <Area points={[[0, 2], [1, 9], [2, null], [3, 4]]} class="peak" />
  </div>
);

// One value that goes missing and comes back, in the JS version and in the CSS version
const [jsValue, setJsValue] = createSignal(10);
const [cssValue, setCssValue] = createSignal(10);
const [toggled, setToggled] = createSignal(5);
const One = (d) => <div><Bar to={d.v} class="one" /></div>;

// Cities in no order, with missing values, keyed, sorted, filtered, and named in each slat's tooltip
const CITIES = [
  { city: "Pune", v: 7 }, { city: "Lima", v: null }, { city: "Oslo", v: 12 }, { city: "Kyiv", v: NaN },
  { city: "Rome", v: 18 }, { city: "Baku", v: undefined }, { city: "Doha", v: 3 }, { city: "Quito", v: 0 },
];
const shown = (v) => (Number.isFinite(v) ? String(v) : "no data");
const [rows, setRows] = createSignal(CITIES);
const [direction, setDirection] = createSignal("desc");
const City = (d) => (
  <div data-city={d.city} title={`${d.city}: ${shown(d.v)}`}>
    <Label edge="start" class="name">{d.city}</Label>
    <Bar to={d.v} class="bar" />
    <Label at={d.v} class="value">{shown(d.v)}</Label>
  </div>
);

render(() => (
  <>
    <Chart scale={[0, 10]} class="probe"><Plot kind={KINDS} v={VALUES}>{Probe}</Plot></Chart>
    <Chart scale={[0, 10]} cross={[0, 10]} height={120} class="points"><Plot overlap kind={KINDS} v={VALUES}>{Point}</Plot></Chart>
    <Chart scale={[0, 10]} class="toggled"><Plot v={[toggled()]}>{One}</Plot></Chart>
    <Chart scale={[0, 4]} cross={[0, 10]} height={120} style={{ "--rhp-length-time": "1s" }} class="shapes"><Plot overlap slats={1}>{Shapes}</Plot></Chart>
    <Chart scale={[0, 4]} class="spread"><Plot slats={1}>{Spread}</Plot></Chart>
    <Chart scale={[0, 20]} animate={{ duration: 1000 }} class="js"><Plot v={[jsValue()]}>{One}</Plot></Chart>
    <Chart scale={[0, 20]} style={{ "--rhp-length-time": "1s" }} class="css"><Plot v={[cssValue()]}>{One}</Plot></Chart>
    <Chart scale={[0, 20]} style={{ "--rhp-slide-time": "0s" }} class="cities">
      <Plot rows={rows()} key="city" order={sortBy("v", direction())}>{City}</Plot>
    </Chart>
  </>
), document.body);

window.T = { KINDS, VALUES, CITIES, WHOLE, GAP, MOVED, setShapePoints, setJsValue, setCssValue, setToggled, setRows, setDirection };
