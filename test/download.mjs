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
    const page = await browser.newPage({ viewport: { width, height: 720 } });
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
