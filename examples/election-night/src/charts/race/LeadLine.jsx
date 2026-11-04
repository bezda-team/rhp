// How the lead moved through the night: the left candidate's margin over the right one, in points, at every update.
// Above the middle the left candidate leads, below it the right one, and the line takes the color of whoever leads:
// where the lead changes hands the line changes color at the even line. Across a gap in the record of updates the
// line is dotted gray: when the lead changed in between is not known. The pointer reads any update; a click keeps it.

import { Show, createMemo, createSignal, onMount, onCleanup } from "solid-js";
import { Chart, Plot, Line, Dot, Tick, Place, slat, nice } from "@bezda/rhp";
import { THEME } from "../../theme.js";
import { sides, pts, votes, et } from "../../format.js";
import { narrow } from "../../narrow.js";

const tick = (ms) => {
  const d = new Date(ms);
  const s = et(d.toISOString());
  return s.endsWith(":00 p.m.") || s.endsWith(":00 a.m.") ? s.replace(":00", "") : s.replace(/ [ap]\.m\./, "");
};

// A run of the line on one side of even, in that side's color, or across a gap in the record, dotted in gray
const Run = slat({
  room: {},
  css: `
    .run path.rhp-stroke { stroke-width: 2.5px; }
    .run.gap { stroke-dasharray: 1px 6px; opacity: .5; }
  `,
}, (d) => <Line class={`run${d.gap ? " gap" : ""}`} points={d.points} color={d.color} />);

// An update: a dot ringed in the paper's color so it stands off the line; the latest larger, the one being read ringed in ink
const Step = slat({
  room: {},
  css: `
    .pip { box-shadow: 0 0 0 2px var(--paper); }
    .pip.last { box-shadow: 0 0 0 2.5px var(--paper), 0 0 0 4.5px currentColor; }
    .pip.on { box-shadow: 0 0 0 2.5px var(--paper), 0 0 0 4.5px var(--rhp-ink); z-index: 2; }
  `,
}, (p) => <Dot class={`pip${p.last ? " last" : ""}${p.on ? " on" : ""}`} at={p.t} cross={p.m} size={p.size} color={p.color} />);

const Cursor = slat({
  room: {},
  css: `
    .cur { --rhp-tick-width: 1px; }
    .side { position: absolute; left: 6px; font-size: 11.5px; font-weight: 750; white-space: nowrap; }
    .side.up { top: 6px; color: var(--rhp-series-1); }
    .side.down { bottom: 6px; color: var(--rhp-series-2); }
    .side.up.R { color: var(--rhp-series-2); }
    .side.up.I, .side.down.I { color: var(--rhp-series-3); }
  `,
}, (c) => (
  <div>
    <Show when={c.at != null}><Tick class="cur" at={c.at} thick={1} color="ink" /></Show>
    <Place at={c.t0} cross={c.top}><span class={`side up ${c.upParty}`}>↑ {c.up} ahead</span></Place>
    <Place at={c.t0} cross={-c.top}><span class={`side down ${c.downParty}`}>↓ {c.down} ahead</span></Place>
  </div>
));

