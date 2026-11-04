// The balance of power in one chamber: seats each party has (won tonight or not up), seats it leads in the count,
// and the seats still open, on one bar from the Democrats' end to the Republicans', with the majority marked.

import { Show, createMemo, createSignal, onCleanup } from "solid-js";
import { Chart, Plot, Bar, Tick, Place, slat } from "@bezda/rhp";
import { THEME } from "../theme.js";
import { tone } from "../format.js";

const Segment = slat({
  room: {},
  css: `
    .seg { --rhp-radius: 0px; }
    .seg.lead { --rhp-radius: 0px; }
  `,
}, (s) => <Bar class={s.lead ? "seg lead" : "seg"} from={s.from} to={s.to} color={s.color} thick={1} />);

const Majority = slat({
  room: {},
  css: `
    .tick { --rhp-tick-width: 2px; }
    .flag { position: absolute; bottom: calc(100% + 3px); translate: -50% 0; font-size: 11px; font-weight: 700; white-space: nowrap; color: var(--rhp-ink); }
  `,
}, (m) => (
  <div>
    <Tick class="tick" at={m.at} thick="calc(100% + 8px)" color="ink" />
    <Place at={m.at} across={0}><span class="flag">{m.text}</span></Place>
  </div>
));

// Where the pointer is: a dashed line that follows it and snaps to a segment's edge when near one, and the seats on
// each side of it. The count goes the way the segment does: on the Democrats' side (blue) the seats from the left end
// ("← 45"), on the Republicans' side (red) the seats from the right end ("34 →"), between them both. At an edge the
// count is that segment's whole length from its end.
const Pointer = slat({
  room: {},
  css: `
    .ptr { --rhp-length-time: .07s; --rhp-length-ease: linear; }
    .ptr.snap { --rhp-length-time: .22s; --rhp-length-ease: cubic-bezier(.3, 1.6, .5, 1); }
    .line { --rhp-tick-width: 0px; background: none; border-left: 1.5px dashed var(--rhp-ink); }
    .ptr.snap .line { border-left: 2px solid var(--rhp-ink); }
    .count { position: absolute; top: 6px; translate: -50% 0; display: flex; gap: 8px; align-items: baseline; padding: 1px 8px;
      border: 1px solid var(--rule); border-radius: 99px; background: var(--paper); font-size: 11.5px; font-weight: 750;
      white-space: nowrap; font-variant-numeric: tabular-nums; transition: border-color .15s, box-shadow .15s; }
    .ptr.snap .count { border-color: var(--rhp-ink); box-shadow: 0 1px 4px rgb(0 0 0 / .25); }
    .count.start { translate: -12px 0; }
    .count.end { translate: calc(-100% + 12px) 0; }
    .count .D { color: var(--dem); }
    .count .R { color: var(--rep); }
  `,
}, (h) => (
  <div class={h.snap ? "ptr snap" : "ptr"}>
    <Tick class="line" at={h.at} thick="calc(100% + 12px)" color="ink" />
    <Place at={h.at} across={1}>
      <span class={`count${h.at / h.total < 0.06 ? " start" : h.at / h.total > 0.94 ? " end" : ""}`}>
        <Show when={h.left != null}><b class="D">← {h.left}</b></Show>
        <Show when={h.right != null}><b class="R">{h.right} →</b></Show>
      </span>
    </Place>
  </div>
));

// How near an edge the line snaps to it (px)
const SNAP = 9;

export function seats(c) {

  const has = (p) => c.notUp[p] + c.won[p];
  return {
    D: has("D"),
    R: has("R"),
    I: has("I"),
    leadD: c.leading.D,
    leadR: c.leading.R,
    leadI: c.leading.I,
  };
}

