// Blocks: the pieces a slat is built from. Each one writes raw numbers as CSS variables
// (--rhp-from, --rhp-to, --rhp-at, --rhp-value) and CSS turns them into positions with the scale (--rhp-min, --rhp-max)
// set once on the Chart. A scale change is one write, not one per block.
// Every block reads the orientation of the Plot it is in, and takes class, style (an object),
// ref, children and any other attribute or handler (title, onClick, aria-*) like a plain element.
import { createMemo, createRenderEffect, splitProps } from "solid-js";
import { insert, style } from "solid-js/web";
import { isServer } from "./env.js";
import { useOrientation, short } from "./plot.jsx";
import { write } from "./frame.js";

const cls = (base, c) => (c ? base + " " + c : base);
// A color is a theme key ("series-2", "positive", "muted"…) or a literal CSS color. A slat that reads
// a page's CSS variable would look different in every app, so that gets a warning.
const KEY = /^(series-\d+|positive|negative|ink|muted|grid|surface|low|high)$/;
export const tok = (c) => {
  if (typeof c !== "string") return c;
  if (KEY.test(c)) return "var(--rhp-" + c + ")";
  if (/var\(--(?!rhp-)/.test(c)) console.warn("rhp: " + c + " reads a page variable; use a theme key");
  return c;
};
const length = (v) => (typeof v === "number" ? v * 100 + "%" : v); // 0.6 → "60%"; "2px" stays

// An effect that writes an element's variables, and only the ones that changed: the first ones now, later ones in the
// next frame (frame.js). back(v), for a Bar: whether it runs backward. The Chart's scale, an Area's span, and a block
// with props of its own kind; other blocks do this in blockElement.
export function writeVars(el, vars, back) {
  if (isServer) return; // a server writes them into the element's style (withVars)
  createRenderEffect((prev) => {
    const v = vars();
    for (const k in v) if (v[k] !== prev?.[k]) prev ? write(el, k, v[k]) : v[k] != null && el.style.setProperty(k, v[k]);
    if (back) el.toggleAttribute("data-rhp-back", back(v));
    return v;
  });
}

// On a server, an element's style attribute: its style prop (an object or a string) and its variables, which the browser
// then keeps writing. A variable that is null or undefined is left out, as writeVars leaves it unset.
export function withVars(st, vars) {
  let css = typeof st === "string" ? st : "";
  if (st && typeof st === "object") for (const k in st) if (st[k] != null) css += (css && !css.endsWith(";") ? ";" : "") + k + ":" + st[k];
  for (const k in vars) if (vars[k] != null) css += (css && !css.endsWith(";") ? ";" : "") + k + ":" + vars[k];
  return css || undefined;
}

// Whether a block got props beyond its own (onClick, title, data-*…), which then go onto its element.
// Most blocks get none, and skip Solid's spread, which cost a third of a chart's script time.
const others = (props, mine) => { for (const k in props) if (!mine.has(k)) return true; return false; };
const MINE = ["class", "style", "ref", "children"];

// A block's element, and one effect for all that changes on it: its class, orientation, attributes, style prop and
// variables (the first ones now, later ones in the next frame, frame.js). One effect instead of one for the attributes
// and one for the variables: a chart of 1,000 rows holds 3,000 fewer computations.
// attrs(): its own attributes (a Label's edge and side). back(v): true when it runs backward along the value axis
// (a Bar whose `to` is below its `from`), so its end is on the scale's start side.
function browserBlock(props, mine, base, vars, attrs, back) {
  const o = useOrientation();
  if (others(props, mine)) {
    // Props of its own kind (onClick, title, classList, use:…): Solid spreads them, and sets the class, direction and
    // style with them. The class comes first, so a classList after it adds to it instead of being overwritten.
    const el = (
      <div class={cls(base, props.class)} data-rhp-o={short(o())} {...splitProps(props, [...mine])[1]} ref={(e) => props.ref?.(e)}
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
    const c = cls(base, props.class), dir = short(o()), st = props.style, a = attrs?.(), v = vars();
    if (c !== prev?.c) el.setAttribute("class", c);
    if (dir !== prev?.dir) el.setAttribute("data-rhp-o", dir);
    for (const k in a) if (a[k] !== prev?.a[k]) a[k] == null ? el.removeAttribute(k) : el.setAttribute(k, a[k]);
    if (st !== prev?.st) style(el, st, prev?.st);
    for (const k in v) if (v[k] !== prev?.v[k]) prev ? write(el, k, v[k]) : v[k] != null && el.style.setProperty(k, v[k]);
    if (back) el.toggleAttribute("data-rhp-back", back(v));
    return { c, dir, a, st, v };
  });
  props.ref?.(el);
  return el;
}

// On a server: the element as the browser will first draw it, from the values of now.
function serverBlock(props, mine, base, vars, attrs, back) {
  const o = useOrientation(), v = vars(), css = withVars(props.style, v);
  return (
    <div {...(others(props, mine) ? splitProps(props, [...mine])[1] : {})} class={cls(base, props.class)} data-rhp-o={short(o())}
      {...(attrs ? attrs() : {})} data-rhp-back={back?.(v) ? "" : undefined} {...(css ? { style: css } : {})}>
      {props.children}
    </div>
  );
}
// Each build keeps the one for its side (isServer is a constant there).
const blockElement = isServer ? serverBlock : browserBlock;

function block(base, own, vars, back) {
  const mine = new Set([...MINE, ...own]);
  return (props) => blockElement(props, mine, base, () => vars(props), null, back);
}

/**
 * A span along the value axis from `from` (default 0) to `to`: bars, boxes, whiskers, stems, Gantt tasks.
 * `thick` is its size across the band: a CSS length ("2px") or a fraction of the band (0.6).
 * Without it the bar fills the band less --rhp-inset on each side.
 */
export const Bar = block("rhp-bar", ["from", "to", "thick", "color"], (p) => ({
  "--rhp-from": p.from ?? 0, "--rhp-to": p.to ?? 0, "--rhp-thick": length(p.thick), "--rhp-color": tok(p.color),
}), (v) => v["--rhp-to"] < v["--rhp-from"]);

/** A round point at value `at`. `size` is its diameter (default 10px); `across` places it across the band, 0..1 (default 0.5). */
export const Dot = block("rhp-dot", ["at", "size", "across", "color"], (p) => ({
  "--rhp-at": p.at, "--rhp-size": length(p.size), "--rhp-across": p.across, "--rhp-color": tok(p.color),
}));

/** A short line across the band at value `at`: medians, targets. `thick` is its length across the band. */
export const Tick = block("rhp-tick", ["at", "thick", "color"], (p) => ({ "--rhp-at": p.at, "--rhp-thick": length(p.thick), "--rhp-color": tok(p.color) }));

/** A cell that fills its slat, colored by `value` on the scale (--rhp-low at --rhp-min, --rhp-high at --rhp-max). `color` overrides it. Heatmaps. */
export const Cell = block("rhp-cell", ["value", "color"], (p) => ({ "--rhp-value": p.value, "--rhp-color": tok(p.color) }));

/**
 * Text placed on the value axis.
 * at={v}: just after the value v; side="before" puts it just before (inside a bar's end, or on the left of a negative bar).
 * edge="start" | "end": outside the track, in the chart's gutter (category names, totals).
 */
const LABEL = new Set([...MINE, "at", "side", "edge"]);
export const Label = (props) => blockElement(props, LABEL, "rhp-label", () => ({ "--rhp-at": props.at }),
  () => ({ "data-rhp-edge": props.edge, "data-rhp-side": props.side, "data-rhp-at": props.edge == null ? "" : undefined }));

/**
 * A filled shape over the value axis from `points`, a list of [x, y] sorted by x (x on the scale, y >= 0).
 * y is drawn across the band, scaled so that `peak` (default the largest y) fills it.
 * mirror: drawn both ways from the band's middle (violins). Otherwise it grows from the band's edge (ridgelines).
 * The path is in the shape's own box and CSS places that box from the first x to the last,
 * so a scale change moves the box and never rewrites the path.
 */
export function Area(props) {
  const o = useOrientation();
  const [p, rest] = splitProps(props, ["class", "style", "ref", "points", "peak", "mirror", "color"]);
  const span = createMemo(() => {
    const pts = p.points ?? [];
    return pts.length ? [pts[0][0], pts[pts.length - 1][0]] : [0, 0];
  });
  const path = createMemo(() => {
    const pts = p.points ?? [];
    if (pts.length < 2) return "";
    const [x0, x1] = span(), w = x1 - x0 || 1;
    const peak = p.peak ?? Math.max(...pts.map((q) => q[1]));
    const vertical = o() === "vertical";
    // u runs along the value axis, t across the band; both 0..1000 in the shape's own box.
    const xy = (u, t) => (vertical ? `${(1000 - t).toFixed(1)},${(1000 - u).toFixed(1)}` : `${u.toFixed(1)},${t.toFixed(1)}`);
    const ut = pts.map(([x, y]) => [((x - x0) / w) * 1000, Math.min(1, y / (peak || 1))]);
    const line = p.mirror
      ? [...ut.map(([u, y]) => xy(u, 500 - y * 500)), ...ut.slice().reverse().map(([u, y]) => xy(u, 500 + y * 500))]
      : [xy(ut[0][0], 1000), ...ut.map(([u, y]) => xy(u, 1000 - y * 1000)), xy(ut[ut.length - 1][0], 1000)];
    return "M" + line.join("L") + "Z";
  });
  // the path is also given as CSS (d: var(--rhp-d)), so a page's "all: revert" / "all: unset" can't drop the attribute's shape
  const vars = () => ({ "--rhp-from": span()[0], "--rhp-to": span()[1], "--rhp-color": tok(p.color), "--rhp-d": path() ? `path("${path()}")` : undefined });
  let el;
  const node = (
    <svg {...rest} ref={(e) => { el = e; p.ref?.(e); }} class={cls("rhp-area", p.class)} data-rhp-o={short(o())}
      viewBox="0 0 1000 1000" preserveAspectRatio="none" style={isServer ? withVars(p.style, vars()) : p.style}>
      <path d={path()} vector-effect="non-scaling-stroke" />
    </svg>
  );
  writeVars(el, vars);
  return node;
}
