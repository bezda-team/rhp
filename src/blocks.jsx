// Blocks: the pieces a slat is built from. Each one writes raw numbers as CSS variables
// (--rhp-from, --rhp-to, --rhp-at, --rhp-value) and CSS turns them into positions with the scale (--rhp-min, --rhp-max)
// set once on the Chart. A scale change is one write, not one per block.
// Every block reads the orientation of the Plot it is in, and takes class, style (an object),
// ref, children and any other attribute or handler (title, onClick, aria-*) like a plain element.
import { createMemo, createRenderEffect, splitProps } from "solid-js";
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

// One effect per block writes its variables, and only the ones that changed: the first ones now, later ones in the next frame (frame.js).
// then(v) runs after, with the same values: a block can set an attribute from them without reading its props again.
export function writeVars(el, vars, then) {
  createRenderEffect((prev) => {
    const v = vars();
    for (const k in v) if (v[k] !== prev?.[k]) prev ? write(el, k, v[k]) : v[k] != null && el.style.setProperty(k, v[k]);
    then?.(v);
    return v;
  });
}

// back(v): true when the block runs backward along the value axis (a Bar whose `to` is below its `from`), so its end is on the scale's start side.
function block(base, own, vars, back) {
  const keys = ["class", "style", "ref", "children", ...own];
  return (props) => {
    const o = useOrientation();
    const [p, rest] = splitProps(props, keys);
    let el;
    const node = (
      <div {...rest} ref={(e) => { el = e; p.ref?.(e); }} class={cls(base, p.class)} data-rhp-o={short(o())} style={p.style}>
        {p.children}
      </div>
    );
    writeVars(el, () => vars(p), back && ((v) => el.toggleAttribute("data-rhp-back", back(v))));
    return node;
  };
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
export function Label(props) {
  const o = useOrientation();
  const [p, rest] = splitProps(props, ["class", "style", "ref", "children", "at", "side", "edge"]);
  let el;
  const node = (
    <div {...rest} ref={(e) => { el = e; p.ref?.(e); }} class={cls("rhp-label", p.class)} data-rhp-o={short(o())}
      data-rhp-edge={p.edge} data-rhp-side={p.side} data-rhp-at={p.edge == null ? "" : undefined} style={p.style}>
      {p.children}
    </div>
  );
  writeVars(el, () => ({ "--rhp-at": p.at }));
  return node;
}

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
  let el;
  const node = (
    <svg {...rest} ref={(e) => { el = e; p.ref?.(e); }} class={cls("rhp-area", p.class)} data-rhp-o={short(o())}
      viewBox="0 0 1000 1000" preserveAspectRatio="none" style={p.style}>
      <path d={path()} vector-effect="non-scaling-stroke" />
    </svg>
  );
  // the path is also given as CSS (d: var(--rhp-d)), so a page's "all: revert" / "all: unset" can't drop the attribute's shape
  writeVars(el, () => ({ "--rhp-from": span()[0], "--rhp-to": span()[1], "--rhp-color": tok(p.color), "--rhp-d": path() ? `path("${path()}")` : undefined }));
  return node;
}
