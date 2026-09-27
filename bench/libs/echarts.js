// ECharts (canvas renderer, its default), value labels on, its default animation.
import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import { GridComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
echarts.use([BarChart, GridComponent, CanvasRenderer]);
export default { name: "ECharts", mount(el, rows, { band }) {
  const box = document.createElement("div"); box.style.cssText = `width:600px;height:${rows.length * band + 30}px`; el.append(box);
  const chart = echarts.init(box);
  chart.setOption({
    grid: { left: 100, right: 40, top: 5, bottom: 25 },
    xAxis: { type: "value", min: 0, max: 100 },
    yAxis: { type: "category", data: rows.map((r) => r.name), inverse: true },
    series: [{ type: "bar", data: rows.map((r) => r.value), label: { show: true, position: "right" } }],
  });
  return {
    update: (rows) => chart.setOption({ series: [{ data: rows.map((r) => r.value) }] }),
    destroy: () => { chart.dispose(); box.remove(); },
  };
} };
