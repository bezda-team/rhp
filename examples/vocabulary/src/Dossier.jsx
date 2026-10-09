// One rapper's breakdown, opened from the ranking:
// - album by album: each album's new words where they sit on the shelf (the ranking's segments, dropped to their own
//   rows), after the words of the albums before it;
// - how the vocabulary grew: different words so far against words rapped so far, next to the median rapper's;
// - the words no other rapper here used.
// An album picked in one chart is picked in the other.

import { createMemo, createSignal, For, Show, onCleanup, onMount } from "solid-js";
import { Chart, Plot, Bar, Dot, Line, Label, slat, nice, drawing } from "@bezda/rhp";
import { ARTISTS, FIELD, SAMPLE, MEDIAN_DENSITY, number, compact, snug } from "./data.js";
import { THEME, gold } from "./theme.js";
import { Face, Credit } from "./faces.jsx";

// The view transition name of album k of a rapper, the same on the shelf and in the breakdown
export function vt(name, k) {
  return `a-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${k}`;
}

function albumSlat(start) {
  return slat({
    thickness: 26,
    room: { start, end: 62 },
    css: `
      .album { cursor: pointer; }
      .album::before { content: ""; position: absolute; inset: 1px -62px 1px -${start}px; border-radius: 3px; transition: background-color .15s; }
      .album.on::before { background: color-mix(in srgb, var(--rhp-ink) 8%, transparent); }
      .album:focus-visible { outline: none; }
      .album:focus-visible::before { box-shadow: inset 0 0 0 2px var(--rhp-series-8); }
      .title { font-size: 13px; }
      .title small { margin-left: 5px; font-size: 11px; color: var(--rhp-muted); }
      .on .title { font-weight: 600; }
      .before { --rhp-radius: 1px; opacity: .45; }
      .new { --rhp-radius: 1px; view-transition-name: var(--vt); }
      .plus { font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--rhp-series-8); }
      @media (prefers-reduced-motion: reduce) { .album::before { transition: none; } }
    `,
  }, (d) => (
    <div class={d.on ? "album on" : "album"} data-album={d.index} aria-label={d.say}>
      <Label edge="start" class="title">{d.title}<small>{d.year}</small></Label>
      <Bar class="before" from={0} to={d.from} color="series-5" />
      <Bar class="new" from={d.from} to={d.to} color={d.tone} style={{ "--vt": d.vt }} />
      <Label at={d.to} class="plus">+{number.format(d.new)}</Label>
    </div>
  ));
}

const AlbumWide = albumSlat(196);
const AlbumNarrow = albumSlat(112);

// The growth chart's marks: the median rapper's line, this rapper's line, and a dot where each album ends
const Median = slat({ room: {}, css: `.median path.rhp-stroke { stroke-dasharray: 3 4; }` }, (d) => (
  <Line class="median" points={d.points} color="muted" />
));
const Other = slat({ room: {}, css: `.other path.rhp-stroke { stroke-width: 1px; opacity: .28; }` }, (d) => (
  <Line class="other" points={d.points} color="muted" />
));
const Grown = slat({ room: {}, css: `.grown path.rhp-stroke { stroke-width: 2.5px; }` }, (d) => (
  <Line class="grown" points={d.points} color="series-8" />
));
const End = slat({
  room: {},
  css: `
    .end { box-shadow: 0 0 0 2px var(--rhp-surface); }
    .end.on { box-shadow: 0 0 0 2px var(--rhp-surface), 0 0 0 4px var(--rhp-series-8); }
  `,
}, (d) => (
  <Dot class={d.on ? "end on" : "end"} at={d.at} cross={d.cross} size={d.on ? "11px" : "8px"} color={d.shown ? "series-8" : "surface"} />
));
const Name = slat({
  room: {},
  css: `
    .tag { --rhp-label-gap: 8px; translate: 0 -50%; font-size: 12px; font-weight: 600; color: var(--rhp-series-8); white-space: nowrap; }
    .tag.median { color: var(--rhp-muted); font-weight: 400; }
  `,
}, (d) => (
  <Label class={d.median ? "tag median" : "tag"} at={d.at} cross={d.cross} side={d.side}>{d.text}</Label>
));

