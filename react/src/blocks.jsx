// Blocks are the pieces a slat is built from. Each block writes its raw numbers as CSS variables (--rhp-from, --rhp-to,
// --rhp-at, --rhp-value) and the CSS turns them into positions using the scale (--rhp-min, --rhp-max) set on the Chart.
// Blocks also take className, style, ref, children and any other attribute or handler, like a plain element.
// NOTE: React draws a block with its first values, so a server's HTML and the browser's first drawing are the same.
// After that the block writes only the variables that changed, itself and in the next frame (frame.js), and its style
// prop keeps the first ones, so React never writes them again. A block in a static Plot leaves them all to React.
import { useContext, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { jsx } from "react/jsx-runtime";
import { Around, isServer } from "./context.js";
import { ticker, transition } from "./clock.js";
import { write } from "../../src/frame.js";
import { missing } from "../../src/data.js";
import { short } from "../../src/layout.js";
import { cls, tok, safeCssValue, cssTransition, there, areaSpan, areaPoints, areaPath, lineBox, linePoints, linePaths, BAR, DOT, PLACE, TICK, CELL, LABEL } from "../../src/marks.js";

// The CSS variables an element is first drawn with: those with a value (a value a browser would reject is left out, so
// a server leaves it out too), over its style prop
const firstStyle = (v) => {

  let out = null;

  for (const key in v) {
    if (safeCssValue(v[key])) (out ??= {})[key] = v[key];
  }

  return out;
};

const withStyle = (st, first) => (!st ? first ?? undefined : first ? { ...st, ...first } : st);

// A ref that gives the element to the block's writer (s) and to the ref the app gave it
const refTo = (s, user) => {

  if (s.user === user) return s.ref;

  s.user = user;
  s.ref = (el) => {
    s.current = el;
    const undo = typeof user === "function" ? user(el) : ((user.current = el), undefined);
    return () => {
      s.current = null;
      if (typeof undo === "function") undo();
      else if (typeof user === "function") user(null);
      else user.current = null;
    };
  };

  return s.ref;
};

// An element's CSS variables v, and the attribute that hides a block with a missing value (miss), as React draws them
// and as the block writes them after that: the element's style prop, its ref and that attribute.
// NOTE: The missing attribute is written in the same frame as the variables, so a style read in between never draws
// the block with the variables it had before (a bar coming back would grow from 0).
function useWriter(v, miss, still, style, ref) {

  // A static Plot keeps no state per block: React draws every value
  if (still) return { style: withStyle(style, firstStyle(v)), ref, missing: miss };

  const own = useRef(null);
  let s = own.current;
  if (s === null) s = own.current = { current: null, v, miss, first: firstStyle(v), firstMiss: miss, user: undefined, ref: null };

  useLayoutEffect(() => {
    const prev = s.v;
    if (prev === v && s.miss === miss) return; // as first drawn

    const el = s.current;
    if (prev !== v) {
      for (const key in v) {
        if (v[key] !== prev[key]) write(el, key, v[key]);
      }
    }
    if (miss !== s.miss) write(el, "data-rhp-missing", miss);

    s.v = v;
    s.miss = miss;
  });

  // `s` is also the ref object that holds the element, when the app gives no ref of its own
  return { style: withStyle(style, s.first), ref: ref ? refTo(s, ref) : s, missing: s.firstMiss };
}

const MINE = ["className", "style", "ref", "children"];

// The attribute of a block with a missing value and of one without, shared so that a change makes no new object
const GONE = { "data-rhp-missing": "" };
const HERE = { "data-rhp-missing": undefined };

// A block type from its definition in marks.js: vars(p, vertical, placed) gives its CSS variables, reading each value
// that places it with placed(key), and attrs(p, gone) its own attributes, data-rhp-missing among them.
// placed() keeps whether a value the block was given is missing (null, undefined, NaN or infinite): such a block draws
// nothing, rather than sit at the start of the scale as if the value were 0. A value not given at all keeps its
// default (a Bar's from is 0).
function block({ base, own, vars, back, attrs }, name) {

  const mine = new Set([...MINE, ...own]);

  function Block(props) {

    const { orientation, still } = useContext(Around);

    let gone = false;
    const placed = (key) => {
      const v = props[key];
      if (missing(v) && key in props) gone = true;
      return v;
    };
    const v = vars(props, orientation === "vertical", placed);
    const a = attrs ? attrs(props, gone) : gone ? GONE : HERE;
    const w = useWriter(v, a["data-rhp-missing"], still, props.style, props.ref);

    // Any other prop goes on the element, as on a plain one
    const el = {};
    for (const key in props) {
      if (!mine.has(key)) el[key] = props[key];
    }
    el.className = cls(base, props.className);
    el["data-rhp-o"] = short(orientation);
    for (const key in a) {
      el[key] = a[key];
    }
    el["data-rhp-missing"] = w.missing;
    if (back) el["data-rhp-back"] = back(v) ? "" : undefined;
    el.style = w.style;
    el.ref = w.ref;
    el.children = props.children;

    return jsx("div", el);
  }

  Block.displayName = name;

  return Block;
}

export const Bar = block(BAR, "Bar");
export const Dot = block(DOT, "Dot");
export const Place = block(PLACE, "Place");
export const Tick = block(TICK, "Tick");
export const Cell = block(CELL, "Cell");
export const Label = block(LABEL, "Label");

// The outline of an Area or a Line moves with a CSS transition of d (rhp.css), but Safari has no d property, so there
// the block runs the transition that the path's CSS asks for itself, on rhp's clock and by CSS's rules: it is drawn
// again in each frame of the transition. (Whether the browser has d is the same for the whole page, so a block either
// always takes this path or never does.)
const noCssD = !isServer && typeof CSS !== "undefined" && !CSS.supports("d", "path('M0,0')");

function useOutline(target, path) {

  if (!noCssD) return target;

  const own = useRef(null);
  if (own.current === null) {
    const t = ticker();
    own.current = { t, run: transition(() => cssTransition(path.current), t.moving) };
  }
  useSyncExternalStore(own.current.t.subscribe, own.current.t.read, own.current.t.read);

  return own.current.run(target);
}

const NONE = [];

// A filled shape over the value axis from `points`, a list of [x, y] sorted by x (y >= 0).
// y is drawn across the band, scaled so that `peak` (the largest y by default) fills it. With `mirror` it is drawn both
// ways from the middle of the band (violins), otherwise it grows from the band's edge (ridgelines). A point that is null
// or has a missing x or y breaks the shape: each run of points between missing ones is a shape of its own.
// NOTE: The path is drawn in the shape's own box, and CSS places the box from the first x to the last. So when the scale
// changes, the box moves and the path doesn't need to be redrawn.
export function Area(props) {

  const { orientation, still } = useContext(Around);
  const { className, style, ref, points, peak, mirror, color, smooth, ...rest } = props;
  const pts = points ?? NONE;

  const kept = useMemo(() => there(pts), [pts]);
  const span = useMemo(() => areaSpan(kept), [kept]);
  const target = useMemo(() => (kept.length < 2 ? null : areaPoints(pts, kept, span, peak)), [pts, kept, span, peak]);
  const path = useRef(null);
  const shown = useOutline(target, path);
  const vertical = orientation === "vertical";
  const d = useMemo(() => (shown ? areaPath(shown, vertical, mirror, smooth) : ""), [shown, vertical, mirror, smooth]);

  // The path is also given in CSS (d: var(--rhp-d)) so a page's "all: revert" can't remove the shape
  const w = useWriter({
    "--rhp-from": span[0],
    "--rhp-to": span[1],
    "--rhp-color": tok(color),
    "--rhp-d": d ? `path("${d}")` : undefined,
  }, undefined, still, style, ref);

  return (
    <svg {...rest} ref={w.ref} className={cls("rhp-area", className)} data-rhp-o={short(orientation)} viewBox="0 0 1000 1000"
      preserveAspectRatio="none" style={w.style}>
      <path ref={path} d={d} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// A line through `points`, a list of [x, y]: x on the value axis, and y across the band, scaled so that `peak` (the
// largest y by default) fills it, as a sparkline in a row. In a Chart with a cross scale, y is on that scale: a line
// chart, or with points out of x's order, a connected scatter plot. With `fill`, what is under the line is filled too,
// down to the band's edge, or on a cross scale down to `base` (0 by default). A point that is null or has a missing x
// or y breaks the line, and its fill: each run of points between missing ones is drawn on its own.
// NOTE: Like an Area, the line is drawn in its own box, which CSS places from the smallest x to the largest (and on a
// cross scale from the smallest y to the largest), so a scale that changes moves the box and the path stays as it is.
export function Line(props) {

  const { orientation, still, crossed } = useContext(Around);
  const { className, style, ref, points, peak, fill, base, color, smooth, ...rest } = props;
  const pts = points ?? NONE;

  const kept = useMemo(() => there(pts), [pts]);
  const box = useMemo(() => (kept.length ? lineBox(kept, fill, base) : [0, 0, 0, 1]), [kept, fill, base]);
  const target = useMemo(() => (kept.length < 2 ? null : linePoints(pts, kept, box, peak, crossed, fill, base)), [pts, kept, box, peak, crossed, fill, base]);
  const path = useRef(null);
  const shown = useOutline(target, path);
  const vertical = orientation === "vertical";
  const [line, under] = useMemo(() => (shown ? linePaths(shown, vertical, fill, smooth) : ["", ""]), [shown, vertical, fill, smooth]);

  // The paths are also given in CSS (d: var(--rhp-d)) so a page's "all: revert" can't remove them
  const w = useWriter({
    "--rhp-from": box[0],
    "--rhp-to": box[1],
    "--rhp-cross-from": crossed ? box[2] : undefined,
    "--rhp-cross-to": crossed ? box[3] : undefined,
    "--rhp-color": tok(color),
    "--rhp-d": line ? `path("${line}")` : undefined,
    "--rhp-d-under": under ? `path("${under}")` : undefined,
  }, undefined, still, style, ref);

  return (
    <svg {...rest} ref={w.ref} className={cls("rhp-line", className)} data-rhp-o={short(orientation)} viewBox="0 0 1000 1000"
      preserveAspectRatio="none" style={w.style}>
      <path className="rhp-under" d={under} />
      <path ref={path} className="rhp-stroke" d={line} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
