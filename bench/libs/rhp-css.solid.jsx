// rhp, CSS version: values move by CSS transitions (the default).
import { render } from "solid-js/web";
import { createSignal } from "solid-js";
import { Chart, Plot, Bar, Label, slat } from "../../src/index.js";

export const make = (animate, still) => (el, rows, { band }) => {
  const [values, setValues] = createSignal(rows.map((r) => r.value));
  const names = rows.map((r) => r.name);
  const Row = slat({ thickness: band }, (d) => (
    <div>
      <Label edge="start">{d.name}</Label>
      <Bar to={d.value} />
      <Label at={d.value}>{d.value}</Label>
    </div>
  ));
  const dispose = render(() => (
    <Chart scale={[0, 100]} animate={animate} static={still}>
      <Plot name={names} value={values()}>{Row}</Plot>
    </Chart>
  ), el);
  return { update: (rows) => setValues(rows.map((r) => r.value)), destroy: dispose };
};
export default { name: "rhp (CSS version)", mount: make(undefined) };
