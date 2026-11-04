// The balance of power in one chamber: seats each party has (won tonight or not up), seats it leads in the count,
// and the seats still open, on one bar from the Democrats' end to the Republicans', with the majority marked.

import { Show, createMemo } from "solid-js";
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
    return list.map((p) => ({ ...p, from: at, to: (at += p.n) }));
  });
  const mid = () => c().total / 2;

  return (
    <Show when={c()}>
      <div class="control" style={{ "--thick": props.thick || "26px" }}>
        <Chart scale={[0, c().total]} ticks={false} theme={THEME} height={props.height || 26} label={props.label}>
          <Plot overlap={true} rows={parts()}>{Segment}</Plot>
          <Plot overlap={true} slats={1} at={mid()} text={props.flag || ""} style={{ "pointer-events": "none" }}>{Majority}</Plot>
        </Chart>
      </div>
    </Show>
  );
}