// The density chart's marks: the median album as a dashed line, the rapper's albums as a line, a dot per album
const Level = slat({ room: {}, css: `.level path.rhp-stroke { stroke-dasharray: 3 4; }` }, (d) => (
  <Line class="level" points={d.points} color="muted" />
));
const Dense = slat({ room: {}, css: `.dense path.rhp-stroke { stroke-width: 2px; }` }, (d) => (
  <Line class="dense" points={d.points} color="series-9" />
));
const Pip = slat({
  room: {},
  css: `
    .pip { box-shadow: 0 0 0 2px var(--rhp-surface); }
    .pip.on { box-shadow: 0 0 0 2px var(--rhp-surface), 0 0 0 4px var(--rhp-series-8); }
  `,
}, (d) => (
  <Dot class={d.on ? "pip on" : "pip"} at={d.at} cross={d.density} size={d.on ? "11px" : "8px"} color={d.density >= d.median ? "series-8" : "series-5"} />
));

export function Dossier(props) {

  const a = () => props.artist;
  const n = () => a().albums.length;
  const [picked, setPicked] = createSignal(null); // the album the pointer or the focus is on
  const [pinned, setPinned] = createSignal(null); // the album a click or a tap picked: leaving comes back to it
  const album = () => picked() ?? pinned();
  const current = createMemo(() => (album() == null ? null : a().albums[album()]));

  // The line draws itself when the breakdown opens: `drawn` runs from 0 to 1 over the words rapped
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [drawn, setDrawn] = createSignal(reduced ? 1 : 0);
  let frame;
  onMount(() => {
    if (reduced) return;
    let start = null;
    const step = (now) => {
      start ??= now + 450; // after the shelf has landed
      const t = Math.min(1, Math.max(0, (now - start) / 1300));
      drawing(() => setDrawn(1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  });
  onCleanup(() => cancelAnimationFrame(frame));

  const scale = createMemo(() => snug(0, a().unique));
  const x = createMemo(() => snug(0, a().words, 0.03));
  const y = createMemo(() => snug(0, Math.max(a().unique, ...FIELD.growth.filter(([w]) => w <= x().max).map(([, u]) => u)), 0.06));

  // This rapper's line up to `drawn`: the points before it and one on the straight line to the next
  const line = createMemo(() => {
    const points = [[0, 0], ...a().growth];
    const end = drawn() * a().words;
    const out = points.filter(([w]) => w <= end);
    const next = points.find(([w]) => w > end);
    const last = out.at(-1);
    if (next && last) out.push([end, last[1] + ((next[1] - last[1]) * (end - last[0])) / (next[0] - last[0])]);
    return out;
  });
  const median = createMemo(() => [[0, 0], ...FIELD.growth.filter(([w]) => w <= x().max)]);

  // Every other rapper's line, inside this chart's scales: cut where it leaves them
  const others = createMemo(() => ARTISTS.filter((o) => o.name !== a().name).map((o) => {
    const points = [[0, 0]];

    for (const p of o.growth) {
      if (p[0] > x().max || p[1] > y().max) break;
      points.push(p);
    }

    return points;
  }).filter((p) => p.length > 1));
  const medianEnd = createMemo(() => median().at(-1));

  // How dense each album is: different words per 1,000, album by album, against the median album
  const dense = createMemo(() => a().albums.map((al, i) => ({ at: i + 1, density: al.density, year: al.year })).filter((d) => d.density != null));
  const level = createMemo(() => nice(Math.min(MEDIAN_DENSITY, ...dense().map((d) => d.density)) - 30, Math.max(MEDIAN_DENSITY, ...dense().map((d) => d.density)) + 10, 4));
  let densePlot;
  const nearAlbum = (e) => {
    const r = densePlot.getBoundingClientRect();
    const at = 0.5 + ((e.clientX - r.left) / r.width) * n();
    return Math.max(0, Math.min(n() - 1, Math.round(at) - 1));
  };

  // The breakdown is drawn again when the page crosses the phone breakpoint, so its slat type is chosen once
  const narrow = () => props.narrow;
  const Album = props.narrow ? AlbumNarrow : AlbumWide;
  const albumOf = (el) => {
    const root = el.closest("[data-album]");
    return root ? +root.dataset.album : null;
  };
  const point = (e) => {
    const i = albumOf(e.target);
    if (i != null) setPicked(i);
  };
  const leave = (e) => {
    if (e.pointerType === "touch") return;
    setPicked(e.currentTarget.contains(document.activeElement) ? albumOf(document.activeElement) : null);
  };
  const pin = (e) => {
    const i = albumOf(e.target);
    if (i == null) return;
    setPicked(i);
    setPinned(i);
  };
  // The growth chart picks the album whose end is nearest the pointer, along the words rapped
  let growthPlot;
  const near = (e) => {
    const r = growthPlot.getBoundingClientRect();
    const w = ((e.clientX - r.left) / r.width) * x().max;
    let best = 0;

    for (const [i, al] of a().albums.entries()) {
      if (Math.abs(al.through - w) < Math.abs(a().albums[best].through - w)) best = i;
    }

    return best;
  };

  const sayAlbum = (al) => `${al.title} (${al.year}${al.with.length ? `, with ${al.with.join(" and ")}` : ""}): ${number.format(al.unique)} different words in ${number.format(al.words)}, ${number.format(al.new)} of them new`;

  const stats = () => [
    { value: number.format(a().unique), label: `different words on ${n()} albums, #${a().rank.catalog} of ${ARTISTS.length}` },
    { value: a().fair == null ? "–" : number.format(a().fair), label: a().fair == null ? `fewer than ${number.format(SAMPLE)} words on official albums` : `in an average ${number.format(SAMPLE)} words, #${a().rank.fair}` },
    { value: number.format(a().pudding), label: `in the first ${number.format(SAMPLE)}, 2019's count` },
    { value: number.format(a().words), label: `words rapped, in ${a().songs} songs` },
  ];

  return (
    <article class="dossier" aria-label={`${a().name}, album by album`}>
      <div class="dossier-head">
        <Face name={a().name} class="portrait" />
        <div class="who">
          <h3>{a().name}</h3>
          <p class="facts">{a().era} · {n()} albums, {a().first} to {a().last}</p>
          <Credit name={a().name} />
        </div>
        <button type="button" class="close" onClick={(e) => { e.stopPropagation(); props.onClose(); }}>Close</button>
      </div>
      <div class="stats">
        <For each={stats()}>{(s) => <div class="stat"><b>{s.value}</b><span>{s.label}</span></div>}</For>
      </div>
      <div class="panels">
        <section onPointerMove={(e) => e.pointerType !== "touch" && point(e)} onClick={pin} onFocusIn={point}
          onPointerLeave={leave} onFocusOut={(e) => !e.currentTarget.contains(e.relatedTarget) && setPicked(null)}>
          <p class="panel-title">Album by album</p>
          <p class="panel-note">Each album's new words, after the words of the albums before it (faint).</p>
          <Chart scale={[0, scale().max]} ticks={scale().ticks.filter((_, i, t) => !narrow() || i % 2 === 0 || i === t.length - 1)}
            format={compact} theme={THEME} label={`${a().name}'s albums: the new words each one added`}>
            <Plot rows={a().albums} keyboard
              say={(d) => sayAlbum(d)}
              on={(d) => album() === d.index}
              tone={(d) => gold(d.index, n())}
              vt={(d) => vt(a().name, d.index)}>
              {Album}
            </Plot>
          </Chart>
          <p class="panel-title" style={{ "margin-top": "26px" }}>How dense each album is</p>
          <p class="panel-note">Different words in every 1,000 words, album by album; the dashed line is the median album of all {ARTISTS.length} rappers ({number.format(Math.round(MEDIAN_DENSITY))}).</p>
          <div onPointerMove={(e) => e.pointerType !== "touch" && setPicked(nearAlbum(e))} onClick={(e) => { const i = nearAlbum(e); setPicked(i); setPinned(i); }}
            onPointerLeave={(e) => e.pointerType !== "touch" && setPicked(null)}>
            <Chart scale={[0.5, n() + 0.5]} ticks={a().albums.map((_, i) => i + 1).filter((k) => n() <= 12 || k === 1 || k === n() || k % Math.ceil(n() / 8) === 0)}
              format={(k) => `’${String(a().albums[k - 1]?.year ?? "").slice(2)}`} cross={[level().min, level().max]} crossTicks={level().ticks}
              height={narrow() ? 150 : 170} theme={THEME} label={`${a().name}'s albums by different words per 1,000 words, with the median album's`}>
              <Plot overlap slats={1} points={[[[0.5, MEDIAN_DENSITY], [n() + 0.5, MEDIAN_DENSITY]]]}>{Level}</Plot>
              <Plot overlap slats={1} points={[dense().map((d) => [d.at, d.density])]} ref={(el) => (densePlot = el)}>{Dense}</Plot>
              <Plot overlap rows={dense()} median={MEDIAN_DENSITY} on={(d) => album() === d.at - 1} style={{ "pointer-events": "none" }}>{Pip}</Plot>
            </Chart>
          </div>
          <p class="album-readout" aria-live="polite">
            <Show when={current()} fallback="Point at an album, or tap one.">
              {(al) => (
                <>
                  <b>{al().title}</b> ({al().year}{al().with.length ? `, with ${al().with.join(" and ")}` : ""}): {number.format(al().unique)} different words in {number.format(al().words)}, <b>{number.format(al().new)} new</b>{al().density != null ? `, ${number.format(al().density)} per 1,000` : ""}{al().spanish ? "; mostly in Spanish" : ""}
                  <Show when={al().examples.length}>{" "}· new here: <For each={al().examples}>{(w, i) => <>{i() ? ", " : ""}<i>{w}</i></>}</For></Show>
                </>
              )}
            </Show>
          </p>
        </section>
        <section>
          <p class="panel-title">How the vocabulary grew</p>
          <p class="panel-note">Different words so far, against words rapped so far; a dot ends each album. The faint lines are the other rappers.</p>
          <div onPointerMove={(e) => e.pointerType !== "touch" && setPicked(near(e))} onClick={(e) => { const i = near(e); setPicked(i); setPinned(i); }}
            onPointerLeave={(e) => e.pointerType !== "touch" && setPicked(null)}>
            <Chart scale={[0, x().max]} ticks={x().ticks.filter((_, i, t) => !narrow() || i % 2 === 0 || i === t.length - 1)} format={compact}
              cross={[0, y().max]} crossTicks={y().ticks} crossFormat={compact} height={narrow() ? 210 : 250} theme={THEME}
              label={`${a().name}'s different words against words rapped, with the median rapper's`}>
              <Plot overlap points={others()} style={{ "pointer-events": "none" }}>{Other}</Plot>
              <Plot overlap slats={1} points={[median()]}>{Median}</Plot>
              <Plot overlap slats={1} points={[line()]} ref={(el) => (growthPlot = el)}>{Grown}</Plot>
              <Plot overlap rows={a().albums} at={(d) => d.through} cross={(d) => d.total}
                shown={(d) => d.through <= drawn() * a().words + 1} on={(d) => album() === d.index}
                style={{ "pointer-events": "none" }}>{End}</Plot>
              <Plot overlap slats={2} style={{ "pointer-events": "none" }}
                at={[medianEnd()[0], a().words]} cross={[medianEnd()[1], a().unique]}
                side={[medianEnd()[0] > x().max * 0.7 ? "before" : "after", a().words > x().max * 0.7 ? "before" : "after"]}
                median={[true, false]} text={["median rapper", a().name]}>{Name}</Plot>
            </Chart>
          </div>
          <Show when={a().signature.length}>
            <p class="panel-title" style={{ "margin-top": "22px" }}>Words only {a().name} used</p>
            <p class="panel-note">On their albums and no other rapper's here, with how many times.</p>
            <ul class="lexicon">
              <For each={a().signature}>{([word, times]) => <li><dfn>{word}</dfn><span>×{times}</span></li>}</For>
            </ul>
          </Show>
        </section>
      </div>
      <Show when={a().left.length}>
        <p class="left-out">Not counted: {a().left.map((l) => `${l.title} (${l.year}), ${l.why === "posthumous" ? "released after a death" : l.why === "instrumental" ? "instrumental" : `Genius has ${l.why}`}`).join("; ")}.</p>
      </Show>
    </article>
  );
}
