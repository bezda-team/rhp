/* @refresh skip */
// Slat roots need native elements; Solid Refresh wraps named components in accessors.
// Blocks are the pieces a slat is built from. Each block writes its raw numbers as CSS variables (--rhp-from, --rhp-to,
// --rhp-at, --rhp-value) and the CSS turns them into positions using the scale (--rhp-min, --rhp-max) set on the Chart.
// Blocks also take class, style, ref, children and any other attribute or handler, like a plain element.
import { createMemo, createRenderEffect, splitProps } from "solid-js";
import { insert, style } from "solid-js/web";
import { isServer } from "./env.js";
import { useOrientation, useCrossed, short } from "./plot.jsx";
import { write } from "./frame.js";
import { transitioned, cssEase } from "./animate.js";

const cls = (base, c) => (c ? base + " " + c : base);

// The smallest and largest of a list, in a loop: spreading 150,000 numbers into Math.min overflows V8's stack
const extentOf = (list) => {

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
const length = (v) => (typeof v === "number" ? v * 100 + "%" : v);

// A point of a path, and the run of points between two of them. With `smooth`, each pair is joined by a curve that
// leans on its neighbours (a Catmull-Rom spline as cubics), so a shape drawn from data can be round without anyone
// writing a path. Without it they are joined by straight lines, as before.
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

// The outline of an Area or a Line moves with a CSS transition of d (rhp.css), but Safari has no d property, so there
// the block runs the transition that the path's CSS asks for itself, on rhp's clock and by CSS's rules.
const noCssD = !isServer && typeof CSS !== "undefined" && !CSS.supports("d", "path('M0,0')");

// The transition of d that a path's CSS asks for, as transitioned() settings. In the JS version (where rhp counts the
// outline) and while the chart turns there is none, and those are found without reading the style, because there the
// outline changes every frame.
function cssTransition(path) {

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

// An outline's points as they should be drawn now: in Safari moving to each new outline, elsewhere as they are
const drawn = (read, path) => (noCssD ? transitioned(read, () => cssTransition(path())) : read);

// A stable style object may contain reactive getters; keep reading them on every rendering path.
// Retain the last values separately from the bookkeeping Solid's style helper mutates.
function readStyle(st, prev) {

  if (!st || typeof st !== "object") return st;
  const next = {};
  let changed = !prev || typeof prev !== "object";
  let count = 0;

  for (const key in st) {
    const value = st[key];
    next[key] = value;
    count++;
    if (changed || value !== prev[key] || !Object.hasOwn(prev, key)) changed = true;
  }

  return changed || Object.keys(prev).length !== count ? next : prev;
}

// Sets an element's style prop (an object or a string) where rhp also writes the element's CSS variables, the keys.
// Solid sets a string, a change from a string, and no style at all by replacing the whole style attribute, which takes
// the variables with it: those are put back as they were, so a value still waiting for the next frame lands there as
// it would have, and nothing moves in between. prev is what the last call returned.
function setStyle(el, st, prev, keys) {

  const whole = typeof st === "string" || typeof prev === "string" || (!st && prev);
  const kept = whole ? keys.map((key) => [key, el.style.getPropertyValue(key)]) : [];
  const css = style(el, st, prev);

  for (const [key, value] of kept) {
    if (value) el.style.setProperty(key, value);
  }

  return css;
}

// Writes an element's CSS variables, and only the ones that changed (the first ones now, the rest in the next frame).
// back(v) is for a Bar: whether it runs backward. st() is the element's style prop, set with them.
export function writeVars(el, vars, back, st) {

  if (isServer) return; // on a server they go into the element's style attribute (withVars)

  createRenderEffect((prev) => {
    const v = vars();
    const s = readStyle(st?.(), prev?.s);
    const css = s !== prev?.s ? setStyle(el, s, prev?.css, Object.keys(v)) : prev?.css;

    for (const key in v) {
      if (v[key] === prev?.v[key]) continue;
      if (prev) write(el, key, v[key]);
      else if (v[key] != null) el.style.setProperty(key, v[key]);
    }

    if (back) el.toggleAttribute("data-rhp-back", back(v));

    return { v, s, css };
  });
}

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
        {...(attrs ? attrs() : {})}>
        {props.children}
      </div>
    );
    writeVars(el, () => vars(orientation() === "vertical"), back, () => props.style);
    return el;
  }

  const el = <div />;
  if ("children" in props) insert(el, () => props.children);

  createRenderEffect((prev) => {
    const c = cls(base, props.class);
    const dir = short(orientation());
    const st = readStyle(props.style, prev?.st);
    const a = attrs?.();
    const v = vars(orientation() === "vertical");

    if (c !== prev?.c) el.setAttribute("class", c);
    if (dir !== prev?.dir) el.setAttribute("data-rhp-o", dir);

    for (const key in a) {
      if (a[key] === prev?.a[key]) continue;
      if (a[key] == null) el.removeAttribute(key);
      else el.setAttribute(key, a[key]);
    }

    const css = st !== prev?.st ? setStyle(el, st, prev?.css, Object.keys(v)) : prev?.css;

    for (const key in v) {
      if (v[key] === prev?.v[key]) continue;
      if (prev) write(el, key, v[key]);
      else if (v[key] != null) el.style.setProperty(key, v[key]);
    }

    if (back) el.toggleAttribute("data-rhp-back", back(v));

    return { c, dir, a, st, css, v };
  });

  props.ref?.(el);

  return el;
}

