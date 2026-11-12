// Charts written once and drawn twice, by rhp with Solid and by rhp-react, to check that both draw the same thing.
// "rhp" is rhp's source in the Solid page and rhp-react's in the React page. Each chart is { data, steps, view }: view(data)
// is the chart, and each step makes the next data from the data before it. Values come from formulas of their index.
// The source is the same for both, so it says data-* where a class would be (Solid's class is React's className), and
// key and rowKey together where rows have an identity (React keeps key for itself; rhp-react calls it rowKey).
import { Chart, Plot, Scale, Theme, Bar, Dot, Tick, Label, Cell, Place, Area, Line, Poster, ManyDots, slat, shape, sortBy, cycle, every, stackUp, shares, running, summary, density, series } from "rhp";

export const CHARTS = {};
const chart = (name, data, steps, view) => (CHARTS[name] = { data, steps, view });

const names = (n, p = "Item") => Array.from({ length: n }, (_, i) => p + " " + (i + 1));
const values = (n, t = 0) => Array.from({ length: n }, (_, i) => 10 + ((i * 37 + t * 11) % 80));

// A bar chart: names at the start, values at the end
const Fruit = slat({ thickness: 32, room: { start: 80, end: 40 } }, (d) => (
  <div>
    <Label edge="start">{d.name}</Label>
    <Bar to={d.sold} />
    <Label at={d.sold}>{d.sold}</Label>
  </div>
));
chart("bars", { sold: [12, 18, 7] }, [() => ({ sold: [12, 25, 7] }), () => ({ sold: [30, 2, 14] })],
  (data) => <Chart scale={[0, 30]}><Plot name={["Apples", "Bananas", "Cherries"]} sold={data.sold}>{Fruit}</Plot></Chart>);

// Columns, with a format that returns elements, and colors through the series
const Column = slat({ css: `[data-k=v] { font-weight: 600; } [data-k=u] { color: var(--rhp-muted); }` }, (d) => (
  <div>
    <Label edge="start">{d.month}</Label>
    <Bar to={d.rain} color={d.color} />
    <Label at={d.rain} data-k="v">{d.rain}</Label>
  </div>
));
chart("columns", { rain: values(6) }, [(d) => ({ rain: values(6, 3) })],
  (data) => (
    <Chart orientation="vertical" scale={[0, 100]} height={200} ticks={4} format={(v) => <span data-k="u">{v}%</span>}>
      <Plot month={["Jan", "Feb", "Mar", "Apr", "May", "Jun"]} rain={data.rain} color={series()}>{Column}</Plot>
    </Chart>
  ));

// Sorted by a function, sliding; then the same rows with the order given as a list (null hides a row)
const Ranked = slat({ thickness: 24 }, (d) => (
  <div data-k={d.name}>
    <Label edge="start">{d.name}</Label>
    <Bar to={d.v} color={d.v > 50 ? "positive" : "series-1"} />
    <Label at={d.v}>{d.v}</Label>
  </div>
));
chart("sorted", { v: values(8) }, [(d) => ({ v: values(8, 2) }), (d) => ({ v: d.v.map((x, i) => (i === 3 ? 99 : x)) })],
  (data) => <Chart><Plot name={names(8)} v={data.v} order={sortBy("v", "desc")}>{Ranked}</Plot></Chart>);
chart("ordered", { order: [2, null, 0, 1, 3] }, [() => ({ order: [0, 1, 2, 3, 4] }), () => ({ order: [4, 3, null, 1, 0] })],
  (data) => <Chart><Plot name={names(5)} v={values(5)} order={data.order}>{Ranked}</Plot></Chart>);

// The rows move in the page, and refill their slots
chart("moved", { v: values(6) }, [(d) => ({ v: values(6, 5) })],
  (data) => <Chart><Plot reorder="move" name={names(6)} v={data.v} order={sortBy("v")}>{Ranked}</Plot></Chart>);
chart("refilled", { v: values(6) }, [(d) => ({ v: values(6, 5) })],
  (data) => <Chart><Plot reorder="refill" name={names(6)} v={data.v} order={sortBy("v")}>{Ranked}</Plot></Chart>);

