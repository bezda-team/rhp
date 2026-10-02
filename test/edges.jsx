// Inputs at the edges, each drawn on demand into a box of its own, so one can't change what another measures
import { render } from "solid-js/web";
import { createSignal } from "solid-js";
import * as rhp from "../src/index.js";
const { Chart, Plot, Bar, Label, Line, slat } = rhp;
const E = (window.E = {});
const box = () => {
  const el = document.body.appendChild(document.createElement("div"));
  el.style.width = "400px";
  return el;
};
const frame = () => new Promise(requestAnimationFrame);

// A value past the scale: where its Label sits, horizontal and vertical, on the scale and on the cross scale
E.past = async () => {
  const Row = (d) => <div><Bar to={d.v} /><Label at={d.v}>{d.v}</Label></div>;
  render(() => <>
    <Chart class="past-h" scale={[0, 10]} ticks={false}><Plot v={[150]}>{Row}</Plot></Chart>
    <Chart class="past-v" orientation="vertical" height={100} scale={[0, 10]} ticks={false}><Plot v={[-5]}>{Row}</Plot></Chart>
    <Chart class="past-x" scale={[0, 10]} cross={[0, 100]} height={100} ticks={false}><Plot overlap v={[5]}>{(d) => <div><Label at={d.v} cross={-50}>x</Label></div>}</Plot></Chart>
  </>, box());
  await frame();
  await frame();
  const r = (q) => document.querySelector(q).getBoundingClientRect();
  const mid = (b) => (b.top + b.bottom) / 2;
  return {
    page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    h: r(".past-h .rhp-label").left - r(".past-h .rhp-plot").right,
    v: r(".past-v .rhp-label").bottom - r(".past-v .rhp-plot").bottom,
    x: mid(r(".past-x .rhp-label")) - r(".past-x .rhp-plot").bottom,
  };
};
