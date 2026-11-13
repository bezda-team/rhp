// What blocks draw, shared by rhp's Solid and React versions: each block's CSS variables and attributes, colors and
// lengths, the style text a server writes, and the outlines of Areas and Lines.
import { missing } from "./data.js";
import { cssEase } from "./motion.js";

export const cls = (base, c) => (c ? base + " " + c : base);

// The smallest and largest of a list, in a loop: spreading 150,000 numbers into Math.min overflows V8's stack
export const extentOf = (list) => {

  let lo = Infinity;
  let hi = -Infinity;

  for (const v of list) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }

  return [lo, hi];
};

const warnedColors = new Set(); // each page-variable color is warned about once

// A color is a theme key ("series-2", "positive", "muted"...) or a CSS color.
// A slat that reads a page's CSS variable would look different in every app, so that gets a warning.
const KEY = /^(series-\d+|positive|negative|ink|muted|grid|surface|low|high)$/;
export const tok = (c) => {

  if (typeof c !== "string") return c;
  if (KEY.test(c)) return "var(--rhp-" + c + ")";
  if (/var\(--(?!rhp-)/.test(c) && !warnedColors.has(c)) {
    warnedColors.add(c);
    console.warn("rhp: " + c + " reads a page variable; use a theme key");
  }

  return c;
};

// 0.6 -> "60%", and "2px" stays "2px"
export const length = (v) => (typeof v === "number" ? v * 100 + "%" : v);

// Whether a CSS value has a ; or ! outside its strings and brackets, or brackets that don't close: in a style attribute
// that would start a declaration of its own. A browser setting the same value with setProperty rejects it, so a server
// leaves it out too. (Balanced braces are kept, as a browser keeps them in a custom property.)
const loose = (v) => {

  let quote = null;
  let depth = 0;

  for (let i = 0; i < v.length; i++) {
    const ch = v[i];
    if (ch === "\\") {
      i++;
      continue;
    }
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") {
      if (--depth < 0) return true;
    } else if (depth === 0 && (ch === ";" || ch === "!")) return true;
  }

  return quote !== null || depth !== 0;
};
export const safeCssValue = (v) => v != null && !(typeof v === "string" && /[;!{}]/.test(v) && loose(v));

// On a server, the style attribute of an element: its style prop (an object or a string) and its CSS variables
export function withVars(st, vars) {

  let css = typeof st === "string" ? st : "";

  if (st && typeof st === "object") {
    for (const key in st) {
      if (safeCssValue(st[key])) css += (css && !css.endsWith(";") ? ";" : "") + key + ":" + st[key];
    }
  }

  for (const key in vars) {
    if (safeCssValue(vars[key])) css += (css && !css.endsWith(";") ? ";" : "") + key + ":" + vars[key];
  }

  return css || undefined;
}

// The transition of d that a path's CSS asks for, as transitioned() settings. In the JS version (where rhp counts the
// outline) and while the chart turns there is none, and those are found without reading the style, because there the
// outline changes every frame.
export function cssTransition(path) {

  if (!path || path.closest("[data-rhp-animate='js'], [data-rhp-turning]")) return { duration: 0 };

  const c = getComputedStyle(path);
  const i = c.transitionProperty.split(/\s*,\s*/).findIndex((name) => name === "d" || name === "all");
  if (i < 0) return { duration: 0 };

  // The lists repeat to the length of transition-property, and a curve's own commas are inside its brackets
  const nth = (list) => {
    const parts = list.split(/\s*,\s*(?![^(]*\))/);
    return parts[i % parts.length];
  };
  const ms = (time) => parseFloat(time) * (time.endsWith("ms") ? 1 : 1000);

  return { duration: ms(nth(c.transitionDuration)), delay: ms(nth(c.transitionDelay)), ease: cssEase(nth(c.transitionTimingFunction)) };
}

// The blocks. Each is { base, own, vars, back, attrs }: its class, its own props, vars(p, vertical, placed) for its CSS
// variables (reading each value that places it with placed(key), so that a missing one is noticed), back(v) for a Bar
// that runs backward along the value axis, and attrs(p, gone) for attributes of its own (a Label's edge and side).

// A span along the value axis from `from` (0 by default) to `to`: bars, boxes, whiskers, stems, Gantt tasks.
// `thick` is its size across the band, a CSS length ("2px") or a share of the band (0.6).
export const BAR = {
  base: "rhp-bar",
  own: ["from", "to", "thick", "color", "shape"],
  vars: (p, vertical, placed) => ({
    "--rhp-from": placed("from") ?? 0,
    "--rhp-to": placed("to") ?? 0,
    "--rhp-thick": length(p.thick),
    "--rhp-color": tok(p.color),
    "--rhp-clip": p.shape?.clip(vertical, (p.to ?? 0) < (p.from ?? 0)),
  }),
  back: (v) => v["--rhp-to"] < v["--rhp-from"],
};

