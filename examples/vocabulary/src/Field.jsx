// The charts about every rapper at once. Both follow the rapper picked anywhere in the article.
// - Albums: a typical career as album spines standing side by side: how many new words the median rapper's first,
//   second, third... album brought, the middle half of rappers as a whisker, and how much of each album was new.
//   The picked rapper's face sits on each column at their own album's new words.
// - Eras: every rapper's face at their different words per 35,000 over the whole career, by the decade the 2019
//   article gave them, ringed gold when the whole career beats 2019's count of its first 35,000 words. The faces
//   start at their era's 2019 median and spread to their places when the chart comes into view. An arrow runs from
//   each era's median then to its median now. A face opens its rapper in the ranking; an era's name filters it.

import { createMemo, createSignal, Show, onCleanup } from "solid-js";
import { Chart, Plot, Bar, Dot, Tick, Label, slat, nice, shape } from "@bezda/rhp";
import { ARTISTS, ERAS, FIELD, SAMPLE, byName, number, snug } from "./data.js";
import { THEME, spine } from "./theme.js";
import { setWanted, picked, setPointed, era as eraShown, setEra } from "./state.js";
import { hold } from "./hold.js";
import { Face } from "./faces.jsx";

export const ordinal = (n) => n + (["th", "st", "nd", "rd"][(n % 100 >> 3) ^ 1 && n % 10] || "th");
const percent = new Intl.NumberFormat("en-US", { style: "percent" });
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function median(values) {

  const v = [...values].sort((a, b) => a - b);
  const h = (v.length - 1) / 2;
  return (v[Math.floor(h)] + v[Math.ceil(h)]) / 2;
}

// Whether an element has come into view: once true, it stays true
function useSeen() {

  const [seen, setSeen] = createSignal(reduced());
  const ref = (el) => {
    if (seen()) return;
    const watch = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      watch.disconnect();
      setTimeout(() => setSeen(true), 120);
    }, { threshold: 0.3 });
    watch.observe(el);
    onCleanup(() => watch.disconnect());
  };
  return [seen, ref];
}

// The width of an element, as a signal
function useWidth() {

  const [width, setWidth] = createSignal(800);
  let observer;
  const ref = (el) => {
    observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
  };
  onCleanup(() => observer?.disconnect());
  return [width, ref];
}

function useNarrow() {

  const media = matchMedia("(max-width: 720px)");
  const [narrow, setNarrow] = createSignal(media.matches);
  const on = (e) => setNarrow(e.matches);
  media.addEventListener("change", on);
  onCleanup(() => media.removeEventListener("change", on));
  return narrow;
}

