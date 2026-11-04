// The path to a majority: every seat on one line. The seats not up tonight sit at the two ends, drawn short and
// labeled with their count; between them, the races tonight from the safest Democratic lead to the safest
// Republican one. The race on the majority seat (the Senate's 51st, the House's 218th) is the tipping point.
// The House's 435 seats run in rows (two on a computer, three on a phone), so each one stays wide enough to point at.

import { Show, createMemo, createSignal } from "solid-js";
import { Chart, Plot, Bar, Place, Label, slat } from "@bezda/rhp";
import { THEME } from "../../theme.js";
import { feed, raceById } from "../../feed/store.js";
import { tone, sides, pct, statusText } from "../../format.js";
import { go, raceLink, hot, setHot } from "../../route.js";
import { narrow } from "../../narrow.js";
import { lineScore, ranks, MAJORITY, SEAT } from "./order.js";

const CAP = 4;

export const ordinal = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th");

const Block = slat({
  room: {},
  css: `
    .w { pointer-events: none; }
    .blk { --rhp-radius: 3px; --rhp-length-time: .9s; --rhp-length-ease: cubic-bezier(.3, .7, .2, 1); pointer-events: auto; cursor: pointer; box-shadow: inset 0 0 0 1px var(--paper); }
    .blk.thin { --rhp-radius: 1px; box-shadow: inset 0.5px 0 0 0 var(--paper); }
    .blk.closed:not(.thin)::after { content: ""; position: absolute; inset: 0; border-radius: inherit; background: var(--hatch); }
    .blk.upcoming { opacity: .55; }
    .w.hot .blk, .w:focus-visible .blk { box-shadow: inset 0 0 0 2px var(--rhp-ink); }
    .w.hot .blk.thin { box-shadow: 0 0 0 1.5px var(--rhp-ink); z-index: 2; }
    .w:focus-visible { outline: none; }
    .pc { position: absolute; top: 4px; translate: -50% 0; font-size: 9px; font-weight: 750; color: var(--rhp-muted); white-space: nowrap; }
    .w.tip .pc, .w.hot .pc { color: var(--rhp-ink); }
    .w.tip .blk { outline: 2px solid var(--rhp-ink); outline-offset: 1px; }
    /* A ring drawn outside its block would sit under the next slat: the slat with a ring comes to the front */
    .w.tip, .w.hot, .w:focus-visible { z-index: 2; }
    .w.tip.hot { z-index: 3; }
    @media (prefers-reduced-motion: reduce) { .blk { --rhp-length-time: 0s; } }
  `,
}, (d) => {
  const r = () => d.race;
  const color = () => {
    const x = r();
    if (x.status === "called") return tone(x.winner, true);
    if (x.status === "counting") return tone(x.leader, false);
    return "surface";
  };
  return (
    <div class={`w${hot() === d.id ? " hot" : ""}${d.tip ? " tip" : ""}`} data-id={d.id} aria-label={`${r().label}: ${statusText(r())}`}>
      <Bar class={`blk ${r().status}${d.thin ? " thin" : ""}`} from={d.col} to={d.col + 1} color={color()} thick={0.62} data-id={d.id} />
      <Show when={d.labels}>
        <Place at={d.col + 0.5} across={1}><span class="pc">{r().state}</span></Place>
      </Show>
    </div>
  );
});

