// The ranking: every rapper's vocabulary as a shelf of their albums. Each album adds a segment as wide as the words it
// brought that none of their earlier albums had, so the whole bar is every different word on every album.
// A click opens the rapper in place: the slats below slide down to make room, and the shelf's segments drop into the
// album-by-album chart of the breakdown (a view transition between the two).

import { batch, createComputed, createEffect, createMemo, createSignal, For, Show, onCleanup, onMount, untrack } from "solid-js";
import { Chart, Plot, Bar, Dot, Tick, Label, slat, nice, drawing } from "@bezda/rhp";
import { ARTISTS, ERAS, SAMPLE, byName, number, compact, snug } from "./data.js";
import { THEME, spine, gold } from "./theme.js";
import { Dossier, vt } from "./Dossier.jsx";
import { wanted, setWanted, era, setEra, setPicked, pointed } from "./state.js";
import { Face } from "./faces.jsx";
import { hold, steady } from "./hold.js";

const MODES = [
  { key: "catalog", label: "Every album", value: (a) => a.unique },
  { key: "fair", label: `Per ${SAMPLE / 1000},000 words`, value: (a) => a.fair },
];

const WIDE = { thickness: 30, start: 222, end: 70 };
const NARROW = { thickness: 28, start: 150, end: 52 };

// One album on the shelf: a Bar from the words before it to the words after it. Its gold (--lit) is set once, and the
// rapper's slat being lit turns it on, so pointing at a rapper changes one class rather than every bar's color.
const Spine = slat({
  css: `
    .spine { --rhp-gap: 2px; --rhp-radius: 1px; }
    .spine[data-thin] { --rhp-gap: 0px; }
    .spine[data-flying] { view-transition-name: var(--vt); }
    .spine[data-out] { box-shadow: inset 0 0 0 1px var(--rhp-series-9); }
    .lit .spine:not([data-out]) { background: var(--lit); }
  `,
}, (s) => (
  <Bar class="spine" from={s.from} to={s.to} color={s.out ? "surface" : s.tone} style={{ "--vt": s.vt, "--lit": `var(--rhp-${s.gold})` }}
    data-flying={s.flying ? "" : undefined} data-out={s.out ? "" : undefined} data-thin={s.thin ? "" : undefined} />
));

