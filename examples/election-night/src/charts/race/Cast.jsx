// How the votes were cast: for each way of voting, how the two main candidates split it

import { Show, createMemo } from "solid-js";
import { Chart, Plot, Bar, Tick, Label, Place, slat } from "@bezda/rhp";
import { THEME } from "../../theme.js";
import { tone, sides, short, LETTER } from "../../format.js";
import { narrow } from "../../narrow.js";

const TYPES = [
  ["mail", "By mail"],
  ["early", "Early in person"],
  ["advance", "Before election day"],
  ["day", "On election day"],
  ["provisional", "Provisional"],
];

const makeType = (wide) => slat({
  thickness: wide ? 46 : 54,
  room: wide ? { start: 150, end: 8 } : { start: 104, end: 8 },
  inset: 0.28,
  css: `
    .kind { white-space: normal; line-height: 1.2; text-align: left; width: calc(${wide ? 150 : 104}px - 12px); }
    .kind b { display: block; font-size: 13px; font-weight: 650; }
    .kind small { font-size: 11.5px; color: var(--rhp-muted); font-variant-numeric: tabular-nums; }
    .seg { --rhp-radius: 2px; }
    .half { --rhp-tick-width: 1px; opacity: .55; }
    .p { position: absolute; top: 50%; translate: 0 -50%; font-size: 12px; font-weight: 750; color: var(--rhp-ink); white-space: nowrap; font-variant-numeric: tabular-nums; }
    .p.l { left: 6px; }
    .p.r { right: 6px; }
  `,
}, (t) => (
  <div>
    <Label edge="start" class="kind"><b>{t.label}</b><small>{short(t.total)} votes</small></Label>
    <Bar class="seg" from={0} to={t.a} color={t.ca} />
    <Bar class="seg" from={100 - t.b} to={100} color={t.cb} />
    <Tick class="half" at={50} thick={1} color="ink" />
    <Place at={0}><span class="p l">{LETTER[t.pa]} {Math.round(t.a)}%</span></Place>
    <Place at={100}><span class="p r">{Math.round(t.b)}% {LETTER[t.pb]}</span></Place>
  </div>
));

// For each way of voting the state reports: its votes, and the two main candidates' shares of them
export function castRows(r, vt) {

  const [a, b] = sides(r);
  if (!a || !b || !r.total) return [];
  const sum = (k) => Object.values(vt).reduce((s, v) => s + (v[k] || 0), 0);
  // Mail and early votes when the state reports them apart, otherwise the votes cast before election day together
  const split = sum("mail") + sum("early") > 0;
  return TYPES
    .filter(([k]) => (split ? k !== "advance" : k !== "mail" && k !== "early"))
    .map(([k, label]) => {
      const total = sum(k);
      const va = vt[a.id]?.[k] || 0, vb = vt[b.id]?.[k] || 0;
      return { key: k, label, total, a: total ? (va / total) * 100 : 0, b: total ? (vb / total) * 100 : 0, ca: tone(a.party, false), cb: tone(b.party, false), pa: a.party, pb: b.party };
    })
    .filter((t) => t.total > 0);
}

export function Cast(props) {

  const Type = createMemo(() => makeType(!narrow()));
  return (
    <Show when={props.rows.length >= 2}>
      <Show when={Type()} keyed>
        {(S) => (
          <Chart scale={[0, 100]} ticks={false} theme={THEME} label="How each way of voting split between the two main candidates">
            <Plot rows={props.rows} key="key">{S}</Plot>
          </Chart>
        )}
      </Show>
    </Show>
  );
}