// A round point at value `at`. `size` is its diameter (10px by default) and `across` places it across the band (0..1).
// In a Chart with a cross scale, `cross` places it on that scale instead (a scatter plot's y).
export const DOT = {
  base: "rhp-dot",
  own: ["at", "size", "across", "cross", "color", "shape"],
  vars: (p, vertical, placed) => ({
    "--rhp-at": placed("at"),
    "--rhp-size": length(p.size),
    "--rhp-across": p.across,
    "--rhp-cross": placed("cross"),
    "--rhp-color": tok(p.color),
    "--rhp-clip": p.shape?.clip(vertical, false),
  }),
};

// A place on the chart and nothing else: no size, no color, nothing drawn. Whatever a slat puts inside it sits at
// value `at`, so a bubble, a badge or a needle of your own needs no CSS to find its value. `across` (0 to 1) places
// it across the band, and in a Chart with a cross scale `cross` places it on that scale.
export const PLACE = {
  base: "rhp-place",
  own: ["at", "across", "cross"],
  vars: (p, vertical, placed) => ({
    "--rhp-at": placed("at"),
    "--rhp-across": p.across,
    "--rhp-cross": placed("cross"),
  }),
};

// A short line across the band at value `at` (medians, targets). `thick` is its length across the band.
export const TICK = {
  base: "rhp-tick",
  own: ["at", "thick", "color", "shape"],
  vars: (p, vertical, placed) => ({
    "--rhp-at": placed("at"),
    "--rhp-thick": length(p.thick),
    "--rhp-color": tok(p.color),
    "--rhp-clip": p.shape?.clip(vertical, false),
  }),
};

// A cell that fills its slat, colored by `value` on the scale (from --rhp-low to --rhp-high), for heatmaps
export const CELL = {
  base: "rhp-cell",
  own: ["value", "color", "shape"],
  vars: (p, vertical, placed) => ({
    "--rhp-value": placed("value"),
    "--rhp-color": tok(p.color),
    "--rhp-clip": p.shape?.clip(vertical, false),
  }),
};

// Text on the value axis. at={v} puts it just after the value v (side="before" puts it just before), and
// edge="start" or "end" puts it outside the track, in the chart's gutter (names, totals). In a Chart with a cross scale,
// `cross` places it on that scale too (a point's label). A Label at an edge isn't placed by its values.
export const LABEL = {
  base: "rhp-label",
  own: ["at", "side", "edge", "cross", "shape"],
  vars: (p, vertical, placed) => {
    const edge = p.edge != null;
    return {
      "--rhp-at": edge ? p.at : placed("at"),
      "--rhp-cross": edge ? p.cross : placed("cross"),
      "--rhp-clip": p.shape?.clip(vertical, false),
    };
  },
  attrs: (p, gone) => ({
    "data-rhp-edge": p.edge,
    "data-rhp-side": p.side,
    "data-rhp-at": p.edge == null ? "" : undefined,
    "data-rhp-missing": gone ? "" : undefined,
  }),
};

