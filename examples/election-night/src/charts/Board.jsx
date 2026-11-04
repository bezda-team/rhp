// A board of match-ups: one slat per race, the left candidate's share growing from the left and the right one's
// from the right, so the two bars meet near the halfway line. Pale while the count goes on, solid once called.
// It sorts itself live (the slats slide), and holds still while the reader points at it.

import { Show, createMemo, createSignal, For } from "solid-js";
import { Chart, Plot, Bar, Tick, Label, Place, slat } from "@bezda/rhp";
import { THEME } from "../theme.js";
import { tone, sides, pct, pts, statusText, LETTER, officeName, etHour, counted } from "../format.js";
import { go, raceLink, hot, setHot } from "../route.js";
import { narrow } from "../narrow.js";
import { changed, liveDesks } from "../feed/store.js";
import { now } from "../Live.jsx";

const css = `
  .slat { border-radius: 10px; cursor: pointer; }
  .slat:hover, .slat.hot { background: color-mix(in srgb, var(--rhp-ink) 6%, transparent); }
  .slat.bump { animation: bump 3s ease-out; }
  .slat:focus-visible { outline: 2px solid var(--rhp-ink); outline-offset: -2px; }
  .where { white-space: normal; line-height: 1.22; text-align: left; width: calc(var(--start) - 10px); padding-left: 10px; }
  .where b { display: block; font-size: 15px; font-weight: 750; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .where small { display: block; font-size: 11.5px; color: var(--rhp-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .where .st { font-weight: 700; }
  .where .st.called { color: var(--rhp-ink); }
  .bar { --rhp-radius: 3px; }
  .half { --rhp-tick-width: 1px; opacity: .55; }
  .nm { position: absolute; bottom: 10px; display: flex; align-items: baseline; gap: 6px; font-size: 13.5px; white-space: nowrap; color: var(--rhp-ink); }
  .nm.l { left: 0; }
  .nm.r { right: 0; flex-direction: row-reverse; }
  .nm b { font-weight: 650; }
  .nm.lead b { font-weight: 800; }
  .nm .p { font-variant-numeric: tabular-nums; font-weight: 750; }
  .nm .won { font-size: 10px; font-weight: 800; letter-spacing: .08em; padding: 1px 5px; border-radius: 4px; background: var(--rhp-ink); color: var(--rhp-surface); }
  .nm .inc { font-size: 11px; color: var(--rhp-muted); }
  .mg { position: absolute; top: 10px; translate: -50% 0; font-size: 11.5px; font-weight: 700; white-space: nowrap; color: var(--rhp-muted); font-variant-numeric: tabular-nums; }
  .in { display: grid; gap: 4px; justify-items: end; width: calc(var(--end) - 14px); font-size: 12px; color: var(--rhp-muted); font-variant-numeric: tabular-nums; }
  .in b { font-size: 14px; color: var(--rhp-ink); }
  .meter { width: 100%; max-width: 64px; height: 4px; border-radius: 2px; background: var(--rhp-grid); overflow: hidden; }
  .meter i { display: block; height: 100%; background: var(--rhp-ink); border-radius: 2px; transition: width .6s ease; }
`;

function Match(props) {

  // On a phone the counted share goes under the state's name, so the bars get the end column too
  const room = props.narrow ? { start: 104, end: 6 } : { start: props.start || 190, end: 84 };
  return slat({
    thickness: props.narrow ? 70 : 62,
    room,
    inset: 0.39,
    css: [
      `.slat { --start: ${room.start}px; --end: ${room.end}px; }`,
      css,
      props.narrow ? `.nm { font-size: 12.5px; gap: 4px; } .nm .inc { display: none; } .where b { font-size: 13.5px; } .where { padding-left: 2px; } .where small { font-size: 10.5px; }` : "",
    ],
  }, (d) => {
    const pair = () => sides(d.race);
    const left = () => pair()[0];
    const right = () => pair()[1];
    const called = () => d.race.status === "called";
    const color = (c) => (c ? tone(c.party, called() && c.won) : "surface");
    const lead = (c) => c && d.race.total > 0 && d.race.cands[0]?.id === c.id;
    const lname = (c) => (props.narrow ? c.last : `${c.first} ${c.last}`);
    return (
      <div class={`slat${hot() === d.race.id ? " hot" : ""}${now() - (changed[d.race.id] || 0) < 3000 ? " bump" : ""}`} data-id={d.race.id}
        aria-label={`${d.race.label} ${officeName(d.race.office)}: ${left() ? `${left().first} ${left().last} ${pct(left().pct)}` : ""}${right() ? `, ${right().first} ${right().last} ${pct(right().pct)}` : ""}. ${statusText(d.race)}`}>
        <Label edge="start" class="where">
          <b>{props.narrow ? d.race.short.replace(" Sen", " Sen.").replace(" Gov", " Gov.") : d.race.label}</b>
          <small>
            <Show when={!props.narrow && props.office !== d.race.office}>{officeName(d.race.office)} · </Show>
            <span class={`st ${d.race.status}`}>{d.race.status === "called" ? `✓ ${callers(d.race.calledBy, props.narrow)}` : d.race.status === "counting" ? (props.narrow ? `${counted(d.race)} in` : d.race.ratingLabel) : d.race.status === "closed" ? "Polls closed" : props.narrow ? `Closes ${etHour(d.race.closesAt).replace(" p.m.", "pm").replace(" a.m.", "am")} ET` : `Closes ${etHour(d.race.closesAt)} ET`}</span>
          </small>
        </Label>
        <Bar class="bar" from={0} to={left() ? left().pct : 0} color={color(left())} />
        <Bar class="bar" from={right() ? 100 - right().pct : 100} to={100} color={color(right())} />
        <Tick class="half" at={50} thick="calc(100% - 18px)" color="ink" />
        <Show when={left()}>
          <Place at={0}>
            <span class={lead(left()) ? "nm l lead" : "nm l"}>
              <span class={`tag ${left().party}`}>{LETTER[left().party]}</span>
              <b>{lname(left())}</b>
              <Show when={left().incumbent}><span class="inc">inc.</span></Show>
              <Show when={d.race.total > 0}><span class="p">{pct(left().pct)}</span></Show>
              <Show when={left().won}><span class="won">WON</span></Show>
            </span>
          </Place>
        </Show>
        <Show when={right()}>
          <Place at={100}>
            <span class={lead(right()) ? "nm r lead" : "nm r"}>
              <span class={`tag ${right().party}`}>{LETTER[right().party]}</span>
              <b>{lname(right())}</b>
              <Show when={right().incumbent}><span class="inc">inc.</span></Show>
              <Show when={d.race.total > 0}><span class="p">{pct(right().pct)}</span></Show>
              <Show when={right().won}><span class="won">WON</span></Show>
            </span>
          </Place>
        </Show>
        <Show when={d.race.total > 0 && d.race.cands[1]}>
          <Place at={50}><span class="mg">{d.race.cands[0].last} +{pts(d.race.margin)}</span></Place>
        </Show>
        <Show when={!props.narrow}><Label edge="end" class="in">
          <span><b>{d.race.total > 0 ? counted(d.race) : "–"}</b>{props.narrow ? "" : " in"}</span>
          <span class="meter"><i style={{ width: `${Math.min(100, d.race.eevp)}%` }} /></span>
        </Label></Show>
      </div>
    );
  });
}

