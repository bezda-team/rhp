// The app for the server rendering tests. ssr-server.jsx renders it to HTML in Node, and ssr-client.jsx hydrates
// that HTML in the browser (or draws the app from scratch with #fresh). It uses every part of rhp that draws.
import { createSignal } from "solid-js";
import { Chart, Plot, Scale, Theme, Bar, Dot, Tick, Label, Cell, Area, Line, slat, sortBy, every, density } from "../src/index.js";

const Fruit = slat({
  css: `
    .name { font-weight: 700; }
    .bar { --rhp-end-radius: 6px; background: linear-gradient(var(--rhp-toward-end), #e0a100, #d9534f); }
    .bar:vertical { --rhp-end-radius: 3px; }
    .value { color: var(--rhp-muted); }
  `,
}, (d) => (
  <div class="fruit">
    <Label edge="start" class="name">{d.fruit}</Label>
    <Bar to={d.sold} class="bar" />
    <Label at={d.sold} class="value">{d.sold}</Label>
  </div>
));

const Hour = (h) => <div><Cell value={h.v} title={`${h.index}:00`} /></div>;
const Day = slat({ thickness: { horizontal: 22 }, room: { horizontal: { start: 40 } }, css: `.day { font-size: 11px; }` }, (d) => (
  <div>
    <Label edge="start" class="day">{d.day}</Label>
    <Plot orientation="across" v={d.hours}>{Hour}</Plot>
  </div>
));

const Band = slat({ css: `.band { background: rgb(0 0 0 / .05); } .num { color: rgb(120, 0, 0); }` }, (t) => (
  <div class={t.index % 2 ? "band" : ""}>
    <Bar from={t.at} to={t.next} thick={1} class="band-bar" />
    <Label at={t.at} class="num">{t.at}</Label>
  </div>
));

const spread = [2, 3, 3, 4, 4, 4, 5, 5, 6, 7, 7, 8];
const Violin = slat({ thickness: 60, css: `.shape { fill: #7b5cd6; }` }, (d) => (
  <div><Area points={density(d.values, [0, 10])} mirror class="shape" /><Tick at={d.mid} thick={0.5} /></div>
));

// A root with its own id and role, and a block with its own props
const Own = (d) => (
  <div id={"own-" + d.index} role="group" aria-label={d.name}>
    <Bar to={d.v} title={d.name} data-v={d.v} classList={{ big: d.v > 5 }} />
  </div>
);

// CSS that HTML escaping would break (&, >, quotes), and a slat root with its own style
const Tricky = slat({ css: `
  .t > .in { font-family: "Tricky & Co", serif; }
  .t::after { content: "&<>"; }
  .t { --gap-test: 1; }
` }, (d) => (
  <div class="t" style={{ "--own": d.v }}>
    <span class="in">{d.name}</span>
    <Bar from={d.v} to={-d.v} style="opacity: .9" class="back" />
    <Label at={-d.v} side="before">{-d.v}</Label>
  </div>
));

// Auto gutters, one capped by the slat's CSS and one with a fixed end
const Named = slat({ room: "auto", css: `.nm { font-weight: 700; } .pct { color: rgb(90, 90, 90); }` }, (d) => (
  <div class="named"><Label edge="start" class="nm">{d.name}</Label><Bar to={d.v} /><Label edge="end" class="pct">{d.v}%</Label></div>
));
const Capped = slat({ room: { start: "auto", end: 30 }, css: `.nm { max-width: 60px; }` }, (d) => (
  <div class="capped"><Label edge="start" class="nm">{d.name}</Label><Bar to={d.v} /></div>
));
const Wrapped = slat({ room: "auto", css: `.nm:vertical { white-space: normal; }` }, (d) => (
  <div class="wrapped"><Label edge="start" class="nm">{d.name}</Label><Bar to={d.v} /><Label at={d.v}>{d.v}</Label></div>
));
const NAMES = ["Ann", "A much longer name", "Mid"];

// A number too close to the scale's end is hidden in CSS, since its room to the end is (1 - p) of the track
const Crowd = slat({ css: `.n { max-width: calc(((1 - var(--rhp-p)) * 100% - 30px) * 1000); overflow: hidden; }` }, (t) => (
  <div><Tick at={t.at} thick={1} /><Label at={t.at} class="n">{t.at}</Label></div>
));

// Every kind of slat root the server has to write into
const RowComp = (p) => <div class="comp"><Bar to={p.d.v} /></div>;
const PIXEL = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1" fill="rgb(0,160,0)"/></svg>');

