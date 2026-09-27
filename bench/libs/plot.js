// Observable Plot (SVG): a chart is drawn once; an update draws it again. No animation.
import * as Plot from "@observablehq/plot";
export default { name: "Observable Plot", mount(el, rows, { band }) {
  let svg;
  const draw = (rows) => {
    const next = Plot.plot({
      width: 600, height: rows.length * band + 30, marginLeft: 100, x: { domain: [0, 100] }, y: { domain: rows.map((r) => r.name) },
      marks: [Plot.barX(rows, { x: "value", y: "name", fill: "#2a78d6" }), Plot.text(rows, { x: "value", y: "name", text: "value", dx: 12 })],
    });
    svg ? svg.replaceWith(next) : el.append(next);
    svg = next;
  };
  draw(rows);
  return { update: draw, destroy: () => svg.remove() };
} };
