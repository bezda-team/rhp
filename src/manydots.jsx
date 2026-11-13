import { isServer } from "./env.js";
import { createRenderEffect, splitProps } from "solid-js";
import { ssrElement } from "solid-js/web";
import { usePointFrame, short } from "./plot.jsx";
import { withVars } from "./blocks.jsx";
import { pointCss, collectionCss, sharedOffset, pointDefaults, pointList, placePoints, DEFAULT_OFFSET } from "./points.js";

const OWN = ["rows", "at", "cross", "key", "size", "color", "shape", "pointClass", "pointStyle", "class", "classList", "style", "ref", "children", "innerHTML", "textContent"];

// A light-DOM scatter collection: one computation updates plain point elements instead of mounting one slat per row.
// Numeric sizes are pixels; strings are CSS lengths. Invalid coordinates are omitted, retaining the original row index.
export function ManyDots(props) {

  const frame = usePointFrame();
  if (!frame) throw new Error("rhp: ManyDots must be inside a Chart with a cross scale");
  const [, attrs] = splitProps(props, OWN);
  const cls = () => {
    let text = props.class ? "rhp-plot rhp-manydots " + props.class : "rhp-plot rhp-manydots";
    const list = props.classList;
    for (const name in list) {
      if (list[name]) text += " " + name;
    }
    return text;
  };
  const defaults = () => pointDefaults(props, frame.theme(), frame.orientation() === "vertical");
  const points = () => pointList(props, props.key, frame.scale(), frame.cross(), frame.orientation() === "vertical", frame.theme());

  if (isServer) {
    // Leaves are plain SSR HTML, without hydration keys. The browser owns them as one collection and retains them.
    const html = points().map((point) => ssrElement("div", {
      class: point.class,
      "data-rhp-index": point.index,
      style: pointCss(point.style),
    }, undefined, false).t).join("");

    return <div class={cls()} {...attrs} data-rhp-overlap="" data-rhp-o={short(frame.orientation())} style={withVars(props.style, {})}>
      <style data-rhp-manydots="">{collectionCss(defaults())}</style>
      <div class="rhp-manydots-points" data-rhp-offset={sharedOffset(props.size) === DEFAULT_OFFSET ? undefined : ""}
        style={withVars(undefined, defaults())} innerHTML={html} />
    </div>;
  }

  let container, stylesheet;
  const el = <div class={cls()} {...attrs} data-rhp-overlap="" data-rhp-o={short(frame.orientation())} style={props.style}>
    <style data-rhp-manydots="" ref={(node) => { stylesheet = node; }} />
    <div class="rhp-manydots-points" data-rhp-offset={sharedOffset(props.size) === DEFAULT_OFFSET ? undefined : ""}
      style={defaults()} ref={(node) => { container = node; }} />
  </div>;
  let records = new Map();
  let first = true;

  createRenderEffect(() => {
    const text = collectionCss(defaults());
    // Solid's text hydration assumes matching server props, while this scope must reflect current client defaults.
    if (stylesheet.textContent !== text) stylesheet.textContent = text;
  });

  createRenderEffect(() => {
    records = placePoints(container, records, points(), first);
    first = false;
  });

  props.ref?.(el);
  return el;
}
