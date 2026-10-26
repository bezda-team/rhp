// Missing data: null, undefined, NaN and infinite numbers are never drawn as 0. Blocks draw nothing, a Line or an
// Area breaks at a missing point, the helpers leave missing values out, sortBy puts them last, a value that comes back
// jumps instead of moving from where it was, and a keyed chart that is sorted and filtered keeps each slat's tooltip on
// its own bar. In Node (the helpers and the server's HTML) and in the three engines.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium, firefox, webkit } from "playwright";
import { page as bundle, ssrServer } from "../scripts/bundle.mjs";
import { extent, nice, stackUp, shares, running, summary, bins, density, sortBy } from "../src/data.js";

const CITIES = ["Pune", "Lima", "Oslo", "Kyiv", "Rome", "Baku", "Doha", "Quito"].map((city) => ({ city }));

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rhp-missing-"));
const here = path.dirname(fileURLToPath(import.meta.url));

// The helpers
assert.deepEqual(extent([1, null, 3, NaN, undefined, Infinity, -Infinity]), [1, 3]);
assert.deepEqual(nice(...extent([null, NaN])), nice(0, 1));
assert.deepEqual(stackUp([5, null, 4, NaN, -2]), { from: [0, null, 5, null, 0], to: [5, null, 9, null, -2] });
assert.deepEqual(shares([1, null, 1, NaN]), [50, null, 50, null]);
assert.deepEqual(running([100, null, -30]), { from: [0, null, 100], to: [100, null, 70] });
const box = summary([1, 2, null, 3, NaN, 4, undefined]);
assert.deepEqual([box.min, box.median, box.mean, box.max], [1, 2.5, 2.5, 4]);
assert.deepEqual(bins([1, null, 2, NaN, 9], { count: 3 }).tally, [2, 0, 1]);
assert.deepEqual(density([2, null, 4, NaN, 6], { points: 5 }), density([2, 4, 6], { points: 5 }));
const order = (values, direction) => {
  const positions = sortBy((d) => d, direction)(values, values.map((_, i) => i));
  return values.map((v, i) => [positions[i], v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
};
assert.deepEqual(order([2, null, 1, NaN, 3, undefined], "asc"), [1, 2, 3, null, NaN, undefined]);
assert.deepEqual(order([2, null, 1, NaN, 3, undefined], "desc"), [3, 2, 1, null, NaN, undefined]);
console.log("ok node: the helpers leave missing values out, and sortBy puts them last both ways");

// The server's HTML: the block with a missing value is marked, the edge label is not, and the line is in two pieces
await ssrServer(path.join(here, "missing-server.jsx"), path.join(dir, "server.mjs"));
const html = (await import(pathToFileURL(path.join(dir, "server.mjs")).href)).html();
const tags = (name) => html.match(new RegExp(`<div [^>]*class="(?:[^"]* )?${name}(?: [^"]*)?"[^>]*>`, "g"));
assert.deepEqual(tags("bar").map((tag) => tag.includes("data-rhp-missing")), [true, false]);
assert.deepEqual(tags("label").map((tag) => tag.includes("data-rhp-missing")), [true, false]);
assert.deepEqual(tags("name").map((tag) => tag.includes("data-rhp-missing")), [false, false]);
assert.deepEqual(html.match(/class="rhp-stroke" d="[^"]*"/g).map((d) => d.match(/M/g).length), [2, 2]);
console.log("ok node: a server marks blocks with missing values and breaks lines at missing points");

await bundle(path.join(here, "missing.jsx"), path.join(dir, "case.js"));
fs.writeFileSync(path.join(dir, "index.html"), '<!doctype html><meta charset="utf-8"><body><script src="case.js"></script>');
const engines = process.env.BROWSER ? { [process.env.BROWSER]: { chromium, firefox, webkit }[process.env.BROWSER] } : { chromium, firefox, webkit };

for (const [name, engine] of Object.entries(engines)) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(pathToFileURL(path.join(dir, "index.html")).href);
    const r = await page.evaluate(async () => {
      const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
      const settle = async () => { await frame(); await frame(); };
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const shown = (el) => getComputedStyle(el).display !== "none";
      const out = {};
      await settle();

      // Every block, for each kind of value: which are drawn
      const blocks = (chart, classes) => T.KINDS.map((kind) => {
        const root = document.querySelector(`.${chart} [data-kind="${kind}"]`);
        return [kind, classes.map((c) => shown(root.querySelector("." + c)))];
      });
      out.probe = blocks("probe", ["bar", "from", "spread", "bare", "dot", "tick", "label", "edge", "name", "place", "cell"]);
      out.points = blocks("points", ["dot", "label", "place"]);

      // A value that goes missing and comes back
      const one = document.querySelector(".toggled .one");
      out.toggled = [];
      for (const v of [null, 7, NaN, 3]) {
        T.setToggled(v);
        await settle();
        out.toggled.push(shown(one) ? one.style.getPropertyValue("--rhp-to") : "-");
      }

      // Lines and areas: the pieces of each outline, and the box from the points that are there
      const pieces = (sel, part = "path") => {
        const d = document.querySelector(sel).querySelector(part).getAttribute("d");
        return [(d.match(/M/g) ?? []).length, (d.match(/Z/g) ?? []).length];
      };
      out.lines = ["gap", "null-point", "lone-start", "lone-both", "whole"].map((c) => [c, pieces(".shapes ." + c, ".rhp-stroke")]);
      out.fill = [pieces(".shapes .fill", ".rhp-stroke"), pieces(".shapes .fill", ".rhp-under")];
      const lineBox = document.querySelector(".shapes .box").style;
      out.box = ["--rhp-from", "--rhp-to", "--rhp-cross-from", "--rhp-cross-to"].map((key) => lineBox.getPropertyValue(key));
      out.areas = ["area", "mirror", "peak"].map((c) => [c, pieces(".spread ." + c)]);
      out.whole = document.querySelector(".shapes .whole .rhp-stroke").getAttribute("d");
      out.peak = document.querySelector(".spread .peak").style.getPropertyValue("--rhp-to");

      // An outline whose gap opens and closes jumps to it, as the browser's own transition of d does where it has one
      // (Safari runs it itself), while one that keeps its pieces moves
      const drawnD = (sel) => {
        const el = document.querySelector(sel);
        return CSS.supports("d", "path('M0,0')") ? getComputedStyle(el).d : el.getAttribute("d");
      };
      const moving = ".shapes .moving .rhp-stroke";
      out.moving = [];
      for (const [pts, ref] of [[T.WHOLE, "whole"], [T.MOVED, "moved"], [T.WHOLE, "whole"]]) {
        T.setShapePoints(pts);
        await settle();
        out.moving.push(drawnD(moving) === drawnD(`.shapes .${ref} .rhp-stroke`));
      }
      T.setShapePoints(T.WHOLE.map(([x, y]) => [x, x === 4 ? 9 : y]));
      await settle();
      const early = drawnD(moving);
      await wait(1100);
      out.moving.push(early === drawnD(moving));

      // The JS version: a value that comes back from missing is drawn where it is in its first frame, while a change
      // between two numbers moves
      const js = document.querySelector(".js .one");
      const jsTo = () => parseFloat(js.style.getPropertyValue("--rhp-to"));
      await wait(1100);
      T.setJsValue(null);
      await settle();
      out.jsHidden = !shown(js);
      T.setJsValue(15);
      await settle();
      out.jsBack = [shown(js), jsTo()];
      T.setJsValue(5);
      await settle();
      out.jsMoving = jsTo();

      // The CSS version: the same, with a style read right after each change, as an app measuring something may do
      const css = document.querySelector(".css .one");
      const width = () => css.getBoundingClientRect().width;
      await wait(1100);
      const w10 = width();
      T.setCssValue(null);
      width();
      await settle();
      out.cssHidden = !shown(css);
      T.setCssValue(15);
      width();
      await settle();
      out.cssBack = [shown(css), width() / w10];
      T.setCssValue(5);
      width();
      await settle();
      out.cssMoving = width() / w10;

      // Cities sorted, filtered and given in a new order: missing values last, and each slat's tooltip names the value
      // its bar and label draw
      const cities = async () => {
        await settle();
        const roots = [...document.querySelectorAll(".cities [data-city]")].filter((el) => !el.hidden);
        return roots.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top).map((el) => {
          const bar = el.querySelector(".bar");
          const label = el.querySelector(".value");
          return [el.title, shown(bar) ? bar.style.getPropertyValue("--rhp-to") : "-", shown(label) ? label.textContent : "-"];
        });
      };
      out.cities = [await cities()];
      T.setDirection("asc");
      out.cities.push(await cities());
      T.setRows(T.CITIES.filter((c) => !["Oslo", "Lima"].includes(c.city)));
      out.cities.push(await cities());
      T.setRows(T.CITIES.slice().reverse().map((c) => (c.city === "Pune" ? { ...c, v: null } : c.city === "Kyiv" ? { ...c, v: 9 } : c)));
      out.cities.push(await cities());
      return out;
    });

    const missingKinds = ["null", "undefined", "NaN", "Infinity", "-Infinity"];
    for (const [kind, drawn] of r.probe) {
      const gone = missingKinds.includes(kind);
      assert.deepEqual(drawn, [!gone, !gone, !gone, true, !gone, !gone, !gone, true, true, !gone, !gone], `${name}: blocks for ${kind}`);
    }
    for (const [kind, drawn] of r.points) assert.deepEqual(drawn, Array(3).fill(!missingKinds.includes(kind)), `${name}: cross values for ${kind}`);
    assert.deepEqual(r.toggled, ["-", "7", "-", "3"]);
    assert.deepEqual(r.lines, [["gap", [2, 0]], ["null-point", [2, 0]], ["lone-start", [1, 0]], ["lone-both", [0, 0]], ["whole", [1, 0]]]);
    assert.deepEqual(r.fill, [[2, 0], [2, 2]]);
    assert.deepEqual(r.box, ["1", "3", "2", "8"]);
    assert.deepEqual(r.areas, [["area", [2, 2]], ["mirror", [2, 2]], ["peak", [1, 1]]]);
    assert.equal(r.peak, "3");
    assert.deepEqual(r.moving, [true, true, true, false]);
    assert.equal(r.jsHidden, true);
    assert.deepEqual(r.jsBack, [true, 15]);
    assert.ok(r.jsMoving > 5 && r.jsMoving < 15, `${name}: a JS move between numbers is under way (${r.jsMoving})`);
    assert.equal(r.cssHidden, true);
    assert.equal(r.cssBack[0], true);
    assert.ok(Math.abs(r.cssBack[1] - 1.5) < 0.01, `${name}: a bar back from missing is drawn at its value (${r.cssBack[1]} of 1.5)`);
    assert.ok(r.cssMoving > 0.51 && r.cssMoving < 1.49, `${name}: a CSS move between numbers is under way (${r.cssMoving})`);
    // Each slat's tooltip names what its bar and label draw, numbers sorted, missing values after them
    const sets = [CITIES.map((c) => c.city), CITIES.map((c) => c.city), CITIES.map((c) => c.city).filter((c) => !["Oslo", "Lima"].includes(c)),
      CITIES.map((c) => c.city)];
    r.cities.forEach((slats, i) => {
      const values = slats.map(([title, bar, label]) => {
        const said = title.split(": ")[1];
        assert.deepEqual([bar, label], said === "no data" ? ["-", "-"] : [said, said], `${name}: state ${i}, ${title}`);
        return said === "no data" ? null : Number(said);
      });
      const numbers = values.filter((v) => v !== null);
      assert.deepEqual(values, [...numbers, ...Array(values.length - numbers.length).fill(null)], `${name}: state ${i}, missing values last`);
      assert.deepEqual(numbers, numbers.slice().sort((a, b) => (i ? a - b : b - a)), `${name}: state ${i}, sorted`);
      assert.deepEqual(slats.map(([title]) => title.split(":")[0]).sort(), sets[i].slice().sort(), `${name}: state ${i}, slats`);
    });
    assert.deepEqual(r.cities[3].map(([title]) => title).slice(0, 5), ["Quito: 0", "Doha: 3", "Kyiv: 9", "Oslo: 12", "Rome: 18"]);
    assert.deepEqual(errors, []);
    console.log(`ok ${name}: blocks with missing values draw nothing, outlines break at gaps, values come back without moving, tooltips match`);
  } finally {
    await browser.close();
  }
}
