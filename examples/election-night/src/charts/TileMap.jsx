// The country as a grid of equal tiles, one per state: solid where a race is called, pale where a candidate
// leads the count, striped where polls have closed and nothing is counted yet, and the closing time before that.
// Eight slats of twelve Cells: the heatmap's technique.

import { Show, createMemo } from "solid-js";
import { Chart, Plot, Cell, slat } from "@bezda/rhp";
import { THEME } from "../theme.js";
import { feed, raceById } from "../feed/store.js";
import { tone, sides, pct, pts, statusText, etHour, officeName } from "../format.js";
import { STATES } from "../feed/normalize.js";
import { go, raceLink, hot, setHot } from "../route.js";

const GRID = [
  ["AK", 0, 0], ["ME", 11, 0],
  ["VT", 10, 1], ["NH", 11, 1],
  ["WA", 0, 2], ["ID", 1, 2], ["MT", 2, 2], ["ND", 3, 2], ["MN", 4, 2], ["IL", 5, 2], ["WI", 6, 2], ["MI", 7, 2], ["NY", 8, 2], ["RI", 9, 2], ["MA", 10, 2],
  ["OR", 0, 3], ["NV", 1, 3], ["WY", 2, 3], ["SD", 3, 3], ["IA", 4, 3], ["IN", 5, 3], ["OH", 6, 3], ["PA", 7, 3], ["NJ", 8, 3], ["CT", 9, 3],
  ["CA", 0, 4], ["UT", 1, 4], ["CO", 2, 4], ["NE", 3, 4], ["MO", 4, 4], ["KY", 5, 4], ["WV", 6, 4], ["VA", 7, 4], ["MD", 8, 4], ["DE", 9, 4],
  ["AZ", 1, 5], ["NM", 2, 5], ["KS", 3, 5], ["AR", 4, 5], ["TN", 5, 5], ["NC", 6, 5], ["SC", 7, 5], ["DC", 8, 5],
  ["OK", 3, 6], ["LA", 4, 6], ["MS", 5, 6], ["AL", 6, 6], ["GA", 7, 6],
  ["HI", 0, 7], ["TX", 3, 7], ["FL", 8, 7],
];
const COLS = 12;
const ROWS = 8;
const LINES = Array.from({ length: ROWS }, (_, row) => Array.from({ length: COLS }, (_, col) => GRID.find((g) => g[1] === col && g[2] === row)?.[0] || ""));

// The slat types close over the map's own lookup, state code to race: data groups hold values, not functions
const makeTile = (raceOf) => slat({
  css: `
    .cell { --rhp-radius: 6px; --rhp-cell-gap: 3px; cursor: pointer; }
    .cell.none { cursor: default; }
    .cell.closed::after { content: ""; position: absolute; inset: 0; border-radius: inherit; background: var(--hatch); }
    .cell.hot, .cell:hover:not(.none) { box-shadow: inset 0 0 0 2px var(--rhp-ink); }
    .t { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; line-height: 1.05; color: var(--rhp-ink); pointer-events: none; }
    .t b { font-size: clamp(9px, 1.25vw, 13px); font-weight: 800; letter-spacing: .02em; }
    .t small { font-size: clamp(7.5px, .95vw, 10.5px); font-weight: 600; opacity: .85; font-variant-numeric: tabular-nums; }
    .t.blank { color: var(--rhp-muted); opacity: .5; }
    .t.solid.D { color: var(--on-dem); }
    .t.solid.R { color: var(--on-rep); }
    .t.solid.I { color: var(--on-ind); }
  `,
}, (c) => {
  const r = () => raceOf(c.st);
  const kind = () => (!c.st ? "empty" : !r() ? "none" : r().status);
  const color = () => {
    const x = r();
    if (!c.st) return "transparent";
    if (!x) return "grid";
    if (x.status === "called") return tone(x.winner, true);
    if (x.status === "counting") return tone(x.leader, false);
    if (x.status === "closed") return "surface";
    return "grid";
  };
  const small = () => {
    const x = r();
    if (!x) return "";
    if (x.status === "called") return "✓";
    if (x.status === "counting") return `${x.leader}+${pts(x.margin)}`;
    if (x.status === "upcoming") return etHour(x.closesAt).replace(" p.m.", "p").replace(" a.m.", "a").replace("midnight", "12a");
    return "";
  };
  return (
    <div>
      <Cell class={`cell ${kind()}${r() && hot() === r().id ? " hot" : ""}`} color={color()} data-st={c.st || undefined}
        title={c.st ? STATES[c.st] : undefined}>
        <Show when={c.st}>
          <span class={`t ${r() ? "" : "blank"} ${r()?.status === "called" ? `solid ${r().winner}` : ""}`}>
            <b>{c.st}</b>
            <small>{small()}</small>
          </span>
        </Show>
      </Cell>
    </div>
  );
});

const makeLine = (Tile) => slat({ room: { start: 0, end: 0 } }, (d) => (
  <div><Plot orientation="across" st={d.cells}>{Tile}</Plot></div>
));

export function TileMap(props) {

  // The race in each state for this office (a state holds at most one Senate race tonight)
  const byState = createMemo(() => {
    const m = {};
    for (const r of feed.races) {
      if (r.office === props.office) m[r.state] = r.id;
    }
    return m;
  });
  const raceOf = (st) => (st && byState()[st] ? raceById(byState()[st]) : null);
  const Line = makeLine(makeTile(raceOf));
  const stOf = (el) => el?.closest?.("[data-st]")?.dataset.st || null;
  const shown = () => {
    const id = hot();
    const r = id && raceById(id);
    return r && r.office === props.office ? r : null;
  };

  return (
    <div class="tilemap">
      <p class="readout" aria-live="polite">
        <Show when={shown()} fallback={<span class="hint">{props.hint || "Point at a state, or tap it to open its race."}</span>}>
          {(r) => {
            // Read in functions: the same readout shows whichever race the pointer is on
            const a = () => sides(r())[0];
            const b = () => sides(r())[1];
            return (
              <>
                <b>{r().label}</b>{": "}
                <Show when={r().total > 0} fallback={statusText(r())}>
                  {a() ? `${a().last} ${pct(a().pct)}` : ""}{b() ? `, ${b().last} ${pct(b().pct)}` : ""}{" · "}{statusText(r())}
                </Show>
              </>
            );
          }}
        </Show>
      </p>
      <div
        onPointerMove={(e) => { if (e.pointerType !== "touch") { const r = raceOf(stOf(e.target)); setHot(r ? r.id : null); } }}
        onPointerLeave={() => setHot(null)}
        onClick={(e) => { const r = raceOf(stOf(e.target)); if (r) go(raceLink(r.id)); }}>
        <Chart scale={[0, COLS]} ticks={false} theme={THEME} aspect={COLS / ROWS} label={`Map of ${officeName(props.office)} races by state`}>
          <Plot cells={LINES}>{Line}</Plot>
        </Chart>
      </div>
      <div class="key" aria-hidden="true">
        <span><i class="sw" style={{ background: "var(--dem)" }} /><i class="sw" style={{ background: "var(--rep)" }} />Called</span>
        <span><i class="sw" style={{ background: "var(--dem-soft)" }} /><i class="sw" style={{ background: "var(--rep-soft)" }} />Leading</span>
        <span><i class="sw hatch" />Polls closed, no votes</span>
        <span><i class="sw" style={{ background: "var(--grid)" }} />Polls open</span>
      </div>
    </div>
  );
}
