// A control qualifies only when two of its values reproduce two different chart hover states.
// This distinguishes a selection input from an unrelated filter without reading the chart's signals.
import { seenPixels } from "./png.js";

export async function controlSelection(page, { slats, off, look, away, settle }) {
  const tested = [];
  const findings = [];
  const controls = await page.evaluate((target) => {
    const poster = window.__rhpTargets[target]?.closest(".poster, figure");
    const usable = (el) => {
      const r = el.getBoundingClientRect();
      return !el.closest(".rhp-chart") && !el.disabled && !el.readOnly && el.getAttribute("aria-disabled") !== "true"
        && el.checkVisibility({ visibilityProperty: true }) && r.width > 0 && r.height > 0
        && r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth;
    };
    window.__rhpSelectionControls = [...(poster?.querySelectorAll('input[type="range"], input[type="number"], select:not([multiple]), [role="slider"]') ?? [])].filter(usable).slice(0, 6);
    return window.__rhpSelectionControls.map((el, index) => {
      const kind = el.localName === "select" ? "select" : el.type === "number" ? "number" : "slider";
      const name = el.getAttribute("aria-label") || [...(el.labels ?? [])].map((l) => l.textContent.trim()).join(" ") || el.id || kind;
      const values = kind === "select" ? [...el.options].filter((o) => !o.disabled && !o.parentElement.disabled).map((o) => o.value)
        : kind === "number" && el.min !== "" && el.max !== "" ? [el.min, el.max] : [];
      return { index, kind, name, values };
    });
  }, slats[0].target);
  if (!controls.length) return { tested, findings };
  // Ignore native thumbs and their focus rings, while still comparing the chart and its readout.
  const boxes = await page.evaluate(() => window.__rhpSelectionControls.map((el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left - 8, right: r.right + 8, top: r.top - 8, bottom: r.bottom + 8 };
  }));
  const same = (a, b) => seenPixels(a, b, boxes) < 20;
  const position = await page.evaluate(() => [scrollX, scrollY]);
  const stablePosition = async () => (await page.evaluate(() => [scrollX, scrollY])).every((v, i) => v === position[i]);
  const points = [];
  // Include both ends of a single continuous hit surface as well as separate categorical marks.
  for (const s of [slats[0], slats[Math.floor(slats.length / 2)], slats.at(-1)]) {
    for (const across of slats.length === 1 ? [0.001, 0.5, 0.999] : [0.5]) {
      const p = await page.evaluate(({ target, across }) => window.__rhpProbe.pointAt(target, across, false), { target: s.target, across });
      if (!p.covered && !points.some((q) => Math.hypot(p.x - q.x, p.y - q.y) < 2)) points.push(p);
    }
  }
  if (points.length < 2) return { tested, findings };
  for (const control of controls) {
    const handle = (await page.evaluateHandle((i) => window.__rhpSelectionControls[i], control.index)).asElement();
    try {
      const value = () => handle.evaluate((el) => el.value ?? el.getAttribute("aria-valuenow"));
      const choose = async (end) => {
        await handle.focus();
        if (control.kind === "select") await handle.selectOption(control.values.at(end ? -1 : 0));
        else if (control.kind === "number") await handle.fill(control.values[end]);
        else await handle.press(end ? "End" : "Home");
        await settle();
      };
      if (control.kind !== "slider" && control.values.length < 2) continue;
      await handle.focus();
      const previews = [];
      for (const point of points) {
        await page.mouse.move(point.x, point.y);
        const image = await look();
        if (!previews.some((p) => same(p.image, image))) previews.push({ point, image });
      }
      if (previews.length < 2) continue;
      const states = [];
      await away();
      for (const end of [0, 1]) {
        await choose(end);
        const image = await look();
        const preview = previews.find((p) => same(p.image, image));
        if (preview) states.push({ end, value: await value(), image, preview });
      }
      if (states.length !== 2 || states[0].value === states[1].value || same(states[0].image, states[1].image)) continue;
      if (!await stablePosition()) return { tested, findings };
      const chosen = states[1];
      const preview = states[0].preview;
      await choose(chosen.end);
      const pinned = await look();
      if (!same(pinned, chosen.image) || !same(pinned, await look())) continue;
      let when = null;
      await page.mouse.move(preview.point.x, preview.point.y);
      await settle();
      // A thumb may follow the hover preview. It must return to the committed choice when preview ends.
      await page.mouse.move(off.x, off.y);
      const beside = await look();
      if (await value() !== chosen.value || !same(pinned, beside)) when = "moving off the chart after hover";
      await away();
      const left = await look();
      if (!when && (await value() !== chosen.value || !same(pinned, left))) when = "leaving the poster";
      // Re-select before testing blur so a hover failure cannot disguise a separate focus reset.
      await choose(chosen.end);
      await page.mouse.click(off.x, off.y);
      await away();
      const blurred = await look();
      if (!when && (await value() !== chosen.value || !same(pinned, blurred))) when = "clicking noninteractive poster text or margin";
      if (!await stablePosition() || !same(blurred, await look())) return { tested, findings };
      tested.push({ control: control.name, selectionPersists: !when, ...(when ? { failedAt: when } : {}) });
      if (when) findings.push({ code: "selection-control-reset", control: control.name, when });
      // Leave a committed selection for the click audit's baseline.
      await choose(chosen.end);
      await away();
    } finally {
      await handle.dispose();
    }
  }
  return { tested, findings };
}
