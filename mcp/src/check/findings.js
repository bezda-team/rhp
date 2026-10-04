// Every finding the checker reports: what the probes in the page saw, what the page printed or threw, as
// { level, code, message, fix }. The codes and their fixes are listed in README.md (next to this file).

const q = (text) => `"${text}"`;

// What an interaction is, said as something a reader does ("clicking button "Q2"")
const DOING = { hover: "pointing at", tap: "tapping", click: "clicking", input: "setting", select: "setting", key: "pressing" };

// How far something moved: "88px down", "12px right"
const shift = ({ dx, dy }) => [dy && `${Math.abs(dy)}px ${dy > 0 ? "down" : "up"}`, dx && `${Math.abs(dx)}px ${dx > 0 ? "right" : "left"}`].filter(Boolean).join(" and ");

// A finding from what measure() saw in the page
export function fromProbe(f, context) {

  switch (f.code) {
    case "no-chart":
      return {
        level: "error",
        code: f.code,
        message: "No chart was drawn: the page has no rhp chart after it loaded.",
        fix: context.errors ? "Fix the errors above first: the chart is drawn by the code that threw." : 'Render the chart into an element the page has: render(() => html`<${Chart} ...>`, document.getElementById("chart")) with <div id="chart"></div> in the body (in a Solid or React file, export the chart component as default).',
      };
    case "empty-plot":
      return { level: "error", code: f.code, message: "A Plot draws no slats: its data groups are empty, or its order hides every row.", fix: "Give the Plot its data: a list per data group with one item per row (name={names} value={values}), or rows={objects}." };
    case "small-plot":
      if (f.thin) {
        return {
          level: "error",
          code: f.code,
          message: `Each slat of a plot is only ${f.band}px thick, too thin to see.`,
          fix: f.vertical
            ? "Show fewer columns (bin or group the data), or turn the chart horizontal: a horizontal chart grows with its rows."
            : "Give the slat type a thickness (slat({ thickness: 28, ... }, fn)), or show fewer rows.",
        };
      }
      return {
        level: "error",
        code: f.code,
        message: `A plot is only ${f.length}px ${f.vertical ? "tall" : "wide"}, too small to read.`,
        fix: f.vertical ? "Give the Chart a height (height={320}) or an aspect (aspect={16 / 9}), and its parent the room for it." : "Give the chart more width: its parent is too narrow, or the room for labels (room start and end) takes it all.",
      };
    case "nan-value":
      if (f.printed) return { level: "error", code: f.code, message: `${f.what} in the chart shows ${q(f.text)}: a value it prints is missing or not a number.`, fix: "Check the data the label prints (a missing value, a misspelled name, a division by zero), and format numbers before printing them." };
      return { level: "error", code: f.code, message: `${f.block}'s ${f.prop} is ${f.value}.`, fix: `Give ${f.block} a number for ${f.prop}: check the data it is computed from (a missing value, a name that is misspelled, a division by zero).` };
    case "plot-outside-chart":
      return {
        level: "error",
        code: f.code,
        message: `${f.count > 1 ? `${f.count} Plots are` : "A Plot is"} drawn outside a Chart, so ${f.count > 1 ? "they get" : "it gets"} no scale and none of rhp's CSS: nothing in ${f.count > 1 ? "them" : "it"} is placed.`,
        fix: "Put every Plot inside a Chart: <${Chart} scale=${[0, 100]}><${Plot} ...>${Slat}<//><//> (a Plot inside a slat is fine: the slat is in a Chart).",
      };
    case "collapsed-chart":
      return {
        level: "error",
        code: f.code,
        message: `The chart is only ${f.width}px wide and its plot 0px${f.why ? `: ${f.why}, which shrinks it to fit its content` : ""}, so its marks have no room.`,
        fix: "A chart takes the width of its box. In a flex row give the chart's box flex: 1; min-width: 0, and don't put it in an inline-block, a float or a width: fit-content box (or give that box a width).",
      };
    case "cramped":
      if (f.vertical) return { level: "warning", code: f.code, message: "The vertical chart is at the default height (240px), and the labels in its slats crowd each other.", fix: "Give the Chart the height its labels need (height={360}), or an aspect (aspect={4 / 3}), or show fewer labels per slat." };
      return { level: "warning", code: f.code, message: `Each slat is only ${f.band}px thick, too thin for the labels it holds: text and marks crowd each other.`, fix: "Give the slat type a thickness of 24px or more (slat({ thickness: 28, ... }, fn)), or the Chart the height for it." };
    case "points-past-scale": {
      const scale = f.cross ? "cross" : "scale";
      return {
        level: "error",
        code: f.code,
        message: `${f.block === "Area" ? "An Area's" : "A Line's"} points reach ${f.value}, outside the Chart's ${f.cross ? "cross scale" : "scale"} [${f.min}, ${f.max}]: rhp squeezes the whole outline into the scale, so every point is drawn in the wrong place${f.count > 1 ? ` (${f.count} values)` : ""}.`,
        fix: `Keep every point inside the scale: ${scale}=\${[${Math.min(f.min, f.value)}, ${Math.max(f.max, f.value)}]} or wider (nice() gives round ends), or cut the points to it (density() and bins() take a domain).`,
      };
    }
    case "series-past-theme": {
      const keys = f.keys.map((k) => "series-" + k).join(", ");
      return {
        level: "error",
        code: f.code,
        message: `${keys} ${f.keys.length > 1 ? "are" : "is"} past the theme's ${f.have} series colors, so ${f.count > 1 ? `${f.count} marks fall` : "a mark falls"} back to series-1.`,
        fix: `Use series(${f.have}) for a theme of ${f.have} colors (series() counts 6 by default), or give the theme more series colors.`,
      };
    }
    case "block-transition":
      return {
        level: "warning",
        code: f.code,
        message: `The slat's CSS gives ${f.path ? `the outline of ${f.what}` : f.what} a transition of its own (${f.set}), which replaces rhp's (${f.dropped.join(", ")}), so ${f.count > 1 ? `${f.count} ${f.block}s jump` : `the ${f.block} jumps`} to new values instead of moving.`,
        fix: `Put the transition on an element inside the ${f.block} (a span in it) and leave the ${f.block}'s own to rhp, or name rhp's too: transition-property: ${[...f.dropped, f.set].join(", ")}.`,
      };
    case "page-css-ignored": {
      const colors = f.props.some((p) => /color|background|fill|stroke/.test(p));
      const font = f.props.some((p) => /^font/.test(p));
      return {
        level: "warning",
        code: f.code,
        message: `The page's CSS rule ${f.selector} sets ${f.props.join(", ")} on ${f.what}${f.count > 1 ? ` and ${f.count - 1} more` : ""} in a chart, where rhp's own CSS wins, so it changes nothing.`,
        fix: `Style what is in a chart in the slat type's css (slat({ css: \`.bar { ... }\` }, fn))${colors ? ", and give colors with the block's color prop or the Chart's theme" : ""}${font ? ", and the font with the theme's font" : ""}. Page CSS can only set opacity, cursor, filter, transform, z-index and pointer-events there.`,
      };
    }
    case "value-past-scale": {
      const where = `${f.cross ? "the Chart's cross scale" : "the Chart's scale"} [${f.min}, ${f.max}]`;
      const count = f.count > 1 ? ` (${f.count} values)` : "";
      let message = `A ${f.block} sits at ${f.value}, outside ${where}, so it is drawn outside the plot${count}.`;
      if (f.kept) message = `A ${f.block} sits at ${f.value}, outside ${where}: rhp keeps it at the ${f.value < f.min ? "start" : "end"} of the scale, away from its value${count}.`;
      if (f.block === "Bar") message = `A Bar reaches ${f.value}, outside ${where}: rhp cuts a bar at the ends of the scale, so this one ${f.gone ? "draws nothing" : "shows the wrong value"}${count}.`;
      return {
        level: "error",
        code: f.code,
        message,
        fix: `Make the scale cover the data: ${f.cross ? "cross" : "scale"}=\${[${Math.min(f.min, f.value)}, ${Math.max(f.max, f.value)}]} or wider (nice(lo, hi).min and .max give round ends)${f.block === "Label" ? ", or place the Label at the value its mark shows" : ""}.`,
      };
    }
    case "sticks-out": {
      // the side the value axis starts on (left, or bottom in a vertical chart) and the side it ends on
      const along = f.vertical ? f.side === "top" || f.side === "bottom" : f.side === "left" || f.side === "right";
      const start = f.side === (f.vertical ? "bottom" : "left");
      let fix = "Keep marks inside the chart: the values inside the scale (build it with nice()), and room for what is drawn outside the plot (slat({ room: { ... } }, fn)).";
      if (f.axis) fix = "Keep the axis numbers short (a format that drops units, or fewer ticks): the axis has fixed room past each end of the scale.";
      else if (f.label && !along) fix = "Give the slats the thickness their labels need (slat({ thickness: 32 }, fn)), or make the labels smaller.";
      else if (f.label && (f.edge || start)) fix = "Give the slat type room for its names on that side (room: { start: 120 }, or room: \"auto\" to fit the longest), or cap them: max-width with text-overflow: ellipsis on the label's class.";
      else if (f.label) fix = "Give the slat type room at the end for its value labels (room: { end: 60 }), or build the scale past the largest value with nice().";
      return {
        level: "error",
        code: f.code,
        message: `${f.what}${f.text ? ` ${q(f.text)}` : ""} sticks out of its chart by ${f.by}px on the ${f.side}${f.count > 1 ? ` (${f.count} elements stick out)` : ""}.`,
        fix,
      };
    }
    case "text-outside-poster":
      return { level: "error", code: f.code, message: `${q(f.text)} sticks out of the poster by ${f.by}px.`, fix: "Let the text wrap inside the poster (no white-space: nowrap, max-width: 100%), or make it smaller at narrow widths." };
    case "text-cut-off": {
      // an ellipsis is drawn on purpose, and the text is still there to read in part: a warning. Text clipped with no
      // sign of it is an error.
      let keep = "give it room (a wider or taller box), let it wrap, or shorten it.";
      if (f.label && f.vertical) keep = "a vertical chart's names are as wide as their columns, so let them wrap (.name:vertical { white-space: normal }), shorten them, or draw the chart horizontal on narrow screens.";
      else if (f.edge) keep = "give the names room (room: { start: 140 } in the slat type, or room: \"auto\" to fit the longest), let them wrap (white-space: normal on the label's class), or shorten them.";
      return f.ellipsis
        ? { level: "warning", code: f.code, message: `${q(f.text)} ends in an ellipsis: ${f.lost}px of it is hidden by ${f.by}, so the reader loses the rest of it.`, fix: `To keep it whole, ${keep}` }
        : { level: "error", code: f.code, message: `${q(f.text)} is cut off: ${f.lost}px of it is hidden by ${f.by}, with no sign that it goes on.`, fix: `To show it whole, ${keep}` };
    }
    case "text-overlap":
      return { level: "error", code: f.code, message: `${q(f.a)} overlaps ${q(f.b)} (${f.x} by ${f.y}px).`, fix: "Give each text its own space: more room or thickness, a smaller font, shorter text, or show one of them only where it fits." };
    case "page-scrolls-sideways":
      return {
        level: "error",
        code: f.code,
        message: `The page scrolls sideways by ${f.by}px at ${f.viewport}px wide${f.what ? `: ${f.what} is ${f.width}px wide` : ""}.`,
        fix: "Keep everything inside the page's width: max-width: 100% and box-sizing: border-box on the poster, no fixed width wider than the phone, and long words allowed to wrap.",
      };
    case "tiny-text":
      return { level: "error", code: f.code, message: `${q(f.text)} is ${f.size}px${f.count > 1 ? ` (${f.count} texts are under 9px)` : ""}, too small to read.`, fix: "Make text at least 9px, and data labels 11px or more." };
    case "font-not-loaded":
      return {
        level: "info",
        code: f.code,
        message: `The font ${q(f.family)} did not load${f.failed ? " (its file failed to download: offline, or a wrong URL)" : ""}, so its text uses a fallback font.`,
        fix: "Load it with a Google Fonts <link> in the head, or drop it from the font stack.",
      };
    case "unnamed-control":
      return {
        level: "warning",
        code: f.code,
        message: `${f.what} has no accessible name${f.count > 1 ? ` (${f.count} controls have none)` : ""}: a screen reader says only what kind of control it is, not what it does.`,
        fix: "Give it visible text, an aria-label (aria-label=\"Play\" on an icon button), or a <label> around an input or a select.",
      };
    case "layout-jump": {
      const list = f.moved.slice(0, 3).map((m) => `${m.what} moves ${shift(m)}`).join(", ");
      return {
        level: "warning",
        code: f.code,
        message: `The layout jumps when ${DOING[f.kind] ?? f.kind} ${f.target}: ${list}${f.moved.length > 3 ? ` and ${f.moved.length - 3} more` : ""}${f.more ? ` (${f.more} more interaction${f.more > 1 ? "s do" : " does"} the same)` : ""}, so what the reader goes to next is no longer where it was.`,
        fix: "Keep what the interaction changes in a box that keeps its size: a readout or a headline on one line (white-space: nowrap; overflow: hidden; text-overflow: ellipsis) or with a min-height for its longest text, and buttons that keep their width when their label or weight changes.",
      };
    }
    case "out-of-view":
      return {
        level: "warning",
        code: f.code,
        message: `Tapping ${f.target} changes only what lies outside the screen (${f.what}, ${f.by}px ${f.side} it)${f.more ? `, and so does tapping ${f.more} more slat${f.more > 1 ? "s" : ""}` : ""}: the reader cannot see what the tap changed.`,
        fix: "Put the readout next to the slat (in the slat, or in a Label of it), or keep it in view on a phone (position: sticky; top: 0).",
      };
    default:
      return { level: "error", code: f.code, message: JSON.stringify(f), fix: "" };
  }
}

