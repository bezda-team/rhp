// The public checker repairs this combination only after observing both selection and a temporary hover override.
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
const cases = [
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
      assert.equal(result.selectionAudits.length > 0, verified, `${name}: qualify only after observing click selection plus temporary hover`);
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
