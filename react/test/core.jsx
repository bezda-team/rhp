// What rhp-react does, checked by run.mjs: the checks of rhp's test/core.jsx that are about behavior, drawn with React,
// and checks of what is React's own (which slats React draws again, hooks in a slat, StrictMode). Each piece of state is
// set at once (flushSync), as a Solid signal would be.
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { Plot, Scale, Chart, Bar, Dot, Label, Line, Place, Area, Cell, Poster, shape, sortBy, every, slat, restyle, useAnimated, drawing } from "../src/index.js";
import { framesDrawn, whenStill } from "../src/clock.js";

const T = (window.T = { seen: { keyed: [], plain: [] }, computed: 0, drawn: 0, renders: {}, hooks: 0 });
const count = (k) => (T.renders[k] = (T.renders[k] ?? 0) + 1);

// A piece of state that a check sets from outside (T.setName), drawn at once
function useT(name, init) {
  const [v, set] = useState(init);
  T["set" + name] = (x) => flushSync(() => set(x));
  return v;
}

// Keyed and unkeyed removal, in the JS version for v
const Row = (tag) => (d) => <div data-name={d.name}><Bar to={d.v} /><Label at={d.v}>{(T.seen[tag].push(d.name + ":" + Math.round(d.v)), Math.round(d.v))}</Label></div>;
const KeyedRow = Row("keyed");
const PlainRow = Row("plain");
// An axis that switches unit, beside names in an "auto" room
const Named = slat({ room: { start: "auto", end: 30 } }, (d) => <div><Label edge="start">{d.n}</Label><Bar to={d.v} /></div>);
const Grown = slat({ room: { start: "auto", end: 30 } }, (d) => <div><Label edge="start">{d.n}</Label><Bar to={d.v} /><Label at={d.v} className="gv">{d.v}</Label></div>);
const AtPlace = slat({ room: { start: "auto", end: 30 } }, (d) => <div><Label edge="start">{d.n}</Label><Bar to={d.v} /><Place at={d.v} className="pp" /></div>);
const AtPlaceRoot = slat({ room: {} }, (d) => <Place at={d.v} className="pr" />);
// A Scale
const Tk = (t) => <div className="tk" data-at={t.at} data-next={t.next} data-end={t.first ? "first" : t.last ? "last" : ""} />;
// restyle
const SAME = `.r { color: rgb(255, 0, 0); }`;
const Red = slat({ css: SAME }, () => <div className="r">a</div>);
const Twin = slat({ css: SAME }, () => <div className="r twin">b</div>);
// Orientation in slat CSS, and the knobs
const Turned = slat({ css: `
.o:horizontal { color: rgb(0, 128, 0); }
.o:vertical { color: rgb(0, 0, 128); }
.o:vertical .inner { color: rgb(1, 2, 3); }
.b { --rhp-start-radius: 0px; --rhp-end-radius: 7px; background-image: linear-gradient(var(--rhp-toward-end), red, blue); }
.l { --rhp-label-gap: 11px; }
.b { --rhp-gap: 3px; }
` }, (d) => <div className="o"><span className="inner">x</span><Bar className="b" from={d.from} to={d.to} /><Label className="l" at={d.to}>v</Label></div>);
// A computed group, worked out with what it reads
const double = (d) => (T.computed++, d.v * 2);
// Rows that fit a chart's height
const Fit = (d) => <div className="fit"><Bar to={d.v} /></div>;
const Fixed = slat({ thickness: 20 }, (d) => <div className="fix"><Bar to={d.v} /></div>);
// A second axis
const Point = (d) => <div><Dot at={d.x} cross={d.y} size="6px" className="pt" /><Label at={d.x} cross={d.y} className="pl">{d.y}</Label></div>;
const Trend = (d) => <div><Line points={d.pts} className="tl" /></div>;
// Outlines
const Outlined = (d) => <div><Area points={d.pts} mirror className="oa" /><Line points={d.pts} fill className="ol" /></div>;
const OutlinedJs = slat({ css: ".oa path { transition-property: fill; transition-duration: .2s; }" }, Outlined);
// Keyboard
const Key = (d) => <div data-n={d.n}><Bar to={d.v} /></div>;
const Typed = (d) => <div data-n={d.n}><Bar to={d.v} /><input className="kbi" /></div>;
// One element for the row the reader is on: the row is the app's state, and a data group that is a function of the row
// tells each slat whether it is on (worked out per row, so only the two rows that change are drawn again)
const rowAt = (e) => {
  const el = e.target.closest("[data-row]");
  return el ? +el.dataset.row : null;
};
const Tip = slat({ thickness: 24, room: { start: 60, end: 30 } }, (d) => (T.drawn++,
  <div data-row={d.index} data-n={d.n}>
    <Label edge="start" className="one-name">{d.n}</Label>
    <Bar to={d.v} />
    {d.on && <Label at={d.v} className="one-tip">{d.v}</Label>}
  </div>));
