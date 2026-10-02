// A shape is a path drawn in a block's own box, so a block can be any outline instead of a rectangle.
// Its two coordinates are the two axes of a chart: the first runs along the value axis, from the block's start to its
// end, and the second across the band. A number is a share of the box (0 to 1) and a string is a CSS length, so
// "26px" stays 26px however long the block is, which is what a cap or a crown needs.
// rhp does the two parts that are easy to get wrong by hand: the turn from a horizontal chart to a vertical one, and
// a bar that runs backward along the scale.
//
//   const arrow = shape(["M", 0, 0], ["L", "-26px", 0], ["L", 1, .5], ["L", "-26px", 1], ["L", 0, 1], ["Z"]);  // a pointed end
//
// Commands are SVG's, with the same coordinates: M (move), L (line), Q and C (curves) and Z (close).
// A shape of straight lines becomes clip-path: polygon(), which every browser takes. One with a curve becomes
// clip-path: shape(), and where that is missing the curve is drawn as a run of short lines instead.

const PAIRS = { M: 1, L: 1, Q: 2, C: 3, Z: 0 };

// A coordinate as CSS. A number is a share of the box (0 to 1). A string is a CSS length, and one that starts with
// a minus is measured back from the far end, which is what a cap wants: "-26px" is 26px in from the block's end.
const pct = (v) => +(v * 100).toFixed(3) + "%";
const back = (v) => typeof v === "string" && v.trim().startsWith("-");
const css = (v) => (typeof v === "number" ? pct(v) : back(v) ? `calc(100% - ${v.trim().slice(1)})` : String(v));
// The same coordinate measured from the other side of the box.
const flip = (v) => (typeof v === "number" ? pct(1 - v) : back(v) ? v.trim().slice(1) : `calc(100% - (${v}))`);

// Where a point of the shape lands in the block's box. `along` runs with the value axis and `across` over the band;
// in a vertical chart the value axis runs up the box, and a backward bar runs the other way along it.
const place = (along, across, vertical, backward) =>
  vertical ? [css(across), backward ? css(along) : flip(along)] : [backward ? flip(along) : css(along), css(across)];

// Whether the browser takes clip-path: shape(). Checked once, and only in a browser.
let takesShape;
const supportsShape = () => (takesShape ??= typeof CSS !== "undefined" && CSS.supports?.("clip-path", "shape(from 0 0, line to 1px 1px, close)"));

// A curve drawn as a run of short lines, for polygon() and for browsers without shape().
const FLAT = 12;
const lerp = (a, b, t) => a + (b - a) * t;
const straighten = (from, cmd) => {
  const out = [];
  const [x0, y0] = from;
  if (cmd[0] === "C") {
    const [, x1, y1, x2, y2, x3, y3] = cmd;
    for (let i = 1; i <= FLAT; i++) {
      const t = i / FLAT, u = 1 - t;
      out.push([u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
        u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3]);
    }
  } else {
    const [, x1, y1, x2, y2] = cmd;
    for (let i = 1; i <= FLAT; i++) {
      const t = i / FLAT, u = 1 - t;
      out.push([u * u * x0 + 2 * u * t * x1 + t * t * x2, u * u * y0 + 2 * u * t * y1 + t * t * y2]);
    }
  }
  return out;
};

// Every point of the shape in order, with any curve flattened: what polygon() needs.
const points = (cmds) => {
  const out = [];
  let at = [0, 0];
  for (const c of cmds) {
    if (c[0] === "Z") continue;
    if (c[0] === "M" || c[0] === "L") at = [c[1], c[2]];
    else {
      // a curve can only be flattened between numbers; a length in one is drawn as the straight line to its end
      const numeric = c.slice(1).every((v) => typeof v === "number") && at.every((v) => typeof v === "number");
      if (numeric) {
        for (const p of straighten(at, c)) out.push(p);
        at = c.slice(-2);
        continue;
      }
      at = c.slice(-2);
    }
    out.push(at);
  }
  return out;
};

const polygon = (cmds, vertical, back) =>
  "polygon(" + points(cmds).map(([a, c]) => place(a, c, vertical, back).join(" ")).join(", ") + ")";

const shapeFn = (cmds, vertical, back) => {
  const parts = [];
  for (const c of cmds) {
    const pt = (i) => place(c[i], c[i + 1], vertical, back).join(" ");
    if (c[0] === "M") parts.unshift("from " + pt(1));
    else if (c[0] === "L") parts.push("line to " + pt(1));
    else if (c[0] === "Q") parts.push("curve to " + pt(3) + " with " + pt(1));
    else if (c[0] === "C") parts.push("curve to " + pt(5) + " with " + pt(1) + " / " + pt(3));
    else if (c[0] === "Z") parts.push("close");
  }
  return "shape(" + parts.join(", ") + ")";
};

// A shape, ready to be worn by a block: shape(["M", 0, 0], ["L", 1, 0], …) or shape([[…], […]]).
export function shape(...cmds) {
  const list = (Array.isArray(cmds[0]) && Array.isArray(cmds[0][0]) ? cmds[0] : cmds).map((c) => (typeof c === "string" ? [c] : c));

  for (const c of list) {
    const n = PAIRS[c[0]];
    if (n === undefined) throw new Error(`rhp: ${c[0]} is not a shape command (M, L, Q, C or Z)`);
    if (c.length !== n * 2 + 1) throw new Error(`rhp: ${c[0]} in a shape takes ${n * 2} numbers, not ${c.length - 1}`);
  }

  const curved = list.some((c) => c[0] === "Q" || c[0] === "C");
  const made = new Map(); // orientation and direction -> the clip it compiles to

  return {
    curved,
    // The clip for a block drawn this way. Both forms are made once and kept, so a hundred slats of one type
    // compile one string between them.
    clip(vertical, back) {
      const key = (vertical ? 2 : 0) + (back ? 1 : 0);
      let out = made.get(key);
      if (out === undefined) {
        out = curved && supportsShape() ? shapeFn(list, vertical, back) : polygon(list, vertical, back);
        made.set(key, out);
      }
      return out;
    },
  };
}
