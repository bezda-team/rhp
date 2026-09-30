// Blocks are the pieces a slat is built from. Each block writes its raw numbers as CSS variables (--rhp-from, --rhp-to,
// --rhp-at, --rhp-value) and the CSS turns them into positions using the scale (--rhp-min, --rhp-max) set on the Chart.
// Blocks also take class, style, ref, children and any other attribute or handler, like a plain element.
import { createMemo, createRenderEffect, splitProps } from "solid-js";
import { insert, style } from "solid-js/web";
import { isServer } from "./env.js";
import { useOrientation, useCrossed, short } from "./plot.jsx";
import { write } from "./frame.js";

const cls = (base, c) => (c ? base + " " + c : base);

// A color is a theme key ("series-2", "positive", "muted"...) or a CSS color.
// A slat that reads a page's CSS variable would look different in every app, so that gets a warning.
const KEY = /^(series-\d+|positive|negative|ink|muted|grid|surface|low|high)$/;
export const tok = (c) => {

  if (typeof c !== "string") return c;
  if (KEY.test(c)) return "var(--rhp-" + c + ")";
  if (/var\(--(?!rhp-)/.test(c)) console.warn("rhp: " + c + " reads a page variable; use a theme key");

  return c;
};

// 0.6 -> "60%", and "2px" stays "2px"
const length = (v) => (typeof v === "number" ? v * 100 + "%" : v);

// Writes an element's CSS variables, and only the ones that changed (the first ones now, the rest in the next frame).
// back(v) is for a Bar: whether it runs backward.
export function writeVars(el, vars, back) {

  if (isServer) return; // on a server they go into the element's style attribute (withVars)

  createRenderEffect((prev) => {
    const v = vars();

    for (const key in v) {
      if (v[key] === prev?.[key]) continue;
      if (prev) write(el, key, v[key]);
      else if (v[key] != null) el.style.setProperty(key, v[key]);
    }

    if (back) el.toggleAttribute("data-rhp-back", back(v));

    return v;
  });
}

// On a server, the style attribute of an element: its style prop (an object or a string) and its CSS variables
export function withVars(st, vars) {

  let css = typeof st === "string" ? st : "";

  if (st && typeof st === "object") {
    for (const key in st) {
      if (st[key] != null) css += (css && !css.endsWith(";") ? ";" : "") + key + ":" + st[key];
    }
  }

  for (const key in vars) {
    if (vars[key] != null) css += (css && !css.endsWith(";") ? ";" : "") + key + ":" + vars[key];
  }

  return css || undefined;
}

// Whether a block got props other than its own (onClick, title, data-*...)
const others = (props, mine) => {

  for (const key in props) {
    if (!mine.has(key)) return true;
  }

  return false;
};

const MINE = ["class", "style", "ref", "children"];

// A block's element. attrs() gives its own attributes (a Label's edge and side), and back(v) is true when a Bar runs
// backward along the value axis.
// NOTE: Most blocks get no props other than their own, so they skip Solid's spread and update everything in one effect.
// This makes a chart much faster to mount and lighter (a chart of 1,000 rows has 3,000 fewer computations).
function browserBlock(props, mine, base, vars, attrs, back) {

  const orientation = useOrientation();

  if (others(props, mine)) {
    // The class comes before the spread so that a classList adds to it instead of replacing it
    const el = (
      <div class={cls(base, props.class)} data-rhp-o={short(orientation())} {...splitProps(props, [...mine])[1]} ref={(e) => props.ref?.(e)}
        {...(attrs ? attrs() : {})} style={props.style}>
        {props.children}
      </div>
    );
    writeVars(el, vars, back);
    return el;
  }

  const el = <div />;
  if ("children" in props) insert(el, () => props.children);

  createRenderEffect((prev) => {
    const c = cls(base, props.class);
    const dir = short(orientation());
    const st = props.style;
    const a = attrs?.();
    const v = vars();

    if (c !== prev?.c) el.setAttribute("class", c);
    if (dir !== prev?.dir) el.setAttribute("data-rhp-o", dir);

    for (const key in a) {
      if (a[key] === prev?.a[key]) continue;
      if (a[key] == null) el.removeAttribute(key);
      else el.setAttribute(key, a[key]);
    }

    if (st !== prev?.st) style(el, st, prev?.st);

    for (const key in v) {
      if (v[key] === prev?.v[key]) continue;
      if (prev) write(el, key, v[key]);
      else if (v[key] != null) el.style.setProperty(key, v[key]);
    }

    if (back) el.toggleAttribute("data-rhp-back", back(v));

    return { c, dir, a, st, v };
  });

  props.ref?.(el);

  return el;
}

// On a server, the element as the browser will first draw it
function serverBlock(props, mine, base, vars, attrs, back) {

  const orientation = useOrientation();
  const v = vars();
  const css = withVars(props.style, v);

  return (
    <div {...(others(props, mine) ? splitProps(props, [...mine])[1] : {})} class={cls(base, props.class)} data-rhp-o={short(orientation())}
      {...(attrs ? attrs() : {})} data-rhp-back={back?.(v) ? "" : undefined} {...(css ? { style: css } : {})}>
      {props.children}
    </div>
  );
}

// Each build keeps only the one it needs (isServer is a constant there)
const blockElement = isServer ? serverBlock : browserBlock;

function block(base, own, vars, back) {

  const mine = new Set([...MINE, ...own]);

  return (props) => blockElement(props, mine, base, () => vars(props), null, back);
}

// A span along the value axis from `from` (0 by default) to `to`: bars, boxes, whiskers, stems, Gantt tasks.
// `thick` is its size across the band, a CSS length ("2px") or a share of the band (0.6).
export const Bar = block("rhp-bar", ["from", "to", "thick", "color"], (p) => ({
  "--rhp-from": p.from ?? 0,
  "--rhp-to": p.to ?? 0,
  "--rhp-thick": length(p.thick),
  "--rhp-color": tok(p.color),
}), (v) => v["--rhp-to"] < v["--rhp-from"]);

// A round point at value `at`. `size` is its diameter (10px by default) and `across` places it across the band (0..1).
// In a Chart with a cross scale, `cross` places it on that scale instead (a scatter plot's y).
export const Dot = block("rhp-dot", ["at", "size", "across", "cross", "color"], (p) => ({
  "--rhp-at": p.at,
  "--rhp-size": length(p.size),
  "--rhp-across": p.across,
  "--rhp-cross": p.cross,
  "--rhp-color": tok(p.color),
}));

// A place on the chart and nothing else: no size, no color, nothing drawn. Whatever a slat puts inside it sits at
// value `at`, so a bubble, a badge or a needle of your own needs no CSS to find its value. `across` (0 to 1) places
// it across the band, and in a Chart with a cross scale `cross` places it on that scale.
export const Place = block("rhp-place", ["at", "across", "cross"], (p) => ({
  "--rhp-at": p.at,
  "--rhp-across": p.across,
  "--rhp-cross": p.cross,
}));

// A short line across the band at value `at` (medians, targets). `thick` is its length across the band.
export const Tick = block("rhp-tick", ["at", "thick", "color"], (p) => ({
  "--rhp-at": p.at,
  "--rhp-thick": length(p.thick),
  "--rhp-color": tok(p.color),
}));

// A cell that fills its slat, colored by `value` on the scale (from --rhp-low to --rhp-high), for heatmaps
export const Cell = block("rhp-cell", ["value", "color"], (p) => ({
  "--rhp-value": p.value,
  "--rhp-color": tok(p.color),
}));

// Text on the value axis. at={v} puts it just after the value v (side="before" puts it just before), and
// edge="start" or "end" puts it outside the track, in the chart's gutter (names, totals). In a Chart with a cross scale,
// `cross` places it on that scale too (a point's label).
const LABEL = new Set([...MINE, "at", "side", "edge", "cross"]);
export const Label = (props) => blockElement(props, LABEL, "rhp-label", () => ({ "--rhp-at": props.at, "--rhp-cross": props.cross }), () => ({
  "data-rhp-edge": props.edge,
  "data-rhp-side": props.side,
  "data-rhp-at": props.edge == null ? "" : undefined,
}));

// A filled shape over the value axis from `points`, a list of [x, y] sorted by x (y >= 0).
// y is drawn across the band, scaled so that `peak` (the largest y by default) fills it. With `mirror` it is drawn both
// ways from the middle of the band (violins), otherwise it grows from the band's edge (ridgelines).
// NOTE: The path is drawn in the shape's own box, and CSS places the box from the first x to the last. So when the scale
// changes, the box moves and the path doesn't need to be redrawn.
export function Area(props) {

  const orientation = useOrientation();
  const [p, rest] = splitProps(props, ["class", "style", "ref", "points", "peak", "mirror", "color"]);

  const span = createMemo(() => {
    const pts = p.points ?? [];
    if (!pts.length) return [0, 0];
    return [pts[0][0], pts[pts.length - 1][0]];
  });

  const path = createMemo(() => {
    const pts = p.points ?? [];
    if (pts.length < 2) return "";

    const [x0, x1] = span();
    const w = x1 - x0 || 1;
    const peak = p.peak ?? Math.max(...pts.map((q) => q[1]));
    const vertical = orientation() === "vertical";
    // u runs along the value axis and t across the band, both from 0 to 1000 in the shape's box
    const xy = (u, t) => (vertical ? `${(1000 - t).toFixed(1)},${(1000 - u).toFixed(1)}` : `${u.toFixed(1)},${t.toFixed(1)}`);
    const ut = pts.map(([x, y]) => [((x - x0) / w) * 1000, Math.min(1, y / (peak || 1))]);
    const line = p.mirror
      ? [...ut.map(([u, y]) => xy(u, 500 - y * 500)), ...ut.slice().reverse().map(([u, y]) => xy(u, 500 + y * 500))]
      : [xy(ut[0][0], 1000), ...ut.map(([u, y]) => xy(u, 1000 - y * 1000)), xy(ut[ut.length - 1][0], 1000)];

    return "M" + line.join("L") + "Z";
  });

  // The path is also given in CSS (d: var(--rhp-d)) so a page's "all: revert" can't remove the shape
  const vars = () => ({
    "--rhp-from": span()[0],
    "--rhp-to": span()[1],
    "--rhp-color": tok(p.color),
    "--rhp-d": path() ? `path("${path()}")` : undefined,
  });

  let el;
  const node = (
    <svg {...rest} ref={(e) => { el = e; p.ref?.(e); }} class={cls("rhp-area", p.class)} data-rhp-o={short(orientation())}
      viewBox="0 0 1000 1000" preserveAspectRatio="none" style={isServer ? withVars(p.style, vars()) : p.style}>
      <path d={path()} vector-effect="non-scaling-stroke" />
    </svg>
  );
  writeVars(el, vars);

  return node;
}

// A line through `points`, a list of [x, y]: x on the value axis, and y across the band, scaled so that `peak` (the
// largest y by default) fills it, as a sparkline in a row. In a Chart with a cross scale, y is on that scale: a line
// chart, or with points out of x's order, a connected scatter plot. With `fill`, what is under the line is filled too,
// down to the band's edge, or on a cross scale down to `base` (0 by default).
// NOTE: Like an Area, the line is drawn in its own box, which CSS places from the smallest x to the largest (and on a
// cross scale from the smallest y to the largest), so a scale that changes moves the box and the path stays as it is.
export function Line(props) {

  const orientation = useOrientation();
  const crossed = useCrossed();
  const [p, rest] = splitProps(props, ["class", "style", "ref", "points", "peak", "fill", "base", "color"]);

  // [smallest x, largest x, smallest y, largest y], y on the cross scale (a flat line still gets a box to be drawn in)
  const box = createMemo(() => {
    const pts = p.points ?? [];
    if (!pts.length) return [0, 0, 0, 1];

    const xs = pts.map((q) => q[0]);
    const ys = pts.map((q) => q[1]);
    if (p.fill) ys.push(p.base ?? 0);
    let y0 = Math.min(...ys);
    let y1 = Math.max(...ys);
    if (y0 === y1) {
      y0 -= 0.5;
      y1 += 0.5;
    }

    return [Math.min(...xs), Math.max(...xs), y0, y1];
  });

  // The line, and the shape under it when filled
  const paths = createMemo(() => {
    const pts = p.points ?? [];
    if (pts.length < 2) return ["", ""];

    const [x0, x1, y0, y1] = box();
    const w = x1 - x0 || 1;
    const peak = p.peak ?? Math.max(...pts.map((q) => q[1]));
    const vertical = orientation() === "vertical";
    // up is y's place across, 0 to 1: on the cross scale within the box, or in the band
    const up = crossed() ? (y) => (y - y0) / (y1 - y0) : (y) => Math.min(1, y / (peak || 1));
    // u runs along the value axis and t across (from the top when horizontal), both from 0 to 1000 in the line's box
    const xy = (u, t) => (vertical ? `${(1000 - t).toFixed(1)},${(1000 - u).toFixed(1)}` : `${u.toFixed(1)},${t.toFixed(1)}`);
    const ut = pts.map(([x, y]) => [((x - x0) / w) * 1000, 1000 - up(y) * 1000]);
    const line = "M" + ut.map(([u, t]) => xy(u, t)).join("L");
    if (!p.fill) return [line, ""];

    const floor = crossed() ? 1000 - up(p.base ?? 0) * 1000 : 1000;
    const under = line + "L" + xy(ut[ut.length - 1][0], floor) + "L" + xy(ut[0][0], floor) + "Z";

    return [line, under];
  });

  // The paths are also given in CSS (d: var(--rhp-d)) so a page's "all: revert" can't remove them
  const vars = () => ({
    "--rhp-from": box()[0],
    "--rhp-to": box()[1],
    "--rhp-cross-from": crossed() ? box()[2] : undefined,
    "--rhp-cross-to": crossed() ? box()[3] : undefined,
    "--rhp-color": tok(p.color),
    "--rhp-d": paths()[0] ? `path("${paths()[0]}")` : undefined,
    "--rhp-d-under": paths()[1] ? `path("${paths()[1]}")` : undefined,
  });

  let el;
  const node = (
    <svg {...rest} ref={(e) => { el = e; p.ref?.(e); }} class={cls("rhp-line", p.class)} data-rhp-o={short(orientation())}
      viewBox="0 0 1000 1000" preserveAspectRatio="none" style={isServer ? withVars(p.style, vars()) : p.style}>
      <path class="rhp-under" d={paths()[1]} />
      <path class="rhp-stroke" d={paths()[0]} vector-effect="non-scaling-stroke" />
    </svg>
  );
  writeVars(el, vars);

  return node;
}
