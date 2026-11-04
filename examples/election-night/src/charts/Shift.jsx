// The swing so far: every county (or county part of a House district) that has counted 95% of its expected vote,
// one dot each, stacked by how far its House margin tonight moved from the 2024 presidential margin there.
// Dots right of the middle moved toward Democrats, left toward Republicans. ManyDots draws them, thousands by the end.

import { Show, createMemo, createSignal, onCleanup, onMount, For } from "solid-js";
import { Chart, Plot, Tick, Place, ManyDots, slat } from "@bezda/rhp";
import { THEME } from "../theme.js";
import { feed } from "../feed/store.js";
import { pts, votes } from "../format.js";
import { STATES } from "../feed/normalize.js";
import { raceLink } from "../route.js";

// The tallest the stacks may grow, and the largest and smallest step between dot centers (px). A dot's step across
// equals its step up, so the dots sit on an even grid, as large as the tallest stack allows.
const MAX_HEIGHT = 240;
const STEPS = [22, 20, 18, 16, 14, 12, 11, 10, 9, 8, 7, 6, 5, 4];
const side = (v) => (v >= 0 ? `D+${pts(v)}` : `R+${pts(v)}`);
const toward = (v) => (Math.abs(v) < 0.05 ? "no change" : `${pts(v)} points toward ${v > 0 ? "Democrats" : "Republicans"}`);

const Mean = slat({
  room: {},
  css: `
    .tick { --rhp-tick-width: 2px; }
    .flag { position: absolute; bottom: calc(100% + 4px); translate: -50% 0; padding: 2px 7px; border-radius: 99px; background: var(--rhp-ink); color: var(--rhp-surface); font-size: 11.5px; font-weight: 750; white-space: nowrap; }
  `,
}, (m) => (
  <div>
    <Tick class="tick" at={m.at} thick={1} color="ink" />
    <Place at={m.at} across={0}><span class="flag" style={{ color: "var(--paper)" }}>{m.text}</span></Place>
  </div>
));

