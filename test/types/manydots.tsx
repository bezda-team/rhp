import { Chart, ManyDots, shape, type ManyDotsProps } from "../../src/index.js";

const rows = [{ id: "a", x: 20, y: 60, group: "warm", size: 6 }];
const triangle = shape(["M", .5, 0], ["L", 1, 1], ["L", 0, 1], ["Z"]);
const props: ManyDotsProps<(typeof rows)[number]> = {
  rows, at: row => row.x, cross: row => row.y, key: row => row.id,
  color: row => row.group === "warm" ? "positive" : "#246",
  size: row => row.size, shape: triangle,
  pointClass: row => row.group, pointStyle: (_row, index) => ({ opacity: index ? .5 : 1 }),
};

export const App = () => <Chart scale={[0, 100]} cross={[0, 100]}>
  <ManyDots {...props} class="cloud" aria-label="Measurements" onClick={event => event.currentTarget.focus()} />
  <ManyDots rows={rows} at={row => row.x} cross={row => row.y} size="4px" color="series-1" />
</Chart>;

// @ts-expect-error both coordinates must be supplied
const missing = <ManyDots rows={rows} at={row => row.x} />;
// @ts-expect-error a coordinate accessor must return a number
const invalid = <ManyDots rows={rows} at={row => row.id} cross={row => row.y} />;
// @ts-expect-error the collection manages its leaf nodes
const children = <ManyDots rows={rows} at={row => row.x} cross={row => row.y}>text</ManyDots>;
