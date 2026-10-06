// The same through the published package: "@bezda/rhp" and "@bezda/rhp/standalone" resolve by package.json's exports to
// dist/index.d.ts and dist/standalone.d.ts (npm test builds dist first).
import { Chart, Plot, Bar, ManyDots, slat, type ManyDotsProps } from "@bezda/rhp";
import { html, render, createSignal, Label, ManyDots as StandaloneManyDots } from "@bezda/rhp/standalone";

const Row = slat<{ v: number }>((d) => <div><Bar to={d.v} /></div>);
const [v] = createSignal([1, 2]);
export const App = () => <Chart scale={[0, 3]}><Plot v={v()}>{Row}</Plot></Chart>;
export const standalone = (el: HTMLElement) => render(() => html`<${Label} at=${1}>one<//>`, el);

const points: ManyDotsProps<{ x: number; y: number }> = {
  rows: [{ x: 1, y: 2 }], at: row => row.x, cross: row => row.y, size: 4,
};
export const scatter = () => <Chart scale={[0, 3]} cross={[0, 3]}><ManyDots {...points} /></Chart>;
export const standaloneScatter = () => <Chart scale={[0, 3]} cross={[0, 3]}><StandaloneManyDots {...points} /></Chart>;
