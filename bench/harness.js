// The page side of the benchmark. One library's adapter is bundled with this file; the driver (run.mjs) calls window.bench.
// Every scenario draws the same chart: n bars with a name and a value, on a fixed 0..100 scale, 600px wide.
const stage = document.body.appendChild(document.createElement("div"));
stage.style.cssText = "width:600px;margin:8px";
const rowsOf = (n) => Array.from({ length: n }, (_, i) => ({ name: "Item " + (i + 1), value: 10 + ((i * 37) % 80) }));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Resolves once the next frame has been drawn: a task queued from a frame callback runs after that frame's style,
// layout and paint (the main thread's share of them).
const painted = () => new Promise((r) => requestAnimationFrame(() => { const c = new MessageChannel(); c.port1.onmessage = () => r(performance.now()); c.port2.postMessage(0); }));
const box = () => stage.appendChild(document.createElement("div"));
// Runs f at the start of a frame and resolves with ms until that frame is drawn: f's own work, then style, layout and paint.
const inFrame = (f) => new Promise((r) => requestAnimationFrame(() => {
  const t0 = performance.now(); f();
  const c = new MessageChannel(); c.port1.onmessage = () => r(performance.now() - t0); c.port2.postMessage(0);
}));

export function install(lib) {
  window.bench = {
    name: lib.name,
    // One chart: ms of the frame it is made in (a library that draws in a later frame does that work after this).
    async mount({ n = 20, band = 24 }) {
      await sleep(100);
      return inFrame(() => lib.mount(box(), rowsOf(n), { band }));
    },
    // k charts of n bars, made in one frame.
    async dashboard({ k = 50, n = 7, band = 24 }) {
      await sleep(100);
      return inFrame(() => { for (let i = 0; i < k; i++) lib.mount(box(), rowsOf(n), { band }); });
    },
    // A chart, then one value changed `times` times, `gap` ms apart: ms from each change to its drawn frame.
    async prepare({ n = 20, band = 24 }) {
      const rows = rowsOf(n);
      this.chart = lib.mount(box(), rows, { band }); this.rows = rows;
      await sleep(1500); // mount animations finish
    },
    async updates({ times = 20, gap = 700 }) {
      const out = [];
      for (let t = 0; t < times; t++) {
        const rows = this.rows.map((r, i) => (i === 0 ? { ...r, value: t % 2 ? 30 : 70 } : r));
        const t0 = performance.now();
        this.chart.update(rows);
        out.push((await painted()) - t0);
        await sleep(gap);
      }
      return out;
    },
    // A drag: the first value changes in every frame for `frames` frames. Returns the gaps between frames (ms).
    async drag({ frames = 240 }) {
      const stamps = [];
      await new Promise((done) => {
        let k = 0;
        const step = (t) => {
          stamps.push(t);
          if (k >= frames) return done();
          const v = Math.round(50 + 40 * Math.sin(k++ / 10));
          this.chart.update(this.rows.map((r, i) => (i === 0 ? { ...r, value: v } : r)));
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      await sleep(1200); // let animations finish inside the measured window
      return stamps.slice(1).map((t, i) => t - stamps[i]);
    },
  };
}
