import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium, firefox, webkit } from "playwright";
import { page as bundle } from "../scripts/bundle.mjs";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rhp-style-object-"));
const here = path.dirname(fileURLToPath(import.meta.url));
await bundle(path.join(here, "style-object.jsx"), path.join(dir, "case.js"));
fs.writeFileSync(path.join(dir, "index.html"), '<!doctype html><meta charset="utf-8"><body><script src="case.js"></script>');
const engines = process.env.BROWSER ? { [process.env.BROWSER]: { chromium, firefox, webkit }[process.env.BROWSER] } : { chromium, firefox, webkit };

for (const [name, engine] of Object.entries(engines)) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(pathToFileURL(path.join(dir, "index.html")).href);
    const result = await page.evaluate(async () => {
      const settle = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const selectors = ["fast", "spread", "dot", "label", "area", "line"];
      const looks = () => selectors.map((s) => getComputedStyle(document.querySelector("." + s)).opacity);
      const states = [looks()];
      T.setOpacity("0.35"); await settle(); states.push(looks());
      T.setValue(8); await settle();
      T.setOpacity("0.6"); await settle(); states.push(looks());
      const first = T.stable.opacity;
      const replacement = document.querySelector(".replacement");
      const replacementStates = [];
      for (const style of [Object.freeze({ opacity: "0.4", outline: "2px solid blue" }), Object.freeze({ opacity: "0.7" })]) {
        T.replaceStyle(style); await settle();
        replacementStates.push([getComputedStyle(replacement).opacity, replacement.style.outlineWidth, replacement.style.outlineColor, replacement.style.getPropertyValue("--rhp-to")]);
      }
      return { states, first, replacementStates };
    });
    assert.deepEqual(result.states, [Array(6).fill("0.9"), Array(6).fill("0.35"), Array(6).fill("0.6")]);
    assert.equal(result.first, "0.6");
    assert.deepEqual(result.replacementStates, [["0.4", "2px", "blue", "8"], ["0.7", "", "", "8"]]);
    assert.deepEqual(errors, []);
    console.log(`ok ${name}: stable reactive style objects and frozen replacement objects`);
  } finally {
    await browser.close();
  }
}
