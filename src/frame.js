// CSS variable writes are queued and applied in the next animation frame. A new element gets its first values right away.
// NOTE: Safari barely advances a CSS transition on left, width, etc. when the value changes outside of a frame (in an event
// handler or a timer), so a bar under a dragged slider freezes and then jumps. Writing inside a frame fixes this.
// Code that already runs inside a frame (the JS animation clock) writes directly with drawing().

let queue = new Map(); // element -> Map of property -> value (null removes the property)
let armed = false;
let idle = 0;
let direct = 0;
const canWait = typeof requestAnimationFrame === "function" && typeof document !== "undefined";

const put = (el, key, value) => {

  if (value == null) return el.style.removeProperty(key);

  return el.style.setProperty(key, value);
};

// Sets a CSS variable on an element in the next frame (or right away while drawing)
export function write(el, key, value) {

  if (direct || !canWait) {
    queue.get(el)?.delete(key); // a value written now replaces one that is waiting
    return put(el, key, value);
  }

  let own = queue.get(el);
  if (!own) queue.set(el, (own = new Map()));
  own.set(key, value);
  arm();
}

// Runs f with writes going straight to the elements
export function drawing(f) {

  direct++;
  try {
    return f();
  } finally {
    direct--;
  }
}

function arm() {

  if (armed) return;

  armed = true;
  requestAnimationFrame(flush);
}

function flush() {

  armed = false;

  if (!queue.size) {
    // We stay registered for a few quiet frames so an app's own animation loop doesn't have to wait a frame
    if (++idle < 3) arm();
    return;
  }

  idle = 0;
  const current = queue;
  queue = new Map();

  for (const [el, own] of current) {
    for (const [key, value] of own) {
      put(el, key, value);
    }
  }

  arm();
}

// A new element drawn while its chart's new scale waits for the next frame takes that scale itself until then, so the
// browser can't give it a first style on the old scale (and transition it from there). frame.written() is the scale the
// chart has written (none while it mounts) and frame.scaleNow() the one it is writing.
export function holdScale(el, frame) {

  const w = frame?.written();
  if (!w) return;

  const queued = queue.get(frame.root());
  const v = frame.scaleNow();
  for (const key in v) {
    if (v[key] === w[key] && !queued?.has(key)) continue; // the chart shows this value already
    put(el, key, v[key]);
    write(el, key, null);
  }
}
