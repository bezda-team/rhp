import { render } from "solid-js/web";
import { createSignal, createSelector, batch, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { Plot, Scale, Chart, Bar, Dot, Label, Line, Place, Area, Poster, shape, sortBy, cycle, every, slat, restyle } from "../src/index.js";
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
// aspect: what doesn't go with it is drawn when the test asks, so it can listen for the warnings first
const [asked, setAsked] = createSignal(false);
const Point = (d) => <div><Dot at={d.x} cross={d.y} size="6px" class="pt" /><Label at={d.x} cross={d.y} class="pl">{d.y}</Label></div>;
const Trend = (d) => <div><Line points={d.pts} class="tl" /></div>;
const Spark = (d) => <div class="sp"><Line points={d.pts} class="sl" /></div>;
// An Area's and a Line's outline, in the same box (x from 0 to 10) while their y changes
const [outline, setOutline] = createSignal([[0, 1], [5, 4], [10, 2]]);
const [outlineO, setOutlineO] = createSignal("horizontal");
const Outlined = (d) => <div><Area points={d.pts} mirror class="oa" /><Line points={d.pts} fill class="ol" /></div>;
// Keyboard: sorted rows that slide, move in the page or refill their slots, and a static Plot's rows
const [kbSlide, setKbSlide] = createSignal([3, 1, 2]);
const [kbMove, setKbMove] = createSignal([{ n: "a", v: 3 }, { n: "b", v: 1 }, { n: "c", v: 2 }]);
const [kbRefill, setKbRefill] = createSignal([3, 1, 2]);
const [kbStill, setKbStill] = createSignal([3, 1, 2]);
const Key = (d) => <div data-n={d.n}><Bar to={d.v} /></div>;
const Typed = (d) => <div data-n={d.n}><Bar to={d.v} /><input class="kbi" /></div>;
// One element for the row the reader is on (the pattern in the README): the tip is drawn for that row and for no other
const [onRow, setOnRow] = createSignal(null);
const isOnRow = createSelector(onRow);
const rowAt = (e) => { const el = e.target.closest("[data-row]"); return el ? +el.dataset.row : null; };
T.drawn = 0;
const Tip = slat({ thickness: 24, room: { start: 60, end: 30 } }, (d) => <div data-row={d.index} data-n={d.n}><Label edge="start" class="one-name">{d.n}</Label><Bar to={d.v} /><Show when={(T.drawn++, isOnRow(d.index))}><Label at={d.v} class="one-tip">{d.v}</Label></Show></div>);
// Place: no size, nothing drawn, and what a slat hangs inside it sits at its value
const Hung = slat({ css: `.spot > i { position: absolute; width: 9px; height: 9px; background: rgb(9, 9, 9); }` },
  (d) => <div><Bar to={d.v} /><Place at={d.v} class="spot"><i /></Place></div>);
// A look given as a list: both halves apply, and a type made from the same list shares its sheet
const LOOK = `.lk { background: rgb(1, 2, 3); }`;
const OWN = `.lk { --rhp-radius: 4px; }`;
const Listed = slat({ css: [LOOK, OWN] }, (d) => <div><Bar to={d.v} class="lk" /></div>);
const Relisted = slat({ css: [LOOK, null, OWN] }, (d) => <div><Bar to={d.v} class="lk twin" /></div>);
// A look reaches a chart through what rhp writes on every block, not through the class names one chart happens to use
const Looked = slat({ css: `.rhp-label[data-rhp-edge=start] { color: rgb(1, 1, 1); } .rhp-bar { background: rgb(4, 5, 6); } .rhp-label[data-rhp-at] { color: rgb(7, 8, 9); }` },
  (d) => <div><Label edge="start">n</Label><Bar to={d.v} /><Label at={d.v}>{d.v}</Label></div>);
// A shape a block wears instead of its rectangle: a gable 26px in from the block's end, and one with a curve in it
const GABLE = shape(["M", 0, 0], ["L", "-26px", 0], ["L", 1, 0.5], ["L", "-26px", 1], ["L", 0, 1], ["Z"]);
const CURVY = shape(["M", 0, 0], ["C", 0.4, 0, 0.6, 1, 1, 0.5], ["L", 0, 1], ["Z"]);
const Shaped = slat({}, (d) => (
  <div>
    <Bar to={d.v} shape={GABLE} class="sh" />
    <Bar from={9} to={2} shape={GABLE} class="shb" />
    <Bar to={d.v} shape={CURVY} class="shc" />
    <Area points={[[0, 1], [4, 3], [8, 2]]} smooth class="sm" />
    <Area points={[[0, 1], [4, 3], [8, 2]]} class="st" />
  </div>
));
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
    <button class="kb-before">before</button>
    <Chart class="kb-slide" scale={[0, 10]}><Plot keyboard n={["a", "b", "c"]} v={kbSlide()} order={sortBy("v", "desc")}>{Typed}</Plot></Chart>
    <Chart class="kb-move" scale={[0, 10]}><Plot keyboard reorder="move" key="n" rows={kbMove()} order={sortBy("v", "desc")}>{Key}</Plot></Chart>
    <Chart class="kb-refill" scale={[0, 10]}><Plot keyboard reorder="refill" n={["a", "b", "c"]} v={kbRefill()} order={sortBy("v", "desc")}>{Key}</Plot></Chart>
    <Chart class="kb-still" static scale={[0, 10]}><Plot keyboard n={["a", "b", "c"]} v={kbStill()} order={sortBy("v", "desc")}>{Key}</Plot></Chart>
    <Chart class="outline-css" orientation={outlineO()} scale={[0, 10]} ticks={false} height={120} style={{ "--rhp-length-time": "1s", "--rhp-length-ease": "linear" }}>
      <Plot pts={[outline()]}>{Outlined}</Plot>
    </Chart>
    <Chart class="outline-js" animate scale={[0, 10]} ticks={false}><Plot pts={[outline()]}>{Outlined}</Plot></Chart>
    <Chart class="shape-h" scale={[0, 10]} ticks={false}><Plot v={[6]}>{Shaped}</Plot></Chart>
    <Chart class="shape-v" orientation="vertical" scale={[0, 10]} ticks={false} height={200}><Plot v={[6]}>{Shaped}</Plot></Chart>
    <Chart class="spot-h" scale={[0, 100]} ticks={false}><Plot v={[40]}>{Hung}</Plot></Chart>
    <Chart class="spot-v" orientation="vertical" scale={[0, 100]} ticks={false} height={200}><Plot v={[40]}>{Hung}</Plot></Chart>
    <Chart class="spot-x" scale={[0, 10]} cross={[0, 100]} height={200} ticks={false}><Plot overlap v={[5]}>{(d) => <div><Place at={d.v} cross={25} class="spot"><i /></Place></div>}</Plot></Chart>
    <Chart class="look" scale={[0, 10]}><Plot v={[6]}>{Listed}</Plot></Chart>
    <Chart class="look" scale={[0, 10]}><Plot v={[6]}>{Relisted}</Plot></Chart>
    <Chart class="looked" scale={[0, 10]}><Plot v={[6]}>{Looked}</Plot></Chart>
    <div class="asp" style={{ width: "400px" }}>
      <Chart class="asp-v" orientation="vertical" aspect={2} scale={[0, 10]}><Plot v={[3, 6]}>{(d) => <div><Bar to={d.v} /></div>}</Plot></Chart>
      <Chart class="asp-h" aspect={2} scale={[0, 10]} ticks={false}><Plot v={[1, 2, 3, 4]}>{Fit}</Plot></Chart>
      <Chart class="asp-auto" orientation="vertical" aspect={1} scale={[0, 10]} ticks={false}><Plot n={["a", "b"]} v={[3, 7]}>{Direct}</Plot></Chart>
      <Chart class="asp-x" aspect={2} scale={[0, 10]} cross={[0, 100]} ticks={false}><Plot overlap x={[0, 10]} y={[0, 100]}>{Point}</Plot></Chart>
      <Show when={asked()}>
        <Chart class="asp-both" orientation="vertical" aspect={4} height={300} ticks={false}><Plot v={[5]}>{(d) => <div><Bar to={d.v} /></div>}</Plot></Chart>
        <Chart class="asp-thick" aspect={2} ticks={false}><Plot v={[1, 2]}>{Fixed}</Plot></Chart>
        <Chart class="asp-bad" aspect={"16 / 9"} ticks={false}><Plot v={[5]}>{Fit}</Plot></Chart>
      </Show>
    </div>
    <Poster class="pst" look="test" kicker="K" title="T" dek="D" note="N" data-x="y"><Chart scale={[0, 10]}><Plot v={[3]}>{Fit}</Plot></Chart></Poster>
    <Poster class="pst-bare" title="Only a title"><Chart scale={[0, 10]}><Plot v={[3]}>{Fit}</Plot></Chart></Poster>
    <div class="one-around" onPointerMove={(e) => setOnRow(rowAt(e))} onPointerDown={(e) => setOnRow(rowAt(e))}
      onPointerLeave={(e) => e.pointerType !== "touch" && setOnRow(null)}
      onFocusIn={(e) => setOnRow(rowAt(e))} onFocusOut={(e) => !e.currentTarget.contains(e.relatedTarget) && setOnRow(null)}>
      <Chart class="one" scale={[0, 10]} ticks={false}><Plot keyboard n={["a", "b", "c"]} v={[3, 7, 5]}>{Tip}</Plot></Chart>
    </div>
  </div>
), document.body);
Object.assign(T, { setAsked, setOutline, setOutlineO, setKbSlide, setKbMove, setKbRefill, setKbStill, setLit, slat, setStill, setPaced, setRows, setLate, setPos, setVals, setTop, framesDrawn, whenStill, restyle, Red, edges, Direct, Wrapped, Inner });
