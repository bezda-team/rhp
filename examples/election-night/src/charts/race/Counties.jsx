// County by county: a board of every county's margin now, with a tick at the 2024 presidential margin there,
// and beside it the same counties as dots, 2024 across and now up, so a county above the diagonal moved left.
// Pointing at a county in either lights it in both.

import { Show, For, createMemo, createSignal } from "solid-js";
import { Chart, Plot, Bar, Tick, Label, Dot, Line, Place, slat } from "@bezda/rhp";
import { THEME } from "../../theme.js";
import { tone, pct, pts, votes, short, sides } from "../../format.js";
import { narrow } from "../../narrow.js";

export const [hotCounty, setHotCounty] = createSignal(null);
const [pinnedCounty, setPinnedCounty] = createSignal(null);
export const focusCounty = () => hotCounty() ?? pinnedCounty();

// A county's margin, Democrat minus Republican when both run, otherwise the leader's margin signed by side
export const value = (c) => (c.dm != null ? c.dm : c.total ? c.lean : null);
const shift = (c) => (value(c) != null && c.pres24 != null ? value(c) - c.pres24 : null);
const signed = (v, up, down) => (Math.abs(v) < 0.05 ? "even" : `${v > 0 ? up : down}+${pts(v)}`);

const SORTS = {
  size: { label: "Most votes", short: "Size", key: (c) => -(c.expected || c.total) },
  left: { label: "Most left", short: "Left", key: (c) => -c.remaining },
  shift: { label: "Biggest shift", short: "Shift", key: (c) => (shift(c) == null ? Infinity : -Math.abs(shift(c))) },
  name: { label: "A to Z", short: "Name", key: (c) => c.name },
};

// A unit's name as the board prints it: "District 12" for Alaska's state house districts
export const unitLabel = (c) => c.name.replace(/^State House District /, "District ");

// On a phone the margin moves to the end column, in place of the share counted (the bar's paleness says that)
const makeCounty = (wide, up, down, compare) => slat({
  thickness: 30,
  room: wide ? { start: 128, end: 54 } : { start: 84, end: 46 },
  inset: 0.22,
  css: `
    .slat { border-radius: 6px; cursor: default; }
    .slat.hot { background: color-mix(in srgb, var(--rhp-ink) 8%, transparent); }
    .slat:focus-visible { outline: 2px solid var(--rhp-ink); outline-offset: -2px; }
    .name { font-size: 13px; font-weight: 600; }
    .bar { --rhp-radius: 2px; }
    .was { --rhp-tick-width: 2px; }
    .mg { font-size: 11.5px; font-weight: 700; color: var(--rhp-ink); font-variant-numeric: tabular-nums; }
    .in { font-size: 11.5px; color: var(--rhp-muted); font-variant-numeric: tabular-nums; }
  `,
}, (c) => (
  <div class={focusCounty() === c.id ? "slat hot" : "slat"} data-county={c.id}
    aria-label={`${c.name}: ${c.total ? signed(value(c) ?? 0, up, down) : "no votes yet"}${compare && c.pres24 != null ? `, 2024 ${signed(c.pres24, "D", "R")}` : ""}, ${pct(c.eevp)} counted`}>
    <Label edge="start" class="name">{unitLabel(c)}</Label>
    <Bar class="bar" from={0} to={value(c)} color={tone(c.leader, c.eevp >= 95)} />
    <Show when={compare}><Tick class="was" at={c.pres24} thick={0.9} color="ink" /></Show>
    <Show when={wide && c.total > 0}>
      <Label class="mg" at={value(c)} side={value(c) < 0 ? "before" : "after"}>{signed(value(c), up, down)}</Label>
    </Show>
    <Label edge="end" class={wide ? "in" : "mg"}>{c.total ? (wide ? pct(c.eevp) : signed(value(c), up, down)) : "–"}</Label>
  </div>
));

const Zero = slat({ room: {}, css: `.zero { --rhp-tick-width: 1px; opacity: .6; }` }, () => <Tick class="zero" at={0} thick={1} color="ink" />);

const Point = slat({
  room: {},
  css: `
    .pt { opacity: .82; box-shadow: 0 0 0 1px var(--paper); cursor: default; }
    .pt.hot { opacity: 1; box-shadow: 0 0 0 2px var(--paper), 0 0 0 4px var(--rhp-ink); z-index: 2; }
  `,
}, (p) => <Dot class={p.hot ? "pt hot" : "pt"} at={p.pres24} cross={p.now} size={p.size} color={p.color} data-county={p.id} />);

