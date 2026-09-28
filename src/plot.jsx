// Chart, Plot and Scale. A Plot stacks slats (one per row of data), and a Chart holds the scale, the orientation and the axis.
import { useCore, useGutters, useCross, useSlatCss, useRoot, watchRoot, serverSheets, checkLinked } from "./style.js";
import {
  createMemo, createComputed, createRenderEffect, createEffect, createContext, useContext, getOwner, runWithOwner, onMount,
  onCleanup, createSignal, createSelector, createRoot, createUniqueId, mergeProps, splitProps, untrack, sharedConfig, Index,
  For, Show,
} from "solid-js";
import { delegateEvents } from "solid-js/web";
import { isServer } from "./env.js";
import { createStore } from "solid-js/store";
import { animated, curve, cssCurve, MOVE_MS } from "./animate.js";
import { nice } from "./data.js";
import { writeVars, withVars } from "./blocks.jsx";

const isList = (g) => Array.isArray(g) || (ArrayBuffer.isView(g) && !(g instanceof DataView));

// Slat i gets item i of every data group. A value that is not a list is shared by every slat, and a shorter list wraps around.
export const at = (group, i) => {

  if (!isList(group)) return group;

  const v = group[i];
  if (v !== undefined || !group.length) return v;

  return group[i % group.length];
};

// Orientation is the direction bars run. "horizontal": bars run left to right and slats stack top to bottom.
// "vertical": bars run bottom to top and slats stack left to right. A Plot takes it from the Chart or Plot around it
// unless it sets its own, and "across" means the other one (the cells of a heatmap row run across the row).
// NOTE: Everything the Chart and Plots around an element tell it is in one context, because each provider costs
// computations: its orientation, the Chart's `animate` (motion), the Chart itself (frame), whether it is inside a slat
// (nested) and whether the Chart is static (still).
const Around = createContext({ orientation: () => "horizontal", motion: () => undefined, frame: null, nested: false, still: false });
export const useOrientation = () => useContext(Around).orientation;

// Whether the Chart around has a cross scale (a Line then draws its y on it)
export const useCrossed = () => {
  const frame = useContext(Around).frame;
  return () => frame?.crossed() ?? false;
};
export const short = (o) => (o === "vertical" ? "v" : "h");

// Plot settings. Every other prop of a Plot is a data group.
const SETTINGS = new Set(["children", "order", "reorder", "orientation", "overlap", "slats", "key", "rows", "animate", "thick", "class", "style", "ref", "onLoop", "static", "keyboard"]);

// The keys that move focus between the rows of a Plot with `keyboard`, and how many rows they move it
const STEPS = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1, Home: -Infinity, End: Infinity };

// A slat's layout setting for an orientation: a plain value, or { horizontal, vertical }
const pick = (v, o) => {

  if (v != null && typeof v === "object" && ("horizontal" in v || "vertical" in v)) return v[o];

  return v;
};

const px = (v) => (typeof v === "number" ? v + "px" : v);
const share = (v) => (typeof v === "number" ? v * 100 + "%" : v); // 0.18 -> "18%", and "4px" stays "4px"
const same = (a, b) => a.length === b.length && a.every((v, k) => v === b[k]);
const sameSet = (a, b) => a.size === b.size && [...a].every((v) => b.has(v));
const range = (n) => Array.from({ length: n }, (_, i) => i);
const byPosition = (positions) => range(positions.length).filter((i) => positions[i] != null).sort((a, b) => positions[a] - positions[b]);

// The proxy handler of every row's d. Its target holds the row, and P, the Plot's readers (see makePlot).
const ROW = {
  get: (t, key) => (typeof key === "string" ? t.P.read(t, key) : undefined),
  has: (t, key) => t.P.has(t, key),
  ownKeys: (t) => t.P.keys(t),
  getOwnPropertyDescriptor: (t, key) => (t.P.has(t, key) ? { configurable: true, enumerable: true, get: () => t.P.read(t, key) } : undefined),
};

// A block returned as a slat (in a Plot without overlap) gets placed as the row, which overrides part of its own
// placing (a Bar starts at 0 and fills the band). We warn about it once per page.
const BLOCK = /(^|\s)rhp-(bar|dot|tick|label|cell|area)(\s|$)/;
let warned = false;
const warnBare = (el) => {

  if (warned) return;

  warned = true;
  const name = el.getAttribute("class").match(BLOCK)[2];
  const Name = name[0].toUpperCase() + name.slice(1);
  console.warn(`rhp: a ${Name} is a slat's root here, so the Plot places it as the row and it ignores part of its own placing. Put it in an element: (d) => <div><${Name} … /></div>. (Only a Plot with overlap takes a block as its slat.)`);
};

// Room "auto" only measures an edge label that is a child of the slat's root. One inside another element gets no room,
// so we warn about it once per page. The labels of a Plot inside the row belong to that Plot and are left alone.
const autoRoom = (r) => r === "auto" || r?.start === "auto" || r?.end === "auto";
let warnedWrapped = false;
const warnWrapped = (el) => {

  if (warnedWrapped) return;

  for (const label of el.querySelectorAll(".rhp-label[data-rhp-edge]")) {
    const inner = label.closest(".rhp-plot");
    if (label.parentElement === el || (inner && el.contains(inner))) continue;
    warnedWrapped = true;
    console.warn(`rhp: an edge Label is inside another element here, so room "auto" doesn't measure it and it gets no room. Make it a child of the slat's root element: (d) => <div><Label edge="start">…</Label> … </div>. (Room in px has no such limit.)`);
    return;
  }
};