// Rows with an identity: removing one takes its slat with it
const Person = slat({ thickness: 22, room: { start: 70 } }, (d) => (
  <div data-k={d.name}>
    <Label edge="start">{d.name}</Label>
    <Bar from={d.start} to={d.end} />
    <Label at={d.end}>{d.index}</Label>
  </div>
));
const PEOPLE = ["Ada", "Ben", "Cy", "Dee", "Eve"].map((name, i) => ({ name, start: i * 8, end: 30 + i * 12 }));
chart("keyed", { rows: PEOPLE }, [(d) => ({ rows: d.rows.filter((r) => r.name !== "Ben") }), (d) => ({ rows: [{ name: "Zed", start: 5, end: 50 }, ...d.rows] })],
  (data) => <Chart scale={[0, 100]}><Plot key="name" rowKey="name" rows={data.rows}>{Person}</Plot></Chart>);

// Stacked segments: an overlap Plot inside each row
const Segment = (s) => <div><Bar from={s.from} to={s.to} color={s.color} data-k="seg" /></div>;
const Stack = slat({ thickness: 28, room: { start: 60, end: 40 }, css: `[data-k=seg] { --rhp-gap: 2px; --rhp-radius: 0px; }` }, (d) => (
  <div>
    <Label edge="start">{d.name}</Label>
    <Plot overlap from={stackUp(d.parts).from} to={stackUp(d.parts).to} color={series(3)}>{Segment}</Plot>
    <Label at={d.parts.reduce((a, b) => a + b, 0)}>{d.parts.reduce((a, b) => a + b, 0)}</Label>
  </div>
));
const parts = (t) => [0, 1, 2, 3].map((i) => [10 + ((i + t) * 7) % 20, 5 + ((i * 3 + t) * 5) % 25, 8 + ((i + 2 * t) * 11) % 18]);
chart("stacked", { parts: parts(0) }, [() => ({ parts: parts(1) })],
  (data) => <Chart scale={[0, 70]}><Plot name={["North", "South", "East", "West"]} parts={data.parts}>{Stack}</Plot></Chart>);

// A heatmap: rows of cells across the row
const Hour = (h) => <div><Cell value={h.v} /></div>;
const Day = slat({ thickness: { horizontal: 14 }, room: { start: 48 } }, (d) => (
  <div>
    <Label edge="start">{d.day}</Label>
    <Plot orientation="across" v={d.hours}>{Hour}</Plot>
  </div>
));
const hours = (t) => Array.from({ length: 7 }, (_, r) => Array.from({ length: 12 }, (_, c) => (r * 13 + c * 29 + t * 17) % 100));
chart("heatmap", { hours: hours(0) }, [() => ({ hours: hours(1) })],
  (data) => <Chart scale={[0, 100]} ticks={false}><Plot day={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]} hours={data.hours}>{Day}</Plot></Chart>);

// A scatter plot on a cross scale, with a label at each point and a line through them
const points = (n, t = 0) => Array.from({ length: n }, (_, i) => ({ x: ((i * 0.618 + t * 0.1) % 1) * 100, y: ((i * 0.7548 + t * 0.2) % 1) * 80 + 10, name: "P" + i }));
const Point = (d) => <div><Dot at={d.x} cross={d.y} size="8px" color={d.index % 2 ? "series-2" : "series-1"} /><Label at={d.x} cross={d.y}>{d.name}</Label></div>;
const Trend = (d) => <div><Line points={d.pts} fill base={0} /></div>;
chart("scatter", { rows: points(12) }, [() => ({ rows: points(12, 1) }), () => ({ rows: points(9, 2) })],
  (data) => (
    <Chart scale={[0, 100]} cross={[0, 100]} height={260} crossFormat={(v) => v + " t"}>
      <Plot overlap points={[data.rows.map((r) => [r.x, r.y]).sort((a, b) => a[0] - b[0])]}>{Trend}</Plot>
      <Plot overlap rows={data.rows}>{Point}</Plot>
    </Chart>
  ));

