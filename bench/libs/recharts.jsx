// Recharts (React, SVG), its default animation.
import { BarChart, Bar, XAxis, YAxis, LabelList } from "recharts";
import { reactMount } from "./react.js";
const view = (rows, { band }) => (
  <BarChart layout="vertical" width={600} height={rows.length * band + 30} data={rows}>
    <XAxis type="number" domain={[0, 100]} />
    <YAxis type="category" dataKey="name" width={100} />
    <Bar dataKey="value" fill="#2a78d6"><LabelList dataKey="value" position="right" /></Bar>
  </BarChart>
);
export default { name: "Recharts", mount: reactMount(view) };
