// The color probes, read from screenshots: text contrast (against what is behind each text, from a screenshot with the
// glyphs hidden), marks that barely show against what is behind them, and series colors that look alike to readers
// with color blindness. Then the color math they use: WCAG contrast, color blindness simulated (Machado, Oliveira and
// Fernandes 2009, at severity 1), and CIEDE2000 color differences.
import { pixelsIn } from "./png.js";

// The pixel of a list whose luminance is the median, and how much the luminance spreads (10th to 90th percentile)
function median(pixels) {

  const ranked = pixels.map((p) => [luminance(p), p]).sort((a, b) => a[0] - b[0]);
  const at = (q) => ranked[Math.min(ranked.length - 1, Math.floor(q * ranked.length))];

  return { color: at(0.5)[1], spread: at(0.9)[0] - at(0.1)[0] };
}

const scaled = (box, k) => ({ left: box.left * k, top: box.top * k, right: box.right * k, bottom: box.bottom * k });

const rgbOf = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// The color closest to fg, on the way from fg to white or to black, that reaches the contrast asked for against bg (as
// a hex color, which still reaches it once rounded). Away from bg first (a dark text gets darker); when that end can't
// reach it and flip is allowed, the other way (white text on a mid green becomes a dark text). Null when none can.
function fixColor(fg, bg, target, flip = true) {

  const away = luminance(fg) >= luminance(bg) ? [255, 255, 255] : [0, 0, 0];
  const back = away[0] ? [0, 0, 0] : [255, 255, 255];

  for (const toward of flip ? [away, back] : [away]) {
    if (contrast(toward, bg) < target) continue;
    const at = (t) => over(toward, t, fg);
    let t = 0;
    while (t < 1 && contrast(at(t), bg) < target) {
      t = Math.min(1, t + 0.02);
    }
    let lo = Math.max(0, t - 0.02);
    let hi = t;
    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2;
      if (contrast(at(mid), bg) >= target) hi = mid;
      else lo = mid;
    }
    while (hi < 1 && contrast(rgbOf(hex(at(hi))), bg) < target) {
      hi = Math.min(1, hi + 0.002);
    }
    return hex(at(hi));
  }

  return null;
}

// Text whose contrast with what is behind it is too low. WCAG AA asks for 4.5:1, or 3:1 for large text (24px, or
// 18.66px bold). Under 3:1 (2:1 for large text) the text is hard to read for anyone: an error. From there up to AA it
// reads, but not for every reader: a warning.
export function textContrast(items, behind, k) {

  const worst = new Map();

  for (const t of items) {
    if (t.kind !== "text") continue;
    const pixels = t.boxes.flatMap((b) => pixelsIn(behind, scaled(b, k)));
    if (pixels.length < 4) continue;
    const bg = median(pixels);
    const alpha = t.color[3] * t.opacity;
    if (alpha < 0.05) continue;
    const fg = over(t.color, alpha, bg.color);
    const ratio = contrast(fg, bg.color);
    const large = t.size >= 24 || (t.size >= 18.66 && t.bold);
    const need = large ? 3 : 4.5;
    if (ratio >= need) continue;
    const level = ratio < (large ? 2 : 3) ? "error" : "warning";
    const key = level + hex(fg) + hex(bg.color);
    const had = worst.get(key);
    if (!had || ratio < had.ratio) worst.set(key, { level, text: t.text, fg, bg: bg.color, ratio, need, large, count: (had?.count ?? 0) + 1 });
    else had.count++;
  }

  return [...worst.values()].sort((a, b) => a.ratio - b.ratio).map((w) => {
    const size = w.large ? "large text" : "text this size";
    // the text may turn from light to dark, but what is behind it only moves away from the text (a white page is not
    // made dark)
    const text = fixColor(w.fg, w.bg, w.need);
    const back = fixColor(w.bg, w.fg, w.need, false);
    const fixes = [text && `make the text ${text}`, back && `the color behind it ${back}`].filter(Boolean);
    return {
      level: w.level,
      code: "low-contrast",
      key: `low-contrast ${w.level} ${hex(w.fg)} ${w.text}`,
      message: w.level === "error"
        ? `${JSON.stringify(w.text)} is ${hex(w.fg)} on ${hex(w.bg)}: contrast ${w.ratio.toFixed(2)}:1, too faint to read (under ${w.large ? 2 : 3}:1; WCAG AA asks for ${w.need}:1 for ${size})${w.count > 1 ? ` (${w.count} texts like it)` : ""}.`
        : `${JSON.stringify(w.text)} is ${hex(w.fg)} on ${hex(w.bg)}: contrast ${w.ratio.toFixed(2)}:1, under the ${w.need}:1 WCAG AA asks for ${size}${w.count > 1 ? ` (${w.count} texts like it)` : ""}.`,
      fix: fixes.length
        ? `${fixes.join(", or ")} (${fixes.length > 1 ? "each the nearest color" : "the nearest color"} that reaches ${w.need}:1).`.replace(/^./, (c) => c.toUpperCase())
        : "Change the text's color or what is behind it: no shade of this color reaches it on that background.",
    };
  });
}

