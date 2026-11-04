// Every seat as a square, from the Democrats' side to the Republicans': not up tonight, called, leading, no result,
// leading, called, not up. The grid holds the chamber exactly (House 29 by 15, Senate 20 by 5, governors 25 by 2),
// so the ringed square is the majority seat: whichever party's color reaches it holds the majority.
// Each square is a Dot keyed by its race, so when a race changes group it moves to its new place.

import { Show, createMemo, createSignal } from "solid-js";
import { Chart, Plot, Dot, Place, slat } from "@bezda/rhp";
import { THEME } from "../../theme.js";
import { feed, raceById } from "../../feed/store.js";
import { tone, sides, pct, statusText } from "../../format.js";
import { go, raceLink, hot, setHot } from "../../route.js";
import { narrow } from "../../narrow.js";
import { groupScore, ranks, group, MAJORITY, SEAT } from "./order.js";
import { ordinal } from "./Ladder.jsx";

// The half circle of a legislature's chamber, as rows of seats on arcs from an inner radius to the outer one (1): each
// row holds seats in proportion to its length, as many rows as keep the seats evenly spaced along and across them.
// Seats are numbered by angle from the left, so each group of seats is a wedge. Returns each seat's center and the
// diameter a seat may take, in the same units (x from -1 to 1, y from 0 to 1).
const INNER = 0.38;
export function hemicycle(n) {

  // Seats along all the arcs, about 3.5 x rows x (rows - 1) at this inner radius: the rows for n seats
  const k = (Math.PI * (1 + INNER)) / 2 / (1 - INNER);
  const rows = Math.max(2, Math.round((1 + Math.sqrt(1 + (4 * n) / k)) / 2));
  const radii = Array.from({ length: rows }, (_, i) => INNER + ((1 - INNER) * i) / (rows - 1));
  const sum = radii.reduce((a, b) => a + b, 0);
  // Each row's share of the seats, rounded so the rows hold exactly n: the largest remainders get the seats left over
  const exact = radii.map((r) => (n * r) / sum);
  const counts = exact.map(Math.floor);
  exact.map((e, i) => [e - counts[i], i]).sort((a, b) => b[0] - a[0]).slice(0, n - counts.reduce((a, b) => a + b, 0)).forEach(([, i]) => counts[i]++);
  const seats = [];
  radii.forEach((r, row) => {
    for (let j = 0; j < counts[row]; j++) {
      const angle = counts[row] === 1 ? Math.PI / 2 : Math.PI * (1 - j / (counts[row] - 1));
      seats.push({ angle, r, x: r * Math.cos(angle), y: r * Math.sin(angle) });
    }
  });
  seats.sort((a, b) => b.angle - a.angle || a.r - b.r);
  const across = (1 - INNER) / (rows - 1);
  const along = Math.min(...radii.map((r, i) => (Math.PI * r) / Math.max(1, counts[i] - 1)));
  return { seats, dot: Math.min(across, along) * 0.84 };
}

// Columns by rows. On a phone every grid stands upright (the House 15 across), so its squares stay large.
const GRID = { H: [29, 15], S: [20, 5], G: [25, 2] };
const PHONE = { H: [15, 29], S: [10, 10], G: [10, 5] };

// A seat: a square in the grid, a dot in the half circle, at its x and y; size is a CSS length
const makeSeat = (size, round) => slat({
  room: {},
  css: `
    .sq { border-radius: ${round ? "50%" : "22%"}; cursor: pointer; --rhp-length-time: 1.1s; --rhp-length-ease: cubic-bezier(.3, .7, .2, 1); box-shadow: inset 0 0 0 0 var(--rhp-ink); }
    .sq.closed { background-image: var(--hatch); }
    .sq.upcoming { opacity: .6; }
    .sq.notup { cursor: default; }
    .sq.notup.D { box-shadow: inset 0 0 0 2px var(--rhp-series-1); }
    .sq.notup.R { box-shadow: inset 0 0 0 2px var(--rhp-series-2); }
    .sq.notup.I { box-shadow: inset 0 0 0 2px var(--rhp-series-3); }
    .sq.hot, .sq:focus-visible { box-shadow: inset 0 0 0 2px var(--rhp-ink); outline: none; }
    @media (prefers-reduced-motion: reduce) { .sq { --rhp-length-time: 0s; } }
  `,
}, (d) => {
  const r = () => d.race;
  const color = () => {
    const x = r();
    if (!x) return "transparent";
    if (x.status === "called") return tone(x.winner, true);
    if (x.status === "counting") return tone(x.leader, false);
    return "surface";
  };
  return (
    <Dot class={`sq ${r() ? r().status : `notup ${d.notUp}`}${r() && hot() === d.id ? " hot" : ""}`} at={d.x} cross={d.y}
      size={size} color={color()} data-id={r() ? d.id : undefined}
      title={r() ? undefined : `Not up this year: a ${d.notUp === "D" ? "Democratic" : d.notUp === "R" ? "Republican" : "independent"} seat`} />
  );
});