// On a server, a slat is HTML text ({ t }) instead of an element. So what the browser sets on a slat's root (its scope,
// orientation, position, role...) is written into the first tag of that text. The tag is read attribute by attribute
// (values in double quotes, single quotes, bare or none) and the rest of the HTML is left as it is.
const SPACE = /\s/;
function readTag(node) {

  // A component, <Show> or a context provider gives a function
  while (typeof node === "function") {
    node = node();
  }

  const t = node?.t;
  const oneElement = () => new Error("rhp: a slat must return one element");
  if (typeof t !== "string") throw oneElement();

  let i = 0;
  while (SPACE.test(t[i] ?? "")) {
    i++;
  }
  if (t[i] !== "<" || !/[a-zA-Z]/.test(t[i + 1] ?? "")) throw oneElement();

  let j = i + 1;
  while (j < t.length && !SPACE.test(t[j]) && t[j] !== ">" && t[j] !== "/") {
    j++;
  }
  const tag = { head: t.slice(0, i), name: t.slice(i + 1, j), attrs: [], end: "", rest: "" };

  for (;;) {
    while (SPACE.test(t[j] ?? "")) {
      j++;
    }
    if (j >= t.length) throw oneElement();
    if (t[j] === ">" || (t[j] === "/" && t[j + 1] === ">")) {
      tag.end = t[j] === ">" ? ">" : "/>";
      tag.rest = t.slice(j + tag.end.length);
      return tag;
    }
    if (t[j] === "/") {
      j++;
      continue;
    }
    // the attribute's name
    let k = j;
    while (k < t.length && !SPACE.test(t[k]) && t[k] !== "=" && t[k] !== ">" && !(t[k] === "/" && t[k + 1] === ">")) {
      k++;
    }
    const name = t.slice(j, k);
    j = k;
    while (SPACE.test(t[j] ?? "")) {
      j++;
    }
    if (t[j] !== "=") {
      tag.attrs.push([name]);
      continue;
    }
    // and its value
    j++;
    while (SPACE.test(t[j] ?? "")) {
      j++;
    }
    const q = t[j] === '"' || t[j] === "'" ? t[j] : "";
    let e = q ? t.indexOf(q, j + 1) : j;
    if (e < 0) throw oneElement();
    if (!q) {
      while (e < t.length && !SPACE.test(t[e]) && t[e] !== ">") {
        e++;
      }
    }
    tag.attrs.push([name, t.slice(q ? j + 1 : j, e), q]);
    j = q ? e + 1 : e;
  }
}

const quote = (v) => String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;");

// The tag as HTML again (the attributes we set are in double quotes)
const writeTag = (tag) => {

  const attrs = tag.attrs.map(([key, value, q]) => {
    if (value === undefined) return " " + key;
    return " " + key + "=" + (q ?? '"') + value + (q ?? '"');
  });

  return tag.head + "<" + tag.name + attrs.join("") + tag.end + tag.rest;
};

