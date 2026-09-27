// Data helpers. Plain functions, no signals: they turn raw data into data groups.
// Wrap a call in createMemo when its input changes, so it runs once per change, not once per read.

const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * An order function: positions that sort the rows by `key` (a function of d, or a data group name),
 * "asc" or "desc". It reads each row's key once, and sorts starting from the order on screen,
 * so rows with equal keys keep their places.
 */
export const sortBy = (key, direction = "asc") => (rows, current) => {
  const k = rows.map((d) => (typeof key === "function" ? key(d) : d[key]));
  const s = direction === "desc" ? -1 : 1;
  const onScreen = rows.map((_, i) => i).sort((a, b) => (current[a] ?? Infinity) - (current[b] ?? Infinity));
  const pos = Array(rows.length);
  onScreen.sort((a, b) => s * compare(k[a], k[b])).forEach((row, p) => (pos[row] = p));
  return pos;
};

/** A computed data group that repeats `list` over the rows (palettes). Unlike a list, it never sets the slat count. */
export const cycle = (list) => (d) => list[d.index % list.length];

/** [smallest, largest] of a list of numbers. */
export const extent = (values) => {
  let lo = Infinity, hi = -Infinity;
  for (const v of values) { if (v < lo) lo = v; if (v > hi) hi = v; }
  return [lo, hi];
};

/**
 * Ticks for a Scale: every multiple of `step` in the Chart's [min, max]. With ends, min and max are ticks too
 * (a scale that ends at the largest value: 0, 5, …, 25, 27).
 */
export const every = (step, { ends = false } = {}) => ([min, max]) => {
  const out = [];
  for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(10));
  if (ends && out[0] !== min) out.unshift(min);
  if (ends && out.at(-1) !== max) out.push(max);
  return out;
};

/** A round scale that covers lo..hi, with about `count` ticks: { min, max, step, ticks }. */
export function nice(lo, hi, count = 5) {
  if (!(hi > lo)) hi = lo + 1;
  const raw = (hi - lo) / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const min = Math.floor(lo / step + 1e-9) * step, max = Math.ceil(hi / step - 1e-9) * step;
  const ticks = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(+v.toFixed(10));
  return { min, max, step, ticks };
}

/**
 * Stacked segments: each value starts where the one before it ended.
 * Positive values stack up from 0 and negative values stack down from 0.
 * Returns two data groups, { from, to }.
 */
export function stackUp(values) {
  let up = 0, down = 0;
  const from = [], to = [];
  for (const v of values) {
    if (v >= 0) { from.push(up); up += v; to.push(up); }
    else { from.push(down); down += v; to.push(down); }
  }
  return { from, to };
}

/** Each value as a share of the total, scaled to `total` (100 by default). For segmented (100%) bars. */
export const shares = (values, total = 100) => {
  const sum = values.reduce((s, v) => s + Math.abs(v), 0) || 1;
  return values.map((v) => (v / sum) * total);
};

/** Running totals for a waterfall: step k goes from the total before it to the total after it. { from, to }. */
export function running(changes) {
  let t = 0;
  const from = [], to = [];
  for (const c of changes) { from.push(t); t += c; to.push(t); }
  return { from, to };
}

const quantile = (sorted, p) => {
  const h = (sorted.length - 1) * p, lo = Math.floor(h);
  return sorted[lo] + (sorted[Math.min(lo + 1, sorted.length - 1)] - sorted[lo]) * (h - lo);
};

/**
 * Box-and-whisker numbers for one list of samples.
 * low and high are the whisker ends: the furthest samples within 1.5 × IQR of the box. Samples beyond them are outliers.
 */
export function summary(samples) {
  const s = samples.slice().sort((a, b) => a - b);
  const q1 = quantile(s, 0.25), median = quantile(s, 0.5), q3 = quantile(s, 0.75), iqr = q3 - q1;
  const low = s.find((v) => v >= q1 - 1.5 * iqr), high = s.findLast((v) => v <= q3 + 1.5 * iqr);
  return {
    min: s[0], q1, median, q3, max: s[s.length - 1], low, high,
    mean: s.reduce((a, b) => a + b, 0) / s.length,
    outliers: s.filter((v) => v < low || v > high),
  };
}

/**
 * Histogram bins over `domain` ([lo, hi], default the samples' extent), `count` bins wide (default 10).
 * Returns three data groups, { x0, x1, tally }: bin k covers x0[k]..x1[k] and holds tally[k] samples.
 */
export function bins(samples, { domain = extent(samples), count = 10 } = {}) {
  const [lo, hi] = domain, w = (hi - lo) / count;
  const x0 = [], x1 = [], tally = Array(count).fill(0);
  for (let k = 0; k < count; k++) { x0.push(lo + k * w); x1.push(lo + (k + 1) * w); }
  for (const v of samples) {
    if (v < lo || v > hi) continue;
    tally[Math.min(count - 1, Math.floor((v - lo) / w))]++;
  }
  return { x0, x1, tally };
}

/**
 * A smooth estimate of how samples are spread (Gaussian kernel density), for violins and ridgelines.
 * Returns `points` pairs [x, density] from domain[0] to domain[1] (default: the samples' extent).
 * bandwidth defaults to Silverman's rule.
 */
export function density(samples, { domain = extent(samples), points = 40, bandwidth } = {}) {
  const n = samples.length;
  const mean = samples.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(samples.reduce((a, v) => a + (v - mean) ** 2, 0) / Math.max(1, n - 1)) || 1;
  const h = bandwidth ?? 1.06 * sd * n ** -0.2;
  const [lo, hi] = domain, out = [];
  for (let k = 0; k < points; k++) {
    const x = lo + ((hi - lo) * k) / (points - 1);
    let y = 0;
    for (const v of samples) y += Math.exp(-0.5 * ((x - v) / h) ** 2);
    out.push([x, y / (n * h * Math.sqrt(2 * Math.PI))]);
  }
  return out;
}