export default function App() {
  const [sold, setSold] = createSignal([12, 18, 7, 22]); // the tests change it through window.setSold
  if (typeof window !== "undefined") window.setSold = setSold;
  return (
    <main style={{ width: "640px", font: "14px system-ui", padding: "8px" }}>
      <Chart id="fruit" label="Fruit sold this week" scale={[0, 30]}>
        <Plot fruit={["Apples", "Bananas", "Cherries", "Kiwis"]} sold={sold()} order={sortBy("sold", "desc")}>{Fruit}</Plot>
      </Chart>
      <Chart id="vertical" orientation="vertical" scale={[0, 30]} height={160} format={(v) => <b>{v}</b>}>
        <Plot key="fruit" fruit={["Apples", "Bananas", "Cherries"]} sold={[9, 25, 14]} order={sortBy("sold")}>{Fruit}</Plot>
      </Chart>
      <Chart id="heat" scale={[0, 10]} ticks={false}>
        <Plot day={["Mon", "Tue", "Wed"]} hours={[[1, 4, 9, 6, 2, 0], [3, 7, 8, 5, 1, 2], [0, 2, 5, 10, 7, 3]]}>{Day}</Plot>
      </Chart>
      <Chart id="scale" scale={[0, 25]}>
        <Scale ticks={every(5)}>{Band}</Scale>
        <Plot v={[18]}>{(d) => <div><Bar to={d.v} /></div>}</Plot>
      </Chart>
      <Chart id="violin" scale={[0, 10]}>
        <Plot values={[spread]} mid={[5]}>{Violin}</Plot>
      </Chart>
      <Chart id="still" static scale={[0, 10]}>
        <Plot name={["x", "y"]} v={[3, 8]} order={sortBy("v", "desc")}>{(d) => <div><Label edge="start">{d.name}</Label><Bar to={d.v} /></div>}</Plot>
      </Chart>
      <Chart id="fit" scale={[0, 10]} height={90}>
        <Plot v={[4, 7, 2]}>{(d) => <div><Bar to={d.v} /></div>}</Plot>
      </Chart>
      <Chart id="anim" animate scale={[0, 20]}>
        <Plot name={["p", "q", "r"]} v={[5, 15, 10]} order={sortBy("v", "desc")}>{(d) => <div><Label edge="start">{d.name}</Label><Bar to={d.v} /></div>}</Plot>
      </Chart>
      <Chart id="move" scale={[0, 10]}>
        <Plot reorder="move" name={["a", "b", "c", "d"]} v={[2, 9, 5, 7]} order={sortBy("v", "desc")}>{(d) => <div class="mv"><Label edge="start">{d.name}</Label><Bar to={d.v} /></div>}</Plot>
        <Plot name={["h1", "h2"]} v={[1, 2]} order={[null, 0]}>{(d) => <div class="hid" data-n={d.name}><Dot at={d.v} /></div>}</Plot>
      </Chart>
      <Theme value={{ series: ["rgb(200, 30, 90)"], ink: "rgb(10, 20, 30)" }}>
        <Chart id="themed" class="page-class" scale={[-10, 10]} theme={{ muted: "rgb(1, 2, 3)" }}>
          <Plot name={["m", "n"]} v={[4, 8]} color="series-1">{Tricky}</Plot>
        </Chart>
      </Theme>
      <Chart id="auto" scale={[0, 100]}>
        <Plot name={NAMES} v={[20, 80, 50]}>{Named}</Plot>
      </Chart>
      <Chart id="capped" scale={[0, 100]}>
        <Plot name={NAMES} v={[20, 80, 50]}>{Capped}</Plot>
      </Chart>
      <Chart id="auto-v" orientation="vertical" height={100} scale={[0, 100]}>
        <Plot name={["Ann", "A name long enough to wrap under its column, twice over", "Mid"]} v={[20, 80, 50]}>{Wrapped}</Plot>
      </Chart>
      <Chart id="toend" scale={[0, 23]}>
        <Scale ticks={[0, 10, 22]}>{Crowd}</Scale>
        <Plot v={[10]}>{(d) => <div><Bar to={d.v} /></div>}</Plot>
      </Chart>
      <Chart id="roots" scale={[0, 10]}>
        <Plot v={[3, 6]}>{(d) => <RowComp d={d} />}</Plot>
        <Plot v={[5]}>{(d) => <div {...{ class: "spread", "data-x": d.v }} title={`a > b "c" & 'd'`} style="color: rgb(1, 2, 3)"><Bar to={d.v} /></div>}</Plot>
        <Plot v={[2]}>{(d) => <svg class="svgroot" viewBox="0 0 10 10" preserveAspectRatio="none"><rect width={d.v} height="10" fill="rgb(200, 0, 0)" /></svg>}</Plot>
        <Plot v={[7]}>{() => <img class="imgroot" alt="" src={PIXEL} />}</Plot>
        <Plot v={[1, 2]} order={[null, 0]}>{(d) => <div hidden data-h={d.v}><Bar to={d.v} /></div>}</Plot>
      </Chart>
      <Chart id="cross" scale={[0, 12]} cross={[0, 40]} height={160} crossFormat={(v) => v + "°"}>
        <Plot overlap x={[2, 5, 8, 11]} y={[10, 30, 22, 35]}>{(d) => <div><Dot at={d.x} cross={d.y} /><Label at={d.x} cross={d.y}>{d.y}</Label></div>}</Plot>
        <Plot overlap pts={[[[0, 5], [4, 20], [8, 15], [12, 38]]]}>{(d) => <div><Line points={d.pts} fill /></div>}</Plot>
      </Chart>
      <Chart id="own" scale={[0, 10]}>
        <Plot name={["a", "b"]} v={[3, 8]}>{Own}</Plot>
        <Plot overlap v={[2, 5, 9]}>{(d) => <Dot at={d.v} />}</Plot>
      </Chart>
    </main>
  );
}
