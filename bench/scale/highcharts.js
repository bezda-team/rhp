import Highcharts from "highcharts";
const base = (type) => ({ chart: { type, width: 600, height: 400 }, title: { text: null }, legend: { enabled: false }, credits: { enabled: false } });
export default {
  name: "Highcharts",
  scatter: (el, pts) => Highcharts.chart(el, { ...base("scatter"), xAxis: { min: 0, max: 100 }, yAxis: { min: 0, max: 100, title: { text: null } }, series: [{ data: pts.map((p) => [p.x, p.y]), marker: { radius: 2 } }] }),
  line: (el, pts) => Highcharts.chart(el, { ...base("line"), yAxis: { title: { text: null } }, series: [{ data: pts.map((p) => [p.x, p.y]), marker: { enabled: false } }] }),
};
