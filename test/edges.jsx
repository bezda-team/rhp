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

// A bar in forced colors (Windows contrast themes)
E.forced = async () => {
  render(() => <Chart class="fc" scale={[0, 10]} ticks={false}><Plot v={[6]}>{(d) => <div><Bar to={d.v} color="rgb(0, 0, 128)" /></div>}</Plot></Chart>, box());
  await frame();
  const s = getComputedStyle(document.querySelector(".fc .rhp-bar"));
  return [matchMedia("(forced-colors: active)").matches, s.backgroundColor, s.outlineStyle];
};

// A data group that is a function, given a new function
E.fn = () => {
  const [fmt, setFmt] = createSignal((d) => d.v + " kg");
  render(() => <Chart class="fn" scale={[0, 10]} ticks={false}><Plot v={[3, 7]} text={fmt()}>{(d) => <div><Bar to={d.v} /><Label at={d.v}>{d.text}</Label></div>}</Plot></Chart>, box());
  const texts = () => [...document.querySelectorAll(".fn .rhp-label")].map((e) => e.textContent).join(" ");
  const before = texts();
  setFmt(() => (d) => d.v + " lb");
  return [before, texts()];
};

// A Line of 700,000 points, more than any engine takes as the arguments of one call
E.long = () => {
  const pts = Array.from({ length: 700000 }, (_, i) => [i, i % 100]);
  const el = box();
  try {
    render(() => <Chart class="long" scale={[0, 700000]} ticks={false}><Plot overlap points={[pts]}>{(d) => <div><Line points={d.points} /></div>}</Plot></Chart>, el);
  } catch (e) {
    return e.message;
  }
  return el.querySelectorAll(".rhp-line path").length;
};

// A scale too narrow for its numbers: a span of 20 at 1e17, where adding a step of 5 changes nothing
E.narrow = () => {
  render(() => <Chart class="narrow" scale={[1e17, 1e17 + 20]}><Plot v={[1e17 + 10]}>{(d) => <div><Bar to={d.v} /></div>}</Plot></Chart>, box());
  return document.querySelectorAll(".narrow .rhp-gridline").length;
};

// A value set in the app's own frame callback, inside drawing()
E.sameFrame = () => new Promise((resolve) => {
  const [v, setV] = createSignal(2);
  const el = box();
  render(() => <Chart class="sf" scale={[0, 10]} ticks={false}><Plot v={[v()]}>{(d) => <div><Bar to={d.v} /></div>}</Plot></Chart>, el);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    try {
      rhp.drawing(() => setV(8));
      resolve(el.querySelector(".rhp-bar").style.getPropertyValue("--rhp-to"));
    } catch (e) {
      resolve(e.message);
    }
  }));
});

// A slat type made inside a component, so a new one on every mount; and one made once, shown again
E.remount = async (n) => {
  const el = box();
  const Card = () => {
    const Row = slat({ css: ".card { color: rgb(0, 128, 0); }" }, (d) => <div class="card"><Bar to={d.v} /></div>);
    return <Chart scale={[0, 10]} ticks={false}><Plot v={[3]}>{Row}</Plot></Chart>;
  };
  render(() => <Card />, el)();
  const before = document.adoptedStyleSheets.length;
  for (let i = 0; i < n; i++) render(() => <Card />, el)();
  const added = document.adoptedStyleSheets.length - before;
  const dispose = render(() => <Card />, el);
  await frame();
  const color = getComputedStyle(el.querySelector(".card")).color;
  dispose();
  return [added, color];
};
E.again = async () => {
  const el = box();
  const Once = slat({ css: ".once { color: rgb(0, 0, 255); }" }, (d) => <div class="once"><Bar to={d.v} /></div>);
  const show = () => render(() => <Chart scale={[0, 10]} ticks={false}><Plot v={[3]}>{Once}</Plot></Chart>, el);
  show()();
  const n = document.adoptedStyleSheets.length;
  const dispose = show();
  await frame();
  const out = [document.adoptedStyleSheets.length - n, getComputedStyle(el.querySelector(".once")).color];
  dispose();
  return out;
};

// Two slat types made from one row function
E.twoTypes = async () => {
  const row = (d) => <div class="tt"><Bar to={d.v} /></div>;
  const Thin = slat({ thickness: 20 }, row);
  const Thick = slat({ thickness: 40 }, row);
  render(() => <>
    <Chart class="tt-thin" scale={[0, 10]} ticks={false}><Plot v={[3]}>{Thin}</Plot></Chart>
    <Chart class="tt-thick" scale={[0, 10]} ticks={false}><Plot v={[3]}>{Thick}</Plot></Chart>
  </>, box());
  await frame();
  return [".tt-thin .tt", ".tt-thick .tt"].map((q) => Math.round(document.querySelector(q).getBoundingClientRect().height));
};
