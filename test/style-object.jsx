import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { Chart, Plot, Bar, Label, Dot, Area, Line } from "../src/index.js";

const [opacity, setOpacity] = createSignal("0.9");
const [replacement, replaceStyle] = createSignal(Object.freeze({ opacity: "0.8", outline: "1px solid red" }));
const stable = Object.freeze({ get opacity() { return opacity(); } });
const [value, setValue] = createSignal(6);
const marks = (d) => <div>
  <Bar to={d.v} class="fast" style={stable} />
  <Bar to={d.v} class="spread" title="Native attribute" style={stable} />
  <Dot at={d.v} class="dot" size="12px" style={stable} />
  <Label at={d.v} class="label" style={stable}>value</Label>
  <Area points={[[0,1],[d.v,2]]} class="area" style={stable} />
  <Line points={[[0,1],[d.v,2]]} class="line" style={stable} />
  <Bar to={d.v} class="replacement" style={replacement()} />
</div>;

render(() => <Chart scale={[0,10]} ticks={false}><Plot v={[value()]}>{marks}</Plot></Chart>, document.body);
window.T = { setOpacity, replaceStyle, setValue, stable };
