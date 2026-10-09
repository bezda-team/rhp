// Checks that the article draws what data/vocabulary.json says: every rank, name and number in the ranking (both views,
// every era), each bar's length, every rapper's breakdown, and the two charts about everyone.
//   node site.mjs build && node check-page.mjs [url]
// The build by default; a URL checks a copy served elsewhere (the rhp site's).
// Uses the repository's Playwright. Prints each difference, and exits with 1 when there is one.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "../../node_modules/playwright/index.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(root, "data/vocabulary.json"), "utf8"));
const artists = data.artists.filter((a) => a.albums.length);
const byName = new Map(artists.map((a) => [a.name, a]));
const number = new Intl.NumberFormat("en-US");
const problems = [];
let checked = 0;

function same(label, ours, page) {
  checked++;
  if (JSON.stringify(ours) !== JSON.stringify(page)) problems.push(`${label}: data ${JSON.stringify(ours)}, page ${JSON.stringify(page)}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
page.on("pageerror", (e) => problems.push("page error: " + e.message));
await page.goto(process.argv[2] ?? pathToFileURL(join(root, "dist/vocabulary.html")).href, { waitUntil: "load" });
await page.waitForTimeout(500);

// The ranking's slats as drawn: rank, name, number, and where the bar ends, in screen order
const slats = () => page.evaluate(() => {
  const plot = document.querySelector(".ranking .rhp-plot");
  const box = plot.getBoundingClientRect();
  return [...plot.querySelectorAll(":scope > [data-name]")].filter((el) => !el.hidden)
    .map((el) => {
      const spines = [...el.querySelectorAll(".spine")].map((s) => s.getBoundingClientRect());
      return {
        top: el.getBoundingClientRect().top,
        name: el.dataset.name,
        rank: el.querySelector(".rank")?.textContent.trim(),
        value: el.querySelector(".value, .edge-value")?.textContent.trim(),
        // Where the bar ends
        end: spines.length ? (Math.max(...spines.map((r) => r.right)) - box.left) / box.width : null,
      };
    })
    .sort((a, b) => a.top - b.top);
});
// The scale's ends, from the chart's own variables
const scaleOf = () => page.evaluate(() => {
  const chart = getComputedStyle(document.querySelector(".ranking .rhp-chart"));
  return [+chart.getPropertyValue("--rhp-min"), +chart.getPropertyValue("--rhp-max")];
});
const press = async (name) => {
  await page.getByRole("button", { name, exact: true }).click();
  await page.waitForTimeout(150);
};

async function ranking(view, value, era) {

  const expected = artists.filter((a) => (era === "All" || a.era === era) && value(a) != null).sort((a, b) => value(b) - value(a));
  const drawn = await slats();
  const [min, max] = await scaleOf();
  same(`${view}, ${era}: number of rappers`, expected.length, drawn.length);

  for (const [i, a] of expected.entries()) {
    const d = drawn[i] ?? {};
    same(`${view}, ${era}, place ${i + 1}: name`, a.name, d.name);
    same(`${view}, ${era}, ${a.name}: rank`, String(i + 1), d.rank);
    same(`${view}, ${era}, ${a.name}: number`, number.format(value(a)), d.value);
    // The bar ends at its value on the scale, within a pixel and a half
    const off = Math.abs(d.end - (value(a) - min) / (max - min)) * 860;
    checked++;
    if (!(off < 1.5)) problems.push(`${view}, ${era}, ${a.name}: the mark is ${off.toFixed(1)}px from its value`);
  }
}

await page.getByRole("button", { name: /Show all/ }).click();
await page.waitForTimeout(150);

for (const [view, value] of [["Every album", (a) => a.unique], [/Per 35,000/, (a) => a.sample?.mean ?? null]]) {
  await page.getByRole("button", { name: view }).click();
  await page.waitForTimeout(150);

  for (const [label, era] of [["All", "All"], ["’80s", "1980s"], ["’90s", "1990s"], ["’00s", "2000s"], ["’10s", "2010s"]]) {
    await press(label);
    await ranking(String(view), value, era);
  }
}

await page.getByRole("button", { name: "Every album" }).click();
await press("All");

// Every rapper's breakdown
for (const a of artists) {
  await page.locator(`.ranking [data-name="${a.name.replace(/"/g, '\\"')}"]`).first().click({ position: { x: 30, y: 8 } });
  await page.waitForTimeout(60);
  const sheet = await page.evaluate(() => {
    const s = document.querySelector(".sheet");
    if (!s) return null;
    return {
      name: s.querySelector("h3")?.textContent,
      stats: [...s.querySelectorAll(".stat b")].map((b) => b.textContent),
      albums: [...s.querySelectorAll(".album")].map((el) => ({
        title: el.querySelector(".title")?.firstChild?.textContent,
        year: el.querySelector(".title small")?.textContent,
        plus: el.querySelector(".plus")?.textContent,
      })),
      lexicon: [...s.querySelectorAll(".lexicon li")].map((li) => [li.querySelector("dfn").textContent, li.querySelector("span").textContent]),
      dots: s.querySelectorAll(".end").length,
      pips: s.querySelectorAll(".pip").length,
    };
  });
  if (!sheet) {
    problems.push(`${a.name}: the breakdown did not open`);
    continue;
  }

  same(`${a.name}: breakdown name`, a.name, sheet.name);
  same(`${a.name}: stats`, [number.format(a.unique), a.sample ? number.format(a.sample.mean) : "–", number.format(a.pudding), number.format(a.words)], sheet.stats);
  same(`${a.name}: albums`, a.albums.map((al) => ({ title: al.title, year: String(al.year), plus: `+${number.format(al.new)}` })), sheet.albums);
  same(`${a.name}: words only they used`, a.signature.map(([w, n]) => [w, `×${n}`]), sheet.lexicon);
  same(`${a.name}: album dots`, a.albums.length, sheet.dots);
  same(`${a.name}: density dots`, a.albums.filter((al) => al.density != null).length, sheet.pips);
  await page.locator(".sheet .close").click();
  await page.waitForTimeout(40);
}

// What each album adds
const albumNumbers = await page.evaluate(() => [...document.querySelectorAll(".albums .number")].map((el) => ({
  n: el.querySelector(".n")?.firstChild?.textContent,
  v: el.querySelector(".v")?.textContent,
  share: el.querySelector(".n small")?.textContent,
})));
const ordinal = (n) => n + (["th", "st", "nd", "rd"][(n % 100 >> 3) ^ 1 && n % 10] || "th");
same("album numbers", data.field.byAlbum.map((b) => ({ n: ordinal(b.album), v: number.format(b.new), share: `${Math.round(b.share * 100)}% new` })), albumNumbers);

// The eras: one dot per rapper with a count per 35,000 words, in their era
const dots = await page.evaluate(() => [...document.querySelectorAll(".rhp-chart")].at(-1).querySelectorAll(".who[data-name]").length);
same("era dots", artists.filter((a) => a.sample).length, dots);

await browser.close();
console.log(`${checked} values compared between the page and vocabulary.json.`);

if (problems.length) {
  console.log(`${problems.length} differences:`);

  for (const p of problems.slice(0, 100)) {
    console.log("  " + p);
  }

  process.exit(1);
}

console.log("No differences.");
