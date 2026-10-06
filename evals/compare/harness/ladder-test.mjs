// Check the ladder through mouse, touch and keyboard input, without reading a library's internals.
// node harness/ladder-test.mjs results/ladder [library,library] > results/ladder-interactions.json
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { serveCdn } from "./render.mjs";

export const VALUES = { Vienna: [72, 70], Oslo: [61, 64], Lisbon: [48, 57], Prague: [55, 52], Dublin: [39, 45] };
const LIBS = ["rhp", "apexcharts", "chartjs", "d3"];
const STEPS = ["step-6-readout", "step-7-animate", "step-8-pictogram"];

const readout = (page) => page.evaluate(() => {
  const pattern = /^(Vienna|Oslo|Lisbon|Prague|Dublin): \d+% in 20\d\d/;
  return [...document.querySelectorAll("body *")].filter((e) =>
    pattern.test(e.textContent.trim()) && e.checkVisibility() &&
    ![...e.children].some((c) => pattern.test(c.textContent.trim()))
  ).map((e) => e.textContent.trim().replace(/\s+/g, " "));
});

export async function chartBox(page) {
  return page.evaluate(() => {
    const boxes = [...document.querySelectorAll(".rhp-chart, svg, canvas")]
      .map((e) => e.getBoundingClientRect()).filter((r) => r.width > 100 && r.height > 60)
      .sort((a, b) => b.width * b.height - a.width * a.height);
    if (!boxes.length) throw new Error("No visible chart");
    const r = boxes[0];
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
}

// Require several equal chart frames, allowing both CSS and canvas animations to finish.
export async function settledChart(page, box) {
  let previous, equal = 0;
  const until = Date.now() + 10000;
  while (Date.now() < until) {
    const shot = await page.screenshot({ clip: box });
    equal = previous?.equals(shot) ? equal + 1 : 0;
    if (equal >= 3) return shot;
    previous = shot;
    await page.waitForTimeout(100);
  }
  throw new Error("Chart did not settle within 10 seconds");
}

export async function probeReadouts(page, mode, year = 2025) {
  const initial = await readout(page), seen = new Set();
  const expected = Object.fromEntries(Object.entries(VALUES).map(([city, values]) =>
    [city, `${city}: ${values[year - 2024]}% in ${year}`]));
  const reached = () => Object.keys(VALUES).filter((city) => [...seen].some((s) => s.startsWith(expected[city])));
  const sample = async () => { for (const text of await readout(page)) seen.add(text); };
  if (mode === "keyboard") {
    for (let i = 0; i < 20 && reached().length < 5; i++) {
      await page.keyboard.press("Tab");
      await sample();
      for (let j = 0; j < 5; j++) {
        await page.keyboard.press("ArrowDown");
        await sample();
        await page.keyboard.press("ArrowRight");
        await sample();
      }
    }
  } else {
    const box = await chartBox(page);
    // Read after EVERY position, before moving off a mark resets a hover readout.
    // Try columns in the shorter bars first, then the rest for marks with gaps.
    for (const fraction of [0.25, 0.15, 0.4, 0.55, 0.7, 0.85]) {
      if (reached().length === 5) break;
      for (let y = box.y + 4; y < box.y + box.height; y += 6) {
        const x = box.x + box.width * fraction;
        if (mode === "mouse") await page.mouse.move(x, y);
        else await page.touchscreen.tap(x, y);
        await sample();
        if (reached().length === 5) break;
      }
    }
  }
  const citiesReached = reached();
  return { initial, citiesReached, readouts: [...seen], passed: citiesReached.length === 5 };
}

export async function probeYear(page) {
  await page.mouse.move(0, 0);
  const box = await chartBox(page);
  const before = await settledChart(page, box);
  await page.getByRole("button", { name: "2024", exact: true }).click();
  await page.mouse.move(0, 0);
  const after = await settledChart(page, box);
  const values2024 = await probeReadouts(page, "mouse", 2024);
  await page.getByRole("button", { name: "2025", exact: true }).click();
  await page.mouse.move(0, 0);
  const restored = await settledChart(page, box);
  const values2025 = await probeReadouts(page, "mouse", 2025);
  const changed = !sameChart(before, after), returned = sameChart(before, restored);
  return { changed, returned, values2024, values2025, passed: changed && returned && values2024.passed && values2025.passed };
}

// Ignore antialiasing and allow 0.1% changed pixels for fractional edge/text rasterization.
// Correct readouts for every city in both years are checked separately.
export function sameChart(a, b) {
  const left = PNG.sync.read(a), right = PNG.sync.read(b);
  if (left.width !== right.width || left.height !== right.height) return false;
  const different = pixelmatch(left.data, right.data, null, left.width, left.height);
  return different <= left.width * left.height * 0.001;
}

async function checkFile(browser, file) {
  const server = http.createServer((q, r) => r.writeHead(200, { "content-type": "text/html" }).end(fs.readFileSync(file)));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const result = {};
  try {
    for (const mode of ["mouse", "touch", "keyboard"]) {
      const context = await browser.newContext({ viewport: mode === "touch" ? { width: 390, height: 844 } : { width: 1280, height: 900 }, hasTouch: mode === "touch", isMobile: mode === "touch" });
      const errors = [], cdn = [];
      try {
        const page = await context.newPage();
        page.on("pageerror", (e) => errors.push(e.message));
        page.on("requestfailed", (q) => errors.push(`${q.url()}: ${q.failure()?.errorText}`));
        await page.route("**/*", async (route) => {
          const url = route.request().url();
          if (url.startsWith("http://127.0.0.1")) return route.continue();
          try {
            const got = await serveCdn(url);
            if (got) {
              cdn.push({ url, source: got.source, status: got.status });
              if (got.status !== 200) errors.push(`${url}: HTTP ${got.status}`);
              return await route.fulfill({ status: got.status, contentType: got.type ?? "text/plain", body: got.body, headers: { "access-control-allow-origin": "*", ...(got.headers ?? {}) } });
            }
            return await route.fulfill({ response: await route.fetch({ timeout: 8000 }) });
          } catch (error) {
            errors.push(`${url}: ${error.message}`);
            await route.abort();
          }
        });
        await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        await settledChart(page, await chartBox(page));
        const sideways = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
        result[mode] = { ...await probeReadouts(page, mode), sideways, errors, cdn };
        if (mode === "mouse" && !file.endsWith("step-6-readout.html")) result.yearSwitch = await probeYear(page);
        result[mode].passed &&= !sideways && errors.length === 0;
      } catch (error) {
        result[mode] = { passed: false, errors: [...errors, error.message], cdn };
      } finally {
        await context.close();
      }
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  result.passed = Object.values(result).every((r) => r.passed);
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [root, only] = process.argv.slice(2);
  if (!root) throw new Error("Usage: node harness/ladder-test.mjs <ladder dir> [library,library]");
  const libraries = only ? only.split(",") : LIBS;
  if (libraries.some((lib) => !LIBS.includes(lib))) throw new Error(`Unknown library: ${only}`);
  const browser = await chromium.launch({ executablePath: process.env.RENDER_BROWSER });
  const out = { date: new Date().toISOString(), browser: await browser.version(), libs: {} };
  try {
    for (const lib of libraries) {
      out.libs[lib] = {};
      for (const step of STEPS) {
        const file = path.join(root, lib, `${step}.html`);
        const result = fs.existsSync(file) ? await checkFile(browser, file) : { passed: false, errors: ["Missing example"] };
        out.libs[lib][step] = result;
        console.error(`${result.passed ? "PASS" : "FAIL"} ${lib}/${step}`);
        if (!result.passed) process.exitCode = 1;
      }
    }
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify(out, null, 2));
}
