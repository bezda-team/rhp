// rhp core: Plot stacks slats; Chart holds the scale, the orientation and the axis.
import { useCore, useGutters, useSlatCss, useRoot, watchRoot, serverSheets, checkLinked } from "./style.js";
import {
  createMemo, createComputed, createRenderEffect, createContext, useContext, getOwner, runWithOwner, onMount, onCleanup,
  createSignal, createRoot, createUniqueId, mergeProps, splitProps, untrack, sharedConfig, Index, For, Show,
} from "solid-js";
import { isServer } from "./env.js";
import { createStore } from "solid-js/store";
import { animated, curve, cssCurve, MOVE_MS } from "./animate.js";
import { nice } from "./data.js";
import { writeVars, withVars } from "./blocks.jsx";

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
// What the Chart and Plots around an element tell it, in one context (a provider costs four computations; a chart
// held six before, a third of all it made):
//   orientation: its direction; motion: the Chart's `animate`, for the Plots inside it; frame: the Chart around it
//   (its scale, and where a Plot asks for gutter room); nested: inside a slat, where a Plot fills its slat's band;
//   still: the Chart is static.
const Around = createContext({ orientation: () => "horizontal", motion: () => undefined, frame: null, nested: false, still: false });
export const useOrientation = () => useContext(Around).orientation;
export const short = (o) => (o === "vertical" ? "v" : "h");

// Plot settings. Every other prop is a data group.
const SETTINGS = new Set(["children", "order", "reorder", "orientation", "overlap", "slats", "key", "rows", "animate", "thick", "class", "style", "ref", "onLoop", "static"]);
// A slat's layout value for an orientation: a plain value, or { horizontal, vertical }.
const pick = (v, o) => (v != null && typeof v === "object" && ("horizontal" in v || "vertical" in v) ? v[o] : v);
const px = (v) => (typeof v === "number" ? v + "px" : v);
const share = (v) => (typeof v === "number" ? v * 100 + "%" : v); // 0.18 → "18%"; "4px" stays
const same = (a, b) => a.length === b.length && a.every((v, k) => v === b[k]);
const sameSet = (a, b) => a.size === b.size && [...a].every((v) => b.has(v));
const range = (n) => Array.from({ length: n }, (_, i) => i);
const byPosition = (pos) => range(pos.length).filter((i) => pos[i] != null).sort((a, b) => pos[a] - pos[b]);

// The proxy handler of every row's d: its target holds the row, and P, its Plot's readers (makePlot).
const ROW = {
  get: (t, k) => (typeof k === "string" ? t.P.read(t, k) : undefined),
  has: (t, k) => t.P.has(t, k),
  ownKeys: (t) => t.P.keys(t),
  getOwnPropertyDescriptor: (t, k) => (t.P.has(t, k) ? { configurable: true, enumerable: true, get: () => t.P.read(t, k) } : undefined),
};

// A block returned as a slat, in a Plot without overlap: the Plot places it as the row, over its own placing, so a Bar
// starts at 0 and fills the band, and a Cell loses its gap. It goes in an element that holds the row. Said once per page.
const BLOCK = /(^|\s)rhp-(bar|dot|tick|label|cell|area)(\s|$)/;
let warned = false;
const warnBare = (el) => {
  if (warned) return;
  warned = true;
  const name = el.getAttribute("class").match(BLOCK)[2];
  console.warn(`rhp: a ${name[0].toUpperCase() + name.slice(1)} is a slat's root here, so the Plot places it as the row and it ignores part of its own placing. Put it in an element: (d) => <div><${name[0].toUpperCase() + name.slice(1)} … /></div>. (Only a Plot with overlap takes a block as its slat.)`);
};

