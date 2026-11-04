// The charts' theme reads the page's tokens, so dark mode is the page's few lines of CSS.
// series-1 to 3: Democrats, Republicans, independents (called); series-4 to 6: the same, leading; surface: no result.

export const THEME = {
  font: '"Public Sans", "Helvetica Neue", Arial, sans-serif',
  ink: "var(--ink)",
  muted: "var(--muted)",
  grid: "var(--grid)",
  surface: "var(--none)",
  series: ["var(--dem)", "var(--rep)", "var(--ind)", "var(--dem-soft)", "var(--rep-soft)", "var(--ind-soft)"],
  positive: "var(--live)",
  negative: "var(--muted)",
  low: "var(--rep)",
  high: "var(--dem)",
};