// Areas: violins (mirrored, smooth) and ridgelines
const samples = (k, t) => Array.from({ length: 60 }, (_, i) => 20 + k * 9 + ((i * 37 + k * 11 + t * 5) % 41) - (i % 7) * 2);
const Violin = slat({ thickness: 60, room: { start: 70 } }, (d) => (
  <div>
    <Label edge="start">{d.name}</Label>
    <Area points={density(d.s, { domain: [0, 100] })} mirror smooth color={d.color} />
    <Tick at={summary(d.s).median} thick={0.5} />
  </div>
));
const Ridge = slat({ thickness: 40, inset: 0.05 }, (d) => <div><Area points={density(d.s, { domain: [0, 100], points: 25 })} /></div>);
chart("areas", { s: [0, 1, 2].map((k) => samples(k, 0)) }, [() => ({ s: [0, 1, 2].map((k) => samples(k, 3)) })],
  (data) => (
    <div>
      <Chart scale={[0, 100]}><Plot name={["A", "B", "C"]} s={data.s} color={cycle(["series-1", "positive", "negative"])}>{Violin}</Plot></Chart>
      <Chart scale={[0, 100]} ticks={false}><Plot s={data.s}>{Ridge}</Plot></Chart>
    </div>
  ));

// A Scale drawn by a slat: every 5, its ends included
const Rule = slat({ css: `[data-k=t] { position: absolute; inset: 0 auto 0 0; border-left: 1px dashed var(--rhp-grid); } [data-k=t][data-last] { border-color: var(--rhp-ink); }` },
  (t) => <div><Tick at={t.at} thick={1} data-k="t" data-last={t.last ? "" : undefined} /><Label at={t.at}>{t.at}</Label></div>);
chart("scale", { top: 27 }, [() => ({ top: 41 })],
  (data) => (
    <Chart scale={[0, data.top]}>
      <Scale ticks={every(5, { ends: true })}>{Rule}</Scale>
      <Plot name={names(3)} sold={[5, data.top - 3, 12]}>{Fruit}</Plot>
    </Chart>
  ));

// Room "auto": the gutters as wide as the widest edge labels, horizontal and vertical
const Auto = slat({ thickness: 26, room: { start: "auto", end: "auto" }, css: `[data-k=e] { color: var(--rhp-muted); }` }, (d) => (
  <div>
    <Label edge="start">{d.name}</Label>
    <Bar to={d.v} />
    <Label edge="end" data-k="e">{d.v + " units"}</Label>
  </div>
));
chart("gutters", { n: ["Short", "A much longer name", "Mid one"] }, [() => ({ n: ["S", "Even a far longer name than before", "Mid"] })],
  (data) => (
    <div>
      <Chart><Plot name={data.n} v={[30, 60, 45]}>{Auto}</Plot></Chart>
      <Chart orientation="vertical" height={160}><Plot name={data.n} v={[30, 60, 45]}>{Auto}</Plot></Chart>
    </div>
  ));

// aspect, and a chart with a height whose rows share it
const Thin = (d) => <div><Bar to={d.v} /></div>;
chart("aspect", { v: values(5) }, [() => ({ v: values(5, 1) })],
  (data) => (
    <div>
      <Chart aspect={2.5}><Plot v={data.v}>{Thin}</Plot></Chart>
      <Chart height={140}><Plot v={data.v}>{Thin}</Plot></Chart>
    </div>
  ));

// A Theme around, and a chart's own theme over it
chart("themed", { dark: false }, [() => ({ dark: true })],
  (data) => (
    <Theme value={data.dark ? { ink: "#eeeeee", series: ["#ff8800", "#00aaff"], surface: "#111111" } : { ink: "#222222" }}>
      <Chart theme={{ positive: "#118811" }}><Plot name={names(4)} v={values(4)}>{Ranked}</Plot></Chart>
    </Theme>
  ));

