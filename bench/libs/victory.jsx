// Victory (React, SVG), its defaults (no animation unless asked).
import { VictoryChart, VictoryBar, VictoryAxis } from "victory";
import { reactMount } from "./react.js";
const view = (rows, { band }) => (
  <VictoryChart horizontal width={600} height={rows.length * band + 40} domain={{ y: [0, 100] }} padding={{ left: 100, right: 40, top: 5, bottom: 30 }}>
    <VictoryAxis />
    <VictoryAxis dependentAxis />
    <VictoryBar data={rows} x="name" y="value" labels={({ datum }) => datum.value} style={{ data: { fill: "#2a78d6" } }} />
  </VictoryChart>
);
export default { name: "Victory", mount: reactMount(view) };