// One album number: a spine as tall as the median rapper's new words, a whisker over the middle half of rappers, and
// the picked rapper's face at their own album's new words
const AlbumNumber = slat({
  inset: 0.2,
  room: { start: 54, end: 30 },
  css: `
    .number { cursor: pointer; }
    /* The hover tint fills the column and the chart's padding: 4px short of the legend above, 1px short of the readout below */
    .number::before { content: ""; position: absolute; inset: calc(4px - var(--rhp-pad-top, 2px)) 3px calc(1px - var(--rhp-pad-bottom, 2px)); border-radius: 6px; transition: background-color .15s; }
    .number.on::before { background: color-mix(in srgb, var(--rhp-ink) 7%, transparent); }
    .number:focus-visible { outline: none; }
    .number:focus-visible::before { box-shadow: inset 0 0 0 2px var(--rhp-series-8); }
    .spine { --rhp-radius: 3px; --rhp-start-radius: 0px; }
    .spread { opacity: .7; }
    .cap { --rhp-tick-width: 2px; opacity: .7; }
    .v { --rhp-label-gap: 5px; padding: 1px 4px; border-radius: 3px; background: var(--rhp-surface); color: var(--rhp-ink); font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums; }
    .n { white-space: normal; line-height: 1.25; font-size: 13px; font-weight: 600; }
    .n small { display: block; font-size: 11px; font-weight: 400; color: var(--rhp-muted); }
    .n:vertical { text-overflow: clip; }
    .mine { overflow: visible; box-shadow: 0 0 0 2.5px var(--rhp-series-8), 0 2px 8px rgb(0 0 0 / .35); }
    .mine .face { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: 50%; object-fit: cover; object-position: 50% 25%; }
    .mine .initials { display: grid; place-items: center; background: var(--rhp-surface); color: var(--rhp-series-8); font: 700 9px/1 var(--rhp-font); }
    @media (prefers-reduced-motion: reduce) { .number::before { transition: none; } }
  `,
}, (d) => (
  <div class={`number${d.on ? " on" : ""}${d.index === 0 ? " first" : ""}`} data-k={d.index} aria-label={d.say}>
    <Bar class="spine" to={d.height} color={d.on || (d.index === 0 && d.lead) ? "series-8" : d.tone} />
    <Bar class="spread" from={d.lo} to={d.hi} thick="2px" color="ink" />
    <Tick class="cap" at={d.lo} thick="12px" color="ink" />
    <Tick class="cap" at={d.hi} thick="12px" color="ink" />
    <Show when={!d.narrow}><Label at={0} class="v">{number.format(d.new)}</Label></Show>
    <Label edge="start" class="n">{ordinal(d.album)}<small>{d.narrow ? percent.format(d.share) : `${percent.format(d.share)} new`}</small></Label>
    <Show when={d.mine != null}>
      <Dot class="mine" at={d.mine} size={d.faceSize} color="surface"><Face name={d.who} /></Dot>
    </Show>
  </div>
));

export function Albums() {

  const narrow = useNarrow();
  // A phone shows the first ten albums: fourteen columns are too narrow for their labels there
  const rows = createMemo(() => (narrow() ? FIELD.byAlbum.slice(0, 10) : FIELD.byAlbum));
  const [hover, setHover] = createSignal(null);
  const [pinned, setPinned] = createSignal(null);
  const at = () => hover() ?? pinned();
  const [seen, watch] = useSeen();
  const who = createMemo(() => byName.get(picked()) ?? null);
  const top = createMemo(() => snug(0, Math.max(...rows().map((r) => r.high), ...(who()?.albums.slice(0, rows().length).map((a) => a.new) ?? [])), 0.08));
  const fifth = () => rows()[4] ?? rows().at(-1);
  const say = (r) => `${ordinal(r.album)} album: the median rapper's brought ${number.format(r.new)} new words, ${percent.format(r.share)} of its words; the middle half of the ${r.artists} rappers who made one, ${number.format(r.low)} to ${number.format(r.high)}`;

  const kOf = (el) => {
    const root = el.closest("[data-k]");
    return root ? +root.dataset.k : null;
  };
  const pick = (e) => {
    const k = kOf(e.target);
    if (k != null) setHover(k);
  };

  return (
    <div class="albums" ref={watch} onPointerMove={(e) => e.pointerType !== "touch" && pick(e)}
      onClick={(e) => { pick(e); setPinned(kOf(e.target)); }} onFocusIn={pick}
      onPointerLeave={(e) => e.pointerType !== "touch" && setHover(e.currentTarget.contains(document.activeElement) ? kOf(document.activeElement) : null)}
      onFocusOut={(e) => !e.currentTarget.contains(e.relatedTarget) && setHover(null)}>
      <p class="callout">
        <Show when={who()} fallback={<><b>{number.format(rows()[0].new)}</b> new words on a debut. By the {ordinal(fifth().album)} album, <b>{number.format(fifth().new)}</b>: {percent.format(fifth().new / rows()[0].new)} as many.</>}>
          {(a) => <><span class="lit-name">{a().name}</span>’s debut: <b>{number.format(a().albums[0].new)}</b> new words, against {number.format(rows()[0].new)} for the median rapper.{a().albums.length > 1 ? <> Their last album, the {ordinal(a().albums.length)}: <b>{number.format(a().albums.at(-1).new)}</b>.</> : null}</>}
        </Show>
      </p>
      <ul class="key" aria-hidden="true">
        <li><i class="spine-key" />median rapper’s album, and the middle half of rappers</li>
        <Show when={who()} fallback={<li class="hint">pick a rapper to see their albums here</li>}>
          {(a) => <li><i class="dot ring" />{a().name}’s albums</li>}
        </Show>
      </ul>
      <Chart orientation="vertical" height={narrow() ? 260 : 320} scale={[0, top().max]} ticks={false} theme={THEME}
        style={{ "--rhp-pad-top": "35px", "--rhp-pad-bottom": "55px", "--rhp-length-time": ".9s", "--rhp-length-ease": "cubic-bezier(.25, .8, .25, 1)" }}
        label="New words per album, by the album's place in a career, for the median rapper">
        <Plot rows={rows()} keyboard on={(d) => at() === d.index} say={(d) => say(d)} tone={(d) => spine(d.index, rows().length)}
          height={(d) => (seen() ? d.new : 0)} lo={(d) => (seen() ? d.low : 0)} hi={(d) => (seen() ? d.high : 0)}
          mine={(d) => (seen() ? who()?.albums[d.index]?.new ?? null : null)} lead={() => !who()} narrow={() => narrow()}
          who={() => who()?.name} faceSize={() => (narrow() ? "20px" : "26px")}>
          {AlbumNumber}
        </Plot>
      </Chart>
      <p class="readout chart-readout" aria-live="polite">
        <Show when={at() != null} fallback={who() ? `Each portrait is one of ${who().name}’s albums, at its new words. Pick another rapper above or below to compare.` : "Pick a rapper in the ranking or below, and their albums appear here. Point at a column for its numbers."}>
          <b>{ordinal(rows()[at()].album)} album</b> · median {number.format(rows()[at()].new)} new words, {percent.format(rows()[at()].share)} of the album · middle half {number.format(rows()[at()].low)} to {number.format(rows()[at()].high)}{who()?.albums[at()] ? ` · ${who().name}: ${number.format(who().albums[at()].new)}` : ""}
        </Show>
      </p>
    </div>
  );
}

