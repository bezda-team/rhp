// rhp as an app imports it, with each component checking how it is used: props it doesn't have, values of the wrong
// kind, a slat that reads a data group its Plot doesn't have. What it finds goes to globalThis.__rhpCheck.findings.
// The guard never throws and never changes what rhp draws: each component gets the props it was given (a Plot gets
// them through a Proxy that only wraps its slat function, which records the keys d is read with), and the checker's
// tests compare screenshots with and without the guard.
// Props are read once, untracked, and only the ones checked (never children, ref, id or handlers). Slat functions are
// never called here.
import * as rhp from "rhp-check:rhp";
import { untrack, getListener } from "solid-js";
import { note, safely, busy, store } from "./note.js";
import {
  PLOT_SETTINGS, SETTING_VALUE, CHART_PROPS, THEME_KEYS, SLAT_SETTINGS, ROOM_SIDES, BLOCKS, LENGTHS, RENAMES,
  HTML_ATTRIBUTES, SVG_ATTRIBUTES, THEME_KEY, passesThrough, closest, isPalette, isList, isObject,
} from "./rules.js";

export * from "rhp-check:rhp";

const read = (props, key) => {
  try {
    return untrack(() => props[key]);
  } catch {
    return undefined;
  }
};

const keysOf = (props) => {
  try {
    return Object.keys(props);
  } catch {
    return [];
  }
};

const show = (v) => {
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "function") return "a function";
  if (isList(v)) return `a list of ${v.length}`;
  if (isObject(v)) return "an object";
  return String(v);
};

const isColor = (c) => typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("color", c);
const SPAN = new Set(["from", "to", "value"]);

// A number a block draws at: finite, or left out
function checkNumber(name, prop, v) {

  if (v == null || (typeof v === "number" && Number.isFinite(v))) return;

  if (typeof v === "number" && Number.isNaN(v)) {
    note("error", "nan-value", `${name}'s ${prop} is NaN.`, `Give ${name} a number for ${prop}: check the data it is computed from (a missing value, a name that is misspelled, a division by zero).`);
    return;
  }

  if (typeof v === "function") {
    const args = v.length;
    note("error", "bad-prop", `${name}'s ${prop} is a function${args ? ` of ${args} argument${args > 1 ? "s" : ""}` : ""}, not a number.`,
      `Pass the number: ${prop}={d.value} in JSX. In an html template a value that changes is a function of no arguments: ${prop}=\${() => d.value}.`);
    return;
  }

  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
    note("warning", "bad-prop", `${name}'s ${prop} is the string ${JSON.stringify(v)}, not a number.`, `Pass a number (${prop}={+d.value}): a string doesn't animate in the JS version and sorts as text.`);
    return;
  }

  note("error", "bad-prop", `${name}'s ${prop} is ${show(v)}, not a number.`, `Give ${name} a finite number for ${prop}${SPAN.has(prop) ? " on the Chart's scale" : ""}.`);
}