// Shapes
const GABLE = shape(["M", 0, 0], ["L", "-26px", 0], ["L", 1, 0.5], ["L", "-26px", 1], ["L", 0, 1], ["Z"]);
const CURVY = shape(["M", 0, 0], ["C", 0.4, 0, 0.6, 1, 1, 0.5], ["L", 0, 1], ["Z"]);
const Shaped = slat({}, (d) => (
  <div>
    <Bar to={d.v} shape={GABLE} className="sh" />
    <Bar from={9} to={2} shape={GABLE} className="shb" />
    <Bar to={d.v} shape={CURVY} className="shc" />
    <Area points={[[0, 1], [4, 3], [8, 2]]} smooth className="sm" />
    <Area points={[[0, 1], [4, 3], [8, 2]]} className="st" />
  </div>
));
// Place
const Hung = slat({ css: `.spot > i { position: absolute; width: 9px; height: 9px; background: rgb(9, 9, 9); }` },
  (d) => <div><Bar to={d.v} /><Place at={d.v} className="spot"><i /></Place></div>);
// A block's style that changes keeps the block's own variables
const Styled = (d) => (
  <div>
    <Bar to={d.v} color="red" className="sty-bar" style={d.st} />
    <Bar to={d.v} className="sty-spread" title="t" style={d.st} />
    <Label at={d.v} className="sty-label" style={d.st}>x</Label>
    <Area points={[[0, 1], [d.v, 2]]} className="sty-area" style={d.st} />
    <Line points={[[0, 1], [d.v, 2]]} className="sty-line" style={d.st} />
  </div>
);
// React's own: which slats are drawn again, a hook in a slat, and an index read later, in a handler
const NAMES = ["a", "b", "c"];
const Counted = (d) => (count(d.tag + d.name), <div data-n={d.name}><Bar to={d.v} /></div>);
const Positioned = (d) => (count("p-" + d.name), <div data-n={d.name} data-pos={d.position}><Bar to={d.v} /></div>);
function Toggle(d) {
  const [on, setOn] = useState(false);
  T.hooks++;
  return <div data-n={d.name} data-on={on ? "" : undefined} onClick={() => setOn((x) => !x)}><Bar to={d.v} /></div>;
}
const Clicked = (d) => <div data-n={d.name} onClick={() => (T.clicked = d.index + ":" + d.position)}><Bar to={d.v} /></div>;
// A race in the JS version: values move frame by frame, rows pass each other, and a slat reads its moving value
const Runner = (d) => (count("race-" + d.name), <div data-n={d.name}><Bar to={d.v} /><Label at={d.v} className="rv">{Math.round(d.v)}</Label></div>);