// Missing values: nothing drawn, and a line broken where a point is missing
const Gappy = slat({ thickness: 24, room: { start: 60 } }, (d) => (
  <div>
    <Label edge="start">{d.name}</Label>
    <Bar to={d.v} />
    <Dot at={d.v} />
    <Label at={d.v}>{Number.isFinite(d.v) ? d.v : "–"}</Label>
  </div>
));
const Spark = slat({ thickness: 40 }, (d) => <div><Line points={d.pts} /></div>);
chart("missing", { v: [10, null, 30, NaN, 50] }, [() => ({ v: [10, 20, null, 40, Infinity] })],
  (data) => (
    <div>
      <Chart><Plot name={names(5)} v={data.v}>{Gappy}</Plot></Chart>
      <Chart scale={[0, 4]} ticks={false}><Plot pts={[data.v.map((v, i) => [i, v])]}>{Spark}</Plot></Chart>
    </div>
  ));

// Shapes, and bars that run backward (a diverging chart)
const GABLE = shape(["M", 0, 0], ["L", "-14px", 0], ["L", 1, 0.5], ["L", "-14px", 1], ["L", 0, 1], ["Z"]);
const Diverging = slat({ thickness: 26, room: { start: 50 } }, (d) => (
  <div>
    <Label edge="start">{d.name}</Label>
    <Bar from={0} to={d.v} shape={GABLE} color={d.v < 0 ? "negative" : "positive"} />
    <Label at={d.v} side={d.v < 0 ? "before" : "after"}>{d.v}</Label>
  </div>
));
chart("diverging", { v: [-30, 20, -10, 45] }, [() => ({ v: [25, -15, 10, -40] })],
  (data) => <Chart scale={[-50, 50]}><Plot name={names(4)} v={data.v}>{Diverging}</Plot></Chart>);

// A Place holding an element of the slat's own, a Tick, and Dots across the band
const Pin = slat({ thickness: 30, css: `[data-k=pin] { position: absolute; width: 8px; height: 8px; translate: -50% -50%; border-radius: 50%; background: var(--rhp-negative); }` }, (d) => (
  <div>
    <Bar to={d.v} thick={0.3} />
    <Tick at={d.target} color="ink" />
    <Place at={d.v}><i data-k="pin" /></Place>
    <Dot at={d.target} across={0.2} size={0.3} />
  </div>
));
chart("bullets", { v: [40, 70, 20] }, [() => ({ v: [60, 30, 90] })],
  (data) => <Chart><Plot v={data.v} target={[50, 60, 70]}>{Pin}</Plot></Chart>);

// A static chart: sorted, and drawn anew when the data changes
chart("static", { v: values(6) }, [() => ({ v: values(6, 4) })],
  (data) => <Chart static><Plot name={names(6)} v={data.v} order={sortBy("v", "desc")}>{Ranked}</Plot></Chart>);

// The JS version: the scale and the values move on rhp's clock
chart("js", { v: values(5), top: 100 }, [() => ({ v: values(5, 2), top: 150 })],
  (data) => <Chart scale={[0, data.top]} animate><Plot name={names(5)} v={data.v} order={sortBy("v", "desc")}>{Ranked}</Plot></Chart>);

// keyboard: one tab stop, in the order shown
chart("keyboard", { v: values(5) }, [() => ({ v: values(5, 3) })],
  (data) => <Chart label="Items by value"><Plot keyboard name={names(5)} v={data.v} order={sortBy("v")}>{Ranked}</Plot></Chart>);

// A function data group, worked out per row, with a selection that is the app's state
const Picked = slat({ thickness: 24, css: `[data-on] { outline: 2px solid var(--rhp-ink); }` }, (d) => (
  <div data-on={d.on ? "" : undefined}>
    <Bar to={d.v} color={d.tone} />
    <Label at={d.v}>{d.index + ": " + d.v}</Label>
  </div>
));
chart("selected", { on: 1 }, [() => ({ on: 3 }), () => ({ on: -1 })],
  (data) => <Chart><Plot v={values(5)} on={(d) => d.index === data.on} tone={cycle(["series-3", "series-4"])}>{Picked}</Plot></Chart>);

