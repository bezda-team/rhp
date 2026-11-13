// The JS version in React: numbers move to their new values over time, and everything drawn from them reads the same
// in-between value in the same frame.
// NOTE: One clock runs for the whole page, and only while something moves. In each frame it draws what rhp moves itself
// (a Chart's scale), then has React draw the components whose values move, at once (flushSync), with rhp's style
// writes going straight to the elements (drawing): what a frame moves is in that frame.
import { flushSync } from "react-dom";
import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { drawing } from "../../src/frame.js";
import { MOVE_MS, easeOut, reduce, movable, diff, less, same, snapshot, curve } from "../../src/motion.js";

let frameAt = 0;
let endAt = 0;
let raf = 0;
let frameCount = 0;
const waiting = [];
const drawers = new Set(); // what rhp draws itself in each frame, f(t)
const readers = new Set(); // the tickers of the components that read moving values

function tick(t) {

  frameAt = t;
  frameCount++;

  try {
    drawing(() => {
      for (const f of drawers) {
        f(t);
      }
      flushSync(() => {
        for (const f of readers) {
          f();
        }
      });
    });
  } finally {
    if (t < endAt) {
      raf = requestAnimationFrame(tick);
    } else {
      raf = 0;
      waiting.splice(0).forEach((f) => f());
    }
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

// How many frames the clock has drawn so far
export const framesDrawn = () => frameCount;

// Draws f(t) in every frame while it is registered (it registers again after a move ends)
export const drawEachFrame = (f) => {

  drawers.add(f);

  return () => drawers.delete(f);
};

// A component's ticker: its version changes in each frame where one of its values moves, and once more in the frame
// after they all stop, so React draws the component in those frames and in no other. moving(end) tells it a move runs
// until end.
export function ticker() {

  const t = {
    version: 0,
    until: 0,
    settled: true,
    moving(end) {
      t.until = Math.max(t.until, end);
      t.settled = false;
    },
    subscribe(changed) {
      const read = () => {
        if (frameAt < t.until) {
          t.version++;
          changed();
        } else if (!t.settled) {
          t.settled = true;
          t.version++;
          changed();
        }
      };
      readers.add(read);
      return () => readers.delete(read);
    },
    read: () => t.version,
  };

  return t;
}

// A value that moves to each new value over time instead of jumping. move(v) gives the value to draw in this frame when
// the latest value is v, or with move(v, ms), the value ms from now; move.commit(v) starts the move to v once the
// drawing that has v is in the page. settings() gives { duration, ease } and is read when a move starts, and
// moving(end) hears of each move it starts. move.active says whether the value drawn is between two values.
// NOTE: Drawing only reads (React may draw and throw a drawing away, or draw twice): a value the page doesn't have yet is
// drawn where it is now, as a move that starts now would draw it, and its move starts when React commits it.
// NOTE: Each change is a move of its own difference, and the value drawn is the latest value minus what is left of every
// move under way. So a change in the middle of a move adds to the motion instead of restarting it, and a slider that is
// dragged steadily moves a bar steadily. The value still ends exactly on the latest one.
export function mover(settings, moving) {

  let to;
  let moves = []; // { d (the difference), start, dur, ease }
  let shown;
  let seenAt = -1;

  // The value at time t of `base` with the moves under way (and one about to start)
  const at = (base, t, extra) => {
    let x = base;
    for (const m of moves) {
      const p = (t - m.start) / m.dur;
      if (p < 1) x = less(x, m.d, 1 - m.ease(Math.max(0, p)));
    }
    if (extra) x = less(x, extra.d, 1 - extra.ease(Math.max(0, (t - extra.start) / extra.dur)));
    return x;
  };

  const move = (v, ahead = 0) => {
    if (!ahead) move.active = false;
    // What can't move, and the first value, is drawn as it is
    if (!movable(v) || reduce.matches || to === undefined) return v;

    if (!same(to, v)) {
      // A value the page doesn't have yet: a move that would start now (a new shape jumps)
      const d = diff(v, to);
      if (d === undefined) return v;
      const s = settings();
      const t = frameAt + ahead;
      if (!ahead) move.active = true;
      return at(v, t, { d, start: performance.now(), dur: Math.max(1, s.duration ?? MOVE_MS), ease: s.ease ?? easeOut });
    }

    if (!moves.length) return to;

    const end = moves.reduce((e, m) => Math.max(e, m.start + m.dur), 0);
    if (frameAt + ahead >= end) return to; // done moving

    if (!ahead) {
      move.active = true;
      if (seenAt !== frameAt) {
        seenAt = frameAt;
        shown = at(to, frameAt);
      }
      return shown; // worked out once for this frame
    }

    return at(to, frameAt + ahead);
  };

  move.commit = (v) => {
    if (!movable(v) || reduce.matches) {
      // The next value jumps, so a value that was missing comes back where it is, not from where it was before
      to = undefined;
      moves = [];
      return;
    }
    if (to !== undefined && same(to, v)) return;

    // The value changed: add a move of the difference (the first value, or a new shape, jumps)
    const target = snapshot(v);
    const d = to === undefined ? undefined : diff(target, to);
    moves = moves.filter((m) => frameAt < m.start + m.dur);
    if (d === undefined) {
      moves = [];
    } else {
      const s = settings();
      const start = performance.now();
      const dur = Math.max(1, s.duration ?? MOVE_MS);
      moves.push({ d, start, dur, ease: s.ease ?? easeOut });
      runUntil(start + dur);
      moving?.(start + dur);
    }
    to = target;
    seenAt = -1;
  };

  move.active = false;

  return move;
}

// A CSS transition run on rhp's clock, for a value the browser can't transition itself (Safari has no CSS d). It follows
// CSS's rules, not mover()'s: a change starts a new transition from the value drawn now to the new one, over the whole
// duration, after the delay. A change back to where the running transition started is shortened by how far that one
// got, as CSS shortens a reversed transition. settings() is read when a transition starts and gives { duration, delay,
// ease }; with no duration, or a new shape, the value jumps. As with mover(), drawing only reads: run(v) gives the value
// to draw, and run.commit(v) starts the transition to v once the page has it.
export function transition(settings, moving) {

  let to;
  let run = null; // { to, d (to minus where it started), back (where a reversal goes), factor, start, dur, ease }

  const at = (r, t) => {
    const p = (t - r.start) / r.dur;
    return p >= 1 ? r.to : less(r.to, r.d, 1 - r.ease(Math.max(0, p)));
  };

  // What is drawn now: the running transition, or the value the page has (a new one starts from what is drawn now)
  const drawnNow = (t) => (run !== null && t < run.start + run.dur ? at(run, t) : to);

  const read = (v) => {
    if (!movable(v) || reduce.matches || to === undefined) return v;
    if (!same(to, v)) return drawnNow(frameAt) ?? v;
    return drawnNow(frameAt);
  };

  read.commit = (v) => {
    if (!movable(v) || reduce.matches) {
      to = undefined;
      run = null;
      return;
    }
    if (to !== undefined && same(to, v)) return;

    const target = snapshot(v);
    const now = performance.now();
    const running = run !== null && now < run.start + run.dur;
    const from = running ? at(run, now) : to;
    const d = from === undefined ? undefined : diff(target, from);
    const s = d === undefined ? undefined : settings();

    const reversed = running && s !== undefined && same(run.back, target);
    const factor = reversed ? Math.min(1, Math.abs(run.ease(Math.max(0, (now - run.start) / run.dur)) * run.factor + 1 - run.factor)) : 1;
    const dur = (s?.duration ?? 0) * factor;

    if (!(dur > 0)) {
      run = null;
    } else {
      const delay = s.delay ?? 0;
      run = { to: target, d, back: reversed ? run.to : from, factor, start: now + (delay < 0 ? delay * factor : delay), dur, ease: s.ease ?? easeOut };
      runUntil(run.start + dur);
      moving?.(run.start + dur);
    }
    to = target;
  };

  return read;
}

// A timing curve, made once for each ease named or given as numbers (so an unknown name is warned about once, and a
// component drawn in every frame makes no new curve)
const curves = new Map();
export const curveOf = (ease) => {

  if (ease == null || typeof ease === "function") return curve(ease);

  const key = Array.isArray(ease) ? ease.join(",") : ease;
  let c = curves.get(key);
  if (!c) curves.set(key, (c = curve(ease)));

  return c;
};

// A value of the app's own that moves like rhp's JS version: the component is drawn in each frame of the move and gets
// the value for that frame. (Labels that follow a shape the app draws itself take their spot from the same numbers.)
export function useAnimated(value, timing) {

  const ref = useRef(null);

  if (ref.current === null) {
    const t = ticker();
    const own = { timing, t, move: null };
    own.move = mover(() => ({ duration: own.timing?.duration, ease: curveOf(own.timing?.ease) }), t.moving);
    ref.current = own;
  }

  const own = ref.current;
  own.timing = timing;
  useSyncExternalStore(own.t.subscribe, own.t.read, own.t.read);
  useLayoutEffect(() => own.move.commit(value));

  return own.move(value);
}
