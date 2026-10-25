// noCssGuard and --rhp-position. Both settings are for the whole page, so each mode is a page of its own:
//   options.html            the guard as usual; O.unguarded() adds a Chart that says noCssGuard
//   options.html#page-off   noCssGuard() before the first chart
//   options.html#inherit    inheritPosition() before the first chart
import { render } from "solid-js/web";
import * as rhp from "../src/index.js";
const { Chart, Plot, Bar, Label, Cell, slat, noCssGuard, inheritPosition } = rhp;
const O = (window.O = {});
const mode = location.hash.slice(1);
if (mode === "page-off") noCssGuard();
if (mode === "inherit") inheritPosition();

// A page whose CSS reaches every div and span, as resets and frameworks do
document.head.appendChild(document.createElement("style")).textContent = "div, span { margin: 3px; padding: 2px; letter-spacing: 2px; }";

const box = () => {
  const el = document.body.appendChild(document.createElement("div"));
  el.style.width = "400px";
  return el;
};
const frame = () => new Promise(requestAnimationFrame);
const Row = (d) => <div><Label edge="start">{d.name}</Label><Bar to={d.v} /><Label at={d.v}>{d.v}</Label></div>;
const NAMES = ["a", "b", "c"];
const V = [3, 6, 9];

// What the page's CSS did to each chart's first bar, and what guard the page has: none, as written, or checking charts
O.read = () => {
  const bar = (q) => {
    const el = document.querySelector(q + " .rhp-bar");
    if (!el) return null;
    const s = getComputedStyle(el);
    return { margin: s.marginTop, sizing: s.boxSizing };
  };
  const text = document.adoptedStyleSheets.map((sheet) => [...sheet.cssRules].map((r) => r.cssText).join("\n")).join("\n");
  return { guarded: bar(".guarded"), unguarded: bar(".unguarded"), guard: text.includes("display: revert"), checks: text.includes("data-rhp-guard") };
};

O.guarded = async () => {
  render(() => <Chart class="guarded" scale={[0, 10]} ticks={false}><Plot name={NAMES} v={V}>{Row}</Plot></Chart>, box());
  await frame();
  return O.read();
};

O.unguarded = async () => {
  render(() => <Chart class="unguarded" noCssGuard scale={[0, 10]} ticks={false}><Plot name={NAMES} v={V}>{Row}</Plot></Chart>, box());
  await frame();
  return O.read();
};

// Where --rhp-position can be read: on a slat root, in the slat type's css (on something inside the slat), through a
// copy the root passes down by hand, in a style prop inside the slat, and on the cells of a Plot inside a slat
O.position = async () => {
  const Reads = slat({ thickness: 20, css: ".name { --read: var(--rhp-position); }" }, (d) => (
    <div style={{ "--copy": "var(--rhp-position)" }}>
      <Label edge="start" class="name">{d.name}</Label>
      <Label at={d.v} class="value" style={{ "--prop": "var(--rhp-position)" }}>{d.v}</Label>
      <span class="inner" />
    </div>
  ));
  const Hour = (h) => <div><Cell value={h.v} class="cell" /></div>;
  const Day = slat({ thickness: 20, css: ".cell { --column: var(--rhp-position); }" }, (d) => <div><Plot orientation="across" v={d.hours}>{Hour}</Plot></div>);
  render(() => <>
    <Chart class="reads" scale={[0, 10]} ticks={false}><Plot name={NAMES} v={V}>{Reads}</Plot></Chart>
    <Chart class="nested" scale={[0, 10]} ticks={false}><Plot hours={[[1, 2, 3], [4, 5, 6]]}>{Day}</Plot></Chart>
  </>, box());
  await frame();
  const css = (el, name) => getComputedStyle(el).getPropertyValue(name).trim();
  const root = document.querySelectorAll(".reads .rhp-plot > *")[2];
  return {
    root: css(root, "--rhp-position"),
    slatCss: css(root.querySelector(".name"), "--read"),
    byHand: css(root.querySelector(".inner"), "--copy"),
    styleProp: css(root.querySelector(".value"), "--prop"),
    inside: css(root.querySelector(".inner"), "--rhp-position"),
    cells: [...document.querySelectorAll(".nested .cell")].map((c) => css(c, "--column")),
  };
};

// A chart in a slat of another chart goes without the guard only when the chart around it does too: [outer bar, inner bar]
O.nested = async () => {
  const Inner = (d) => <div><Bar to={d.v} class="inner-bar" /></div>;
  const Outer = (inner) => slat({ thickness: 60 }, (d) => (
    <div>
      <Bar to={d.v} class="outer-bar" />
      <Chart scale={[0, 10]} ticks={false} noCssGuard={inner}><Plot v={[d.v]}>{Inner}</Plot></Chart>
    </div>
  ));
  render(() => <>
    <Chart class="n1" scale={[0, 10]} ticks={false}><Plot v={[4]}>{Outer(true)}</Plot></Chart>
    <Chart class="n2" scale={[0, 10]} ticks={false} noCssGuard><Plot v={[4]}>{Outer(true)}</Plot></Chart>
    <Chart class="n3" scale={[0, 10]} ticks={false} noCssGuard><Plot v={[4]}>{Outer(false)}</Plot></Chart>
  </>, box());
  await frame();
  const margin = (q) => getComputedStyle(document.querySelector(q)).marginTop;
  return Object.fromEntries(["n1", "n2", "n3"].map((n) => [n, [margin(`.${n} .outer-bar`), margin(`.${n} .inner-bar`)]]));
};