// What a screen reader gets
const Sold = (d) => <div><Label edge="start">{d.name}</Label><Bar to={d.sold} /><Label at={d.sold}>{d.sold}</Label></div>;
const Owned = (d) => <div role="group" id={"own-" + d.index}><Bar to={d.v} /></div>;
const Hour = (h) => <div><Cell value={h.v} /></div>;
const Day = slat({ thickness: { horizontal: 12 }, room: { start: 48 } }, (d) => <div><Label edge="start">{d.day}</Label><Plot orientation="across" v={d.hours}>{Hour}</Plot></div>);
const Mark = (t) => <div><Label at={t.at}>{t.at}</Label></div>;

// useAnimated: a value of the app's own that moves like rhp's JS version
function Moving() {
  const [to, setTo] = useState(0);
  T.setMoving = (v) => flushSync(() => setTo(v));
  const v = useAnimated(to, { duration: 300 });
  return <div className="moving" data-v={v} />;
}

function App() {

  const rows = useT("Rows", [{ name: "A", v: 10 }, { name: "B", v: 20 }, { name: "C", v: 30 }]);
  const late = useT("Late", undefined);
  const pos = useT("Pos", [2, null, 0, 1]);
  const vals = useT("Vals", [5, 7, 9]);
  const unitB = useT("UnitB", false);
  const grown = useT("Grown", false);
  const top = useT("Top", 27);
  const still = useT("Still", [5, 9]);
  const paced = useT("Paced", 1);
  const kbSlide = useT("KbSlide", [3, 1, 2]);
  const kbMove = useT("KbMove", [{ n: "a", v: 3 }, { n: "b", v: 1 }, { n: "c", v: 2 }]);
  const kbRefill = useT("KbRefill", [3, 1, 2]);
  const kbStill = useT("KbStill", [3, 1, 2]);
  const outline = useT("Outline", [[0, 1], [5, 4], [10, 2]]);
  const outlineO = useT("OutlineO", "horizontal");
  const retarget = useT("Retarget", 2);
  const blockStyle = useT("BlockStyle", { "--n": 1 });
  const styledV = useT("StyledV", 6);
  const asked = useT("Asked", false);
  const onRow = useT("OnRow", null);
  const counted = useT("Counted", [10, 20, 30]);
  const sorted = useT("Sorted", false);
  const people = useT("People", [{ name: "A", v: 1 }, { name: "B", v: 2 }, { name: "C", v: 3 }]);
  const unrelated = useT("Unrelated", 0);
  const a11ySold = useT("A11ySold", [12, 18, 7, 22]);
  const race = useT("Race", [50, 40, 30, 20, 10]);

  return (
    <div>
      <Chart scale={[0, 40]}><Plot className="keyed" rowKey="name" rows={rows} animate={["v"]}>{KeyedRow}</Plot></Chart>
      <Chart scale={[0, 40]}><Plot className="plain" rows={rows} animate={["v"]}>{PlainRow}</Plot></Chart>
      <Chart><Plot color={["red", "blue"]} value={[1, 2, 3, 4, 5]}>{(d) => <div className="cnt"><Bar to={d.value} color={d.color} /></div>}</Plot></Chart>
      <Chart><Plot value={late}>{(d) => <div className="late"><Bar to={d.value} /></div>}</Plot></Chart>
      <Chart><Plot name={["a", "b", "c", "d"]} order={pos}>{(d) => <div className="hid" data-n={d.name}>{d.name}</div>}</Plot></Chart>
      <Chart><Plot v={vals} double={double}>{(d) => <div className="cmp"><Bar to={d.double} /><Label at={d.double}>{d.double}</Label></div>}</Plot></Chart>
      <Chart><Plot reorder="move" name={["a", "b", "c"]} v={[1, 3, 2]} order={sortBy("v", "desc")}>{(d) => <div className="mv">{d.name}</div>}</Plot></Chart>
      <Chart><Plot name={["a", "b", "c", "d"]} v={[5, 5, 9, 5]} order={sortBy("v", "desc")}>{(d) => <div className="tie" data-n={d.name}>{d.name}</div>}</Plot></Chart>
      <Chart className="sc" scale={[0, top]}><Scale ticks={every(5, { ends: true })}>{Tk}</Scale><Plot v={[3]}>{(d) => <div><Bar to={d.v} /></div>}</Plot></Chart>
      <Chart className="nosc" scale={[0, 10]}><Plot v={[3]}>{(d) => <div><Bar to={d.v} /></div>}</Plot></Chart>
      <Chart className="unit" scale={unitB ? [-75, 50] : [0, 10]} ticks={unitB ? [-75, -50, -25, 0, 25, 50] : [0, 2, 4, 6, 8, 10]}
        format={(v) => (unitB ? v + "%" : "$" + v)} style={{ "--rhp-length-time": "0.4s" }}>
        <Plot n={["Alpha", "Beta"]} v={unitB ? [-50, 25] : [3, 7]}>{Named}</Plot>
      </Chart>
      <Chart className="grown" scale={grown ? [0, 50] : [0, 10]} ticks={false} style={{ "--rhp-length-time": "0.4s" }}>
        <Plot n={grown ? ["Alpha", "Beta", "Gamma"] : ["Alpha", "Beta"]} v={grown ? [3, 7, 40] : [3, 7]}>{Grown}</Plot>
      </Chart>
      <Chart className="placed" scale={[0, 10]} ticks={false}>
        <Plot n={["Alpha", "Beta"]} v={[3, 7]}>{AtPlace}</Plot>
        <Plot overlap v={[3, 7]}>{AtPlaceRoot}</Plot>
      </Chart>
      <Chart className="rs"><Plot slats={1}>{Red}</Plot></Chart>
      <Chart className="rs"><Plot slats={1}>{Twin}</Plot></Chart>
      <Chart className="or-h" scale={[0, 10]}><Plot from={[0, 10]} to={[6, 2]}>{Turned}</Plot></Chart>
      <Chart className="or-v" orientation="vertical" scale={[0, 10]}><Plot from={[0, 10]} to={[6, 2]}>{Turned}</Plot></Chart>
      <Chart className="st" static scale={[0, 20]}>
        <Plot name={["a", "b"]} v={still} order={sortBy("v", "desc")}>
          {(d) => <div className="sr" data-n={d.name}><Bar to={d.v} /><Label at={d.v}>{d.v}</Label><Plot overlap part={[1, 2]}>{(q) => <Dot at={q.part} className="sd" />}</Plot></div>}
        </Plot>
      </Chart>
      <Chart className="kept" scale={[0, 10]} ticks={[0, 5, 10]} format={(v) => <b className="fmt">{v}</b>}><Plot v={[8]}>{(d) => <div><Bar to={d.v} /></div>}</Plot></Chart>
      <Chart className="fits" height={200} ticks={false}><Plot v={[1, 2, 3, 4]}>{Fit}</Plot></Chart>
      <Chart className="grows" ticks={false}><Plot v={[1, 2, 3, 4]}>{Fit}</Plot></Chart>
      <Chart className="keeps" height={200} ticks={false}><Plot v={[1, 2, 3, 4]}>{Fixed}</Plot></Chart>
      <Chart className="paced" scale={[0, 100]}><Plot v={[paced]}>{(d) => <div><Bar to={d.v} /></div>}</Plot></Chart>
      {["horizontal", "vertical"].map((o) => (
        <Chart key={o} className={"xy xy-" + o[0]} orientation={o} scale={[0, 10]} cross={[0, 100]} height={200} ticks={[0, 5, 10]} crossTicks={[0, 50, 100]}>
          <Plot overlap x={[0, 5, 10]} y={[0, 50, 100]}>{Point}</Plot>
          <Plot overlap pts={[[[0, 0], [10, 100]]]}>{Trend}</Plot>
        </Chart>
      ))}
      <button className="kb-before">before</button>
      <Chart className="kb-slide" scale={[0, 10]}><Plot keyboard n={["a", "b", "c"]} v={kbSlide} order={sortBy("v", "desc")}>{Typed}</Plot></Chart>
      <Chart className="kb-move" scale={[0, 10]}><Plot keyboard reorder="move" rowKey="n" rows={kbMove} order={sortBy("v", "desc")}>{Key}</Plot></Chart>
      <Chart className="kb-refill" scale={[0, 10]}><Plot keyboard reorder="refill" n={["a", "b", "c"]} v={kbRefill} order={sortBy("v", "desc")}>{Key}</Plot></Chart>
      <Chart className="kb-still" static scale={[0, 10]}><Plot keyboard n={["a", "b", "c"]} v={kbStill} order={sortBy("v", "desc")}>{Key}</Plot></Chart>
      <Chart className="outline-css" orientation={outlineO} scale={[0, 10]} ticks={false} height={120} style={{ "--rhp-length-time": "1s", "--rhp-length-ease": "linear" }}>
        <Plot pts={[outline]}>{Outlined}</Plot>
      </Chart>
      <Chart className="outline-js" animate scale={[0, 10]} ticks={false}><Plot pts={[outline]}>{OutlinedJs}</Plot></Chart>
      <Chart className="outline-end" scale={[0, 10]} ticks={false} height={120}><Plot pts={[[[0, 4], [5, 1], [10, 3]]]}>{Outlined}</Plot></Chart>
      <Chart className="outline-retarget" scale={[0, 10]} ticks={false} height={120} style={{ "--rhp-length-time": "1s", "--rhp-length-ease": "linear" }}>
        <Plot m={[retarget]}>{(d) => <div><Area points={[[0, 1], [5, d.m], [10, 1]]} peak={10} mirror className="ra" /></div>}</Plot>
      </Chart>
      <Chart className="shape-h" scale={[0, 10]} ticks={false}><Plot v={[6]}>{Shaped}</Plot></Chart>
      <Chart className="shape-v" orientation="vertical" scale={[0, 10]} ticks={false} height={200}><Plot v={[6]}>{Shaped}</Plot></Chart>
      <Chart className="spot-h" scale={[0, 100]} ticks={false}><Plot v={[40]}>{Hung}</Plot></Chart>
      <Chart className="spot-v" orientation="vertical" scale={[0, 100]} ticks={false} height={200}><Plot v={[40]}>{Hung}</Plot></Chart>
      <Chart className="spot-x" scale={[0, 10]} cross={[0, 100]} height={200} ticks={false}><Plot overlap v={[5]}>{(d) => <div><Place at={d.v} cross={25} className="spot"><i /></Place></div>}</Plot></Chart>
      <Chart className="styled" scale={[0, 10]} ticks={false}><Plot v={[styledV]} st={[blockStyle]}>{Styled}</Plot></Chart>
      <div className="asp" style={{ width: "400px" }}>
        <Chart className="asp-v" orientation="vertical" aspect={2} scale={[0, 10]}><Plot v={[3, 6]}>{(d) => <div><Bar to={d.v} /></div>}</Plot></Chart>
        <Chart className="asp-h" aspect={2} scale={[0, 10]} ticks={false}><Plot v={[1, 2, 3, 4]}>{Fit}</Plot></Chart>
        {asked && (
          <>
            <Chart className="asp-both" orientation="vertical" aspect={4} height={300} ticks={false}><Plot v={[5]}>{(d) => <div><Bar to={d.v} /></div>}</Plot></Chart>
            <Chart className="asp-thick" aspect={2} ticks={false}><Plot v={[1, 2]}>{Fixed}</Plot></Chart>
            <Chart className="asp-bad" aspect={"16 / 9"} ticks={false}><Plot v={[5]}>{Fit}</Plot></Chart>
          </>
        )}
      </div>
      <Poster className="pst" look="test" kicker="K" title="T" dek="D" note="N" data-x="y"><Chart scale={[0, 10]}><Plot v={[3]}>{Fit}</Plot></Chart></Poster>
      <Poster className="pst-bare" title="Only a title"><Chart scale={[0, 10]}><Plot v={[3]}>{Fit}</Plot></Chart></Poster>
      <div className="one-around" onPointerMove={(e) => T.setOnRow(rowAt(e))} onPointerDown={(e) => T.setOnRow(rowAt(e))}
        onPointerLeave={(e) => e.pointerType !== "touch" && T.setOnRow(null)}
        onFocus={(e) => T.setOnRow(rowAt(e))} onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && T.setOnRow(null)}>
        <Chart className="one" scale={[0, 10]} ticks={false}><Plot keyboard n={["a", "b", "c"]} v={[3, 7, 5]} on={(d) => d.index === onRow}>{Tip}</Plot></Chart>
      </div>
      <Chart className="counted" scale={[0, 40]}><Plot tag="c-" name={NAMES} v={counted}>{Counted}</Plot></Chart>
      <Chart className="unread" scale={[0, 40]}><Plot tag="u-" name={NAMES} v={counted} order={sorted ? sortBy("v", "desc") : null}>{Counted}</Plot></Chart>
      <Chart className="positioned" scale={[0, 40]}><Plot name={NAMES} v={counted} order={sorted ? sortBy("v", "desc") : null}>{Positioned}</Plot></Chart>
      <span className="unrelated">{unrelated}</span>
      <Chart className="hooked" scale={[0, 40]}><Plot name={["a", "b"]} v={[10, 20]}>{Toggle}</Plot></Chart>
      <Chart className="clicked" scale={[0, 40]}><Plot rowKey="name" rows={people} order={sortBy("v", "desc")}>{Clicked}</Plot></Chart>
      <Moving />
      <Chart className="race" scale={[0, 100]} animate={{ duration: 400 }}><Plot name={["a", "b", "c", "d", "e"]} v={race} order={sortBy("v", "desc")}>{Runner}</Plot></Chart>
      <Chart className="a11y-fruit" label="Fruit sold this week" scale={[0, 30]}><Plot name={["Apples", "Bananas", "Cherries", "Kiwis"]} sold={a11ySold} order={sortBy("sold", "desc")}>{Sold}</Plot></Chart>
      <Chart className="a11y-keyed" orientation="vertical" scale={[0, 30]}><Plot rowKey="name" rows={[{ name: "Apples", sold: 20 }, { name: "Bananas", sold: 5 }, { name: "Cherries", sold: 10 }]} order={sortBy("sold", "desc")}>{Sold}</Plot></Chart>
      <Chart className="a11y-own"><Plot v={[3, 6]}>{Owned}</Plot><Plot overlap v={[2, 4]}>{(d) => <div><Dot at={d.v} /></div>}</Plot></Chart>
      <Chart className="a11y-heat" scale={[0, 100]} ticks={false}><Plot day={["Mon", "Tue"]} hours={[[10, 50, 90], [20, 60, 30]]}>{Day}</Plot></Chart>
      <Chart className="a11y-scale" scale={[0, 20]}><Scale ticks={[0, 10, 20]}>{Mark}</Scale><Plot v={[3]}>{(d) => <div><Bar to={d.v} /></div>}</Plot></Chart>
    </div>
  );
}

const root = document.body.appendChild(document.createElement("div"));
flushSync(() => createRoot(root).render(<App />));
Object.assign(T, { framesDrawn, whenStill, restyle, Red, slat, drawing });

// The same chart in StrictMode, which draws each component twice and runs each effect twice when it mounts
const strict = document.body.appendChild(document.createElement("div"));
strict.className = "strict";
function Strict() {
  const v = useT("StrictV", [4, 8]);
  return <Chart scale={[0, 10]}><Plot keyboard name={["a", "b"]} v={v} order={sortBy("v", "desc")}>{(d) => <div data-n={d.name}><Bar to={d.v} /><Label at={d.v}>{d.v}</Label></div>}</Plot></Chart>;
}
flushSync(() => createRoot(strict).render(<StrictMode><Strict /></StrictMode>));
