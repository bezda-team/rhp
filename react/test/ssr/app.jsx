// The app drawn on a server and taken over in the browser (run.mjs), and drawn in the browser alone to compare with
import { useState } from "react";
import { flushSync } from "react-dom";
import { Chart, Plot, Scale, Bar, Dot, Label, Line, ManyDots, Theme, slat, sortBy, every } from "../../src/index.js";

const Fruit = slat({ thickness: 28, room: { start: 80, end: 40 }, css: `.name { font-weight: 600; } .v { color: var(--rhp-muted); } .bar > i { position: absolute; inset: 2px; border: 1px solid rgb(255 255 255 / .5); }` }, (d) => (
  <div data-n={d.name}>
    <Label edge="start" className="name">{d.name}</Label>
    <Bar to={d.sold} className="bar"><i /></Bar>
    <Label at={d.sold} className="v">{d.sold}</Label>
  </div>
));
const Auto = slat({ thickness: 24, room: { start: "auto", end: "auto" } }, (d) => (
  <div><Label edge="start">{d.name}</Label><Bar to={d.v} /><Label edge="end">{d.v + " kg"}</Label></div>
));
const Tk = slat({ css: `.tk { position: absolute; inset: 0; border-left: 1px dashed var(--rhp-grid); }` }, (t) => <div><span className="tk" /></div>);
const Point = (d) => <div><Dot at={d.x} cross={d.y} size="7px" /><Label at={d.x} cross={d.y}>{d.k}</Label></div>;
const Trend = (d) => <div><Line points={d.pts} /></div>;
// A slat whose root is a component of the app's own, which puts the props it is given on its element
function Forward({ v, ...props }) {
  return <div {...props}><Bar to={v} /><Label at={v}>{v}</Label></div>;
}
const cloud = Array.from({ length: 200 }, (_, i) => ({ x: ((i * 0.618) % 1) * 100, y: ((i * 0.7548) % 1) * 100 }));

export function App({ T }) {
  const [sold, setSold] = useState([12, 18, 7, 25]);
  if (T) T.setSold = (v) => flushSync(() => setSold(v));
  const names = ["Apples", "Bananas", "Cherries", "Dates"];
  return (
    <Theme value={{ series: ["#3355aa"], ink: "#1a1a1a" }}>
      <div className="page">
        <Chart label="Fruit sold" className="fruit" scale={[0, 30]} theme={{ muted: "#555555" }}>
          <Scale ticks={every(10)}>{Tk}</Scale>
          <Plot keyboard name={names} sold={sold} order={sortBy("sold", "desc")}>{Fruit}</Plot>
        </Chart>
        <Chart className="auto"><Plot name={["Short", "A much longer name", "Mid"]} v={[30, 60, 45]}>{Auto}</Plot></Chart>
        <Chart className="xy" scale={[0, 10]} cross={[0, 100]} height={200}>
          <Plot overlap pts={[[[0, 10], [5, 60], [10, 40]]]}>{Trend}</Plot>
          <Plot overlap x={[0, 5, 10]} y={[10, 60, 40]} k={["a", "b", "c"]}>{Point}</Plot>
        </Chart>
        <Chart className="fwd" scale={[0, 10]}><Plot v={[3, 8, 5]} order={sortBy("v", "desc")}>{(d) => <Forward v={d.v} data-n={"f" + d.index} />}</Plot></Chart>
        <Chart className="many" scale={[0, 100]} cross={[0, 100]} height={160}>
          <ManyDots rows={cloud} at={(r) => r.x} cross={(r) => r.y} size={4} color="series-1" />
        </Chart>
      </div>
    </Theme>
  );
}
