// The swing: each race's margin tonight against the presidential margin in the same place in 2024 (a House
// district, or the state for the Senate and governors). A race on the diagonal votes as its place did for president;
// above it, Democrats run ahead of Harris; below it, Republicans ahead of Trump.

import { Show, createMemo } from "solid-js";
import { Chart, Plot, Dot, Line, Label, slat } from "@bezda/rhp";
import { THEME } from "../../theme.js";
import { feed, raceById } from "../../feed/store.js";
import { pct, pts, statusText } from "../../format.js";
import { go, raceLink, hot, setHot } from "../../route.js";
import { median } from "./order.js";

const LIM = 80;
const clamp = (v) => Math.max(-LIM + 1, Math.min(LIM - 1, v));
const side = (v) => (Math.abs(v) < 0.05 ? "even" : v > 0 ? `D+${pts(v)}` : `R+${pts(v)}`);

const District = slat({
  room: {},
  css: `
    .pt { cursor: pointer; opacity: .85; box-shadow: 0 0 0 1px var(--paper); }
    .pt.hot { opacity: 1; box-shadow: 0 0 0 2px var(--rhp-ink); z-index: 2; }
  `,
}, (d) => (
  <Dot class={hot() === d.id ? "pt hot" : "pt"} at={clamp(d.before)} cross={clamp(d.now)} size="9px"
    color={d.now >= d.before ? "series-1" : "series-2"} data-id={d.id} />
));

const Guide = slat({
  room: {},
  css: `
    .diag path.rhp-stroke { stroke-dasharray: 4 4; }
    .lab { font-size: 11.5px; font-weight: 650; color: var(--rhp-muted); white-space: nowrap; }
  `,
}, () => (
  <div>
    <Line class="diag" points={[[-LIM, -LIM], [LIM, LIM]]} color="muted" />
    <Label at={LIM - 2} cross={LIM - 44} side="before" class="lab">Dashed: no change from 2024</Label>
  </div>
));

export function swingRows(office = "H") {

  return feed.races
    .filter((r) => r.office === office && r.eevp >= 50 && r.dm != null && r.pres24 != null)
    .map((r) => ({ id: r.id, before: r.pres24, now: r.dm, shift: r.dm - r.pres24 }));
}

export const UNITS = { H: "districts", S: "Senate races", G: "governor's races" };

export function Swing(props) {

  const office = () => props.office || "H";
  const rows = createMemo(() => swingRows(office()));
  const mid = () => median(rows().map((r) => r.shift));
  const idOf = (el) => el?.closest?.("[data-id]")?.dataset.id || null;
  const shown = () => {
    const id = hot();
    const r = id && raceById(id);
    return r && r.office === office() && r.dm != null && r.pres24 != null ? r : null;
  };
  const fmt = (v) => (v === 0 ? "Even" : v > 0 ? `D+${v}` : `R+${-v}`);

  return (
    <div class="swing">
      <Show when={rows().length >= 3} fallback={<p class="empty">The swing appears once at least three {UNITS[office()]} have counted half their expected vote.</p>}>
        <p class="swing-say">
          In the {rows().length} {UNITS[office()]} that have counted at least half their expected vote, the median one is running{" "}
          <b class={mid() >= 0 ? "d" : "r"}>{pts(mid())} points {mid() >= 0 ? "more Democratic" : "more Republican"}</b> than {office() === "H" ? "its district" : "its state"} voted for president in 2024.
        </p>
        <p class="readout" aria-live="polite">
          <Show when={shown()} fallback={<span class="hint">Point at a dot to see its race. Click to open it.</span>}>
            {(r) => (
              <>
                <b>{r().label}</b>{`: ${side(r().dm)} now, ${side(r().pres24)} for president in 2024 · ${statusText(r())}`}
              </>
            )}
          </Show>
        </p>
        <div class="swing-chart"
          onPointerMove={(e) => { if (e.pointerType !== "touch") setHot(idOf(e.target)); }}
          onPointerLeave={() => setHot(null)}
          onClick={(e) => { const id = idOf(e.target); if (id) go(raceLink(id)); }}>
          <Chart scale={[-LIM, LIM]} cross={[-LIM, LIM]} ticks={[-60, -30, 0, 30, 60]} crossTicks={[-60, -30, 0, 30, 60]}
            format={fmt} crossFormat={fmt} theme={THEME} aspect={1.1}
            label={`${UNITS[office()]}: margins tonight against the 2024 presidential margin`}>
            <Plot overlap={true} slats={1} style={{ "pointer-events": "none" }}>{Guide}</Plot>
            <Plot overlap={true} rows={rows()} key="id">{District}</Plot>
          </Chart>
          <div class="swing-axes hint">
            <span>Across: the 2024 presidential margin</span>
            <span>Up: the margin tonight</span>
          </div>
        </div>
      </Show>
    </div>
  );
}
