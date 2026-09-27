// rhp core: Plot stacks slats; Chart holds the scale, the orientation and the axis.
import { useCore, useSlatCss, useRoot, watchRoot } from "./style.js";
import {
  createMemo, createComputed, createRenderEffect, createContext, useContext, getOwner, runWithOwner, onMount, onCleanup,
  createSignal, Index, For, Show, Switch, Match,
} from "solid-js";
import { createStore } from "solid-js/store";
import { animated, curve, cssCurve } from "./animate.js";
import { nice } from "./data.js";

const isList = (g) => Array.isArray(g) || (ArrayBuffer.isView(g) && !(g instanceof DataView));

// The routing rule. Slat i gets item i of every data group.
// A value that is not a list is shared by every slat; a shorter list wraps around.
export const at = (group, i) => {
  if (!isList(group)) return group;
  const v = group[i];
  return v !== undefined || !group.length ? v : group[i % group.length];
};

// Orientation is the direction bars run.
// "horizontal": bars run left to right, and slats stack top to bottom.
// "vertical": bars run bottom to top, and slats stack left to right.
// A Plot takes it from the nearest Chart or Plot above it unless it sets its own;
// "across" means the other one (the cells of a heatmap row run across the row).
const Orientation = createContext(() => "horizontal");
const Motion = createContext(() => undefined); // a Chart's `animate`, for the Plots inside it
const Frame = createContext(null); // the Chart around a Plot: its orientation, and where a Plot asks for gutter room
const Nested = createContext(false); // true inside a slat: a Plot there fills its slat's band
export const useOrientation = () => useContext(Orientation);
export const short = (o) => (o === "vertical" ? "v" : "h");

// Plot settings. Every other prop is a data group.
const SETTINGS = new Set(["children", "order", "reorder", "orientation", "overlap", "slats", "key", "rows", "animate", "thick", "class", "style", "ref", "onLoop"]);
// A slat's layout value for an orientation: a plain value, or { horizontal, vertical }.
const pick = (v, o) => (v != null && typeof v === "object" && ("horizontal" in v || "vertical" in v) ? v[o] : v);
const px = (v) => (typeof v === "number" ? v + "px" : v);
const share = (v) => (typeof v === "number" ? v * 100 + "%" : v); // 0.18 → "18%"; "4px" stays
const same = (a, b) => a.length === b.length && a.every((v, k) => v === b[k]);
const sameSet = (a, b) => a.size === b.size && [...a].every((v) => b.has(v));
const range = (n) => Array.from({ length: n }, (_, i) => i);
const byPosition = (pos) => range(pos.length).filter((i) => pos[i] != null).sort((a, b) => pos[a] - pos[b]);