// Sets attributes on a slat's root tag and adds vars to its style. An attribute set to null is removed, one set to
// undefined is left as it is, and a function decides from the attribute's current value.
function onRoot(tag, attrs, vars) {

  if (!tag.attrs) tag = readTag(tag);
  const get = (key) => tag.attrs.find((a) => a[0] === key);

  for (const key in attrs) {
    const now = get(key);
    const value = typeof attrs[key] === "function" ? attrs[key](now?.[1]) : attrs[key];
    if (value === undefined) continue;
    if (now) tag.attrs.splice(tag.attrs.indexOf(now), 1);
    if (value !== null) tag.attrs.push([key, value === true ? undefined : quote(value), '"']);
  }

  const css = withVars(undefined, vars);

  if (css) {
    const st = get("style");
    if (!st) {
      tag.attrs.push(["style", quote(css), '"']);
    } else {
      const q = st[2] || '"';
      const add = q === "'" ? css.replace(/&/g, "&amp;").replace(/'/g, "&#39;") : quote(css);
      st[1] = (st[1] ? st[1].replace(/;?\s*$/, ";") : "") + add;
      st[2] = q;
    }
  }

  return { t: writeTag(tag) };
}

export function Plot(props) {
  return makePlot(props, "Plot");
}

// A Plot, or the Plot inside a Scale (role "Scale")
function makePlot(props, role) {

  if (typeof props.children !== "function") throw new Error(`rhp: a ${role}'s child must be a slat function, (d) => <div>…</div>`);

  useSlatCss(props.children);
  const layout = props.children.layout ?? {}; // the slat type's thickness, inset and room
  const { nested, frame, orientation: inherited, motion: inheritedMotion, still: stillAround } = useContext(Around);
  if (isServer) frame?.sheet(props.children); // on a server, the slat's CSS goes into the page with its Chart

  // A static Plot (or Chart) draws each row once and keeps no signals, memos or effects, which saves a lot of memory.
  // When its data, order or orientation changes, every row is drawn again (without animation).
  const still = props.static ?? stillAround;

  const orientation = () => {
    const o = props.orientation ?? inherited();
    if (o !== "across") return o;
    return inherited() === "vertical" ? "horizontal" : "vertical";
  };

  const groups = Object.keys(props).filter((key) => !SETTINGS.has(key));
  const isGroup = new Set(groups);

  // later() makes a memo the first time it is read. Only some Plots need these (sorting by a function, keys, the JS
  // version), and every memo a Plot doesn't make is memory saved.
  const owner = getOwner();
  const later = (fn, options) => {
    let memo;
    return () => (memo ??= runWithOwner(owner, () => createMemo(fn, undefined, options)))();
  };

  // Each data group is read through one memo, so an inline expression (value={rows().map(f)}) runs once per change
  // instead of once per slat.
  const group = {};
  for (const key of groups) {
    group[key] = createMemo(() => props[key]);
  }

  const rowsList = "rows" in props ? createMemo(() => props.rows) : () => undefined;
  const keyed = props.key != null;

  // The number of slats: `slats` if it is set, otherwise the longest list among the data groups and `rows`
  const n = createMemo(() => {
    if (props.slats != null) return props.slats;

    let count = isList(rowsList()) ? rowsList().length : 0;

    for (const key of groups) {
      const g = group[key]();
      if (isList(g)) count = Math.max(count, g.length);
    }

    return count;
  });

  // A value from a data group, or else from the row objects in `rows`
  const raw = (key, i) => {
    if (isGroup.has(key)) return at(group[key](), i);
    return at(rowsList(), i)?.[key];
  };

  // What a slat sees as d. d.key reads data group `key` for the slat's row when it is read (nothing is copied).
  // d.index is the row number and d.position its position. A data group that is a function is worked out per row.
  // `ahead` reads animated groups as they will be that many ms from now (it is used to work out the order).
  // NOTE: One handler (ROW) serves every row's d, and each row's own state is on the proxy's target.
  const P = {
    read(t, key) {
      if (key === "index") return t.row();
      if (key === "position") return pos[t.row()];
      const g = isGroup.has(key) ? group[key]() : undefined;
      if (typeof g === "function") return ((t.memos ??= {})[key] ??= runWithOwner(t.owner, () => createMemo(() => g(t.self))))();
      if (t.id && js() && isMoving(key)) return moving(key, t.id())(t.ahead);
      return raw(key, t.row());
    },
    has: (t, key) => key === "index" || key === "position" || isGroup.has(key) || (rowsList() != null && key in (at(rowsList(), t.row()) ?? {})),
    keys: (t) => [...new Set(["index", "position", ...groups, ...Object.keys(at(rowsList(), t.row()) ?? {})])],
  };

  function datum(row, id, ahead = 0) {
    const t = { P, row, id, ahead, owner: getOwner(), memos: null, self: null };
    return (t.self = new Proxy(t, ROW));
  }

  // Animation. Without `animate` it is the CSS version. animate={true} uses the JS version for every data group of
  // numbers, animate={["value"]} only for those groups, and animate={{ groups, duration, ease, slide }} adds timing.
  // A Plot without `animate` takes its Chart's.
  const anim = createMemo(() => {
    const a = props.animate ?? inheritedMotion();
    if (!a) return null;
    if (a === true) return { all: true };
    if (Array.isArray(a)) return { groups: a };
    return { ...a, all: a.groups == null };
  });

  const listed = later(() => new Set(anim()?.groups ?? []), { equals: sameSet });
  const all = later(() => anim()?.all === true);
  const isMoving = (key) => all() || listed().has(key);
  const js = () => anim() != null;
  const easing = later(() => curve(anim()?.ease));
  const timing = () => ({ duration: anim()?.duration ?? MOVE_MS, ease: easing() });

  // How long a slat takes to slide to a new position: 175ms in the JS version (centered on the frame where the two
  // values are equal), and 0.3s in the CSS version, unless set
  const slideMs = () => anim()?.slide ?? (js() ? 175 : undefined);

  // Row identity. Without `key`, a slat is its row number. With key={name} or key={(d) => id}, a slat follows its id,
  // so removing a row removes that row's slat and the rows after it keep theirs.
  const ids = keyed && createMemo(() => {
    const key = props.key;
    return range(n()).map((i) => (typeof key === "function" ? key(datum(() => i, null)) : raw(key, i)));
  }, undefined, { equals: same });

  const rowOf = keyed && later(() => new Map(ids().map((id, i) => [id, i])));
  const rowOfId = (id) => (keyed ? rowOf().get(id) : id);
  const idOf = (i) => (keyed ? ids()[i] : i);

  // JS version: one reader per (group, id), made when first used. The readers hold plain numbers, not signals.
  const readers = {};
  let pruning = false;

  const moving = (key, id) => {
    if (!pruning) {
      // Forget the readers of ids that are gone and of groups that stopped animating
      pruning = true;
      runWithOwner(owner, () => createComputed(() => {
        const live = new Set(keyed ? ids() : range(n()));

        for (const k in readers) {
          if (!js() || !isMoving(k)) {
            delete readers[k];
          } else {
            for (const readerId of readers[k].keys()) {
              if (!live.has(readerId)) readers[k].delete(readerId);
            }
          }
        }
      }));
    }

    const forGroup = (readers[key] ??= new Map());
    let reader = forGroup.get(id);
    if (!reader) forGroup.set(id, (reader = animated(() => raw(key, rowOfId(id)), timing)));

    return reader;
  };

  // Where each row is drawn (0 is the first place). It is a store, so a change only notifies the rows that moved.
  const [pos, setPos] = createStore([]);

  // The order: one position per row. `order` is either that list (gaps, ties and fractions all work, and null hides
  // a row) or a function (rows, current) => list, like sortBy().
  // NOTE: In the JS version the rows are read half a slide ahead, so two rows switching places pass each other in the
  // frame where their values are equal.
  const lead = () => (js() && (props.reorder ?? "slide") === "slide" ? (slideMs() ?? 0) / 2 : 0);

  const views = later(() => {
    const ms = lead();
    return range(n()).map((i) => datum(() => i, () => idOf(i), ms));
  });

  const positions = createMemo(
    (prev) => {
      const order = props.order;
      if (order == null) return range(n());
      if (typeof order === "function") return order(views(), prev?.length === n() ? prev : range(n()));
      return range(n()).map((i) => (isList(order) ? order[i] : order) ?? null);
    },
    undefined,
    { equals: same },
  );

  createComputed(() => setPos(positions().slice()));
  const shown = later(() => byPosition(positions()), { equals: same }); // the rows in the order they are shown
  const extent = createMemo(() => positions().reduce((m, p) => (p == null ? m : Math.max(m, p + 1)), 0));

  // Screen readers. The rows of a chart are a list: a top-level Plot is a list and each slat root a list item (unless the
  // slat gives it a role of its own). A Plot inside a slat or an overlap Plot is not a list of its own, and a Scale is
  // hidden like the axis. Sorted rows slide on screen but keep their place in the page, so the Plot lists them in the
  // order they are shown with aria-owns (and each row gets an id for it).
  const scale = role === "Scale";
  const asList = () => !nested && !scale && !props.overlap;
  const uid = createUniqueId(); // the same on a server and in the browser that hydrates its HTML

  // row -> the root's own id, for the few slats that give their root an id
  const [rowIds, setRowIds] = createSignal(null);
  const ownIdAt = (r, id) => setRowIds((m) => {
    const next = new Map(m);
    if (id) next.set(r, id);
    else next.delete(r);
    return next;
  });

  const reordered = () => props.order != null && (props.reorder ?? "slide") === "slide";

  const owns = () => {
    if (scale || !reordered()) return undefined;
    const list = shown();
    const own = rowIds();
    if (!list.some((r, k) => r !== k)) return undefined;
    return list.map((r) => own?.get(r) ?? `rhp-${uid}-${r}`).join(" ");
  };

  // Keyboard (keyboard={true}): the rows take focus. Tab stops at one row of the Plot (the row focused last, or else the
  // first shown), the arrow keys go to the row shown before or after it, and Home and End to the first and the last.
  // A row with focus keeps it when the rows are sorted, moved in the page or drawn again. Without it a Plot adds nothing.
  const keyboard = !!props.keyboard;
  let plotEl;

  const [picked, setPicked] = keyboard ? createSignal() : [];

  // The row Tab stops at (its id)
  const stop = keyboard && later(() => {
    const id = picked();
    const r = id === undefined ? undefined : rowOfId(id);
    if (r != null && r < n() && positions()[r] != null) return id;

    const first = shown()[0];

    return first === undefined ? undefined : idOf(first);
  });

  const isStop = keyboard && !still && !isServer && createSelector(stop);

  // The element that shows row r (a Plot's children are its slat roots)
  const elementOf = (r) => {
    for (const child of plotEl.children) {
      if (child.$row?.() === r) return child;
    }
  };

  function onKey(e) {
    const step = STEPS[e.key];
    if (e.target.parentElement !== plotEl || step === undefined || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;

    e.preventDefault();

    const list = shown();
    const k = list.indexOf(e.target.$row());

    elementOf(list[Math.min(Math.max(k + step, 0), list.length - 1)])?.focus();
  }

  function onFocusIn(e) {
    const el = e.target;
    if (el.parentElement !== plotEl) return;

    // A static Plot keeps no effects, so it moves the tab stop itself
    if (still) {
      for (const child of plotEl.children) {
        const want = child === el ? 0 : -1;
        if (child.tabIndex !== want) child.tabIndex = want;
      }
    }

    const id = idOf(el.$row());
    setPicked(() => id);
  }

  // Moving a row in the page or drawing it again takes its focus away, so the Plot notes whether a row has focus before
  // the rows change, and after they change it focuses the row Tab stops at
  let had = false;
  const note = () => (had = plotEl != null && document.activeElement?.parentElement === plotEl);
  const restore = () => {
    if (!had) return;

    had = false;
    const el = elementOf(rowOfId(stop()));
    if (el && el !== document.activeElement) el.focus({ preventScroll: true });
  };

  if (keyboard && !isServer && !still) {
    createComputed(() => {
      shown();
      stop();
      untrack(note);
    });
    createEffect(() => {
      shown();
      stop();
      untrack(restore);
    });
  }

  // The keys are handled like Solid's own events (onKeyDown), after the handlers of a row and what is in it
  const attach = (el) => {
    plotEl = el;
    if (!keyboard || isServer) return;

    delegateEvents(["keydown", "focusin"]);
    el.$$keydown = onKey;
    el.$$focusin = onFocusIn;
  };

  // Gutters: the Chart pads each side for the largest room its Plots ask for. A top-level Plot whose slat gives no room
  // gets the defaults (names at the start and values at the end), except an overlap Plot on a cross scale (its points
  // have no names).
  if (frame && (layout.room || (!nested && role === "Plot"))) {
    const defaults = () => (nested || role !== "Plot" || (props.overlap && frame.crossed()) ? null : DEFAULT_ROOM[frame.orientation()]);
    const want = () => pick(layout.room, frame.orientation()) ?? defaults();
    frame.need(want);
    onCleanup(() => frame.drop(want));
  }

  // With room "auto", the first row is checked for an edge label inside another element (see warnWrapped)
  let edgesUnchecked = !isServer && !nested && layout.room != null;
  const checkEdges = (el) => {
    edgesUnchecked = false;
    if (autoRoom(pick(layout.room, orientation()))) warnWrapped(el);
  };

  // A top-level Plot whose rows have no thickness asks its Chart to fit them (a horizontal Chart with a height then
  // makes its plot that tall and the rows share it)
  if (frame && !nested && role === "Plot" && !props.overlap) {
    const fits = () => pick(layout.thickness, orientation()) == null;
    frame.fit(fits);
    onCleanup(() => frame.unfit(fits));
  }

  const ran = (list) => {
    props.onLoop?.(); // lets a test count how often the loop runs
    return list;
  };

  // The slat's own root element is what the Plot stacks (the Plot adds no wrapper). The Plot writes --rhp-position on
  // it (or hides it when its position is null) and the CSS moves it that many bands.
  const slat = (row, id) => {
    if (isServer) return serverRow(props.children(datum(row, id)), row(), pos[row()]);

    const el = props.children(datum(row, id));
    if (typeof Element !== "undefined" && !(el instanceof Element)) throw new Error("rhp: a slat must return one element");
    if (asList() && !el.hasAttribute("role")) el.setAttribute("role", "listitem");
    const ownId = el.id.startsWith(`rhp-${uid}-`) ? "" : el.id; // not an id a server gave it for aria-owns
    if (!props.overlap && BLOCK.test(el.getAttribute("class"))) warnBare(el);
    if (edgesUnchecked) checkEdges(el);
    // The slat's CSS applies inside its own slats only (an attribute, because Solid's class={...} replaces className)
    if (props.children.scope) el.setAttribute("data-rhp-slat", props.children.scope);

    createRenderEffect((prev) => {
      const r = row();
      const dir = short(orientation());
      const p = pos[r];
      const id = ownId || (reordered() ? `rhp-${uid}-${r}` : "");

      if (dir !== prev?.dir) el.setAttribute("data-rhp-o", dir);
      if (p !== prev?.p) {
        el.hidden = p == null;
        if (p != null) el.style.setProperty("--rhp-position", p);
      }
      if (id !== prev?.id && id !== el.id) {
        if (id) el.id = id;
        else el.removeAttribute("id");
      }
      if (ownId && r !== prev?.r) {
        if (prev && untrack(rowIds)?.get(prev.r) === ownId) ownIdAt(prev.r);
        ownIdAt(r, ownId);
      }

      return { r, dir, p, id };
    });

    if (ownId) onCleanup(() => untrack(rowIds)?.get(untrack(row)) === ownId && ownIdAt(untrack(row)));
    if (keyboard) createRenderEffect(() => (el.tabIndex = isStop(id()) ? 0 : -1));
    el.$row = row; // lets a handler on the chart find which row a slat shows

    return el;
  };

  // On a server, the root tag of a row gets what slat() sets on it in a browser.
  // (It is only made on a server, so the browser build leaves it out.)
  const serverRow = isServer && ((node, r, p) => {
    const tag = readTag(node);
    const own = tag.attrs.find((a) => a[0] === "id")?.[1];
    const id = own ?? (reordered() ? `rhp-${uid}-${r}` : undefined);
    if (own) ownIdAt(r, own);

    return onRoot(tag, {
      "data-rhp-slat": props.children.scope ?? undefined,
      "data-rhp-o": short(orientation()),
      hidden: p == null ? true : null,
      role: asList() ? (v) => (v === undefined ? "listitem" : undefined) : undefined,
      id: own ? undefined : id,
      tabindex: keyboard ? (idOf(r) === stop() ? "0" : "-1") : undefined,
    }, { "--rhp-position": p });
  });

  // A static row is drawn in a root that is disposed right away, so its elements keep their values and nothing else stays
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
      if (keyboard) el.tabIndex = idOf(i) === untrack(stop) ? 0 : -1;
      dispose();
    });

    if (edgesUnchecked) checkEdges(el);
    el.$row = () => i;

    return el;
  };

  const action = () => props.reorder ?? "slide";

  // The slats, made by the reorder action. It is a component so that the memo is made inside the Provider below.
  const Slats = () => {
    if (still) {
      const rows = createMemo(() => {
        // The rows are drawn again when what they are drawn from changes
        for (const key of groups) {
          group[key]();
        }
        rowsList();
        orientation();
        const p = positions();
        if (keyboard && !isServer) note();

        return untrack(() => ran(range(n())).map((i) => drawn(i, p[i])));
      });

      if (keyboard && !isServer) {
        createEffect(() => {
          rows();
          untrack(restore);
        });
      }

      return rows;
    }

    return createMemo(() => {
      const a = action();
      return untrack(() => {
        // Move: the slat elements move in the DOM with their rows
        if (a === "move") {
          return <For each={ran(shown().map(idOf))}>{(id) => {
            const row = createMemo(() => rowOfId(id));
            return slat(row, () => id);
          }}</For>;
        }
        // Refill: slot k shows whichever row is k-th
        if (a === "refill") return <Index each={ran(shown())}>{(row) => slat(row, () => idOf(row()))}</Index>;
        // Slide: the slats never move in the page, --rhp-position moves them on screen
        if (keyed) return <For each={ran(ids())}>{(id, i) => slat(i, () => id)}</For>;
        return <Index each={ran(Array(n()))}>{(_, i) => slat(() => i, () => i)}</Index>;
      });
    });
  };

  // A Plot inside a slat doesn't take the Chart's `animate` (its data already moves)
  return (
    <Around.Provider value={{ orientation, motion: () => undefined, frame, nested: true, still }}>
      <div ref={(e) => { attach(e); props.ref?.(e); }} class={props.class ? "rhp-plot " + props.class : "rhp-plot"}
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

// A scale drawn by a slat: one slat per tick of the Chart's scale, all in one band and keyed by value.
// Each tick's slat sees d.at (its value), d.next (the next tick), d.first, d.last and d.toEnd (px from the tick to the end
// of the scale, measured in the browser). A tick at either end of the scale is keyed as that end, so the end line never
// slides when the max changes. `ticks` is a list of values, a number (about that many round values) or a function of
// the Chart's [min, max] like every(5). A Chart with a Scale in it draws no axis of its own.
export function Scale(props) {

  const frame = useContext(Around).frame;
  if (!frame) throw new Error("rhp: a Scale goes inside a Chart");

  frame.addScale();
  onCleanup(frame.dropScale);
  const ticks = createMemo(() => tickValues(props.ticks, frame.shown(), frame.domain()), undefined, { equals: same });
  const [, rest] = splitProps(props, ["ticks", "class"]);

  return makePlot(mergeProps(rest, {
    overlap: true,
    animate: false,
    key: (t) => {
      const [a, b] = frame.shown();
      if (t.at === a) return "min";
      if (t.at === b) return "max";
      return t.at;
    },
    get class() {
      return props.class ? "rhp-scale " + props.class : "rhp-scale";
    },
    get at() {
      return ticks();
    },
    next: (t) => ticks()[t.index + 1] ?? frame.shown()[1],
    first: (t) => t.index === 0,
    last: (t) => t.index === ticks().length - 1,
    toEnd: (t) => {
      const [a, b] = frame.shown();
      const length = frame.length();
      if (!length) return Infinity; // until it is measured
      return ((b - t.at) / (b - a || 1)) * length;
    },
  }), "Scale");
}

// The ticks for the part [a, b] of the scale on screen, where [a0, b0] is where the scale is going. A count of round
// values takes its step from where the scale is going, so it holds still while the JS version moves the scale.
function tickValues(t, [a, b], [a0, b0] = [a, b]) {

  if (t === false) return [];

  const eps = (b - a) * 1e-9;
  if (isList(t)) return Array.from(t).filter((v) => v >= a - eps && v <= b + eps);
  if (typeof t === "function") return t([a, b]);

  const { step } = nice(a0, b0, t ?? 5);
  const out = [];

  for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + 1e-9 * step; v += step) {
    out.push(+v.toFixed(10));
  }

  return out;
}

