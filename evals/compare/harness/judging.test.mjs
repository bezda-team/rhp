import assert from "node:assert/strict";
import { test } from "node:test";
import { chromium } from "playwright-core";
import { blindCredits } from "./blind-inpage.mjs";
import { validateScores } from "./judge-scores.mjs";

test("credit blinding preserves data and layout while hiding text and vector branding", async () => {
  const browser = await chromium.launch({ executablePath: process.env.RENDER_BROWSER });
  try {
    const page = await browser.newPage();
    await page.setContent('<style>p{font:20px sans-serif}</style><p id="data">Burj Khalifa: 828 metres</p><p id="credit">Made with ApexCharts</p><a href="https://www.amcharts.com/"><svg width="40" height="20"><path d="M0 0H40V20H0Z"/></svg></a><div id="chart" role="graphics-document" aria-label="Vega visualization"><svg width="400" height="200"><rect width="200" height="200" fill="red"/></svg></div><script>window.library="rhp"</script>');
    const before = await page.locator("#data,#credit,svg").evaluateAll(elements => elements.map(e => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));
    const redactions = await page.evaluate(blindCredits);
    assert.deepEqual(redactions.map(r => r.kind), ["text", "logo"]);
    assert.equal(await page.locator("#credit span").evaluate(e => getComputedStyle(e).visibility), "hidden");
    assert.equal(await page.locator("a svg").evaluate(e => getComputedStyle(e).visibility), "hidden");
    assert.equal(await page.locator("#chart svg").evaluate(e => getComputedStyle(e).visibility), "visible", "a library name in a chart's accessible label is not a logo");
    assert.equal(await page.locator("#data").textContent(), "Burj Khalifa: 828 metres");
    const after = await page.locator("#data,#credit,svg").evaluateAll(elements => elements.map(e => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));
    assert.deepEqual(after, before);
    assert.equal(await page.evaluate(() => window.library), "rhp");
    await page.evaluate(() => {
      window.logoHidden = false;
      window.am5 = { registry: { rootElements: [{ _logo: { get: () => false, globalBounds: () => ({ left: 0, top: 0, right: 30, bottom: 20 }), set: (name, value) => { if (name === "forceHidden") window.logoHidden = value; } } }] } };
    });
    assert.equal((await page.evaluate(blindCredits)).at(-1).kind, "canvas-logo");
    assert.equal(await page.evaluate(() => window.logoHidden), true);
  } finally { await browser.close(); }
});

test("judging requires complete, unique rankings and bounded scores", () => {
  const entry = { fidelity: 8, data: 8, design: 8, legibility: 8, overall: 8, issues: [], strengths: [] };
  const key = { E01: "first", E02: "second" };
  const scores = { entries: { E01: entry, E02: entry }, ranking: ["E01", "E02"], notes: "A complete comparison." };
  assert.equal(validateScores(scores, key), scores);
  assert.throws(() => validateScores({ ...scores, ranking: ["E01", "E01"] }, key));
  assert.throws(() => validateScores({ ...scores, entries: { E01: entry } }, key));
  assert.throws(() => validateScores({ ...scores, entries: { E01: entry, E02: { ...entry, data: 0 } } }, key));
});