const Diagonal = slat({
  room: {},
  css: `
    .diag { --rhp-color: var(--rhp-muted); opacity: .7; }
    .lab { position: absolute; font-size: 11px; font-weight: 700; white-space: nowrap; color: var(--rhp-muted); }
    .lab.nc { translate: -100% -140%; rotate: -45deg; transform-origin: 100% 100%; }
    .lab.ul { left: 4px; top: 4px; color: var(--rhp-series-1); }
    .lab.lr { right: 4px; bottom: 4px; color: var(--rhp-series-2); }
  `,
}, (d) => (
  <div>
    <Line class="diag" points={[[-d.s, -d.s], [d.s, d.s]]} />
    <Place at={-d.s} cross={d.s}><span class="lab ul">↖ Moved toward {d.up}</span></Place>
    <Place at={d.s} cross={-d.s}><span class="lab lr">Moved toward {d.down} ↘</span></Place>
  </div>
));

export function Counties(props) {

  const r = () => props.race;
  // Tonight's results by default; props.compare adds the 2024 margins (the tick, the scatter, the sorts by shift)
  const compare = () => !!props.compare;
  const [sort, setSort] = createSignal("size");
  const [all, setAll] = createSignal(false);
  const up = () => (sides(r())[0]?.party === "I" ? "I" : "D");
  const down = () => "R";
  const list = () => props.counties;
  const span = createMemo(() => {
    // Room past the widest bar for its number
    const m = Math.max(20, ...list().map((c) => Math.abs(value(c) ?? 0) * (narrow() ? 1 : 1.15)), ...(compare() ? list().map((c) => Math.abs(c.pres24 ?? 0)) : []));
    return Math.min(120, Math.ceil(m / 20) * 20);
  });
  // The scatter's square: just wide enough for every county, then and now
  const square = createMemo(() => {
    const m = Math.max(20, ...list().map((c) => Math.abs(value(c) ?? 0)), ...list().map((c) => Math.abs(c.pres24 ?? 0)));
    return Math.min(100, Math.ceil(m / 20) * 20);
  });
  const squareTicks = () => {
    const s = square();
    const step = s > 60 ? 40 : 20;
    const out = [];
    for (let v = 0; v <= s; v += step) {
      out.push(v);
      if (v) out.unshift(-v);
    }
    return out;
  };
  const order = createMemo(() => {
    const key = SORTS[sort()].key;
    const ranked = list().map((c, i) => [key(c), i]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]));
    const pos = new Array(list().length).fill(null);
    ranked.forEach(([, i], p) => {
      if (all() || p < 15) pos[i] = p;
    });
    return pos;
  });
  const County = createMemo(() => makeCounty(!narrow(), up(), down(), compare()));
  const ticks = () => {
    const s = span();
    const step = narrow() ? (s > 60 ? 50 : 20) : s > 100 ? 50 : s > 60 ? 40 : 20;
    const out = [];
    for (let v = 0; v <= s; v += step) {
      out.push(v);
      if (v) out.unshift(-v);
    }
    return out;
  };
  const fmt = (v) => (v === 0 ? "even" : `${v > 0 ? up() : down()}+${Math.abs(v)}`);
  const points = createMemo(() => {
    const max = Math.max(1, ...list().map((c) => c.total));
    return list()
      .filter((c) => c.total > 0 && value(c) != null && c.pres24 != null)
      .map((c) => ({ id: c.id, pres24: c.pres24, now: value(c), size: `${(5 + 22 * Math.sqrt(c.total / max)).toFixed(1)}px`, color: tone(c.leader, true), hot: focusCounty() === c.id }));
  });
  const focused = () => list().find((c) => c.id === focusCounty());
  // "Ossoff leads in 48 counties, Collins in 111; 23 have counted nearly all their votes"
  const tally = () => {
    const counted = list().filter((c) => c.total > 0);
    if (!counted.length) return "No votes are counted yet. Point at a county, or tap it.";
    const byCand = {};
    for (const c of counted) {
      const [id] = Object.entries(c.votes).sort((a, b) => b[1] - a[1])[0] || [];
      if (id) byCand[id] = (byCand[id] || 0) + 1;
    }
    const names = r().cands.filter((c) => byCand[c.id]).map((c) => `${c.last} in ${byCand[c.id]}`);
    const done = counted.filter((c) => c.eevp >= 95).length;
    return `Leading: ${names.join(", ")} of the ${counted.length} ${props.unit || "counties"} with votes; ${done} ${done === 1 ? "has" : "have"} counted nearly all.`;
  };
  // A county's two leading candidates and their shares: "Ossoff 61%, Collins 39%"
  const leaders = (c) => r().cands
    .map((x) => [x, c.votes[x.id] || 0])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([x, v]) => `${x.last} ${pct((v / c.total) * 100)}`)
    .join(", ");
  const idOf = (el) => el?.closest?.("[data-county]")?.dataset.county || null;
  const point = (e) => { if (e.pointerType !== "touch") setHotCounty(idOf(e.target)); };
  const pick = (e) => { const id = idOf(e.target); if (id) setPinnedCounty(pinnedCounty() === id ? null : id); };

  const moved = createMemo(() => {
    const done = list().filter((c) => c.eevp >= 95 && shift(c) != null);
    if (done.length < 3) return null;
    const weight = done.reduce((s, c) => s + c.total, 0);
    const avg = done.reduce((s, c) => s + shift(c) * c.total, 0) / weight;
    return { n: done.length, avg };
  });

  return (
    <div class="counties" onPointerLeave={() => setHotCounty(null)}>
      <p class="readout num" aria-live="polite">
        <Show when={focused()} fallback={
          <span class="hint">
            <Show when={compare()} fallback={tally()}>
              <Show when={moved()} fallback="Point at a county, or tap it, to compare it with 2024.">
                {(m) => `In the ${m().n} ${props.unit || "counties"} that have counted nearly all their votes, the margin moved ${pts(Math.abs(m().avg))} points toward ${m().avg >= 0 ? (up() === "D" ? "Democrats" : "the independent") : "Republicans"} since the 2024 presidential race.`}
              </Show>
            </Show>
          </span>
        }>
          {(c) => (
            <>
              <b>{unitLabel(c())}</b>{": "}
              {c().total ? `now ${signed(value(c()) ?? 0, up(), down())}` : "no votes yet"}
              {compare() && c().pres24 != null ? `, 2024 ${signed(c().pres24, "D", "R")}` : ""}
              {compare() && shift(c()) != null && c().total ? ` (moved ${signed(shift(c()), up(), down())})` : ""}
              {!compare() && c().total ? ` · ${leaders(c())}` : ""}
              {` · ${pct(c().eevp)} counted, ${short(c().remaining)} left`}
            </>
          )}
        </Show>
      </p>
      <div class={compare() && props.board !== false ? "county-grid" : "county-grid solo"}>
        <Show when={props.board !== false}>
        <div>
          <div class="tools">
            <span class="hint">{compare() ? "Bar: the margin now. Tick: the 2024 presidential margin." : "Bar: the leader's margin. Pale while counting, solid once 95% is in."}</span>
            <div class="seg" role="group" aria-label="Sort the counties">
              <For each={Object.keys(SORTS).filter((k) => compare() || k !== "shift")}>
                {(k) => <button aria-pressed={sort() === k} onClick={() => setSort(k)}>{narrow() ? SORTS[k].short : SORTS[k].label}</button>}
              </For>
            </div>
          </div>
          <div onPointerMove={point} onClick={pick} onFocusIn={(e) => setHotCounty(idOf(e.target))}
            onKeyDown={(e) => { if (e.key === "Enter") pick(e); }}>
            <Show when={County()} keyed>
              {(S) => (
                <Chart scale={[-span(), span()]} ticks={ticks()} format={fmt} theme={THEME} label="Each county's margin now, and in the 2024 presidential race">
                  <Plot overlap={true} slats={1} style={{ "pointer-events": "none" }}>{Zero}</Plot>
                  <Plot rows={list()} key="id" keyboard={true} order={order()}>{S}</Plot>
                </Chart>
              )}
            </Show>
          </div>
          <Show when={list().length > 15}>
            <button class="more" onClick={() => setAll(!all())}>{all() ? "Show the 15 first" : `Show all ${list().length} ${props.unit || "counties"}`}</button>
          </Show>
        </div>
        </Show>
        <Show when={compare() && points().length >= 3}>
          <figure class="scatter" onPointerMove={point} onClick={pick}>
            <figcaption class="hint">2024 presidential margin across, margin now up. Dot size: votes counted.</figcaption>
            <Chart scale={[-square(), square()]} ticks={squareTicks()} format={fmt} cross={[-square(), square()]} crossTicks={squareTicks()} crossFormat={fmt}
              aspect={1} theme={THEME} label="Counties: the 2024 presidential margin against the margin now">
              <Plot overlap={true} slats={1} s={square()} up={up() === "D" ? "Democrats" : "the independent"} down="Republicans" style={{ "pointer-events": "none" }}>{Diagonal}</Plot>
              <Plot overlap={true} rows={points()} key="id">{Point}</Plot>
            </Chart>
          </figure>
        </Show>
      </div>
    </div>
  );
}