export function Control(props) {

  const c = () => props.c;
  const parts = createMemo(() => {
    const s = seats(c());
    const list = [
      { n: s.D, color: tone("D", true), lead: false },
      { n: s.leadD, color: tone("D", false), lead: true },
      { n: s.I, color: tone("I", true), lead: false },
      { n: s.leadI, color: tone("I", false), lead: true },
      { n: c().total - s.D - s.R - s.I - s.leadD - s.leadR - s.leadI, color: "surface", lead: false },
      { n: s.leadR, color: tone("R", false), lead: true },
      { n: s.R, color: tone("R", true), lead: false },
    ];
    let at = 0;
    // Which end a segment counts from: the Democrats' (and an independent's) from the left, the Republicans' from the right
    const sideOf = (p) => (p.color === "surface" ? "M" : p.color === tone("R", true) || p.color === tone("R", false) ? "R" : "L");
    return list.map((p) => ({ ...p, side: sideOf(p), from: at, to: (at += p.n) }));
  });
  const mid = () => c().total / 2;
  // The pointer's place on the bar, in seats, written once a frame (Safari stalls a transition retargeted on every event).
  // A mouse or a pen moves the line by pointing; a finger by touching the bar or dragging along it, and the line stays
  // until the next touch anywhere else. A touch on the bar reads it rather than following the block's link.
  const [value, setValue] = createSignal(null);
  let chart, box, frame = 0, next = null, touched = false;
  const point = (e) => {
    const box = chart.getBoundingClientRect(), css = getComputedStyle(chart);
    const left = box.left + parseFloat(css.paddingLeft), width = box.width - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
    next = { v: Math.max(0, Math.min(1, (e.clientX - left) / width)) * c().total, perSeat: width / c().total };
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; setValue(next); });
  };
  const leave = (e) => {
    if (e?.pointerType === "touch") return;
    cancelAnimationFrame(frame);
    frame = 0;
    setValue(null);
  };
  const down = (e) => {
    touched = e.pointerType === "touch";
    if (touched) point(e);
  };
  // A finger's tap on the bar is a reading, not the block's link
  const click = (e) => {
    if (touched) e.preventDefault();
  };
  // Another touch outside the bar puts the line away
  const away = (e) => {
    if (e.pointerType === "touch" && value() && !box?.contains(e.target)) leave();
  };
  document.addEventListener("pointerdown", away, true);
  onCleanup(() => document.removeEventListener("pointerdown", away, true));
  // Where the line goes, whether it snapped to an edge, and the counts it shows
  const pointer = createMemo(() => {
    const p = value();
    if (!p) return null;
    const total = c().total;
    const shown = parts().filter((x) => x.n > 0);
    // The nearest edge within reach: a segment of a seat or two has both of its edges in reach
    let near = null;
    for (let i = 0; i < shown.length - 1; i++) {
      const gap = Math.abs(p.v - shown[i].to) * p.perSeat;
      if (gap <= SNAP && (!near || gap < near.gap)) near = { i, gap };
    }
    if (near) {
      const edge = shown[near.i].to, l = shown[near.i].side, r = shown[near.i + 1].side;
      // The edge ends a Democratic segment (counted from the left), begins a Republican one (from the right), or both
      return { at: edge, snap: true, left: l === "L" ? edge : null, right: r === "R" ? total - edge : null };
    }
    const seg = shown.find((x) => p.v <= x.to) || shown.at(-1);
    const at = p.v;
    return {
      at,
      snap: false,
      left: seg.side === "R" ? null : Math.round(at),
      right: seg.side === "L" ? null : Math.round(total - at),
    };
  });
  return (
    <Show when={c()}>
      <div class="control" ref={(el) => (box = el)} style={{ "--thick": props.thick || "26px", "touch-action": "pan-y" }}
        onPointerDown={down} onPointerMove={point} onPointerLeave={leave} onClick={click}>
        <Chart ref={(el) => (chart = el)} scale={[0, c().total]} ticks={false} theme={THEME} height={props.height || 26} label={props.label}>
          <Plot overlap={true} rows={parts()}>{Segment}</Plot>
          <Plot overlap={true} slats={1} at={mid()} text={props.flag || ""} style={{ "pointer-events": "none" }}>{Majority}</Plot>
          <Show when={pointer()}>
            <Plot overlap={true} slats={1} at={pointer().at} snap={pointer().snap} left={pointer().left} right={pointer().right} total={c().total}
              style={{ "pointer-events": "none" }}>{Pointer}</Plot>
          </Show>
        </Chart>
      </div>
    </Show>
  );
}