// Who called a race, short enough for the slat: every desk, two by name, or the first and how many more
const callers = (by, narrow) => (by.length > 1 && by.length === liveDesks().length ? "All desks" : by.length <= 2 ? by.join(", ") : `${by[0]} + ${by.length - 1}${narrow ? "" : " more"}`);

const SORTS = {
  close: { label: "Closest", key: (r) => [r.status === "called" ? 2 : r.total > 0 ? 0 : 1, r.total > 0 ? r.margin : r.closeness] },
  counted: { label: "Most counted", key: (r) => [r.status === "called" ? 1 : 0, -r.eevp] },
  state: { label: "A to Z", key: (r) => [r.label] },
  closing: { label: "Poll closing", key: (r) => [r.closesAt || "", r.label] },
};

const compare = (a, b) => {
  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return 0;
};

export function Board(props) {

  const [sort, setSort] = createSignal(props.sort || "close");
  const [held, setHeld] = createSignal(false);
  const rows = createMemo(() => props.races.map((race) => ({ race, id: race.id })));
  let last = [];
  // Each row's place on screen. While the reader points at the board, it keeps its order.
  const order = createMemo(() => {
    const list = rows();
    if (held() && last.length === list.length) return last;
    const key = SORTS[sort()].key;
    const ranked = list.map((r, i) => [key(r.race), i]).sort((a, b) => compare(a[0], b[0]) || a[1] - b[1]);
    const pos = new Array(list.length);
    ranked.forEach(([, i], p) => (pos[i] = p));
    last = pos;
    return pos;
  });
  // A board in a narrow column takes the phone's layout on any screen
  const Slat = createMemo(() => Match({ narrow: narrow() || !!props.compact, office: props.office, start: props.start }));
  const idOf = (el) => el?.closest?.("[data-id]")?.dataset.id || null;

  return (
    <div class="board"
      onPointerMove={(e) => { if (e.pointerType !== "touch") { setHeld(true); setHot(idOf(e.target)); } }}
      onPointerLeave={() => { setHeld(false); setHot(null); }}
      onClick={(e) => { const id = idOf(e.target); if (id) go(raceLink(id)); }}
      onKeyDown={(e) => { if (e.key === "Enter") { const id = idOf(e.target); if (id) go(raceLink(id)); } }}
      onFocusIn={(e) => setHot(idOf(e.target))}>
      <Show when={props.tools !== false}>
        <div class="tools">
          <span class="hint">{props.hint || "Point at a race to find it on the map. Click or press Enter to open it."}</span>
          <div class="seg" role="group" aria-label="Sort the races">
            <For each={props.sorts || ["close", "counted", "closing", "state"]}>
              {(k) => <button aria-pressed={sort() === k} onClick={(e) => { e.stopPropagation(); setSort(k); }}>{SORTS[k].label}</button>}
            </For>
          </div>
        </div>
      </Show>
      <Show when={rows().length} fallback={<p class="empty">{props.empty || "No races here yet."}</p>}>
        <Show when={Slat()} keyed>
          {(S) => (
            <Chart scale={[0, 100]} ticks={false} theme={THEME} label={props.label}>
              <Plot rows={rows()} key="id" keyboard={true} order={order()}>{S}</Plot>
            </Chart>
          )}
        </Show>
      </Show>
    </div>
  );
}
