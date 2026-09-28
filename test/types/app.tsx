// A small app written against rhp's types (src/index.d.ts): npm test compiles it with tsc, so a declaration that
// drifts from the API fails here. The lines under @ts-expect-error must stay errors.
import { createSignal } from "solid-js";
import {
  Chart, Plot, Scale, Theme, Bar, Dot, Tick, Label, Cell, Area, slat, restyle, linkedCss, sortBy, cycle, every, nice,
  stackUp, shares, running, summary, bins, density, extent, series, animated, curve, at, THEME, Line, type Row,
} from "../../src/index.js";

type Fruit = { fruit: string; sold: number };

const Row = slat<Fruit>({ thickness: 32, room: { start: "auto", end: 40 }, css: ".bar { --rhp-end-radius: 6px; }" }, (d) => (
  <div>
    <Label edge="start">{d.fruit}</Label>
    <Bar to={d.sold} class="bar" color="series-2" thick={0.6} />
    <Label at={d.sold}>{d.sold}</Label>
  </div>
));

const Tickmark = slat({ css: ".n { color: var(--rhp-muted); }" }, (t: Row<{ at: number; first: boolean }>) => (
  <div><Tick at={t.at} thick="4px" /><Label at={t.at} class="n">{t.first ? "" : t.at}</Label></div>
));

export function App() {
  const [sold, setSold] = createSignal([12, 18, 7]);
  const samples = [1, 2, 2, 3, 4];
  const box = summary(samples);
  const { from, to } = stackUp(shares([30, 20, 50]));
  const ease = curve([0.4, 0, 0.2, 1]);
  const moving = animated(() => sold()[0], () => ({ duration: 300, ease: "ease-out" }));
  linkedCss();
  restyle(Row, ".bar { color: red; }");
  setSold([1, 2, 3]);

  return (
    <Theme value={{ series: ["#2a78d6"], ink: "#111" }}>
      <Chart scale={[0, 30]} orientation="vertical" height={200} ticks={every(5, { ends: true })} format={(v) => <b>{v}</b>}
        animate={{ duration: 200, ease: "ease-in-out", slide: 150 }} label="Fruit sold" aria-describedby="note" theme={{ muted: "#555" }}>
        <Scale ticks={5}>{Tickmark}</Scale>
        <Plot fruit={["Apples", "Kiwis", "Figs"]} sold={sold()} order={sortBy("sold", "desc")} key="fruit" reorder="slide" color={cycle(["a", "b"])}>{Row}</Plot>
        <Plot overlap v={[moving(), ease(0.5), extent(samples)[1], nice(0, 9).max, box.median, from[0], to[0]]} animate={["v"]}>
          {(d) => <div><Dot at={d.v as number} across={0.5} size="8px" /><Cell value={at([1, 2], d.index)} /></div>}
        </Plot>
        <Plot v={running([1, -2]).to} color={series(3)} static>{(d) => <div><Area points={density(samples)} mirror /><Bar to={d.v as number} /></div>}</Plot>
        <Plot slats={bins(samples).tally.length} rows={[{ a: 1 }]}>{(d) => <div data-i={d.index} data-p={d.position ?? -1} />}</Plot>
      </Chart>
      <Chart scale={[0, 10]} cross={[0, 50]} crossTicks={every(10)} crossFormat={(v) => v + "%"}>
        <Plot overlap x={[1, 2]} y={[10, 40]}>{(d) => <div><Dot at={d.x as number} cross={d.y as number} /><Label at={d.x as number} cross={d.y as number}>{String(d.y)}</Label></div>}</Plot>
        <Plot overlap pts={[[[0, 5], [10, 45]]]}>{(d) => <div><Line points={d.pts as [number, number][]} fill base={0} color="series-3" /></div>}</Plot>
      </Chart>
      <Chart scale={[0, 10]}><Plot keyboard fruit={["Apples"]}>{(d) => <div onFocus={() => d.index}>{String(d.fruit)}</div>}</Plot></Chart>
      {/* @ts-expect-error: a cross scale is [min, max] too */}
      <Chart cross={50} />
      {/* @ts-expect-error: a scale is [min, max] */}
      <Chart scale={30} />
      {/* @ts-expect-error: a Plot needs a slat */}
      <Plot v={[1]} />
      {/* @ts-expect-error: an edge is start or end */}
      <Label edge="middle" />
      {/* @ts-expect-error: reorder has three ways */}
      <Plot reorder="jump" v={[1]}>{() => <div />}</Plot>
      {THEME.ink}
    </Theme>
  );
}
