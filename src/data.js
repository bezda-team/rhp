// Data helpers. These are plain functions (no signals) that turn raw data into data groups.
// Wrap a call in createMemo when its input changes so it runs once per change.

const compare = (a, b) => {

  if (a < b) return -1;
  if (a > b) return 1;

  return 0;
};

// An order function that sorts the rows by `key` (a function of d, or a data group name), "asc" or "desc".
// It starts from the order on screen, so rows with equal keys keep their places.
export const sortBy = (key, direction = "asc") => (rows, current) => {

  const keys = rows.map((d) => (typeof key === "function" ? key(d) : d[key]));
  const sign = direction === "desc" ? -1 : 1;
  const onScreen = rows.map((_, i) => i).sort((a, b) => (current[a] ?? Infinity) - (current[b] ?? Infinity));
  const positions = Array(rows.length);

  onScreen
    .sort((a, b) => sign * compare(keys[a], keys[b]))
    .forEach((row, position) => (positions[row] = position));

  return positions;
};

// A data group that repeats `list` over the rows (palettes). Unlike a list, it doesn't set the number of rows.
export const cycle = (list) => (d) => list[d.index % list.length];

// [smallest, largest] of a list of numbers
export const extent = (values) => {

  let lo = Infinity;
  let hi = -Infinity;

  for (const v of values) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }

  return [lo, hi];
};

// Ticks for a Scale: every multiple of `step` in the Chart's [min, max].
// With ends, min and max are ticks too (a scale that ends at the largest value: 0, 5, ..., 25, 27).
export const every = (step, { ends = false } = {}) => ([min, max]) => {

  const out = [];

  for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + 1e-9; v += step) {
    out.push(+v.toFixed(10));
  }

  if (ends && out[0] !== min) out.unshift(min);
  if (ends && out.at(-1) !== max) out.push(max);

  return out;
};

// A round scale that covers lo..hi with about `count` ticks: { min, max, step, ticks }
export function nice(lo, hi, count = 5) {

  if (!(hi > lo)) hi = lo + 1;

  const raw = (hi - lo) / Math.max(1, count);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw);
  const min = Math.floor(lo / step + 1e-9) * step;
  const max = Math.ceil(hi / step - 1e-9) * step;
  const ticks = [];

  for (let v = min; v <= max + step / 2; v += step) {
    ticks.push(+v.toFixed(10));
  }

  return { min, max, step, ticks };
}

// Stacked segments: each value starts where the one before it ended.
// Positive values stack up from 0 and negative values stack down from 0. Returns { from, to }.
export function stackUp(values) {

  let up = 0;
  let down = 0;
  const from = [];
  const to = [];

  for (const v of values) {
    if (v >= 0) {
      from.push(up);
      up += v;
      to.push(up);
    } else {
      from.push(down);
      down += v;
      to.push(down);
    }
  }

  return { from, to };
}

// Each value as a share of the total, scaled to `total` (100 by default), for segmented (100%) bars
export const shares = (values, total = 100) => {

  const sum = values.reduce((s, v) => s + Math.abs(v), 0) || 1;

  return values.map((v) => (v / sum) * total);
};

// Running totals for a waterfall: step k goes from the total before it to the total after it. Returns { from, to }.
export function running(changes) {

  let total = 0;
  const from = [];
  const to = [];

  for (const change of changes) {
    from.push(total);
    total += change;
    to.push(total);
  }

  return { from, to };
}

const quantile = (sorted, p) => {

  const h = (sorted.length - 1) * p;
  const lo = Math.floor(h);

  return sorted[lo] + (sorted[Math.min(lo + 1, sorted.length - 1)] - sorted[lo]) * (h - lo);
};

// Box and whisker numbers for a list of samples. low and high are the whisker ends: the furthest samples within
// 1.5 x IQR of the box. Samples beyond them are outliers.
export function summary(samples) {

  const sorted = samples.slice().sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const median = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const low = sorted.find((v) => v >= q1 - 1.5 * iqr);
  const high = sorted.findLast((v) => v <= q3 + 1.5 * iqr);

  return {
    min: sorted[0],
    q1,
    median,
    q3,
    max: sorted[sorted.length - 1],
    low,
    high,
    mean: sorted.reduce((a, b) => a + b, 0) / sorted.length,
    outliers: sorted.filter((v) => v < low || v > high),
  };
}

// Histogram bins over `domain` ([lo, hi], the samples' extent by default), `count` bins (10 by default).
// Returns { x0, x1, tally }: bin k covers x0[k]..x1[k] and holds tally[k] samples.
export function bins(samples, { domain = extent(samples), count = 10 } = {}) {

  const [lo, hi] = domain;
  const width = (hi - lo) / count;
  const x0 = [];
  const x1 = [];
  const tally = Array(count).fill(0);

  for (let k = 0; k < count; k++) {
    x0.push(lo + k * width);
    x1.push(lo + (k + 1) * width);
  }

  for (const v of samples) {
    if (v < lo || v > hi) continue;
    tally[Math.min(count - 1, Math.floor((v - lo) / width))]++;
  }

  return { x0, x1, tally };
}

// A smooth estimate of how samples are spread (Gaussian kernel density), for violins and ridgelines.
// Returns `points` pairs of [x, density] across the domain. The bandwidth follows Silverman's rule by default.
export function density(samples, { domain = extent(samples), points = 40, bandwidth } = {}) {

  const n = samples.length;
  const mean = samples.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(samples.reduce((a, v) => a + (v - mean) ** 2, 0) / Math.max(1, n - 1)) || 1;
  const h = bandwidth ?? 1.06 * sd * n ** -0.2;
  const [lo, hi] = domain;
  const out = [];

  for (let k = 0; k < points; k++) {
    const x = lo + ((hi - lo) * k) / (points - 1);
    let y = 0;

    for (const v of samples) {
      y += Math.exp(-0.5 * ((x - v) / h) ** 2);
    }

    out.push([x, y / (n * h * Math.sqrt(2 * Math.PI))]);
  }

  return out;
}
