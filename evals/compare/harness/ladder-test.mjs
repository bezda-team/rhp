// Tests the ladder's interactive steps the same way for every library, from the outside: which readouts a mouse, a
// finger and the keyboard can reach (step 6 on), and whether the year buttons change the shown values (step 7 on).
//   node ladder-test.mjs <ladder dir>      prints JSON
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { chromium } from "playwright-core";

const root = process.argv[2];
const LIBS = ["rhp", "apexcharts", "chartjs", "d3"];
const CITIES = ["Oslo", "Lisbon", "Vienna", "Dublin", "Prague"];
const { serveCdn } = await import("./render.mjs");

const browser = await chromium.launch({ executablePath: process.env.RENDER_BROWSER ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const out = {};
for (const lib of LIBS) {
  out[lib] = {};
  for (const step of ["step-6-readout", "step-7-animate", "step-8-pictogram"]) {
    const file = path.join(root, lib, `${step}.html`);
    if (!fs.existsSync(file)) continue;
    const server = http.createServer((q, r) => r.writeHead(200, { "content-type": "text/html" }).end(fs.readFileSync(file))).listen(0, "127.0.0.1");
    await new Promise((r) => server.on("listening", r));
    const result = {};
    for (const mode of ["mouse", "touch", "keyboard"]) {
      const ctx = await browser.newContext({ viewport: mode === "touch" ? { width: 390, height: 844 } : { width: 1280, height: 900 }, hasTouch: mode === "touch", isMobile: mode === "touch" });
      const page = await ctx.newPage();
      await page.route("**/*", async (route) => {
        const u = route.request().url();
        if (u.startsWith("http://127.0.0.1")) return route.continue();
        const got = await serveCdn(u).catch(() => null);
        if (got) return route.fulfill({ status: got.status, contentType: got.type ?? "text/plain", body: got.body, headers: { "access-control-allow-origin": "*", ...(got.headers ?? {}) } });
        try { return route.fulfill({ response: await route.fetch({ timeout: 8000 }) }); } catch { return route.abort(); }
      });
      await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: "load" });
      await page.waitForTimeout(2000);
      const readout = () => page.evaluate(() => {
        const all = [...document.querySelectorAll("body *")].filter((e) => /^[A-Z][a-z]+: \d+% in 20\d\d/.test(e.textContent.trim()) && ![...e.children].some((c) => /^[A-Z][a-z]+: \d+% in 20\d\d/.test(c.textContent.trim())));
        return all.map((e) => e.textContent.trim().replace(/\s+/g, " ")).join(" | ");
      });
      const seen = new Set([await readout()]);
      const initial = await readout();
      if (mode === "keyboard") {
        for (let i = 0; i < 25; i++) {
          await page.keyboard.press("Tab");
          await page.waitForTimeout(120);
          seen.add(await readout());
          for (const k of ["ArrowDown", "ArrowRight"]) { await page.keyboard.press(k); await page.waitForTimeout(120); seen.add(await readout()); }
        }
      } else {
        // Sweep the page's middle band where the chart is: every 12px across, every 10px down
        const box = await page.evaluate(() => { const h = document.documentElement.scrollHeight; return { w: innerWidth, h }; });
        for (let y = 60; y < Math.min(box.h, 900); y += 10) {
          for (let x = 20; x < box.w - 20; x += 12) {
            if (mode === "mouse") await page.mouse.move(x, y);
            else await page.touchscreen.tap(x, y);
          }
          seen.add(await readout());
        }
      }
      const cities = CITIES.filter((c) => [...seen].some((s) => s.startsWith(c + ":")));
      result[mode] = { initial, citiesReached: cities };
      await ctx.close();
    }
    if (step !== "step-6-readout") {
      // Year buttons: click "2024" and read the page's text before and after
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      await page.route("**/*", async (route) => {
        const u = route.request().url();
        if (u.startsWith("http://127.0.0.1")) return route.continue();
        const got = await serveCdn(u).catch(() => null);
        if (got) return route.fulfill({ status: got.status, contentType: got.type ?? "text/plain", body: got.body, headers: { "access-control-allow-origin": "*", ...(got.headers ?? {}) } });
        try { return route.fulfill({ response: await route.fetch({ timeout: 8000 }) }); } catch { return route.abort(); }
      });
      await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: "load" });
      await page.waitForTimeout(2000);
      const before = await page.screenshot();
      await page.getByRole("button", { name: "2024" }).first().click().catch(() => {});
      await page.waitForTimeout(150);
      const mid = await page.screenshot();
      await page.waitForTimeout(1500);
      const after = await page.screenshot();
      result.yearSwitch = { changed: !before.equals(after), movingAt150ms: !mid.equals(after) };
      await ctx.close();
    }
    out[lib][step] = result;
    server.close();
  }
}
await browser.close();
console.log(JSON.stringify(out, null, 1));
