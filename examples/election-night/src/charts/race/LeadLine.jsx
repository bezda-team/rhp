// How the lead moved through the night: the left candidate's margin over the right one, in points, at every update.
// Above the middle the left candidate leads, below it the right one. The pointer reads any update; a click keeps it.

import { Show, createMemo, createSignal } from "solid-js";
import { Chart, Plot, Line, Dot, Tick, Place, slat, nice } from "@bezda/rhp";
import { THEME } from "../../theme.js";
import { sides, pts, votes, et } from "../../format.js";
import { narrow } from "../../narrow.js";

const tick = (ms) => {
  const d = new Date(ms);
  const s = et(d.toISOString());
  return s.endsWith(":00 p.m.") || s.endsWith(":00 a.m.") ? s.replace(":00", "") : s.replace(/ [ap]\.m\./, "");
};

const Trace = slat({ room: {}, css: `.trace { --rhp-color: var(--rhp-ink); }` }, (d) => <Line class="trace" points={d.points} />);

const Step = slat({
  room: {},
  css: `
    .pip { opacity: .8; }
    .pip.last { box-shadow: 0 0 0 3px var(--rhp-surface), 0 0 0 5px currentColor; }
  `,
}, (p) => <Dot class={p.last ? "pip last" : "pip"} at={p.t} cross={p.m} size={p.last ? "9px" : "5px"} color={p.color} />);

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
      .map((s) => ({ t: Date.parse(s.t), total: s.total, m: (((s.votes[a.id] || 0) - (s.votes[b.id] || 0)) / s.total) * 100 }));
  });
  const [hover, setHover] = createSignal(null);
  const [pinned, setPinned] = createSignal(null);
  const t0 = () => steps()[0]?.t;
  const t1 = () => steps().at(-1)?.t;
  const top = createMemo(() => {
    const m = Math.max(4, ...steps().map((s) => Math.abs(s.m)));
    return nice(-m * 1.08, m * 1.08).max;
  });
  const timeTicks = createMemo(() => {
    const span = t1() - t0();
    const step = span > 4 * 3600e3 ? 3600e3 : span > 90 * 60e3 ? 1800e3 : 900e3;
    const out = [];
    for (let t = Math.ceil(t0() / step) * step; t <= t1(); t += step) {
      out.push(t);
    }
    return narrow() ? out.filter((_, i) => i % 2 === 0) : out;
  });
  const shown = () => {
    const i = hover() ?? pinned() ?? steps().length - 1;
    return steps()[i];
  };
  const color = (m) => (m >= 0 ? (pair()[0].party === "R" ? "series-2" : pair()[0].party === "I" ? "series-3" : "series-1") : "series-2");
  const pips = createMemo(() => steps().map((s, i, all) => ({ t: s.t, m: s.m, color: color(s.m), last: i === all.length - 1 })));

  let wrap;
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
                <b>{et(new Date(s().t).toISOString())}</b>
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
            <Plot overlap={true} slats={1} points={[steps().map((s) => [s.t, s.m])]}>{Trace}</Plot>
            <Plot overlap={true} rows={pips()} style={{ "pointer-events": "none" }}>{Step}</Plot>
            <Plot overlap={true} slats={1} at={shown() && (hover() != null || pinned() != null) ? shown().t : null} t0={t0()} top={top() * 0.98}
              up={pair()[0].last} down={pair()[1].last} upParty={pair()[0].party} downParty={pair()[1].party} style={{ "pointer-events": "none" }}>{Cursor}</Plot>
          </Chart>
        </div>
      </div>
    </Show>
  );
}
