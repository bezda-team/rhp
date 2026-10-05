import { Chart, ScatterController, LineController, PointElement, LineElement, LinearScale } from "chart.js";
Chart.register(ScatterController, LineController, PointElement, LineElement, LinearScale);
const canvas = (el) => { const b = document.createElement("div"); b.style.cssText = "position:relative;width:600px;height:400px"; const c = document.createElement("canvas"); b.append(c); el.append(b); return c; };
export default {
  name: "Chart.js",
  scatter: (el, pts) => new Chart(canvas(el), { type: "scatter", data: { datasets: [{ data: pts, pointRadius: 2 }] }, options: { maintainAspectRatio: false, scales: { x: { min: 0, max: 100 }, y: { min: 0, max: 100 } } } }),
  line: (el, pts) => new Chart(canvas(el), { type: "line", data: { datasets: [{ data: pts, pointRadius: 0, borderWidth: 1.5 }] }, options: { maintainAspectRatio: false, scales: { x: { type: "linear" } } } }),
};
