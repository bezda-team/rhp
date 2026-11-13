// The JS version of animation: numbers move to their new values over time, and everything drawn from them reads the
// same in-between value in the same frame.
import { createSignal, untrack } from "solid-js";
import { drawing } from "./frame.js";
import { MOVE_MS, easeOut, reduce, movable, diff, less, same, snapshot } from "./motion.js";

export { bezier, easeInOut, easeOut, MOVE_MS, curve, cssCurve, cssEase } from "./motion.js";

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
    if (!movable(v) || reduce.matches) {
      // The next value jumps, so a value that was missing comes back where it is, not from where it was before
      to = undefined;
      moves = [];
      return v;
    }

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

// A CSS transition run on rhp's clock, for a value the browser can't transition itself (Safari has no CSS d). It follows
// CSS's rules, not animated()'s: a change starts a new transition from the value drawn now to the new one, over the
// whole duration, after the delay. A change back to where the running transition started is shortened by how far that
// one got, as CSS shortens a reversed transition. settings() is read on each change and gives { duration, delay, ease };
// with no duration, or a new shape, the value jumps.
export function transitioned(read, settings) {

  let to;
  let run = null; // { to, d (to minus where it started), back (where a reversal goes), factor, start, dur, ease }

  const at = (r, t) => {
    const p = (t - r.start) / r.dur;
    return p >= 1 ? r.to : less(r.to, r.d, 1 - r.ease(Math.max(0, p)));
  };

  return () => {
    const v = read();
    if (!movable(v) || reduce.matches) {
      to = undefined;
      run = null;
      return v;
    }

    if (to === undefined || !same(to, v)) {
      const target = snapshot(v);
      const now = performance.now();
      const running = run !== null && now < run.start + run.dur;
      const from = running ? at(run, now) : to;
      const d = from === undefined ? undefined : diff(target, from);
      const s = d === undefined ? undefined : untrack(settings);

      const reversed = running && s !== undefined && same(run.back, target);
      const factor = reversed ? Math.min(1, Math.abs(run.ease(Math.max(0, (now - run.start) / run.dur)) * run.factor + 1 - run.factor)) : 1;
      const dur = (s?.duration ?? 0) * factor;

      if (!(dur > 0)) {
        run = null;
      } else {
        const delay = s.delay ?? 0;
        run = { to: target, d, back: reversed ? run.to : from, factor, start: now + (delay < 0 ? delay * factor : delay), dur, ease: s.ease ?? easeOut };
        runUntil(run.start + dur);
      }
      to = target;
    }

    if (run === null) return to;
    if (frameAt >= run.start + run.dur) {
      run = null;
      return to;
    }

    return at(run, clock());
  };
}