export function Shift() {

  const [width, setWidth] = createSignal(800);
  // The dot under a mouse, and the dot a click or a tap pinned: leaving the chart goes back to the pinned one
  const [pick, setPick] = createSignal(null);
  const [pinned, setPinned] = createSignal(null);
  let box;
  onMount(() => {
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(box);
    onCleanup(() => ro.disconnect());
  });

  // The range of the swing, from the data, in steps of 5 points and always holding 0
  const domain = createMemo(() => {
    const s = feed.shifts.map((c) => c.shift);
    const lo = Math.min(-5, Math.floor(Math.min(...s, 0) / 5) * 5);
    const hi = Math.max(5, Math.ceil(Math.max(...s, 0) / 5) * 5);
    return [lo, hi];
  });
  // The largest step whose bins keep the tallest stack under MAX_HEIGHT. A bin is one step wide, so its width in
  // points follows the step; 0 is always a bin's edge, so no bin holds counties that moved both ways. Each county goes
  // in its bin, stacked from the bottom, the largest first.
  const placed = createMemo(() => {
    const [lo, hi] = domain();
    const plot = Math.max(200, width() - 28);
    const list = [...feed.shifts].sort((a, b) => b.votes - a.votes);
    for (const step of STEPS) {
      const columns = Math.floor(plot / step);
      const binWidth = (hi - lo) / (columns - 1);
      const start = Math.floor(lo / binWidth) * binWidth;
      const bins = new Map();
      const rows = list.map((c) => {
        const col = Math.min(columns - 1, Math.max(0, Math.floor((c.shift - start) / binWidth)));
        const k = bins.get(col) || 0;
        bins.set(col, k + 1);
        return { ...c, x: start + (col + 0.5) * binWidth, k };
      });
      const tallest = Math.max(1, ...bins.values());
      // The exact step: the plot shared by the columns, the same up as across
      const pitch = plot / columns;
      if (tallest * pitch <= MAX_HEIGHT || step === STEPS.at(-1)) {
        // At least 4 rows tall, so a first handful of dots does not sit on the axis alone
        const levels = Math.max(4, tallest);
        return { rows, step: pitch, levels, height: levels * pitch, scale: [start, start + columns * binWidth] };
      }
    }
  });
  const ticks = () => {
    const [lo, hi] = placed().scale;
    const every = hi - lo > 50 ? 10 : 5;
    const out = [];
    for (let v = Math.ceil(lo / every) * every; v <= hi; v += every) {
      out.push(v);
    }
    return out;
  };

  // The shift of all these counties' votes together: each county's swing weighted by its votes
  const mean = createMemo(() => {
    const list = feed.shifts;
    const all = list.reduce((s, c) => s + c.votes, 0);
    return all ? list.reduce((s, c) => s + c.shift * c.votes, 0) / all : 0;
  });
  const toD = () => feed.shifts.filter((c) => c.shift > 0).length;
  const size = () => placed().step * 0.84;
  const extremes = createMemo(() => {
    const list = [...feed.shifts].filter((c) => c.votes >= 2000).sort((a, b) => b.shift - a.shift);
    return { d: list.filter((c) => c.shift > 0).slice(0, 3), r: list.filter((c) => c.shift < 0).slice(-3).reverse() };
  });
  const shown = () => pick() ?? pinned();
  const at = (e) => {
    const p = e.target.closest?.(".rhp-manydot");
    return p ? placed().rows[+p.dataset.rhpIndex] : null;
  };

  return (
    <div class="shift" ref={box}>
      <Show when={feed.shifts.length} fallback={<p class="empty">No county has finished counting yet. Dots appear as counties reach 95% of their expected vote.</p>}>
        <div class="facts">
          <div class="fact"><b class={mean() >= 0 ? "d" : "r"}>{toward(mean()).replace(" points", " pts")}</b><span>combined swing since 2024</span></div>
          <div class="fact"><b class="num">{feed.shifts.length}</b><span>counties fully counted</span></div>
          <div class="fact"><b class="num">{Math.round((toD() / feed.shifts.length) * 100)}%</b><span>moved toward Democrats</span></div>
        </div>
        <p class="readout" aria-live="polite" style={{ "margin-top": "18px" }}>
          <Show when={shown()} fallback={<span class="hint">Each dot is a county. Point at one or tap it.</span>}>
            {(c) => (
              <>
                <b>{c().county}, {STATES[c().state]}</b>{` (${c().race.split("-")[0]}-${c().race.split("-")[3]}): ${side(c().now)} tonight, ${side(c().before)} for president in 2024, ${toward(c().shift)}`}
              </>
            )}
          </Show>
        </p>
        <div onPointerMove={(e) => e.pointerType !== "touch" && setPick(at(e))} onPointerLeave={() => setPick(null)}
          onClick={(e) => { const c = at(e); setPinned(c && pinned() && c.race === pinned().race && c.county === pinned().county ? null : c); setPick(null); }}>
          <Chart scale={placed().scale} cross={[0, placed().levels]} crossTicks={false} height={placed().height}
            ticks={ticks()} format={(v) => (v === 0 ? "0" : v > 0 ? `D+${v}` : `R+${-v}`)}
            theme={THEME} label="How far each fully counted county moved from the 2024 presidential margin">
            <ManyDots rows={placed().rows} key={(r) => r.race + r.county} at={(r) => r.x} cross={(r) => r.k + 0.5}
              size={size()} color={(r) => (r.shift >= 0 ? "series-1" : "series-2")}
              pointClass={(r) => (shown() && shown().race === r.race && shown().county === r.county ? "swing-dot on" : "swing-dot")} />
            <Plot overlap={true} slats={1} at={mean()} text={`All: ${side(mean()).replace("+", " +")}`} style={{ "pointer-events": "none" }}>{Mean}</Plot>
          </Chart>
        </div>
        <div class="axis-words hint"><span>← Moved toward Republicans</span><span>Moved toward Democrats →</span></div>
        <div class="swings">
          <For each={[["d", "Biggest moves toward Democrats"], ["r", "Biggest moves toward Republicans"]]}>
            {([k, title]) => (
              <div>
                <h3 class="h3">{title}</h3>
                <ol>
                  <Show when={extremes()[k].length} fallback={<li class="hint">None yet.</li>}>
                  <For each={extremes()[k]}>
                    {(c) => (
                      <li>
                        <a href={raceLink(c.race)}><b>{c.county}, {c.state}</b></a>
                        <span class="num">{` ${side(c.before)} → ${side(c.now)}`}</span>
                        <span class="hint">{` · ${votes(c.votes)} votes`}</span>
                      </li>
                    )}
                  </For>
                  </Show>
                </ol>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