// The outlines of Areas and Lines. A point of a path, and the run of points between two of them. With `smooth`, each
// pair is joined by a curve that leans on its neighbours (a Catmull-Rom spline as cubics), so a shape drawn from data can
// be round without anyone writing a path. Without it they are joined by straight lines, as before.
const fmt = ([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`;
const trace = (pts, smooth) => {

  if (!smooth || pts.length < 3) return pts.map(fmt).join("L");

  let d = fmt(pts[0]);

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const before = pts[i - 1] ?? a, after = pts[i + 2] ?? b;
    d += "C" + fmt([a[0] + (b[0] - before[0]) / 6, a[1] + (b[1] - before[1]) / 6]) + " "
      + fmt([b[0] - (after[0] - a[0]) / 6, b[1] - (after[1] - a[1]) / 6]) + " " + fmt(b);
  }

  return d;
};

// A point of an Area or a Line that is there with both numbers, and the runs of two points or more between missing
// ones (null in the list): a missing point breaks the outline into pieces instead of drawing it at 0. With no missing
// point there is one run, and the outline is the same as it always was.
const present = (q) => q != null && !missing(q[0]) && !missing(q[1]);
const runs = (pts) => {

  if (!pts.includes(null)) return pts.length > 1 ? [pts] : [];

  const out = [[]];

  for (const q of pts) {
    if (q) out[out.length - 1].push(q);
    else if (out[out.length - 1].length) out.push([]);
  }

  return out.filter((run) => run.length > 1);
};

// The points that are there: the list itself when every point is two finite numbers (most lines), so a long line costs
// no copy and only this quick look (0.3 ms for 100,000 points)
export const there = (pts) => {

  for (let i = 0; i < pts.length; i++) {
    const q = pts[i];
    if (q == null || !Number.isFinite(q[0]) || !Number.isFinite(q[1])) return pts.filter(present);
  }

  return pts;
};

// An Area: a filled shape over the value axis from `points`, a list of [x, y] sorted by x (y >= 0), drawn in its own box.
// areaSpan gives the first and last x of the points that are there (kept), where CSS places the box.
export const areaSpan = (kept) => (kept.length ? [kept[0][0], kept[kept.length - 1][0]] : [0, 0]);

// The outline's points in the shape's box: along the value axis from 0 to 1000, and across as a share of the peak
// (null for a missing point)
export function areaPoints(pts, kept, span, peak) {

  if (kept.length < 2) return null;

  const [x0, x1] = span;
  const w = x1 - x0 || 1;
  const top = peak ?? extentOf(kept.map((q) => q[1]))[1];
  const at = ([x, y]) => [((x - x0) / w) * 1000, Math.min(1, y / (top || 1))];

  return kept === pts ? pts.map(at) : pts.map((q) => (present(q) ? at(q) : null));
}

// The Area's path. u runs along the value axis and t across the band, both from 0 to 1000 in the shape's box.
// Each run's outline: the top edge (both edges when mirrored), and the base under it, which is never curved.
export function areaPath(ut, vertical, mirror, smooth) {

  if (!ut) return "";

  const xy = (u, t) => (vertical ? [1000 - t, 1000 - u] : [u, t]);

  return runs(ut).map((run) => {
    if (mirror) {
      return "M" + trace(run.map(([u, y]) => xy(u, 500 - y * 500)), smooth)
        + "L" + trace(run.slice().reverse().map(([u, y]) => xy(u, 500 + y * 500)), smooth) + "Z";
    }

    return "M" + fmt(xy(run[0][0], 1000)) + "L" + trace(run.map(([u, y]) => xy(u, 1000 - y * 1000)), smooth)
      + "L" + fmt(xy(run[run.length - 1][0], 1000)) + "Z";
  }).join("");
}

// A Line: a line through `points`, a list of [x, y], drawn in its own box. lineBox gives [smallest x, largest x,
// smallest y, largest y] of the points that are there, y on the cross scale (a flat line still gets a box to be drawn in).
export function lineBox(kept, fill, base) {

  if (!kept.length) return [0, 0, 0, 1];

  const xs = kept.map((q) => q[0]);
  const ys = kept.map((q) => q[1]);
  if (fill) ys.push(base ?? 0);
  let [y0, y1] = extentOf(ys);
  if (y0 === y1) {
    y0 -= 0.5;
    y1 += 0.5;
  }

  return [...extentOf(xs), y0, y1];
}

// The line's points in its box, u along the value axis and t across (from the top when horizontal), both from 0 to
// 1000 (null for a missing point), and the t where the fill under it ends
export function linePoints(pts, kept, box, peak, crossed, fill, base) {

  if (kept.length < 2) return null;

  const [x0, x1, y0, y1] = box;
  const w = x1 - x0 || 1;
  const top = peak ?? extentOf(kept.map((q) => q[1]))[1];
  // up is y's place across, 0 to 1: on the cross scale within the box, or in the band
  const up = crossed ? (y) => (y - y0) / (y1 - y0) : (y) => Math.min(1, y / (top || 1));
  const at = ([x, y]) => [((x - x0) / w) * 1000, 1000 - up(y) * 1000];

  return {
    ut: kept === pts ? pts.map(at) : pts.map((q) => (present(q) ? at(q) : null)),
    floor: !fill ? 1000 : crossed ? 1000 - up(base ?? 0) * 1000 : 1000,
  };
}

// The line, and the shape under it when filled
export function linePaths(pts, vertical, fill, smooth) {

  if (!pts) return ["", ""];

  const { ut, floor } = pts;
  const xy = (u, t) => (vertical ? [1000 - t, 1000 - u] : [u, t]);
  const parts = runs(ut);
  const pieces = parts.map((run) => "M" + trace(run.map(([u, t]) => xy(u, t)), smooth));
  const line = pieces.join("");
  if (!fill) return [line, ""];

  // Under each piece, down to the floor
  const under = parts.map((run, i) => pieces[i] + "L" + fmt(xy(run[run.length - 1][0], floor)) + "L" + fmt(xy(run[0][0], floor)) + "Z").join("");

  return [line, under];
}
