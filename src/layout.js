// The parts of a Chart and a Plot that are plain functions, shared by rhp's Solid and React versions: reading data
// groups, the order of rows, ticks, the theme, and the room and gutters a chart makes for its Plots.
import { nice } from "./data.js";

export const isList = (g) => Array.isArray(g) || (ArrayBuffer.isView(g) && !(g instanceof DataView));

// Slat i gets item i of every data group. A value that is not a list is shared by every slat, and a shorter list wraps around.
export const at = (group, i) => {

  if (!isList(group)) return group;

  const v = group[i];
  if (v !== undefined || !group.length) return v;

  return group[i % group.length];
};

export const short = (o) => (o === "vertical" ? "v" : "h");

// The keys that move focus between the rows of a Plot with `keyboard`, and how many rows they move it
export const STEPS = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1, Home: -Infinity, End: Infinity };

// A slat's layout setting for an orientation: a plain value, or { horizontal, vertical }
export const pick = (v, o) => {

  if (v != null && typeof v === "object" && ("horizontal" in v || "vertical" in v)) return v[o];

  return v;
};

export const px = (v) => (typeof v === "number" ? v + "px" : v);
export const share = (v) => (typeof v === "number" ? v * 100 + "%" : v); // 0.18 -> "18%", and "4px" stays "4px"
export const same = (a, b) => a.length === b.length && a.every((v, k) => v === b[k]);
export const sameSet = (a, b) => a.size === b.size && [...a].every((v) => b.has(v));
export const range = (n) => Array.from({ length: n }, (_, i) => i);
export const byPosition = (positions) => range(positions.length).filter((i) => positions[i] != null).sort((a, b) => positions[a] - positions[b]);

// A block returned as a slat (in a Plot without overlap) gets placed as the row, which overrides part of its own
// placing (a Bar starts at 0 and fills the band). We warn about it once per page.
export const BLOCK = /(^|\s)rhp-(bar|dot|tick|label|cell|place|area)(\s|$)/;
let warned = false;
export const warnBare = (el) => {

  if (warned) return;

  warned = true;
  const name = el.getAttribute("class").match(BLOCK)[2];
  const Name = name[0].toUpperCase() + name.slice(1);
  console.warn(`rhp: a ${Name} is a slat's root here, so the Plot places it as the row and it ignores part of its own placing. Put it in an element: (d) => <div><${Name} … /></div>. (Only a Plot with overlap takes a block as its slat.)`);
};

// Room "auto" only measures an edge label that is a child of the slat's root. One inside another element gets no room,
// so we warn about it once per page. The labels of a Plot inside the row belong to that Plot and are left alone.
export const autoRoom = (r) => r === "auto" || r?.start === "auto" || r?.end === "auto";
// aspect fixes a chart's shape: a height beside it does nothing, and a flat chart's rows with a thickness keep it
let warnedAspect = false, warnedHeight = false, warnedThick = false;
export const warnAspect = (bad, height, thick) => {
  if (bad && !warnedAspect) {
    warnedAspect = true;
    console.warn("rhp: aspect takes a number above 0, the chart's width over its height (aspect={16 / 9}), so this one is ignored.");
  }
  if (height && !warnedHeight) {
    warnedHeight = true;
    console.warn("rhp: a Chart with an aspect takes its height from its width, so its height is ignored.");
  }
  if (thick && !warnedThick) {
    warnedThick = true;
    console.warn("rhp: a flat Chart with an aspect has rows with a thickness here, and they keep it rather than share the chart's height. Leave their thickness out to let them fill it.");
  }
};

let warnedWrapped = false;
export const warnWrapped = (el) => {

  if (warnedWrapped) return;

  for (const label of el.querySelectorAll(".rhp-label[data-rhp-edge]")) {
    const inner = label.closest(".rhp-plot");
    if (label.parentElement === el || (inner && el.contains(inner))) continue;
    warnedWrapped = true;
    console.warn(`rhp: an edge Label is inside another element here, so room "auto" doesn't measure it and it gets no room. Make it a child of the slat's root element: (d) => <div><Label edge="start">…</Label> … </div>. (Room in px has no such limit.)`);
    return;
  }
};

// The ticks for the part [a, b] of the scale on screen, where [a0, b0] is where the scale is going. A count of round
// values takes its step from where the scale is going, so it holds still while the JS version moves the scale.
export function tickValues(t, [a, b], [a0, b0] = [a, b]) {

  if (t === false) return [];

  const eps = (b - a) * 1e-9;
  if (isList(t)) return Array.from(t).filter((v) => v >= a - eps && v <= b + eps);
  if (typeof t === "function") return t([a, b]);

  const { step } = nice(a0, b0, t ?? 5);
  const out = [];
  const first = Math.ceil(a / step - 1e-9);

  // Each tick from its index, so the ticks can't stall where a number is too big for the step to change it
  for (let k = 0; k <= 1000; k++) {
    const v = (first + k) * step;
    if (!(v <= b + 1e-9 * step) || (k > 0 && v === (first + k - 1) * step)) break;
    out.push(+v.toFixed(10));
  }

  return out;
}

// The theme is the only way a page styles a chart. It is written on the chart root, so a page's own CSS variables never
// reach a chart, and a theme change (dark mode) is one write per key per chart.
export const THEME = {
  series: ["#2a78d6", "#eb6834", "#1baf7a", "#c2419a", "#7b5cd6", "#d39a12"],
  positive: "#13894f",
  negative: "#c62828",
  ink: "#1d232b",
  muted: "#6b7280",
  grid: "rgba(128, 128, 128, .22)",
  surface: "#ffffff",
  low: "#e8eef8",
  high: "#1f4fa8",
  font: "system-ui, sans-serif",
};

