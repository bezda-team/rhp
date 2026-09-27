// ApexCharts (SVG), its default animations and labels.
import ApexCharts from "apexcharts";
export default { name: "ApexCharts", mount(el, rows, { band }) {
  const box = document.createElement("div"); el.append(box);
  const chart = new ApexCharts(box, {
    chart: { type: "bar", width: 600, height: rows.length * band + 40, toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true } },
    series: [{ name: "value", data: rows.map((r) => r.value) }],
    xaxis: { categories: rows.map((r) => r.name), min: 0, max: 100 },
  });
  chart.render();
  return {
    update: (rows) => chart.updateSeries([{ name: "value", data: rows.map((r) => r.value) }]),
    destroy: () => { chart.destroy(); box.remove(); },
  };
} };