export function Plot(props) {
  if (typeof props.children !== "function") throw new Error("rhp: a Plot's child must be a slat function, (d) => <div>…</div>");
  useSlatCss(props.children);
  const layout = props.children.layout ?? {}; // the slat's own layout: band, inset, room (fixed per slat type)
  const nested = useContext(Nested), frame = useContext(Frame);
  const inherited = useOrientation();
  const orientation = () => {
    const o = props.orientation ?? inherited();
    return o === "across" ? (inherited() === "vertical" ? "horizontal" : "vertical") : o;
  };
  const groups = Object.keys(props).filter((k) => !SETTINGS.has(k));
  const isGroup = new Set(groups);
  // Each data group is read through one memo, so an inline expression (value={rows().map(f)})
  // runs once per change, not once per slat that reads it.
  const group = {};
  for (const k of groups) group[k] = createMemo(() => props[k]);
  const rowsList = createMemo(() => props.rows);
  const keyed = props.key != null;

  // The slat count: `slats` if set, otherwise the longest list among the data groups and `rows`.
  const n = createMemo(() => {
    if (props.slats != null) return props.slats;
    let len = isList(rowsList()) ? rowsList().length : 0;
    for (const k of groups) { const g = group[k](); if (isList(g)) len = Math.max(len, g.length); }
    return len;
  });
  // A value from a list data group, or else from the row objects in `rows`.
  const raw = (k, i) => (isGroup.has(k) ? at(group[k](), i) : at(rowsList(), i)?.[k]);

  // Animation. No `animate`: the CSS version. animate={true}: the JS version for every data group of numbers.
  // animate={["value"]}: the JS version for those groups. animate={{ groups, duration, ease, slide }}: the same
  // with timing (groups default to all). A Plot without `animate` takes its Chart's. duration, ease and slide are
  // also written as the CSS timing variables, so transitions in the slat match.
  const inheritedMotion = useContext(Motion);
  const anim = createMemo(() => {
    const a = props.animate ?? inheritedMotion();
    if (!a) return null;
    if (a === true) return { all: true };
    if (Array.isArray(a)) return { groups: a };
    return { ...a, all: a.groups == null };
  });
  const listed = createMemo(() => new Set(anim()?.groups ?? []), undefined, { equals: sameSet });
  const all = createMemo(() => anim()?.all === true);
  const isMoving = (k) => all() || listed().has(k);
  const js = () => anim() != null;
  const easing = createMemo(() => curve(anim()?.ease));
  const timing = () => ({ duration: anim()?.duration ?? 400, ease: easing() });
  // How long a slat slides to a new position. JS version: 100 ms by default, centered on the
  // frame where the two values are equal (0 switches in that frame). CSS version: 0.3 s unless set.
  const slideMs = () => anim()?.slide ?? (js() ? 100 : undefined);

  // Row identity. Without `key` a slat is its row number. With key={name} or key={(d) => id} a slat
  // follows its id: removing a row removes that row's slat, and the rows after it keep theirs.
  const ids = createMemo(() => {
    if (!keyed) return range(n());
    const k = props.key;
    return range(n()).map((i) => (typeof k === "function" ? k(datum(() => i, () => i)) : raw(k, i)));
  }, undefined, { equals: same });
  const rowOf = createMemo(() => (keyed ? new Map(ids().map((id, i) => [id, i])) : null));
  const rowOfId = (id) => (keyed ? rowOf().get(id) : id);

  // JS version: one reader per (group, id), made on first use. Readers hold plain numbers, not signals.
  const readers = {};
  const moving = (k, id) => {
    const m = (readers[k] ??= new Map());
    let r = m.get(id);
    if (!r) m.set(id, (r = animated(() => raw(k, rowOfId(id)), timing)));
    return r;
  };
  createComputed(() => { // forget readers of ids that are gone and of groups that stopped animating
    const live = new Set(ids());
    for (const k in readers) {
      if (!js() || !isMoving(k)) delete readers[k];
      else for (const id of readers[k].keys()) if (!live.has(id)) readers[k].delete(id);
    }
  });

  // Positions: where each row is drawn (0 = first). A store, so a change notifies only rows whose position changed.
  const [pos, setPos] = createStore([]);

  // What a slat sees. d.k reads data group k at this slat's row when it is read; nothing is copied.
  // d.index is the row number, d.position its position. A data group that is a function is computed
  // per row, d.k = group(d), once per change (a memo per slat). `ahead` > 0 reads animated groups
  // as they will be that many ms from now; it is used to work out the order.
  function datum(row, id, ahead = 0) {
    const owner = getOwner(), memos = {};
    const read = (k) => {
      if (k === "index") return row();
      if (k === "position") return pos[row()];
      const g = isGroup.has(k) ? group[k]() : undefined;
      if (typeof g === "function") return (memos[k] ??= runWithOwner(owner, () => createMemo(() => g(self))))();
      if (js() && isMoving(k)) return moving(k, id())(ahead);
      return raw(k, row());
    };
    const has = (k) => k === "index" || k === "position" || isGroup.has(k) || (rowsList() != null && k in (at(rowsList(), row()) ?? {}));
    const self = new Proxy({}, {
      get: (_, k) => (typeof k === "string" ? read(k) : undefined),
      has: (_, k) => has(k),
      ownKeys: () => [...new Set(["index", "position", ...groups, ...Object.keys(at(rowsList(), row()) ?? {})])],
      getOwnPropertyDescriptor: (_, k) => (has(k) ? { configurable: true, enumerable: true, get: () => read(k) } : undefined),
    });
    return self;
  }

  // Order: one position per row, from any function. `order` is either that list (a data group:
  // gaps, ties and fractions all work; null hides a row) or a function (rows, current) => list,
  // where rows[i] is row i's d and current is the list on screen now. sortBy() is one such function.
  // JS version with Slide: rows are read half a slide ahead, so two rows switching places
  // pass each other in the frame where their values are equal.
  const lead = () => (js() && (props.reorder ?? "slide") === "slide" ? (slideMs() ?? 0) / 2 : 0);
  const views = createMemo(() => { const ms = lead(); return range(n()).map((i) => datum(() => i, () => ids()[i], ms)); });
  const positions = createMemo(
    (prev) => {
      const o = props.order;
      if (o == null) return range(n());
      if (typeof o === "function") return o(views(), prev?.length === n() ? prev : range(n()));
      return range(n()).map((i) => (isList(o) ? o[i] : o) ?? null);
    },
    undefined,
    { equals: same },
  );
  createComputed(() => setPos(positions().slice()));
  const shown = createMemo(() => byPosition(positions()), undefined, { equals: same }); // rows in display order
  const extent = createMemo(() => positions().reduce((m, p) => (p == null ? m : Math.max(m, p + 1)), 0));

  // Gutters: the Chart pads each side for the largest room its Plots ask for. A top-level Plot whose slat
  // gives no room gets the defaults (names at the start, values at the end).
  if (frame && (layout.room || !nested)) {
    const want = () => pick(layout.room, frame.orientation()) ?? (nested ? null : DEFAULT_ROOM[frame.orientation()]);
    frame.need(want);
    onCleanup(() => frame.drop(want));
  }

  const ran = (list) => (props.onLoop?.(), list); // lets a meter count loop runs

  // The slat's own root element is what the Plot stacks; the Plot adds no wrapper.
  // It writes --rhp-position on it (and hides it when its position is null); CSS translates it that many bands.
  const slat = (row, id) => {
    const el = props.children(datum(row, id));
    if (typeof Element !== "undefined" && !(el instanceof Element)) throw new Error("rhp: a slat must return one element");
    if (props.children.scope) el.setAttribute("data-rhp-slat", props.children.scope); // the slat's CSS applies inside its own slats only (an attribute: Solid's class={…} rewrites className)
    createRenderEffect(() => {
      const p = pos[row()];
      el.hidden = p == null;
      if (p != null) el.style.setProperty("--rhp-position", p);
    });
    el.$row = row; // lets a handler on the chart find which row a slat shows
    return el;
  };
  const action = () => props.reorder ?? "slide";

  return (
    <Orientation.Provider value={orientation}>
      <div ref={props.ref} class={props.class ? "rhp-plot " + props.class : "rhp-plot"}
        data-rhp-o={short(orientation())} data-rhp-reorder={action()} data-rhp-overlap={props.overlap ? "" : undefined}
        data-rhp-animate={js() ? "js" : undefined}
        style={{
          ...props.style, "--rhp-n": extent(),
          "--rhp-pitch": nested ? undefined : px(pick(layout.band, orientation())),
          "--rhp-inset": share(pick(layout.inset, orientation())),
          "--rhp-plot-thick": share(props.thick),
          "--rhp-slide-time": slideMs() == null ? undefined : slideMs() + "ms",
          "--rhp-length-time": anim()?.duration == null ? undefined : anim().duration + "ms",
          "--rhp-length-ease": cssCurve(anim()?.ease),
        }}>
        {/* A Plot nested in a slat does not take the Chart's `animate`: its data already arrive moving. */}
        <Nested.Provider value={true}><Motion.Provider value={() => undefined}><Switch>
          <Match when={action() === "slide" && !keyed}>
            {/* Slide: Index over the count. Slats never move in the page; --rhp-position moves them on screen. */}
            <Index each={ran(Array(n()))}>{(_, i) => slat(() => i, () => i)}</Index>
          </Match>
          <Match when={action() === "slide" && keyed}>
            {/* Slide with key: For over the ids in row order. Still no moves when the order changes. */}
            <For each={ran(ids())}>{(id, i) => slat(i, () => id)}</For>
          </Match>
          <Match when={action() === "move"}>
            {/* Move: For over the ids in display order. Each slat's element moves in the DOM with its row. */}
            <For each={ran(shown().map((i) => ids()[i]))}>{(id) => { const row = createMemo(() => rowOfId(id)); return slat(row, () => id); }}</For>
          </Match>
          <Match when={action() === "refill"}>
            {/* Refill: Index over the rows in display order. Slot k shows whichever row is k-th. */}
            <Index each={ran(shown())}>{(row) => slat(row, () => ids()[row()])}</Index>
          </Match>
        </Switch></Motion.Provider></Nested.Provider>
      </div>
    </Orientation.Provider>
  );
}

