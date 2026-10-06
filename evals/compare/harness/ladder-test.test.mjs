import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium } from "playwright-core";
import { PNG } from "pngjs";
import { VALUES, probeReadouts, probeYear, sameChart } from "./ladder-test.mjs";

let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.RENDER_BROWSER }); });
after(async () => { await browser?.close(); });

async function fixture({ frozen = false, keyboard = true } = {}) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await page.setContent(`<!doctype html><meta name="viewport" content="width=device-width">
    <button>2024</button><button>2025</button><p id="readout"></p>
    <svg width="340" height="240"></svg><script>
      const values = ${JSON.stringify(VALUES)}, cities = Object.keys(values);
      let year = 2025;
      const show = (city = 'Lisbon') => document.querySelector('#readout').textContent = city + ': ' + values[city][year - 2024] + '% in ' + year;
      const svg = document.querySelector('svg');
      for (const [i, city] of cities.entries()) {
        const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        for (const [name, value] of Object.entries({ x: 10, y: 10 + i * 42, width: values[city][1] * 3, height: 26, fill: '#c2410c' })) bar.setAttribute(name, value);
        bar.onpointerenter = bar.onpointerdown = () => show(city);
        bar.onpointerleave = () => show();
        if (${keyboard}) {
          bar.setAttribute('tabindex', 0);
          bar.onfocus = () => show(city);
          bar.onkeydown = e => {
            if (e.key.startsWith('Arrow')) { e.preventDefault(); (bar.nextElementSibling || svg.firstElementChild).focus(); }
          };
        }
        svg.append(bar);
      }
      document.querySelectorAll('button').forEach(button => button.onclick = () => {
        year = +button.textContent;
        button.style.background = '#ffa';
        if (!${frozen}) [...svg.children].forEach((bar, i) => bar.setAttribute('width', values[cities[i]][year - 2024] * 3));
        show();
      });
      show();
    </script>`);
  return page;
}

test("samples a hover readout before leaving its mark, and reaches every city by touch and keyboard", async () => {
  for (const mode of ["mouse", "touch", "keyboard"]) {
    const page = await fixture();
    try {
      const result = await probeReadouts(page, mode);
      assert.equal(result.passed, true, JSON.stringify(result));
    } finally { await page.close(); }
  }
});

test("requires keyboard access instead of counting the initial readout as a pass", async () => {
  const page = await fixture({ keyboard: false });
  try { assert.equal((await probeReadouts(page, "keyboard")).passed, false); }
  finally { await page.close(); }
});

test("year switching requires changed chart pixels and every city's correct values in both years", async () => {
  for (const frozen of [false, true]) {
    const page = await fixture({ frozen });
    try {
      const result = await probeYear(page);
      assert.equal(result.values2024.passed, true);
      assert.equal(result.values2025.passed, true);
      assert.equal(result.changed, !frozen);
      assert.equal(result.passed, !frozen);
    } finally { await page.close(); }
  }
});

test("a missing year control fails instead of silently ignoring the click", async () => {
  const page = await fixture();
  try {
    await page.getByRole("button", { name: "2024" }).evaluate((el) => el.remove());
    page.setDefaultTimeout(200);
    await assert.rejects(probeYear(page), /Timeout/);
  } finally { await page.close(); }
});

test("pixel comparison tolerates edge antialiasing but detects a moved mark", () => {
  const a = new PNG({ width: 100, height: 100 });
  a.data.fill(255);
  const b = PNG.sync.read(PNG.sync.write(a));
  b.data[0] -= 7;
  assert.equal(sameChart(PNG.sync.write(a), PNG.sync.write(b)), true);
  for (let i = 0; i < 400; i += 4) b.data[i] = 0;
  assert.equal(sameChart(PNG.sync.write(a), PNG.sync.write(b)), false);
});
