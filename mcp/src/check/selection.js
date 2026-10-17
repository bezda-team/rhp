// Conditional audits of existing selection: a control selecting chart data, or click selection with temporary hover.
// The observed behavior establishes which interaction policy applies; unrelated controls do not change it.
// Run on a disposable page: clicks must not change the starting state of the normal interaction pass.
import { seenPixels } from "./png.js";
import { controlSelection } from "./selection-controls.js";

const SAME = 20;
const same = (a, b) => seenPixels(a, b) < SAME;
const name = (s) => `slat ${s.index} of ${s.of}${s.name ? ` (${s.name})` : ""}`;

// Safe space inside this chart's poster, outside every chart and every control.
// Pointing at text is safe; clicking a link, a legend button or another chart is not a reset gesture.
function beside(target) {
  const slat = window.__rhpTargets[target];
  const poster = slat?.closest(".poster, figure");
  if (!poster) return null;
  const busy = "a, button, input, select, textarea, label, summary, [role], [tabindex], [contenteditable]";
  const box = poster.getBoundingClientRect();
  let margin = null;
  for (let y = Math.max(12, box.top + 6); y < Math.min(innerHeight - 12, box.bottom - 6); y += 16) {
    for (let x = Math.max(12, box.left + 6); x < Math.min(innerWidth - 12, box.right - 6); x += 16) {
      const el = document.elementFromPoint(x, y);
      if (!el || !poster.contains(el) || el.closest(".rhp-chart") || el.closest(busy)) continue;
      const text = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      const point = { x, y, what: text ? `"${el.textContent.trim().replace(/\s+/g, " ").slice(0, 40)}"` : "the poster's margin" };
      if (text) return point;
      margin ??= point;
    }
  }
  return margin;
}

export async function selectionBehavior(page, { events }) {
  const findings = [];
  const audit = { findings, tested: null };
  const start = events.length;
  let doing = "checking existing selection and hover";
  const settle = async () => {
    const state = await page.evaluate(() => window.__rhpProbe.settle(1000));
    if (!state.rest) throw new Error("The page is moving");
  };
  const look = async () => {
    await settle();
    return page.screenshot({ animations: "disabled", scale: "css" });
  };
  const away = async () => {
    await page.mouse.move(-1, -1);
    await settle();
  };
  const pointAt = (s) => page.evaluate((n) => window.__rhpProbe.pointAt(n, 0.5, false), s.target);
  try {
    // Use reachable marks, including marks inside a slat, from the main Plot.
    // Keep the window still throughout the sequence so scrolling and sticky readouts cannot mimic a state change.
    const slats = await page.evaluate(() => window.__rhpProbe.sweepTargets(12));
    if (!slats.length) return audit;
    await page.evaluate((n) => window.__rhpProbe.pointAt(n), slats[0].target);
    await away();
    const position = await page.evaluate(() => [scrollX, scrollY]);
    const off = await page.evaluate(beside, slats[0].target);
    if (!off) return audit;
    doing = "checking selection changed by a control";
    const controlled = await controlSelection(page, { slats, off, look, away, settle });
    findings.push(...controlled.findings);
    if (controlled.tested.length) audit.tested = { controls: controlled.tested };
    if (slats.length < 2) return audit;
    const candidates = [];
    for (const s of slats) {
      const point = await pointAt(s);
      if (point.covered) continue;
      const safe = await page.evaluate(({ x, y }) => !document.elementFromPoint(x, y)?.closest("a, button, input, select, textarea, summary, [role=button], [role=slider], [contenteditable]"), point);
      if (safe) candidates.push(s);
      if (candidates.length === 3) break;
    }
    if (candidates.length < 2) return audit;
    const rest = await look();
    if (!same(rest, await look())) return audit;
    // At most three candidates, so an initial meaningful default on the first mark does not hide click selection.
    for (const chosen of candidates) {
      doing = `click ${name(chosen)}`;
      const at = await pointAt(chosen);
      if (at.covered) continue;
      await page.mouse.click(at.x, at.y);
      await away();
      const pinned = await look();
      if (same(rest, pinned)) continue;
      for (const preview of candidates.filter((s) => s !== chosen)) {
        doing = `hover ${name(preview)} after clicking ${name(chosen)}`;
        const over = await pointAt(preview);
        if (over.covered) continue;
        await page.mouse.move(over.x, over.y);
        const hovered = await look();
        if (same(pinned, hovered)) continue;
        await page.mouse.move(off.x, off.y);
        const offChart = await look();
        await away();
        const restored = await look();
        // Prove that click pins a state and hover temporarily overrides it.
        // A hover-only chart, a click-only chart, or a scrubber that retains its last point does not qualify.
        if (!same(pinned, restored)) continue;
        const here = await page.evaluate(() => [scrollX, scrollY]);
        if (position.some((v, i) => v !== here[i]) || !same(restored, await look())) return audit;
        // Compare with the selected state at the same outside-chart pointer position (including CSS :hover).
        await page.mouse.move(off.x, off.y);
        const selected = await look();
        const hoverBroken = !same(selected, offChart);
        // This click is inside the poster, outside every chart and control.
        let reset = selected;
        let resetBroken = false;
        // A proven selection control establishes a persistent choice, rather than the page's initial default.
        // The control audit already checks that a background click leaves that choice intact.
        if (!controlled.tested.length) {
          doing = `click beside the chart after selecting ${name(chosen)}`;
          await page.mouse.click(off.x, off.y);
          await away();
          reset = await look();
          resetBroken = !same(rest, reset);
        }
        const end = await page.evaluate(() => [scrollX, scrollY]);
        if (position.some((v, i) => v !== end[i]) || !same(reset, await look())) return audit;
        audit.tested = { ...audit.tested, selected: name(chosen), preview: name(preview), hoverRestoresSelection: !hoverBroken, ...(!controlled.tested.length ? { clickRestoresInitial: !resetBroken } : {}) };
        if (hoverBroken) findings.push({ code: "selection-hover-stays", target: name(preview), selected: name(chosen), what: off.what });
        if (resetBroken) findings.push({ code: "selection-reset", target: name(chosen), what: off.what });
        return audit;
      }
    }
  } catch {
    // Moving pages, covered marks and navigation cannot establish this interaction contract.
    // The normal interaction pass reports failures to reach marks and the page's exceptions.
  } finally {
    for (const e of events.slice(start)) {
      if ((e.kind === "pageerror" || e.kind === "console-error") && !e.during) e.during = doing;
    }
  }
  return audit;
}
