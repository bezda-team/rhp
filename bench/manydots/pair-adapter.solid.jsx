// Both libraries are in one bundle, with only the approved source files differing.
import { render } from "solid-js/web";
import { Chart as BeforeChart, ManyDots as BeforeDots } from "rhp-before";
import { Chart as AfterChart, ManyDots as AfterDots } from "rhp-after";

export function mount(el, points, { variant, appearance }) {
  const Chart = variant === "before" ? BeforeChart : AfterChart;
  const ManyDots = variant === "before" ? BeforeDots : AfterDots;
  const color = appearance === "unique" ? (d) => d.color : undefined;
  const pointClass = appearance === "categories" ? (d) => `bench-category-${d.category}` : undefined;
  return render(() => (
    <Chart scale={[0, 100]} cross={[0, 100]} height={400} static={true} theme={{ series: ["#2878b5"] }}>
      <ManyDots rows={points} at={(d) => d.x} cross={(d) => d.y} size="4px"
        color={color} pointClass={pointClass} key={(d) => d.id} />
    </Chart>
  ), el);
}
