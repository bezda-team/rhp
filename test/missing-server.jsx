// The server side of the missing data tests: a block with a missing value and a line with a gap, rendered to HTML
import { renderToString } from "solid-js/web";
import { Chart, Plot, Bar, Label, Line } from "../src/index.js";

export const html = () => renderToString(() => (
  <Chart scale={[0, 10]} cross={[0, 10]}>
    <Plot overlap v={[null, 4]}>{(d) => (
      <div>
        <Bar to={d.v} class="bar" />
        <Label at={d.v} class="label">{String(d.v)}</Label>
        <Label edge="start" class="name">{String(d.v)}</Label>
        <Line points={[[0, 2], [1, 6], [2, null], [3, 8], [4, 5]]} class="line" />
      </div>
    )}</Plot>
  </Chart>
));