export function LeadLine(props) {

  const r = () => props.race;
  const pair = () => sides(r());
  const steps = createMemo(() => {
    const [a, b] = pair();
    if (!a || !b) return [];
    return props.timeline
      .filter((s) => s.total > 0)
      .map((s) => ({ t: Date.parse(s.t), total: s.total, gap: !!s.gap, m: (((s.votes[a.id] || 0) - (s.votes[b.id] || 0)) / s.total) * 100 }));
  });
  const [hover, setHover] = createSignal(null);
  const [pinned, setPinned] = createSignal(null);
  const t0 = () => steps()[0]?.t;
  const t1 = () => steps().at(-1)?.t;
  const top = createMemo(() => {
    const m = Math.max(4, ...steps().map((s) => Math.abs(s.m)));
    return nice(-m * 1.08, m * 1.08).max;
  });
  const [plotWidth, setPlotWidth] = createSignal(900);
  // The shortest step that keeps the times SPACE px apart, on Eastern time's hours (UTC-5 since daylight time ended
  // November 1): the count runs on past the night, and a day of hourly times would crowd the axis
  const SPACE = 64;
  const ET = 5 * 3600e3;
  const timeTicks = createMemo(() => {
    const span = t1() - t0();
    const step = [900e3, 1800e3, 3600e3, 2 * 3600e3, 3 * 3600e3, 6 * 3600e3].find((s) => (plotWidth() * s) / span >= SPACE) ?? 12 * 3600e3;
    const out = [];
    for (let t = Math.ceil((t0() - ET) / step) * step + ET; t <= t1(); t += step) {
      out.push(t);
    }
    return out;
  });
  // Where the record stops, when the latest update follows a gap
  const gap = () => {
    const all = steps();
    return all.at(-1)?.gap ? all.at(-2) : null;
  };
  const shown = () => {
    const i = hover() ?? pinned() ?? steps().length - 1;
    return steps()[i];
  };
  // The color of whoever leads at a margin: the left candidate's party above even, the right one's below
  const key = (party) => (party === "R" ? "series-2" : party === "I" ? "series-3" : "series-1");
  const color = (m) => key(m >= 0 ? pair()[0].party : pair()[1].party);
  // The line in runs of one color, each update's segment cut at even where the lead changed hands; a segment across a
  // gap is a run of its own that takes no side
  const runs = createMemo(() => {
    const out = [];
    const all = steps();
    const add = (point, c) => {
      const run = out.at(-1);
      if (run && run.color === c && !run.gap) run.points.push(point);
      else out.push({ color: c, points: run ? [run.points.at(-1), point] : [point] });
    };
    all.forEach((s, i) => {
      const prev = all[i - 1];
      if (s.gap) {
        out.push({ color: "ink", gap: true, points: [[prev.t, prev.m], [s.t, s.m]] });
        return;
      }
      if (prev && prev.m * s.m < 0) {
        const cross = [prev.t + (s.t - prev.t) * (prev.m / (prev.m - s.m)), 0];
        add(cross, color(prev.m));
        out.push({ color: color(s.m), points: [cross] });
      }
      add([s.t, s.m], color(s.m));
    });
    return out.filter((r) => r.points.length > 1);
  });
  // A dot at most every GAP px of the plot, and always the first and last update, each lead change and the one being
  // read: a night of a hundred updates keeps dots large enough to see, and pointing still reads every update
  const GAP = 14;
  const pips = createMemo(() => {
    const on = hover() ?? pinned();
    const all = steps();
    const n = all.length - 1;
    const x = (t) => ((t - t0()) / (t1() - t0())) * plotWidth();
    let lastX = -Infinity;
    const out = [];
    all.forEach((s, i) => {
      const turn = i > 0 && all[i - 1].m * s.m < 0;
      const keep = i === 0 || i === n || i === on || turn || x(s.t) - lastX >= GAP;
      if (!keep) return;
      lastX = x(s.t);
      out.push({ t: s.t, m: s.m, color: color(s.m), last: i === n, on: i === on, size: i === n || i === on ? "12px" : "8px" });
    });
    return out;
  });

  let wrap;
  onMount(() => {
    const ro = new ResizeObserver(([e]) => setPlotWidth(Math.max(200, e.contentRect.width - 60)));
    ro.observe(wrap);
    onCleanup(() => ro.disconnect());
  });
  // The update nearest the pointer, by time
  const nearest = (e) => {
    const chart = wrap.querySelector(".rhp-chart");
    const box = chart.getBoundingClientRect();
    const cs = getComputedStyle(chart);
    const left = box.left + parseFloat(cs.paddingLeft);
    const width = box.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const t = t0() + ((e.clientX - left) / width) * (t1() - t0());
    let best = 0;
    steps().forEach((s, i) => {
      if (Math.abs(s.t - t) < Math.abs(steps()[best].t - t)) best = i;
    });
    return best;
  };

  return (
    <Show when={steps().length >= 2 && t1() > t0()}>
      <div class="leadline" ref={wrap}>
        <p class="readout num" aria-live="polite">
          <Show when={shown()}>
            {(s) => (
              <>
                <b>{et(new Date(s().t).toISOString())} ET</b>
                {": "}
                {Math.abs(s().m) < 0.05 ? "tied" : `${(s().m >= 0 ? pair()[0] : pair()[1]).last} +${pts(s().m)}`}
                {` · ${votes(s().total)} votes counted`}
                <Show when={pinned() != null && hover() == null}><span class="hint"> · pinned (click again to let go)</span></Show>
              </>
            )}
          </Show>
        </p>
        <div class="scrub" tabindex="0" role="slider" aria-label="Updates through the night"
          aria-valuemin={0} aria-valuemax={steps().length - 1} aria-valuenow={hover() ?? pinned() ?? steps().length - 1}
          onPointerMove={(e) => { if (e.pointerType !== "touch") setHover(nearest(e)); }}
          onPointerLeave={(e) => { if (e.pointerType !== "touch") setHover(null); }}
          onClick={(e) => { const i = nearest(e); setHover(null); setPinned(pinned() === i ? null : i); }}
          onKeyDown={(e) => {
            const n = steps().length - 1;
            const i = pinned() ?? n;
            if (e.key === "ArrowLeft") { setPinned(Math.max(0, i - 1)); e.preventDefault(); }
            if (e.key === "ArrowRight") { setPinned(Math.min(n, i + 1)); e.preventDefault(); }
            if (e.key === "Escape") setPinned(null);
          }}>
          <Chart scale={[t0(), t1()]} ticks={timeTicks()} format={tick} cross={[-top(), top()]}
            crossTicks={[-top(), -top() / 2, 0, top() / 2, top()]} crossFormat={(v) => (v === 0 ? "even" : `${v > 0 ? pair()[0].party : pair()[1].party}+${pts(v)}`)}
            height={narrow() ? 200 : 240} theme={THEME} label="The margin between the two leading candidates at each update"
            style={{ background: "linear-gradient(to bottom, color-mix(in srgb, var(--dem) 7%, transparent) 50%, color-mix(in srgb, var(--rep) 7%, transparent) 50%) content-box" }}>
            <Plot overlap={true} rows={runs()}>{Run}</Plot>
            <Plot overlap={true} rows={pips()} key="t" style={{ "pointer-events": "none" }}>{Step}</Plot>
            <Plot overlap={true} slats={1} at={shown() && (hover() != null || pinned() != null) ? shown().t : null} t0={t0()} top={top() * 0.98}
              up={pair()[0].last} down={pair()[1].last} upParty={pair()[0].party} downParty={pair()[1].party} style={{ "pointer-events": "none" }}>{Cursor}</Plot>
          </Chart>
        </div>
        <Show when={gap()}>
          {(g) => <p class="hint">Dotted gray: the results file stopped recording updates at {et(new Date(g().t).toISOString())} ET; the line joins its last one to the latest count, and what came between is not known.</p>}
        </Show>
      </div>
    </Show>
  );
}
