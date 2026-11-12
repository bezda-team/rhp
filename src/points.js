// What ManyDots draws, shared by rhp's Solid and React versions: each point's place and look, the collection's CSS, and
// the plain elements that show the points, updated in place.
import { safeCssValue } from "./marks.js";

const THEME_KEY = /^(series-\d+|positive|negative|ink|muted|grid|surface|low|high)$/;
const GEOMETRY = new Set(["left", "bottom", "width", "height", "margin-left", "margin-bottom", "translate"]);
const cssName = (name) => name.startsWith("--") ? name : name.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
export const readValue = (value, row, index) => typeof value === "function" ? value(row, index) : value;
export const length = (value) => typeof value === "number" ? value + "px" : value;
export const clip = (value, vertical) => value?.clip(vertical, false);
export const color = (value, theme) => typeof value === "string" && THEME_KEY.test(value) ? theme["--rhp-" + value] : value;
export const DEFAULT_OFFSET = "-2px";

// A percentage dimension is relative to its own axis; percentage margins would incorrectly use width for both axes.
export const dimension = (value) => {
  const text = String(value).trim();
  const simple = text.match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(%|[a-z]+)?$/i);

  if (simple) {
    const n = Number(simple[1]);
    if (!Number.isFinite(n) || n < 0 || (!simple[2] && n !== 0)) return null;
    if (simple[2] === "%") return { percent: n / 2, margin: "0px" };
    return { margin: -n / 2 + (simple[2] ?? "px") };
  }

  if (!/\bvar\s*\(/i.test(text) && /^(calc|min|max|clamp)\(/i.test(text) && text.endsWith(")")) {
    return { calculation: text, margin: "0px" };
  }
  // Intrinsic sizes and variables can only be centered from the browser's actual marker box.
  return null;
};

const center = (position, size) => size.percent != null
  ? position - size.percent + "%"
  : size.calculation ? `calc(${position}% - max(0px, ${size.calculation}) * .5)` : position + "%";

const coordinate = ([lo, hi]) => {
  const span = hi - lo;
  if (Number.isFinite(span)) return (value) => (value - lo) / span * 100;

  // Finite opposite endpoints can have an infinite difference. Halving first keeps their full range representable.
  const start = lo / 2;
  const width = hi / 2 - start;
  return (value) => (value / 2 - start) / width * 100;
};

// Coordinates are the only required per-point declarations. Shared appearance stays on the collection's inner container.
function pointStyle(value, x, y, size, fill, shape, sharedDimension, sharedOffset) {

  const out = {};

  if (value && typeof value === "object") {
    for (const name in value) {
      const key = cssName(name);
      if (/^(--[-\w]+|-?[a-z][-a-z\d]*)$/i.test(key) && value[name] != null) out[key] = String(value[name]);
    }
  }

  // CSSOM shorthand setters can replace earlier longhands, so owned declarations must follow user styles.
  if (size != null) out.width = out.height = String(size);
  if (fill != null) {
    delete out["background-color"];
    out["background-color"] = String(fill);
  }
  if (shape != null) {
    delete out["clip-path"];
    out["clip-path"] = String(shape);
  }
  const width = out.width == null ? sharedDimension : dimension(out.width);
  const height = out.height == null ? sharedDimension : out.height === out.width ? width : dimension(out.height);
  if ("width" in out) {
    const value = out.width;
    delete out.width;
    out.width = value;
  }
  if ("height" in out) {
    const value = out.height;
    delete out.height;
    out.height = value;
  }
  delete out.left;
  delete out.bottom;
  delete out["margin-left"];
  delete out["margin-bottom"];
  delete out.translate;

  if (width && height) {
    out.left = center(x, width);
    out.bottom = center(y, height);
    if (width.margin !== sharedOffset) out["margin-left"] = width.margin;
    if (height.margin !== sharedOffset) out["margin-bottom"] = height.margin;
  } else {
    out.left = x + "%";
    out.bottom = y + "%";
    if (sharedOffset !== "0px") out["margin-left"] = out["margin-bottom"] = "0px";
    out.translate = "-50% 50%";
  }

  return out;
}

export function pointCss(styles) {

  let text = "";

  for (const key in styles) {
    const value = styles[key];
    if (!safeCssValue(value)) continue;
    text += key + ":" + value + (GEOMETRY.has(key) ? " !important;" : ";");
  }

  return text;
}

export function newPoint(document, point) {

  const el = document.createElement("div");
  el.className = point.class;
  el.setAttribute("data-rhp-index", point.index);
  for (const key in point.style) el.style.setProperty(key, point.style[key], GEOMETRY.has(key) ? "important" : "");
  point.el = el;
  return point;
}

export function freshPoints(container, values) {

  const records = new Map();
  if (!values.length) return records;
  const document = container.ownerDocument;
  // Initial leaves need no previous-style diff or reorder checks; attach them together after assigning their properties.
  const fragment = document.createDocumentFragment();
  for (const point of values) {
    newPoint(document, point);
    records.set(point.key, point);
    fragment.appendChild(point.el);
  }
  container.appendChild(fragment);
  return records;
}

export function claimedPoint(el) {

  const style = {};
  const priorities = {};
  for (let i = 0; i < el.style.length; i++) {
    const key = el.style.item(i);
    style[key] = el.style.getPropertyValue(key);
    priorities[key] = el.style.getPropertyPriority(key);
  }
  return { el, class: el.className, index: Number(el.getAttribute("data-rhp-index")), style, priorities };
}

// An implicit scope belongs to the style element's parent, so independently rendered collections need no global IDs.
export function collectionCss(values) {

  const rules = {
    width: values["--rhp-manydot-size"],
    height: values["--rhp-manydot-size"],
    "margin-left": values["--rhp-manydot-offset"] ?? DEFAULT_OFFSET,
    "margin-bottom": values["--rhp-manydot-offset"] ?? DEFAULT_OFFSET,
    "background-color": values["--rhp-manydot-color"],
    "clip-path": values["--rhp-manydot-clip"],
  };
  // A server renders this before the Chart's core sheet, so declare its layer order before introducing rhp.core.
  let text = "@layer rhp.place, rhp.slat, rhp.core;@layer rhp.core { @scope { .rhp-manydot {";

  for (const key in rules) {
    if (safeCssValue(rules[key])) text += `${key}:${rules[key]}${GEOMETRY.has(key) ? " !important" : ""};`;
  }

  // CSS string escapes preserve the value while preventing an SSR style tag from ending inside a declaration.
  return (text + "} } }").replace(/<\/(style)/gi, "<\\/$1");
}

export function updatePoint(record, next) {

  const el = record.el;

  if (record.class !== next.class) el.className = next.class;
  if (record.index !== next.index) el.setAttribute("data-rhp-index", next.index);

  const before = Object.keys(record.style);
  const after = Object.keys(next.style);
  const changed = before.length !== after.length || after.some((key, i) => key !== before[i]
    || next.style[key] !== record.style[key]
    || (record.priorities && record.priorities[key] !== (GEOMETRY.has(key) ? "important" : "")));

  if (changed) {
    for (const key of before) {
      if (!(key in next.style)) el.style.removeProperty(key);
    }
    // Reapply in order: a changed shorthand can overwrite an otherwise unchanged managed longhand.
    for (const key of after) {
      el.style.setProperty(key, next.style[key], GEOMETRY.has(key) ? "important" : "");
    }
  }

  record.class = next.class;
  record.index = next.index;
  record.style = next.style;
  delete record.priorities;
}

// The size every point has unless it gives its own, and how far that moves a point back to center it
export const sharedSize = (size) => (typeof size === "function" ? "4px" : length(size ?? "4px"));
export const sharedOffset = (size) => dimension(sharedSize(size))?.margin ?? "0px";

// The collection-wide look, as the variables the points read
export const pointDefaults = (props, theme, vertical) => ({
  "--rhp-manydot-size": sharedSize(props.size),
  "--rhp-manydot-color": typeof props.color === "function" ? color("series-1", theme) : color(props.color ?? "series-1", theme),
  "--rhp-manydot-clip": typeof props.shape === "function" ? "none" : clip(props.shape, vertical) ?? "none",
  "--rhp-manydot-offset": sharedOffset(props.size) === DEFAULT_OFFSET ? undefined : sharedOffset(props.size),
});

// Every point to draw: { key, index, class, style }. key(row, i) names a point (its row number by default).
export function pointList(props, key, scale, cross, vertical, theme) {

  if (props.rows == null || props.at === undefined || props.cross === undefined) {
    throw new Error("rhp: ManyDots requires rows, at and cross props");
  }
  if (!cross) throw new Error("rhp: ManyDots requires a Chart with cross={[min, max]}");
  if (![...scale, ...cross].every(Number.isFinite) || scale[0] === scale[1] || cross[0] === cross[1]) {
    throw new Error("rhp: ManyDots requires finite scale and cross domains with distinct endpoints");
  }

  const alongPosition = coordinate(scale);
  const crossPosition = coordinate(cross);
  const rows = props.rows ?? [];
  const at = props.at;
  const crossValue = props.cross;
  const size = props.size;
  const fill = props.color;
  const shape = props.shape;
  const pointClass = props.pointClass;
  const styles = props.pointStyle;
  const defaultDimension = dimension(sharedSize(size));
  const defaultOffset = sharedOffset(size);
  const seen = key ? new Set() : null;
  const out = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const a = readValue(at, row, i);
    const c = readValue(crossValue, row, i);
    if (!Number.isFinite(a) || !Number.isFinite(c)) continue;
    const along = alongPosition(a);
    const across = crossPosition(c);
    if (!Number.isFinite(along) || !Number.isFinite(across)) continue;
    const id = key ? key(row, i) : i;
    if (seen?.has(id)) throw new Error("rhp: ManyDots key must return a unique value for each point");
    seen?.add(id);
    const extraClass = readValue(pointClass, row, i);
    out.push({
      key: id,
      index: i,
      class: extraClass ? "rhp-manydot " + extraClass : "rhp-manydot",
      style: pointStyle(readValue(styles, row, i), vertical ? across : along, vertical ? along : across,
        typeof size === "function" ? length(size(row, i)) : undefined,
        typeof fill === "function" ? color(fill(row, i), theme) : undefined,
        typeof shape === "function" ? clip(shape(row, i), vertical) : undefined, defaultDimension, defaultOffset),
    });
  }

  return out;
}

// Shows the points `values` in `container`, keeping the element of each point that is still there (records: key ->
// its record) and returning the records now. The first time, points a server drew are taken over (first).
export function placePoints(container, records, values, first) {

  const initial = first ? [...container.children].filter((node) => node.classList.contains("rhp-manydot")) : [];
  if (!records.size && !container.hasChildNodes()) return freshPoints(container, values);

  const next = new Map();
  let cursor = container.firstElementChild;

  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    let record = records.get(value.key);
    if (record) updatePoint(record, value);
    else if (initial[i]) {
      record = claimedPoint(initial[i]);
      updatePoint(record, value);
    } else record = newPoint(container.ownerDocument, value);
    next.set(value.key, record);
    if (record.el !== cursor) container.insertBefore(record.el, cursor);
    cursor = record.el.nextElementSibling;
  }

  for (const [key, record] of records) {
    if (!next.has(key)) record.el.remove();
  }
  for (let i = values.length; i < initial.length; i++) initial[i].remove();

  return next;
}