// A row of seats: the seats not up at its ends (the first and last rows), the races, and the majority's flag.
// The House's rows are numbered by their first seat, and name the majority seat at the end of its row.
const makeRow = (thickness, labels, numbered) => slat({
  thickness,
  room: numbered ? { start: 34, end: narrow() ? 58 : 92, before: 6, after: 4 } : { before: 30, after: labels ? 18 : 4 },
  css: `
    .cap { --rhp-radius: 3px; opacity: .9; }
    .n { position: absolute; translate: -50% -50%; font-size: 12px; font-weight: 800; color: var(--on); white-space: nowrap; font-variant-numeric: tabular-nums; }
    .t { position: absolute; top: 4px; translate: -50% 0; font-size: 10px; font-weight: 650; color: var(--rhp-muted); white-space: nowrap; }
    .f { position: absolute; bottom: 4px; translate: -50% 0; display: grid; justify-items: center; gap: 2px; white-space: nowrap; font-size: 11px; font-weight: 750; color: var(--rhp-ink); pointer-events: none; }
    .f span { padding: 0 4px; border-radius: 4px; background: var(--paper); }
    .f.end { translate: calc(-100% + 4px) 0; justify-items: end; }
    .f.start { translate: -4px 0; justify-items: start; }
    .f::after { content: ""; width: 1.5px; height: 8px; background: var(--rhp-ink); }
    .no { font-size: 10.5px; font-weight: 650; color: var(--rhp-muted); font-variant-numeric: tabular-nums; }
    .tipname { font-size: 11px; font-weight: 750; color: var(--rhp-ink); }
  `,
}, (row) => (
  <div>
    <Show when={row.capL}>
      <div style={{ "pointer-events": "none" }}>
        <Bar class="cap" from={-CAP} to={0} color="series-1" thick={0.62} />
        <Place at={-CAP / 2}><span class="n" style={{ "--on": "var(--on-dem)" }}>{row.capL}</span></Place>
        <Show when={labels}><Place at={-CAP / 2} across={1}><span class="t">not up</span></Place></Show>
      </div>
    </Show>
    <Show when={row.capR}>
      <div style={{ "pointer-events": "none" }}>
        <Bar class="cap" from={row.per} to={row.per + CAP} color="series-2" thick={0.62} />
        <Place at={row.per + CAP / 2}><span class="n" style={{ "--on": "var(--on-rep)" }}>{row.capR}</span></Place>
        <Show when={labels}><Place at={row.per + CAP / 2} across={1}><span class="t">not up</span></Place></Show>
      </div>
    </Show>
    <Show when={numbered}><Label edge="start" class="no">{row.first}</Label></Show>
    <Plot overlap={true} rows={row.seats} key="id" keyboard={true}>{Block}</Plot>
    <Show when={row.tip != null && !numbered}>
      <Place at={row.tip + 0.5} across={0.19}><span class={`f${row.tip > row.per * 0.9 ? " end" : row.tip < row.per * 0.1 ? " start" : ""}`}><span>{row.flag}</span></span></Place>
    </Show>
    <Show when={row.tip != null && numbered}><Label edge="end" class="tipname">← {narrow() ? row.flag.split(" ")[0] : row.flag}</Label></Show>
  </div>
));