// On a server, the element as the browser will first draw it
function serverBlock(props, mine, base, vars, attrs, back) {

  const orientation = useOrientation();
  const v = vars(orientation() === "vertical");
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

  return (props) => blockElement(props, mine, base, (vertical) => vars(props, vertical), null, back);
}

// A span along the value axis from `from` (0 by default) to `to`: bars, boxes, whiskers, stems, Gantt tasks.
// `thick` is its size across the band, a CSS length ("2px") or a share of the band (0.6).
export const Bar = block("rhp-bar", ["from", "to", "thick", "color", "shape"], (p, vertical) => ({
  "--rhp-from": p.from ?? 0,
  "--rhp-to": p.to ?? 0,
  "--rhp-thick": length(p.thick),
  "--rhp-color": tok(p.color),
  "--rhp-clip": p.shape?.clip(vertical, (p.to ?? 0) < (p.from ?? 0)),
}), (v) => v["--rhp-to"] < v["--rhp-from"]);

// A round point at value `at`. `size` is its diameter (10px by default) and `across` places it across the band (0..1).
// In a Chart with a cross scale, `cross` places it on that scale instead (a scatter plot's y).
export const Dot = block("rhp-dot", ["at", "size", "across", "cross", "color", "shape"], (p, vertical) => ({
  "--rhp-at": p.at,
  "--rhp-size": length(p.size),
  "--rhp-across": p.across,
  "--rhp-cross": p.cross,
  "--rhp-color": tok(p.color),
  "--rhp-clip": p.shape?.clip(vertical, false),
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
export const Tick = block("rhp-tick", ["at", "thick", "color", "shape"], (p, vertical) => ({
  "--rhp-at": p.at,
  "--rhp-thick": length(p.thick),
  "--rhp-color": tok(p.color),
  "--rhp-clip": p.shape?.clip(vertical, false),
}));

// A cell that fills its slat, colored by `value` on the scale (from --rhp-low to --rhp-high), for heatmaps
export const Cell = block("rhp-cell", ["value", "color", "shape"], (p, vertical) => ({
  "--rhp-value": p.value,
  "--rhp-color": tok(p.color),
  "--rhp-clip": p.shape?.clip(vertical, false),
}));

// Text on the value axis. at={v} puts it just after the value v (side="before" puts it just before), and
// edge="start" or "end" puts it outside the track, in the chart's gutter (names, totals). In a Chart with a cross scale,
// `cross` places it on that scale too (a point's label).
const LABEL = new Set([...MINE, "at", "side", "edge", "cross", "shape"]);
export const Label = (props) => blockElement(props, LABEL, "rhp-label", (vertical) => ({ "--rhp-at": props.at, "--rhp-cross": props.cross, "--rhp-clip": props.shape?.clip(vertical, false) }), () => ({
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
  const [p, rest] = splitProps(props, ["class", "style", "ref", "points", "peak", "mirror", "color", "smooth"]);

  const span = createMemo(() => {
    const pts = p.points ?? [];
    if (!pts.length) return [0, 0];
    return [pts[0][0], pts[pts.length - 1][0]];
  });

  // The outline's points in the shape's box: along the value axis from 0 to 1000, and across as a share of the peak
  const points = () => {
    const pts = p.points ?? [];
    if (pts.length < 2) return null;

    const [x0, x1] = span();
    const w = x1 - x0 || 1;
    const peak = p.peak ?? extentOf(pts.map((q) => q[1]))[1];

    return pts.map(([x, y]) => [((x - x0) / w) * 1000, Math.min(1, y / (peak || 1))]);
  };
  let pathEl;
  const shown = drawn(points, () => pathEl);

  const path = createMemo(() => {
    const ut = shown();
    if (!ut) return "";

    const vertical = orientation() === "vertical";
    // u runs along the value axis and t across the band, both from 0 to 1000 in the shape's box
    const xy = (u, t) => (vertical ? [1000 - t, 1000 - u] : [u, t]);
    // The outline: the top edge (both edges when mirrored), and the base under it, which is never curved
    if (p.mirror) {
      return "M" + trace(ut.map(([u, y]) => xy(u, 500 - y * 500)), p.smooth)
        + "L" + trace(ut.slice().reverse().map(([u, y]) => xy(u, 500 + y * 500)), p.smooth) + "Z";
    }

    return "M" + fmt(xy(ut[0][0], 1000)) + "L" + trace(ut.map(([u, y]) => xy(u, 1000 - y * 1000)), p.smooth)
      + "L" + fmt(xy(ut[ut.length - 1][0], 1000)) + "Z";
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
      viewBox="0 0 1000 1000" preserveAspectRatio="none" style={isServer ? withVars(p.style, vars()) : undefined}>
      <path ref={pathEl} d={path()} vector-effect="non-scaling-stroke" />
    </svg>
  );
  writeVars(el, vars, null, () => p.style);

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
  const [p, rest] = splitProps(props, ["class", "style", "ref", "points", "peak", "fill", "base", "color", "smooth"]);

  // [smallest x, largest x, smallest y, largest y], y on the cross scale (a flat line still gets a box to be drawn in)
  const box = createMemo(() => {
    const pts = p.points ?? [];
    if (!pts.length) return [0, 0, 0, 1];

    const xs = pts.map((q) => q[0]);
    const ys = pts.map((q) => q[1]);
    if (p.fill) ys.push(p.base ?? 0);
    let [y0, y1] = extentOf(ys);
    if (y0 === y1) {
      y0 -= 0.5;
      y1 += 0.5;
    }

    return [...extentOf(xs), y0, y1];
  });

  // The line's points in its box, u along the value axis and t across (from the top when horizontal), both from 0 to
  // 1000, and the t where the fill under it ends
  const points = () => {
    const pts = p.points ?? [];
    if (pts.length < 2) return null;

    const [x0, x1, y0, y1] = box();
    const w = x1 - x0 || 1;
    const peak = p.peak ?? extentOf(pts.map((q) => q[1]))[1];
    // up is y's place across, 0 to 1: on the cross scale within the box, or in the band
    const up = crossed() ? (y) => (y - y0) / (y1 - y0) : (y) => Math.min(1, y / (peak || 1));

    return {
      ut: pts.map(([x, y]) => [((x - x0) / w) * 1000, 1000 - up(y) * 1000]),
      floor: !p.fill ? 1000 : crossed() ? 1000 - up(p.base ?? 0) * 1000 : 1000,
    };
  };
  let pathEl;
  const shown = drawn(points, () => pathEl);

  // The line, and the shape under it when filled
  const paths = createMemo(() => {
    const pts = shown();
    if (!pts) return ["", ""];

    const { ut, floor } = pts;
    const vertical = orientation() === "vertical";
    const xy = (u, t) => (vertical ? [1000 - t, 1000 - u] : [u, t]);
    const line = "M" + trace(ut.map(([u, t]) => xy(u, t)), p.smooth);
    if (!p.fill) return [line, ""];

    const under = line + "L" + fmt(xy(ut[ut.length - 1][0], floor)) + "L" + fmt(xy(ut[0][0], floor)) + "Z";

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
      viewBox="0 0 1000 1000" preserveAspectRatio="none" style={isServer ? withVars(p.style, vars()) : undefined}>
      <path class="rhp-under" d={paths()[1]} />
      <path ref={pathEl} class="rhp-stroke" d={paths()[0]} vector-effect="non-scaling-stroke" />
    </svg>
  );
  writeVars(el, vars, null, () => p.style);

  return node;
}
