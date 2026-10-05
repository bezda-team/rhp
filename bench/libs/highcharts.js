// Highcharts (SVG), its default animation, value labels on, no credits link.
import Highcharts from "highcharts";
export default { name: "Highcharts", mount(el, rows, { band }) {
  const box = document.createElement("div"); el.append(box);
  const chart = Highcharts.chart(box, {
    chart: { type: "bar", width: 600, height: rows.length * band + 40 },
    title: { text: null }, legend: { enabled: false }, credits: { enabled: false },
    xAxis: { categories: rows.map((r) => r.name) },
    yAxis: { min: 0, max: 100, title: { text: null } },
    series: [{ name: "value", data: rows.map((r) => r.value), color: "#2a78d6", dataLabels: { enabled: true } }],
  });
  return {
    update: (rows) => chart.series[0].setData(rows.map((r) => r.value)),
    destroy: () => { chart.destroy(); box.remove(); },
  };
} };