// An arrow from a Bar's start to its end, 9px from its point
const arrow = shape(["M", 0, 0.38], ["L", "-9px", 0.38], ["L", "-9px", 0], ["L", 1, 0.5], ["L", "-9px", 1], ["L", "-9px", 0.62], ["L", 0, 0.62], ["Z"]);

// A rapper: their face, ringed gold when their whole career beats 2019's count of its first 35,000 words, and their name
// when they lead their era or are picked
const Rapper = slat({
  room: {},
  css: `
    .who { --s: 1; cursor: pointer; overflow: visible; box-shadow: 0 0 0 2px var(--ring); }
    .who.rose { --ring: var(--rhp-series-8); }
    .who.fell { --ring: var(--rhp-series-5); }
    .who .face { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: 50%; object-fit: cover; object-position: 50% 25%; transition: opacity .25s; }
    .who .initials { display: grid; place-items: center; background: var(--rhp-grid); color: var(--rhp-ink); font: 700 9px/1 var(--rhp-font); letter-spacing: -.02em; }
    /* While a rapper is picked ("picking" on each era), every face but theirs and the one pointed at is dimmed */
    .picking .who:not(.lift):not(.point) .face { opacity: .45; }
    .who.point { z-index: 5; --s: 1.35; scale: var(--s); }
    .who.lift { z-index: 4; --s: 1.7; scale: var(--s); box-shadow: 0 0 0 1.5px var(--ring), 0 3px 10px rgb(0 0 0 / .4); }
    .who.lift.point { z-index: 5; }
    /* The name is inside the face, which is scaled: it is divided by the scale so that it keeps one size (16px when the
       face is pointed at or picked, 12px for an era's leaders) */
    .tag { position: absolute; bottom: 100%; left: 50%; translate: -50% calc(-4px / var(--s)); font-size: calc(12px / var(--s)); font-weight: 600; color: var(--rhp-ink); white-space: nowrap; pointer-events: none; text-shadow: 0 0 3px var(--rhp-surface), 0 0 3px var(--rhp-surface), 0 0 3px var(--rhp-surface); }
    .point .tag, .lift .tag { font-size: calc(16px / var(--s)); }
    .lift .tag { color: var(--rhp-series-8); }
    .tag.left { left: auto; right: 0; translate: 0 calc(-4px / var(--s)); }
    @media (prefers-reduced-motion: reduce) { .who .face { transition: none; } }
  `,
}, (r) => (
  <Dot class={`who ${r.rose ? "rose" : "fell"}${r.lift ? " lift" : ""}${r.point ? " point" : ""}`}
    at={r.x} across={r.across} size={r.size} color="grid" data-name={r.name} aria-label={r.say}>
    <Face name={r.name} />
    <Show when={r.named || r.lift || r.point}><span class={r.left ? "tag left" : "tag"}>{r.name}</span></Show>
  </Dot>
));