// The theme is the only way a page styles a chart. It is written on the chart root, so a page's own CSS variables never
// reach a chart, and a theme change (dark mode) is one write per key per chart.
export const THEME = {
  series: ["#2a78d6", "#eb6834", "#1baf7a", "#c2419a", "#7b5cd6", "#d39a12"],
  positive: "#13894f",
  negative: "#c62828",
  ink: "#1d232b",
  muted: "#6b7280",
  grid: "rgba(128, 128, 128, .22)",
  surface: "#ffffff",
  low: "#e8eef8",
  high: "#1f4fa8",
  font: "system-ui, sans-serif",
};

const ThemeContext = createContext(null);

// Gives every Chart inside it this theme (a Chart's own `theme` still wins, key by key)
export function Theme(props) {

  const outer = useContext(ThemeContext);

  return <ThemeContext.Provider value={() => ({ ...outer?.(), ...props.value })}>{props.children}</ThemeContext.Provider>;
}

function themeVars(theme) {

  const vars = {};
  theme.series.forEach((color, i) => (vars["--rhp-series-" + (i + 1)] = color));

  for (const key in theme) {
    if (key !== "series") vars["--rhp-" + key] = theme[key];
  }

  return vars;
}

// A data group of theme colors that goes through the series: "series-1", "series-2", ...
export const series = (n = THEME.series.length) => (d) => "series-" + ((d.index % n) + 1);

