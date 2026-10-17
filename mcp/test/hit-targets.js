import assert from "node:assert/strict";
import { launch } from "../src/check/browser.js";
import { install } from "../src/check/inpage.js";

const { browser, error } = await launch();
assert(browser, error?.join("; "));
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 }, hasTouch: true });
  await page.setContent(`<style>
    body { margin: 0; }
    .hit { position: absolute; left: 100px; top: 100px; width: 100px; height: 200px; cursor: crosshair; }
    .cover { position: absolute; inset: 0; background: white; }
  </style><div class="hit"></div><output>Ready</output>`);
  await page.evaluate(install);
  await page.evaluate(() => {
    const hit = document.querySelector(".hit");
    window.__rhpTargets = [hit];
    hit.addEventListener("pointermove", () => { document.querySelector("output").textContent = "Hovered"; });
    hit.addEventListener("click", () => { document.querySelector("output").textContent = "Tapped"; });
  });
  const point = await page.evaluate(() => window.__rhpProbe.pointAt(0));
  assert.equal(point.covered, undefined, "A slat's own root can be its pointer target without child marks");
  await page.mouse.move(point.x, point.y);
  assert.equal(await page.locator("output").textContent(), "Hovered");
  await page.touchscreen.tap(point.x, point.y);
  assert.equal(await page.locator("output").textContent(), "Tapped");

  for (const across of [0.001, 0.5, 0.999]) {
    const at = await page.evaluate(f => window.__rhpProbe.pointAt(0, f), across);
    assert(Math.abs(at.x - (100 + 100 * across)) < 0.01, "Root hit targets must honor the requested position across their width");
  }

  await page.evaluate(() => {
    const cover = document.createElement("div");
    cover.className = "cover";
    document.body.append(cover);
  });
  const covered = await page.evaluate(() => window.__rhpProbe.pointAt(0));
  assert(covered.covered, "An overlay must still be reported as covering the target");
  console.log("PASS root hit targets: pointer, touch and genuine occlusion");
} finally {
  await browser.close();
}
