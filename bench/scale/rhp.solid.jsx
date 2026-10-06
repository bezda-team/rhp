// rhp: a scatter plot is an overlap Plot of one slat per point, each a Dot; a line is one Line block (an SVG path).
// Both static, as rhp's docs say for a chart whose data never changes.
import { render } from "solid-js/web";
import { Chart, Plot, Dot, Line, slat } from "../../src/index.js";
const Point = slat({}, (d) => <Dot at={d.x} cross={d.y} size="4px" />);
const Curve = slat({}, (d) => <Line points={d.points} />);
export default {
  name: "rhp",
  scatter: (el, pts) => render(() => (
    <Chart scale={[0, 100]} cross={[0, 100]} height={400} static={true}><Plot overlap={true} rows={pts}>{Point}</Plot></Chart>
  ), el),
  line: (el, pts) => render(() => (
    <Chart scale={[0, pts.length - 1]} cross={[-2, 2]} height={400} static={true}><Plot overlap={true} points={[pts.map((p) => [p.x, p.y])]}>{Curve}</Plot></Chart>
  ), el),
};
