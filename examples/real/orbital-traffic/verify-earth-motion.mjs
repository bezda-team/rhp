import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, firefox, webkit } from '../../../node_modules/playwright/index.mjs';
import { decode } from '../../../mcp/src/check/png.js';

const output = path.resolve(process.argv[2] ?? '/private/tmp/orbital-earth-motion');
fs.mkdirSync(output, { recursive: true });
const base = 'http://127.0.0.1:4398/examples/real/orbital-traffic/';
const files = ['orbital-retro-rotating-earth', 'orbital-retro-animated'];
const results = [];
const printedEarth = decode(fs.readFileSync(new URL('./assets/earth-print-night-motion.png', import.meta.url)));
const rim = image => {
  let top = image.height;
  for (let y = 0; y < image.height && top === image.height; y++) for (let x = 0; x < image.width; x++) {
    if (image.data[(y * image.width + x) * 4 + 3] > 127) { top = y; break; }
  }
  const spans = [.05, .1, .15, .2, .25].map(fraction => {
    const y = Math.round(image.height * fraction);
    let left = image.width, right = 0;
    for (let x = 0; x < image.width; x++) if (image.data[(y * image.width + x) * 4 + 3] > 127) {
      left = Math.min(left, x); right = Math.max(right, x);
    }
    return [left / image.width, right / image.width];
  });
  return { top: top / image.height, spans };
};
const printedRim = rim(printedEarth);
const readout = page => page.locator('.readout').innerText();
const setRotation = (page, value) => page.locator('.earth-rotation').evaluate((input, value) => {
  input.value = String(value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}, value);
const angle = page => page.locator('.earth-rotation').inputValue();
const setSpeed = (page, value) => page.locator('.earth-speed').evaluate((input, value) => {
  input.value = String(value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}, value);
const measureSpeed = page => page.evaluate(() => new Promise(resolve => {
  const input = document.querySelector('.earth-rotation');
  let start, first;
  const sample = now => {
    if (start === undefined) { start = now; first = Number(input.value); }
    if (now - start >= 1000) resolve((Number(input.value) - first) / ((now - start) / 1000));
    else requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
}));
const ready = async page => {
  await page.waitForSelector('.poster[data-earth-ready="true"]');
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(image => image.decode()));
    await new Promise(requestAnimationFrame);
  });
};
function difference(first, second, limitY = Infinity) {
  assert.ok(Math.abs(first.width - second.width) <= 2 && Math.abs(first.height - second.height) <= 2, 'PNG dimensions match the browser screenshot');
  const width = Math.min(first.width, second.width), height = Math.min(first.height, second.height, limitY);
  let sum = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) for (let c = 0; c < 3; c++) {
    sum += Math.abs(first.data[(y * first.width + x) * 4 + c] - second.data[(y * second.width + x) * 4 + c]);
  }
  return sum / (width * height * 3);
}

