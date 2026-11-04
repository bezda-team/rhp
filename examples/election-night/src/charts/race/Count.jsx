// The count against the expected vote: the left candidate's votes from the left, the right one's from the right,
// and between them the votes the AP expects but has not counted yet, striped. Whoever crosses the half line has
// more votes than the other can reach, if the estimate holds.

import { Show, createMemo } from "solid-js";
import { Chart, Plot, Bar, Tick, Place, slat } from "@bezda/rhp";
import { THEME } from "../../theme.js";
import { tone, sides, pct, votes, short, LETTER } from "../../format.js";

const Segment = slat({
  thickness: 78,
  room: {},
  css: `
    .seg { --rhp-radius: 0px; }
    .seg:first-child { --rhp-start-radius: 4px; }
    .hatch { position: absolute; inset: 0; background: var(--hatch); }
  `,
}, (s) => (
  <Bar class="seg" from={s.from} to={s.to} color={s.color} thick="26px">
    <Show when={s.kind === "left"}><i class="hatch" /></Show>
  </Bar>
));

const Marks = slat({
  thickness: 78,
  room: {},
  css: `
    .half { --rhp-tick-width: 1px; }
    .nm { position: absolute; bottom: 18px; display: flex; align-items: baseline; gap: 6px; font-size: 14px; white-space: nowrap; color: var(--rhp-ink); }
    .nm.l { left: 0; }
    .nm.r { right: 0; flex-direction: row-reverse; }
    .nm b { font-weight: 750; }
    .nm .v { font-variant-numeric: tabular-nums; color: var(--rhp-muted); }
    .left { position: absolute; top: 23px; translate: -50% 0; font-size: 12px; white-space: nowrap; color: var(--rhp-muted); }
    .hl { position: absolute; top: 23px; translate: -50% 0; font-size: 11px; font-weight: 700; white-space: nowrap; color: var(--rhp-ink); }
  `,
}, (m) => (
  <div>
    <Tick class="half" at={m.max / 2} thick="38px" color="ink" />
    <Show when={m.a}>
      <Place at={0}>
        <span class="nm l"><span class={`tag ${m.a.party}`}>{LETTER[m.a.party]}</span><b>{m.a.last}</b><span class="v">{votes(m.a.votes)}</span></span>
      </Place>
    </Show>
    <Show when={m.b}>
      <Place at={m.max}>
        <span class="nm r"><span class={`tag ${m.b.party}`}>{LETTER[m.b.party]}</span><b>{m.b.last}</b><span class="v">{votes(m.b.votes)}</span></span>
      </Place>
    </Show>
    <Show when={m.remaining > m.max * 0.12} fallback={<Place at={m.max / 2}><span class="hl">half</span></Place>}>
      <Place at={m.mid}><span class="left">≈ {short(m.remaining)} left to count</span></Place>
    </Show>
  </div>
));

export function Count(props) {

  const r = () => props.race;
  const pair = () => sides(r());
  const max = () => Math.max(r().expected || 0, r().total || 0) || 1;
  const parts = createMemo(() => {
    const [a, b] = pair();
    const called = r().status === "called";
    const others = r().total - (a?.votes || 0) - (b?.votes || 0);
    const left = Math.max(0, max() - r().total);
    const list = [
      { n: a?.votes || 0, color: a ? tone(a.party, called && a.won) : "surface", kind: "a" },
      { n: Math.max(0, others), color: "grid", kind: "others" },
      { n: left, color: "surface", kind: "left" },
      { n: b?.votes || 0, color: b ? tone(b.party, called && b.won) : "surface", kind: "b" },
    ];
    let at = 0;
    return list.map((p) => ({ ...p, from: at, to: (at += p.n) }));
  });
  const mid = () => {
    const l = parts()[2];
    return (l.from + l.to) / 2;
  };

  return (
    <div class="count">
      <Chart scale={[0, max()]} ticks={false} theme={THEME} label="The votes counted for each candidate, and the votes still expected">
        <Plot overlap={true} rows={parts()}>{Segment}</Plot>
        <Plot overlap={true} slats={1} max={max()} a={pair()[0]} b={pair()[1]} remaining={Math.max(0, max() - r().total)} mid={mid()}
          style={{ "pointer-events": "none" }}>{Marks}</Plot>
      </Chart>
    </div>
  );
}

// What the trailing candidate would need from the votes left, assuming they all go to the top two
export function catchUp(r) {

  const [lead, next] = r.cands;
  if (!lead || !next || r.total === 0 || r.status === "called") return null;
  const remaining = r.remaining;
  const gap = lead.votes - next.votes;
  const two = lead.votes + next.votes;
  const sofar = two ? (next.votes / two) * 100 : 0;
  if (remaining <= 0) return { lead, next, remaining, need: null, sofar };
  const need = ((remaining + gap) / (2 * remaining)) * 100;
  return { lead, next, remaining, need, sofar };
}