export function themeVars(theme) {

  const vars = {};
  theme.series.forEach((color, i) => (vars["--rhp-series-" + (i + 1)] = color));

  for (const key in theme) {
    if (key !== "series") vars["--rhp-" + key] = theme[key];
  }

  return vars;
}

// A data group of theme colors that goes through the series: "series-1", "series-2", ...
export const series = (n = THEME.series.length) => (d) => "series-" + ((d.index % n) + 1);

// Room is px outside the plot on each side, named along the value axis (start is before the scale's start, where the
// names go, and end is past its end) and along the stack (before the first slat and after the last)
export const DEFAULT_ROOM = { horizontal: { start: 104, end: 44 }, vertical: { start: 28, end: 20 } };
export const SIDES = {
  horizontal: { start: "left", end: "right", before: "top", after: "bottom" },
  vertical: { start: "bottom", end: "top", before: "left", after: "right" },
};
export const AXIS = { horizontal: ["bottom", 24], vertical: ["left", 42] }; // where the axis numbers go, and their room
export const AXIS_END = { horizontal: ["right", 14], vertical: ["top", 8] }; // half of the last number, centered on the far end
export const AXIS_START = { horizontal: ["left", 14], vertical: ["bottom", 8] }; // and half of the first one

// A chart's padding for the room its Plots ask for (rooms: each Plot's room, "auto", or null), its value axis' numbers
// (axis) and its cross axis' numbers (crossAxis). With room "auto" on a side, both ends of the value axis become columns
// (rows, when vertical) of the body's grid, as wide as that side's widest edge label (gutters.css): then gutters is true.
export function padding(o, rooms, axis, crossAxis) {

  const side = SIDES[o];
  const out = { top: 2, right: 2, bottom: 2, left: 2 };
  const room = { start: 0, end: 0 };
  const auto = {};

  for (const want of rooms) {
    const r = want === "auto" ? { start: "auto", end: "auto" } : want;
    if (!r) continue;
    for (const k in side) {
      if (r[k] === "auto") {
        if (k in room) auto[k] = true;
      } else if (r[k] != null) {
        out[side[k]] = Math.max(out[side[k]], r[k]);
        if (k in room) room[k] = Math.max(room[k], r[k]);
      }
    }
  }

  if (axis) {
    for (const [s, n] of [AXIS[o], AXIS_END[o], AXIS_START[o]]) {
      out[s] = Math.max(out[s], n);
    }
  }

  // The cross axis' numbers go where the other orientation's value axis would put them
  if (crossAxis) {
    const other = o === "vertical" ? "horizontal" : "vertical";
    for (const [s, n] of [AXIS[other], AXIS_END[other], AXIS_START[other]]) {
      out[s] = Math.max(out[s], n);
    }
  }

  const vars = { "--rhp-room-start": room.start + "px", "--rhp-room-end": room.end + "px" };
  const gutters = !!(auto.start || auto.end);

  if (gutters) {
    // Both ends of the value axis move from the padding into the grid (at least as wide as the padding would be)
    for (const k of ["start", "end"]) {
      const n = out[side[k]];
      out[side[k]] = 0;
      vars["--rhp-gutter-" + k] = auto[k] ? `minmax(${n}px, max-content)` : n + "px";
    }
  }

  for (const s in out) {
    vars["--rhp-pad-" + s] = out[s] + "px";
  }

  return { vars, gutters };
}

// The variables that blocks inherit start from rhp's defaults on the chart root, so a page's --rhp-* variables can't
// reach inside. A Plot, a block or a slat's CSS still sets them below.
export const KNOBS = { "--rhp-inset": "18%" };

for (const name of ["color", "thick", "size", "across", "radius", "start-radius", "end-radius", "label-gap", "gap", "tick-width", "label-size",
  "cell-gap", "pitch", "plot-thick", "length-time", "length-ease", "slide-time", "slide-ease", "at", "from", "to", "value", "d", "position"]) {
  KNOBS["--rhp-" + name] = "initial";
}

// A line made while its chart's new scale waits for the next frame starts on the scale the chart shows (@starting-style
// in rhp.css), so it slides in with the lines already there. Without that, a browser that first styles the line after
// the new scale is written (Chrome, Firefox) draws it in place at once, and one that styles it before (Safari) slides
// it. The start is cleared once the line is drawn, so a line shown again later (after display: none) starts where it is.
export function startOnShownScale(el, chart, cross) {

  if (!chart?.scaleNow) return; // the chart is being made: it shows no scale yet

  const [lo, hi] = cross ? ["--rhp-cross-min", "--rhp-cross-max"] : ["--rhp-min", "--rhp-max"];
  const shown = chart.root().style;
  const a = shown.getPropertyValue(lo);
  const b = shown.getPropertyValue(hi);
  const now = chart.scaleNow();
  if (a === "" || (a === String(now[lo]) && b === String(now[hi]))) return; // the chart shows its scale already

  el.style.setProperty("--rhp-start-min", a);
  el.style.setProperty("--rhp-start-max", b);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.style.removeProperty("--rhp-start-min");
    el.style.removeProperty("--rhp-start-max");
  }));
}
