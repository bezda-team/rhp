import { select } from "d3-selection";
import { scaleLinear } from "d3-scale";
import { axisBottom, axisLeft } from "d3-axis";
import { line as d3line } from "d3-shape";
import { extent } from "d3-array";
const frame = (el, xd, yd) => {
  const svg = select(el).append("svg").attr("width", 600).attr("height", 400);
  const x = scaleLinear(xd, [40, 590]), y = scaleLinear(yd, [380, 10]);
  svg.append("g").attr("transform", "translate(0,380)").call(axisBottom(x));
  svg.append("g").attr("transform", "translate(40,0)").call(axisLeft(y));
  return { svg, x, y };
};
export default {
  name: "D3 (by hand)",
  scatter: (el, pts) => { const { svg, x, y } = frame(el, [0, 100], [0, 100]); svg.append("g").attr("fill", "#2a78d6").selectAll("circle").data(pts).join("circle").attr("cx", (p) => x(p.x)).attr("cy", (p) => y(p.y)).attr("r", 2); },
  line: (el, pts) => { const { svg, x, y } = frame(el, extent(pts, (p) => p.x), [-2, 2]); svg.append("path").attr("fill", "none").attr("stroke", "#2a78d6").attr("stroke-width", 1.5).attr("d", d3line().x((p) => x(p.x)).y((p) => y(p.y))(pts)); },
};
