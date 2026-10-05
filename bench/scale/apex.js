import ApexCharts from "apexcharts";
const base = { width: 600, height: 400, toolbar: { show: false }, zoom: { enabled: false } };
export default {
  name: "ApexCharts",
  scatter: (el, pts) => new ApexCharts(el, { chart: { ...base, type: "scatter" }, series: [{ name: "p", data: pts.map((p) => [p.x, p.y]) }], xaxis: { type: "numeric", min: 0, max: 100 }, yaxis: { min: 0, max: 100 }, markers: { size: 2 } }).render(),
  line: (el, pts) => new ApexCharts(el, { chart: { ...base, type: "line" }, series: [{ name: "p", data: pts.map((p) => [p.x, p.y]) }], xaxis: { type: "numeric" }, stroke: { width: 1.5 } }).render(),
};
