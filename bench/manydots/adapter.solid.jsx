// A dedicated collection and the existing direct-root Dot use the same data and Chart.
import { render } from "solid-js/web";
import { Chart, Plot, Dot, ManyDots, slat } from "../../src/index.js";

export function mount(el, points, { variant, appearance }) {
  const color = appearance === "unique" ? (d) => d.color : undefined;
  const pointClass = appearance === "categories" ? (d) => `bench-category-${d.category}` : undefined;
  const DotPoint = slat({}, (d) => (
    <Dot at={d.x} cross={d.y} size="4px" color={typeof color === "function" ? color(d) : undefined}
      class={pointClass?.(d)} />
  ));
  const WrappedPoint = slat({}, (d) => (
    <div><Dot at={d.x} cross={d.y} size="4px" /></div>
  ));
  return render(() => (
    <Chart scale={[0, 100]} cross={[0, 100]} height={400} static={true} theme={{ series: ["#2878b5"] }}>
      {variant === "manydots"
        ? <ManyDots rows={points} at={(d) => d.x} cross={(d) => d.y} size="4px"
          color={color} pointClass={pointClass} key={(d) => d.id} />
        : <Plot overlap={true} rows={points}>
          {variant === "wrapped" ? WrappedPoint : DotPoint}
        </Plot>}
    </Chart>
  ), el);
}
