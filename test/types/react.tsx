// @bezda/rhp-react's types (react/index.d.ts): toReact gives a React component that takes the chart's props, plus
// className and style.
import { toReact, Chart, Plot, Bar, html } from "../../react/index.js";

const FruitChart = toReact((props: { sold: number[] }) => html`<${Chart} scale=${[0, 30]}>
  <${Plot} sold=${() => props.sold}>${(d: { sold: number }) => html`<div><${Bar} to=${() => d.sold} /></div>`}<//>
<//>`);

export const App = () => <FruitChart sold={[12, 18]} className="card" style={{ width: 300 }} />;
// @ts-expect-error: the chart's props are required
export const Missing = () => <FruitChart className="card" />;