// A rapper: rank and name, the shelf, the 35,000-word range and 2019's count (per-35,000 view), the number, and the
// breakdown when open
function artistSlat(size) {
  return slat({
    thickness: size.thickness,
    room: { start: size.start, end: size.end },
    css: `
      .artist { cursor: pointer; }
      .artist::before { content: ""; position: absolute; inset: 1px -${size.end}px 1px -${size.start}px; border-radius: 4px; background: transparent; transition: background-color .2s; }
      .artist.lit::before { background: color-mix(in srgb, var(--rhp-ink) 8%, transparent); }
      .artist:focus-visible { outline: none; }
      .artist:focus-visible::before { box-shadow: inset 0 0 0 2px var(--rhp-series-8); }
      .artist.open { z-index: 3; }
      .who { --rhp-label-gap: ${size === NARROW ? 34 : 40}px; padding-inline-start: 30px; font-size: ${size === NARROW ? 12 : 14}px; font-weight: 500; ${size === NARROW ? "white-space: normal; line-height: 12px; text-overflow: clip;" : ""} }
      .avatar { overflow: visible; line-height: 0; }
      .avatar .face { display: inline-block; width: ${size === NARROW ? 20 : 24}px; height: ${size === NARROW ? 20 : 24}px; vertical-align: middle; border-radius: 50%; object-fit: cover; object-position: 50% 25%; box-shadow: 0 0 0 1.5px var(--rhp-grid); transition: box-shadow .2s, scale .2s; }
      .avatar .initials { display: inline-grid; place-items: center; background: var(--rhp-grid); color: var(--rhp-muted); font-size: 9px; font-weight: 700; line-height: 1; }
      .lit .avatar .face { box-shadow: 0 0 0 2px var(--rhp-series-8); scale: 1.12; }
      .rank { padding-inline-start: 2px; text-align: start; color: var(--rhp-muted); font-size: 12px; font-variant-numeric: tabular-nums; }
      .lit .who, .lit .rank { color: var(--rhp-series-8); font-weight: 600; }
      .value { font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; }
      .lit .value { color: var(--rhp-series-8); }
      .range, .cap, .then { z-index: 2; animation: overlay-in .45s ease-out .5s backwards; }
      .range { --rhp-radius: 1px; box-shadow: 0 0 0 1px var(--rhp-surface); }
      .cap { --rhp-tick-width: 2px; box-shadow: 0 0 0 1px var(--rhp-surface); }
      .then { background: none; box-shadow: inset 0 0 0 2.5px var(--rhp-series-8), 0 0 0 1.5px var(--rhp-surface); }
      .lit .then { box-shadow: inset 0 0 0 2.5px var(--rhp-ink), 0 0 0 1.5px var(--rhp-surface); }
      @keyframes overlay-in { from { opacity: 0; } }
      .artist.leaving { animation: artist-out .8s linear forwards; pointer-events: none; }
      .artist.entering { animation: artist-in .8s linear; }
      @keyframes artist-out { to { opacity: 0; visibility: hidden; } }
      @keyframes artist-in { from { opacity: 0; } }
      .sheet {
        position: absolute;
        top: 100%;
        left: -${size.start}px;
        right: -${size.end}px;
        padding: 26px 0 34px;
        background: var(--rhp-surface);
        border-block: 1px solid var(--rhp-grid);
        cursor: auto;
        animation: sheet-in .55s cubic-bezier(.2, .7, .2, 1) backwards;
      }
      @keyframes sheet-in { from { clip-path: inset(0 0 100% 0); } to { clip-path: inset(0 0 0 0); } }
      @media (prefers-reduced-motion: reduce) { .sheet, .range, .cap, .then, .artist.leaving, .artist.entering { animation: none; } .artist::before, .avatar .face { transition: none; } }
    `,
  }, (d) => (
    <div class={`artist${d.lit ? " lit" : ""}${d.open ? " open" : ""}${d.move}`} data-name={d.name}
      aria-label={`${d.name}: ${d.say}`} aria-expanded={d.open ? "true" : "false"}>
      <Label edge="start" class="rank" aria-hidden="true">{d.place}</Label>
      <Label edge="start" class="who">{d.name}</Label>
      <Label edge="start" class="avatar" aria-hidden="true"><Face name={d.name} /></Label>
      <Plot overlap from={d.from} to={d.to} tone={d.tones} gold={d.golds} vt={d.vts} flying={d.flying} out={d.open && !d.fairView} thin={d.thin}>{Spine}</Plot>
      <Show when={d.fairView && d.low != null}>
        <Bar class="range" from={d.low} to={d.high} thick="2px" color="ink" />
        <Tick class="cap" at={d.low} thick="10px" color="ink" />
        <Tick class="cap" at={d.high} thick="10px" color="ink" />
        <Dot class="then" at={d.pudding} size="13px" color="surface" />
      </Show>
      <Label at={d.labelAt} class="value">{d.value == null ? "" : number.format(d.value)}</Label>
      <Show when={d.open}>
        <div class="sheet" ref={d.sheet} onKeyDown={(e) => e.stopPropagation()}>
          <Dossier artist={byName.get(d.name)} narrow={d.narrow} onClose={d.close} />
        </div>
      </Show>
    </div>
  ));
}

const Wide = artistSlat(WIDE);
const Narrow = artistSlat(NARROW);

