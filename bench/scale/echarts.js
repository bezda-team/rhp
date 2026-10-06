import * as echarts from "echarts/core";
import { ScatterChart, LineChart } from "echarts/charts";
import { GridComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
echarts.use([ScatterChart, LineChart, GridComponent, CanvasRenderer]);
const box = (el) => { const b = document.createElement("div"); b.style.cssText = "width:600px;height:400px"; el.append(b); return b; };
export default {
  name: "ECharts",
  scatter: (el, pts) => echarts.init(box(el)).setOption({ xAxis: { type: "value", min: 0, max: 100 }, yAxis: { type: "value", min: 0, max: 100 }, series: [{ type: "scatter", symbolSize: 4, data: pts.map((p) => [p.x, p.y]) }] }),
  line: (el, pts) => echarts.init(box(el)).setOption({ xAxis: { type: "value" }, yAxis: { type: "value" }, series: [{ type: "line", showSymbol: false, data: pts.map((p) => [p.x, p.y]) }] }),
};
