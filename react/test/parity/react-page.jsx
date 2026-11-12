// The parity charts drawn by rhp-react: each chart's data is a component's state, and a step sets the next data
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { CHARTS } from "./charts.jsx";

const P = (window.P = { step: {}, names: Object.keys(CHARTS) });
const root = document.getElementById("root");

function Host({ name, c }) {
  const [data, setData] = useState(c.data);
  P.step[name] = (k) => flushSync(() => setData((d) => c.steps[k](d)));
  return c.view(data);
}

for (const [name, c] of Object.entries(CHARTS)) {
  const box = root.appendChild(document.createElement("div"));
  box.dataset.chart = name;
  flushSync(() => createRoot(box).render(<StrictMode><Host name={name} c={c} /></StrictMode>));
}
