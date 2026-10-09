// The charts' colors and fonts, read from the page's tokens (article.css), so both papers reach every chart.
// series-1 to series-6 are a shelf's spines, first album to last; series-7 to series-9 the same shelf lit in gold.

export const THEME = {
  font: "var(--ui)",
  ink: "var(--ink)",
  muted: "var(--soft)",
  grid: "var(--rule)",
  surface: "var(--paper)",
  series: [
    "var(--spine-1)", "var(--spine-2)", "var(--spine-3)", "var(--spine-4)", "var(--spine-5)", "var(--spine-6)",
    "var(--gold-1)", "var(--gold-2)", "var(--gold-3)",
  ],
};

// The tone of album k of n on a shelf: the first album brightest, the last the quietest
export function spine(k, n) {
  return `series-${1 + Math.round((k / Math.max(1, n - 1)) * 5)}`;
}

// The same, lit
export function gold(k, n) {
  return `series-${7 + Math.round((k / Math.max(1, n - 1)) * 2)}`;
}

export const ACCENT = "series-8";
export const QUIET = "series-6";
