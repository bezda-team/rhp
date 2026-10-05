import { Chart } from "@antv/g2";
const chart = (el) => new Chart({ container: el, width: 600, height: 400 });
export default {
  name: "AntV G2",
  scatter: (el, pts) => { const c = chart(el); c.point().data(pts).encode("x", "x").encode("y", "y").encode("size", () => 2).scale("size", { type: "identity" }); c.render(); },
  line: (el, pts) => { const c = chart(el); c.line().data(pts).encode("x", "x").encode("y", "y"); c.render(); },
};