// The theme: a fixed schema, the only way a page styles a chart. Anything left out takes the default.
// Written inline on the chart root, so a page's own CSS variables never reach a chart, and a theme
// change (dark mode) is one write per key per chart, none per slat.
export const THEME = {
  series: ["#2a78d6", "#eb6834", "#1baf7a", "#c2419a", "#7b5cd6", "#d39a12"],
  positive: "#13894f", negative: "#c62828", ink: "#1d232b", muted: "#6b7280", grid: "rgba(128, 128, 128, .22)",
  surface: "#ffffff", low: "#e8eef8", high: "#1f4fa8", font: "system-ui, sans-serif",
};
const ThemeContext = createContext(null);
/** Gives every Chart inside it this theme (a Chart's own `theme` still wins, key by key). */
export function Theme(props) {
  const outer = useContext(ThemeContext);
  return <ThemeContext.Provider value={() => ({ ...outer?.(), ...props.value })}>{props.children}</ThemeContext.Provider>;
}
function themeVars(t) {
  const v = {};
  t.series.forEach((c, i) => (v["--rhp-series-" + (i + 1)] = c));
  for (const k in t) if (k !== "series") v["--rhp-" + k] = t[k];
  return v;
}
/** The theme keys a color prop can name: "series-1"…, "positive", "negative", "ink", "muted", "grid", "surface", "low", "high". */
export const series = (n = THEME.series.length) => (d) => "series-" + ((d.index % n) + 1);

