// A Chart is the frame around one or more Plots. It sets the scale (--rhp-min, --rhp-max) once for everything inside it,
// gives them its orientation and theme, makes room for what they draw outside the plot and draws the value axis.
// animate={true | { duration, ease, slide }} moves the scale with the JS version and is the default for its Plots.
// height is the plot's height in px (a vertical chart is 240px tall by default). A horizontal chart with a height fits
// rows without a thickness into it. aspect={16 / 9} fixes the whole chart's shape instead: at any width it is that
// many times as wide as it is tall, room included (rhp.css), and a horizontal chart's rows share that height the
// same way. static: the Plots inside draw their rows once.
import { Fragment, isValidElement, useContext, useEffect, useInsertionEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { jsx } from "react/jsx-runtime";
import { Around, ThemeContext, isServer } from "./context.js";
import { Plot, Scale, plotEntry } from "./plot.jsx";
import { mover, drawEachFrame, curveOf } from "./clock.js";
import { ServerSheet, dropServerSheet } from "./sheets.jsx";
import { useCore, useGutters, useCross, useRoot, watchRoot, checkLinked, useChartGuard, pageGuarded, sheetsFor } from "../../src/style.js";
import { short, px, same, tickValues, THEME, themeVars, KNOBS, padding, warnAspect, startOnShownScale } from "../../src/layout.js";
import { MOVE_MS } from "../../src/motion.js";
import { write } from "../../src/frame.js";

const DOMAIN = [0, 100];
const NONE = [];
const other = (o) => (o === "vertical" ? "horizontal" : "vertical");

// The Plots and Scales a Chart is given (through fragments and lists), as plotEntry() describes them: what a Chart works
// out its gutters from before its Plots are drawn. A Plot drawn by a component of the app's is told to the Chart once it
// is in the page.
function given(children, o, out) {

  if (Array.isArray(children)) {
    for (const child of children) {
      given(child, o, out);
    }
  } else if (isValidElement(children)) {
    const { type, props } = children;
    if (type === Fragment) {
      given(props.children, o, out);
    } else if (type === Plot || type === Scale) {
      const layout = (typeof props.children === "function" && props.children.layout) || {};
      const own = props.orientation === "across" ? other(o) : props.orientation ?? o;
      out.push(plotEntry(type === Plot ? "Plot" : "Scale", false, layout, type === Plot && props.overlap, own));
    }
  }

  return out;
}

// What a Chart's Plots make of it: its padding and gutters (layout.js), whether its rows fit its height (sized), and
// whether it draws its own axis
function arrange(entries, o, crossed, props, aspect, domain) {

  const rooms = [];
  let fits = false;
  let thick = false;
  let scales = 0;

  for (const e of entries) {
    if (e.room) rooms.push(e.room(o, crossed));
    if (e.fits === true) fits = true;
    if (e.fits === false) thick = true;
    if (e.scale) scales++;
  }

  const axis = scales === 0 && tickValues(props.ticks, domain).length > 0;
  const crossAxis = crossed && tickValues(props.crossTicks, props.cross).length > 0;
  const { vars, gutters } = padding(o, rooms, axis, crossAxis);

  return { vars, gutters, axis, crossAxis, thick, sized: (props.height != null || aspect != null) && o === "horizontal" && fits };
}

const sameArrangement = (a, b) => {

  if (a.gutters !== b.gutters || a.sized !== b.sized || a.axis !== b.axis || a.crossAxis !== b.crossAxis || a.thick !== b.thick) return false;

  const keys = Object.keys(a.vars);

  return keys.length === Object.keys(b.vars).length && keys.every((key) => a.vars[key] === b.vars[key]);
};

// The Chart's animate, kept as it was while it says the same (an animate={{ duration: 300 }} made anew in each drawing
// would otherwise be news to every block)
const sameMotion = (a, b) => {

  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && same(a, b);

  const ga = a.groups, gb = b.groups;
  const ea = a.ease, eb = b.ease;

  return a.duration === b.duration && a.slide === b.slide && (ea === eb || (Array.isArray(ea) && Array.isArray(eb) && same(ea, eb)))
    && (ga === gb || (Array.isArray(ga) && Array.isArray(gb) && same(ga, gb)));
};

const OWN_ARIA = new Set(["aria-label", "aria-labelledby", "aria-describedby"]);

export function Chart(props) {

  const orientation = props.orientation ?? "horizontal";
  const aspect = typeof props.aspect === "number" && props.aspect > 0 && Number.isFinite(props.aspect) ? props.aspect : undefined;
  const pageTheme = useContext(ThemeContext);
  const own = useRef(null);
  const s = own.current ?? (own.current = chartState());
  const frame = s.frame;
  const [, redraw] = useReducer((x) => x + 1, 0);
  s.redraw = redraw;

  // The theme is the only way a page styles a chart. It is written on the chart root, so a page's own CSS variables
  // never reach a chart, and a theme change (dark mode) is one write per key per chart.
  if (s.pageTheme !== pageTheme || s.ownTheme !== props.theme) {
    s.pageTheme = pageTheme;
    s.ownTheme = props.theme;
    s.theme = themeVars({ ...THEME, ...pageTheme, ...props.theme });
  }
  const theme = s.theme;

  // The scale, and in the JS version the scale on screen, where it has moved to
  let domain = props.scale ?? DOMAIN;
  if (s.domain && same(s.domain, domain)) domain = s.domain;
  let cross = props.cross ?? null;
  if (cross && s.cross && same(s.cross, cross)) cross = s.cross;
  const crossed = cross != null;
  s.domain = domain;
  s.cross = cross;
  s.anim = props.animate === true ? {} : props.animate;
  s.orientation = orientation;
  s.crossed = crossed;
  s.style = props.style;

  // What the Plots inside ask of the chart: its gutters, and whether their rows fit its height. Before they are drawn
  // the Chart works it out from the Plots it is given; once they are in the page, from what each Plot tells it.
  const entries = s.registered ? [...s.entries.values()] : given(props.children, orientation, []);
  let arranged = arrange(entries, orientation, crossed, props, aspect, domain);
  if (s.arranged && sameArrangement(s.arranged, arranged)) arranged = s.arranged;
  s.arranged = arranged;
  s.props = props;
  s.aspect = aspect;

  // Turning the chart is a jump: nothing inside transitions for the two frames after a change
  const [turn, setTurn] = useState({ o: orientation, turning: false });
  if (turn.o !== orientation) setTurn({ o: orientation, turning: true });
  useEffect(() => {
    if (!turn.turning) return;

    let id = requestAnimationFrame(() => (id = requestAnimationFrame(() => setTurn((t) => (t.o === turn.o ? { o: t.o, turning: false } : t)))));

    return () => cancelAnimationFrame(id);
  }, [turn]);

  // What changes rarely, for every block inside (a new value draws them all again)
  let motion = s.around?.motion;
  if (!sameMotion(motion, props.animate)) motion = props.animate;
  let around = s.around;
  if (!around || around.orientation !== orientation || around.motion !== motion || around.still !== (props.static === true) || around.crossed !== crossed) {
    around = s.around = { orientation, motion, frame, nested: false, still: props.static === true, crossed };
  }

  // rhp's core CSS (and the guard, and the gutters' and the cross scale's rules when a chart first needs them) comes
  // with the first chart in the page
  useInsertionEffect(() => {
    useCore();
    dropServerSheet("rhp-core");
    dropServerSheet("rhp-guard");
    dropServerSheet("rhp-position");
  }, []);
  useInsertionEffect(() => {
    if (arranged.gutters) {
      useGutters();
      dropServerSheet("rhp-gutters");
    }
  }, [arranged.gutters]);
  useInsertionEffect(() => {
    if (crossed) {
      useCross();
      dropServerSheet("rhp-cross");
    }
  }, [crossed]);

  // noCssGuard: this chart goes without the guard (guard.css), so the page's CSS reaches it like any other element
  useLayoutEffect(() => {
    if (props.noCssGuard) useChartGuard();
  }, [props.noCssGuard]);

  // In the page: the sheets go where the chart is (another document, a shadow root), the plot's size is measured, and
  // from now on the Plots tell the Chart what they need
  useLayoutEffect(() => {
    const el = s.el;
    useRoot(el);
    const unwatch = watchRoot(el);
    const body = el.querySelector(".rhp-body");
    if (body) checkLinked(body);

    let ro;
    if (body && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(([e]) => {
        const { width: w, height: h } = e.contentRect;
        if (w === s.size.w && h === s.size.h) return;
        s.size = { w, h };
        frame.notify(true);
      });
      ro.observe(body);
    }

    s.registered = true;
    s.check();

    return () => {
      unwatch();
      ro?.disconnect();
      s.undraw?.();
      s.undraw = null;
    };
  }, []);

  // The scale is written like a block's numbers: as first drawn, then in the next frame (or, in the JS version, in
  // each frame it moves), and the parts of the page that follow it hear of a new one
  useLayoutEffect(() => {
    const v = s.scaleVars();
    let changed = false;
    for (const key in v) {
      if (v[key] === s.wrote[key]) continue;
      write(s.el, key, v[key]);
      changed = true;
    }
    s.wrote = v;
    if (changed || s.notified !== domain || s.notifiedCross !== cross) {
      s.notified = domain;
      s.notifiedCross = cross;
      frame.notify();
    }
  });

  // What doesn't go with an aspect, said once in the browser's console
  useEffect(() => {
    warnAspect(props.aspect != null && aspect == null, aspect != null && props.height != null, aspect != null && orientation === "horizontal" && arranged.thick);
  });

  // A chart with a name is a figure (label="Fruit sold this week", or aria-label or aria-labelledby). Any other aria-*
  // prop and id go on the chart's element too.
  const name = props.label ?? props["aria-label"];
  const figure = name != null || props["aria-labelledby"] != null ? props.role ?? "figure" : props.role;

  s.first ??= s.scaleVars();
  if (s.styleOf !== theme || s.styleVars !== arranged.vars || s.styleProp !== props.style || s.styleHeight !== props.height || s.styleAspect !== aspect) {
    s.styleOf = theme;
    s.styleVars = arranged.vars;
    s.styleProp = props.style;
    s.styleHeight = props.height;
    s.styleAspect = aspect;
    s.rootStyle = { ...KNOBS, ...theme, ...arranged.vars, ...props.style, "--rhp-height": px(props.height ?? 240), "--rhp-aspect": aspect, ...s.first };
  }

  const el = {
    ref: s.refFor(props.ref),
    id: props.id,
    role: figure,
    "aria-label": name,
    "aria-labelledby": props["aria-labelledby"],
    "aria-describedby": props["aria-describedby"],
  };
  for (const key in props) {
    if (key.startsWith("aria-") && !OWN_ARIA.has(key)) el[key] = props[key];
  }
  el.className = props.className ? "rhp-chart " + props.className : "rhp-chart";
  el["data-rhp-o"] = short(orientation);
  el["data-rhp-animate"] = s.anim ? "js" : undefined;
  el["data-rhp-turning"] = turn.turning ? "" : undefined;
  el["data-rhp-sized"] = arranged.sized ? "" : undefined;
  el["data-rhp-aspect"] = aspect != null ? "" : undefined;
  el["data-rhp-guard"] = pageGuarded() && !props.noCssGuard ? "" : undefined;
  el["data-rhp-gutters"] = arranged.gutters ? short(orientation) : undefined;
  el["data-rhp-cross"] = crossed ? "" : undefined;
  el.style = s.rootStyle;
  el.children = [
    jsx("div", {
      className: "rhp-body",
      children: [
        props.children,
        // The built-in axis is drawn from `ticks` and `format`, unless a Scale inside draws the scale
        arranged.axis ? jsx(ChartAxis, { frame, ticks: props.ticks, format: props.format, grid: props.grid }, "axis") : null,
        arranged.crossAxis ? jsx(ChartAxis, { frame, cross: true, ticks: props.crossTicks, format: props.crossFormat, grid: props.crossGrid }, "cross") : null,
      ],
    }, "body"),
    // On a server, the CSS the chart needs (each slat type's sheet comes with its Plot)
    isServer ? sheetsFor(NONE, arranged.gutters, crossed).map(([key, css]) => jsx(ServerSheet, { name: "rhp-" + key, css }, key)) : null,
  ];

  return jsx(Around.Provider, { value: around, children: jsx("div", el) });
}

// A Chart's own state, kept between drawings, and its frame: what the Plots, Scales and axes inside read of it
function chartState() {

  const s = {
    el: null,
    domain: null,
    cross: null,
    anim: undefined,
    orientation: "horizontal",
    crossed: false,
    style: undefined,
    entries: new Map(),
    registered: false,
    arranged: null,
    props: null,
    aspect: undefined,
    size: { w: 0, h: 0 },
    wrote: {},
    first: null,
    lo: null,
    hi: null,
    crossLo: null,
    crossHi: null,
    until: 0,
    undraw: null,
    notified: null,
    notifiedCross: null,
    listeners: new Set(),
    version: 0,
    scaleVersion: 0,
    themed: null,
    themeOf: null,
    styleOfTheme: null,
    userRef: undefined,
    ref: null,
    redraw: null,

    timing: () => ({ duration: s.anim?.duration ?? MOVE_MS, ease: curveOf(s.anim?.ease) }),

    // In the JS version the scale's ends move, and while they do the chart writes them in every frame
    moving(end) {
      s.until = Math.max(s.until, end);
      s.undraw ??= drawEachFrame(s.draw);
    },
    draw(t) {
      const v = s.scaleVars();
      for (const key in v) {
        if (v[key] !== s.wrote[key] && s.el) write(s.el, key, v[key]);
      }
      s.wrote = v;
      s.frame.notify();
      if (t >= s.until) {
        s.undraw?.();
        s.undraw = null;
      }
    },

    // The scale on screen: where the JS version has moved it to, or the scale itself
    shown() {
      if (!s.anim) return s.domain;
      s.lo ??= mover(s.timing, s.moving);
      s.hi ??= mover(s.timing, s.moving);
      return [s.lo(s.domain[0]), s.hi(s.domain[1])];
    },
    crossShown() {
      if (!s.crossed) return null;
      if (!s.anim) return s.cross;
      s.crossLo ??= mover(s.timing, s.moving);
      s.crossHi ??= mover(s.timing, s.moving);
      return [s.crossLo(s.cross[0]), s.crossHi(s.cross[1])];
    },
    scaleVars() {
      const [min, max] = s.shown();
      if (!s.crossed) return { "--rhp-min": min, "--rhp-max": max };
      const [a, b] = s.crossShown();
      return { "--rhp-min": min, "--rhp-max": max, "--rhp-cross-min": a, "--rhp-cross-max": b };
    },

    // The Plots' wants changed: the chart is drawn again if they change its gutters
    check() {
      if (!s.registered) return;
      const next = arrange([...s.entries.values()], s.orientation, s.crossed, s.props, s.aspect, s.domain);
      if (!sameArrangement(next, s.arranged)) s.redraw();
    },

    refFor(user) {
      if (s.ref && s.userRef === user) return s.ref;
      s.userRef = user;
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
      return s.ref;
    },
  };

  s.frame = {
    get orientation() {
      return s.orientation;
    },
    set(token, entry) {
      s.entries.set(token, entry);
      s.check();
    },
    unset(token) {
      s.entries.delete(token);
      s.check();
    },
    root: () => s.el,
    scaleNow: () => s.scaleVars(),
    shown: () => s.shown(),
    crossShown: () => s.crossShown(),
    domain: () => s.domain,
    cross: () => s.cross,
    // The chart's theme variables with its style prop over them (ManyDots reads its colors from them)
    theme: () => {
      if (s.themeOf !== s.theme || s.styleOfTheme !== s.style) {
        s.themeOf = s.theme;
        s.styleOfTheme = s.style;
        s.themed = { ...s.theme, ...s.style };
      }
      return s.themed;
    },
    length: () => (s.orientation === "vertical" ? s.size.h : s.size.w),
    // A store of what changes without the Chart being drawn: the scale on screen and the plot's size. version changes
    // with either, scaleVersion with the scale only.
    subscribe(f) {
      s.listeners.add(f);
      return () => s.listeners.delete(f);
    },
    version: () => s.version,
    scaleVersion: () => s.scaleVersion,
    notify(sized) {
      s.version++;
      if (!sized) s.scaleVersion++;
      for (const f of s.listeners) {
        f();
      }
    },
  };

  return s;
}

// The Chart's own axes, which follow the scale on screen
function ChartAxis({ frame, cross, ticks, format, grid }) {

  useSyncExternalStore(frame.subscribe, frame.scaleVersion, frame.scaleVersion);
  const own = useRef(null);
  let values = cross ? tickValues(ticks, frame.crossShown(), frame.cross()) : tickValues(ticks, frame.shown(), frame.domain());
  if (own.current && same(own.current, values)) values = own.current;
  own.current = values;

  return jsx(Axis, { ticks: values, format, grid, cross });
}

// The value axis: one grid line per tick (keyed by value), and the numbers in the axis gutter. The cross axis (cross)
// draws its lines as the other orientation's value axis would, on the cross scale.
export function Axis({ ticks = NONE, format, grid, cross }) {

  const { orientation: along, frame } = useContext(Around);
  const o = !cross ? along : other(along);

  // The lines in the order they were first drawn: a number that stays keeps its element where it is, and new numbers
  // come after. In tick order, a new tick before a kept one would make React take the kept element out and put it back,
  // and Chrome and Firefox then draw it afresh, in its new place at once, where it should slide. Their order in the page
  // doesn't matter: each line is placed by its value.
  const own = useRef(NONE);
  const now = new Set(ticks);
  const kept = own.current.filter((t) => now.has(t));
  const have = new Set(kept);
  let lines = [...kept, ...ticks.filter((t) => !have.has(t))];
  if (same(lines, own.current)) lines = own.current;
  own.current = lines;

  const dir = short(o);

  return jsx("div", {
    className: "rhp-axis",
    "data-rhp-o": dir,
    "data-rhp-cross": cross ? "" : undefined,
    "data-rhp-grid": grid === false ? "off" : undefined,
    "aria-hidden": "true",
    children: lines.map((t) => jsx(Gridline, { t, dir, format, frame, cross }, t)),
  });
}

function Gridline({ t, dir, format, frame, cross }) {

  // A line drawn with its chart needs no start (React attaches the chart's element after its lines' effects)
  const ref = useRef(null);
  useLayoutEffect(() => {
    if (frame?.root()) startOnShownScale(ref.current, frame, cross);
  }, []);

  return jsx("div", {
    ref,
    className: "rhp-gridline",
    "data-rhp-o": dir,
    style: { "--rhp-at": t },
    children: jsx("span", { children: format ? format(t) : t }),
  });
}

// Gives every Chart inside it this theme (a Chart's own `theme` still wins, key by key)
export function Theme({ value, children }) {

  const outer = useContext(ThemeContext);
  const merged = useMemo(() => ({ ...outer, ...value }), [outer, value]);

  return jsx(ThemeContext.Provider, { value: merged, children });
}
