// What each rhp component takes, and the names people write instead. The guard (rhp.js) checks props against these.

// A Plot's own settings (plot.jsx). Every other prop of a Plot is a data group.
export const PLOT_SETTINGS = ["children", "order", "reorder", "orientation", "overlap", "slats", "key", "rows", "animate", "thick", "class", "style", "ref", "onLoop", "static", "keyboard"];

// The settings a data group's name is checked against for typos, and what a value of each looks like
const isList = (v) => Array.isArray(v) || (ArrayBuffer.isView(v) && !(v instanceof DataView));
const isObject = (v) => v !== null && typeof v === "object" && !isList(v);

export const SETTING_VALUE = {
  order: (v) => typeof v === "function" || (isList(v) && Array.from(v).every((x) => x == null || typeof x === "number")),
  reorder: (v) => v === "slide" || v === "move" || v === "refill",
  orientation: (v) => v === "horizontal" || v === "vertical" || v === "across",
  overlap: (v) => typeof v === "boolean",
  slats: (v) => typeof v === "number",
  key: (v) => typeof v === "string" || typeof v === "function",
  rows: (v) => isList(v) && v.length > 0 && Array.from(v).every(isObject),
  animate: (v) => typeof v === "boolean" || (isList(v) && Array.from(v).every((x) => typeof x === "string")) || isObject(v),
  thick: (v) => typeof v === "number" || typeof v === "string",
  static: (v) => typeof v === "boolean",
  keyboard: (v) => typeof v === "boolean",
  class: (v) => typeof v === "string",
  style: (v) => typeof v === "string" || isObject(v),
  ref: (v) => typeof v === "function",
  children: (v) => typeof v === "function",
};

export const CHART_PROPS = ["scale", "orientation", "height", "aspect", "ticks", "grid", "format", "animate", "theme", "static", "cross", "crossTicks", "crossGrid", "crossFormat", "label", "id", "class", "role", "style", "ref", "children"];

export const THEME_KEYS = ["series", "positive", "negative", "ink", "muted", "grid", "surface", "low", "high", "font"];

export const SLAT_SETTINGS = ["css", "thickness", "inset", "room"];

export const ROOM_SIDES = ["start", "end", "before", "after"];

// Each block's own props (blocks.jsx), and its numbers
export const BLOCKS = {
  Bar: { own: ["from", "to", "thick", "color", "shape"], numbers: ["from", "to"] },
  Dot: { own: ["at", "size", "across", "cross", "color", "shape"], numbers: ["at", "across", "cross"] },
  Tick: { own: ["at", "thick", "color", "shape"], numbers: ["at"] },
  Cell: { own: ["value", "color", "shape"], numbers: ["value"] },
  Place: { own: ["at", "across", "cross"], numbers: ["at", "across", "cross"] },
  Label: { own: ["at", "side", "edge", "cross", "shape"], numbers: ["at", "cross"] },
  Area: { own: ["points", "peak", "mirror", "smooth", "color"], numbers: ["peak"], svg: true },
  Line: { own: ["points", "peak", "fill", "base", "smooth", "color"], numbers: ["peak", "base"], svg: true },
};

// What a block's length props take: a share of the band (a number) or a CSS length
export const LENGTHS = { Bar: ["thick"], Dot: ["size"], Tick: ["thick"] };

