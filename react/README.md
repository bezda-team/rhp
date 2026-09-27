# @bezda/rhp-react

[rhp](https://github.com/bezda-team/rhp) charts as React components.

```sh
npm install @bezda/rhp-react
```

Write the chart once with rhp and Solid's `html` template, and `toReact` turns it into a React component:

```jsx
import { useState } from "react";
import { toReact, Chart, Plot, Bar, Label, html } from "@bezda/rhp-react";

const row = (d) => html`
  <div>
    <${Label} edge="start">${() => d.fruit}<//>
    <${Bar} to=${() => d.sold} />
    <${Label} at=${() => d.sold}>${() => d.sold}<//>
  </div>`;

const FruitChart = toReact((props) => html`
  <${Chart} scale=${[0, 30]}>
    <${Plot} fruit=${() => props.fruit} sold=${() => props.sold}>${row}<//>
  <//>`);

export function App() {
  const [sold, setSold] = useState([12, 18, 7]);
  return <FruitChart fruit={["Apples", "Bananas", "Cherries"]} sold={sold} className="card" />;
}
```

- `props` holds the component's props. Read them inside functions (`${() => props.sold}`) so the chart follows them.
- A change updates only what it touches: a new number in `sold` moves one bar, as in a Solid app.
- The component renders a `<div>` the chart draws into; `className` and `style` go on it.
- Everything `@bezda/rhp/standalone` exports is here too (`html`, `createSignal`, the blocks, the helpers), with one copy of Solid inside.

The rhp docs cover the rest: https://github.com/bezda-team/rhp-documentation
