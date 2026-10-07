import { createSignal, batch } from "solid-js";
import { render } from "solid-js/web";
import { Chart, Plot, Bar, Dot, Cell, Label, Area, Line } from "../src/index.js";

const [style, setStyle] = createSignal("--n: 1");
const [value, setValue] = createSignal(6);
const [opacity, setOpacity] = createSignal("0.9");
const stableStyle = Object.freeze({ get opacity() { return opacity(); } });
const Row = (d) => <div>
  <Bar to={d.v} color="red" class="mark fast" style={style()} />
  <Bar to={d.v} class="mark spread" title="Native attribute" style={style()} />
  <Dot at={d.v} size="12px" class="mark dot" style={style()} />
  <Cell value={d.v} class="mark cell" style={style()} />
  <Label at={d.v} class="mark label" style={style()}>{d.v}</Label>
  <Area points={[[0,1],[d.v,2]]} class="mark area" style={style()} />
  <Line points={[[0,1],[d.v,2]]} class="mark line" style={style()} />
  <Bar to={d.v} class="getter" title="Stable reactive object" style={stableStyle} />
  <Area points={[[0,1],[d.v,2]]} class="getter" style={stableStyle} />
  <Line points={[[0,1],[d.v,2]]} class="getter" style={stableStyle} />
</div>;

render(() => <Chart scale={[0,10]} ticks={false}><Plot v={[value()]}>{Row}</Plot></Chart>, document.body);
window.T = { setStyle, setValue, setOpacity, together: (style, value) => batch(() => { setStyle(style); setValue(value); }) };