// Gutters. Room is px outside the plot on each side, named along the value axis (start: before the scale's
// start, where names go; end: past its end) and along the stack (before the first slat; after the last).
const DEFAULT_ROOM = { horizontal: { start: 104, end: 44 }, vertical: { start: 28, end: 20 } };
const SIDES = { // room side → padding side
  horizontal: { start: "left", end: "right", before: "top", after: "bottom" },
  vertical: { start: "bottom", end: "top", before: "left", after: "right" },
};
const AXIS = { horizontal: ["bottom", 24], vertical: ["left", 42] }; // where the axis numbers go, and their room
const AXIS_END = { horizontal: ["right", 14], vertical: ["top", 8] }; // half of the last number, centered on the far end

// A Chart is the frame around one or more Plots: it sets the scale (--rhp-min, --rhp-max) once for everything
// inside it, gives them its orientation and theme, pads its sides for the room they ask for, and draws the
// value axis. Its own box is the page's (margin, width, display…), except that padding.
// animate={true | { duration, ease, slide }} moves the scale with the JS version, on the same page clock,
// and is the default `animate` of every Plot inside. height: the value axis length in px when vertical (240).
export function Chart(props) {
  useCore();
  const orientation = () => props.orientation ?? "horizontal";
  const pageTheme = useContext(ThemeContext);
  const theme = createMemo(() => themeVars({ ...THEME, ...pageTheme?.(), ...props.theme }));
  const domain = createMemo(() => props.scale ?? [0, 100], undefined, { equals: same });
  const anim = () => (props.animate === true ? {} : props.animate);
  const timing = () => ({ duration: anim()?.duration ?? 400, ease: curve(anim()?.ease) });
  const lo = animated(() => domain()[0], timing), hi = animated(() => domain()[1], timing);
  const min = () => (anim() ? lo() : domain()[0]);
  const max = () => (anim() ? hi() : domain()[1]);
  const ticks = createMemo(() => {
    const t = props.ticks, [a, b] = domain();
    if (t === false) return [];
    if (isList(t)) return t;
    return nice(a, b, t ?? 5).ticks.filter((v) => v >= a && v <= b);
  });
  const [wants, setWants] = createSignal([]);
  const frame = {
    orientation,
    need: (w) => setWants((l) => [...l, w]),
    drop: (w) => setWants((l) => l.filter((x) => x !== w)),
  };
  const pad = createMemo(() => {
    const o = orientation(), side = SIDES[o], out = { top: 2, right: 2, bottom: 2, left: 2 }, room = { start: 0, end: 0 };
    for (const w of wants()) {
      const r = w();
      if (r) for (const k in side) if (r[k] != null) { out[side[k]] = Math.max(out[side[k]], r[k]); if (k in room) room[k] = Math.max(room[k], r[k]); }
    }
    if (ticks().length) for (const [s, n] of [AXIS[o], AXIS_END[o]]) out[s] = Math.max(out[s], n);
    return {
      "--rhp-pad-top": out.top + "px", "--rhp-pad-right": out.right + "px", "--rhp-pad-bottom": out.bottom + "px", "--rhp-pad-left": out.left + "px",
      "--rhp-room-start": room.start + "px", "--rhp-room-end": room.end + "px",
    };
  }, undefined, { equals: (a, b) => Object.keys(a).every((k) => a[k] === b[k]) });
  // Turning the chart is a jump, not a slide: nothing inside transitions for the two frames after a change.
  // (A transition across the turn also left Chromium with stale overflow: a phone page scrolled sideways by 670px.)
  const [turning, setTurning] = createSignal(false);
  createComputed((was) => {
    const o = orientation();
    if (was && was !== o && typeof requestAnimationFrame === "function") {
      setTurning(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setTurning(false)));
    }
    return o;
  });
  let el;
  onMount(() => { useRoot(el); onCleanup(watchRoot(el)); });
  return (
    <Orientation.Provider value={orientation}><Motion.Provider value={() => props.animate}><Frame.Provider value={frame}>
      <div ref={(e) => { el = e; props.ref?.(e); }} class={props.class ? "rhp-chart " + props.class : "rhp-chart"} data-rhp-o={short(orientation())}
        data-rhp-animate={anim() ? "js" : undefined} data-rhp-turning={turning() ? "" : undefined}
        style={{ ...KNOBS, ...theme(), ...pad(), ...props.style, "--rhp-height": px(props.height ?? 240), "--rhp-min": min(), "--rhp-max": max() }}>
        <div class="rhp-body">
          <Show when={ticks().length}><Axis ticks={ticks()} format={props.format} /></Show>
          {props.children}
        </div>
      </div>
    </Frame.Provider></Motion.Provider></Orientation.Provider>
  );
}

// The variables blocks read by inheritance start from rhp's defaults on the chart root, inline, so a page's --rhp-*
// (v1's docs told apps to set them on :root or on .rhp-chart) can't reach inside. The Plot, a block or a slat's CSS still sets them below.
const KNOBS = { "--rhp-inset": "18%" };
for (const k of ["color", "thick", "size", "across", "radius", "tick-width", "label-size", "cell-gap", "pitch", "plot-thick", "length-time",
  "length-ease", "slide-time", "slide-ease", "at", "from", "to", "value", "d", "position"]) KNOBS["--rhp-" + k] = "initial";

// The value axis: one grid line per tick, keyed by value (For), numbers in the axis gutter.
export function Axis(props) {
  const o = useOrientation();
  return (
    <div class="rhp-axis" aria-hidden="true">
      <For each={props.ticks}>
        {(t) => <div class="rhp-gridline" data-rhp-o={short(o())} style={{ "--rhp-at": t }}><span>{props.format ? props.format(t) : t}</span></div>}
      </For>
    </div>
  );
}
