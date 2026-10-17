// The public checker establishes the existing selection behavior before recommending a repair.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { check } from "../src/check/index.js";
import { launch } from "../src/check/browser.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const base = fs.readFileSync(path.join(here, "broken/selection-reset.html"), "utf8");
const sticky = fs.readFileSync(path.join(here, "broken/selection-hover-stays.html"), "utf8");
const reset = '  else if (!e.target.closest(".rhp-chart")) { setSelected(DEFAULT); setHover(null); }';
const clean = base.replace('  if (row != null) { setSelected(row); setHover(null); }', '  if (row != null) { setSelected(row); setHover(null); }\n' + reset);
const withoutHover = (s) => s.replace('  setHover(e.target.closest(".rhp-chart") ? rowOf(e.target) : null);', '  // No hover interaction.');
const withoutClick = (s) => s.replace('  if (row != null) { setSelected(row); setHover(null); }', '  // No click selection.');
const defaulted = (s) => s.replace('const DEFAULT = null;', 'const DEFAULT = 0;');
const controlled = base.replace('const DEFAULT = null;', 'const DEFAULT = 2;').replace('    <figcaption>', '    <label>Choose fruit <input type="range" min="0" max="4" value=${selected} onInput=${e => { setSelected(+e.target.value); setHover(null); }} /></label>\n    <figcaption>');
const controlBroken = fs.readFileSync(path.join(here, "broken/selection-control-reset.html"), "utf8");
const asSelect = (s) => s.replace(/<input type="range" min="0" max="4" value=\$\{selected\} onInput=\$\{e => \{ setSelected\(\+e.target.value\); setHover\(null\); \}\} \/>/, '<select value=${selected} onChange=${e => { setSelected(+e.target.value); setHover(null); }}>${names.map((n, i) => html`<option value=${i}>${n}</option>`)}</select>');
const asNumber = (s) => s.replace('type="range"', 'type="number"');
const continuous = (s) => s
  .replace('const row = el.closest("[data-row]");', 'const hit = el.closest("[data-hit]"); if (hit) return +hit.dataset.row;\n  const row = el.closest("[data-row]");')
  .replace('const move = (e) => {', 'const move = (e) => {\n  const hit = e.target.closest("[data-hit]");\n  if (hit) { const r = hit.getBoundingClientRect(); hit.dataset.row = Math.max(0, Math.min(4, Math.floor((e.clientX - r.left) / r.width * 5))); }')
  .replace('      <${Plot} name=${names} value=${values} lit=${(d) => shown() === d.index}>${Row}<//>', '      <${Plot} slats=${1}>${slat({ thickness: 180 }, () => html`<div data-hit="" data-row="2" role="slider" tabindex="0" aria-label="Fruit timeline" aria-valuemin="0" aria-valuemax="4" aria-valuenow=${selected} style="cursor:crosshair"></div>`)}<//>');
const withMovingBackground = (s) => s.replace('</body>', `<style>.poster {position:relative;isolation:isolate;}</style>
<script>
const wait = setInterval(() => {
  const poster = document.querySelector('.poster');
  if (!poster) return;
  clearInterval(wait);
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;z-index:-1;pointer-events:none;width:100%;height:100%;';
  poster.prepend(canvas);
  const ctx = canvas.getContext('2d');
  function frame(time) {
    ctx.fillStyle = 'hsl(' + (time / 7 % 360) + ' 60% 85%)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}, 10);
</script></body>`);
const cases = [
  ["moving-background-clean", withMovingBackground(clean), [], true],
  ["moving-background-missing-reset", withMovingBackground(base), ["selection-reset"], true],
  ["moving-background-missing-hover-end", withMovingBackground(sticky), ["selection-hover-stays"], true],
  ["control-hover-overwrites", controlBroken, ["selection-control-reset"], true],
  ["control-selection-persists", controlled, [], true],
  ["control-synchronized-preview", controlled.replace('value=${selected}', 'value=${shown}'), [], true],
  ["control-blur-resets", controlled.replace('value=${selected} onInput=', 'value=${selected} onBlur=${() => setSelected(DEFAULT)} onInput='), ["selection-control-reset"], true],
  ["select-selection-persists", asSelect(controlled), [], true],
  ["select-hover-overwrites", asSelect(controlBroken), ["selection-control-reset"], true],
  ["number-selection-persists", asNumber(controlled), [], true],
  ["number-hover-overwrites", asNumber(controlBroken), ["selection-control-reset"], true],
  ["single-hit-hover-overwrites", continuous(controlBroken), ["selection-control-reset"], true],
  ["single-hit-selection-persists", continuous(controlled), [], true],
  ["unrelated-control", base.replace('    <figcaption>', '    <label>Display size <input type="range" min="12" max="20" value="16" onInput=${e => e.currentTarget.closest("figure").style.fontSize = e.target.value + "px"} /></label>\n    <figcaption>'), ["selection-reset"], true],
  ["missing-reset", base, ["selection-reset"], true],
  ["missing-hover-end", sticky, ["selection-hover-stays"], true],
  ["both-broken", sticky.replace(reset + '\n', ''), ["selection-hover-stays", "selection-reset"], true],
  ["clean-empty-default", clean, [], true],
  ["clean-meaningful-default", defaulted(clean), [], true],
  ["missing-reset-with-default", defaulted(base), ["selection-reset"], true],
  ["wrong-default", defaulted(clean).replace('setSelected(DEFAULT); setHover(null);', 'setSelected(null); setHover(null);'), ["selection-reset"], true],
  ["hover-only", withoutClick(base), [], false],
  ["click-only", withoutHover(base), [], false],
  ["static", withoutHover(withoutClick(base)), [], false],
  ["retaining-scrubber", base.replace('setHover(e.target.closest(".rhp-chart") ? rowOf(e.target) : null);', 'const row = rowOf(e.target); if (row != null) setSelected(row);'), [], false],
  ["focusable-selection", clean.replace('<div data-row=', '<div tabindex="0" data-row='), [], true],
];
const { browser, error } = await launch();
assert(browser, error?.join("; "));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rhp-selection-regression-"));
try {
  let next = 0;
  await Promise.all(Array.from({ length: 2 }, async () => {
    while (next < cases.length) {
      const [name, html, expected, verified] = cases[next++];
      const file = path.join(dir, name + ".html");
      fs.writeFileSync(file, html);
      const result = await check({ file, browser, widths: [1280], outDir: path.join(dir, name) });
      const codes = result.findings.filter((f) => /^selection-/.test(f.code)).map((f) => f.code).sort();
      assert.deepEqual(codes, expected.sort(), `${name}: ${result.text}`);
      assert.equal(result.selectionAudits.length > 0, verified, `${name}: qualify only after observing the existing selection behavior`);
      assert(!result.findings.some((f) => f.level === "error"), result.text);
      console.log(`PASS ${name}: ${codes.join(", ") || "no conditional findings"}`);
    }
  }));
  const file = path.join(dir, "no-interact.html");
  fs.writeFileSync(file, base);
  const disabled = await check({ file, browser, interact: false, widths: [1280], outDir: path.join(dir, "disabled") });
  assert.deepEqual(disabled.selectionAudits, []);
  assert(!disabled.findings.some((f) => /^selection-/.test(f.code)));
  console.log("PASS interact: false does not run the conditional audit");
} finally {
  await browser.close();
  fs.rmSync(dir, { recursive: true, force: true });
}
