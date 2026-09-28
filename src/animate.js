// The JS version of animation: numbers move to their new values over time, and everything drawn from them reads the
// same in-between value in the same frame.
import { createSignal, untrack } from "solid-js";
import { drawing } from "./frame.js";

// CSS timing curves (cubic-bezier), solved for x, so JS and CSS can use the same curve
export const bezier = (x1, y1, x2, y2) => {

  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const curveX = (t) => ((ax * t + bx) * t + cx) * t;
  const curveY = (t) => ((ay * t + by) * t + cy) * t;

  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    let lo = 0;
    let hi = 1;
    let t = x;

    for (let i = 0; i < 24; i++) {
      if (curveX(t) < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }

    return curveY(t);
  };
};

export const easeInOut = bezier(0.42, 0, 0.58, 1); // v1's curve
export const easeOut = bezier(0, 0, 0.58, 1);
const NAMED = {
  linear: (x) => x,
  ease: bezier(0.25, 0.1, 0.25, 1),
  "ease-in": bezier(0.42, 0, 1, 1),
  "ease-out": easeOut,
  "ease-in-out": easeInOut,
};

// Both versions move a value over 150ms with ease-out by default (the CSS version's defaults are in rhp.css)
export const MOVE_MS = 150;

// A timing curve from a CSS name ("ease-out"), cubic-bezier numbers ([x1, y1, x2, y2]) or a function of 0..1
export const curve = (c) => {

  if (typeof c === "function") return c;
  if (Array.isArray(c)) return bezier(...c);
  if (c != null && !NAMED[c]) console.warn(`rhp: unknown ease "${c}", using ease-out`);

  return NAMED[c] ?? easeOut;
};

// The same curve as a CSS timing function (undefined for a JS function, which CSS can't express)
export const cssCurve = (c) => (Array.isArray(c) ? `cubic-bezier(${c.join(",")})` : typeof c === "string" ? c : undefined);

const reduce = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };

// One clock for the whole page: a signal that is set once per frame, and only while something is moving
const [clock, setClock] = createSignal(0);
let frameAt = 0;
let endAt = 0;
let raf = 0;
let frameCount = 0;
const waiting = [];

function tick(t) {

  frameAt = t;
  frameCount++;
  drawing(() => setClock(t)); // we are already in a frame, so what the clock moves is written now

  if (t < endAt) {
    raf = requestAnimationFrame(tick);
  } else {
    raf = 0;
    waiting.splice(0).forEach((f) => f());
  }
}

const runUntil = (t) => {

  endAt = Math.max(endAt, t);
  if (!raf) raf = requestAnimationFrame(tick);
};

// Calls f once nothing is moving (right away if nothing is)
export const whenStill = (f) => {

  if (raf) return waiting.push(f);

  return f();
};

// How many frames the clock has drawn so far (the playground's frame counter uses it)
export const framesDrawn = () => frameCount;

// What can move: finite numbers, and arrays or plain objects of them (a box's numbers, a list of segments).
// Anything else, or a list whose length changed, jumps to its new value.
const plain = (v) => v !== null && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;

const movable = (v) => {

  if (typeof v === "number") return Number.isFinite(v);

  return Array.isArray(v) || plain(v);
};

// b - a, part by part. Undefined for a part that can't move, and for the whole value when its shape changed.
function diff(b, a) {

  if (typeof b === "number") {
    if (typeof a === "number" && Number.isFinite(a) && Number.isFinite(b)) return b - a;
    return undefined;
  }

  if (Array.isArray(b)) {
    if (Array.isArray(a) && a.length === b.length) return b.map((v, i) => diff(v, a[i]));
    return undefined;
  }

  if (plain(b)) {
    if (!plain(a)) return undefined;
    const out = {};
    for (const key in b) {
      out[key] = diff(b[key], a[key]);
    }
    return out;
  }

  return undefined;
}

// v - d * k, part by part (a part with no difference stays as it is)
function less(v, d, k) {

  if (d === undefined) return v;
  if (typeof v === "number") return v - d * k;
  if (Array.isArray(v)) return v.map((x, i) => less(x, d[i], k));

  if (plain(v)) {
    const out = {};
    for (const key in v) {
      out[key] = less(v[key], d[key], k);
    }
    return out;
  }

  return v;
}

function same(a, b) {

  if (a === b) return true;
  if (Array.isArray(b)) return Array.isArray(a) && a.length === b.length && b.every((v, i) => same(a[i], v));

  if (plain(b)) {
    const keys = Object.keys(b);
    return plain(a) && Object.keys(a).length === keys.length && keys.every((key) => same(a[key], b[key]));
  }

  return false;
}

// A copy, so that a value changed in place (a store) is still seen as a change
const snapshot = (v) => {

  if (Array.isArray(v)) return v.map(snapshot);
  if (plain(v)) return Object.fromEntries(Object.entries(v).map(([key, x]) => [key, snapshot(x)]));

  return v;
};

// Wraps a reactive value so that it moves to each new value over time instead of jumping.
// settings() gives { duration, ease } and is read (untracked) each time the value changes.
// The returned reader gives the value to draw in this frame, or with reader(ms), the value ms from now.
// NOTE: Each change is a move of its own difference, and the value drawn is the latest value minus what is left of every
// move under way. So a change in the middle of a move adds to the motion instead of restarting it, and a slider that is
// dragged steadily moves a bar steadily. The value still ends exactly on the latest one.
export function animated(read, settings = () => ({})) {

  let to;
  let moves = []; // { d (the difference), start, dur, ease }
  let shown;
  let seenAt = -1;

  return (ahead = 0) => {
    const v = read();
    if (!movable(v) || reduce.matches) return v;

    if (to === undefined || !same(to, v)) {
      // The value changed: add a move of the difference (the first value, or a new shape, jumps)
      const target = snapshot(v);
      const d = to === undefined ? undefined : diff(target, to);
      if (d === undefined) {
        moves = [];
      } else {
        const s = untrack(settings);
        const start = performance.now();
        const dur = Math.max(1, s.duration ?? MOVE_MS);
        moves.push({ d, start, dur, ease: s.ease ?? easeOut });
        runUntil(start + dur);
      }
      to = target;
    }

    if (!moves.length) return to;

    const end = moves.reduce((e, m) => Math.max(e, m.start + m.dur), 0);
    if (frameAt + ahead >= end) {
      // Done moving, so there is no need to read the clock
      if (!ahead) moves = [];
      return to;
    }

    const c = clock();
    if (!ahead && seenAt === c) return shown; // already worked out for this frame

    let x = to;
    for (const m of moves) {
      const p = (c + ahead - m.start) / m.dur;
      if (p < 1) x = less(x, m.d, 1 - m.ease(Math.max(0, p)));
    }

    if (!ahead) {
      seenAt = c;
      shown = x;
      moves = moves.filter((m) => c < m.start + m.dur);
    }

    return x;
  };
}
