// Nivo (React, SVG), its default motion (react-spring).
import { Bar } from "@nivo/bar";
import { reactMount } from "./react.js";
const view = (rows, { band }) => (
  <Bar data={rows} keys={["value"]} indexBy="name" layout="horizontal" width={600} height={rows.length * band + 30}
    margin={{ left: 100, right: 40, bottom: 25 }} valueScale={{ type: "linear", min: 0, max: 100 }} colors={["#2a78d6"]} />
);
export default { name: "Nivo", mount: reactMount(view) };
