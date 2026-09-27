// When a chart's CSS variables change. A new element gets its variables at once. After that, a change is written in
// the browser's next frame (requestAnimationFrame), which is the frame that would have painted it anyway, so it costs no time.
//
// Why: Safari (26) barely advances a CSS transition on a layout property (left, width…) that is retargeted outside a
// frame, in an event handler or a timer. Under a slider dragged at 60 changes a second, a bar or a tick froze, then
// jumped. Written inside a frame, the same transition runs smoothly. Chrome and Firefox run it smoothly either way.
//
// A change made inside a frame (the JS version's clock, or an app's own requestAnimationFrame loop) should not wait
// for the next one. The clock writes directly (drawing). For an app's loop, the queue keeps its frame callback
// registered while changes keep coming: it then runs after the app's callback in the same frame.
let queue = new Map(); // element -> Map(property -> value, or null to remove it)
let armed = false, idle = 0, direct = 0;
const canWait = typeof requestAnimationFrame === "function" && typeof document !== "undefined";

const put = (el, k, v) => (v == null ? el.style.removeProperty(k) : el.style.setProperty(k, v));

/** Sets a CSS variable on an element in the next frame, or now while drawing. */
export function write(el, k, v) {
  if (direct || !canWait) {
    queue.get(el)?.delete(k); // a value written now replaces one waiting for the frame
    return put(el, k, v);
  }
  let own = queue.get(el);
  if (!own) queue.set(el, (own = new Map()));
  own.set(k, v);
  arm();
}

/** Runs f with writes going straight to the elements: for code that already runs inside a frame. */
export function drawing(f) {
  direct++;
  try { return f(); } finally { direct--; }
}

function arm() {
  if (armed) return;
  armed = true;
  requestAnimationFrame(flush);
}
function flush() {
  armed = false;
  if (!queue.size) { if (++idle < 3) arm(); return; } // stay registered for a few quiet frames, then stop
  idle = 0;
  const q = queue;
  queue = new Map();
  for (const [el, own] of q) for (const [k, v] of own) put(el, k, v);
  arm();
}
