// Chart.js (canvas), its default animation. No value labels: Chart.js needs a plugin for them.
import { Chart, BarController, BarElement, CategoryScale, LinearScale } from "chart.js";
Chart.register(BarController, BarElement, CategoryScale, LinearScale);
export default { name: "Chart.js", mount(el, rows, { band }) {
  const box = document.createElement("div"); box.style.cssText = `position:relative;width:600px;height:${rows.length * band + 30}px`;
  const canvas = document.createElement("canvas"); box.append(canvas); el.append(box);
  const chart = new Chart(canvas, {
    type: "bar",
    data: { labels: rows.map((r) => r.name), datasets: [{ data: rows.map((r) => r.value), backgroundColor: "#2a78d6" }] },
    options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, scales: { x: { min: 0, max: 100 } }, plugins: {} },
  });
  return {
    update: (rows) => { chart.data.datasets[0].data = rows.map((r) => r.value); chart.update(); },
    destroy: () => { chart.destroy(); box.remove(); },
  };
} };