const STANDALONE = ["render", "html", "createSignal", "createMemo", "createEffect", "createRoot", "onMount", "onCleanup", "batch", "untrack", "For", "Index", "Show", "createStore", "reconcile", "produce", "unwrap", "Plot", "Scale", "Chart", "Theme", "Axis", "at", "useOrientation", "THEME", "series", "slat", "restyle", "linkedCss", "shape", "Bar", "Dot", "Tick", "Label", "Cell", "Place", "Area", "Line", "Poster", "sortBy", "cycle", "every", "extent", "nice", "stackUp", "shares", "running", "summary", "bins", "density", "animated", "curve", "drawing"];

// What to do about an error the page threw
export function fixForError(message, format) {

  let m = message.match(/(\w+) is not defined/);
  if (m) return STANDALONE.includes(m[1]) ? `Import ${m[1]}: import { ${m[1]}, ... } from "${format === "solid" ? (["render", "createSignal", "createMemo", "createEffect", "Show", "For", "Index", "onMount", "onCleanup", "batch", "untrack", "createRoot"].includes(m[1]) ? "solid-js" : "@bezda/rhp") : "@bezda/rhp/standalone"}".` : `Define ${m[1]} or import it before it is used.`;

  m = message.match(/Failed to resolve module specifier "([^"]+)"/);
  if (m) return `Map "${m[1]}" in the page's import map: <script type="importmap">{ "imports": { "@bezda/rhp/standalone": "https://cdn.jsdelivr.net/npm/@bezda/rhp@2/dist/standalone.js" } }</script>, before the module script.`;

  m = message.match(/Cannot read properties of (undefined|null) \(reading '([^']+)'\)/);
  if (m) return `Something is ${m[1]} where the code reads .${m[2]}: check the data and the names (a slat reads d.name only when the Plot is given name={...}).`;

  if (/rhp: a slat must return one element/.test(message)) return "Return one element from the slat, with the blocks inside it: (d) => html`<div><${Bar} to=${() => d.value} /></div>`.";
  if (/rhp: a Plot's child must be a slat function/.test(message)) return "Give the Plot one slat function as its child: <${Plot} value=${values}>${Fruit}<//>, where Fruit is (d) => html`<div>...</div>` or made with slat().";
  if (/rhp: a Scale goes inside a Chart/.test(message)) return "Put the Scale inside the Chart, beside its Plots.";
  if (/Unexpected token 'export'|Cannot use import statement outside a module/.test(message)) return "Load modules with <script type=\"module\">, and rhp through the import map.";
  if (/is not a function/.test(message)) return "Check the name and where it comes from: it is not a function there (an import that doesn't exist, or a value used as a function).";
  if (/Maximum call stack/.test(message)) return "Something calls itself without end: a signal set inside an effect that reads it, or a component that renders itself.";

  return "Fix the code that throws, at the place the message gives.";
}

// A short "file:line" for the first frame of a stack that is the user's (not rhp's or Solid's)
export function placeOf(stack, base, map) {

  for (const line of String(stack ?? "").split("\n").slice(1)) {
    const m = line.match(/\(?((?:file|https?):\/\/[^\s)]+?):(\d+):(\d+)\)?\s*$/);
    if (!m) continue;
    const [, url, row, col] = m;
    if (map && url.includes("/__rhp/bundle.js")) {
      const at = map(+row, +col);
      if (at && !/node_modules|rhp-check|\/dist\/source\/|\/src\/guard\//.test(at.source)) return `${at.source.replace(/^.*\//, "")}:${at.line}:${at.column}`;
      continue;
    }
    if (/cdn\.jsdelivr|unpkg\.com|esm\.sh/.test(url)) continue;
    return `${decodeURIComponent(url.replace(/^.*\//, ""))}:${row}:${col}`;
  }

  return "";
}