function eraSlat(thickness, start) {
  return slat({
    thickness,
    room: { start, end: 24 },
    css: `
      .era { border-top: 1px solid var(--rhp-grid); transition: opacity .3s; }
      .era.faded { opacity: .35; }
      .label { cursor: pointer; font: 800 28px/1 "Big Shoulders Display", var(--rhp-font); white-space: normal; }
      .label small { display: block; margin-top: 3px; font: 400 11px/1.2 var(--rhp-font); color: var(--rhp-muted); }
      .chosen .label { color: var(--rhp-series-8); }
      .then { --rhp-tick-width: 2px; background: repeating-linear-gradient(180deg, var(--rhp-muted) 0 4px, transparent 4px 7px); }
      .now { --rhp-tick-width: 2px; }
      .shift { translate: 0 calc(-${thickness / 2 - 7}px); opacity: .9; }
      @media (prefers-reduced-motion: reduce) { .era { transition: none; } }
    `,
  }, (d) => (
    <div class={`era${d.faded ? " faded" : ""}${d.chosen ? " chosen" : ""}${d.picking ? " picking" : ""}`} data-era={d.era}>
      <Label edge="start" class="label">{d.short}<small>{d.count === 1 ? "1 rapper" : `${d.count} rappers`}</small></Label>
      <Tick class="then" at={d.then} thick={0.86} />
      <Tick class="now" at={d.now} thick={0.86} color="ink" />
      <Bar class="shift" from={d.then} to={d.spread ? d.now : d.then} thick="9px" shape={arrow} color="ink" />
      <Plot overlap rows={d.rappers}>{Rapper}</Plot>
    </div>
  ));
}

const EraWide = eraSlat(176, 86);
const EraNarrow = eraSlat(168, 58);