export function Ladder(props) {

  const races = createMemo(() => feed.races.filter((r) => r.office === props.office));
  const c = () => feed.control[props.office];
  const nD = () => (c() ? c().notUp.D + c().notUp.I : 0);
  const nR = () => (c() ? c().notUp.R : 0);
  const caps = () => nD() + nR() > 0;
  const line = createMemo(() => ranks(races(), lineScore));
  const majority = () => (c() ? MAJORITY(props.office, c()) : 0);
  // The majority seat from the Democrats' end, among tonight's races
  const tipIndex = () => majority() - 1 - nD();
  const tip = () => {
    const id = line().order[tipIndex()];
    return id ? raceById(id) : null;
  };
  // The House's 435 seats in rows as wide as the Senate's blocks: 44 a row on a computer, 22 on a phone
  const count = () => (props.office === "H" ? Math.ceil(races().length / (narrow() ? 22 : 44)) : 1);
  const per = () => Math.ceil(races().length / count());
  const labels = () => !narrow() && per() <= 40;
  const rows = createMemo(() => {
    const k = count(), p = per(), t = tipIndex(), thin = p > 60;
    const out = Array.from({ length: k }, (_, i) => ({ seats: [], per: p, first: i * p + nD() + 1, capL: i === 0 && caps() ? nD() : 0, capR: i === k - 1 && caps() ? nR() : 0, tip: null, flag: "" }));
    for (const race of races()) {
      const pos = line().rank.get(race.id);
      out[Math.floor(pos / p)].seats.push({ id: race.id, race, col: pos % p, tip: pos === t, thin, labels: labels() });
    }
    if (t >= 0 && t < races().length) Object.assign(out[Math.floor(t / p)], { tip: t % p, flag: `${ordinal(majority())} ${SEAT[props.office]}` });
    return out;
  });
  const Row = createMemo(() => makeRow(props.office === "H" ? (narrow() ? 26 : 30) : narrow() ? 52 : 60, labels(), count() > 1));

  const [picked, setPicked] = createSignal(null);
  const idOf = (el) => el?.closest?.("[data-id]")?.dataset.id || null;
  const shown = () => {
    const id = hot() || picked();
    const r = id && raceById(id);
    return r && r.office === props.office ? r : null;
  };

  return (
    <Show when={c() && races().length}>
      <div class="ladder">
        <p class="readout" aria-live="polite">
          <Show when={shown()} fallback={<TipLine race={tip()} office={props.office} seat={majority()} />}>
            {(r) => {
              const a = () => sides(r())[0];
              const b = () => sides(r())[1];
              const seat = () => line().rank.get(r().id) + nD() + 1;
              return (
                <>
                  <b>{r().label}</b>{", the "}{ordinal(seat())}{` ${SEAT[props.office]}: `}
                  <Show when={r().total > 0} fallback={statusText(r())}>
                    {a() ? `${a().last} ${pct(a().pct)}` : ""}{b() ? `, ${b().last} ${pct(b().pct)}` : ""}{" · "}{statusText(r())}
                  </Show>
                  <Show when={picked() === r().id}>{" · "}<a href={raceLink(r().id)}>Open the race →</a></Show>
                </>
              );
            }}
          </Show>
        </p>
        <div class="ladder-chart"
          onPointerMove={(e) => { if (e.pointerType !== "touch") setHot(idOf(e.target)); }}
          onPointerLeave={(e) => { if (e.pointerType !== "touch") setHot(null); }}
          onClick={(e) => {
            const id = idOf(e.target);
            if (!id) return;
            // A finger picks first, since a block is narrow on a phone; a mouse opens the race
            if (e.pointerType === "touch" || (e.pointerType === "" && narrow())) {
              if (picked() === id) go(raceLink(id));
              else setPicked(id);
            } else go(raceLink(id));
          }}
          onKeyDown={(e) => { if (e.key === "Enter") { const id = idOf(e.target); if (id) go(raceLink(id)); } }}
          onFocusIn={(e) => setHot(idOf(e.target))}
          onFocusOut={() => setHot(null)}>
          <Show when={Row()} keyed>
            {(R) => (
              <Chart scale={[caps() ? -CAP : 0, per() + (caps() ? CAP : 0)]} ticks={false} theme={THEME}
                label={`Every ${SEAT[props.office]}, from the safest Democratic one to the safest Republican one`}>
                <Plot rows={rows()}>{R}</Plot>
              </Chart>
            )}
          </Show>
        </div>
        <div class="ladder-ends hint">
          <span>← Safest Democratic {SEAT[props.office]}s</span>
          <span>Safest Republican {SEAT[props.office]}s →</span>
        </div>
        <Show when={count() > 1}>
          <p class="hint">The line runs on, row after row: the number before each row is its first seat.</p>
        </Show>
      </div>
    </Show>
  );
}

function TipLine(props) {

  return (
    <Show when={props.race} fallback={<span class="hint">Point at a {SEAT[props.office]} to see its race.</span>}>
      {(r) => {
        const a = () => sides(r())[0];
        const b = () => sides(r())[1];
        const lead = () => (r().total > 0 ? r().cands[0] : null);
        return (
          <>
            <span class="tipdot" />The {ordinal(props.seat)} {SEAT[props.office]} is <b>{r().label}</b>
            {r().status === "called" ? `, won by ${r().cands.find((x) => x.won)?.last}` : lead() ? `, where ${lead().last} leads with ${pct(r().eevp)} counted` : `: ${a()?.last || ""}${b() ? ` vs. ${b().last}` : ""}, ${statusText(r()).toLowerCase()}`}
          </>
        );
      }}
    </Show>
  );
}

export function tippingRace(office = "S") {

  const races = feed.races.filter((r) => r.office === office);
  const c = feed.control[office];
  if (!c || !races.length) return null;
  const { order } = ranks(races, lineScore);
  const id = order[MAJORITY(office, c) - 1 - c.notUp.D - c.notUp.I];
  return id ? raceById(id) : null;
}
