import embed from "vega-embed";
const spec = (mark, pts) => ({ $schema: "https://vega.github.io/schema/vega-lite/v6.json", width: 540, height: 360, data: { values: pts }, mark, encoding: { x: { field: "x", type: "quantitative" }, y: { field: "y", type: "quantitative" } } });
export default {
  name: "Vega-Lite",
  scatter: (el, pts) => embed(el, spec({ type: "circle", size: 12 }, pts), { actions: false }),
  line: (el, pts) => embed(el, spec({ type: "line", strokeWidth: 1.5 }, pts), { actions: false }),
};
