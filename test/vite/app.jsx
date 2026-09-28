// A Solid app that uses rhp as an app does, by its package name: Vite with vite-plugin-solid picks rhp's source (its
// "solid" condition) and compiles it with the app, for the server and for the browser (test/run.mjs).
import { createSignal } from "solid-js";
import { Chart, Plot, Scale, Bar, Tick, Label, slat, sortBy } from "@bezda/rhp";

const Row = slat({
  room: "auto",
  css: `
    .name { font-weight: 700; }
    .bar { --rhp-end-radius: 6px; background: linear-gradient(var(--rhp-toward-end), #e0a100, #d9534f); }
  `,
}, (d) => (
  <div>
    <Label edge="start" class="name">{d.fruit}</Label>
    <Bar to={d.sold} class="bar" />
    <Label at={d.sold}>{d.sold}</Label>
  </div>
));
const Ticks = slat({ css: `.n { color: rgb(120, 0, 0); }` }, (t) => <div><Tick at={t.at} thick={1} /><Label at={t.at} class="n">{t.at}</Label></div>);

export default function App() {
  const [sold, setSold] = createSignal([12, 18, 7, 22]);
  if (typeof window !== "undefined") window.setSold = setSold;
  return (
    <main style={{ width: "640px", font: "14px system-ui", padding: "8px" }}>
      <Chart id="fruit" label="Fruit sold" scale={[0, 30]}>
        <Plot fruit={["Apples", "Bananas", "Cherries", "Kiwis"]} sold={sold()} order={sortBy("sold", "desc")}>{Row}</Plot>
      </Chart>
      <Chart id="columns" orientation="vertical" height={120} scale={[0, 30]}>
        <Scale ticks={[0, 10, 20, 30]}>{Ticks}</Scale>
        <Plot fruit={["Apples", "Bananas", "Cherries"]} sold={[9, 25, 14]}>{Row}</Plot>
      </Chart>
    </main>
  );
}
