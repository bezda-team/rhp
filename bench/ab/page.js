// The page side of the benchmark: one variant of rhp, every scenario, and the timing primitives. run.mjs drives it.
import { SCENARIOS } from "./scenarios.jsx";

const params = new URLSearchParams(location.search);
const stage = document.getElementById("stage");

// A page's own CSS, for scenarios about how rhp lives with it: ?css=selection (a page ::selection rule), ?css=hostile
// (rules a reset or framework writes for every element)
const PAGE_CSS = {
  selection: "::selection { background: #fd0; color: #000; }",
  hostile: `div, span { margin: 3px; padding: 2px; box-sizing: content-box; border: 1px dotted #999; font: italic 15px Georgia;
    letter-spacing: 1px; line-height: 2; text-transform: uppercase; color: #c00; background: #ffe; min-height: 4px; }
    svg, path { stroke: #f0f; stroke-width: 6px; } * { transition: all 1s; }`,
};
if (params.get("css")) document.head.appendChild(document.createElement("style")).textContent = PAGE_CSS[params.get("css")];

// ?pre=1: a small chart is drawn when the page loads (and kept), so rhp's stylesheet is in the page before the
// measured mount: for the cost rhp's CSS adds to an app's own elements
if (params.get("pre")) SCENARIOS.bars20(document.body.appendChild(document.createElement("div")));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Calls back once the frame we are in has rendered: a message posted during a frame's animation callbacks is handled
// after that frame's style, layout and paint
const afterRender = (f) => {
  const c = new MessageChannel();
  c.port1.onmessage = () => f(performance.now());
  c.port2.postMessage(0);
};

const settle = async (ms = 300) => {
  for (let i = 0; i < 3; i++) {
    await new Promise(requestAnimationFrame);
  }
  await sleep(ms);
};

// Runs onFrame(i) at the start of each of `count` frames and records each frame's work: from the start of our
// callback to the end of the frame's rendering. Our callback is asked for at the start of the one before, so it runs
// before any callback rhp asks for in that frame (frame.js, the JS clock).
function frames(count, onFrame) {

  const out = [];

  return new Promise((resolve) => {
    let i = 0;
    const step = (ts) => {
      if (i + 1 < count) requestAnimationFrame(step);
      const k = i++;
      const t0 = performance.now();
      onFrame(k, ts);
      const script = performance.now() - t0;
      afterRender((t1) => {
        out[k] = { ts, t0, t1, script };
        if (k + 1 < count) return;
        // A frame whose message came only after the next frame began ends where the next one began
        for (let j = 0; j < out.length; j++) {
          const end = j + 1 < out.length ? Math.min(out[j].t1, out[j + 1].t0) : out[j].t1;
          out[j].work = end - out[j].t0;
        }
        resolve(out);
      });
    };
    requestAnimationFrame(step);
  });
}

let handle = null;

window.bench = {
  // ?as= draws another scenario than s= says, so a variant can carry its own scenario (base?as=bars1000u1)
  scenario: params.get("as") ?? params.get("s"),
  crossOriginIsolated: self.crossOriginIsolated,
  settle,
  sleep,

  // Makes the scenario's chart at the start of a frame: the ms from the call until that frame has rendered, and the
  // ms of the call itself (script, before the browser styles and lays out what it made)
  mount() {
    const make = SCENARIOS[this.scenario];
    if (!make) throw new Error("no scenario " + this.scenario);
    const box = stage.appendChild(document.createElement("div"));
    return new Promise((resolve) => requestAnimationFrame(() => {
      const t0 = performance.now();
      handle = make(box);
      handle.box = box;
      const script = performance.now() - t0;
      afterRender((t1) => resolve({ frame: t1 - t0, script }));
    }));
  },

  unmount() {
    handle?.dispose();
    handle?.box.remove();
    handle = null;
  },

  // One change at the start of a frame, then the work of each frame for `count` frames
  update(kind, t, count = 24) {
    return frames(count, (i) => {
      if (i === 0) handle.update(kind, t);
    });
  },

  // A change at the start of each of `count` frames, then `tail` frames more for the motion to end
  stream(kind, count = 120, tail = 24) {
    return frames(count + tail, (i) => {
      if (i < count) handle.update(kind, i);
    });
  },

  // What the page shows: the number of elements, and a fingerprint of where every element is, so a variant that
  // draws something else is caught
  census() {
    const all = stage.querySelectorAll("*");
    let h = 0;
    for (const el of all) {
      const r = el.getBoundingClientRect();
      const s = `${Math.round(r.x * 4)},${Math.round(r.y * 4)},${Math.round(r.width * 4)},${Math.round(r.height * 4)}`;
      for (let i = 0; i < s.length; i++) {
        h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
      }
    }
    return { elements: all.length, geometry: (h >>> 0).toString(36) };
  },
};
