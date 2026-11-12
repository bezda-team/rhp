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
import { transitioned } from "./animate.js";
import { missing } from "./data.js";
import { cls, tok, safeCssValue, withVars, cssTransition, there, areaSpan, areaPoints, areaPath, lineBox, linePoints, linePaths, BAR, DOT, PLACE, TICK, CELL, LABEL } from "./marks.js";

export { tok, safeCssValue, withVars };

// The outline of an Area or a Line moves with a CSS transition of d (rhp.css), but Safari has no d property, so there
// the block runs the transition that the path's CSS asks for itself, on rhp's clock and by CSS's rules.
const noCssD = !isServer && typeof CSS !== "undefined" && !CSS.supports("d", "path('M0,0')");

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
// back(v) is for a Bar: whether it runs backward. st() is the element's style prop, set with them, and attrs() gives a
// block's own attributes, read after the variables (a block finds whether it has a missing value while reading them).
export function writeVars(el, vars, back, st, attrs) {

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

    const a = attrs?.();
    setAttrs(el, a, prev?.a);

    return { v, s, css, a };
  });
}

// Whether a block got props other than its own (onClick, title, data-*...)
const others = (props, mine) => {

  for (const key in props) {
    if (!mine.has(key)) return true;
  }

  return false;
};

const MINE = ["class", "style", "ref", "children"];

// Sets a block's own attributes that changed. The one that hides a block with a missing value is written in the same
// frame as the block's CSS variables, so a style read in between never draws the block with the variables it had
// before (a bar coming back would grow from 0).
function setAttrs(el, a, prev) {

  for (const key in a) {
    if (a[key] === prev?.[key]) continue;
    if (prev && key === "data-rhp-missing") write(el, key, a[key]);
    else if (a[key] == null) el.removeAttribute(key);
    else el.setAttribute(key, a[key]);
  }
}

// A block's element. attrs() gives its own attributes (a Label's edge and side), read after vars(), and back(v) is true
// when a Bar runs backward along the value axis.
// NOTE: Most blocks get no props other than their own, so they skip Solid's spread and update everything in one effect.
// This makes a chart much faster to mount and lighter (a chart of 1,000 rows has 3,000 fewer computations).
function browserBlock(props, mine, base, vars, attrs, back) {

  const orientation = useOrientation();

  if (others(props, mine)) {
    // The class comes before the spread so that a classList adds to it instead of replacing it
    const el = (
      <div class={cls(base, props.class)} data-rhp-o={short(orientation())} {...splitProps(props, [...mine])[1]} ref={(e) => props.ref?.(e)}>
        {props.children}
      </div>
    );
    writeVars(el, () => vars(orientation() === "vertical"), back, () => props.style, attrs);
    return el;
  }

  const el = <div />;
  if ("children" in props) insert(el, () => props.children);

  createRenderEffect((prev) => {
    const c = cls(base, props.class);
    const dir = short(orientation());
    const st = readStyle(props.style, prev?.st);
    const v = vars(orientation() === "vertical");
    const a = attrs?.();

    if (c !== prev?.c) el.setAttribute("class", c);
    if (dir !== prev?.dir) el.setAttribute("data-rhp-o", dir);
    setAttrs(el, a, prev?.a);

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

// The attribute of a block with a missing value and of one without, shared so that a change makes no new object
const GONE = { "data-rhp-missing": "" };
const HERE = { "data-rhp-missing": undefined };

// A block type. vars(p, vertical, placed) gives its CSS variables, reading each value that places it with placed(key),
// so that each is read once per change (a value worked out in the slat runs once), and attrs(p, gone) its own
// attributes, data-rhp-missing among them.
// placed() keeps whether a value the block was given is missing (null, undefined, NaN or infinite): such a block draws
// nothing, rather than sit at the start of the scale as if the value were 0. A value not given at all keeps its
// default (a Bar's from is 0).
function block({ base, own, vars, back, attrs }) {

  const mine = new Set([...MINE, ...own]);

  return (props) => {
    let gone = false;
    const placed = (key) => {
      const v = props[key];
      if (missing(v) && key in props) gone = true;
      return v;
    };

    return blockElement(props, mine, base, (vertical) => {
      gone = false;
      return vars(props, vertical, placed);
    }, attrs ? () => attrs(props, gone) : () => (gone ? GONE : HERE), back);
  };
}

// The blocks themselves (their CSS variables and attributes) are in marks.js
export const Bar = block(BAR);
export const Dot = block(DOT);
export const Place = block(PLACE);
export const Tick = block(TICK);
export const Cell = block(CELL);
export const Label = block(LABEL);

// A filled shape over the value axis from `points`, a list of [x, y] sorted by x (y >= 0).
// y is drawn across the band, scaled so that `peak` (the largest y by default) fills it. With `mirror` it is drawn both
// ways from the middle of the band (violins), otherwise it grows from the band's edge (ridgelines). A point that is null
// or has a missing x or y breaks the shape: each run of points between missing ones is a shape of its own.
// NOTE: The path is drawn in the shape's own box, and CSS places the box from the first x to the last. So when the scale
// changes, the box moves and the path doesn't need to be redrawn.
export function Area(props) {

  const orientation = useOrientation();
  const [p, rest] = splitProps(props, ["class", "style", "ref", "points", "peak", "mirror", "color", "smooth"]);

  const kept = createMemo(() => there(p.points ?? []));
  const span = createMemo(() => areaSpan(kept()));

  // The outline's points in the shape's box (areaPoints)
  const points = () => {
    const pts = p.points ?? [];
    if (kept().length < 2) return null;

    return areaPoints(pts, kept(), span(), p.peak);
  };
  let pathEl;
  const shown = drawn(points, () => pathEl);

  const path = createMemo(() => {
    const ut = shown();
    if (!ut) return "";

    return areaPath(ut, orientation() === "vertical", p.mirror, p.smooth);
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
// down to the band's edge, or on a cross scale down to `base` (0 by default). A point that is null or has a missing x
// or y breaks the line, and its fill: each run of points between missing ones is drawn on its own.
// NOTE: Like an Area, the line is drawn in its own box, which CSS places from the smallest x to the largest (and on a
// cross scale from the smallest y to the largest), so a scale that changes moves the box and the path stays as it is.
export function Line(props) {

  const orientation = useOrientation();
  const crossed = useCrossed();
  const [p, rest] = splitProps(props, ["class", "style", "ref", "points", "peak", "fill", "base", "color", "smooth"]);

  // [smallest x, largest x, smallest y, largest y], y on the cross scale (lineBox)
  const kept = createMemo(() => there(p.points ?? []));
  const box = createMemo(() => {
    const pts = kept();
    if (!pts.length) return [0, 0, 0, 1];

    return lineBox(pts, p.fill, p.base);
  });

  // The line's points in its box, and the t where the fill under it ends (linePoints)
  const points = () => {
    const pts = p.points ?? [];
    if (kept().length < 2) return null;

    return linePoints(pts, kept(), box(), p.peak, crossed(), p.fill, p.base);
  };
  let pathEl;
  const shown = drawn(points, () => pathEl);

  // The line, and the shape under it when filled
  const paths = createMemo(() => {
    const pts = shown();
    if (!pts) return ["", ""];

    return linePaths(pts, orientation() === "vertical", p.fill, p.smooth);
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