function checkColor(name, v) {

  if (v == null || typeof v !== "string") {
    if (v != null) note("error", "bad-prop", `${name}'s color is ${show(v)}, not a color.`, `Give a theme key ("series-2", "positive", "muted"...) or a CSS color ("#2a78d6").`);
    return;
  }

  if (THEME_KEY.test(v) || /^var\(/.test(v) || isColor(v)) return;

  note("error", "bad-prop", `${name}'s color ${JSON.stringify(v)} is not a color.`, `Give a theme key ("series-2", "positive", "muted"...) or a CSS color ("#2a78d6", "rgb(42 120 214)").`);
}

function fixFor(name, prop) {

  if (name === "Chart" && (prop === "data" || prop === "rows")) return "Data goes on a Plot inside the Chart, as data groups: <Plot name={names} value={values}>.";
  if (name === "Chart" && (prop === "width" || prop === "size")) return "A Chart is as wide as its parent: size the element around it with CSS.";
  if (name === "Chart" && (prop === "title" || prop === "ariaLabel")) return "For a headline, put the Chart in a Poster with a title. For screen readers, give the Chart a label.";
  if (name === "Chart" && (prop === "colors" || prop === "palette")) return "Give the colors as the theme: theme={{ series: [\"#2a78d6\", \"#eb6834\"] }}.";
  if (name === "Chart" && (prop === "min" || prop === "max")) return "Give the value axis as scale={[min, max]}.";
  if (name === "Chart" && /^on[A-Z:]/.test(prop)) return "A Chart takes no handlers: put the handler on an element around it, or on the elements inside the slats.";
  if (name === "Chart" && /^data-/.test(prop)) return "A Chart doesn't put data-* on its element: give it an id or class, or wrap it in an element that carries the attribute.";
  if (prop === "className") return "Use class, as in HTML.";
  if (name === "Label" && (prop === "text" || prop === "label")) return "A Label's text is its children: <Label at={d.value}>{d.value}</Label>.";

  const to = RENAMES[name]?.[prop];
  if (to) return `Use ${to}.`;

  return null;
}

// Props a component doesn't have
function checkProps(name, props, own, attributes) {

  for (const key of keysOf(props)) {
    if (own.includes(key) || (attributes && (attributes.has(key) || passesThrough(key)))) continue;
    if (name === "Chart" && key.startsWith("aria-")) continue;
    const fix = fixFor(name, key) ?? (closest(key, own) ? `Did you mean ${closest(key, own)}?` : `${name} takes ${own.join(", ")}.`);
    const lead = name === "Chart" ? `Chart has no prop ${key}, so it is ignored.` : `${name} has no prop ${key}.`;
    note("error", "unknown-prop", lead, fix);
  }
}

function checkTheme(where, value) {

  if (value == null) return;
  if (!isObject(value)) {
    note("error", "bad-prop", `${where} is ${show(value)}, not an object of theme keys.`, `Give an object: { series: [...], ink: "#222", muted: "#666", surface: "#fff", font: "..." }.`);
    return;
  }

  for (const key of Object.keys(value)) {
    if (THEME_KEYS.includes(key)) continue;
    const to = RENAMES.theme[key] ?? closest(key, THEME_KEYS);
    note("error", "unknown-prop", `${where} has no key ${key}.`, `${to ? `Use ${to}. ` : ""}The theme's keys are ${THEME_KEYS.join(", ")}.`);
  }

  if (value.series != null && !(isList(value.series) && Array.from(value.series).every((c) => typeof c === "string"))) {
    note("error", "bad-prop", `${where}'s series is ${show(value.series)}, not a list of colors.`, `Give a list of CSS colors: series: ["#2a78d6", "#eb6834"].`);
  }
}

// A Chart's scale (or cross scale): two finite numbers, the smaller first. Reversed or equal, rhp draws Bars with no
// length and no axis, without a message.
function checkScale(prop, scale) {

  if (scale === undefined) return;

  const shown = isList(scale) ? `[${Array.from(scale).map(show).join(", ")}]` : show(scale);
  if (!(isList(scale) && scale.length === 2 && Number.isFinite(scale[0]) && Number.isFinite(scale[1]))) {
    note("error", "bad-scale", `Chart's ${prop} is ${shown}, not two finite numbers.`, `Give ${prop} two finite numbers, the smaller first: ${prop}=\${[0, 100]} (nice(lo, hi) gives round ones).`);
    return;
  }

  const [a, b] = scale;
  if (a === b) note("error", "bad-scale", `Chart's ${prop} is ${shown}: both ends are the same, so Bars have no length and no axis is drawn.`, `Give the scale room: ${prop}=\${[${a}, ${a + (Math.abs(a) || 1)}]}, or build it from the data with nice(lo, hi).`);
  else if (a > b) note("error", "bad-scale", `Chart's ${prop} is ${shown}: the larger number comes first, so Bars have no length and no axis is drawn.`, `Put the smaller first: ${prop}=\${[${b}, ${a}]}. To run bars the other way, use negative values with format=\${(v) => Math.abs(v)}.`);
}

function inspectChart(props) {

  checkProps("Chart", props, CHART_PROPS, null);

  checkScale("scale", read(props, "scale"));
  checkScale("cross", read(props, "cross"));

  const orientation = read(props, "orientation");
  if (orientation != null && orientation !== "horizontal" && orientation !== "vertical") {
    note("error", "bad-prop", `Chart's orientation is ${show(orientation)}.`, `Use "horizontal" (bars run left to right) or "vertical" (bars run up).`);
  }

  const height = read(props, "height");
  if (height != null && !(typeof height === "number" && height > 0 && Number.isFinite(height)) && typeof height !== "string") {
    note("error", "bad-prop", `Chart's height is ${show(height)}.`, "Give the plot's height in px: height={320}.");
  }

  const ticks = read(props, "ticks");
  if (ticks != null && ticks !== false && typeof ticks !== "number" && typeof ticks !== "function" && !(isList(ticks) && Array.from(ticks).every(Number.isFinite))) {
    note("error", "bad-prop", `Chart's ticks is ${show(ticks)}.`, "Give a list of values, a count, a function like every(10), or false for no axis.");
  }

  checkTheme("Chart's theme", read(props, "theme"));
}

// The keys of the objects in rows, over all of them (a row may leave one out)
const rowKeys = (rows) => {

  const keys = new Set();
  if (!isList(rows)) return keys;

  for (const row of rows) {
    if (isObject(row)) {
      for (const key of Object.keys(row)) {
        keys.add(key);
      }
    }
  }

  return keys;
};

// Keys a slat may read on d without any data group: rhp's own, and what JavaScript itself asks an object for
const ALWAYS = new Set(["index", "position", "toString", "valueOf", "toJSON", "then", "constructor", "$$typeof", "nodeType", "__proto__", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString", "length"]);

function inspectPlot(props) {

  const keys = keysOf(props);
  const groups = keys.filter((key) => !PLOT_SETTINGS.includes(key));
  const values = {};

  for (const key of groups) {
    values[key] = read(props, key);
  }

  for (const key of groups) {
    if (key === "index" || key === "position") {
      note("error", "bad-prop", `A Plot has a data group named ${key}, which a slat can't read: d.${key} is rhp's own (the row's ${key === "index" ? "number" : "place on screen"}).`, `Rename the data group (${key === "index" ? "rank, order, n" : "place, slot"}...).`);
      continue;
    }
    if (key === "className") {
      note("warning", "plot-typo", "A Plot has className, which rhp takes as a data group.", "Use class.");
      continue;
    }
    const setting = closest(key, PLOT_SETTINGS.filter((s) => s !== "onLoop"));
    if (setting && SETTING_VALUE[setting]?.(values[key])) {
      note("warning", "plot-typo", `A Plot has ${key}, which is not a Plot setting, so rhp takes it as a data group.`, `Did you mean ${setting}? Plot's settings are ${PLOT_SETTINGS.filter((s) => s !== "onLoop").join(", ")}.`);
    }
  }

  checkSettings(props, groups);
  checkLengths(props, groups, values);

  return groups;
}

function checkSettings(props, groups) {

  const orientation = read(props, "orientation");
  if (orientation != null && !SETTING_VALUE.orientation(orientation)) {
    note("error", "bad-prop", `A Plot's orientation is ${show(orientation)}.`, `Use "horizontal", "vertical" or "across" (the other one).`);
  }

  const reorder = read(props, "reorder");
  if (reorder != null && !SETTING_VALUE.reorder(reorder)) {
    note("error", "bad-prop", `A Plot's reorder is ${show(reorder)}.`, `Use "slide" (the default), "move" or "refill".`);
  }

  const rows = read(props, "rows");
  if (rows != null && !(isList(rows) && Array.from(rows).every((r) => r == null || isObject(r)))) {
    note("error", "bad-prop", `A Plot's rows is ${show(rows)}, not a list of objects.`, "Give rows a list of objects (their keys read like data groups), or pass each list as its own data group.");
  }

  const key = read(props, "key");
  if (typeof key === "string" && !groups.includes(key) && !rowKeys(rows).has(key)) {
    note("error", "bad-prop", `A Plot's key is ${JSON.stringify(key)}, but it has no data group ${key}.`, `key names the data group that identifies a row: ${groups.length ? groups.join(", ") : "add one"}.`);
  }

  const order = read(props, "order");
  if (order != null && typeof order !== "function" && !isList(order)) {
    note("error", "bad-prop", `A Plot's order is ${show(order)}.`, "Give a list of positions (null hides a row) or an order function like sortBy(\"value\", \"desc\").");
  }

  const animate = read(props, "animate");
  if (isList(animate)) {
    for (const name of animate) {
      if (!groups.includes(name)) note("warning", "bad-prop", `A Plot's animate names ${JSON.stringify(name)}, which is not one of its data groups.`, `Name data groups of numbers: ${groups.join(", ")}.`);
    }
  }
}

// Lists of data with different lengths: rhp repeats a shorter list from its start, which a palette wants and data doesn't
function checkLengths(props, groups, values) {

  const slats = read(props, "slats");
  const rows = read(props, "rows");
  const data = groups.filter((key) => isList(values[key]) && values[key].length >= 3 && !isPalette(values[key], isColor) && !Array.from(values[key]).every((v) => typeof v === "boolean"));
  const lengths = data.map((key) => [key, values[key].length]);
  if (isList(rows) && rows.length >= 3) lengths.push(["rows", rows.length]);
  if (lengths.length < 2 || typeof slats === "number") return;

  const [longKey, longest] = lengths.reduce((a, b) => (b[1] > a[1] ? b : a));
  const short = lengths.find(([, n]) => n < longest);
  if (!short) return;

  note("warning", "group-lengths", `A Plot's data groups have different lengths: ${longKey} has ${longest}, ${short[0]} has ${short[1]}.`,
    `Give every data group one item per row. rhp repeats a shorter list from its start, so row ${short[1] + 1} shows ${short[0]}[0].`);
}

// A slat type's settings (slat({ ... }, fn))
function checkLayout(layout) {

  if (!isObject(layout)) return;

  for (const key of Object.keys(layout)) {
    if (SLAT_SETTINGS.includes(key)) continue;
    const to = RENAMES.slat[key] ?? closest(key, SLAT_SETTINGS);
    note("error", "unknown-prop", `slat() has no setting ${key}.`, `${to ? `Use ${to}. ` : ""}A slat type's settings are css, thickness, inset and room.`);
  }

  const room = layout.room;
  const sides = (r) => {
    if (r == null || r === "auto") return;
    if (!isObject(r)) {
      note("error", "bad-prop", `A slat type's room is ${show(r)}.`, `Give room as { start, end, before, after } in px (or "auto" for start and end), or "auto".`);
      return;
    }
    for (const side of Object.keys(r)) {
      if (!ROOM_SIDES.includes(side)) {
        const to = { left: "start", right: "end", top: "before", bottom: "after" }[side];
        note("error", "unknown-prop", `A slat type's room has no side ${side}.`, `${to ? `Use ${to} (room is named along the value axis, so one room fits both orientations). ` : ""}Its sides are start, end, before and after.`);
      }
    }
  };

  if (isObject(room) && ("horizontal" in room || "vertical" in room)) {
    sides(room.horizontal);
    sides(room.vertical);
  } else {
    sides(room);
  }
}

function inspectBlock(name, props) {

  const spec = BLOCKS[name];
  checkProps(name, props, [...spec.own, "class", "style", "ref", "children"], spec.svg ? SVG_ATTRIBUTES : HTML_ATTRIBUTES);

  const given = keysOf(props);

  for (const prop of spec.numbers) {
    const v = read(props, prop);
    checkNumber(name, prop, v);
    // a place given with no value (a row with no data) is drawn at the start of the scale, with no error
    if (v == null && (prop === "at" || prop === "to") && given.includes(prop)) {
      note("error", "nan-value", `${name}'s ${prop} is ${v} (a row with no value), so rhp draws it at the start of the scale.`,
        `Leave rows with no value out of the data, or draw the ${name} only when there is one: <\${Show} when=\${() => d.value != null}>...<//>.`);
    }
  }

  for (const prop of LENGTHS[name] ?? []) {
    const v = read(props, prop);
    if (v != null && !(typeof v === "number" && Number.isFinite(v)) && typeof v !== "string") {
      note("error", "bad-prop", `${name}'s ${prop} is ${show(v)}.`, `Give a share of the band (0.6) or a CSS length ("12px").`);
    }
  }

  if (spec.own.includes("color")) checkColor(name, read(props, "color"));

  // A Dot's size as a number is a share of the slat's width and its height, which are not the same: an oval
  if (name === "Dot") {
    const size = read(props, "size");
    if (typeof size === "number") note("error", "dot-size", `Dot's size is the number ${size}, which rhp takes as a share of the slat's width and of its height, so the dot is drawn as an oval.`, `Give the size as a length: size="12px" (or "0.8em").`);
  }

  if (name === "Label") {
    const side = read(props, "side");
    const edge = read(props, "edge");
    if (side != null && side !== "after" && side !== "before") note("error", "bad-prop", `Label's side is ${show(side)}.`, `Use "after" (the default) or "before".`);
    if (edge != null && edge !== "start" && edge !== "end") note("error", "bad-prop", `Label's edge is ${show(edge)}.`, `Use "start" (names, before the scale) or "end" (totals, after it).`);
  }

  if (name === "Area" || name === "Line") checkPoints(name, read(props, "points"));
}

function checkPoints(name, points) {

  if (points == null) return;

  const pairs = isList(points) && Array.from(points).every((p) => isList(p) && p.length >= 2);
  if (!pairs) {
    note("error", "bad-prop", `${name}'s points is ${show(points)}, not a list of [x, y] pairs.`, `Give points as [[x, y], [x, y], ...]: x on the value axis, y across the band.`);
    return;
  }

  const bad = Array.from(points).findIndex((p) => !Number.isFinite(p[0]) || !Number.isFinite(p[1]));
  if (bad >= 0) {
    note("error", Number.isNaN(points[bad][0]) || Number.isNaN(points[bad][1]) ? "nan-value" : "bad-prop", `${name}'s point ${bad} is [${points[bad][0]}, ${points[bad][1]}].`, "Give every point two finite numbers.");
    return;
  }

  if (name === "Area") {
    const unsorted = points.findIndex((p, i) => i > 0 && p[0] < points[i - 1][0]);
    if (unsorted > 0) note("error", "bad-prop", `Area's points are not sorted by x (point ${unsorted} comes before point ${unsorted - 1}).`, "Sort an Area's points by x.");
    if (points.some((p) => p[1] < 0)) note("error", "bad-prop", "Area has a point with y below 0.", "An Area's y is 0 or more; for values on both sides use a Line on a cross scale.");
  }
}

// Keys JavaScript and Solid ask an object for, which are not the slat reading its data
const INTERNAL = new Set([...ALWAYS].filter((key) => key !== "index" && key !== "position"));
const KEPT = 400; // the slats of a Plot whose reads are kept, at most
const plots = [];

const same = (a, b) => Object.is(a, b) || (isList(a) && isList(b) && a.length === b.length && Array.from(a).every((v, i) => Object.is(v, b[i])));

// The slat function a Plot draws with, made to record what each slat reads on d: which keys (for missing-group), and
// the reads that are made once, so they can be read again after each interaction. A read is made once when it happens
// while the slat is drawn and outside any function (${d.sold} in an html template, a value read at the top of the
// slat), or, in a static Plot, when it reads a per-row function (static draws each row once and keeps no effects).
function watchedSlat(fn, plot) {

  return new Proxy(fn, {
    apply(target, self, args) {
      const d = args[0];
      if (d === null || typeof d !== "object") return Reflect.apply(target, self, args);
      const drawing = { reads: [], keys: new Set(), on: true };
      const watched = new Proxy(d, {
        get(row, key) {
          if (typeof key === "string" && !plot.checked.has(key)) safely(() => plot.check(key, row));
          const value = Reflect.get(row, key);
          if (drawing.on && typeof key === "string" && !INTERNAL.has(key) && !drawing.keys.has(key) && !busy()) {
            const perRow = plot.still && plot.perRow(key);
            if (perRow || getListener() == null) {
              drawing.keys.add(key);
              drawing.reads.push({ key, value, perRow });
            }
          }
          return value;
        },
      });
      let el;
      try {
        el = Reflect.apply(target, self, [watched, ...args.slice(1)]);
      } finally {
        drawing.on = false;
      }
      if (drawing.reads.length && plot.slats.length < KEPT && typeof Element !== "undefined" && el instanceof Element) plot.slats.push({ el, row: d, reads: drawing.reads });
      return el;
    },
  });
}

// Reads again what the slats read once, for the slats still on the page: a value that changed since is one the slat
// still shows as it was. The checker calls this after each interaction.
store.recheck = () => {

  for (const plot of plots) {
    for (const slat of plot.slats) {
      if (!slat.el.isConnected) continue;
      for (const r of slat.reads) {
        if (plot.changed.has(r.key)) continue;
        let now;
        try {
          now = untrack(() => (r.perRow ? read(plot.props, r.key)(slat.row) : slat.row[r.key]));
        } catch {
          continue;
        }
        if (same(now, r.value)) continue;
        plot.changed.add(r.key);
        const was = typeof r.value === "number" || typeof r.value === "boolean" || r.value == null ? String(r.value) : show(r.value);
        const is = typeof now === "number" || typeof now === "boolean" || now == null ? String(now) : show(now);
        if (r.perRow) {
          note("error", "static-chart", `The ${plot.still} is static, so each slat is drawn once: d.${r.key} changed during the interactions (from ${was} to ${is}), but the slats still show it as it was.`,
            `Take static off the ${plot.still}: static draws each row once and ignores the signals a per-row function reads, so keep it for charts that never change.`);
        } else {
          note("error", "stale-read", `A slat reads d.${r.key} once, when it is drawn (\${d.${r.key}} in an html template, or a read outside any function), so it still shows ${was} after the data changed to ${is}.`,
            `Read it in a function: \${() => d.${r.key}} in an html template, and never destructure d.`);
        }
      }
    }
  }
};

// What a Plot knows about its data, for the keys its slats read. still names what makes it static ("Chart" or "Plot"),
// or is false.
function plotData(props, groups, still) {

  const fns = new Map();
  const plot = { props, still, checked: new Set(), wrapped: new Map(), slats: [], changed: new Set() };
  plot.perRow = (key) => {
    if (!fns.has(key)) fns.set(key, groups.includes(key) && typeof read(props, key) === "function");
    return fns.get(key);
  };
  plots.push(plot);

  plot.check = (key, row) => {
    plot.checked.add(key);
    if (ALWAYS.has(key) || groups.includes(key)) return;
    if (untrack(() => Reflect.has(row, key))) return;

    const rows = read(props, "rows");
    if (rowKeys(rows).has(key)) return;

    // A data group of objects that have this key: the objects belong in rows
    const holder = groups.find((g) => {
      const v = read(props, g);
      return isList(v) && isObject(v[0]) && key in v[0];
    });
    const near = closest(key, [...groups, ...rowKeys(rows)]);
    const have = [...groups, ...rowKeys(rows)];
    const fix = holder
      ? `${holder} holds objects with ${key}: pass them as rows={${holder}} (their keys read like data groups, so d.${key} works), or read d.${holder}.${key}.`
      : near ? `Did you mean d.${near}?` : `Pass ${key} to the Plot as a data group (${key}={[...]}, one item per row), or stop reading d.${key}.`;
    note("error", "missing-group", `A slat reads d.${key}, but its Plot has no data group ${key}${have.length ? ` (it has ${have.join(", ")})` : " (it has no data groups)"}.`, fix);
  };

  return plot;
}

// Whether each Chart being drawn is static: its Plots are drawn while it is, and take it from there
const charts = [];

export function Plot(props) {

  let given = props;

  safely(() => {
    const groups = inspectPlot(props);
    const own = read(props, "static");
    const still = own === true ? "Plot" : own == null && charts.at(-1) ? "Chart" : false;
    const plot = plotData(props, groups, still);
    given = new Proxy(props, {
      get(target, key) {
        const v = Reflect.get(target, key);
        if (key !== "children" || typeof v !== "function") return v;
        if (!plot.wrapped.has(v)) plot.wrapped.set(v, watchedSlat(v, plot));
        return plot.wrapped.get(v);
      },
    });
  });

  return rhp.Plot(given);
}

export function Chart(props) {

  let still = false;

  safely(() => {
    inspectChart(props);
    still = read(props, "static") === true;
  });

  charts.push(still);
  try {
    return rhp.Chart(props);
  } finally {
    charts.pop();
  }
}

export function Theme(props) {

  safely(() => {
    checkProps("Theme", props, ["value", "children"], null);
    checkTheme("Theme's value", read(props, "value"));
  });

  return rhp.Theme(props);
}

export function Scale(props) {

  safely(() => {
    const ticks = read(props, "ticks");
    if (ticks != null && ticks !== false && typeof ticks !== "number" && typeof ticks !== "function" && !(isList(ticks) && Array.from(ticks).every(Number.isFinite))) {
      note("error", "bad-prop", `Scale's ticks is ${show(ticks)}.`, "Give a list of values, a count, or a function like every(10).");
    }
  });

  return rhp.Scale(props);
}

export function Poster(props) {

  safely(() => {
    for (const key of keysOf(props)) {
      const to = RENAMES.Poster[key];
      if (to) note("error", "unknown-prop", `Poster has no prop ${key}, so it goes on the <figure> as an attribute and shows nothing.`, `Use ${to}. A Poster takes kicker, title, dek, note and look.`);
    }
  });

  return rhp.Poster(props);
}

const block = (name) => {
  const real = rhp[name];
  return {
    [name](props) {
      safely(() => inspectBlock(name, props));
      return real(props);
    },
  }[name];
};

export const Bar = block("Bar");
export const Dot = block("Dot");
export const Tick = block("Tick");
export const Cell = block("Cell");
export const Place = block("Place");
export const Label = block("Label");
export const Area = block("Area");
export const Line = block("Line");

export function slat(def, row) {

  safely(() => {
    if (typeof def !== "function") checkLayout(def);
  });

  return rhp.slat(def, row);
}

// sortBy by a name that is not a data group sorts nothing: the order function checks the rows it is given once
export function sortBy(key, direction) {

  const order = rhp.sortBy(key, direction);
  if (typeof key !== "string") return order;

  let checked = false;

  return (rows, current) => {
    if (!checked && rows?.length) {
      checked = true;
      safely(() => {
        if (!untrack(() => key in rows[0])) note("error", "missing-group", `sortBy(${JSON.stringify(key)}) sorts by a data group the Plot doesn't have.`, `Sort by one of the Plot's data groups (sortBy("value", "desc")), or by a function of the row: sortBy((d) => d.value).`);
      });
    }
    return order(rows, current);
  };
}
