import { render } from "solid-js/web";
import { createSignal, batch } from "solid-js";
import { createStore } from "solid-js/store";
import { Plot, Scale, Chart, Bar, Label, sortBy, cycle, every, slat, restyle } from "../src/index.js";
import { framesDrawn, whenStill } from "../src/animate.js";
const T = (window.T = {});
// 1. keyed vs unkeyed removal, JS version
const [rows, setRows] = createSignal([{ name: "A", v: 10 }, { name: "B", v: 20 }, { name: "C", v: 30 }]);
T.seen = { keyed: [], plain: [] };
const Row = (tag) => (d) => { const el = <div data-name={d.name}><Bar to={d.v} /><Label at={d.v}>{(T.seen[tag].push(d.name + ":" + Math.round(d.v)), Math.round(d.v))}</Label></div>; return el; };
// 2. count = longest group; 3. null hides; 6. late data
const [late, setLate] = createSignal();
const [pos, setPos] = createSignal([2, null, 0, 1]);
// 8. computed group runs
T.computed = 0;
const [vals, setVals] = createStore({ v: [5, 7, 9] });
// 9. a Scale: ticks from the Chart's scale, keyed by value; a Chart with a Scale draws no axis of its own
const [top, setTop] = createSignal(27);
const Tk = (t) => <div class="tk" data-at={t.at} data-next={t.next} data-end={t.first ? "first" : t.last ? "last" : ""} />;
// 10. restyle: new CSS for one slat type, in place; a type made with the same CSS keeps its own
const SAME = `.r { color: rgb(255, 0, 0); }`;
const Red = slat({ css: SAME }, () => <div class="r">a</div>);
const Twin = slat({ css: SAME }, () => <div class="r twin">b</div>);
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
  </div>
), document.body);
Object.assign(T, { setRows, setLate, setPos, setVals, setTop, framesDrawn, whenStill, restyle, Red });
