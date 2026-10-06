// The browser starts with newer appearance props than the HTML supplied by the server.
import { createSignal } from "solid-js";
import { Chart, ManyDots, shape } from "../src/index.js";

const triangle = shape(["M", 0, 0], ["L", 1, 0.5], ["L", 0, 1], ["Z"]);

export function HydrationChangeApp(props) {
  const [rows, setRows] = createSignal([{ id: "kept", x: 2, y: 5 }]);
  if (typeof window !== "undefined") window.HCHANGE = { setRows };
  return (
    <Chart id="hydration-change" scale={[0, 10]} cross={[0, 20]} ticks={false} crossTicks={false} height={100}>
      <ManyDots id="hydration-change-points" rows={rows()} key={(d) => d.id} at={(d) => d.x} cross={(d) => d.y}
        size={props.updated ? 6 : () => 10} color={props.updated ? "rgb(20, 110, 190)" : () => "rgb(190, 40, 70)"}
        shape={props.updated ? undefined : () => triangle} pointStyle={props.updated ? undefined : { opacity: "0.5" }} />
    </Chart>
  );
}

export function HydrationForeignApp(props) {
  const [rows, setRows] = createSignal(props.updated ? [{ id: "new", x: 5, y: 10 }] : []);
  if (typeof window !== "undefined") window.HFOREIGN = { setRows };
  return (
    <Chart id="hydration-foreign" scale={[0, 10]} cross={[0, 20]} ticks={false} crossTicks={false} height={100}>
      <ManyDots id="hydration-foreign-points" rows={rows()} key={(d) => d.id} at={(d) => d.x} cross={(d) => d.y} size={6} />
    </Chart>
  );
}
