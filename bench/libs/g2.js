// AntV G2 5 (canvas, through AntV G), its default animation, value labels on.
import { Chart } from "@antv/g2";
export default { name: "AntV G2", mount(el, rows, { band }) {
  const box = document.createElement("div"); el.append(box);
  const chart = new Chart({ container: box, width: 600, height: rows.length * band + 40 });
  chart.interval().data(rows).encode("x", "name").encode("y", "value").encode("color", () => "#2a78d6").scale("color", { type: "identity" })
    .scale("y", { domain: [0, 100] }).coordinate({ transform: [{ type: "transpose" }] }).label({ text: "value", position: "right" });
  chart.render();
  return {
    update: (rows) => chart.changeData(rows),
    destroy: () => { chart.destroy(); box.remove(); },
  };
} };
