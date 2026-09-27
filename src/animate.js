// The JS version of animation: numbers move to their new value over time,
// and everything drawn from them reads the same in-between value in the same frame.
import { createSignal, untrack } from "solid-js";
import { drawing } from "./frame.js";

// CSS timing curves, solved for x, so JS and CSS can share a curve.
export const bezier = (x1, y1, x2, y2) => {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 24; i++) { X(t) < x ? (lo = t) : (hi = t); t = (lo + hi) / 2; }
    return Y(t);
  };
};
export const easeInOut = bezier(0.42, 0, 0.58, 1); // v1's curve
export const easeOut = bezier(0, 0, 0.58, 1);
const NAMED = { linear: (x) => x, ease: bezier(0.25, 0.1, 0.25, 1), "ease-in": bezier(0.42, 0, 1, 1), "ease-out": easeOut, "ease-in-out": easeInOut };
// How a value moves by default, in either version: the CSS version transitions lengths and positions over
// .15s ease-out (rhp.css, --rhp-length-time and --rhp-length-ease), and the JS version takes the same time and curve.
export const MOVE_MS = 150;
/** A timing curve from a CSS name ("ease-out"), cubic-bezier numbers ([x1, y1, x2, y2]) or a function of 0..1. Default: ease-out. */
export const curve = (c) => {
  if (typeof c === "function") return c;
  if (Array.isArray(c)) return bezier(...c);
  if (c != null && !NAMED[c]) console.warn(`rhp: unknown ease "${c}", using ease-out`);
  return NAMED[c] ?? easeOut;
};
/** The same curve as a CSS timing function, or undefined when CSS can't express it (a JS function). */
export const cssCurve = (c) => (Array.isArray(c) ? `cubic-bezier(${c.join(",")})` : typeof c === "string" ? c : undefined);

const reduce = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };

// One clock for the whole page: one signal, set once per frame, and only while something is moving.
const [clock, setClock] = createSignal(0);
let frameAt = 0, endAt = 0, raf = 0, frameCount = 0;
const waiting = [];
function tick(t) {
  frameAt = t;
  frameCount++;
  drawing(() => setClock(t)); // already in a frame: what the clock moves is written now
  if (t < endAt) raf = requestAnimationFrame(tick);
  else { raf = 0; waiting.splice(0).forEach((f) => f()); }
}
const runUntil = (t) => {
  endAt = Math.max(endAt, t);
  if (!raf) raf = requestAnimationFrame(tick);
};
/** Calls f once nothing is moving (right away if nothing is). */
export const whenStill = (f) => (raf ? waiting.push(f) : f());
/** Frames drawn by the clock so far; the playground's counter uses it. */
export const framesDrawn = () => frameCount;

// What can move: finite numbers, and arrays or plain objects holding them (a box's five numbers,
// a list of segment values). Numbers inside move; anything else, or a list whose length changed, jumps.
const plain = (v) => v !== null && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
const movable = (v) => (typeof v === "number" ? Number.isFinite(v) : Array.isArray(v) || plain(v));
// b − a, part by part: undefined where a part can't move (not a finite number both times), and for the whole
// value when its shape changed (a list's length, an object's kind), which then jumps.
function diff(b, a) {
  if (typeof b === "number") return typeof a === "number" && Number.isFinite(a) && Number.isFinite(b) ? b - a : undefined;
  if (Array.isArray(b)) return Array.isArray(a) && a.length === b.length ? b.map((v, i) => diff(v, a[i])) : undefined;
  if (plain(b)) { if (!plain(a)) return undefined; const o = {}; for (const k in b) o[k] = diff(b[k], a[k]); return o; }
  return undefined;
}
// v − d × k, part by part; a part with no difference stays as it is.
function less(v, d, k) {
  if (d === undefined) return v;
  if (typeof v === "number") return v - d * k;
  if (Array.isArray(v)) return v.map((x, i) => less(x, d[i], k));
  if (plain(v)) { const o = {}; for (const key in v) o[key] = less(v[key], d[key], k); return o; }
  return v;
}
function same(a, b) {
  if (a === b) return true;
  if (Array.isArray(b)) return Array.isArray(a) && a.length === b.length && b.every((v, i) => same(a[i], v));
  if (plain(b)) { const k = Object.keys(b); return plain(a) && Object.keys(a).length === k.length && k.every((x) => same(a[x], b[x])); }
  return false;
}
// A copy, so a value changed in place (a store) is still seen as a change.
const snapshot = (v) => (Array.isArray(v) ? v.map(snapshot) : plain(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, snapshot(x)])) : v);

/**
 * Wraps a reactive value so that it moves to each new value over time instead of jumping.
 * `settings()` returns { duration (ms, default MOVE_MS: 150), ease (a function of 0..1, default ease-out) }, the CSS version's timing;
 * it is read, untracked, each time the value changes.
 * Returns a reader: reader() is the value to draw in this frame; reader(ms) is the value `ms` from now.
 * State is plain variables, not signals. While still, a reader does not depend on the clock.
 *
 * Moves add up: each change is a move of its own difference, eased from 0 to 1 over its own duration, and the
 * value drawn is the latest value less what is left of every move under way. A change in the middle of a move
 * adds to the motion instead of restarting it from rest, so the speed carries on (a slider dragged steadily
 * moves a bar steadily, where restarting an ease-in-out at every step made it pulse), and the value still ends
 * exactly on the latest one. Reading ahead (the order) sees the same smooth path, with no step back at a change.
 */
export function animated(read, settings = () => ({})) {
  let to, moves = [], shown, seenAt = -1; // moves: { d (the difference), start, dur, ease }
  return (ahead = 0) => {
    const v = read(); // an ordinary reactive read of the real value
    if (!movable(v) || reduce.matches) return v; // only numbers move; reduced motion jumps
    if (to === undefined || !same(to, v)) {
      // The real value changed: add a move of the difference (the first value, or a new shape, jumps).
      const target = snapshot(v), d = to === undefined ? undefined : diff(target, to);
      if (d === undefined) moves = [];
      else {
        const s = untrack(settings), start = performance.now(), dur = Math.max(1, s.duration ?? MOVE_MS);
        moves.push({ d, start, dur, ease: s.ease ?? easeOut });
        runUntil(start + dur);
      }
      to = target;
    }
    if (!moves.length) return to;
    const end = moves.reduce((e, m) => Math.max(e, m.start + m.dur), 0);
    if (frameAt + ahead >= end) { if (!ahead) moves = []; return to; } // done: no clock read
    const c = clock();
    if (!ahead && seenAt === c) return shown; // already worked out for this frame
    let x = to;
    for (const m of moves) {
      const p = (c + ahead - m.start) / m.dur;
      if (p < 1) x = less(x, m.d, 1 - m.ease(Math.max(0, p)));
    }
    if (!ahead) { seenAt = c; shown = x; moves = moves.filter((m) => c < m.start + m.dur); }
    return x;
  };
}