// The majority seat: a ring around its square or its dot
const makeRing = (size, round) => slat({
  room: {},
  css: `
    .ring { position: absolute; display: block; width: ${size}; height: ${size}; box-sizing: border-box; translate: -50% -50%; border: 2.5px solid var(--rhp-ink); border-radius: ${round ? "50%" : "28%"}; }
  `,
}, (m) => (
  <Place at={m.x} cross={m.y}><span class="ring" /></Place>
));

export function Seats(props) {

  return (
    <Show when={props.arc ? "arc" : (narrow() && PHONE[props.office]) || GRID[props.office]} keyed>
      {(g) => (g === "arc" ? <Grid office={props.office} arc={true} /> : <Grid office={props.office} cols={g[0]} rows={g[1]} upright={g === PHONE[props.office]} />)}
    </Show>
  );
}

function Grid(props) {

  const cols = props.cols, rowsN = props.rows;
  const races = createMemo(() => feed.races.filter((r) => r.office === props.office));
  const c = () => feed.control[props.office];
  const line = createMemo(() => ranks(races(), groupScore));
  const nD = () => (c() ? c().notUp.D + c().notUp.I : 0);
  const nR = () => (c() ? c().notUp.R : 0);
  // The majority seat from the Democrats' side, counting the seats not up
  const mid = () => (c() ? MAJORITY(props.office, c()) - 1 : 0);
  // The half circle's seats, for the chamber's number of seats
  const arc = createMemo(() => (props.arc && c() ? hemicycle(c().total) : null));
  // Seat i from the Democrats' side: in the half circle by angle; in the grid column by column from the left, or row
  // by row from the top when the grid stands upright
  const at = (i) => {
    if (arc()) return { x: arc().seats[i].x, y: arc().seats[i].y };
    const col = props.upright ? i % cols : Math.floor(i / rowsN);
    const row = props.upright ? Math.floor(i / cols) : i % rowsN;
    return { x: col + 0.5, y: rowsN - row - 0.5 };
  };
  const rows = createMemo(() => {
    const out = [];
    for (let i = 0; i < nD(); i++) {
      out.push({ id: `up-D-${i}`, race: null, notUp: "D", ...at(i) });
    }
    for (const race of races()) {
      out.push({ id: race.id, race, notUp: null, ...at(nD() + line().rank.get(race.id)) });
    }
    for (let i = 0; i < nR(); i++) {
      out.push({ id: `up-R-${i}`, race: null, notUp: "R", ...at(nD() + races().length + i) });
    }
    return out;
  });
  const counts = createMemo(() => {
    const n = [0, 0, 0, 0, 0, 0];
    for (const r of races()) {
      n[group(r)]++;
    }
    return { wonD: n[0], leadD: n[1], ind: n[2], none: n[3], leadR: n[4], wonR: n[5] };
  });
  const middle = () => {
    const id = line().order[mid() - nD()];
    return id ? raceById(id) : null;
  };
  // A seat's size: a share of the grid's column, or of the half circle's width (2.1 units across, 100cqw)
  const SPAN = 2.1;
  const seatSize = () => (props.arc ? `calc(100cqw * ${(arc()?.dot ?? 0.05) / SPAN})` : `calc(100cqw / ${cols} * .86)`);
  const ringSize = () => (props.arc ? `calc(100cqw * ${((arc()?.dot ?? 0.05) * 1.35) / SPAN})` : `calc(100cqw / ${cols} * 1.08)`);
  const Square = createMemo(() => makeSeat(seatSize(), props.arc));
  const Ring = createMemo(() => makeRing(ringSize(), props.arc));
  const noun = props.arc ? "dot" : "square";

  const [picked, setPicked] = createSignal(null);
  const idOf = (el) => el?.closest?.("[data-id]")?.dataset.id || null;
  const shown = () => {
    const id = hot() || picked();
    const r = id && raceById(id);
    return r && r.office === props.office ? r : null;
  };

  return (
    <Show when={races().length && c()}>
      <div class={`seats seats-${props.office}`}>
        <div class="seats-key num">
          <span class="d">
            <span><b>{counts().wonD}</b> Dem. won</span>
            <span><b>{counts().leadD}</b> leading</span>
            <Show when={nD()}><span class="up">{nD()} not up</span></Show>
          </span>
          <span class="mid"><span><b>{counts().none}</b> no result yet</span><Show when={counts().ind}><span>{counts().ind} independent</span></Show></span>
          <span class="r">
            <span>Rep. won <b>{counts().wonR}</b></span>
            <span>leading <b>{counts().leadR}</b></span>
            <Show when={nR()}><span class="up">{nR()} not up</span></Show>
          </span>
        </div>
        <p class="readout" aria-live="polite">
          <Show when={shown()} fallback={<MiddleLine race={middle()} office={props.office} seat={mid() + 1} noun={noun} />}>
            {(r) => {
              const a = () => sides(r())[0];
              const b = () => sides(r())[1];
              const seat = () => nD() + line().rank.get(r().id) + 1;
              return (
                <>
                  <b>{r().label}</b>{`, the ${ordinal(seat())} ${SEAT[props.office]} from the Democratic side: `}
                  <Show when={r().total > 0} fallback={statusText(r())}>
                    {a() ? `${a().last} ${pct(a().pct)}` : ""}{b() ? `, ${b().last} ${pct(b().pct)}` : ""}{" · "}{statusText(r())}
                  </Show>
                  <Show when={picked() === r().id}>{" · "}<a href={raceLink(r().id)}>Open →</a></Show>
                </>
              );
            }}
          </Show>
        </p>
        <div class="seats-chart"
          onPointerMove={(e) => { if (e.pointerType !== "touch") setHot(idOf(e.target)); }}
          onPointerLeave={(e) => { if (e.pointerType !== "touch") setHot(null); }}
          onClick={(e) => {
            const id = idOf(e.target);
            if (!id) return;
            if (e.pointerType === "touch" || (e.pointerType === "" && narrow())) {
              if (picked() === id) go(raceLink(id));
              else setPicked(id);
            } else go(raceLink(id));
          }}>
          <Show when={Square()} keyed>
            {(Seat) => (
              <Chart scale={props.arc ? [-SPAN / 2, SPAN / 2] : [0, cols]} cross={props.arc ? [-0.04, 1.06] : [0, rowsN]} ticks={false} crossTicks={false}
                theme={THEME} aspect={props.arc ? SPAN / 1.1 : cols / rowsN}
                label={`Every ${SEAT[props.office]} as a ${noun}, from Democratic to Republican; the ringed ${noun} is the majority ${SEAT[props.office]}`}>
                <Plot overlap={true} rows={rows()} key="id">{Seat}</Plot>
                <Plot overlap={true} slats={1} x={at(mid()).x} y={at(mid()).y} style={{ "pointer-events": "none" }}>{Ring()}</Plot>
              </Chart>
            )}
          </Show>
        </div>
        <div class="key" aria-hidden="true">
          <span><i class="sw" style={{ background: "var(--dem)" }} /><i class="sw" style={{ background: "var(--rep)" }} />Called</span>
          <span><i class="sw" style={{ background: "var(--dem-soft)" }} /><i class="sw" style={{ background: "var(--rep-soft)" }} />Leading the count</span>
          <span><i class="sw hatch" />Polls closed, no votes</span>
          <span><i class="sw" style={{ background: "var(--none)" }} />Polls open</span>
          <Show when={nD() + nR()}><span><i class="sw notup-key" /><i class="sw notup-key" />Not up this year</span></Show>
          <span><i class={props.arc ? "sw ring-key round" : "sw ring-key"} />The {ordinal(mid() + 1)} {SEAT[props.office]}</span>
        </div>
      </div>
    </Show>
  );
}

function MiddleLine(props) {

  return (
    <Show when={props.race} fallback={<span class="hint">Point at a {props.noun} to see its race.</span>}>
      {(r) => (
        <>
          The ringed {props.noun} is the {ordinal(props.seat)} {SEAT[props.office]} from the Democratic side, now <b>{r().label}</b>
          {r().status === "called" ? `, won by ${r().cands.find((x) => x.won)?.last}` : r().total > 0 ? `, where ${r().cands[0].last} leads with ${pct(r().eevp)} counted` : `, ${statusText(r()).toLowerCase().replace(/\.$/, "")}`}
          {`. Point at a ${props.noun} to see its race.`}
        </>
      )}
    </Show>
  );
}
