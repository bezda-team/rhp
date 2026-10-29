// Checks the infographic's 50 cards: that every card shows all of its words (nothing clipped by its fixed height or
// pushed past its edge) at six widths, and that clicking a square brings its card to the middle row of the three in
// view (or as near as the ends of the list allow), tinted, in Chromium, WebKit and Firefox, on a desktop and a phone.
// usage: node cards.test.mjs
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../../package.json"));
const playwright = require("playwright");
const url = pathToFileURL(path.join(here, "ai-allowed-infographic.html")).href;
const open = async (browser, width) => {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(url);
  await page.waitForSelector(".rhp-chart");
  await page.evaluate(() => document.fonts.ready);
  return page;
};
const failures = [];

// Every card's words: the text of each part inside the card's padding, and inside the part when the part clips (a
// line's box may pass a clipping edge by its leading, 3px, with its letters inside)
const chromium = await playwright.chromium.launch();
for (const width of [1280, 1024, 768, 390, 360, 320]) {
  const page = await open(chromium, width);
  const found = await page.evaluate(() => [...document.querySelectorAll(".card")].flatMap((card) => {
    const edge = card.getBoundingClientRect().right - parseFloat(getComputedStyle(card).paddingRight);
    const out = [];
    for (const part of card.querySelectorAll("h3, .tag, .stars, blockquote, .src")) {
      const range = document.createRange();
      range.selectNodeContents(part);
      const box = part.getBoundingClientRect();
      const clips = getComputedStyle(part).overflow !== "visible";
      for (const line of [...range.getClientRects()].filter((r) => r.width)) {
        if (line.right > edge + 0.5 || clips && (line.bottom > box.bottom + 3 || line.right > box.right + 0.5)) out.push(`${card.querySelector("h3").textContent}: ${part.className || part.localName} does not fit`);
      }
    }
    return [...new Set(out)];
  }));
  failures.push(...found.map((f) => `${width}px ${f}`));
  await page.close();
}
await chromium.close();

// Clicking a square: a featured project, the first and the last of the rest, one in the middle, then early ones
for (const engine of ["chromium", "webkit", "firefox"]) {
  const browser = await playwright[engine].launch();
  for (const width of [1280, 390]) {
    const page = await open(browser, width);
    for (const rank of [4, 1, 50, 29, 7, 2]) {
      await page.locator(`.unit[data-row="${rank - 1}"]`).click();
      // The list glides there: wait until it has kept still for ten frames
      await page.evaluate(() => new Promise((done) => {
        const list = document.querySelector(".cards");
        let last = -1, still = 0;
        const frame = () => {
          still = list.scrollTop === last ? still + 1 : 0;
          last = list.scrollTop;
          if (still > 10) done();
          else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }));
      const r = await page.evaluate(() => {
        const list = document.querySelector(".cards");
        const on = [...list.children].filter((c) => c.classList.contains("on"));
        const row = on[0].getBoundingClientRect().top - list.getBoundingClientRect().top;
        return {
          tinted: on.length, name: on[0].querySelector("h3").textContent.replace("​", ""), pick: document.querySelector(".pick").textContent,
          row, middle: on[0].offsetHeight + parseFloat(getComputedStyle(list).rowGap),
          top: list.scrollTop === 0, end: Math.abs(list.scrollTop - (list.scrollHeight - list.clientHeight)) < 1,
        };
      });
      const placed = Math.abs(r.row - r.middle) < 1 || r.top && r.row < r.middle || r.end && r.row > r.middle;
      if (r.tinted !== 1 || !r.pick.includes(r.name) || !placed) failures.push(`${engine} ${width}px #${rank}: ${r.tinted} cards tinted, ${r.name}'s at ${Math.round(r.row)}px (the middle row is at ${r.middle}px)`);
    }
    await page.close();
  }
  await browser.close();
}

console.log(failures.length ? failures.join("\n") : "Every card fits, and a click brings its card to the middle row, tinted");
process.exit(failures.length ? 1 : 0);
