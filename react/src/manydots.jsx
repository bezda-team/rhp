// A light-DOM scatter collection: one update draws plain point elements instead of a slat per row.
// Numeric sizes are pixels; strings are CSS lengths. Invalid coordinates are omitted, retaining the original row index.
// NOTE: React draws the collection's element and its CSS, and the points are plain elements the collection keeps up to
// date itself (points.js). A server writes them as HTML, and the browser takes them over.
import { useContext, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { jsx } from "react/jsx-runtime";
import { Around, isServer } from "./context.js";
import { short } from "../../src/layout.js";
import { pointCss, collectionCss, sharedOffset, pointDefaults, pointList, placePoints, DEFAULT_OFFSET } from "../../src/points.js";

const OWN = new Set(["rows", "at", "cross", "rowKey", "size", "color", "shape", "pointClass", "pointStyle", "className", "style", "ref", "children", "dangerouslySetInnerHTML"]);

const attr = (v) => String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// The points as HTML, for a server
const html = (values) => values.map((point) => `<div class="${attr(point.class)}" data-rhp-index="${point.index}" style="${attr(pointCss(point.style))}"></div>`).join("");

const EMPTY = { __html: "" };

export function ManyDots(props) {

  const { orientation, frame } = useContext(Around);
  if (!frame) throw new Error("rhp: ManyDots must be inside a Chart with a cross scale");

  useSyncExternalStore(frame.subscribe, frame.scaleVersion, frame.scaleVersion);
  const vertical = orientation === "vertical";
  const theme = frame.theme();
  const scale = frame.shown();
  const cross = frame.crossShown();
  const { rows, at, cross: crossValue, rowKey, size, color, shape, pointClass, pointStyle } = props;

  const defaults = useMemo(() => pointDefaults({ size, color, shape }, theme, vertical), [size, color, shape, theme, vertical]);
  const values = useMemo(
    () => pointList({ rows, at, cross: crossValue, size, color, shape, pointClass, pointStyle }, rowKey, scale, cross, vertical, theme),
    [rows, at, crossValue, rowKey, size, color, shape, pointClass, pointStyle, scale, cross, vertical, theme],
  );

  const own = useRef(null);
  const s = own.current ?? (own.current = { container: null, records: new Map(), first: true });

  useLayoutEffect(() => {
    s.records = placePoints(s.container, s.records, values, s.first);
    s.first = false;
  }, [values]);

  const el = {};
  for (const key in props) {
    if (!OWN.has(key)) el[key] = props[key];
  }
  el.className = props.className ? "rhp-plot rhp-manydots " + props.className : "rhp-plot rhp-manydots";
  el["data-rhp-overlap"] = "";
  el["data-rhp-o"] = short(orientation);
  el.style = props.style;
  el.ref = props.ref;
  el.children = [
    jsx("style", { "data-rhp-manydots": "", dangerouslySetInnerHTML: { __html: collectionCss(defaults) } }, "css"),
    jsx("div", {
      ref: (node) => {
        s.container = node;
      },
      className: "rhp-manydots-points",
      "data-rhp-offset": sharedOffset(size) === DEFAULT_OFFSET ? undefined : "",
      style: defaults,
      // The points are the collection's own: a server writes them, and React leaves them to it in the browser
      suppressHydrationWarning: true,
      dangerouslySetInnerHTML: isServer ? { __html: html(values) } : EMPTY,
    }, "points"),
  ];

  return jsx("div", el);
}
