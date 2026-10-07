import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium, firefox, webkit } from "playwright";
import { page as bundle } from "../scripts/bundle.mjs";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rhp-style-string-"));
const here = path.dirname(fileURLToPath(import.meta.url));
await bundle(path.join(here, "style-string.jsx"), path.join(dir, "case.js"));
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
      const els = [...document.querySelectorAll(".mark")];
      const geometry = () => els.map(el => ({ vars: Object.fromEntries([...el.style].filter(k => k.startsWith("--rhp-")).map(k => [k, el.style.getPropertyValue(k)])), width: Math.round(el.getBoundingClientRect().width) }));
      const first = geometry(), kept = [], custom = [];
      for (const st of ["--n: 2", Object.freeze({ "--n": "3" }), undefined, "--n: 4"]) {
        T.setStyle(st); await settle();
        kept.push(JSON.stringify(geometry()) === JSON.stringify(first));
        custom.push(els[0].style.getPropertyValue("--n").trim());
      }
      T.together("--n: 5", 8); await settle();
      const values = ["--rhp-to", "--rhp-to", "--rhp-at", "--rhp-value", "--rhp-at", "--rhp-to", "--rhp-to"].map((key, i) => els[i].style.getPropertyValue(key));
      const getter = () => [...document.querySelectorAll(".getter")].map(el => getComputedStyle(el).opacity);
      T.setOpacity("0.35"); await settle(); const getters = [getter()];
      T.setValue(7); await settle();
      T.setOpacity("0.6"); await settle(); getters.push(getter());
      return { kept, custom, values, getters };
    });
    assert.deepEqual(result.kept, Array(4).fill(true));
    assert.deepEqual(result.custom, ["2", "3", "", "4"]);
    assert.deepEqual(result.values, Array(7).fill("8"));
    assert.deepEqual(result.getters, [Array(3).fill("0.35"), Array(3).fill("0.6")]);
    assert.deepEqual(errors, []);
    console.log(`ok ${name}: style resets preserve geometry, queued values, and existing reactive object behavior`);
  } finally {
    await browser.close();
  }
}
