// Initial rendering follows the existing bench/scale/harness.js frame protocol.
import { mount } from "./adapter.solid.jsx";

export const categoryColors = ["#2878b5", "#d85c34", "#4d944b", "#9b57b2", "#be8e26", "#2e9294", "#c45e97", "#7582c1", "#6c8a30", "#a66e42"];

export function points(n) {
  let seed = 42;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: n }, (_, id) => ({
    id, x: rand() * 100, y: rand() * 100, category: id % categoryColors.length,
    // This odd multiplier produces a distinct RGB color for each of the first 2^24 ids.
    color: `#${((0x1f7acb + id * 0x9e3779) % 0x1000000).toString(16).padStart(6, "0")}`,
  }));
}

const sheet = document.head.appendChild(document.createElement("style"));
// Dot consumes --rhp-color; ManyDots needs only the ordinary background-color declaration.
sheet.textContent = categoryColors.map((color, i) => `.rhp-dot.bench-category-${i}{--rhp-color:${color}}.rhp-manydot.bench-category-${i}{background-color:${color}}`).join("\n");
const stage = document.body.appendChild(document.createElement("div"));
stage.style.cssText = "width:600px;margin:8px";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const inFrame = (fn) => new Promise((resolve) => requestAnimationFrame(() => {
  const start = performance.now();
  fn();
  const channel = new MessageChannel();
  channel.port1.onmessage = () => {
    const elapsed = performance.now() - start;
    channel.port1.close();
    channel.port2.close();
    resolve(elapsed);
  };
  channel.port2.postMessage(0);
}));

window.bench = {
  async run({ n, variant, appearance }) {
    const rows = points(n);
    window.bench.rows = rows;
    await sleep(100);
    const box = stage.appendChild(document.createElement("div"));
    return inFrame(() => mount(box, rows, { variant, appearance }));
  },
  geometry(variant, appearance) {
    const chart = document.querySelector(".rhp-chart");
    const bulk = variant !== "dot" && variant !== "wrapped";
    const collection = document.querySelector(bulk ? ".rhp-manydots" : ".rhp-body > .rhp-plot");
    if (!chart || !collection) throw new Error(`Missing chart or collection for ${variant}`);
    const box = collection.getBoundingClientRect();
    const dots = [...document.querySelectorAll(bulk ? ".rhp-manydot" : ".rhp-dot")];
    const rgb = (hex) => `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;
    let maximumPositionError = 0, wrongSizes = 0, wrongColors = 0;
    for (let i = 0; i < dots.length; i++) {
      const expected = window.bench.rows[i];
      if (!expected) throw new Error(`Unexpected extra point ${i}`);
      const rect = dots[i].getBoundingClientRect();
      const css = getComputedStyle(dots[i]);
      maximumPositionError = Math.max(maximumPositionError,
        Math.abs(rect.left + rect.width / 2 - (box.left + expected.x / 100 * box.width)),
        Math.abs(rect.top + rect.height / 2 - (box.bottom - expected.y / 100 * box.height)));
      if (Math.abs(rect.width - 4) > .01 || Math.abs(rect.height - 4) > .01) wrongSizes++;
      const expectedColor = appearance === "categories" ? categoryColors[expected.category] : appearance === "unique" ? expected.color : "#2878b5";
      if (css.backgroundColor !== rgb(expectedColor)) wrongColors++;
    }
    const rect = (el) => {
      const b = el.getBoundingClientRect();
      return { left: b.left, top: b.top, width: b.width, height: b.height };
    };
    return { points: dots.length, maximumPositionError, wrongSizes, wrongColors, collection: rect(collection), chart: rect(chart) };
  },
};
