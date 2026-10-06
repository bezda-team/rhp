// Independent Solid roots exercise shared point styles without relying on one application owner.
import { createSignal } from "solid-js";
import { Chart, ManyDots, shape } from "../src/index.js";

const triangle = shape(["M", 0, 0], ["L", 1, 0.5], ["L", 0, 1], ["Z"]);
const diamond = shape(["M", 0, 0.5], ["L", 0.5, 0], ["L", 1, 0.5], ["L", 0.5, 1], ["Z"]);

export function ManyDotsIsland(props) {
  const a = props.id === "island-a";
  const [color, setColor] = createSignal(a ? "rgb(160, 30, 70)" : "rgb(20, 110, 190)");
  const [size, setSize] = createSignal(a ? 6 : 10);
  const [pointShape, setShape] = createSignal(a ? triangle : diamond);
  if (typeof window !== "undefined") {
    window.ISLANDS ??= {};
    window.ISLANDS[props.id] = { setColor, setSize, setShape };
  }
  return (
    <Chart id={props.id} scale={[0, 10]} cross={[0, 20]} ticks={false} crossTicks={false} height={100}>
      <ManyDots id={props.id + "-points"} rows={[{ id: props.id, x: a ? 2 : 8, y: a ? 5 : 15 }]} key={(d) => d.id}
        at={(d) => d.x} cross={(d) => d.y} color={color()} size={size()} shape={pointShape()} />
    </Chart>
  );
}