export function Eras() {

  const narrow = useNarrow();
  const [width, measure] = useWidth();
  const [seen, watch] = useSeen();
  const counted = ARTISTS.filter((a) => a.fair != null);
  const fairs = counted.map((a) => a.fair);
  const scale = snug(Math.floor((Math.min(...fairs) - 120) / 100) * 100, Math.max(...fairs), 0.02);
  const [on, setOn] = createSignal(null);
  const hovered = createMemo(() => byName.get(on()) ?? null);

  // Each era's faces, laid out so none covers another: in value order, each takes the free place nearest the middle of
  // its slat, above or below it alike, between the median arrow and the slat's bottom; in a crowd with no free place,
  // the one where it overlaps least
  const layout = createMemo(() => {
    const type = narrow() ? { t: 168, s: 58, size: 19 } : { t: 176, s: 86, size: 26 };
    const plot = Math.max(200, width() - type.s - 24);
    const px = (v) => ((v - scale.min) / (scale.max - scale.min)) * plot;
    const gap = type.size + 2;
    // Where a face's center may go, in px from the slat's middle: from below the median arrow (18px from the slat's
    // top) to 2px above its bottom
    const up = 18 + type.size / 2 - type.t / 2;
    const down = type.t / 2 - 2 - type.size / 2;

    return ERAS.map((era) => {
      const all = ARTISTS.filter((a) => a.era === era);
      const list = all.filter((a) => a.fair != null).sort((a, b) => a.fair - b.fair);
      const placed = [];

      for (const a of list) {
        const x = px(a.fair);
        let y = 0;
        let room = -1;

        for (let k = 0; Math.ceil(k / 2) <= Math.max(-up, down); k++) {
          const at = (k % 2 ? 1 : -1) * Math.ceil(k / 2);
          if (at < up || at > down) continue;
          const near = Math.min(Infinity, ...placed.map((p) => Math.hypot(p.x - x, p.y - at)));
          if (near > room) {
            room = near;
            y = at;
          }
          if (near >= gap) break;
        }

        placed.push({ x, y, a });
      }

      return { era, all, list, placed, plot, type };
    });
  });

  const groups = createMemo(() => layout().map(({ era, all, list, placed, plot, type }) => {
    const then = median(all.map((a) => a.pudding));
    const leader = list.at(-1)?.name;
    return {
      era,
      short: era.replace("19", "’").replace("20", "’"),
      count: list.length,
      then,
      now: list.length ? median(list.map((a) => a.fair)) : then,
      spread: seen(),
      faded: eraShown() !== "all" && eraShown() !== era,
      chosen: eraShown() === era,
      picking: picked() != null,
      rappers: placed.map(({ x, y, a }) => ({
        name: a.name,
        x: seen() ? a.fair : then,
        across: 0.5 + y / type.t,
        size: `${type.size}px`,
        rose: a.fair >= a.pudding,
        named: a.name === leader && !picked() && !on(),
        lift: picked() === a.name,
        point: on() === a.name && picked() !== a.name,
        left: x > plot - 70,
        say: `${a.name}: ${number.format(a.fair)} different words per ${number.format(SAMPLE)}, ${number.format(a.pudding)} in 2019`,
      })),
    };
  }));

  const nameOf = (el) => el.closest("[data-name]")?.dataset.name ?? null;
  const eraOf = (el) => (el.closest(".label") ? el.closest("[data-era]")?.dataset.era ?? null : null);
  const point = (e) => {
    const name = nameOf(e.target);
    setOn(name);
    setPointed(name);
  };
  const click = (e) => {
    const name = nameOf(e.target);
    const era = eraOf(e.target);
    // The ranking above opens the rapper (or shows the era) and grows: the era clicked in stays where it is on screen
    // (its band, not the face, which grows when picked)
    if (!name && !era) return;
    const fix = hold(e.target.closest("[data-era]"));
    if (name) setWanted({ name, go: false });
    else setEra(eraShown() === era ? "all" : era);
    fix();
  };
  onCleanup(() => setPointed(null));

  const chart = (Type) => (
    <Chart scale={[scale.min, scale.max]} ticks={scale.ticks} format={(v) => number.format(v)} theme={THEME}
      style={{ "--rhp-length-time": "1.2s", "--rhp-length-ease": "cubic-bezier(.25, .8, .25, 1)" }}
      label={`Different words per ${number.format(SAMPLE)}, whole careers, by era`}>
      <Plot rows={groups()} key="era">{Type}</Plot>
    </Chart>
  );

  return (
    <div ref={(el) => { measure(el); watch(el); }} onPointerMove={(e) => e.pointerType !== "touch" && point(e)} onClick={click}
      onPointerLeave={(e) => { if (e.pointerType !== "touch") { setOn(null); setPointed(null); } }}>
      <ul class="key" aria-hidden="true">
        <li><i class="dot rose" />whole career richer than 2019’s first {number.format(SAMPLE)}</li>
        <li><i class="dot fell" />whole career poorer</li>
        <li><i class="median-then" />2019 median</li>
        <li><i class="median-now" />current median (all albums)</li>
      </ul>
      <Show when={narrow()} fallback={chart(EraWide)}>{chart(EraNarrow)}</Show>
      <p class="readout chart-readout" aria-live="polite">
        <Show when={hovered()} fallback="Point at a face for the rapper; tap or click it to pick them in every chart. Tap an era to show only its rappers in the ranking.">
          {(a) => <><b class="lit">{a().name}</b> · {number.format(a().fair)} different words per {number.format(SAMPLE)} over the whole career; {number.format(a().pudding)} in 2019’s count of the first</>}
        </Show>
      </p>
    </div>
  );
}
