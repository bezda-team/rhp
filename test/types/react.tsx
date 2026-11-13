// A small React app written against rhp-react's types (react/index.d.ts): npm test compiles it with tsc, so a declaration
// that drifts from the API fails here. The lines under @ts-expect-error must stay errors.
import { useState } from "react";
import {
  Chart, Plot, Scale, Theme, Bar, Dot, Tick, Label, Cell, Area, Line, Place, ManyDots, Poster, slat, restyle, linkedCss, sortBy,
  cycle, every, stackUp, shares, summary, density, series, useAnimated, useOrientation, curve, drawing, at, THEME, shape, type Row,
} from "../../react/index.js";

type Fruit = { fruit: string; sold: number };

const Fruit = slat<Fruit>({ thickness: 32, room: { start: "auto", end: 40 }, css: ".bar { --rhp-end-radius: 6px; }" }, (d) => (
  <div data-row={d.index}>
    <Label edge="start">{d.fruit}</Label>
    <Bar to={d.sold} className="bar" color="series-2" thick={0.6} onClick={() => console.log(d.position)} />
    <Label at={d.sold}>{d.sold}</Label>
  </div>
));

// A slat with a hook of its own
function Hovered(d: Row<{ v: number }>) {
  const [on, setOn] = useState(false);
  const o = useOrientation();
  return <div data-on={on} data-o={o} onPointerEnter={() => setOn(true)}><Dot at={d.v} size="8px" /><Place at={d.v} across={0.2} /></div>;
}

const Tickmark = slat({ css: ".n { color: var(--rhp-muted); }" }, (t: Row<{ at: number; first: boolean }>) => (
  <div><Tick at={t.at} thick="4px" /><Label at={t.at} className="n">{t.first ? "" : t.at}</Label></div>
));

const ARROW = shape(["M", 0, 0], ["L", "-12px", 0], ["L", 1, 0.5], ["L", "-12px", 1], ["L", 0, 1], ["Z"]);

export function App() {
  const [sold, setSold] = useState([12, 18, 7]);
  const [picked, setPicked] = useState<number | null>(null);
  const shown = useAnimated(sold[0], { duration: 300, ease: "ease-out" });
  const box = summary([1, 2, 2, 3, 4]);
  const { from, to } = stackUp(shares([30, 20, 50]));
  const ease = curve([0.4, 0, 0.2, 1]);
  linkedCss();
  restyle(Fruit, ".bar { color: red; }");
  drawing(() => setSold([1, 2, 3]));

  return (
    <Theme value={{ series: ["#2a78d6"], ink: "#111" }}>
      <Poster look="day" kicker="Fruit" title="Sold this week" note={<a href="#">Source</a>}>
        <Chart label="Fruit sold" scale={[0, 30]} ticks={every(5, { ends: true })} format={(v) => <b>{v}</b>} style={{ "--rhp-radius": "3px", maxWidth: 600 }}
          animate={{ duration: 300, ease }} aria-describedby="note">
          <Scale ticks={every(10)}>{Tickmark}</Scale>
          <Plot<Fruit> rowKey="fruit" keyboard fruit={["Apples", "Bananas", "Cherries"]} sold={sold} order={sortBy("sold", "desc")}
            picked={(d: Row) => d.index === picked} color={series()}>{Fruit}</Plot>
          <Plot overlap from={from} to={to} color={cycle(["series-1", "positive"])}>{(s) => <div><Bar from={s.from} to={s.to} shape={ARROW} /></div>}</Plot>
        </Chart>
      </Poster>
      <Chart orientation="vertical" height={200} cross={[0, 1]} crossTicks={false}>
        <Plot overlap v={[box.median, shown]}>{Hovered}</Plot>
        <Plot overlap pts={[density([1, 2, 3], { points: 10 })]}>{(d) => <div><Area points={d.pts} mirror smooth color="muted" /><Line points={d.pts} fill /></div>}</Plot>
        <ManyDots rows={[{ x: 1, y: 0.5 }]} at={(r) => r.x} cross={(r) => r.y} size={4} color="series-1" onClick={() => setPicked(at([1, 2], 0) ?? null)} />
      </Chart>
      <Chart static noCssGuard theme={{ low: THEME.low }}><Plot v={[1, 2]}>{(d) => <div><Cell value={d.v} /></div>}</Plot></Chart>
    </Theme>
  );
}

// @ts-expect-error: a scale is two numbers
export const BadScale = () => <Chart scale={[0]} />;
// @ts-expect-error: a bar's end is a number
export const BadBar = () => <Bar to="ten" />;
// @ts-expect-error: a Plot's child is a slat function
export const NoSlat = () => <Plot v={[1]} />;
// @ts-expect-error: rowKey is a group's name or a function of the row
export const BadKey = () => <Plot v={[1]} rowKey={3}>{(d) => <div />}</Plot>;

// A function data group's row is the slat's row, with no annotation
export const Picked = ({ picked }: { picked: string }) => <Chart><Plot fruit={["a"]} sold={[3]} on={(d) => d.fruit === picked && d.sold > 0}>{Fruit}</Plot></Chart>;
// @ts-expect-error: and a field the slat's row doesn't have is an error
export const BadGroup = () => <Chart><Plot fruit={["a"]} sold={[3]} on={(d) => d.price > 0}>{Fruit}</Plot></Chart>;