// Segmented 100% bars from shares, and a waterfall from running totals
const Share = (s) => <div><Bar from={s.from} to={s.to} color={s.color} /></div>;
const Hundred = slat({ thickness: 30, room: { start: 40 } }, (d) => (
  <div>
    <Label edge="start">{d.name}</Label>
    <Plot overlap from={stackUp(shares(d.parts)).from} to={stackUp(shares(d.parts)).to} color={series()}>{Share}</Plot>
  </div>
));
const Step = slat({ thickness: 26 }, (d) => <div><Bar from={d.from} to={d.to} color={d.to < d.from ? "negative" : "positive"} /><Label at={Math.max(d.from, d.to)}>{d.change}</Label></div>);
chart("shares", { parts: parts(0), changes: [40, -10, 25, -30, 15] }, [() => ({ parts: parts(2), changes: [30, 20, -45, 10, 5] })],
  (data) => (
    <div>
      <Chart><Plot name={["N", "S", "E", "W"]} parts={data.parts}>{Hundred}</Plot></Chart>
      <Chart scale={[0, 80]}><Plot change={data.changes} from={running(data.changes).from} to={running(data.changes).to}>{Step}</Plot></Chart>
    </div>
  ));

// A Plot's own thickness inside a row, a label before its value and one at the end, and a Plot's own inset
const Pair = (s) => <div><Bar to={s.v} color={s.color} /></div>;
const Grouped = slat({ thickness: 40, inset: 0.1, room: { start: 50, end: 50 } }, (d) => (
  <div>
    <Label edge="start">{d.name}</Label>
    <Plot orientation="across" thick={0.8} v={d.pair} color={["series-1", "series-2"]}>{Pair}</Plot>
    <Label edge="end">{d.pair[0] + d.pair[1]}</Label>
  </div>
));
chart("grouped", { pairs: [[20, 35], [40, 15], [25, 25]] }, [() => ({ pairs: [[30, 10], [10, 45], [35, 20]] })],
  (data) => <Chart scale={[0, 50]}><Plot name={["X", "Y", "Z"]} pair={data.pairs}>{Grouped}</Plot></Chart>);

// A Poster around a chart
chart("poster", { v: values(3) }, [() => ({ v: values(3, 1) })],
  (data) => (
    <Poster look="day" kicker="Kicker" title="A headline" dek="The dek under it" note="Source: a formula">
      <Chart scale={[0, 100]}><Plot name={names(3)} sold={data.v}>{Fruit}</Plot></Chart>
    </Poster>
  ));

// Many points, as plain elements
const cloud = (n, t) => Array.from({ length: n }, (_, i) => ({ x: ((i * 0.618 + t * 0.05) % 1) * 100, y: ((i * 0.7548) % 1) * 100, k: i % 3 }));
chart("manydots", { rows: cloud(300, 0) }, [() => ({ rows: cloud(250, 1) })],
  (data) => (
    <Chart scale={[0, 100]} cross={[0, 100]} height={220}>
      <ManyDots rows={data.rows} at={(r) => r.x} cross={(r) => r.y} size={(r) => 3 + r.k * 2} color={(r) => (r.k ? "series-2" : "series-1")} />
    </Chart>
  ));

// Charts in a vertical chart's orientation turned: a strip of dots with an overlap Plot, and noCssGuard
const Strip = (d) => <Dot at={d.v} across={0.5} size="9px" color="series-5" />;
chart("strip", { v: values(20) }, [() => ({ v: values(20, 6) })],
  (data) => (
    <div>
      <Chart orientation="vertical" height={120}><Plot overlap v={data.v}>{Strip}</Plot></Chart>
      <Chart noCssGuard><Plot overlap v={data.v}>{Strip}</Plot></Chart>
    </div>
  ));

// A chart that turns, with an axis whose ticks change with the scale
chart("turned", { o: "horizontal", top: 80 }, [() => ({ o: "vertical", top: 80 }), () => ({ o: "vertical", top: 1200 })],
  (data) => <Chart orientation={data.o} scale={[0, data.top]} height={180}><Plot name={names(4)} v={values(4).map((v) => (v * data.top) / 100)}>{Ranked}</Plot></Chart>);
