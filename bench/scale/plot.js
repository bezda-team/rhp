import * as Plot from "@observablehq/plot";
export default {
  name: "Observable Plot",
  scatter: (el, pts) => el.append(Plot.plot({ width: 600, height: 400, x: { domain: [0, 100] }, y: { domain: [0, 100] }, marks: [Plot.dot(pts, { x: "x", y: "y", r: 2, fill: "#2a78d6" })] })),
  line: (el, pts) => el.append(Plot.plot({ width: 600, height: 400, marks: [Plot.line(pts, { x: "x", y: "y", stroke: "#2a78d6" })] })),
};