// On a server a slat is HTML text ({ t }), not an element. What the browser sets on a slat's root (its scope, direction,
// position, role…) is written into that text's first tag instead. The tag is read as HTML reads it, attribute by
// attribute: a value in double quotes, in single quotes, bare, or none. Each attribute is written back as it came, and
// the rest of the HTML is left untouched.
const SPACE = /\s/;
function readTag(node) {
  while (typeof node === "function") node = node(); // what a component, <Show> or a context provider gives
  const t = node?.t, one = () => new Error("rhp: a slat must return one element");
  if (typeof t !== "string") throw one();
  let i = 0;
  while (SPACE.test(t[i] ?? "")) i++;
  if (t[i] !== "<" || !/[a-zA-Z]/.test(t[i + 1] ?? "")) throw one();
  let j = i + 1;
  while (j < t.length && !SPACE.test(t[j]) && t[j] !== ">" && t[j] !== "/") j++;
  const tag = { head: t.slice(0, i), name: t.slice(i + 1, j), attrs: [], end: "", rest: "" };
  for (;;) {
    while (SPACE.test(t[j] ?? "")) j++;
    if (j >= t.length) throw one();
    if (t[j] === ">" || (t[j] === "/" && t[j + 1] === ">")) { tag.end = t[j] === ">" ? ">" : "/>"; tag.rest = t.slice(j + tag.end.length); return tag; }
    if (t[j] === "/") { j++; continue; }
    let k = j;
    while (k < t.length && !SPACE.test(t[k]) && t[k] !== "=" && t[k] !== ">" && !(t[k] === "/" && t[k + 1] === ">")) k++;
    const name = t.slice(j, k);
    j = k;
    while (SPACE.test(t[j] ?? "")) j++;
    if (t[j] !== "=") { tag.attrs.push([name]); continue; }
    j++;
    while (SPACE.test(t[j] ?? "")) j++;
    const q = t[j] === '"' || t[j] === "'" ? t[j] : "";
    let e = q ? t.indexOf(q, j + 1) : j;
    if (e < 0) throw one();
    if (!q) while (e < t.length && !SPACE.test(t[e]) && t[e] !== ">") e++;
    tag.attrs.push([name, t.slice(q ? j + 1 : j, e), q]);
    j = q ? e + 1 : e;
  }
}
const quote = (v) => String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
/** The tag as HTML again: its attributes as they came, and those set here in double quotes. */
const writeTag = (tag) => tag.head + "<" + tag.name + tag.attrs.map(([k, v, q]) => " " + k + (v === undefined ? "" : "=" + (q ?? '"') + v + (q ?? '"'))).join("") + tag.end + tag.rest;
// Sets attrs on a slat's root tag (null removes one; a function of the attribute's value now, or undefined, decides from
// it; undefined leaves it as it is), and adds vars to its style.
function onRoot(tag, attrs, vars) {
  if (!tag.attrs) tag = readTag(tag);
  const get = (k) => tag.attrs.find((a) => a[0] === k);
  for (const k in attrs) {
    const now = get(k), v = typeof attrs[k] === "function" ? attrs[k](now?.[1]) : attrs[k];
    if (v === undefined) continue;
    if (now) tag.attrs.splice(tag.attrs.indexOf(now), 1);
    if (v !== null) tag.attrs.push([k, v === true ? undefined : quote(v), '"']);
  }
  const css = withVars(undefined, vars);
  if (css) {
    const st = get("style");
    if (!st) tag.attrs.push(["style", quote(css), '"']);
    else { const q = st[2] || '"', add = q === "'" ? css.replace(/&/g, "&amp;").replace(/'/g, "&#39;") : quote(css); st[1] = (st[1] ? st[1].replace(/;?\s*$/, ";") : "") + add; st[2] = q; }
  }
  return { t: writeTag(tag) };
}

export function Plot(props) {
  return makePlot(props, "Plot");
}

// A Plot, or the Plot inside a Scale (role "Scale": no default gutters, since a scale draws no names or values of its own).
function makePlot(props, role) {
  if (typeof props.children !== "function") throw new Error(`rhp: a ${role}'s child must be a slat function, (d) => <div>…</div>`);
  useSlatCss(props.children);
  const layout = props.children.layout ?? {}; // the slat's own layout: thickness, inset, room (fixed per slat type)
  const { nested, frame, orientation: inherited, motion: inheritedMotion, still: stillAround } = useContext(Around);
  if (isServer) frame?.sheet(props.children); // a server writes the slat's CSS into the page with its Chart
  // Static (`static` on the Plot or its Chart, read once): each row is drawn once and keeps no signals, memos or effects,
  // for charts whose data doesn't change. A chart of 1,000 rows then holds a sixth of the memory. When the Plot's data,
  // order or direction does change, every row is drawn again, without animation, so the chart is never out of date.
  const still = props.static ?? stillAround;
  const orientation = () => {
    const o = props.orientation ?? inherited();
    return o === "across" ? (inherited() === "vertical" ? "horizontal" : "vertical") : o;
  };
  const groups = Object.keys(props).filter((k) => !SETTINGS.has(k));
  const isGroup = new Set(groups);
  // A memo made the first time it's read, under the Plot: for what only some Plots use (sorting by a function,
  // keys, the JS version). A chart holds some sixty signals and memos; each one it doesn't make is memory it keeps.
  const owner = getOwner();
  const later = (fn, options) => { let m; return () => (m ??= runWithOwner(owner, () => createMemo(fn, undefined, options)))(); };
  // Each data group is read through one memo, so an inline expression (value={rows().map(f)})
  // runs once per change, not once per slat that reads it.
  const group = {};
  for (const k of groups) group[k] = createMemo(() => props[k]);
  const rowsList = "rows" in props ? createMemo(() => props.rows) : () => undefined;
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

  // What a slat sees. d.k reads data group k at this slat's row when it is read; nothing is copied.
  // d.index is the row number, d.position its position. A data group that is a function is computed
  // per row, d.k = group(d), once per change (a memo per slat). `ahead` > 0 reads animated groups
  // as they will be that many ms from now; it is used to work out the order. Without an id (null),
  // d reads the data as given: animated groups move per id.
  // One handler (ROW, below) serves every row's d; this row's own state is on the proxy's target.
  const P = {
    read(t, k) {
      if (k === "index") return t.row();
      if (k === "position") return pos[t.row()];
      const g = isGroup.has(k) ? group[k]() : undefined;
      if (typeof g === "function") return ((t.memos ??= {})[k] ??= runWithOwner(t.owner, () => createMemo(() => g(t.self))))();
      if (t.id && js() && isMoving(k)) return moving(k, t.id())(t.ahead);
      return raw(k, t.row());
    },
    has: (t, k) => k === "index" || k === "position" || isGroup.has(k) || (rowsList() != null && k in (at(rowsList(), t.row()) ?? {})),
    keys: (t) => [...new Set(["index", "position", ...groups, ...Object.keys(at(rowsList(), t.row()) ?? {})])],
  };
  function datum(row, id, ahead = 0) {
    const t = { P, row, id, ahead, owner: getOwner(), memos: null, self: null };
    return (t.self = new Proxy(t, ROW));
  }

  // Animation. No `animate`: the CSS version. animate={true}: the JS version for every data group of numbers.
  // animate={["value"]}: the JS version for those groups. animate={{ groups, duration, ease, slide }}: the same
  // with timing (groups default to all). A Plot without `animate` takes its Chart's. duration, ease and slide are
  // also written as the CSS timing variables, so transitions in the slat match. By default a value moves as fast in
  // the JS version as in the CSS version: 150 ms, ease-out (MOVE_MS, rhp.css).
  const anim = createMemo(() => {
    const a = props.animate ?? inheritedMotion();
    if (!a) return null;
    if (a === true) return { all: true };
    if (Array.isArray(a)) return { groups: a };
    return { ...a, all: a.groups == null };
  });
  const listed = later(() => new Set(anim()?.groups ?? []), { equals: sameSet });
  const all = later(() => anim()?.all === true);
  const isMoving = (k) => all() || listed().has(k);
  const js = () => anim() != null;
  const easing = later(() => curve(anim()?.ease));
  const timing = () => ({ duration: anim()?.duration ?? MOVE_MS, ease: easing() });
  // How long a slat slides to a new position. JS version: 250 ms by default, centered on the
  // frame where the two values are equal (0 switches in that frame). CSS version: 0.3 s unless set.
  const slideMs = () => anim()?.slide ?? (js() ? 250 : undefined);

  // Row identity. Without `key` a slat is its row number. With key={name} or key={(d) => id} a slat
  // follows its id: removing a row removes that row's slat, and the rows after it keep theirs.
  // A key function sees the data as given, never the JS version's in-between values (the row has no id yet).
  const ids = keyed && createMemo(() => {
    const k = props.key;
    return range(n()).map((i) => (typeof k === "function" ? k(datum(() => i, null)) : raw(k, i)));
  }, undefined, { equals: same });
  const rowOf = keyed && later(() => new Map(ids().map((id, i) => [id, i])));
  const rowOfId = (id) => (keyed ? rowOf().get(id) : id);
  const idOf = (i) => (keyed ? ids()[i] : i);

  // JS version: one reader per (group, id), made on first use. Readers hold plain numbers, not signals.
  const readers = {};
  let pruning = false;
  const moving = (k, id) => {
    if (!pruning) { // forget readers of ids that are gone and of groups that stopped animating
      pruning = true;
      runWithOwner(owner, () => createComputed(() => {
        const live = new Set(keyed ? ids() : range(n()));
        for (const k in readers) {
          if (!js() || !isMoving(k)) delete readers[k];
          else for (const id of readers[k].keys()) if (!live.has(id)) readers[k].delete(id);
        }
      }));
    }
    const m = (readers[k] ??= new Map());
    let r = m.get(id);
    if (!r) m.set(id, (r = animated(() => raw(k, rowOfId(id)), timing)));
    return r;
  };

  // Positions: where each row is drawn (0 = first). A store, so a change notifies only rows whose position changed.
  const [pos, setPos] = createStore([]);

  // Order: one position per row, from any function. `order` is either that list (a data group:
  // gaps, ties and fractions all work; null hides a row) or a function (rows, current) => list,
  // where rows[i] is row i's d and current is the list on screen now. sortBy() is one such function.
  // JS version with Slide: rows are read half a slide ahead, so two rows switching places
  // pass each other in the frame where their values are equal.
  const lead = () => (js() && (props.reorder ?? "slide") === "slide" ? (slideMs() ?? 0) / 2 : 0);
  const views = later(() => { const ms = lead(); return range(n()).map((i) => datum(() => i, () => idOf(i), ms)); });
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
  const shown = later(() => byPosition(positions()), { equals: same }); // rows in display order (Move, Refill, aria-owns)
  const extent = createMemo(() => positions().reduce((m, p) => (p == null ? m : Math.max(m, p + 1)), 0));

  // Accessibility. A chart's rows are a list: a top-level Plot is a list and each slat root a list item (unless the slat
  // gives its root a role of its own). A Plot inside a slat (a heatmap's cells), and an overlap Plot (dots in one band,
  // an overlay) are part of what their rows show, not lists of their own: announced as lists they only add noise. A
  // Scale is hidden from screen readers, as the axis is. Sorted rows slide on screen but keep their place in the page,
  // so a screen reader would read them in data order: the Plot then lists its rows in display order in aria-owns,
  // which is the order it reads them in, and each row gets an id for it (its own, if the slat gives one).
  const scale = role === "Scale";
  const asList = () => !nested && !scale && !props.overlap;
  const uid = createUniqueId(); // the same on a server and in the browser that hydrates its HTML
  // row -> its root's own id, for the rows whose slat gives one (few do: a Map in a signal, made on first use)
  const [rowIds, setRowIds] = createSignal(null);
  const ownIdAt = (r, id) => setRowIds((m) => { const next = new Map(m); id ? next.set(r, id) : next.delete(r); return next; });
  const reordered = () => props.order != null && (props.reorder ?? "slide") === "slide";
  const owns = () => {
    if (scale || !reordered()) return undefined;
    const list = shown();
    const own = rowIds();
    return list.some((r, k) => r !== k) ? list.map((r) => own?.get(r) ?? `rhp-${uid}-${r}`).join(" ") : undefined;
  };

  // Gutters: the Chart pads each side for the largest room its Plots ask for. A top-level Plot whose slat
  // gives no room gets the defaults (names at the start, values at the end); a Scale's slat gets none.
  if (frame && (layout.room || (!nested && role === "Plot"))) {
    const want = () => pick(layout.room, frame.orientation()) ?? (nested || role !== "Plot" ? null : DEFAULT_ROOM[frame.orientation()]);
    frame.need(want);
    onCleanup(() => frame.drop(want));
  }
  // A top-level Plot whose rows have no thickness in this direction asks its Chart to fit them: a horizontal Chart with
  // a height then makes its plot that tall, and the rows share it.
  if (frame && !nested && role === "Plot" && !props.overlap) {
    const fits = () => pick(layout.thickness, orientation()) == null;
    frame.fit(fits);
    onCleanup(() => frame.unfit(fits));
  }

  const ran = (list) => (props.onLoop?.(), list); // lets a meter count loop runs

  // The slat's own root element is what the Plot stacks; the Plot adds no wrapper.
  // It writes --rhp-position on it (and hides it when its position is null); CSS translates it that many bands.
  const slat = (row, id) => {
    if (isServer) return serverRow(props.children(datum(row, id)), row(), pos[row()]);
    const el = props.children(datum(row, id));
    if (typeof Element !== "undefined" && !(el instanceof Element)) throw new Error("rhp: a slat must return one element");
    if (asList() && !el.hasAttribute("role")) el.setAttribute("role", "listitem");
    const ownId = el.id.startsWith(`rhp-${uid}-`) ? "" : el.id; // the slat's own id (not one a server gave it for aria-owns)
    if (!props.overlap && BLOCK.test(el.getAttribute("class"))) warnBare(el);
    if (props.children.scope) el.setAttribute("data-rhp-slat", props.children.scope); // the slat's CSS applies inside its own slats only (an attribute: Solid's class={…} rewrites className)
    createRenderEffect((prev) => { // its orientation (for :horizontal and :vertical in slat CSS), its position and its id
      const r = row(), dir = short(orientation()), p = pos[r], id = ownId || (reordered() ? `rhp-${uid}-${r}` : "");
      if (dir !== prev?.dir) el.setAttribute("data-rhp-o", dir);
      if (p !== prev?.p) { el.hidden = p == null; if (p != null) el.style.setProperty("--rhp-position", p); }
      if (id !== prev?.id && id !== el.id) id ? (el.id = id) : el.removeAttribute("id");
      if (ownId && r !== prev?.r) { if (prev && untrack(rowIds)?.get(prev.r) === ownId) ownIdAt(prev.r); ownIdAt(r, ownId); }
      return { r, dir, p, id };
    });
    if (ownId) onCleanup(() => untrack(rowIds)?.get(untrack(row)) === ownId && ownIdAt(untrack(row)));
    el.$row = row; // lets a handler on the chart find which row a slat shows
    return el;
  };
  // A row on a server: its root's first tag gets what slat() sets on it in a browser. (Made only there, so a browser's
  // build leaves it and what it uses out.)
  const serverRow = isServer && ((node, r, p) => {
    const tag = readTag(node), own = tag.attrs.find((a) => a[0] === "id")?.[1], id = own ?? (reordered() ? `rhp-${uid}-${r}` : undefined);
    if (own) ownIdAt(r, own);
    return onRoot(tag, {
      "data-rhp-slat": props.children.scope ?? undefined, "data-rhp-o": short(orientation()), hidden: p == null ? true : null,
      role: asList() ? (v) => (v === undefined ? "listitem" : undefined) : undefined, id: own ? undefined : id,
    }, { "--rhp-position": p });
  });
  // A static row: drawn in a root that is disposed right after, so its elements keep their values and nothing else stays.
  const drawn = (i, p) => {
    if (isServer) return serverRow(props.children(datum(() => i, null)), i, p);
    let el;
    createRoot((dispose) => {
      el = props.children(datum(() => i, null));
      if (typeof Element !== "undefined" && !(el instanceof Element)) throw new Error("rhp: a slat must return one element");
      if (props.children.scope) el.setAttribute("data-rhp-slat", props.children.scope);
      if (asList() && !el.hasAttribute("role")) el.setAttribute("role", "listitem");
      if (!el.id && reordered()) el.id = `rhp-${uid}-${i}`;
      el.setAttribute("data-rhp-o", short(orientation()));
      el.hidden = p == null;
      if (p != null) el.style.setProperty("--rhp-position", p);
      dispose();
    });
    el.$row = () => i;
    return el;
  };
  const action = () => props.reorder ?? "slide";
  // The slats, made by the reorder action (one memo, not a Switch: five fewer computations per Plot).
  // A component, so the memo is made inside the Provider below and the slats see what it provides.
  const Slats = () => still ? createMemo(() => {
    for (const k of groups) group[k](); // what the rows are drawn from: when it changes, they're drawn again
    rowsList(); orientation();
    const p = positions();
    return untrack(() => ran(range(n())).map((i) => drawn(i, p[i])));
  }) : createMemo(() => {
    const a = action();
    return untrack(() => {
      // Move: For over the ids in display order. Each slat's element moves in the DOM with its row.
      if (a === "move") return <For each={ran(shown().map(idOf))}>{(id) => { const row = createMemo(() => rowOfId(id)); return slat(row, () => id); }}</For>;
      // Refill: Index over the rows in display order. Slot k shows whichever row is k-th.
      if (a === "refill") return <Index each={ran(shown())}>{(row) => slat(row, () => idOf(row()))}</Index>;
      // Slide with key: For over the ids in row order. Slats never move in the page; --rhp-position moves them on screen.
      if (keyed) return <For each={ran(ids())}>{(id, i) => slat(i, () => id)}</For>;
      // Slide: Index over the count.
      return <Index each={ran(Array(n()))}>{(_, i) => slat(() => i, () => i)}</Index>;
    });
  });

  // A Plot nested in a slat does not take the Chart's `animate`: its data already arrive moving.
  return (
    <Around.Provider value={{ orientation, motion: () => undefined, frame, nested: true, still }}>
      <div ref={props.ref} class={props.class ? "rhp-plot " + props.class : "rhp-plot"}
        role={asList() ? "list" : undefined} aria-hidden={scale ? "true" : undefined} aria-owns={owns()}
        data-rhp-o={short(orientation())} data-rhp-reorder={action()} data-rhp-overlap={props.overlap ? "" : undefined}
        data-rhp-animate={js() ? "js" : undefined}
        style={{
          ...props.style, "--rhp-n": extent(),
          "--rhp-pitch": nested ? undefined : px(pick(layout.thickness, orientation())),
          "--rhp-inset": share(pick(layout.inset, orientation())),
          "--rhp-plot-thick": share(props.thick),
          "--rhp-slide-time": slideMs() == null ? undefined : slideMs() + "ms",
          "--rhp-length-time": anim()?.duration == null ? undefined : anim().duration + "ms",
          "--rhp-length-ease": cssCurve(anim()?.ease),
        }}>
        <Slats />
      </div>
    </Around.Provider>
  );
}

/**
 * A scale drawn by a slat: one slat per tick of the Chart's scale, all in one band, keyed by value, so a tick
 * keeps its slat when the scale changes. A tick at either end of the scale is keyed as that end instead: the
 * end is one slat whose value moves with the scale, so it never leaves the end (a tick that becomes the end
 * would otherwise slide there, in both versions). Each tick's slat sees d.at (its value), d.next (the next tick; the
 * scale's max after the last one), d.first and d.last, d.toEnd (px from the tick to the scale's end on screen, measured,
 * so a slat can leave out a number with no room; Infinity until measured, and on a server: in CSS, a Label's
 * calc((1 - var(--rhp-p)) * 100%) is that room in its max-width or max-height), and any other data group given to the Scale.
 * A slat can mark a value (lines, ticks, numbers at d.at) or fill an interval (bands or segments from d.at to d.next).
 * ticks: a list of values; a number (about that many round values, 5 by default); or a function of the
 * Chart's [min, max] that returns a list, such as every(5). A Chart with a Scale in it draws no axis of its own.
 * The ticks are those of the scale on screen: while the JS version moves the scale, a tick appears when the
 * moving end reaches it and goes when the end passes it, and its values are not animated a second time.
 */
export function Scale(props) {
  const frame = useContext(Around).frame;
  if (!frame) throw new Error("rhp: a Scale goes inside a Chart");
  frame.addScale();
  onCleanup(frame.dropScale);
  const ticks = createMemo(() => tickValues(props.ticks, frame.shown(), frame.domain()), undefined, { equals: same });
  const [, rest] = splitProps(props, ["ticks", "class"]);
  return makePlot(mergeProps(rest, {
    overlap: true, animate: false,
    key: (t) => { const [a, b] = frame.shown(); return t.at === a ? "min" : t.at === b ? "max" : t.at; },
    get class() { return props.class ? "rhp-scale " + props.class : "rhp-scale"; },
    get at() { return ticks(); },
    next: (t) => ticks()[t.index + 1] ?? frame.shown()[1],
    first: (t) => t.index === 0,
    last: (t) => t.index === ticks().length - 1,
    toEnd: (t) => { const [a, b] = frame.shown(), px = frame.length(); return px ? ((b - t.at) / (b - a || 1)) * px : Infinity; }, // Infinity until measured
  }), "Scale");
}

// Tick values for the part [a, b] of a scale that is on screen, where [a0, b0] is where the scale is going:
// false (none); a list (the values inside [a, b]); a function of [a, b] (every(5)); or a count of round values,
// whose step comes from where the scale is going, so it holds still while the JS version moves the scale.
function tickValues(t, [a, b], [a0, b0] = [a, b]) {
  if (t === false) return [];
  const eps = (b - a) * 1e-9;
  if (isList(t)) return Array.from(t).filter((v) => v >= a - eps && v <= b + eps);
  if (typeof t === "function") return t([a, b]);
  const { step } = nice(a0, b0, t ?? 5), out = [];
  for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + 1e-9 * step; v += step) out.push(+v.toFixed(10));
  return out;
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
const AXIS_START = { horizontal: ["left", 14], vertical: ["bottom", 8] }; // and half of the first, centered on the near end

// A Chart is the frame around one or more Plots: it sets the scale (--rhp-min, --rhp-max) once for everything
// inside it, gives them its orientation and theme, pads its sides for the room they ask for, and draws the
// value axis. Its own box is the page's (margin, width, display…), except that padding.
// animate={true | { duration, ease, slide }} moves the scale with the JS version, on the same page clock,
// and is the default `animate` of every Plot inside. height: the plot's height in px: a vertical chart's value axis (240 by default). A horizontal chart with a
// height fits rows that have no thickness into it; otherwise it grows with its rows.
// static: the Plots inside draw their rows once (see makePlot); the Chart's own scale, theme and size stay live.
export function Chart(props) {
  useCore();
  const orientation = () => props.orientation ?? "horizontal";
  const pageTheme = useContext(ThemeContext);
  const theme = createMemo(() => themeVars({ ...THEME, ...pageTheme?.(), ...props.theme }));
  const domain = createMemo(() => props.scale ?? [0, 100], undefined, { equals: same });
  const anim = () => (props.animate === true ? {} : props.animate);
  const timing = () => ({ duration: anim()?.duration ?? MOVE_MS, ease: curve(anim()?.ease) });
  const lo = animated(() => domain()[0], timing), hi = animated(() => domain()[1], timing);
  const min = () => (anim() ? lo() : domain()[0]);
  const max = () => (anim() ? hi() : domain()[1]);
  const shown = () => [min(), max()]; // the scale on screen: where it is going, or where the JS version has moved it to
  const ticks = createMemo(() => tickValues(props.ticks, shown(), domain()), undefined, { equals: same });
  const [wants, setWants] = createSignal([]);
  // The built-in axis: drawn from `ticks` and `format`, unless a Scale inside draws the scale.
  // Whether it is drawn (and its room) depends on where the scale is going, not on the ticks passing by.
  const [scales, setScales] = createSignal(0);
  const [fitters, setFitters] = createSignal([]); // Plots whose rows have no thickness
  const hasTicks = createMemo(() => tickValues(props.ticks, domain()).length > 0);
  const axis = () => scales() === 0 && hasTicks();
  // The plot's size on screen, measured (a Scale gives each tick its distance to the end in px). 0 until measured.
  const [size, setSize] = createSignal({ w: 0, h: 0 }, { equals: (a, b) => a.w === b.w && a.h === b.h });
  const length = () => (orientation() === "vertical" ? size().h : size().w);
  // On a server: the slat types drawn inside, whose CSS goes into the page with the chart (serverSheets).
  const slats = new Set();
  const frame = {
    orientation, domain, shown, length,
    sheet: (fn) => fn?.scope && slats.add(fn),
    need: (w) => setWants((l) => [...l, w]),
    drop: (w) => setWants((l) => l.filter((x) => x !== w)),
    addScale: () => setScales((n) => n + 1),
    fit: (f) => setFitters((l) => [...l, f]),
    unfit: (f) => setFitters((l) => l.filter((x) => x !== f)),
    dropScale: () => setScales((n) => n - 1),
  };
  // What the Plots inside ask of the chart, worked out together: its gutters and whether their rows fit its height.
  // Gutters are the chart's padding, sized by the room the Plots ask for (px, the largest wins), or with room "auto" on a
  // side, a column of the body's grid (horizontal; a row, vertical) as wide as that side's widest edge label: the rows
  // then lay their edge labels in it (rhp.css, [data-rhp-gutters]). Everything that depends on what the Plots registered
  // is in here, and nowhere else: a browser keeps it as a memo that follows them, and a server works it out when it
  // writes the chart's element, once they have drawn (a server's memo is worked out once, when it's made, before they ask).
  const arrange = () => {
    const o = orientation(), side = SIDES[o], out = { top: 2, right: 2, bottom: 2, left: 2 }, room = { start: 0, end: 0 }, auto = {};
    for (const w of wants()) {
      const r = w() === "auto" ? { start: "auto", end: "auto" } : w();
      if (r) for (const k in side) {
        if (r[k] === "auto") { if (k in room) auto[k] = true; }
        else if (r[k] != null) { out[side[k]] = Math.max(out[side[k]], r[k]); if (k in room) room[k] = Math.max(room[k], r[k]); }
      }
    }
    if (axis()) for (const [s, n] of [AXIS[o], AXIS_END[o], AXIS_START[o]]) out[s] = Math.max(out[s], n);
    const vars = { "--rhp-room-start": room.start + "px", "--rhp-room-end": room.end + "px" }, gutters = !!(auto.start || auto.end);
    if (gutters && !isServer) useGutters(); // its rules come with the first chart that asks for them
    // With a grid, both value-axis ends move from the padding into it: at least as wide as the padding would be.
    if (gutters) for (const k of ["start", "end"]) { const n = out[side[k]]; out[side[k]] = 0; vars["--rhp-gutter-" + k] = auto[k] ? `minmax(${n}px, max-content)` : n + "px"; }
    for (const s in out) vars["--rhp-pad-" + s] = out[s] + "px";
    return { vars, gutters, sized: props.height != null && o === "horizontal" && fitters().some((f) => f()) };
  };
  const sameArrangement = (a, b) => a.gutters === b.gutters && a.sized === b.sized && Object.keys(a.vars).length === Object.keys(b.vars).length && Object.keys(a.vars).every((k) => a.vars[k] === b.vars[k]);
  const arranged = isServer ? arrange : createMemo(arrange, undefined, { equals: sameArrangement });
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
  onMount(() => {
    // A server wrote rhp's CSS into the chart for the first paint; the browser's own sheets have it now.
    for (const st of el.querySelectorAll(":scope > style[data-rhp-server]")) st.remove();
    useRoot(el);
    onCleanup(watchRoot(el));
    const body = el.querySelector(".rhp-body");
    if (body) checkLinked(body);
    if (!body || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height })); // delivered before the first paint
    ro.observe(body);
    onCleanup(() => ro.disconnect());
  });
  // A chart with a name is a figure, read out with its name first: label="Fruit sold this week" (or the page's own
  // aria-label or aria-labelledby). Any other aria-* prop, and id, go on the chart's element too: the common ones as
  // attributes, the rest in one effect (a spread would make Solid watch every attribute of the chart's element).
  const name = () => props.label ?? props["aria-label"];
  const figure = () => (name() != null || props["aria-labelledby"] != null ? props.role ?? "figure" : props.role);
  const moreAria = () => Object.keys(props).filter((k) => k.startsWith("aria-") && !OWN_ARIA.has(k));
  const node = (
    <Around.Provider value={{ orientation, motion: () => props.animate, frame, nested: false, still: props.static === true }}>
      <div ref={(e) => { el = e; props.ref?.(e); }} id={props.id} role={figure()} aria-label={name()} aria-labelledby={props["aria-labelledby"]}
        aria-describedby={props["aria-describedby"]} class={props.class ? "rhp-chart " + props.class : "rhp-chart"} data-rhp-o={short(orientation())}
        data-rhp-animate={anim() ? "js" : undefined} data-rhp-turning={turning() ? "" : undefined} data-rhp-sized={arranged().sized ? "" : undefined}
        data-rhp-gutters={arranged().gutters ? short(orientation()) : undefined} style={{ ...KNOBS, ...theme(), ...arranged().vars, ...props.style, "--rhp-height": px(props.height ?? 240) }}>
        <div class="rhp-body">
          {props.children}
          {/* after the children, so a Scale among them has registered first; plots paint above it (z-index) */}
          <Show when={axis()}><Axis ticks={ticks()} format={props.format} /></Show>
        </div>
        {/* after the body: the CSS of every slat type drawn in it, which a server knows only once they're drawn */}
        {isServer && <style data-rhp-server="" innerHTML={serverSheets(slats, sharedConfig.context?.assets, arranged().gutters)} />}
      </div>
    </Around.Provider>
  );
  // The scale is written like a block's numbers: now at first, then in the next frame (frame.js).
  writeVars(el, () => ({ "--rhp-min": min(), "--rhp-max": max() }));
  if (!isServer && moreAria().length) createRenderEffect(() => { for (const k of moreAria()) props[k] == null ? el.removeAttribute(k) : el.setAttribute(k, props[k]); });
  // A server writes what depends on the Plots (arrange) once they have drawn (a browser updates it as they come).
  if (isServer) {
    const { vars, sized, gutters } = arranged();
    return onRoot(node, {
      ...Object.fromEntries(moreAria().map((k) => [k, props[k] ?? null])),
      style: withVars(undefined, { ...KNOBS, ...theme(), ...vars, ...props.style, "--rhp-height": px(props.height ?? 240), "--rhp-min": min(), "--rhp-max": max() }),
      "data-rhp-sized": sized ? true : null, "data-rhp-gutters": gutters ? short(orientation()) : null,
    });
  }
  return node;
}

