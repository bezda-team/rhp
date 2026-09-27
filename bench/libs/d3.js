// D3 by hand (SVG): data join, axis, and a 150 ms transition on updates (rhp's default time).
import { select } from "d3-selection";
import { scaleLinear, scaleBand } from "d3-scale";
import { axisBottom } from "d3-axis";
import "d3-transition";
export default { name: "D3 (by hand)", mount(el, rows, { band }) {
  const w = 600, h = rows.length * band, left = 100;
  const x = scaleLinear([0, 100], [left, w - 40]), y = scaleBand(rows.map((r) => r.name), [0, h]).padding(0.36);
  const svg = select(el).append("svg").attr("width", w).attr("height", h + 24).style("font", "12px system-ui");
  svg.append("g").attr("transform", `translate(0,${h})`).call(axisBottom(x).ticks(5));
  const g = svg.append("g");
  const draw = (rows, t) => {
    const s = g.selectAll("g.row").data(rows, (r) => r.name).join((e) => {
      const r = e.append("g").attr("class", "row");
      r.append("text").attr("class", "name").attr("x", left - 8).attr("text-anchor", "end").attr("dy", "0.35em");
      r.append("rect").attr("x", left).attr("fill", "#2a78d6").attr("rx", 2);
      r.append("text").attr("class", "value").attr("dx", 5).attr("dy", "0.35em");
      return r;
    });
    s.select(".name").attr("y", (r) => y(r.name) + y.bandwidth() / 2).text((r) => r.name);
    s.select("rect").attr("y", (r) => y(r.name)).attr("height", y.bandwidth());
    (t ? s.select("rect").transition().duration(150) : s.select("rect")).attr("width", (r) => x(r.value) - left);
    (t ? s.select(".value").transition().duration(150) : s.select(".value")).attr("x", (r) => x(r.value)).attr("y", (r) => y(r.name) + y.bandwidth() / 2).text((r) => r.value);
  };
  draw(rows, false);
  return { update: (rows) => draw(rows, true), destroy: () => svg.remove() };
} };
