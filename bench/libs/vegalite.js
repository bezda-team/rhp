// Vega-Lite through vega-embed (canvas, its default renderer). A spec is compiled and drawn asynchronously; an update
// replaces the data in the running view. No animation.
import embed from "vega-embed";
export default { name: "Vega-Lite", mount(el, rows, { band }) {
  const box = document.createElement("div"); el.append(box);
  const spec = {
    $schema: "https://vega.github.io/schema/vega-lite/v6.json", width: 500, height: rows.length * band,
    data: { name: "table", values: rows },
    encoding: { y: { field: "name", type: "nominal", sort: null, title: null }, x: { field: "value", type: "quantitative", scale: { domain: [0, 100] }, title: null } },
    layer: [{ mark: { type: "bar", color: "#2a78d6" } }, { mark: { type: "text", align: "left", dx: 4 }, encoding: { text: { field: "value" } } }],
  };
  let view = null, pending = null;
  const ready = embed(box, spec, { actions: false }).then((r) => { view = r.view; if (pending) view.data("table", pending).run(); });
  return {
    update: (rows) => { if (view) view.data("table", rows).run(); else pending = rows; },
    destroy: () => { ready.then(() => view?.finalize()); box.remove(); },
  };
} };
