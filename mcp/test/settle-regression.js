// Exercise the public checker with delayed rendering and a throttled browser.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { check } from "../src/check/index.js";
import { launch } from "../src/check/browser.js";
import { report } from "../src/check/report.js";

const { browser, error } = await launch();
assert.ok(browser, error?.join("; "));
const originalContext = browser.newContext.bind(browser);
browser.newContext = async (...args) => {
  const context = await originalContext(...args);
  const originalPage = context.newPage.bind(context);
  context.newPage = async (...args) => {
    const page = await originalPage(...args);
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 8 });
    return page;
  };
  return context;
};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rhp-settle-regression-"));
try {
  const file = path.join(dir, "delayed.html");
  fs.writeFileSync(file, `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Delayed chart</title>
  <style>body { margin:40px; font:16px sans-serif; background:white; color:#111 } .rhp-chart { width:500px; height:150px } h1 { font-size:24px; color:#777; animation:appear 5s linear forwards } @keyframes appear { 0%,80% { color:white } to { color:#111 } }</style></head>
  <body><h1>Visitors this week</h1><div class="rhp-chart"><div class="rhp-body">Finished chart</div></div></body></html>`);
  const r = await check({ file, browser, guard: false, interact: false, widths: [900], outDir: dir, debug: true });
  assert.deepEqual(r.findings.filter(f => f.code === "low-contrast"), [], "finite loading animation must finish before measuring text colors");
  const busy = path.join(dir, "busy.html");
  fs.writeFileSync(busy, '<!doctype html><html lang="en"><title>Busy page</title><body><p>Updating</p><script>function update(){document.body.dataset.tick=performance.now();requestAnimationFrame(update)}update()</script></body></html>');
  const unfinished = await check({ file: busy, browser, guard: false, interact: false, widths: [900], outDir: dir, settleTimeout: 150 });
  assert.equal(unfinished.ok, false);
  assert.ok(unfinished.findings.some(f => f.code === "page-unsettled" && f.level === "error"));
  assert.ok(!unfinished.findings.some(f => f.code === "low-contrast"));
  assert.ok(!report({ ...unfinished, screenshots: [{ file: "partial.png", width: 900 }] }).includes("Passed:"), "partial screenshots must not imply that checks passed");
  console.log("PASS delayed rendering settles under 8x CPU load; an unsettled page fails explicitly");
} finally {
  await browser.close();
  fs.rmSync(dir, { recursive: true, force: true });
}
