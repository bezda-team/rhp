// The page side of the scale benchmark: one chart of n points, a scatter plot or a line, made at the start of a frame.
const stage = document.body.appendChild(document.createElement("div"));
stage.style.cssText = "width:600px;margin:8px";
// Points from a fixed seed, so every library draws the same ones
function points(kind, n) {
  let s = 42;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  if (kind === "scatter") return Array.from({ length: n }, () => ({ x: rand() * 100, y: rand() * 100 }));
  let y = 0;
  return Array.from({ length: n }, (_, i) => ({ x: i, y: (y = Math.max(-1.9, Math.min(1.9, y + (rand() - 0.5) * 0.2))) }));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const inFrame = (f) => new Promise((r) => requestAnimationFrame(() => {
  const t0 = performance.now(); f();
  const c = new MessageChannel(); c.port1.onmessage = () => r(performance.now() - t0); c.port2.postMessage(0);
}));
export function install(lib) {
  window.bench = {
    name: lib.name,
    async run({ kind, n }) {
      const pts = points(kind, n);
      await sleep(100);
      const box = stage.appendChild(document.createElement("div"));
      return inFrame(() => lib[kind](box, pts));
    },
  };
}
