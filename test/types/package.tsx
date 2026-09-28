// The same through the published package: "@bezda/rhp" and "@bezda/rhp/standalone" resolve by package.json's exports to
// dist/index.d.ts and dist/standalone.d.ts (npm test builds dist first).
import { Chart, Plot, Bar, slat } from "@bezda/rhp";
import { html, render, createSignal, Label } from "@bezda/rhp/standalone";

const Row = slat<{ v: number }>((d) => <div><Bar to={d.v} /></div>);
const [v] = createSignal([1, 2]);
export const App = () => <Chart scale={[0, 3]}><Plot v={v()}>{Row}</Plot></Chart>;
export const standalone = (el: HTMLElement) => render(() => html`<${Label} at=${1}>one<//>`, el);
