// The math of the JS version, shared by rhp's Solid and React versions: timing curves, and moving a value part by
// part (numbers, and lists or plain objects of them).
import { missing } from "./data.js";

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

// A computed CSS timing function as a curve: a name or cubic-bezier(), and anything else (steps, linear()) as linear
export const cssEase = (s) => {

  const m = /^cubic-bezier\(([^)]*)\)$/.exec(s);
  if (m) return bezier(...m[1].split(",").map(Number));

  return NAMED[s] ?? NAMED.linear;
};

export const reduce = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };

// What can move: finite numbers, and arrays or plain objects of them (a box's numbers, a list of segments).
// Anything else, or a list whose length changed or where a value went missing or came back, jumps to its new value.
export const plain = (v) => v !== null && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;

export const movable = (v) => {

  if (typeof v === "number") return Number.isFinite(v);

  return Array.isArray(v) || plain(v);
};

// b - a, part by part. Undefined for a part that can't move, and for the whole value when its shape changed.
export function diff(b, a) {

  if (typeof b === "number") {
    if (typeof a === "number" && Number.isFinite(a) && Number.isFinite(b)) return b - a;
    return undefined;
  }

  if (Array.isArray(b)) {
    // A gap that opens or closes changes what is drawn (an outline in pieces), as a new length does
    if (Array.isArray(a) && a.length === b.length && b.every((v, i) => missing(v) === missing(a[i]))) return b.map((v, i) => diff(v, a[i]));
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
export function less(v, d, k) {

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

export function same(a, b) {

  if (a === b) return true;
  if (Array.isArray(b)) return Array.isArray(a) && a.length === b.length && b.every((v, i) => same(a[i], v));

  if (plain(b)) {
    const keys = Object.keys(b);
    return plain(a) && Object.keys(a).length === keys.length && keys.every((key) => same(a[key], b[key]));
  }

  return false;
}

// A copy, so that a value changed in place (a store) is still seen as a change
export const snapshot = (v) => {

  if (Array.isArray(v)) return v.map(snapshot);
  if (plain(v)) return Object.fromEntries(Object.entries(v).map(([key, x]) => [key, snapshot(x)]));

  return v;
};
