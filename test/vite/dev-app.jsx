// A development app keeps Solid refresh enabled while library blocks remain native slat roots.
import { createSignal } from "solid-js";
import { Chart, Plot, Line, Area, slat } from "@bezda/rhp";

const DirectLine = slat({}, (d) => <Line class="direct-line" points={d.points} />);
const DirectArea = slat({}, (d) => <Area class="direct-area" points={d.points} peak={100} />);

export default function App() {
  const [points, setPoints] = createSignal([[10, 20], [50, 70], [90, 40]]);
  window.setDevPoints = setPoints;
  return <main style={{ width: "600px" }}>
    <p id="hmr-revision">before</p>
    <Chart id="dev-line" scale={[0, 100]} cross={[0, 100]} ticks={false} crossTicks={false}
      height={160} style={{ "--rhp-length-time": "0s" }}>
      <Plot points={[points()]} overlap>{DirectLine}</Plot>
    </Chart>
    <Chart id="dev-area" scale={[0, 100]} ticks={false} height={160}
      style={{ "--rhp-length-time": "0s" }}>
      <Plot points={[points()]} overlap>{DirectArea}</Plot>
    </Chart>
  </main>;
}
