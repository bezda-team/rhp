// rhp-react, the React version of rhp: the chart written as a React app would, with the rows as objects
// (rows={rows}); values move by CSS transitions (the CSS version).
import { Chart, Plot, Bar, Label, slat } from "../../react/src/index.js";
import { reactMount } from "./react.js";

const types = new Map(); // one slat type per row thickness
const typeFor = (band) => types.get(band) ?? types.set(band, slat({ thickness: band }, (d) => (
  <div>
    <Label edge="start">{d.name}</Label>
    <Bar to={d.value} />
    <Label at={d.value}>{d.value}</Label>
  </div>
))).get(band);

export const make = (animate) => reactMount((rows, { band }) => (
  <Chart scale={[0, 100]} animate={animate}>
    <Plot rows={rows}>{typeFor(band)}</Plot>
  </Chart>
));
export default { name: "rhp-react (CSS version)", mount: make(undefined) };
