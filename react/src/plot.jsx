// A Plot stacks slats, one per row of data: its child is the slat function, (d) => <div>…</div>, and every other prop
// is a data group. Scale is a Plot of the ticks of the Chart's scale.
import { Fragment, cloneElement, isValidElement, memo, useContext, useId, useInsertionEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { jsx } from "react/jsx-runtime";
import { Around, isServer } from "./context.js";
import { mover, ticker, curveOf } from "./clock.js";
import { ServerSheet, dropServerSheet } from "./sheets.jsx";
import { fold, useFolded } from "./blocks.jsx";
import { useSlatCss, slatSheet } from "../../src/style.js";
import { isList, at, short, STEPS, pick, px, share, same, range, byPosition, BLOCK, warnBare, autoRoom, warnWrapped, DEFAULT_ROOM, tickValues } from "../../src/layout.js";
import { cssCurve, MOVE_MS } from "../../src/motion.js";

// Plot settings. Every other prop of a Plot is a data group. (React keeps `key` for itself, so a Plot names its rows'
// identity with rowKey.)
const SETTINGS = new Set(["children", "order", "reorder", "orientation", "overlap", "slats", "rowKey", "rows", "animate", "thick", "className", "style", "ref", "static", "keyboard"]);

const other = (o) => (o === "vertical" ? "horizontal" : "vertical");

// What a Plot tells its Chart: the room its slats ask for outside the plot (room(o, crossed), or none), whether its rows
// have no thickness, so a Chart with a height fits them (fits), and whether it is a Scale (the Chart then draws no axis
// of its own). A top-level Plot whose slat gives no room gets the defaults (names at the start and values at the end),
// except an overlap Plot on a cross scale (its points have no names). A Chart works this out from the Plots it is given
// before they are drawn (so a server writes the right gutters), and each Plot tells it again once it is in the page.
export function plotEntry(role, nested, layout, overlap, orientation) {

  const room = layout.room || (!nested && role === "Plot")
    ? (o, crossed) => pick(layout.room, o) ?? (nested || role !== "Plot" || (overlap && crossed) ? null : DEFAULT_ROOM[o])
    : null;

  return {
    room,
    fits: !nested && role === "Plot" && !overlap ? pick(layout.thickness, orientation) == null : undefined,
    scale: role === "Scale",
  };
}

// What a data group function, an order function or a rowKey function sees as d: the row's values, read when they are
// read (nothing is copied). One handler serves every row's d, and each row's own state is on the proxy's target.
const VIEW = {
  get: (t, key) => (typeof key === "string" ? t.p.read(t.i, key, t.ahead) : undefined),
  has: (t, key) => t.p.has(t.i, key),
  ownKeys: (t) => t.p.keys(t.i),
  getOwnPropertyDescriptor: (t, key) => (t.p.has(t.i, key) ? { configurable: true, enumerable: true, get: () => t.p.read(t.i, key, t.ahead) } : undefined),
};

const view = (p, i, ahead) => new Proxy({ p, i, ahead }, VIEW);

// The same, noting each value read (in t.reads), so a function group's value is kept until one of them changes
const NOTED = {
  ...VIEW,
  get: (t, key) => {
    if (typeof key !== "string") return undefined;
    const v = t.p.read(t.i, key, t.ahead);
    t.reads.push(key, v);
    return v;
  },
};

// What a slat sees as d: its row's values as plain properties, with its row number (index) and its place (position)
// read when they are read. A row whose values are all as they were keeps its d, so React doesn't draw its slat again,
// and a row whose slat never read its index or position keeps it when only those change (when rows are sorted).
// NOTE: index and position give the row's latest ones, also when read later (in an event handler).
class Row {

  #e;

  constructor(e) {
    this.#e = e;
  }

  get index() {
    const e = this.#e;
    e.reads |= 1;
    return e.s.indexOf(e.id);
  }

  get position() {
    const e = this.#e;
    e.reads |= 2;
    return e.s.positionOf(e.id);
  }
}

const RESERVED = new Set(["index", "position"]);

// A row's id as a React key: a string or a number as it is, and anything else as a number of its own
const objectKeys = new WeakMap();
let objectCount = 0;
const keyOf = (id) => {

  if (id === null || (typeof id !== "object" && typeof id !== "function")) return id;

  let k = objectKeys.get(id);
  if (k === undefined) objectKeys.set(id, (k = "rhp-o" + objectCount++));

  return k;
};

// A slat: the slat function's element, its blocks drawn with it and written by it (fold in blocks.jsx), and its root
// with what the Plot sets on it (slatRoot in blocks.jsx)
function Slat({ d, root, first }) {

  const f = useFolded(root.still, root.dir);
  const given = root.fn(d);
  if (!isValidElement(given) || given.type === Fragment) throw new Error("rhp: a slat must return one element");

  return fold(given, f, "", { root, first });
}

const WROTE = Symbol("rhp"); // on a slat root: the place and tab stop the Plot last wrote there

export const Plot = memo(function Plot(props) {
  return usePlot(props, "Plot");
});

// A Plot, or the Plot inside a Scale (role "Scale")
export function usePlot(props, role) {

  const fn = props.children;
  if (typeof fn !== "function") throw new Error(`rhp: a ${role}'s child must be a slat function, (d) => <div>…</div>`);

  const around = useContext(Around);
  const { nested, frame } = around;
  const layout = fn.layout ?? NO_LAYOUT;
  const scale = role === "Scale";
  const orientation = props.orientation === "across" ? other(around.orientation) : props.orientation ?? around.orientation;

  // A static Plot (or Chart) keeps nothing per row: when its data, order or orientation changes, a row that changed is
  // drawn anew (without animation).
  const still = !!(props.static ?? around.still);

  const uid = useId();
  const own = useRef(null);
  const s = own.current ?? (own.current = state());

  // The slat type's CSS is in the page while a Plot draws it
  useInsertionEffect(() => {
    const release = useSlatCss(fn);
    if (fn.scope) dropServerSheet(fn.scope);
    return release;
  }, [fn.scope]);

  // Animation. Without `animate` it is the CSS version. animate={true} uses the JS version for every data group of
  // numbers, animate={["value"]} only for those groups, and animate={{ groups, duration, ease, slide }} adds timing.
  // A Plot without `animate` takes its Chart's.
  const a = props.animate ?? around.motion;
  const anim = !a ? null : a === true ? ALL : Array.isArray(a) ? (s.groupsOf === a ? s.anim : { groups: a }) : a;
  s.groupsOf = a;
  const js = anim != null;
  s.anim = anim;
  useSyncExternalStore(s.ticker.subscribe, s.ticker.read, s.ticker.read);

  // How long a slat takes to slide to a new position: 175ms in the JS version (centered on the frame where the two
  // values are equal), and 0.3s in the CSS version, unless set
  const slideMs = anim?.slide ?? (js ? 175 : undefined);
  const action = props.reorder ?? "slide";
  const reordered = props.order != null && action === "slide";

  // The data
  const groups = [];
  for (const key in props) {
    if (!SETTINGS.has(key)) groups.push(key);
  }

  const rows = props.rows;
  let n = props.slats;
  if (n == null) {
    n = isList(rows) ? rows.length : 0;
    for (const key of groups) {
      const g = props[key];
      if (isList(g) && g.length > n) n = g.length;
    }
  }

  // A static Plot keeps nothing per row, so its values jump (it still marks the JS version for the CSS)
  const p = pass(s, props, groups, rows, n, still ? null : anim);

  // Row identity. Without rowKey, a slat is its row number. With rowKey={name} or rowKey={(d) => id}, a slat follows its
  // id, so removing a row removes that row's slat and the rows after it keep theirs.
  const key = props.rowKey;
  let ids = null;
  if (key != null) {
    ids = new Array(n);
    for (let i = 0; i < n; i++) {
      ids[i] = typeof key === "function" ? key(view(p, i, null)) : p.raw(key, i);
    }
    // Rows with the same id (or none) each keep a slat of their own: a later one is that id and its count
    if (new Set(ids).size !== n) {
      const counts = new Map();
      for (let i = 0; i < n; i++) {
        const c = counts.get(ids[i]) ?? 0;
        counts.set(ids[i], c + 1);
        if (c) ids[i] = "\0" + keyOf(ids[i]) + "#" + c;
      }
    }
    if (s.ids && same(s.ids, ids)) ids = s.ids;
  }
  const rowOf = ids && (ids === s.ids && s.rowOf ? s.rowOf : new Map(ids.map((id, i) => [id, i])));
  const idOf = ids ? (i) => ids[i] : (i) => i;
  const rowOfId = ids ? (id) => rowOf.get(id) : (id) => id;
  p.idOf = idOf;
  if (ids !== s.ids || n !== s.n || anim !== s.wasAnim) prune(s, ids, n, anim);
  if (!js || still) s.movers = {};
  s.wasAnim = anim;
  s.ids = ids;
  s.rowOf = rowOf;
  s.n = n;

  // The order: one position per row. `order` is either that list (gaps, ties and fractions all work, and null hides
  // a row) or a function (rows, current) => list, like sortBy().
  // NOTE: In the JS version the rows are read half a slide ahead, so two rows switching places pass each other in the
  // frame where their values are equal.
  const order = props.order;
  let positions = null;
  if (typeof order === "function") {
    const lead = js && action === "slide" ? (slideMs ?? 0) / 2 : 0;
    const current = s.positions?.length === n ? s.positions : range(n);
    p.positions = current;
    const views = new Array(n);
    for (let i = 0; i < n; i++) {
      views[i] = view(p, i, lead);
    }
    p.done = new Map();
    positions = order(views, current);
    p.done = new Map();
  } else if (order != null) {
    positions = new Array(n);
    for (let i = 0; i < n; i++) {
      positions[i] = (isList(order) ? order[i] : order) ?? null;
    }
  }
  if (positions && s.positions && same(positions, s.positions)) positions = s.positions;
  const moved = positions !== s.positions;
  s.positions = positions;
  p.positions = positions;

  const posOf = positions ? (i) => positions[i] ?? null : (i) => i;
  s.indexOf = ids ? (id) => rowOf.get(id) : (id) => id;
  s.positionOf = (id) => {
    const i = s.indexOf(id);
    return i == null ? null : posOf(i);
  };

  let extent = n;
  if (positions) {
    extent = 0;
    for (const q of positions) {
      if (q != null && q + 1 > extent) extent = q + 1;
    }
  }
  const shown = positions ? byPosition(positions) : null; // the rows in the order they are shown (null: as they are)

  // Screen readers. The rows of a chart are a list: a top-level Plot is a list and each slat root a list item (unless the
  // slat gives it a role of its own). A Plot inside a slat or an overlap Plot is not a list of its own, and a Scale is
  // hidden like the axis. Sorted rows slide on screen but keep their place in the page, so the Plot lists them in the
  // order they are shown with aria-owns (and each row gets an id for it).
  const list = !nested && !scale && !props.overlap;
  const owns = scale || !reordered || !shown.some((r, k) => r !== k) ? undefined : shown.map((r) => `rhp-${uid}-${r}`).join(" ");

  // Keyboard (keyboard={true}): the rows take focus. Tab stops at one row of the Plot (the row focused last, or else the
  // first shown), the arrow keys go to the row shown before or after it, and Home and End to the first and the last.
  // A row with focus keeps it when the rows are sorted, moved in the page or drawn again. Without it a Plot adds nothing.
  const keyboard = !!props.keyboard;
  let stop;
  if (keyboard) {
    const r = s.picked === undefined ? undefined : rowOfId(s.picked);
    if (r != null && r < n && posOf(r) != null) stop = s.picked;
    else {
      const first = shown ? shown[0] : n ? 0 : undefined;
      stop = first === undefined ? undefined : idOf(first);
    }
    // Moving a row in the page or drawing it again takes its focus away, so we note whether a row has focus before the
    // rows change, and after they change we focus the row Tab stops at
    s.had = !isServer && s.el != null && document.activeElement?.parentElement === s.el;
  }

  // What every slat root gets, the same object as long as it is the same
  const scope = fn.scope;
  const dir = short(orientation);
  let root = s.root;
  if (!root || root.fn !== fn || root.dir !== dir || root.scope !== scope || root.list !== list || root.keyboard !== keyboard || root.still !== still) {
    root = s.root = { fn, dir, scope, list, keyboard, still };
  }

  // The slats. Slide: the slats never move in the page, --rhp-position moves them on screen. Move: the slat elements
  // move in the page with their rows. Refill: slot k shows whichever row is k-th.
  const drawn = action === "slide" || !shown ? null : shown; // the row each slat root shows, when not row k at k
  const count = drawn ? drawn.length : n;
  const sig = p.sig();

  // A slat of row i, made again only when it shows something new
  const slatOf = (k, i, id, e, entries, els, firsts) => {
    // A static row that changed is drawn anew, under a new key
    const base = action === "refill" ? k : keyOf(id);
    const reactKey = !still ? base : action === "refill" ? base + "\0" + keyOf(id) + "\0" + e.ver : e.ver ? base + "\0" + e.ver : base;
    let first = s.firsts?.get(reactKey);
    if (first === undefined) first = { p: posOf(i), row: reordered ? i : -1, rid: reordered ? `rhp-${uid}-${i}` : undefined, tab: keyboard ? (id === stop ? 0 : -1) : undefined, own: false, sure: false, style: undefined, base: undefined };
    let el = s.els?.get(reactKey);
    if (el === undefined || el.props.d !== e.d || el.props.root !== root || el.props.first !== first) {
      el = jsx(Slat, { d: e.d, root, first }, reactKey);
    }
    firsts.set(reactKey, first);
    els.set(reactKey, el);
    return el;
  };

  // JS version: in a frame where only the clock moved (the Plot is drawn again with the props it had), only the rows
  // whose values move are worked out again, and those whose slat reads a position that changed.
  // NOTE: Only on a drawing that is in the page. React may draw with the same props again after a drawing it threw away
  // (StrictMode draws every component twice), and that drawing must read every row, or the moves its values start are
  // never committed.
  const fast = js && !still && action === "slide" && props === s.drawnWith && around === s.around && root === s.drawnRoot && sig === s.sig && s.slats !== null && s.slats === s.committed;
  let entries, els, firsts, slats;

  if (fast) {
    entries = s.entries;
    els = s.els;
    firsts = s.firsts;
    slats = s.slats.slice();
    const again = s.live;
    if (moved) {
      for (const [id, e] of entries) {
        if ((e.reads & 2 || e.posFn) && e.p !== posOf(e.i)) again.add(id);
      }
    }
    for (const id of again) {
      const i = rowOfId(id);
      if (i == null || i >= n) continue;
      const e = entry(s, p, sig, i, id, posOf(i), still);
      entries.set(id, e);
      slats[i] = slatOf(i, i, id, e, entries, els, firsts);
    }
  } else {
    entries = new Map();
    els = new Map();
    firsts = new Map(); // React key -> the place and tab stop its slat was first drawn with
    slats = new Array(count);
    for (let k = 0; k < count; k++) {
      const i = drawn ? drawn[k] : k;
      const id = idOf(i);
      let e = entries.get(id);
      if (e === undefined) {
        e = entry(s, p, sig, i, id, posOf(i), still);
        entries.set(id, e);
      }
      slats[k] = slatOf(k, i, id, e, entries, els, firsts);
    }
  }

  s.live = p.live;
  s.slats = slats;
  s.drawnWith = props;
  s.around = around;
  s.drawnRoot = root;
  s.sig = sig;
  s.entries = entries;
  s.els = els;
  s.firsts = firsts;

  // What the handlers and the writes below need of this drawing
  const childOf = drawn ? new Map(drawn.map((r, k) => [r, k])) : null;
  const now = { n, shown, idOf, rowOfId, posOf, stop, rowOfChild: drawn ? (k) => drawn[k] : (k) => k, childOf: drawn ? (r) => childOf.get(r) : (r) => r };

  // Gutters: what the Plot asks of its Chart (plotEntry)
  const register = frame && (layout.room || !nested);
  useLayoutEffect(() => {
    if (!register) return;
    frame.set(s, plotEntry(role, nested, layout, props.overlap, orientation));
    return () => frame.unset(s);
  }, [frame, register, role, nested, layout, props.overlap, orientation]);

  // Each slat root's place and tab stop, written where they changed (and in the JS version, the values this drawing
  // moves to start moving)
  const commits = p.commits;
  useLayoutEffect(() => {
    for (let k = 0; k < commits.length; k += 2) {
      commits[k].commit(commits[k + 1]);
    }
    s.committed = slats;
    s.now = now;
    const el = s.el;
    if (!el) return;

    const kids = el.children;
    if (kids.length !== count) throw new Error("rhp: a slat must return one element, and a component that is a slat's root must draw one element");

    if (s.unchecked) {
      s.unchecked = false;
      const first = kids[0];
      if (first && !props.overlap && BLOCK.test(first.getAttribute("class") ?? "")) warnBare(first);
      // With room "auto", the first row is checked for an edge label inside another element (see warnWrapped)
      if (first && !nested && layout.room != null && autoRoom(pick(layout.room, orientation))) warnWrapped(first);
    }

    let owned = false;
    for (let k = 0; k < count; k++) {
      const node = kids[k];
      const r = now.rowOfChild(k);
      const q = posOf(r);
      const tab = keyboard ? (idOf(r) === stop ? 0 : -1) : undefined;
      // A root new to the page has the place and tab stop its slat was first drawn with. A component that is the slat's
      // root and draws its element without the props it was given has none of it, so the Plot writes it all there.
      const first = slats[k].props.first;
      let w = node[WROTE];
      if (w === undefined) {
        const placed = first.sure || (first.p == null ? node.hidden : node.style.getPropertyValue("--rhp-position") !== "");
        w = placed
          ? { p: first.p, row: first.row, tab: first.tab, own: first.own, dir: null }
          : { p: NaN, row: NaN, tab: NaN, own: node.id !== "", dir: "" };
        node[WROTE] = w;
      }
      if (w.dir !== null && w.dir !== dir) {
        node.setAttribute("data-rhp-o", dir);
        if (scope) node.setAttribute("data-rhp-slat", scope);
        if (list && !node.hasAttribute("role")) node.setAttribute("role", "listitem");
        w.dir = dir;
      }
      if (w.p !== q) {
        node.hidden = q == null;
        if (q != null) node.style.setProperty("--rhp-position", q);
        w.p = q;
      }
      if (tab !== undefined && w.tab !== tab) {
        node.tabIndex = tab;
        w.tab = tab;
      }
      // The id aria-owns lists the row by (rhp-<Plot>-<row>), unless the root has one of its own
      const own = w.dir === null ? first.own : w.own;
      const row = reordered ? r : -1;
      if (w.row !== row && !own) {
        if (row >= 0) node.id = `rhp-${uid}-${row}`;
        else node.removeAttribute("id");
        w.row = row;
      }
      if (own) owned = true;
    }

    // A slat root with an id of its own is listed in aria-owns by that id
    if (owns !== undefined && owned) el.setAttribute("aria-owns", shown.map((r) => kids[now.childOf(r)].id).join(" "));

    if (keyboard && s.had) {
      s.had = false;
      const r = stop === undefined ? undefined : rowOfId(stop);
      const node = r == null ? undefined : kids[now.childOf(r)];
      if (node && node !== document.activeElement) node.focus({ preventScroll: true });
    }
  });

  // The Plot's element, and the context for what is inside its slats. A Plot inside a slat doesn't take the Chart's
  // `animate` (its data already moves).
  let inner = s.inner;
  if (!inner || inner.orientation !== orientation || inner.frame !== frame || inner.still !== still || inner.crossed !== around.crossed) {
    inner = s.inner = { orientation, motion: undefined, frame, nested: true, still, crossed: around.crossed };
  }

  if (props.ref !== s.userRef) {
    const user = (s.userRef = props.ref);
    s.ref = (el) => {
      s.el = el;
      const undo = typeof user === "function" ? user(el) : user ? ((user.current = el), undefined) : undefined;
      return () => {
        s.el = null;
        if (typeof undo === "function") undo();
        else if (typeof user === "function") user(null);
        else if (user) user.current = null;
      };
    };
  }

  return jsx(Around.Provider, {
    value: inner,
    children: jsx("div", {
      ref: s.ref,
      className: props.className ? "rhp-plot " + props.className : "rhp-plot",
      role: list ? "list" : undefined,
      "aria-hidden": scale ? "true" : undefined,
      "aria-owns": owns,
      "data-rhp-o": dir,
      "data-rhp-reorder": action,
      "data-rhp-overlap": props.overlap ? "" : undefined,
      "data-rhp-animate": js ? "js" : undefined,
      style: defined({
        ...props.style,
        "--rhp-n": extent,
        "--rhp-pitch": nested ? undefined : px(pick(layout.thickness, orientation)),
        "--rhp-inset": share(pick(layout.inset, orientation)),
        "--rhp-plot-thick": share(props.thick),
        "--rhp-slide-time": slideMs == null ? undefined : slideMs + "ms",
        "--rhp-length-time": anim?.duration == null ? undefined : anim.duration + "ms",
        "--rhp-length-ease": cssCurve(anim?.ease),
      }),
      onKeyDown: keyboard ? s.onKey : undefined,
      onFocus: keyboard ? s.onFocus : undefined,
      children: [
        isServer && scope ? jsx(ServerSheet, { name: scope, css: () => slatSheet(fn), of: fn }, "sheet") : null,
        still ? jsx(Fragment, { children: slats }, "still") : jsx(Fragment, { children: slats }, "live"),
      ],
    }),
  });
}

const ALL = { all: true };
const NO_LAYOUT = {};

// A style without its undefined values, which React would write as "" (a call for nothing)
export const defined = (st) => {

  for (const key in st) {
    if (st[key] == null) delete st[key];
  }

  return st;
};

// Whether a group moves in the JS version: every group, or those listed (animate={["value"]} or { groups })
const movesAll = (anim) => anim.all || anim.groups == null;

// A Plot's own state, kept between drawings
function state() {

  const s = {
    ticker: ticker(),
    anim: null,
    movers: {}, // JS version: group -> id -> its mover
    worked: new Map(), // group -> id -> a function group's value for that row, and what it read
    wasAnim: null,
    entries: new Map(), // id -> what its slat was drawn from
    els: null,
    firsts: null,
    slats: null,
    committed: null, // the slats of the drawing in the page
    live: new Set(),
    drawnWith: null,
    around: null,
    drawnRoot: null,
    sig: null,
    positions: null,
    ids: null,
    rowOf: null,
    n: 0,
    root: null,
    inner: null,
    el: null,
    userRef: null,
    ref: null,
    picked: undefined, // the row focused last (its id)
    had: false,
    now: null,
    unchecked: true,
    indexOf: null,
    positionOf: null,
    timing: () => ({ duration: s.anim?.duration ?? MOVE_MS, ease: curveOf(s.anim?.ease) }),
    onKey(e) {
      const el = s.el;
      const step = STEPS[e.key];
      if (e.target.parentElement !== el || step === undefined || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;

      e.preventDefault();

      const now = s.now;
      const list = now.shown ?? range(now.n);
      const k = list.indexOf(now.rowOfChild(Array.prototype.indexOf.call(el.children, e.target)));
      const r = list[Math.min(Math.max(k + step, 0), list.length - 1)];

      if (r !== undefined) el.children[now.childOf(r)]?.focus();
    },
    onFocus(e) {
      const el = s.el;
      const target = e.target;
      if (target.parentElement !== el) return;

      // The row focused is the tab stop now
      const kids = el.children;
      for (let k = 0; k < kids.length; k++) {
        const want = kids[k] === target ? 0 : -1;
        if (kids[k].tabIndex !== want) kids[k].tabIndex = want;
        if (kids[k][WROTE]) kids[k][WROTE].tab = want;
      }
      s.picked = s.now.idOf(s.now.rowOfChild(Array.prototype.indexOf.call(kids, target)));
    },
  };

  return s;
}

// Forget what was kept for ids that are gone: function groups' values, and in the JS version the movers of those ids
// and of groups that stopped animating
function prune(s, ids, n, anim) {

  const live = ids ? new Set(ids) : null;

  for (const [key, forGroup] of s.worked) {
    for (const id of forGroup.keys()) {
      if (live ? !live.has(id) : id >= n) forGroup.delete(id);
    }
    if (!forGroup.size) s.worked.delete(key);
  }

  if (!anim) return;

  for (const key in s.movers) {
    if (!(movesAll(anim) || anim.groups.includes(key))) {
      delete s.movers[key];
      continue;
    }
    for (const id of s.movers[key].keys()) {
      if (live ? !live.has(id) : id >= n) s.movers[key].delete(id);
    }
  }
}

// One drawing of a Plot: how its rows' values are read. d.key reads data group `key` for the row (a function is worked
// out per row), then the row object in `rows`. In the JS version, a value of a group that moves is read as it is drawn
// in this frame, or `ahead` ms from now (an order is worked out from rows read half a slide ahead). A rowKey function
// reads the values as they are (ahead is null).
function pass(s, props, groups, rows, n, anim) {

  const isGroup = new Set(groups);
  const moving = anim == null ? null : movesAll(anim) ? () => true : (key) => anim.groups.includes(key);
  const p = {
    idOf: null,
    positions: null,
    live: new Set(), // JS version: the rows with a value that moves (drawn again in the next frame)
    commits: [], // JS version: each mover read, and the value the page will have once this drawing is committed
    posRows: new Set(), // the rows whose function groups read their position
    // ahead -> group -> each row's value of a function group in this drawing (an order is worked out with its own)
    done: new Map(),

    raw(key, i) {
      if (isGroup.has(key)) return at(props[key], i);
      return at(rows, i)?.[key];
    },

    // A value as it is drawn: moving in the JS version
    moved(key, i, v, ahead) {
      if (ahead === null || !moving?.(key)) return v;

      const id = p.idOf(i);
      const forGroup = (s.movers[key] ??= new Map());
      let m = forGroup.get(id);
      if (!m) forGroup.set(id, (m = mover(s.timing, s.ticker.moving)));
      const x = m(v, ahead);
      if (ahead === 0) {
        p.commits.push(m, v);
        if (m.active) p.live.add(id);
      }

      return x;
    },

    // A function group's value for row i, worked out once per drawing. The value a slat sees is also kept from one
    // drawing to the next with what the function read, and the function runs again only when it is another function or
    // one of those values changed: only the rows whose values it reads changed work it out again.
    fn(key, i, ahead) {
      let forAhead = p.done.get(ahead);
      if (!forAhead) p.done.set(ahead, (forAhead = new Map()));
      let values = forAhead.get(key);
      if (!values) forAhead.set(key, (values = new Array(n)));
      if (i in values) return values[i];

      const f = props[key];
      if (ahead !== 0) return (values[i] = f(view(p, i, ahead)));

      const id = p.idOf(i);
      let forGroup = s.worked.get(key);
      const kept = forGroup?.get(id);
      if (kept && kept.f === f && p.still(i, kept.reads)) {
        if (readsPosition(kept.reads)) p.posRows.add(i);
        return (values[i] = kept.value);
      }

      const t = { p, i, ahead, reads: [] };
      const value = f(new Proxy(t, NOTED));
      if (!forGroup) s.worked.set(key, (forGroup = new Map()));
      forGroup.set(id, { f, reads: t.reads, value });
      if (readsPosition(t.reads)) p.posRows.add(i);

      return (values[i] = value);
    },

    // Whether the values a function read for row i (key, value, key, value...) are all as they were
    still(i, reads) {
      for (let k = 0; k < reads.length; k += 2) {
        if (!Object.is(p.read(i, reads[k], 0), reads[k + 1])) return false;
      }

      return true;
    },

    read(i, key, ahead) {
      if (key === "index") return i;
      if (key === "position") return p.positions ? p.positions[i] ?? null : i;
      if (isGroup.has(key) && typeof props[key] === "function") return p.fn(key, i, ahead);

      return p.moved(key, i, p.raw(key, i), ahead);
    },

    has: (i, key) => key === "index" || key === "position" || isGroup.has(key) || (rows != null && key in (at(rows, i) ?? {})),
    keys: (i) => [...new Set(["index", "position", ...groups, ...Object.keys(at(rows, i) ?? {})])],

    // What the rows' values are read from: a new one means every row is read anew
    sig: () => groups.join("\0") + (rows != null ? "\0rows" : "") + (anim ? "\0js" : ""),

    groups,
    isGroup,
    rows,
  };

  return p;
}

// Whether a function read d.position (reads: key, value, key, value...)
const readsPosition = (reads) => {

  for (let k = 0; k < reads.length; k += 2) {
    if (reads[k] === "position") return true;
  }

  return false;
};

const scratch = [];

// What the slat of row i is drawn from: its d, kept from the drawing before when nothing it shows changed
function entry(s, p, sig, i, id, q, still) {

  const before = s.entries.get(id);
  const { groups, isGroup, rows } = p;
  let k = 0;

  for (const key of groups) {
    if (RESERVED.has(key)) continue;
    scratch[k++] = p.read(i, key, 0);
  }

  const row = rows != null ? at(rows, i) : undefined;
  if (rows != null) {
    scratch[k++] = row;
    // In the JS version the values in a row object move too
    if (s.anim && row != null) {
      for (const key in row) {
        if (!isGroup.has(key) && !RESERVED.has(key)) scratch[k++] = p.moved(key, i, row[key], 0);
      }
    }
  }

  let changed = before === undefined || before.sig !== sig || before.vals.length !== k;
  for (let j = 0; !changed && j < k; j++) {
    if (!Object.is(scratch[j], before.vals[j])) changed = true;
  }
  if (!changed && (still ? before.p !== q : (before.reads & 1 && before.i !== i) || (before.reads & 2 && before.p !== q))) changed = true;

  if (!changed) {
    before.i = i;
    before.p = q;
    before.posFn = p.posRows.has(i);
    return before;
  }

  const e = { s, id, sig, i, p: q, reads: 0, posFn: p.posRows.has(i), vals: scratch.slice(0, k), d: null, ver: before ? before.ver + 1 : 0 };
  const d = new Row(e);
  let j = 0;

  if (row != null) {
    for (const key in row) {
      if (!RESERVED.has(key) && !isGroup.has(key)) d[key] = row[key];
    }
  }
  for (const key of groups) {
    if (RESERVED.has(key)) continue;
    d[key] = scratch[j++];
  }
  if (s.anim && row != null) {
    j++;
    for (const key in row) {
      if (!isGroup.has(key) && !RESERVED.has(key)) d[key] = scratch[j++];
    }
  }

  e.d = d;

  return e;
}

// A scale drawn by a slat: one slat per tick of the Chart's scale, all in one band and keyed by value.
// Each tick's slat sees d.at (its value), d.next (the next tick), d.first, d.last and d.toEnd (px from the tick to the end
// of the scale, measured in the browser). A tick at either end of the scale is keyed as that end, so the end line never
// slides when the max changes. `ticks` is a list of values, a number (about that many round values) or a function of
// the Chart's [min, max] like every(5). A Chart with a Scale in it draws no axis of its own.
export function Scale(props) {

  const frame = useContext(Around).frame;
  if (!frame) throw new Error("rhp: a Scale goes inside a Chart");

  useSyncExternalStore(frame.subscribe, frame.version, frame.version);
  const [a, b] = frame.shown();
  const length = frame.length();
  const own = useRef(null);
  let ticks = tickValues(props.ticks, [a, b], frame.domain());
  if (own.current && same(own.current, ticks)) ticks = own.current;
  own.current = ticks;

  const { ticks: _, className, ...rest } = props;

  return usePlot({
    ...rest,
    overlap: true,
    animate: false,
    rowKey: (t) => (t.at === a ? "min" : t.at === b ? "max" : t.at),
    className: className ? "rhp-scale " + className : "rhp-scale",
    at: ticks,
    next: (t) => ticks[t.index + 1] ?? b,
    first: (t) => t.index === 0,
    last: (t) => t.index === ticks.length - 1,
    toEnd: (t) => (!length ? Infinity : ((b - t.at) / (b - a || 1)) * length), // Infinity until it is measured
  }, "Scale");
}
