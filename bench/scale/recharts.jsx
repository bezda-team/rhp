import { ScatterChart, Scatter, LineChart, Line, XAxis, YAxis } from "recharts";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
const mount = (el, view) => { const root = createRoot(el); flushSync(() => root.render(view)); };
export default {
  name: "Recharts",
  scatter: (el, pts) => mount(el, <ScatterChart width={600} height={400}><XAxis type="number" dataKey="x" domain={[0, 100]} /><YAxis type="number" dataKey="y" domain={[0, 100]} /><Scatter data={pts} fill="#2a78d6" /></ScatterChart>),
  line: (el, pts) => mount(el, <LineChart width={600} height={400} data={pts}><XAxis type="number" dataKey="x" /><YAxis /><Line dataKey="y" dot={false} stroke="#2a78d6" /></LineChart>),
};