const OWN_ARIA = new Set(["aria-label", "aria-labelledby", "aria-describedby"]); // the Chart sets these itself

// The variables blocks read by inheritance start from rhp's defaults on the chart root, inline, so a page's --rhp-*
// (v1's docs told apps to set them on :root or on .rhp-chart) can't reach inside. The Plot, a block or a slat's CSS still sets them below.
const KNOBS = { "--rhp-inset": "18%" };
for (const k of ["color", "thick", "size", "across", "radius", "start-radius", "end-radius", "label-gap", "gap", "tick-width", "label-size", "cell-gap", "pitch", "plot-thick", "length-time",
  "length-ease", "slide-time", "slide-ease", "at", "from", "to", "value", "d", "position"]) KNOBS["--rhp-" + k] = "initial";

// The value axis: one grid line per tick, keyed by value (For), numbers in the axis gutter.
export function Axis(props) {
  const o = useOrientation();
  return (
    <div class="rhp-axis" aria-hidden="true">
      <For each={props.ticks}>
        {(t) => { // one effect per line for its direction and its number (three before)
          // On a server, the number is made inside the line, as in a browser: a format that returns elements makes
          // them after the line's, so the browser that takes the page over finds each where it looks for it.
          if (isServer) return <div class="rhp-gridline" data-rhp-o={short(o())} style={withVars(undefined, { "--rhp-at": t })}><span>{props.format ? props.format(t) : String(t)}</span></div>;
          const el = <div class="rhp-gridline"><span /></div>, num = el.firstChild;
          el.style.setProperty("--rhp-at", t);
          createRenderEffect(() => {
            el.setAttribute("data-rhp-o", short(o()));
            const text = props.format ? props.format(t) : t; // text, or elements (format={(v) => <b>{v}</b>})
            num.replaceChildren(...[text].flat().map((x) => (typeof x === "function" ? x() : x)).map((x) => (x instanceof Node ? x : String(x ?? ""))));
          });
          return el;
        }}
      </For>
    </div>
  );
}
