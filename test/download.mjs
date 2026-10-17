// Exercise real recipe pages and real PNG downloads, with CDN modules served locally for deterministic checks.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium, webkit, firefox } from "playwright";
import { standalone } from "../scripts/bundle.mjs";
import { withPosterDownload } from "../scripts/sync-poster-download.mjs";
import { decode } from "../mcp/src/check/png.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const recipes = path.join(root, "skills/rhp/recipes");
const engine = process.env.BROWSER ?? "chromium";
const out = path.join(root, "test/out/download", engine);
fs.mkdirSync(out, { recursive: true });
await standalone(path.join(root, "src/standalone.js"), path.join(out, "standalone.js"));
const exporter = (await build({ entryPoints: [path.join(root, "node_modules/modern-screenshot/dist/index.mjs")], bundle: true, write: false, format: "esm" })).outputFiles[0].text;
const exportURL = /https:\/\/cdn\.jsdelivr\.net\/npm\/modern-screenshot@4\.7\.0\/\+esm(?:\?.*)?$/;
const browser = await { chromium, webkit, firefox }[engine].launch(engine === "chromium" ? { executablePath: process.env.CHROMIUM } : {});
const settle = page => page.evaluate(async () => {
  await document.fonts.ready;
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);
  await Promise.all(document.getAnimations().filter(animation => animation.effect.getComputedTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
});
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 720 }, hasTouch: engine !== "firefox" });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route(/https:\/\/cdn.jsdelivr.net\/npm\/@bezda\/rhp@[^/]+\/dist\/standalone.js/, route => route.fulfill({ body: fs.readFileSync(path.join(out, "standalone.js")), contentType: "text/javascript" }));
    await page.route(exportURL, route => route.fulfill({ body: exporter, contentType: "text/javascript" }));
    // A real, distinctive font behind a cross-origin stylesheet catches missing font embedding.
    const cors = { "access-control-allow-origin": "*" };
    await page.route("https://fonts.googleapis.com/**", route => route.fulfill({
      body: '@font-face { font-family: "Instrument Serif"; font-style: normal; font-weight: 400; src: url("https://fonts.gstatic.com/download-test.woff2") format("woff2"); }',
      contentType: "text/css", headers: cors,
    }));
    await page.route("https://fonts.gstatic.com/**", route => route.fulfill({
      body: fs.readFileSync(path.join(root, "test/fixtures/fonts/fraunces.woff2")), contentType: "font/woff2", headers: cors,
    }));
    // Top-level await can postpone chart rendering until after the document has loaded.
    const deferredFile = path.join(out, "deferred.html");
    fs.writeFileSync(deferredFile, fs.readFileSync(path.join(recipes, "bar.html"), "utf8").replace(
      /(import \{[^\n]+from "@bezda\/rhp\/standalone";)/,
      "$1\nawait new Promise(resolve => { window.finishChart = resolve; });",
    ));
    await page.goto("file://" + deferredFile);
    assert.equal(await page.locator(".poster").count(), 0, "chart rendering is still waiting after load");
    await page.evaluate(() => window.finishChart());
    await page.getByRole("button", { name: "Download poster as PNG", exact: true }).waitFor();
    console.log(`PASS ${width}px: delayed chart rendering still gets a download control`);
    // A whole-poster average can hide a range bar shifted past its track, so compare the mark strips directly.
    const ranges = path.join(out, "ranges.html");
    fs.writeFileSync(ranges, withPosterDownload(fs.readFileSync(path.join(root, "test/fixtures/download-ranges.html"), "utf8")));
    await page.goto("file://" + ranges);
    await settle(page);
    const strips = await page.locator(".range-row .track").evaluateAll(tracks => {
      const poster = document.querySelector(".poster").getBoundingClientRect();
      return tracks.map(track => {
        const r = track.getBoundingClientRect();
        return {x:r.x - poster.x, y:r.y - poster.y, width:r.width, height:r.height};
      });
    });
    assert.equal(strips.length, 2, "both nonzero-start ranges are rendered");
    const rangeDownload = page.waitForEvent("download");
    await page.getByRole("button", {name:"Download poster as PNG", exact:true}).click();
    const rangePNG = path.join(out, `${width}-ranges.png`);
    await (await rangeDownload).saveAs(rangePNG);
    const actualRange = decode(fs.readFileSync(rangePNG));
    const expectedRange = decode(await page.locator(".poster").screenshot());
    for (const strip of strips) {
      let error = 0, samples = 0;
      for (let y = Math.ceil(strip.y + 2); y < strip.y + strip.height - 2; y++) {
        for (let x = Math.ceil(strip.x); x < strip.x + strip.width; x++) {
          const actual = (y * 2 * actualRange.width + x * 2) * 4;
          const expected = (y * expectedRange.width + x) * 4;
          for (let channel = 0; channel < 3; channel++) {
            error += Math.abs(actualRange.data[actual + channel] - expectedRange.data[expected + channel]);
            samples++;
          }
        }
      }
      assert(error / samples < 3, `range PNG preserves its start, end and containment in the track (mean channel difference ${error / samples})`);
    }
    console.log(`PASS ${width}px: exported range bars match their rendered track positions`);
    for (const file of fs.readdirSync(recipes).filter(file => file.endsWith(".html"))) {
      const source = fs.readFileSync(path.join(recipes, file), "utf8");
      assert.equal(withPosterDownload(source), source, `${file}: generated controls are current and idempotent`);
      await page.goto("file://" + path.join(recipes, file));
      const button = page.getByRole("button", { name: "Download poster as PNG", exact: true });
      await button.waitFor();
      await settle(page);
      const bounds = await page.locator(".poster").boundingBox();
      const control = await button.boundingBox();
      assert(control.y + control.height <= bounds.y, `${file}: control is above the poster`);
      assert(Math.abs(control.x + control.width - bounds.x - bounds.width) < 1, `${file}: control aligns with poster's right edge`);
      assert.equal(await page.locator(".poster .poster-download").count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${file}: no horizontal overflow at ${width}px`);
      if (!["bar.html", "candlestick.html", "donut.html", "dial.html", "silhouettes.html"].includes(file)) continue;
      await page.evaluate(() => window.scrollTo(0, 0));
      const downloadEvent = page.waitForEvent("download");
      // The first poster is exported through the keyboard, the rest by pointer.
      if (file === "bar.html") { await button.focus(); await page.keyboard.press("Enter"); }
      else await button.click();
      const download = await downloadEvent;
      assert.match(download.suggestedFilename(), /\.png$/);
      assert.equal(await download.failure(), null);
      const target = path.join(out, `${width}-${file.replace(".html", ".png")}`);
      await download.saveAs(target);
      const png = decode(fs.readFileSync(target));
      assert(Math.abs(png.width - bounds.width * 2) <= 2, `${file}: export uses full poster width`);
      assert(Math.abs(png.height - bounds.height * 2) <= 2, `${file}: export uses full poster height, including below the viewport`);
      assert(png.data.some((value, i) => i % 4 === 3 && value > 0), `${file}: PNG is not transparent`);
      await page.locator(".poster").screenshot({ path: path.join(out, `${width}-${file.replace(".html", "-poster.png")}`) });
      const screenshot = decode(fs.readFileSync(path.join(out, `${width}-${file.replace(".html", "-poster.png")}`)));
      let difference = 0, samples = 0;
      for (let y = 0; y < screenshot.height; y += 2) for (let x = 0; x < screenshot.width; x += 2) {
        const actual = (Math.floor(y * png.height / screenshot.height) * png.width + Math.floor(x * png.width / screenshot.width)) * 4;
        const expected = (y * screenshot.width + x) * 4;
        for (let channel = 0; channel < 3; channel++) {
          const flattened = png.data[actual + channel] * png.data[actual + 3] / 255 + 255 - png.data[actual + 3];
          difference += Math.abs(flattened - screenshot.data[expected + channel]);
          samples++;
        }
      }
      assert(difference / samples < 12, `${file}: PNG preserves the poster's paper, SVG chart colors and composition (mean channel difference ${difference / samples})`);
      await button.waitFor({ state: "visible" });
      assert.equal(await button.isEnabled(), true);
      console.log(`PASS ${width}px ${file}: actual PNG ${png.width} x ${png.height}`);
    }
    assert.deepEqual(errors, [], "recipe pages have no runtime errors");
    for (const activation of ["pointer", "Enter", "Space", ...(engine !== "firefox" ? ["touch"] : [])]) {
      await page.goto("file://" + path.join(recipes, "bar.html"));
      await page.getByRole("button", { name: "Download poster as PNG", exact: true }).waitFor();
      if (activation === "pointer") await page.locator('.language[data-row="1"]').click();
      else if (activation === "touch") await page.locator('.language[data-row="1"]').tap();
      else {
        // Safari uses Option+Tab to include buttons when full keyboard access is off.
        const next = engine === "webkit" ? "Alt+Tab" : "Tab";
        await page.keyboard.press(next);
        await page.keyboard.press(next);
        await page.keyboard.press("ArrowDown");
      }
      await settle(page);
      assert.equal(await page.locator(".readout strong").innerText(), "Mandarin Chinese");
      const sample = await page.locator('.language[data-row="1"] .bar').evaluate(bar => {
        const bounds = bar.getBoundingClientRect(), poster = bar.closest(".poster").getBoundingClientRect();
        return { x: Math.floor((bounds.x + bounds.width / 2 - poster.x) * 2), y: Math.floor((bounds.y + bounds.height / 2 - poster.y) * 2), color: getComputedStyle(bar).backgroundColor.match(/\d+/g).slice(0, 3).map(Number) };
      });
      await page.evaluate(() => {
        window.outsideDownloadClicks = 0;
        document.addEventListener("click", event => {
          if (!event.target.closest(".poster")) window.outsideDownloadClicks++;
        });
      });
      const button = page.getByRole("button", { name: "Download poster as PNG", exact: true });
      const event = page.waitForEvent("download");
      if (activation === "pointer") await button.click();
      else if (activation === "touch") await button.tap();
      else {
        await page.locator(".headline").hover();
        await page.keyboard.press(engine === "webkit" ? "Alt+Shift+Tab" : "Shift+Tab");
        assert.equal(await button.evaluate(button => document.activeElement === button), true, "Tab reaches the download button from the selected chart item");
        assert.equal(await page.locator(".readout strong").innerText(), "Mandarin Chinese", "moving keyboard focus to download preserves selection");
        await page.keyboard.press(activation);
      }
      const download = await event;
      const target = path.join(out, `${width}-selected-${activation}.png`);
      await download.saveAs(target);
      await page.waitForFunction(() => !document.querySelector('.poster-download').hasAttribute('aria-busy'));
      assert.equal(await page.locator(".readout strong").innerText(), "Mandarin Chinese", `${activation}: downloading preserves selection`);
      assert.equal(await page.evaluate(() => window.outsideDownloadClicks), 0, `${activation}: download does not bubble to outside-click handlers`);
      if (["Enter", "Space"].includes(activation)) {
        assert.equal(await button.evaluate(button => document.activeElement === button), true, "keyboard focus remains on the download button");
        await page.locator(".headline").hover();
        assert.equal(await page.locator(".readout strong").innerText(), "Mandarin Chinese", "pointer return after a completed keyboard download preserves selection");
      }
      const png = decode(fs.readFileSync(target));
      const color = [...png.data.subarray((sample.y * png.width + sample.x) * 4, (sample.y * png.width + sample.x) * 4 + 3)];
      assert(color.every((value, i) => Math.abs(value - sample.color[i]) <= 3), `${activation}: PNG contains the selected bar's accent color`);
      console.log(`PASS ${width}px ${activation}: selection, keyboard focus and exported highlight preserved; no outside click`);
    }
    // The readout must stay selected when the pointer returns after the PNG has finished saving.
    // Checking only at the download event misses the focus loss on a subsequent title/readout move.
    for (const recipe of ["histogram", "dial"]) for (const activation of ["pointer", ...(engine !== "firefox" ? ["touch"] : [])]) {
      await page.goto("file://" + path.join(recipes, `${recipe}.html`));
      const button = page.getByRole("button", { name: "Download poster as PNG", exact: true });
      await button.waitFor();
      const item = page.locator(recipe === "histogram" ? '.column[data-row="30"]' : '.key [data-row="1"]');
      const focusedItem = page.locator(recipe === "histogram" ? '.column[data-row="30"]' : '.act[data-row="1"]');
      const readout = page.locator(recipe === "histogram" ? ".board" : ".hub");
      if (activation === "touch") await item.tap();
      else await item.click();
      await settle(page);
      const selected = await readout.innerText();
      const downloaded = page.waitForEvent("download");
      if (activation === "touch") await button.tap();
      else await button.click();
      assert.equal(await focusedItem.evaluate(item => document.activeElement === item), true, "download activation keeps focus on the selected chart item");
      await (await downloaded).saveAs(path.join(out, `${width}-${recipe}-${activation}.png`));
      await page.waitForFunction(() => !document.querySelector('.poster-download').hasAttribute('aria-busy'));
      if (recipe === "histogram") await readout.hover();
      else {
        await page.locator(".key").hover({ position: { x: 2, y: 2 } });
        await page.locator(".headline").hover();
      }
      await settle(page);
      assert.equal(await readout.innerText(), selected, "returning over the poster after download preserves selection");
      await page.mouse.move(1, 1);
      assert.equal(await readout.innerText(), selected, "leaving the poster after download preserves its focused selection");
      assert.equal(await focusedItem.evaluate(item => document.activeElement === item), true, "pointer download keeps the original chart focus");
      // A deliberate new chart pick still works after export.
      await page.locator(recipe === "histogram" ? '.column[data-row="35"]' : '.key [data-row="3"]').click();
      assert.notEqual(await readout.innerText(), selected);
      console.log(`PASS ${width}px ${recipe} ${activation}: selection survives pointer return after the completed download`);
    }
    // A failed import leaves a visible error and lets the user retry.
    await page.goto("file://" + path.join(recipes, "bar.html"));
    await page.route(exportURL, route => route.abort());
    const button = page.getByRole("button", { name: "Download poster as PNG", exact: true });
    await button.click();
    await page.getByRole("alert").waitFor({ state: "visible" });
    assert.equal(await button.isEnabled(), true);
    await page.unroute(exportURL);
    await page.route(exportURL, route => route.fulfill({ body: exporter, contentType: "text/javascript" }));
    const retried = page.waitForEvent("download");
    await button.click();
    assert.equal(await (await retried).failure(), null, "retry succeeds after the connection recovers");
    if (process.env.RHP_DOCS) {
      const docs = process.env.RHP_DOCS;
      const galleryRecipes = path.join(docs, "public/ai/rhp/recipes");
      const posters = path.join(docs, "public/gallery/posters");
      const galleryPages = [
        ...fs.readdirSync(galleryRecipes).filter(file => file.endsWith(".html")).map(file => path.join(galleryRecipes, file)),
        ...fs.readdirSync(posters).filter(file => fs.existsSync(path.join(posters, file, "index.html"))).map(file => path.join(posters, file, "index.html")),
      ];
      for (const file of galleryPages) {
        await page.goto("file://" + file);
        await page.locator(".recipe-navigation .poster-download").waitFor();
        await settle(page);
        const posterBounds = await page.locator(".poster").boundingBox();
        const downloadButton = page.getByRole("button", { name: "Download poster as PNG", exact: true });
        const buttonBounds = await downloadButton.boundingBox();
        const linkBounds = await page.getByRole("link", { name: "← Gallery" }).boundingBox();
        assert(Math.abs(buttonBounds.y + buttonBounds.height / 2 - linkBounds.y - linkBounds.height / 2) < 1, `${file}: icon and gallery link share a row`);
        assert(Math.abs(buttonBounds.x + buttonBounds.width - posterBounds.x - posterBounds.width) < 1, `${file}: gallery icon aligns with the poster`);
        assert.equal(await page.locator(".poster-download-tools").count(), 0, "gallery has one control row");
        const colors = await page.evaluate(() => [".recipe-navigation a", ".recipe-navigation button"].map(selector => getComputedStyle(document.querySelector(selector)).color));
        assert.equal(colors[0], colors[1], `${file}: icon uses the gallery link's color`);
        if (file === path.join(galleryRecipes, "bar.html") || file === path.join(posters, "world-cities-ranked/index.html")) {
          await page.screenshot({ path: path.join(out, `${width}-gallery-${path.basename(path.dirname(file))}.png`) });
          const downloaded = page.waitForEvent("download");
          await downloadButton.click();
          const result = await downloaded;
          assert.equal(await result.failure(), null);
          const saved = path.join(out, `${width}-gallery-${path.basename(path.dirname(file))}-export.png`);
          await result.saveAs(saved);
          const png = decode(fs.readFileSync(saved));
          assert(Math.abs(png.height - posterBounds.height * 2) <= 2, "gallery download includes the entire poster");
        }
      }
      console.log(`PASS ${width}px: ${galleryPages.length} gallery pages, aligned icons match link colors, PNG downloads work`);
    }
    await page.close();
    console.log(`PASS ${width}px: all 34 recipe controls align, keyboard export works, failed export permits retry`);
  }
} finally {
  await browser.close();
}
