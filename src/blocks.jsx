// Blocks are the pieces a slat is built from. Each block writes its raw numbers as CSS variables (--rhp-from, --rhp-to,
// --rhp-at, --rhp-value) and the CSS turns them into positions using the scale (--rhp-min, --rhp-max) set on the Chart.
// Blocks also take class, style, ref, children and any other attribute or handler, like a plain element.
import { createMemo, createRenderEffect, splitProps } from "solid-js";
import { insert, style } from "solid-js/web";
import { isServer } from "./env.js";
import { useOrientation, short } from "./plot.jsx";
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
export const Dot = block("rhp-dot", ["at", "size", "across", "color"], (p) => ({
  "--rhp-at": p.at,
  "--rhp-size": length(p.size),
  "--rhp-across": p.across,
  "--rhp-color": tok(p.color),
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
// edge="start" or "end" puts it outside the track, in the chart's gutter (names, totals).
const LABEL = new Set([...MINE, "at", "side", "edge"]);
export const Label = (props) => blockElement(props, LABEL, "rhp-label", () => ({ "--rhp-at": props.at }), () => ({
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
