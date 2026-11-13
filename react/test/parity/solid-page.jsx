// The parity charts drawn by rhp with Solid: each chart's data is a store, and a step reconciles it with the next data
import { render } from "solid-js/web";
import { createStore, reconcile } from "solid-js/store";
import { CHARTS } from "./charts.jsx";

const P = (window.P = { step: {}, names: Object.keys(CHARTS) });
const root = document.getElementById("root");

for (const [name, c] of Object.entries(CHARTS)) {
  const box = root.appendChild(document.createElement("div"));
  box.dataset.chart = name;
  let now = structuredClone(c.data);
  const [data, setData] = createStore(structuredClone(c.data));
  render(() => c.view(data), box);
  P.step[name] = (k) => {
    now = c.steps[k](now);
    setData(reconcile(structuredClone(now)));
  };
}