// Names people give a prop, and the prop it is
export const RENAMES = {
  Bar: { value: "to", end: "to", length: "to", x: "to", start: "from", begin: "from", base: "from", width: "thick", height: "thick", size: "thick", thickness: "thick", fill: "color", background: "color", colour: "color" },
  Dot: { value: "at", x: "at", y: "cross", r: "size", radius: "size", width: "size", fill: "color", background: "color", colour: "color" },
  Tick: { value: "at", x: "at", length: "thick", width: "thick", size: "thick", fill: "color", background: "color", colour: "color" },
  Cell: { at: "value", fill: "color", background: "color", colour: "color" },
  Place: { value: "at", x: "at", y: "cross" },
  Label: { value: "at", x: "at", y: "cross", position: "side", align: "side", text: "children", label: "children" },
  Area: { data: "points", values: "points", max: "peak", fill: "color", colour: "color", curved: "smooth" },
  Line: { data: "points", values: "points", max: "peak", curved: "smooth", area: "fill", colour: "color" },
  Chart: { domain: "scale", range: "scale", extent: "scale", horizontal: "orientation", vertical: "orientation", direction: "orientation", colors: "theme", palette: "theme", tickFormat: "format", ariaLabel: "label", title: "label" },
  Poster: { headline: "title", heading: "title", subtitle: "dek", subheading: "dek", subhead: "dek", description: "dek", lede: "dek", standfirst: "dek", source: "note", footnote: "note", credit: "note", credits: "note", caption: "note", footer: "note", eyebrow: "kicker", overline: "kicker", tag: "kicker" },
  slat: { height: "thickness", width: "thickness", size: "thickness", thick: "thickness", pitch: "thickness", padding: "room", margin: "room", gutter: "room", gutters: "room", gap: "inset", style: "css", styles: "css", class: "css", className: "css" },
  theme: { colors: "series", palette: "series", accent: "series", text: "ink", foreground: "ink", color: "ink", background: "surface", bg: "surface", paper: "surface", gridline: "grid", gridlines: "grid", axis: "grid", fontFamily: "font", family: "font", typeface: "font" },
};

// What goes on a block's element as it is: the global HTML attributes (as Solid takes them), and SVG's for Area and Line
const GLOBAL = ["accesskey", "accessKey", "autocapitalize", "autoCapitalize", "autocorrect", "autofocus", "autoFocus", "class", "classList", "contenteditable", "contentEditable", "dir", "draggable", "enterkeyhint", "enterKeyHint", "exportparts", "hidden", "id", "inert", "inputmode", "inputMode", "is", "itemid", "itemprop", "itemProp", "itemref", "itemscope", "itemScope", "itemtype", "itemType", "lang", "nonce", "part", "popover", "role", "slot", "spellcheck", "spellCheck", "style", "tabindex", "tabIndex", "title", "translate", "writingsuggestions", "ref", "children", "innerHTML", "textContent", "innerText"];
const SVG = ["opacity", "transform", "filter", "mask", "stroke", "fill", "x", "y", "width", "height", "overflow", "visibility", "display", "cursor", "pathLength", "preserveAspectRatio", "viewBox", "xmlns", "focusable"];

export const HTML_ATTRIBUTES = new Set(GLOBAL);
export const SVG_ATTRIBUTES = new Set([...GLOBAL, ...SVG]);

// data-*, aria-*, handlers (onClick, on:click, oncapture:click), Solid's namespaces (use:, prop:, attr:, bool:), and
// SVG's hyphenated attributes (stroke-width)
export const passesThrough = (name) => /^(data|aria)-/.test(name) || /^on[A-Za-z:]/.test(name) || /^(use|prop|attr|bool):/.test(name) || /^[a-z]+(-[a-z]+)+$/.test(name);

// Edit distance (a swap of two letters side by side counts as one edit), with a cap: anything past it counts as far
function distance(a, b, cap = 3) {

  if (Math.abs(a.length - b.length) > cap) return cap + 1;

  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);

  for (let j = 1; j <= b.length; j++) {
    d[0][j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }

  return d[a.length][b.length];
}

// The name in a list closest to a name, if one is close enough to be a typo of it: one edit for names of up to six
// letters, two for longer ones
export function closest(name, names) {

  const low = name.toLowerCase();
  let best = null;
  let bestD = Infinity;

  for (const candidate of names) {
    const cap = Math.min(name.length, candidate.length) <= 6 ? 1 : 2;
    const d = distance(low, candidate.toLowerCase(), cap);
    if (d <= cap && d < bestD) {
      best = candidate;
      bestD = d;
    }
  }

  return best;
}

export const THEME_KEY = /^(series-\d+|positive|negative|ink|muted|grid|surface|low|high)$/;

// A data group that is a palette: every item a color or a theme key
export const isPalette = (list, isColor) => list.length > 0 && Array.from(list).every((c) => typeof c === "string" && (THEME_KEY.test(c) || isColor(c)));

export { isList, isObject };