// Room is px outside the plot on each side, named along the value axis (start is before the scale's start, where the
// names go, and end is past its end) and along the stack (before the first slat and after the last)
const DEFAULT_ROOM = { horizontal: { start: 104, end: 44 }, vertical: { start: 28, end: 20 } };
const SIDES = {
  horizontal: { start: "left", end: "right", before: "top", after: "bottom" },
  vertical: { start: "bottom", end: "top", before: "left", after: "right" },
};
const AXIS = { horizontal: ["bottom", 24], vertical: ["left", 42] }; // where the axis numbers go, and their room
const AXIS_END = { horizontal: ["right", 14], vertical: ["top", 8] }; // half of the last number, centered on the far end
const AXIS_START = { horizontal: ["left", 14], vertical: ["bottom", 8] }; // and half of the first one

// A Chart is the frame around one or more Plots. It sets the scale (--rhp-min, --rhp-max) once for everything inside it,
// gives them its orientation and theme, makes room for what they draw outside the plot and draws the value axis.
// animate={true | { duration, ease, slide }} moves the scale with the JS version and is the default for its Plots.
// height is the plot's height in px (a vertical chart is 240px tall by default). A horizontal chart with a height fits
// rows without a thickness into it. static: the Plots inside draw their rows once.
export function Chart(props) {

  useCore();

  const orientation = () => props.orientation ?? "horizontal";
  const pageTheme = useContext(ThemeContext);
  const theme = createMemo(() => themeVars({ ...THEME, ...pageTheme?.(), ...props.theme }));
  const domain = createMemo(() => props.scale ?? [0, 100], undefined, { equals: same });

  const anim = () => (props.animate === true ? {} : props.animate);
  const timing = () => ({ duration: anim()?.duration ?? MOVE_MS, ease: curve(anim()?.ease) });
  const lo = animated(() => domain()[0], timing);
  const hi = animated(() => domain()[1], timing);
  const min = () => (anim() ? lo() : domain()[0]);
  const max = () => (anim() ? hi() : domain()[1]);
  const shown = () => [min(), max()]; // the scale on screen (where the JS version has moved it to)
  const ticks = createMemo(() => tickValues(props.ticks, shown(), domain()), undefined, { equals: same });

  const [wants, setWants] = createSignal([]);
  // The built-in axis is drawn from `ticks` and `format`, unless a Scale inside draws the scale
  const [scales, setScales] = createSignal(0);
  const [fitters, setFitters] = createSignal([]); // the Plots whose rows have no thickness
  const hasTicks = createMemo(() => tickValues(props.ticks, domain()).length > 0);
  const axis = () => scales() === 0 && hasTicks();

  // The plot's size on screen (a Scale gives each tick its distance to the end in px). It is 0 until measured.
  const [size, setSize] = createSignal({ w: 0, h: 0 }, { equals: (a, b) => a.w === b.w && a.h === b.h });
  const length = () => (orientation() === "vertical" ? size().h : size().w);
  const slats = new Set(); // on a server, the slat types drawn inside (their CSS goes into the page with the chart)

  // A second axis, across the band (cross={[min, max]}): an overlap Plot's rows then share the whole plot, and a Dot,
  // Label or Line takes a cross value on it, for scatter plots and lines. Without it, nothing of this is made.
  const crossed = () => props.cross != null;
  let crossMoves;
  const crossShown = () => {
    if (!anim()) return props.cross;
    crossMoves ??= [animated(() => props.cross[0], timing), animated(() => props.cross[1], timing)];
    return [crossMoves[0](), crossMoves[1]()];
  };
  const crossAxis = () => crossed() && tickValues(props.crossTicks, props.cross).length > 0;

  const frame = {
    orientation,
    domain,
    shown,
    length,
    crossed,
    sheet: (fn) => fn?.scope && slats.add(fn),
    need: (want) => setWants((list) => [...list, want]),
    drop: (want) => setWants((list) => list.filter((x) => x !== want)),
    addScale: () => setScales((count) => count + 1),
    fit: (f) => setFitters((list) => [...list, f]),
    unfit: (f) => setFitters((list) => list.filter((x) => x !== f)),
    dropScale: () => setScales((count) => count - 1),
  };

  // What the Plots inside ask of the chart: its gutters, and whether their rows fit its height.
  // Gutters are the chart's padding, sized by the largest room the Plots ask for. With room "auto" on a side, both ends
  // become columns (rows, when vertical) of the body's grid, as wide as that side's widest edge label (gutters.css).
  // NOTE: Everything that depends on what the Plots registered is worked out here. In the browser this is a memo that
  // follows them. On a server, a memo is worked out once when it is made (before the Plots register), so there it is
  // worked out when the chart's element is written, after the Plots have drawn.
  const arrange = () => {
    const o = orientation();
    const side = SIDES[o];
    const out = { top: 2, right: 2, bottom: 2, left: 2 };
    const room = { start: 0, end: 0 };
    const auto = {};

    for (const want of wants()) {
      const r = want() === "auto" ? { start: "auto", end: "auto" } : want();
      if (!r) continue;
      for (const k in side) {
        if (r[k] === "auto") {
          if (k in room) auto[k] = true;
        } else if (r[k] != null) {
          out[side[k]] = Math.max(out[side[k]], r[k]);
          if (k in room) room[k] = Math.max(room[k], r[k]);
        }
      }
    }

    if (axis()) {
      for (const [s, n] of [AXIS[o], AXIS_END[o], AXIS_START[o]]) {
        out[s] = Math.max(out[s], n);
      }
    }

    // The cross axis' numbers go where the other orientation's value axis would put them
    if (crossAxis()) {
      const other = o === "vertical" ? "horizontal" : "vertical";
      for (const [s, n] of [AXIS[other], AXIS_END[other], AXIS_START[other]]) {
        out[s] = Math.max(out[s], n);
      }
    }

    const vars = { "--rhp-room-start": room.start + "px", "--rhp-room-end": room.end + "px" };
    const gutters = !!(auto.start || auto.end);
    if (gutters && !isServer) useGutters(); // their rules come with the first chart that uses them
    if (crossed() && !isServer) useCross(); // and so do the cross scale's

    if (gutters) {
      // Both ends of the value axis move from the padding into the grid (at least as wide as the padding would be)
      for (const k of ["start", "end"]) {
        const n = out[side[k]];
        out[side[k]] = 0;
        vars["--rhp-gutter-" + k] = auto[k] ? `minmax(${n}px, max-content)` : n + "px";
      }
    }

    for (const s in out) {
      vars["--rhp-pad-" + s] = out[s] + "px";
    }

    return { vars, gutters, sized: props.height != null && o === "horizontal" && fitters().some((f) => f()) };
  };

  const sameArrangement = (a, b) => {
    if (a.gutters !== b.gutters || a.sized !== b.sized) return false;
    const keys = Object.keys(a.vars);
    return keys.length === Object.keys(b.vars).length && keys.every((key) => a.vars[key] === b.vars[key]);
  };

  const arranged = isServer ? arrange : createMemo(arrange, undefined, { equals: sameArrangement });

  // Turning the chart is a jump: nothing inside transitions for the two frames after a change
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
    // A server wrote rhp's CSS into the chart, and the browser has its own sheets now
    for (const st of el.querySelectorAll(":scope > style[data-rhp-server]")) {
      st.remove();
    }

    useRoot(el);
    onCleanup(watchRoot(el));
    const body = el.querySelector(".rhp-body");
    if (body) checkLinked(body);
    if (!body || typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(body);
    onCleanup(() => ro.disconnect());
  });

  // A chart with a name is a figure (label="Fruit sold this week", or aria-label or aria-labelledby). Any other aria-*
  // prop and id go on the chart's element too. The rest of the aria-* props are set in one effect because a spread
  // would make Solid watch every attribute of the element.
  const name = () => props.label ?? props["aria-label"];
  const figure = () => (name() != null || props["aria-labelledby"] != null ? props.role ?? "figure" : props.role);
  const moreAria = () => Object.keys(props).filter((key) => key.startsWith("aria-") && !OWN_ARIA.has(key));

  const node = (
    <Around.Provider value={{ orientation, motion: () => props.animate, frame, nested: false, still: props.static === true }}>
      <div ref={(e) => { el = e; props.ref?.(e); }} id={props.id} role={figure()} aria-label={name()} aria-labelledby={props["aria-labelledby"]}
        aria-describedby={props["aria-describedby"]} class={props.class ? "rhp-chart " + props.class : "rhp-chart"} data-rhp-o={short(orientation())}
        data-rhp-animate={anim() ? "js" : undefined} data-rhp-turning={turning() ? "" : undefined} data-rhp-sized={arranged().sized ? "" : undefined}
        data-rhp-gutters={arranged().gutters ? short(orientation()) : undefined} data-rhp-cross={crossed() ? "" : undefined} style={{ ...KNOBS, ...theme(), ...arranged().vars, ...props.style, "--rhp-height": px(props.height ?? 240) }}>
        <div class="rhp-body">
          {props.children}
          {/* after the children, so that a Scale among them has registered first */}
          <Show when={axis()}><Axis ticks={ticks()} format={props.format} /></Show>
          <Show when={crossAxis()}><Axis cross ticks={tickValues(props.crossTicks, crossShown(), props.cross)} format={props.crossFormat} /></Show>
        </div>
        {/* after the body, since a server only knows the slat types once they are drawn */}
        {isServer && <style data-rhp-server="" innerHTML={serverSheets(slats, sharedConfig.context?.assets, arranged().gutters, crossed())} />}
      </div>
    </Around.Provider>
  );

  // The scale is written like a block's numbers (now at first, then in the next frame)
  const scaleVars = () => {
    if (!crossed()) return { "--rhp-min": min(), "--rhp-max": max() };
    const [a, b] = crossShown();
    return { "--rhp-min": min(), "--rhp-max": max(), "--rhp-cross-min": a, "--rhp-cross-max": b };
  };
  writeVars(el, scaleVars);

  if (!isServer && moreAria().length) {
    createRenderEffect(() => {
      for (const key of moreAria()) {
        if (props[key] == null) el.removeAttribute(key);
        else el.setAttribute(key, props[key]);
      }
    });
  }

  // On a server, what depends on the Plots is written once they have drawn
  if (isServer) {
    const { vars, sized, gutters } = arranged();
    return onRoot(node, {
      ...Object.fromEntries(moreAria().map((key) => [key, props[key] ?? null])),
      style: withVars(undefined, { ...KNOBS, ...theme(), ...vars, ...props.style, "--rhp-height": px(props.height ?? 240), ...scaleVars() }),
      "data-rhp-sized": sized ? true : null,
      "data-rhp-gutters": gutters ? short(orientation()) : null,
    });
  }

  return node;
}