for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch();
  try {
    for (const file of files) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2, reducedMotion: 'reduce', acceptDownloads: true });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${base}${file}.html`);
      await ready(page);
      if (file.endsWith('animated')) {
        const canvas = page.locator('canvas.earth');
        const bounds = await canvas.boundingBox();
        assert.ok(Math.abs(bounds.width - bounds.height) < .1, 'The globe is circular in the page');
        const image = decode(Buffer.from((await canvas.evaluate(element => element.toDataURL())).split(',')[1], 'base64'));
        const actual = rim(image);
        assert.ok(Math.abs(actual.top - printedRim.top) < .004, 'The visible horizon matches the illustrated Earth height');
        for (let i = 0; i < actual.spans.length; i++) for (let side = 0; side < 2; side++) {
          assert.ok(Math.abs(actual.spans[i][side] - printedRim.spans[i][side]) < .012, 'The visible cap follows the illustrated Earth curvature');
        }
      }
      const toggle = page.locator('.earth-motion-toggle');
      assert.equal(await toggle.innerText(), 'Play Earth', 'Reduced motion starts paused');
      assert.equal(await page.locator('.readout > .legend').count(), 1, 'Legend occupies the readout name row');
      assert.equal(await page.locator('.readout-name').count(), 0, 'The name row is replaced');
      await page.locator('.legend [data-category="debris"]').click();
      await page.mouse.move(0, 0);
      const selected = await readout(page);
      assert.equal(await page.locator('.readout .legend [data-active="true"]').innerText(), 'Debris');
      assert.match(selected, /7,632/); assert.match(selected, /454/);
      await setSpeed(page, 2);
      assert.equal(await toggle.innerText(), 'Play Earth', 'Adjusting speed preserves the paused state');
      assert.equal(await page.locator('.earth-speed-value').innerText(), '2×');
      assert.equal(await readout(page), selected, 'Adjusting speed preserves the selected category');
      await setSpeed(page, 1);
      await setRotation(page, 0);
      const originalGeometry = await page.locator('.object-row').evaluateAll(rows => rows.map(row => [row.dataset.altitude, row.querySelector('.object-point').style.cssText]));
      const earthTop = await page.locator('.poster').evaluate(poster => {
        const image = poster.querySelector('.earth');
        return (image.getBoundingClientRect().top - poster.getBoundingClientRect().top) * 2;
      });
      await page.evaluate(() => {
        const top = document.querySelector('.poster').getBoundingClientRect().top;
        document.body.style.paddingTop = `${parseFloat(getComputedStyle(document.body).paddingTop) + Math.ceil(top) - top}px`;
      });
      const phase0 = path.join(output, `${name}-${file}-0.png`);
      await page.locator('.poster').screenshot({ path: phase0 });
      await setRotation(page, 90);
      const phase90 = path.join(output, `${name}-${file}-90.png`);
      await page.locator('.poster').screenshot({ path: phase90 });
      const first = decode(fs.readFileSync(phase0)), quarter = decode(fs.readFileSync(phase90));
      assert.ok(difference(first, quarter) > 0.2, 'Turning changes the visible Earth');
      assert.ok(difference(first, quarter, Math.floor(earthTop) - 3) < 0.1, 'Everything above the Earth remains still');
      assert.deepEqual(await page.locator('.object-row').evaluateAll(rows => rows.map(row => [row.dataset.altitude, row.querySelector('.object-point').style.cssText])), originalGeometry);
      assert.equal(await readout(page), selected, 'Seeking preserves chart selection');
      await toggle.click();
      const normalSpeed = await measureSpeed(page);
      await setSpeed(page, 2);
      const doubleSpeed = await measureSpeed(page);
      assert.ok(normalSpeed > .8 && doubleSpeed > normalSpeed * 1.6 && doubleSpeed < normalSpeed * 2.4, `The speed control changes the actual rotation rate: ${normalSpeed}, ${doubleSpeed}`);
      await toggle.click();
      await setSpeed(page, 1);
      const paused = await angle(page);
      await page.waitForTimeout(180);
      assert.equal(await angle(page), paused, 'Pause holds the current orientation');
      // Offscreen work stops rather than consuming frames below the article.
      await toggle.click();
      await page.evaluate(() => {
        const spacer = document.createElement('div'); spacer.id = 'test-scroll-space'; spacer.style.height = '1500px'; document.body.append(spacer);
        scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(120);
      const offscreen = await angle(page);
      await page.waitForTimeout(180);
      assert.equal(await angle(page), offscreen, 'Offscreen animation stops');
      await page.evaluate(() => { document.getElementById('test-scroll-space').remove(); scrollTo(0, 0); });
      await setRotation(page, 90);
      await page.locator('.poster-fit-toggle').click();
      const fit = await page.locator('.poster').boundingBox();
      await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
      const after = await page.locator('.poster').boundingBox();
      assert.ok(Math.abs(fit.width - after.width) < .1 && Math.abs(fit.height - after.height) < .1, 'Fitted view keeps its size on scroll');
      const download = page.waitForEvent('download', { timeout: 60000 });
      await page.locator('.poster-download').click();
      const pngFile = path.join(output, `${name}-${file}-download.png`);
      await (await download).saveAs(pngFile);
      await page.waitForFunction(() => !document.querySelector('.poster-download').hasAttribute('aria-busy'));
      assert.equal(await readout(page), selected, 'Downloading preserves selection');
      assert.equal(await angle(page), '90', 'Downloading preserves the paused orientation');
      assert.equal(await toggle.innerText(), 'Play Earth', 'Downloading a paused Earth keeps it paused');
      const pngDifference = difference(decode(fs.readFileSync(pngFile)), quarter);
      assert.ok(pngDifference < 7, `The PNG matches the browser, including the Earth: ${pngDifference}`);
      await page.locator('.poster-fit-toggle').click();
      // Export during playback: every captured frame stays fixed, then playback resumes.
      await page.evaluate(() => {
        window.exportSamples = [];
        new MutationObserver(() => {
          if (document.querySelector('.poster-download[aria-busy="true"]')) window.exportSamples.push({
            angle: document.querySelector('.earth-rotation').value,
            controlsDisabled: [...document.querySelectorAll('.earth-motion-controls input,.earth-motion-toggle')].every(input => input.disabled),
          });
        }).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['aria-busy', 'aria-valuetext'] });
      });
      await toggle.click();
      const movingDownload = page.waitForEvent('download', { timeout: 60000 });
      await page.locator('.poster-download').click();
      const movingPath = path.join(output, `${name}-${file}-playing-download.png`);
      await (await movingDownload).saveAs(movingPath);
      await page.waitForFunction(() => !document.querySelector('.poster-download').hasAttribute('aria-busy'));
      const samples = await page.evaluate(() => window.exportSamples);
      assert.ok(samples.length > 0 && samples.every(sample => sample.controlsDisabled), 'Rotation controls are disabled during capture');
      assert.equal(new Set(samples.map(sample => sample.angle)).size, 1, 'The Earth remains frozen throughout capture');
      const captured = Number(samples[0].angle);
      await page.waitForFunction(captured => Number(document.querySelector('.earth-rotation').value) > captured + .3, captured);
      assert.equal(await toggle.innerText(), 'Pause Earth', 'Playing Earth resumes after export');
      assert.equal(await readout(page), selected, 'Automatic pause preserves chart selection');
      await setRotation(page, captured);
      const capturedReference = decode(await page.locator('.poster').screenshot());
      assert.ok(difference(decode(fs.readFileSync(movingPath)), capturedReference) < 7, 'The moving-state PNG contains the captured Earth orientation');
      await page.locator('.footer-summary').click();
      assert.equal(await page.locator('.footer-summary').getAttribute('aria-expanded'), 'true');
      assert.equal(await readout(page), selected);
      await page.locator('.poster').screenshot({ path: path.join(output, `${name}-${file}-expanded.png`) });
      if (name === 'chromium') {
        for (const width of [390, 320]) {
          await page.setViewportSize({ width, height: 844 });
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No mobile horizontal overflow');
          const slider = page.locator('.earth-rotation');
          await slider.focus();
          const before = Number(await slider.inputValue());
          await page.keyboard.press('ArrowRight');
          assert.ok(Number(await slider.inputValue()) > before, 'Keyboard changes orientation');
          const speed = page.locator('.earth-speed');
          await speed.focus();
          const priorSpeed = Number(await speed.inputValue());
          await page.keyboard.press('ArrowRight');
          assert.ok(Number(await speed.inputValue()) > priorSpeed, 'Keyboard changes speed');
          await page.locator('.poster').screenshot({ path: path.join(output, `${file}-phone-${width}.png`) });
        }
      }
      assert.deepEqual(errors, []);
      const result = { browser: name, file, pngDifference, reducedMotion: true, animation: true, pause: true, offscreenPause: true, chartStable: true, selectionPreserved: true, fitStable: true, errors };
      results.push(result);
      console.log(JSON.stringify(result));
      await context.close();
    }
  } finally { await browser.close(); }
}

const browser = await chromium.launch({ args: ['--disable-webgl'] });
try {
  const page = await browser.newPage();
  await page.goto(`${base}${files[1]}.html`);
  await page.waitForSelector('.poster[data-earth-ready="unavailable"]');
  assert.equal(await page.locator('img.earth').isVisible(), true, 'Static Earth remains when WebGL is unavailable');
  assert.match(await page.locator('.earth-motion-status').innerText(), /static Earth/);
  assert.equal(await page.locator('.earth-motion-toggle').isDisabled(), true);
  console.log('WebGL unavailable: static fallback passed');
} finally { await browser.close(); }
fs.writeFileSync(path.join(output, 'validation.json'), JSON.stringify(results, null, 2) + '\n');
console.log(`All Earth-motion checks passed. Screenshots and PNG downloads: ${output}`);
