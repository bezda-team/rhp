// Keeps an element where it is on screen while the page above it changes (a rapper opening in the ranking, the ranking
// growing or shrinking), so the reader never sees the page move, not even for one frame.
// The browser lays the page out and then, before it paints, runs ResizeObservers: one on the page scrolls by however
// far the element moved. A check in every frame catches a move that does not resize the page. It lets go once the page
// has been still for a while, or as soon as the reader scrolls. A change made inside another ResizeObserver's callback
// reaches the page's observer only a frame later, so the code that makes it calls steady() right after.

const INPUTS = ["wheel", "touchstart", "keydown", "pointerdown"];
const MIN = 1000; // ms held at least
const MAX = 4000; // ms held at most
const STILL = 30; // frames without a move after MIN

let release = null;
let current = null; // the held element's fix

// Holds `el` from now on; returns a function that puts it back right away (to call after a change made in the same task)
export function hold(el) {

  release?.();

  const top = el.getBoundingClientRect().top;
  const start = performance.now();
  let still = 0;
  let frame;

  const fix = () => {
    if (!el.isConnected) return release?.();
    const moved = el.getBoundingClientRect().top - top;
    if (Math.abs(moved) < 0.5) return;
    scrollBy({ top: moved, behavior: "instant" });
    still = 0;
  };
  const tick = (now) => {
    fix();
    still++;
    if (now - start > MAX || (now - start > MIN && still > STILL)) return release?.();
    frame = requestAnimationFrame(tick);
  };
  const page = new ResizeObserver(fix);
  const stop = () => release?.();

  current = fix;
  page.observe(document.documentElement);
  frame = requestAnimationFrame(tick);
  for (const type of INPUTS) {
    addEventListener(type, stop, { capture: true, passive: true });
  }

  release = () => {
    page.disconnect();
    cancelAnimationFrame(frame);
    for (const type of INPUTS) {
      removeEventListener(type, stop, { capture: true });
    }
    release = null;
    current = null;
  };

  return fix;
}

// Puts the held element back right away, if one is held
export function steady() {
  current?.();
}
