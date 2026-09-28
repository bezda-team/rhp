import { render } from "solid-js/web";
import { createSignal, batch } from "solid-js";
import { createStore } from "solid-js/store";
import { Plot, Scale, Chart, Bar, Dot, Label, Line, sortBy, cycle, every, slat, restyle } from "../src/index.js";
import { framesDrawn, whenStill } from "../src/animate.js";
const T = (window.T = {});
// Keyed and unkeyed removal
const [rows, setRows] = createSignal([{ name: "A", v: 10 }, { name: "B", v: 20 }, { name: "C", v: 30 }]);
T.seen = { keyed: [], plain: [] };
const Row = (tag) => (d) => { const el = <div data-name={d.name}><Bar to={d.v} /><Label at={d.v}>{(T.seen[tag].push(d.name + ":" + Math.round(d.v)), Math.round(d.v))}</Label></div>; return el; };
// Row count, hidden rows and late data
const [late, setLate] = createSignal();
const [pos, setPos] = createSignal([2, null, 0, 1]);
// Computed groups
T.computed = 0;
const [vals, setVals] = createStore({ v: [5, 7, 9] });
// A Scale
const [top, setTop] = createSignal(27);
const Tk = (t) => <div class="tk" data-at={t.at} data-next={t.next} data-end={t.first ? "first" : t.last ? "last" : ""} />;
// restyle
const SAME = `.r { color: rgb(255, 0, 0); }`;
const Red = slat({ css: SAME }, () => <div class="r">a</div>);
const Twin = slat({ css: SAME }, () => <div class="r twin">b</div>);
// Orientation in slat CSS
const Turned = slat({ css: `
.o:horizontal { color: rgb(0, 128, 0); }
.o:vertical { color: rgb(0, 0, 128); }
.o:vertical .inner { color: rgb(1, 2, 3); }
.b { --rhp-start-radius: 0px; --rhp-end-radius: 7px; background-image: linear-gradient(var(--rhp-toward-end), red, blue); }
.l { --rhp-label-gap: 11px; }
.b { --rhp-gap: 3px; }
` }, (d) => <div class="o"><span class="inner">x</span><Bar class="b" from={d.from} to={d.to} /><Label class="l" at={d.to}>v</Label></div>);
// Static charts
const [still, setStill] = createSignal([5, 9]);
// classList, a format that returns elements, --rhp-p and --rhp-lo, and the --rhp-radius warning
const [lit, setLit] = createSignal(true);
const Placed = slat({ css: `
.pin { position: absolute; left: calc(var(--rhp-p) * 100%); }
.from { position: absolute; left: calc(var(--rhp-lo) * 100%); }
` }, (d) => <div><Bar from={2} to={d.v} class="kb" classList={{ lit: lit() }} /><Dot at={d.v} size="4px"><i class="pin" /></Dot><Bar from={2} to={d.v}><i class="from" /></Bar></div>);
// A chart with a height fits its rows
const Fit = (d) => <div class="fit"><Bar to={d.v} /></div>;
const Fixed = slat({ thickness: 20 }, (d) => <div class="fix"><Bar to={d.v} /></div>);
// When writes land
const [paced, setPaced] = createSignal(1);
// Edge labels with room "auto": a child of the row, one inside another element, and one of a Plot inside the row
const Direct = slat({ room: "auto" }, (d) => <div><Label edge="start">{d.n}</Label><Bar to={d.v} /></div>);
const Wrapped = slat({ room: "auto" }, (d) => <div><span><Label edge="start">{d.n}</Label></span><Bar to={d.v} /></div>);
const Inner = slat({ room: "auto" }, (d) => <div><Label edge="start">{d.n}</Label><Plot overlap part={[1, 2]}>{(q) => <div><Label edge="start">{q.part}</Label></div>}</Plot></div>);
// A second axis: Dots at (x, y), a Label at a point and a Line on a cross scale, each way; and a Line in a plain row
const Point = (d) => <div><Dot at={d.x} cross={d.y} size="6px" class="pt" /><Label at={d.x} cross={d.y} class="pl">{d.y}</Label></div>;
const Trend = (d) => <div><Line points={d.pts} class="tl" /></div>;
const Spark = (d) => <div class="sp"><Line points={d.pts} class="sl" /></div>;
const edges = (Row) => render(() => <Chart scale={[0, 10]}><Plot n={["a", "b"]} v={[3, 7]}>{Row}</Plot></Chart>, document.body.appendChild(document.createElement("div")));
render(() => (
  <div>
    <Chart scale={[0, 40]}><Plot class="keyed" key="name" rows={rows()} animate={["v"]}>{Row("keyed")}</Plot></Chart>
    <Chart scale={[0, 40]}><Plot class="plain" rows={rows()} animate={["v"]}>{Row("plain")}</Plot></Chart>
    <Chart><Plot color={["red", "blue"]} value={[1, 2, 3, 4, 5]}>{(d) => <div class="cnt"><Bar to={d.value} color={d.color} /></div>}</Plot></Chart>
    <Chart><Plot value={late()}>{(d) => <div class="late"><Bar to={d.value} /></div>}</Plot></Chart>
    <Chart><Plot name={["a", "b", "c", "d"]} order={pos()}>{(d) => <div class="hid" data-n={d.name}>{d.name}</div>}</Plot></Chart>
    <Chart><Plot v={vals.v} double={(d) => (T.computed++, d.v * 2)}>{(d) => <div class="cmp"><Bar to={d.double} /><Label at={d.double}>{d.double}</Label></div>}</Plot></Chart>
    <Chart><Plot reorder="move" name={["a", "b", "c"]} v={[1, 3, 2]} order={sortBy("v", "desc")}>{(d) => <div class="mv">{d.name}</div>}</Plot></Chart>
    <Chart><Plot name={["a", "b", "c", "d"]} v={[5, 5, 9, 5]} order={sortBy("v", "desc")}>{(d) => <div class="tie" data-n={d.name}>{d.name}</div>}</Plot></Chart>
    <Chart class="sc" scale={[0, top()]}><Scale ticks={every(5, { ends: true })}>{Tk}</Scale><Plot v={[3]}>{(d) => <div><Bar to={d.v} /></div>}</Plot></Chart>
    <Chart class="nosc" scale={[0, 10]}><Plot v={[3]}>{(d) => <div><Bar to={d.v} /></div>}</Plot></Chart>
    <Chart class="rs"><Plot slats={1}>{Red}</Plot></Chart>
    <Chart class="rs"><Plot slats={1}>{Twin}</Plot></Chart>
    <Chart class="or-h" scale={[0, 10]}><Plot from={[0, 10]} to={[6, 2]}>{Turned}</Plot></Chart>
    <Chart class="or-v" orientation="vertical" scale={[0, 10]}><Plot from={[0, 10]} to={[6, 2]}>{Turned}</Plot></Chart>
    <Chart class="st" static scale={[0, 20]}>
      <Plot name={["a", "b"]} v={still()} order={sortBy("v", "desc")}>
        {(d) => <div class="sr" data-n={d.name}><Bar to={d.v} /><Label at={d.v}>{d.v}</Label><Plot overlap part={[1, 2]}>{(q) => <Dot at={q.part} class="sd" />}</Plot></div>}
      </Plot>
    </Chart>
    <Chart class="kept" scale={[0, 10]} ticks={[0, 5, 10]} format={(v) => <b class="fmt">{v}</b>}><Plot v={[8]}>{Placed}</Plot></Chart>
    <Chart class="fits" height={200} ticks={false}><Plot v={[1, 2, 3, 4]}>{Fit}</Plot></Chart>
    <Chart class="grows" ticks={false}><Plot v={[1, 2, 3, 4]}>{Fit}</Plot></Chart>
    <Chart class="keeps" height={200} ticks={false}><Plot v={[1, 2, 3, 4]}>{Fixed}</Plot></Chart>
    <Chart class="paced" scale={[0, 100]}><Plot v={[paced()]}>{(d) => <div><Bar to={d.v} /></div>}</Plot></Chart>
    {["horizontal", "vertical"].map((o) => (
      <Chart class={"xy xy-" + o[0]} orientation={o} scale={[0, 10]} cross={[0, 100]} height={200} ticks={[0, 5, 10]} crossTicks={[0, 50, 100]}>
        <Plot overlap x={[0, 5, 10]} y={[0, 50, 100]}>{Point}</Plot>
        <Plot overlap pts={[[[0, 0], [10, 100]]]}>{Trend}</Plot>
      </Chart>
    ))}
    <Chart class="spark" scale={[0, 10]} ticks={false}><Plot pts={[[[0, 1], [5, 4], [10, 2]]]}>{Spark}</Plot></Chart>
  </div>
), document.body);
Object.assign(T, { setLit, slat, setStill, setPaced, setRows, setLate, setPos, setVals, setTop, framesDrawn, whenStill, restyle, Red, edges, Direct, Wrapped, Inner });