const OWN_ARIA = new Set(["aria-label", "aria-labelledby", "aria-describedby"]); // the Chart sets these itself

// The variables that blocks inherit start from rhp's defaults on the chart root, so a page's --rhp-* variables can't
// reach inside. A Plot, a block or a slat's CSS still sets them below.
const KNOBS = { "--rhp-inset": "18%" };

for (const name of ["color", "thick", "size", "across", "radius", "start-radius", "end-radius", "label-gap", "gap", "tick-width", "label-size",
  "cell-gap", "pitch", "plot-thick", "length-time", "length-ease", "slide-time", "slide-ease", "at", "from", "to", "value", "d", "position"]) {
  KNOBS["--rhp-" + name] = "initial";
}

// The value axis: one grid line per tick (keyed by value), and the numbers in the axis gutter. The cross axis (cross)
// draws its lines as the other orientation's value axis would, on the cross scale.
export function Axis(props) {

  const along = useOrientation();
  const orientation = () => (!props.cross ? along() : along() === "vertical" ? "horizontal" : "vertical");

  return (
    <div class="rhp-axis" data-rhp-cross={props.cross ? "" : undefined} aria-hidden="true">
      <For each={props.ticks}>
        {(t) => {
          // On a server the number is made inside the line, as in a browser, so the browser finds each element where
          // it expects it when it takes the page over
          if (isServer) {
            return (
              <div class="rhp-gridline" data-rhp-o={short(orientation())} style={withVars(undefined, { "--rhp-at": t })}>
                <span>{props.format ? props.format(t) : String(t)}</span>
              </div>
            );
          }

          const el = <div class="rhp-gridline"><span /></div>;
          const num = el.firstChild;
          el.style.setProperty("--rhp-at", t);

          createRenderEffect(() => {
            el.setAttribute("data-rhp-o", short(orientation()));
            const text = props.format ? props.format(t) : t; // text, or elements (format={(v) => <b>{v}</b>})
            const parts = [text].flat().map((x) => (typeof x === "function" ? x() : x));
            num.replaceChildren(...parts.map((x) => (x instanceof Node ? x : String(x ?? ""))));
          });

          return el;
        }}
      </For>
    </div>
  );
}
