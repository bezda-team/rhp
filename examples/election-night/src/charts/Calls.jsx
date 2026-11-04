// Who has called what: the Senate and governor's races down the side, each news organization's decision desk across,
// a cell in the winner's color where a desk has called the race, with the time. The heatmap's technique.

import { Show, For, createMemo } from "solid-js";
import { Chart, Plot, Cell, Label, slat } from "@bezda/rhp";
import { THEME } from "../theme.js";
import { feed, liveDesks } from "../feed/store.js";
import { tone, et, officeName, counted, etHour } from "../format.js";
import { go, raceLink, hot, setHot } from "../route.js";
import { narrow } from "../narrow.js";

const Desk = slat({
  css: `
    .cell { --rhp-radius: 6px; --rhp-cell-gap: 3px; }
    .t { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; line-height: 1.1; font-size: 12px; font-weight: 700; color: var(--rhp-ink); pointer-events: none; font-variant-numeric: tabular-nums; }
    .t small { font-size: 10.5px; font-weight: 600; opacity: .85; white-space: nowrap; }
    .t span { white-space: nowrap; }
    .t.none { color: var(--rhp-muted); font-weight: 500; }
    .t.D { color: var(--on-dem); }
    .t.R { color: var(--on-rep); }
    .t.I { color: var(--on-ind); }
  `,
}, (c) => (
  <div>
    <Cell class="cell" color={c.call ? tone(c.call.party, true) : "grid"} title={c.call ? `${c.desk}: ${c.call.last}` : `${c.desk}: not called`}>
      <span class={`t ${c.call ? c.call.party : "none"}`}>
        {/* On a phone a box is a few letters wide: a check and the time, or a dash and the share counted */}
        <Show when={c.call} fallback={c.compact ? <><span>–</span><small>{c.brief}</small></> : <><span>Not yet</span><small>{c.counted}</small></>}>
          <span>✓{c.compact ? "" : ` ${c.call.last}`}</span>
          <small>{c.compact ? et(c.call.at).replace(/ [ap]\.m\./, "") : `${c.call.before ? "by " : ""}${et(c.call.at)}`}</small>
        </Show>
      </span>
    </Cell>
  </div>
));

export function Calls() {

  // The races any desk has called, newest first, then the closest ones nobody has called yet
  const rows = createMemo(() => {
    const races = feed.races.filter((r) => r.office !== "H" && (r.calls.length || r.closeness <= 1) && !r.uncontested);
    races.sort((a, b) => (b.calls[0]?.at || "") .localeCompare(a.calls[0]?.at || "") || a.closeness - b.closeness);
    return races.map((r) => ({
      id: r.id,
      label: narrow() ? r.short : `${r.label} ${r.office === "S" ? "Senate" : "governor"}`,
      // Under "Not yet": how much of the vote is in, or why none is
      counted: r.total > 0 ? `${counted(r)} in` : r.status === "upcoming" ? `Polls close ${etHour(r.closesAt).replace(" p.m.", "pm").replace(" a.m.", "am")}` : "No votes yet",
      brief: r.total > 0 ? counted(r) : r.status === "upcoming" ? etHour(r.closesAt).replace(" p.m.", "pm").replace(" a.m.", "am") : "0%",
      calls: liveDesks().map((d) => {
        const c = r.calls.find((x) => x.org === d.id);
        const cand = c && r.cands.find((x) => x.id === c.cand);
        return c ? { party: c.party, last: cand?.last || "", at: c.at, before: c.before } : null;
      }),
    }));
  });
  const Race = createMemo(() => slat({
    thickness: 44,
    room: { start: narrow() ? 84 : 210, end: 0 },
    css: `
      .slat { cursor: pointer; border-radius: 8px; }
      .slat.hot, .slat:hover { background: color-mix(in srgb, var(--rhp-ink) 6%, transparent); }
      .slat:focus-visible { outline: 2px solid var(--rhp-ink); z-index: 2; }
      .name { font-size: 14px; font-weight: 650; }
    `,
  }, (d) => (
    <div class={hot() === d.id ? "slat hot" : "slat"} data-id={d.id}>
      <Label edge="start" class="name">{d.label}</Label>
      <Plot orientation="across" call={d.calls} desk={liveDesks().map((x) => x.id)} counted={d.counted} brief={d.brief} compact={narrow()}>{Desk}</Plot>
    </div>
  )));
  const idOf = (el) => el?.closest?.("[data-id]")?.dataset.id || null;

  return (
    <div class="calls" style={{ "max-width": `${(narrow() ? 84 : 210) + liveDesks().length * 150}px` }}
      onPointerMove={(e) => e.pointerType !== "touch" && setHot(idOf(e.target))}
      onPointerLeave={() => setHot(null)}
      onClick={(e) => { const id = idOf(e.target); if (id) go(raceLink(id)); }}
      onKeyDown={(e) => { if (e.key === "Enter") { const id = idOf(e.target); if (id) go(raceLink(id)); } }}>
      <div class="calls-head" style={{ "padding-left": `${narrow() ? 84 : 210}px` }}>
        <For each={liveDesks()}>{(d) => <span>{d.id === "AP" || narrow() ? d.id : d.name}</span>}</For>
      </div>
      <Show when={rows().length} fallback={<p class="empty">No Senate or governor's race has been called yet.</p>}>
        <Show when={Race()} keyed>
          {(S) => (
            <Chart scale={[0, liveDesks().length]} ticks={false} theme={THEME} label="Race calls by news organization">
              <Plot rows={rows()} key="id" keyboard={true}>{S}</Plot>
            </Chart>
          )}
        </Show>
      </Show>
    </div>
  );
}