// An edge (a border, an outline or a box-shadow) counts when its color, drawn with its alpha over what is behind the
// mark, reaches the 3:1 that WCAG asks of the parts of a graphic.
const EDGE = 3;
const edged = (m, bg) => m.edges?.some((e) => contrast(over(e.color, e.color[3], bg), bg) >= EDGE);

const holds = (outer, inner) => outer.left <= inner.left + 1 && outer.top <= inner.top + 1 && outer.right >= inner.right - 1 && outer.bottom >= inner.bottom - 1;

// Marks close to invisible against what is behind them: each pixel a mark draws (read from a screenshot with the
// marks) against the same pixel without them. A mark counts as seen when a tenth of its pixels reach 1.25:1 (an
// outline, the colored half of a two-tone capsule), or when it or a mark it lies in (a cup around its layers) has a
// border, an outline or a box-shadow that reaches 3:1. Quiet marks drawn on purpose (the work still to do in a Gantt
// chart, leader lines, connectors) sit around 1.35:1 to 1.45:1 and read without effort, so the line is lower than that.
const FAINT = 1.25;
export function faintMarks(items, shown, hidden, k) {

  const faint = new Map();
  const marks = items.filter((m) => m.kind === "mark");

  for (const m of marks) {
    if (m.track) continue;
    const box = scaled(m.boxes[0], k);
    const a = pixelsIn(shown, box);
    const b = pixelsIn(hidden, box);
    const ratios = [];
    for (let i = 0; i < a.length; i++) {
      if (Math.abs(a[i][0] - b[i][0]) + Math.abs(a[i][1] - b[i][1]) + Math.abs(a[i][2] - b[i][2]) > 6) ratios.push([contrast(a[i], b[i]), a[i], b[i]]);
    }
    // a mark that changes few of its pixels is an outline or empty: not what this probe is about
    if (ratios.length < 6 || ratios.length < a.length * 0.3) continue;
    ratios.sort((x, y) => x[0] - y[0]);
    const [ratio, fg, bg] = ratios[Math.floor(ratios.length * 0.9)];
    if (ratio >= FAINT) continue;
    const behind = median(b).color;
    if (edged(m, behind) || marks.some((o) => o !== m && o.slat != null && o.slat === m.slat && holds(o.boxes[0], m.boxes[0]) && edged(o, behind))) continue;
    const key = m.block + hex(m.color);
    const had = faint.get(key);
    faint.set(key, { block: m.block, fg: had?.fg ?? fg, bg: had?.bg ?? bg, ratio: Math.min(ratio, had?.ratio ?? Infinity), count: (had?.count ?? 0) + 1 });
  }

  return [...faint.values()].map((f) => ({
    level: "warning",
    code: "faint-marks",
    key: `faint-marks ${f.block} ${hex(f.fg)}`,
    message: `${f.count > 1 ? `${f.count} ${f.block}s` : `A ${f.block}`} in ${hex(f.fg)} ${f.count > 1 ? "are" : "is"} ${f.ratio.toFixed(2)}:1 against ${hex(f.bg)} behind ${f.count > 1 ? "them" : "it"}, hard to see.`,
    fix: `Give the marks a color with more contrast against the background (${fixColor(f.fg, f.bg, 3) ?? "a darker or lighter one"} reaches 3:1), or an edge that does: a border, an outline or a box-shadow in the slat's css.`,
  }));
}

