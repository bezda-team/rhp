// Blocks are the pieces a slat is built from. Each block writes its raw numbers as CSS variables (--rhp-from, --rhp-to,
// --rhp-at, --rhp-value) and the CSS turns them into positions using the scale (--rhp-min, --rhp-max) set on the Chart.
// Blocks also take className, style, ref, children and any other attribute or handler, like a plain element.
// NOTE: React draws a block with its first values, so a server's HTML and the browser's first drawing are the same.
// After that the block writes only the variables that changed, itself and in the next frame (frame.js), and its style
// prop keeps the first ones, so React never writes them again. A block in a static Plot leaves them all to React.
import { Fragment, cloneElement, isValidElement, useContext, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { jsx } from "react/jsx-runtime";
import { Around, isServer } from "./context.js";
import { ticker, transition } from "./clock.js";
import { write as queue } from "../../src/frame.js";
import { missing } from "../../src/data.js";
import { short } from "../../src/layout.js";
import { cls, tok, safeCssValue, cssTransition, there, areaSpan, areaPoints, areaPath, lineBox, linePoints, linePaths, BAR, DOT, PLACE, TICK, CELL, LABEL } from "../../src/marks.js";

// The CSS variables an element is first drawn with: those with a value. (React writes "" for a variable whose value is
// undefined, a call for nothing on each element, and a value a browser would reject is left out, so a server leaves it
// out too.)
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

// A block's writer: the element it writes to (current, so it is also a ref object), what it was first drawn with, and
// what it wrote last. write(s, v, miss) writes the CSS variables v and the attribute that hides a block with a missing
// value (miss) where they changed, in the next frame.
// NOTE: The missing attribute is written in the same frame as the variables, so a style read in between never draws
// the block with the variables it had before (a bar coming back would grow from 0).
const writer = (v, miss) => ({ current: null, v, miss, first: firstStyle(v), firstMiss: miss, user: undefined, ref: null, drawn: false });

function write(s, v, miss) {

  const prev = s.v;
  const el = s.current;
  if ((prev === v && s.miss === miss) || !el) return; // as first drawn (or not in the page)

  if (prev !== v) {
    for (const key in v) {
      if (v[key] !== prev[key]) queue(el, key, v[key]);
    }
  }
  if (miss !== s.miss) queue(el, "data-rhp-missing", miss);

  s.v = v;
  s.miss = miss;
}

// An element's CSS variables v and missing attribute (miss) as React draws them: React draws the first ones, and the
// block writes the rest (s is its writer). A static Plot keeps no state per block (s is null), and React draws every
// value. styled() gives the element's style prop, refOf() its ref and missingOf() that attribute.
const styled = (s, v, style) => withStyle(style, s === null ? firstStyle(v) : s.first);
const refOf = (s, ref) => (s === null || !ref ? ref ?? s : refTo(s, ref));
const missingOf = (s, miss) => (s === null ? miss : s.firstMiss);

// An Area's or a Line's writer, in one: { style, ref }
function useWriter(v, still, style, ref) {

  if (still) return { style: styled(null, v, style), ref };

  const own = useRef(null);
  const s = own.current ?? (own.current = writer(v, undefined));
  useLayoutEffect(() => write(s, v, undefined));

  return { style: styled(s, v, style), ref: refOf(s, ref) };
}

const MINE = ["className", "style", "ref", "children"];

// The attribute of a block with a missing value and of one without, shared so that a change makes no new object
const GONE = { "data-rhp-missing": "" };
const HERE = { "data-rhp-missing": undefined };

// placed(key) reads a value that places the block, and notes whether it is missing (the block being drawn is `reading`,
// and its own attributes are `attrs` once values() has read it)
let reading = null;
let gone = false;
let attrs = null;
const placed = (key) => {

  const v = reading[key];
  if (missing(v) && key in reading) gone = true;

  return v;
};

// A block's CSS variables and its own attributes, from its definition in marks.js: vars(p, vertical, placed) gives its
// CSS variables, reading each value that places it with placed(key), and attrs(p, gone) its own attributes,
// data-rhp-missing among them.
// placed() keeps whether a value the block was given is missing (null, undefined, NaN or infinite): such a block draws
// nothing, rather than sit at the start of the scale as if the value were 0. A value not given at all keeps its
// default (a Bar's from is 0).
function values(def, props, vertical) {

  reading = props;
  gone = false;
  const v = def.vars(props, vertical, placed);
  attrs = def.attrs ? def.attrs(props, gone) : gone ? GONE : HERE;

  return v;
}

// A block's element (s is its writer, or null in a static Plot): any prop of its own that isn't the block's goes on it,
// as on a plain element
function element(def, props, dir, v, a, s, children, key) {

  const el = {};
  for (const key in props) {
    if (!def.mine.has(key)) el[key] = props[key];
  }
  el.className = cls(def.base, props.className);
  el["data-rhp-o"] = dir;
  for (const key in a) {
    el[key] = a[key];
  }
  el["data-rhp-missing"] = missingOf(s, a["data-rhp-missing"]);
  if (def.back) el["data-rhp-back"] = def.back(v) ? "" : undefined;
  el.style = styled(s, v, props.style);
  el.ref = refOf(s, props.ref);
  el.children = children;

  return jsx("div", el, key);
}

const KINDS = new Map(); // a block's component -> its definition

function block(def, name) {

  def.mine = new Set([...MINE, ...def.own]);

  function Block(props) {

    const { orientation, still } = useContext(Around);
    const v = values(def, props, orientation === "vertical");
    const a = attrs;
    const miss = a["data-rhp-missing"];

    // The block's writer (none in a static Plot, whose blocks React draws in full)
    let s = null;
    if (!still) {
      const own = useRef(null);
      s = own.current ?? (own.current = writer(v, miss));
      useLayoutEffect(() => write(s, v, miss));
    }

    return element(def, props, short(orientation), v, a, s, props.children);
  }

  Block.displayName = name;
  KINDS.set(Block, def);

  return Block;
}

export const Bar = block(BAR, "Bar");
export const Dot = block(DOT, "Dot");
export const Place = block(PLACE, "Place");
export const Tick = block(TICK, "Tick");
export const Cell = block(CELL, "Cell");
export const Label = block(LABEL, "Label");

// The blocks a slat returns, folded into its own drawing: in the slat's elements, each Bar, Dot, Place, Tick, Cell and
// Label becomes the element it draws, and the slat writes their variables, in one effect for the row. The page is the
// same, and React draws a row with a component less for each block. (A block inside a component of the app's own is
// drawn by itself.) f is the slat's: { states (the blocks' writers by where they are), next, dir, vertical, still, list
// (each writer drawn now, with its values) }.
// NOTE: A folded block's key is where it is in the slat and its kind, so a block that becomes another kind in the same
// place is a new element, as a component would be.
export function fold(node, f, path) {

  if (Array.isArray(node)) {
    let out = node;
    for (let k = 0; k < node.length; k++) {
      const child = node[k];
      const folded = fold(child, f, path + "." + (child?.key ?? k));
      if (folded !== child) {
        if (out === node) out = node.slice();
        out[k] = folded;
      }
    }
    return out;
  }

  if (!isValidElement(node)) return node;

  // A component draws what it is given itself (once, twice or not at all), so a block inside is left to draw itself
  const def = KINDS.get(node.type);
  if (!def && typeof node.type !== "string" && node.type !== Fragment) return node;

  const props = node.props;
  const kids = props.children;
  const children = kids != null && typeof kids === "object" ? fold(kids, f, path + "/") : kids;

  if (def) {
    const v = values(def, props, f.vertical);
    const a = attrs;
    const miss = a["data-rhp-missing"];
    const at = path + def.base;
    let s = null;
    if (!f.still) {
      s = f.states?.get(at);
      // A writer from a drawing that never reached the page is made anew
      if (s === undefined || !s.drawn) s = writer(v, miss);
      f.next.set(at, s);
      f.list.push(s, v, miss);
    }
    return element(def, props, f.dir, v, a, s, children, at);
  }

  return children === kids ? node : cloneElement(node, { children });
}

// A slat's folded blocks: what the slat keeps of them, and the effect that writes them
export function useFolded(still, dir) {

  if (still) return { states: null, next: null, dir, vertical: dir === "v", still, list: null };

  const own = useRef(null);
  const states = own.current;
  const f = { states, next: new Map(), dir, vertical: dir === "v", still, list: [] };
  useLayoutEffect(() => {
    own.current = f.next;
    const list = f.list;
    for (let k = 0; k < list.length; k += 3) {
      const s = list[k];
      s.drawn = true;
      write(s, list[k + 1], list[k + 2]);
    }
  });

  return f;
}

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
  }, still, style, ref);

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
  }, still, style, ref);

  return (
    <svg {...rest} ref={w.ref} className={cls("rhp-line", className)} data-rhp-o={short(orientation)} viewBox="0 0 1000 1000"
      preserveAspectRatio="none" style={w.style}>
      <path className="rhp-under" d={under} />
      <path ref={path} className="rhp-stroke" d={line} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