export function Ranking() {

  const media = matchMedia("(max-width: 720px)");
  const [narrow, setNarrow] = createSignal(media.matches);
  const onMedia = (e) => setNarrow(e.matches);
  media.addEventListener("change", onMedia);
  onCleanup(() => media.removeEventListener("change", onMedia));

  const [mode, setMode] = createSignal(MODES[0]);
  const [on, setOn] = createSignal(null); // the rapper the pointer or the focus is on
  const [open, setOpen] = createSignal(null); // the rapper whose breakdown is open: the rapper picked in every chart
  createEffect(() => setPicked(open()));
  const [flying, setFlying] = createSignal(null); // the rapper whose shelf is flying to or from the breakdown
  const [sheetHeight, setSheetHeight] = createSignal(900);
  const [slow, setSlow] = createSignal(false); // a switch of view moves the bars slowly enough to follow
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");

  // The top 25 at first, so the article goes on below; an era, a search or a rapper asked for shows them all
  const FIRST = 25;
  const [all, setAll] = createSignal(false);
  const size = () => (narrow() ? NARROW : WIDE);

  // The shelves are stacked album by album the first time the chart comes into view: `built` albums so far
  const most = Math.max(...ARTISTS.map((a) => a.albums.length));
  const [built, setBuilt] = createSignal(reduced.matches ? most : 0);
  let plotArea;
  onMount(() => {
    if (built() === most) return;
    const seen = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      seen.disconnect();
      const step = () => {
        setBuilt((b) => b + 1);
        if (built() < most) setTimeout(step, 90);
      };
      setTimeout(step, 150);
    }, { threshold: 0.15 });
    seen.observe(plotArea);
    onCleanup(() => seen.disconnect());
  });
  const value = (a) => mode().value(a);
  // In the per-35,000 view a rapper's shelf is shrunk to their average run, each album keeping its share
  const shrink = (a) => (mode().key === "fair" ? (a.fair ?? 0) / a.unique : 1);
  const fairView = () => mode().key === "fair";

  // A switch of view happens in two beats: the bars take their new lengths in place, then the slats move to their new
  // places. The order follows the view a little later.
  const [sortMode, setSortMode] = createSignal(MODES[0]);
  createEffect(() => {
    const m = mode();
    if (m === sortMode()) return;
    const later = setTimeout(() => setSortMode(m), reduced.matches ? 0 : 650);
    onCleanup(() => clearTimeout(later));
  });
  const sortValue = (a) => sortMode().value(a);
  // Straight to every album, in one beat: for a rapper asked for who has no per-35,000 count
  const everyAlbum = () => batch(() => {
    setMode(MODES[0]);
    setSortMode(MODES[0]);
  });

  // Rows shown in this view, best first
  const ranked = createMemo(() => ARTISTS.map((_, i) => i)
    .filter((i) => (era() === "all" || ARTISTS[i].era === era()) && sortValue(ARTISTS[i]) != null)
    .sort((x, y) => sortValue(ARTISTS[y]) - sortValue(ARTISTS[x])));
  // The rapper whose breakdown is open stays in the list, below the top 25 if a switch of view takes them there
  const shown = createMemo(() => {
    if (all() || era() !== "all") return ranked();
    const at = ranked().findIndex((i) => ARTISTS[i].name === open());
    return at < FIRST ? ranked().slice(0, FIRST) : [...ranked().slice(0, FIRST), ranked()[at]];
  });
  const more = () => ranked().length - shown().length;

  // Slats that come into the list or leave it (another view, another era) move through its last place instead of
  // appearing or vanishing in a frame while the rest slide: a slat that leaves slides down to the last place as it fades
  // out and is hidden there, and a slat that comes in starts at the last place, faded, and slides up to its own place as
  // it fades in. Show all and its way back only add or cut the end of the list, so their slats come and go at once.
  // A rapper whose breakdown is open and who leaves (an era they are not in) is closed.
  const FADE = 800; // the fades in the slat's CSS
  const [leaving, setLeaving] = createSignal(new Set());
  const [entering, setEntering] = createSignal(new Set());
  const [waiting, setWaiting] = createSignal(new Set()); // slats that came in, drawn at the last place for a frame first
  let change = 0;
  let done;
  const move = (before, now) => {
    const id = ++change;
    clearTimeout(done);
    const kept = new Set(now.list);
    const out = new Set([...before.list, ...leaving()].filter((i) => !kept.has(i)));
    if ([...out].some((i) => ARTISTS[i].name === open())) setOpen(null);
    if (reduced.matches || before.all !== now.all) {
      setLeaving(new Set());
      setEntering(new Set());
      setWaiting(new Set());
      return;
    }
    const old = new Set(before.list);
    const come = new Set(now.list.filter((i) => !old.has(i)));
    setLeaving(out);
    setEntering(new Set([...come, ...[...entering()].filter((i) => kept.has(i))]));
    setWaiting(come);
    requestAnimationFrame(() => requestAnimationFrame(() => id === change && setWaiting(new Set())));
    done = setTimeout(() => {
      setLeaving(new Set());
      setEntering(new Set());
    }, FADE + 50);
  };
  createComputed((before) => {
    const now = { list: shown(), all: untrack(all) };
    if (before) untrack(() => move(before, now));
    return now;
  });

  // Places on screen: the rapper whose breakdown is open pushes the rest down by the breakdown's height. Slats that come
  // in or leave are at the last place (a slat that leaves from below it, as an open rapper's can, fades where it is).
  const gap = () => Math.ceil(sheetHeight() / size().thickness) + 1;
  const places = createMemo((before) => {
    const out = ARTISTS.map(() => null);
    const list = shown();
    const at = list.findIndex((i) => ARTISTS[i].name === open());
    const place = (p) => p + (at >= 0 && p > at ? gap() : 0);
    const last = place(list.length - 1);

    for (const [p, i] of list.entries()) {
      out[i] = waiting().has(i) ? last : place(p);
    }
    for (const i of leaving()) {
      out[i] = Math.max(before?.[i] ?? last, last);
    }

    return out;
  });
  const rankOf = createMemo(() => new Map(ranked().map((i, p) => [ARTISTS[i].name, p + 1])));
  // Bars start at zero; in the per-35,000 view the scale also holds each career's strongest run and 2019's count.
  // The scale is the view's, over every rapper in it, so it changes once, with the bars.
  const top = createMemo(() => {
    const list = ARTISTS.filter((a) => (era() === "all" || a.era === era()) && value(a) != null);
    return snug(0, Math.max(...list.map((a) => (fairView() ? Math.max(a.sample.high, a.pudding) : a.unique))), 0.015);
  });

  // The breakdown's sheet: its height sets the room the slats below make for it
  let observer;
  const watchSheet = (el) => {
    observer?.disconnect();
    // Measured as soon as it is in the page, before the frame is drawn, so the slats below make room in that frame and
    // the observer's first report, the same height, changes nothing (a change made inside an observer's callback is
    // a "ResizeObserver loop" in Safari)
    queueMicrotask(() => {
      if (!el.isConnected) return;
      setSheetHeight(el.offsetHeight + 8);
      steady();
    });
    // Later changes: the slats below move at once, inside this callback, so whatever is held on screen further down is
    // put back now
    observer = new ResizeObserver(() => {
      setSheetHeight(el.offsetHeight + 8);
      steady();
    });
    observer.observe(el);
  };
  onCleanup(() => observer?.disconnect());

  // Opening and closing: the shelf of the rapper who opens flies into the breakdown, and the one who closes flies back
  const stagger = document.head.appendChild(document.createElement("style"));
  onCleanup(() => stagger.remove());
  const toggle = (name, go = true) => {
    if (name && !shown().some((i) => ARTISTS[i].name === name)) setAll(true);
    const before = open();
    const after = before === name ? null : name;
    const change = () => drawing(() => {
      setOpen(after);
      setFlying(before);
    });

    if (!document.startViewTransition || reduced.matches || !go) {
      change();
      if (after && go) reveal(after);
      return;
    }

    // Each album leaves a little after the one before it
    const delays = [before, after].filter(Boolean).flatMap((n) => byName.get(n).albums.map((_, k) => `::view-transition-group(${vt(n, k)}) { animation-delay: ${Math.min(k * 40, 500)}ms; }`));
    stagger.textContent = delays.join("\n");
    setFlying(after);
    const t = document.startViewTransition(change);
    t.finished.finally(() => {
      setFlying(null);
      if (after) reveal(after);
    });
  };

  // Brings an opened rapper to the top of the screen, under the controls
  let controls;
  const reveal = (name) => {
    const el = document.querySelector(`.ranking [data-name="${CSS.escape(name)}"]`);
    if (!el) return;
    const y = el.getBoundingClientRect().top + scrollY - (controls?.offsetHeight ?? 0) - 12;
    if (Math.abs(y - scrollY) > 40) scrollTo({ top: y, behavior: reduced.matches ? "auto" : "smooth" });
  };

  const choose = (setter, v) => {
    setSlow(true);
    setter(v);
    clearTimeout(choose.timer);
    choose.timer = setTimeout(() => setSlow(false), 900);
  };

  // The rapper an element belongs to: null inside an open breakdown, between slats, or outside the chart
  const nameOf = (el) => (el.closest(".sheet") ? null : el.closest("[data-name]")?.dataset.name ?? null);
  const pick = (e) => {
    const name = nameOf(e.target);
    if (name != null) setOn(name);
  };
  const leave = (e) => {
    if (e.pointerType === "touch") return; // a finger sends pointerleave as it lifts after a tap
    setOn(e.currentTarget.contains(document.activeElement) ? nameOf(document.activeElement) : null);
  };
  const click = (e) => {
    const name = nameOf(e.target);
    if (name == null) return;
    setOn(name);
    toggle(name);
  };
  const key = (e) => {
    const name = nameOf(e.target);
    if ((e.key === "Enter" || e.key === " ") && name != null) {
      e.preventDefault();
      toggle(name);
    } else if (e.key === "Escape" && open()) {
      const name = open();
      toggle(name);
      document.querySelector(`.ranking [data-name="${CSS.escape(name)}"]`)?.focus();
    }
  };

  // Finding a rapper by name opens them, in whichever era they belong to
  const find = (e) => {
    const a = byName.get(e.currentTarget.value.trim()) ?? ARTISTS.find((x) => x.name.toLowerCase() === e.currentTarget.value.trim().toLowerCase());
    if (!a) return;
    batch(() => {
      if (era() !== "all" && era() !== a.era) setEra("all");
      if (value(a) == null) everyAlbum();
    });
    if (open() !== a.name) toggle(a.name);
    else reveal(a.name);
    setOn(a.name);
    e.currentTarget.value = "";
    e.currentTarget.blur();
  };

  // The chart, for one slat type: the phone's or the desktop's
  const chart = (Type) => (
    <Chart scale={[top().min, top().max]} ticks={narrow() ? top().ticks.filter((_, i) => i % 2 === 0) : top().ticks}
      format={(v) => (narrow() ? compact(v) : number.format(v))} theme={THEME}
      style={{ "--rhp-length-time": slow() ? ".75s" : ".2s", "--rhp-slide-time": slow() ? ".8s" : ".55s", "--rhp-length-ease": "cubic-bezier(.3, .7, .2, 1)" }}
      label={`Rappers ranked by different words used, ${fairView() ? `in an average ${number.format(SAMPLE)} words` : "on every official album"}`}>
      <Plot rows={ARTISTS} key="name" order={places()} keyboard
        place={(d) => rankOf().get(d.name) ?? ""}
        value={(d) => value(d)}
        fairView={() => fairView()}
        low={(d) => d.sample?.low ?? null}
        high={(d) => d.sample?.high ?? null}
        from={(d) => d.albums.map((a) => a.from * shrink(d))}
        to={(d) => d.albums.map((a, k) => (k < built() ? a.to : a.from) * shrink(d))}
        labelAt={(d) => (fairView() ? top().max : d.unique)}
        tones={(d) => d.albums.map((_, k, all) => spine(k, all.length))}
        golds={(d) => d.albums.map((_, k, all) => gold(k, all.length))}
        vts={(d) => d.albums.map((_, k) => vt(d.name, k))}
        thin={(d) => d.albums.map((a) => ((a.to - a.from) * shrink(d)) / top().max < 0.005)}
        flying={(d) => flying() === d.name}
        move={(d) => (leaving().has(d.index) ? " leaving" : entering().has(d.index) ? " entering" : "")}
        lit={(d) => on() === d.name || open() === d.name}
        open={(d) => open() === d.name}
        say={(d) => say(d)}
        narrow={() => narrow()}
        sheet={() => watchSheet}
        close={() => () => toggle(open())}>
        {Type}
      </Plot>
    </Chart>
  );

  // Another chart asked for a rapper: show the ranking in a view that has them, open them, and go there if asked.
  // A request for no one closes the open rapper.
  createEffect(() => {
    const ask = wanted();
    if (!ask) return;
    setWanted(null);
    const a = byName.get(ask.name);
    if (!a) {
      if (open()) toggle(open(), false);
      return;
    }
    batch(() => {
      if (era() !== "all" && era() !== a.era) setEra("all");
      if (value(a) == null) everyAlbum();
    });
    if (open() !== a.name) queueMicrotask(() => toggle(a.name, ask.go));
    else if (ask.go) reveal(a.name);
  });

  const current = createMemo(() => byName.get(on() ?? pointed()) ?? null);
  const hidden = createMemo(() => ARTISTS.filter((a) => (era() === "all" || a.era === era()) && value(a) == null).length);

  const say = (a) => fairView()
    ? (a.fair == null ? `fewer than ${number.format(SAMPLE)} words on official albums` : `${number.format(a.fair)} different words in an average ${number.format(SAMPLE)}, from ${number.format(a.sample.low)} to ${number.format(a.sample.high)}; ${number.format(a.pudding)} in 2019's count`)
    : `${number.format(a.unique)} different words in ${number.format(a.words)} rapped, on ${a.albums.length} albums, ${a.first} to ${a.last}`;

  return (
    <div class="ranking">
      <div class="controls" ref={controls}>
        <div class="choices">
          <div class="choice" role="group" aria-labelledby="count-label">
            <span class="choice-label" id="count-label">Count</span>
            <div class="pills">
              <For each={MODES}>{(m) => (
                <button type="button" aria-pressed={mode() === m ? "true" : "false"} onClick={() => choose(setMode, m)}>{m.label}</button>
              )}</For>
            </div>
          </div>
          <div class="choice" role="group" aria-labelledby="era-label">
            <span class="choice-label" id="era-label">Era</span>
            <div class="pills">
              <For each={["all", ...ERAS]}>{(e) => (
                <button type="button" aria-pressed={era() === e ? "true" : "false"} onClick={() => choose(setEra, e)}>{e === "all" ? "All" : e.replace("19", "’").replace("20", "’")}</button>
              )}</For>
            </div>
          </div>
          <label class="find">
            <input type="search" list="rappers" placeholder={narrow() ? "Search" : "Find a rapper"} aria-label="Find a rapper and open their albums" onChange={find} />
            <datalist id="rappers"><For each={[...ARTISTS].sort((a, b) => a.name.localeCompare(b.name))}>{(a) => <option value={a.name} />}</For></datalist>
          </label>
        </div>
        <p class="readout" aria-live="polite">
          <Show when={current()} fallback={fairView()
            ? `Each shelf shrunk to the career’s average run of ${number.format(SAMPLE)} words; the line spans its weakest to strongest run, the ring marks 2019’s count.${hidden() ? ` ${hidden() === 1 ? "One rapper" : `${hidden()} rappers`} with fewer words left out.` : ""}`
            : "Each segment is an album’s new words, in release order. Tap a rapper to open their albums."}>
            {(a) => <><Face name={a().name} class="readout-face" /><b class="lit">#{rankOf().get(a().name) ?? "–"} {a().name}</b> · {say(a())}</>}
          </Show>
        </p>
      </div>
      <div ref={plotArea} onPointerMove={(e) => e.pointerType !== "touch" && pick(e)} onClick={click} onFocusIn={pick} onKeyDown={key}
        onPointerLeave={leave} onFocusOut={(e) => !e.currentTarget.contains(e.relatedTarget) && setOn(null)}>
        <Show when={narrow()} fallback={chart(Wide)}>{chart(Narrow)}</Show>
      </div>
      <Show when={more() > 0 || all()}>
        <button type="button" class="more" onClick={(e) => {
          // Showing the top 25 only shortens the chart above the button: the button stays where it is on screen
          const fix = all() ? hold(e.currentTarget) : null;
          setAll(!all());
          fix?.();
        }}>{all() ? `Show the top ${FIRST} only` : `Show all ${ranked().length} rappers`}</button>
      </Show>
    </div>
  );
}