// Series colors that look alike: 2 to 8 distinct mark colors in a chart, and two of them, with no labels in their slats
// that tell them apart, either touching somewhere (stacked segments, mixed dots) and under a CIEDE2000 difference of 10,
// or anywhere and under 5 (the same color, to that reader), for normal vision or simulated protanopia, deuteranopia or
// tritanopia. Colors that never touch are told apart by their place too (the first and last segments of a stack). A
// see-through color (rgba, color-mix with transparent, a mark's opacity) is the color it makes over what is behind
// the mark, read from the screenshot with the marks hidden.
export function colorBlind(items, hidden, k) {

  const out = [];
  const charts = new Map();

  for (const m of items) {
    const alpha = m.color[3] * m.opacity;
    if (m.kind !== "mark" || m.track || alpha < 0.2) continue;
    const behind = alpha < 1 && hidden ? pixelsIn(hidden, scaled(m.boxes[0], k)) : [];
    const rgb = behind.length ? over(m.color, alpha, median(behind).color) : m.color.slice(0, 3);
    if (!charts.has(m.chart)) charts.set(m.chart, []);
    charts.get(m.chart).push({ ...m, rgb });
  }

  for (const marks of charts.values()) {
    // one entry per color, colors that look the same merged
    const colors = [];
    for (const m of marks) {
      const rgb = m.rgb;
      let c = colors.find((x) => difference(x.rgb, rgb) < 2);
      if (!c) colors.push((c = { rgb, names: new Set(), marks: [] }));
      c.marks.push(m);
      for (const n of m.names) {
        c.names.add(n);
      }
    }
    if (colors.length < 2 || colors.length > 8) continue;

    let worst = null;
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const [a, b] = [colors[i], colors[j]];
        const labelled = a.names.size && b.names.size && !(a.names.size === b.names.size && [...a.names].every((n) => b.names.has(n)));
        if (labelled) continue;
        const near = touching(a.marks, b.marks);
        for (const vision of VISIONS) {
          const d = difference(a.rgb, b.rgb, vision);
          if (d < (near ? 10 : 5) && (!worst || d < worst.d)) worst = { a, b, vision, d, near };
        }
      }
    }

    if (worst) {
      const who = worst.vision === "normal" ? "anyone" : `readers with ${worst.vision}`;
      out.push({
        level: "warning",
        code: "colorblind",
        message: `Two of the ${colors.length} series colors, ${hex(worst.a.rgb)} and ${hex(worst.b.rgb)}, look alike to ${who} (CIEDE2000 difference ${worst.d.toFixed(1)}${worst.near ? ", where their marks touch" : ""}).`,
        fix: "Make the colors differ in lightness as well as hue (one light, one dark), or name each series next to its marks instead of only in a legend.",
      });
    }
  }

  return out;
}

// Whether a mark of one list comes within 4px of a mark of the other
function touching(a, b) {

  const gap = (p, q) => Math.max(0, p.left - q.right, q.left - p.right, p.top - q.bottom, q.top - p.bottom);

  for (const m of a.slice(0, 3000)) {
    for (const n of b.slice(0, 3000)) {
      if (gap(m.boxes[0], n.boxes[0]) <= 4) return true;
    }
  }

  return false;
}

const linear = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

const gamma = (v) => {
  const c = Math.min(1, Math.max(0, v));
  return 255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
};

// WCAG 2 relative luminance of an sRGB color [r, g, b] (0 to 255)
const luminance = ([r, g, b]) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

function contrast(a, b) {

  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);

  return (hi + 0.05) / (lo + 0.05);
}

// A color drawn with alpha over a background, as the browser blends them (in sRGB)
const over = ([r, g, b], alpha, [br, bg, bb]) => [r * alpha + br * (1 - alpha), g * alpha + bg * (1 - alpha), b * alpha + bb * (1 - alpha)];

const hex = ([r, g, b]) => "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

// Machado et al. 2009, severity 1, applied to linear RGB
const MACHADO = {
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};

const VISIONS = ["normal", ...Object.keys(MACHADO)];

function simulate(rgb, vision) {

  const m = MACHADO[vision];
  if (!m) return rgb;

  const lin = rgb.map(linear);

  return m.map((row) => gamma(row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2]));
}

// sRGB to CIE Lab (D65)
function lab(rgb) {

  const [r, g, b] = rgb.map(linear);
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);

  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

// CIEDE2000 (Sharma, Wu and Dalal 2005)
function ciede2000([L1, a1, b1], [L2, a2, b2]) {

  const rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cbar = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cbar ** 7 / (Cbar ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const hue = (b, a) => (b === 0 && a === 0 ? 0 : (Math.atan2(b, a) / rad + 360) % 360);
  const h1p = hue(b1, a1p);
  const h2p = hue(b2, a2p);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);

  const Lbp = (L1 + L2) / 2;
  const Cbp = (C1p + C2p) / 2;
  let hbp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) <= 180) hbp = (h1p + h2p) / 2;
    else hbp = h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2;
  }

  const T = 1 - 0.17 * Math.cos((hbp - 30) * rad) + 0.24 * Math.cos(2 * hbp * rad) + 0.32 * Math.cos((3 * hbp + 6) * rad) - 0.2 * Math.cos((4 * hbp - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hbp - 275) / 25) ** 2));
  const RC = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7));
  const SL = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2);
  const SC = 1 + 0.045 * Cbp;
  const SH = 1 + 0.015 * Cbp * T;
  const RT = -Math.sin(2 * dTheta * rad) * RC;

  return Math.sqrt((dLp / SL) ** 2 + (dCp / SC) ** 2 + (dHp / SH) ** 2 + RT * (dCp / SC) * (dHp / SH));
}

// How far apart two colors look, for one kind of vision
const difference = (a, b, vision = "normal") => ciede2000(lab(simulate(a, vision)), lab(simulate(b, vision)));
