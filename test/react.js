// @bezda/rhp-react (react/index.js): a chart as a React component, in StrictMode.
import { createElement as h, StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { toReact, Chart, Plot, Bar, Label, html } from "../react/index.js";

const row = (d) => html`<div class="row" data-fruit=${() => d.fruit}>
  <${Label} edge="start">${() => d.fruit}<//>
  <${Bar} to=${() => d.sold} />
  <${Label} at=${() => d.sold}>${() => d.sold}<//>
</div>`;
const FruitChart = toReact((props) => html`<${Chart} scale=${[0, 30]}>
  <${Plot} fruit=${() => props.fruit} sold=${() => props.sold}>${row}<//>
<//>`);

const T = (window.T = {});
function App() {
  const [sold, setSold] = useState([12, 18, 7]);
  const [shown, setShown] = useState(true);
  T.setSold = (v) => flushSync(() => setSold(v));
  T.hide = () => flushSync(() => setShown(false));
  return shown ? h(FruitChart, { fruit: ["Apples", "Bananas", "Cherries"], sold, className: "card" }) : h("p", { id: "gone" }, "gone");
}
const root = document.body.appendChild(document.createElement("div"));
createRoot(root).render(h(StrictMode, null, h(App)));
