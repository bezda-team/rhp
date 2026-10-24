// Statistics for paired benchmark samples. Everything here is deterministic: no resampling, no random numbers.
//
// A comparison is paired: sample i of the candidate and sample i of the base ran next to each other (the same round),
// so slow drift of the machine (heat, background work) hits both. We work on log ratios d_i = ln(x_i / b_i), so a change
// reads as a percentage whatever the scenario's size. The estimate is the Hodges-Lehmann estimator (the median of the
// Walsh averages), and its interval is the distribution-free one that goes with the Wilcoxon signed-rank test: exact
// for the sizes we use, no normality assumed.

export const median = (a) => {

  const s = [...a].sort((x, y) => x - y);
  const n = s.length;
  if (!n) return NaN;

  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};

export const quantile = (a, q) => {

  const s = [...a].sort((x, y) => x - y);
  if (!s.length) return NaN;
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);

  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
};

// Median absolute deviation, scaled to the standard deviation of a normal distribution
export const mad = (a) => {

  const m = median(a);

  return 1.4826 * median(a.map((x) => Math.abs(x - m)));
};

// P(W <= w) for the Wilcoxon signed-rank statistic W of n pairs with no ties, for every w from 0 to n(n+1)/2.
// Worked out by counting subsets of ranks (as probabilities, so the numbers stay small).
const cdfCache = new Map();
function signedRankCdf(n) {

  if (cdfCache.has(n)) return cdfCache.get(n);

  const max = (n * (n + 1)) / 2;
  let p = new Float64Array(max + 1);
  p[0] = 1;

  for (let r = 1; r <= n; r++) {
    const next = new Float64Array(max + 1);
    for (let s = 0; s <= max; s++) {
      if (!p[s]) continue;
      next[s] += p[s] / 2;
      if (s + r <= max) next[s + r] += p[s] / 2;
    }
    p = next;
  }

  const cdf = new Float64Array(max + 1);
  let acc = 0;

  for (let s = 0; s <= max; s++) {
    acc += p[s];
    cdf[s] = acc;
  }

  cdfCache.set(n, cdf);

  return cdf;
}

// The Hodges-Lehmann estimate of the center of d, and its (1 - alpha) interval
export function hodgesLehmann(d, alpha = 0.05) {

  const n = d.length;
  if (n < 2) return { estimate: n ? d[0] : NaN, lo: NaN, hi: NaN, n };

  const walsh = [];

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      walsh.push((d[i] + d[j]) / 2);
    }
  }

  walsh.sort((x, y) => x - y);
  const M = walsh.length;
  const cdf = signedRankCdf(n);

  // C is the largest c with P(W <= c - 1) <= alpha / 2 (Hollander and Wolfe), and the interval runs from the C-th
  // smallest Walsh average to the C-th largest. With 5 pairs or fewer there is no such c: the interval is unbounded.
  let C = 0;
  while (C < M && cdf[C] <= alpha / 2) {
    C++;
  }
  if (C === 0) return { estimate: median(walsh), lo: -Infinity, hi: Infinity, n };

  return { estimate: median(walsh), lo: walsh[C - 1], hi: walsh[M - C], n };
}

// A paired comparison of a candidate's samples against the base's, as a percentage change with its interval.
// Pairs where either side is missing are dropped.
export function compare(base, cand, alpha = 0.05) {

  const d = [];

  for (let i = 0; i < Math.min(base.length, cand.length); i++) {
    const b = base[i];
    const c = cand[i];
    if (b > 0 && c > 0 && Number.isFinite(b) && Number.isFinite(c)) d.push(Math.log(c / b));
  }

  const hl = hodgesLehmann(d, alpha);
  const pct = (x) => (Math.exp(x) - 1) * 100;

  return {
    n: hl.n,
    change: pct(hl.estimate),
    // An unbounded interval (5 pairs or fewer) stays unbounded: exp(-Infinity) - 1 would read as -100%
    lo: Number.isFinite(hl.lo) ? pct(hl.lo) : -Infinity,
    hi: Number.isFinite(hl.hi) ? pct(hl.hi) : Infinity,
    // Whether the interval leaves out zero: the change is real at this confidence
    clear: hl.lo > 0 || hl.hi < 0,
  };
}

// A summary of one sample set: its median, its spread (MAD as a share of the median) and its quartiles
export function describe(a) {

  const xs = a.filter((x) => Number.isFinite(x));
  const m = median(xs);

  return { n: xs.length, median: m, spread: (mad(xs) / m) * 100, q1: quantile(xs, 0.25), q3: quantile(xs, 0.75), min: Math.min(...xs), max: Math.max(...xs) };
}

// The order of variants in round r: a rotation, reversed every other cycle, so each variant is measured in each
// position equally often and runs before and after each other variant
export function roundOrder(list, r) {

  const k = list.length;
  const rot = list.map((_, j) => list[(j + r) % k]);

  return Math.floor(r / k) % 2 ? rot.reverse() : rot;
}

export const fmt = (x, digits = 1) => (Number.isFinite(x) ? x.toFixed(digits) : "-");

export const fmtChange = (c) => {

  if (!c || !Number.isFinite(c.change)) return "-";
  const sign = (x) => (x > 0 ? "+" : "") + x.toFixed(1);

  return `${sign(c.change)}% [${sign(c.lo)}, ${sign(c.hi)}]${c.clear ? " *" : ""}`;
};
