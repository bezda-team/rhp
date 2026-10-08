// The report as text: errors first, each with what to change, then warnings, notes, what passed in one line, the
// interactions and the screenshots.

// What each passed probe proves, by the codes that would have failed it
const PASSES = [
  [["runtime-error", "console-error", "syntax-error", "missing-import", "missing-import-map", "plain-script-tag", "interaction-error", "missing-export"], "no errors thrown"],
  [["rhp-warning"], "no rhp warnings"],
  [["unknown-prop", "bad-prop", "bad-scale", "dot-size", "missing-group", "plot-typo", "group-lengths", "no-component", "bare-boolean", "handler-at-render", "style-string", "class-name", "two-solids", "series-past-theme", "page-css-ignored", "block-transition", "stale-read", "static-chart"], "rhp used as documented"],
  [["no-chart", "empty-plot", "small-plot", "collapsed-chart", "plot-outside-chart"], null],
  [["nan-value"], "no NaN values"],
  [["value-past-scale", "points-past-scale"], "values inside the scale"],
  [["sticks-out", "text-outside-poster"], "nothing sticks out"],
  [["cramped"], "slats have room"],
  [["text-overlap"], "no overlapping text"],
  [["ambiguous-label"], "names by their own marks"],
  [["text-cut-off"], "no text cut off"],
  [["page-scrolls-sideways"], "no sideways scroll"],
  [["tiny-text"], "text 9px or larger"],
  [["low-contrast"], "text contrast meets WCAG AA"],
  [["faint-marks"], "marks stand out"],
  [["colorblind"], "series colors tell apart"],
  [["request-failed"], "every file loaded"],
  [["font-not-loaded"], "fonts loaded"],
];

const widthsOf = (f) => (f.widths?.length ? ` (${f.widths.map((w) => w + "px").join(", ")})` : "");

export function report(r) {

  const lines = [];
  const count = (level) => r.findings.filter((f) => f.level === level).length;
  const errors = count("error");
  const warnings = count("warning");
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const name = r.file ? r.file.split(/[\\/]/).pop() : "chart";
  const about = [r.format, r.rhpVersion && `rhp ${r.rhpVersion}`, r.browser].filter(Boolean).join(", ");

  lines.push(`rhp check of ${name}${about ? ` (${about})` : ""}: ${errors || warnings ? [errors && plural(errors, "error"), warnings && plural(warnings, "warning")].filter(Boolean).join(", ") : "no problems found"}.`);

  const section = (level, title) => {
    const list = r.findings.filter((f) => f.level === level);
    if (!list.length) return;
    lines.push("", title);
    list.forEach((f, i) => {
      lines.push(`${i + 1}. [${f.code}] ${f.message}${widthsOf(f)}`);
      if (f.fix) lines.push(`   Fix: ${f.fix}`);
    });
  };

  section("error", "Errors");
  section("warning", "Warnings");
  section("info", "Notes");

  const codes = new Set(r.findings.map((f) => f.code));
  if (!codes.has("page-unsettled") && (r.charts?.length || r.screenshots?.length)) {
    const passed = [];
    for (const [fail, text] of PASSES) {
      if (fail.some((c) => codes.has(c))) continue;
      if (text) {
        passed.push(text);
      } else if (r.charts.length) {
        const first = r.charts.filter((c) => c.width === r.charts[0].width);
        passed.push(`${plural(first.length, "chart")} drawn (${first.map((c) => plural(c.slats, "slat")).join(", ")})`);
      }
    }
    if (passed.length) lines.push("", `Passed: ${passed.join(", ")}.`);
  }

  // a chart with no controls whose slats change nothing when pointed at or tapped has no interaction: one line, since
  // that is right for a chart asked to have none (and then slats that others cover don't matter, as long as one slat
  // was reached)
  const none = r.interactions?.length && r.interactions.every((x) => (x.kind === "hover" || x.kind === "tap") && !x.changed && !x.error) && r.interactions.some((x) => !x.missed);

  if (none) {
    lines.push("", "Interactions: no interaction found (fine when none was asked for).");
  } else if (r.interactions?.length) {
    // pointing at slats (and tapping them) that changes nothing is no failure when buttons or a slider carry the
    // interaction: one line
    const still = (kind) => r.interactions.filter((x) => x.kind === kind).every((x) => !x.changed && !x.error) && r.interactions.some((x) => x.kind === kind && !x.missed);
    const hovers = r.interactions.filter((x) => x.kind === "hover").length;
    const taps = r.interactions.filter((x) => x.kind === "tap").length;
    const controls = r.interactions.some((x) => x.changed && (/^(click|input|select)$/.test(x.kind) || / on slider /.test(x.target)));
    const quiet = controls && hovers > 0 && still("hover") ? (taps && still("tap") ? ["hover", "tap"] : ["hover"]) : [];
    lines.push("", `Interactions${r.interactedAt ? ` (at ${r.interactedAt}px)` : ""}`);
    if (quiet.length > 1) lines.push(`- hover and tap: no interaction on the slats (pointing at ${plural(hovers, "slat")} and tapping ${taps} changed nothing); buttons or a slider carry it`);
    else if (quiet.length) lines.push(`- hover: no hover interaction (pointing at ${plural(hovers, "slat")} changed nothing); buttons or a slider carry it`);
    for (const x of r.interactions) {
      if (quiet.includes(x.kind)) continue;
      lines.push(`- ${x.kind} ${x.target}${x.width !== r.interactedAt ? ` at ${x.width}px` : ""}: ${x.how}${x.error ? `, and it threw: ${x.error}` : ""}`);
    }
    // the sweep: one line, every width at which every slat was picked in turn
    const swept = (r.swept ?? []).filter((x) => x.slats);
    if (swept.length) lines.push(`- every slat picked in turn (${swept[0].slats}) at ${swept.map((x) => `${x.width}px`).join(", ")}: ${swept.some((x) => x.jumps) ? "the layout jumped (see the warnings)" : "nothing else moved"}`);
  } else if (r.charts?.length && r.interactedAt) {
    lines.push("", "Interactions: nothing to interact with (no slats to point at, no buttons, ranges or selects).");
  }

  if (r.screenshots?.length) {
    lines.push("", "Screenshots (look at them)");
    for (const s of [...r.screenshots].sort((a, b) => b.width - a.width || a.hover - b.hover)) {
      lines.push(`- ${s.width}px${s.dark ? ", dark" : ""}${s.hover ? ", pointing at a slat" : ""}: ${s.path}`);
    }
  }

  return lines.join("\n") + "\n";
}
