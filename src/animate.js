// The JS version of animation: numbers move to their new value over time,
// and everything drawn from them reads the same in-between value in the same frame.
import { createSignal, untrack } from "solid-js";

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
const NAMED = { linear: (x) => x, ease: bezier(0.25, 0.1, 0.25, 1), "ease-in": bezier(0.42, 0, 1, 1), "ease-out": bezier(0, 0, 0.58, 1), "ease-in-out": easeInOut };
/** A timing curve from a CSS name ("ease-out"), cubic-bezier numbers ([x1, y1, x2, y2]) or a function of 0..1. */
export const curve = (c) => {
  if (typeof c === "function") return c;
  if (Array.isArray(c)) return bezier(...c);
  if (c != null && !NAMED[c]) console.warn(`rhp: unknown ease "${c}", using ease-in-out`);
  return NAMED[c] ?? easeInOut;
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
  setClock(t);
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
function lerp(a, b, t) {
  if (typeof b === "number") return typeof a === "number" && Number.isFinite(a) && Number.isFinite(b) ? a + (b - a) * t : b;
  if (Array.isArray(b)) return Array.isArray(a) && a.length === b.length ? b.map((v, i) => lerp(a[i], v, t)) : b;
  if (plain(b)) { if (!plain(a)) return b; const o = {}; for (const k in b) o[k] = lerp(a[k], b[k], t); return o; }
  return b;
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
 * `settings()` returns { duration (ms, default 400), ease (a function of 0..1, default ease-in-out) };
 * it is read, untracked, each time a move starts.
 * Returns a reader: reader() is the value to draw in this frame; reader(ms) is the value `ms` from now.
 * State is plain variables, not signals. While still, a reader does not depend on the clock.
 */
export function animated(read, settings = () => ({})) {
  let from, to, start = -Infinity, dur = 1, ease = easeInOut, shown, seenAt = -1;
  return (ahead = 0) => {
    const v = read(); // an ordinary reactive read of the real value
    if (!movable(v) || reduce.matches) return v; // only numbers move; reduced motion jumps
    if (to === undefined || !same(to, v)) {
      // The real value changed: start moving from what is on screen now.
      const target = snapshot(v);
      if (shown === undefined) shown = target;
      else {
        from = shown; start = performance.now();
        const s = untrack(settings);
        dur = Math.max(1, s.duration ?? 400);
        ease = s.ease ?? easeInOut;
        runUntil(start + dur);
      }
      to = target;
    }
    if (frameAt + ahead >= start + dur) return ahead ? to : (shown = to); // done: no clock read
    const c = clock();
    if (!ahead && seenAt === c) return shown; // already worked out for this frame
    const p = Math.min(1, Math.max(0, (c + ahead - start) / dur));
    const x = lerp(from, to, ease(p));
    if (!ahead) { seenAt = c; shown = x; }
    return x;
  };
}
