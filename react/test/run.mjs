// node react/test/run.mjs: checks what rhp-react does (test/core.jsx), in Chromium, or BROWSER=webkit / firefox.
// The checks follow rhp's own (test/run.mjs) where rhp-react should do what rhp does, and add React's own.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { build } from "esbuild";
import { chromium, webkit, firefox } from "playwright";
import { options } from "../build.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const RHP = path.resolve(here, "../..");
const at = (f) => path.join(here, f);
fs.mkdirSync(at("out"), { recursive: true });
await build({ ...options, banner: {}, external: [], platform: "browser", format: "iife", minify: true, entryPoints: [at("core.jsx")], outfile: at("out/core.js"),
  define: { "process.env.NODE_ENV": '"production"' }, nodePaths: [path.join(RHP, "node_modules")] });
fs.writeFileSync(at("out/core.html"), `<!doctype html><html><head><meta charset=utf-8></head><body><script src="core.js"></script></body></html>`);

let failed = 0;
const check = (name, got, want) => {
  const ok = typeof want === "function" ? want(got) : JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `: got ${JSON.stringify(got)}, want ${typeof want === "function" ? want.toString() : JSON.stringify(want)}`}`);
};

const ENGINE = process.env.BROWSER ?? "chromium";
const browser = await { chromium, webkit, firefox }[ENGINE].launch();
console.log(`in ${ENGINE}`);
setTimeout(() => { console.log("FAIL the checks took over 10 minutes"); process.exit(1); }, 10 * 60 * 1000).unref();
const p = await browser.newPage({ viewport: { width: 900, height: 900 } });
p.setDefaultTimeout(30000);
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await p.goto("file://" + at("out/core.html"));
await p.waitForTimeout(400);

// Rows with an identity, in the JS version
const names = (sel) => p.evaluate((sel) => [...document.querySelectorAll(sel)].map((e) => e.dataset.name), sel);
await p.evaluate(() => { window.cK = document.querySelector('.keyed > [data-name="C"]'); T.seen.keyed = []; T.seen.plain = []; T.setRows([{ name: "A", v: 10 }, { name: "C", v: 30 }]); });
await p.waitForTimeout(600);
check("rowKey: a removed row takes its slat with it", await names(".keyed > *"), ["A", "C"]);
check("rowKey: the next row keeps its element", await p.evaluate(() => document.querySelector('.keyed > [data-name="C"]') === window.cK), true);
check("rowKey: the next row doesn't animate from the removed row's value", await p.evaluate(() => [...new Set(T.seen.keyed)]), ["A:10", "C:30"]);
check("the longest list sets the slat count", await p.evaluate(() => document.querySelectorAll(".cnt").length), 5);
check("data that arrives later draws", await p.evaluate(() => (T.setLate([3, 4, 5]), document.querySelectorAll(".late").length)), 3);
const hid = () => p.evaluate(() => [...document.querySelectorAll(".hid")].map((e) => e.dataset.n + (e.hidden ? "(hidden)" : "@" + e.style.getPropertyValue("--rhp-position"))).join(" "));
check("order: null hides a row", await hid(), "a@2 b(hidden) c@0 d@1");
await p.evaluate(() => T.setPos([0, 1, 2, 3]));
check("order: positions change", await hid(), "a@0 b@1 c@2 d@3");
const c0 = await p.evaluate(() => T.computed);
await p.evaluate(() => T.setVals([5, 70, 9])); await p.waitForTimeout(50);
check("a function group of its own (hoisted) runs again for the one row whose values changed", (await p.evaluate(() => T.computed)) - c0, 1);
check("computed values reach the blocks", await p.evaluate(() => [...document.querySelectorAll(".cmp .rhp-label")].map((e) => e.textContent).join(",")), "10,140,18");
check("reorder=move puts the DOM in display order", await p.evaluate(() => [...document.querySelectorAll(".mv")].map((e) => e.textContent).join("")), "bca");
check("sortBy keeps ties in data order", await p.evaluate(() => [...document.querySelectorAll(".tie")].map((e) => e.dataset.n + "@" + e.style.getPropertyValue("--rhp-position")).join(" ")), "a@1 b@2 c@0 d@3");
await p.evaluate(() => T.setRows([{ name: "A", v: NaN }, { name: "C", v: 30 }])); await p.waitForTimeout(700);
check("a NaN value doesn't keep the page clock running", await p.evaluate(async () => { const a = T.framesDrawn(); await new Promise((r) => setTimeout(r, 500)); return T.framesDrawn() - a; }), 0);

// Scale
const ticks = () => p.evaluate(() => [...document.querySelectorAll(".sc .tk")].map((e) => [+e.dataset.at, +e.dataset.next, e.dataset.end]));
check("Scale: the Chart's scale in steps of 5, its ends included, with next, first and last", await ticks(),
  [[0, 5, "first"], [5, 10, ""], [10, 15, ""], [15, 20, ""], [20, 25, ""], [25, 27, ""], [27, 27, "last"]]);
check("Scale: the Chart draws no axis of its own; one without a Scale does", await p.evaluate(() => [document.querySelectorAll(".sc .rhp-axis").length, document.querySelectorAll(".nosc .rhp-axis").length]), [0, 1]);
await p.evaluate(() => { window.t25 = document.querySelector('.sc .tk[data-at="25"]'); T.setTop(30); });
check("Scale: a new max moves the ticks, and a tick keeps its slat", [(await ticks()).map((t) => t[0]).join(" "), await p.evaluate(() => document.querySelector('.sc .tk[data-at="25"]') === window.t25)], ["0 5 10 15 20 25 30", true]);

// Slat CSS
check("restyle: a slat type's slats restyle in place, a type made with the same CSS keeps its look, and no sheet is added", await p.evaluate(() => {
  const el = document.querySelector(".rs .r:not(.twin)"), twin = document.querySelector(".rs .twin"), n = document.adoptedStyleSheets.length;
  T.restyle(T.Red, ".r { color: rgb(0, 0, 255); }");
  return [getComputedStyle(el).color, document.querySelector(".rs .r:not(.twin)") === el, getComputedStyle(twin).color, document.adoptedStyleSheets.length - n];
}), ["rgb(0, 0, 255)", true, "rgb(255, 0, 0)", 0]);
check(":horizontal and :vertical match a slat root and what is inside it", await p.evaluate(() => [".or-h .o", ".or-v .o", ".or-h .inner", ".or-v .inner"].map((q) => getComputedStyle(document.querySelector(q)).color)),
  ["rgb(0, 128, 0)", "rgb(0, 0, 128)", "rgb(0, 128, 0)", "rgb(1, 2, 3)"]);
check("--rhp-end-radius rounds a bar's value end, also for a bar that runs backward", await p.evaluate(() => [".or-h", ".or-v"].flatMap((c) =>
  [...document.querySelectorAll(c + " .b")].map((b) => { const s = getComputedStyle(b); return [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius].join(" "); }))),
  ["0px 7px 7px 0px", "7px 0px 0px 7px", "7px 7px 0px 0px", "0px 0px 7px 7px"]);
check("--rhp-toward-end points a gradient at the value end", await p.evaluate(() => [".or-h", ".or-v"].flatMap((c) =>
  [...document.querySelectorAll(c + " .b")].map((b) => getComputedStyle(b).backgroundImage.match(/to \w+/)?.[0] ?? "to bottom"))), ["to right", "to left", "to top", "to bottom"]);
check("--rhp-gap leaves room at a bar's from side", await p.evaluate(() => [".or-h", ".or-v"].flatMap((c) => {
  const plot = document.querySelector(c + " .rhp-plot").getBoundingClientRect(), [a, b] = [...document.querySelectorAll(c + " .b")].map((e) => e.getBoundingClientRect());
  return c === ".or-h" ? [Math.round(a.left - plot.left), Math.round(plot.right - b.right)] : [Math.round(plot.bottom - a.bottom), Math.round(b.top - plot.top)];
})), [3, 3, 3, 3]);
check("a block's style that changes (an object, another, none) keeps the block's own variables and size, on every kind of block; and with a value", await p.evaluate(async () => {
  const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const els = [".sty-bar", ".sty-spread", ".sty-label", ".sty-area", ".sty-line"].map((q) => document.querySelector(".styled " + q));
  const own = (el) => [...el.style].filter((k) => k.startsWith("--rhp-")).sort().map((k) => k + ":" + el.style.getPropertyValue(k)).join(";");
  const look = () => els.map((el) => [own(el), Math.round(el.getBoundingClientRect().width)]);
  const first = look(), steps = [];
  for (const st of [{ "--n": "2" }, { "--n": "3", "--m": "1" }, undefined, { "--n": "4" }]) {
    T.setBlockStyle(st); await frames();
    steps.push([JSON.stringify(look()) === JSON.stringify(first), els[0].style.getPropertyValue("--n").trim(), els[0].style.getPropertyValue("--m").trim()]);
  }
  T.setBlockStyle({ "--n": "5" }); T.setStyledV(8); await frames();
  return [steps, [["--rhp-to", 0], ["--rhp-to", 1], ["--rhp-at", 2], ["--rhp-to", 3], ["--rhp-to", 4]].map(([k, i]) => els[i].style.getPropertyValue(k)).concat(els[0].style.getPropertyValue("--n").trim())];
}), [[[true, "2", ""], [true, "3", "1"], [true, "", ""], [true, "4", ""]], ["8", "8", "8", "8", "8", "5"]]);
check("an axis format can return elements", await p.evaluate(() => [...document.querySelectorAll(".kept .rhp-gridline .fmt")].map((e) => e.textContent).join(" ")), "0 5 10");

// Cross scale, heights and aspect
check("cross: a Dot sits at its x on the scale and its y on the cross scale, and a Label with it, each way", await p.evaluate(() => ["h", "v"].map((o) => {
  const body = document.querySelector(`.xy-${o} .rhp-body`).getBoundingClientRect();
  const at = (e) => { const b = e.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2;
    return o === "h" ? [(x - body.left) / body.width, (body.bottom - y) / body.height] : [(body.bottom - y) / body.height, (x - body.left) / body.width]; };
  const r = (v) => Math.round(v * 100) / 100;
  return [...document.querySelectorAll(`.xy-${o} .pt`)].map((e) => at(e).map(r)).concat([[...document.querySelectorAll(`.xy-${o} .pl`)].every((l, i) => Math.abs(at(l)[1] - [0, 0.5, 1][i]) < 0.03)]);
})), [[[0, 0], [0.5, 0.5], [1, 1], true], [[0, 0], [0.5, 0.5], [1, 1], true]]);
check("cross: a Line's box spans its points on both scales, and the chart draws the cross axis' ticks", await p.evaluate(() => ["h", "v"].map((o) => {
  const body = document.querySelector(`.xy-${o} .rhp-body`).getBoundingClientRect(), line = document.querySelector(`.xy-${o} .tl`).getBoundingClientRect();
  const cross = [...document.querySelectorAll(`.xy-${o} .rhp-axis[data-rhp-cross] .rhp-gridline`)].map((g) => g.textContent);
  return [Math.round(line.width - body.width), Math.round(line.height - body.height), cross];
})), [[0, 0, ["0", "50", "100"]], [0, 0, ["0", "50", "100"]]]);
check("a horizontal chart with a height fits rows without a thickness; without one, rows are 32px; a thickness stays", await p.evaluate(() =>
  [".fits .fit", ".grows .fit", ".keeps .fix"].map((q) => Math.round(document.querySelector(q).getBoundingClientRect().height))), [50, 32, 20]);
const ratios = () => p.evaluate(() => ["v", "h"].map((c) => { const r = document.querySelector(".asp-" + c).getBoundingClientRect(); return +(r.width / r.height).toFixed(3); }));
check("aspect: the whole chart keeps its width over its height, room and axis included", await ratios(), [2, 2]);
await p.evaluate(() => { document.querySelector(".asp").style.width = "260px"; });
await p.waitForTimeout(100);
check("aspect: and keeps it at another width", await ratios(), [2, 2]);
check("aspect: what doesn't go with it gets one warning each", await p.evaluate(async () => {
  const seen = []; const warn = console.warn; console.warn = (m) => seen.push(m);
  T.setAsked(true); await new Promise((r) => setTimeout(r, 50));
  console.warn = warn; return seen.filter((m) => /aspect/.test(m)).length;
}), 3);
check("aspect: it wins over height, a flat chart's rows with a thickness keep it, and one that isn't a number is left out", await p.evaluate(() => {
  const ratio = (q) => { const r = document.querySelector(q).getBoundingClientRect(); return +(r.width / r.height).toFixed(3); };
  return [ratio(".asp-both"), ratio(".asp-thick"), [...document.querySelectorAll(".asp-thick .fix")].map((r) => Math.round(r.getBoundingClientRect().height)),
    document.querySelector(".asp-bad").hasAttribute("data-rhp-aspect")];
}), [4, 2, [20, 20], false]);
check("Poster: its markup, its look added to its class, and any other prop on the figure", await p.evaluate(() => {
  const f = document.querySelector("figure.pst"), b = document.querySelector("figure.pst-bare");
  return [f.className, ...[".kicker", ".headline", ".dek", ".note"].map((q) => f.querySelector(q)?.textContent), f.dataset.x, !!f.querySelector(".rhp-chart"),
    b.className, !!b.querySelector(".note")];
}), ["poster test pst", "K", "T", "D", "N", "y", true, "poster pst-bare", false]);

// static
const still = () => p.evaluate(() => [...document.querySelectorAll(".st .sr")].map((e) => e.dataset.n + e.querySelector(".rhp-label").textContent + "@" + e.style.getPropertyValue("--rhp-position") + ":" + e.querySelectorAll(".sd").length).join(" "));
check("static: rows are drawn sorted, nested Plots included", await still(), "a5@1:2 b9@0:2");
const stillEls = await p.evaluate(() => (window.stA = document.querySelector('.st .sr[data-n="a"]'), true));
await p.evaluate(() => T.setStill([12, 3])); await p.waitForTimeout(50);
check("static: when the Plot's data changes, its rows are drawn again (as new elements, so nothing transitions)",
  [await still(), await p.evaluate(() => !window.stA.isConnected)], ["a12@0:2 b3@1:2", stillEls]);

// When changes are written
const bar = () => document.querySelector(".paced .rhp-bar").style.getPropertyValue("--rhp-to");
check("a change from a timer is written in the next frame, before it paints", await p.evaluate(async (bar) => {
  const read = new Function("return (" + bar + ")()");
  await new Promise((r) => setTimeout(r, 50)); T.setPaced(2); const now = read();
  await new Promise((r) => requestAnimationFrame(r)); return [now, read()];
}, bar.toString()), ["1", "2"]);
check("a change made in the app's own frame is written in that frame (after the first)", await p.evaluate(async (bar) => {
  const read = new Function("return (" + bar + ")()"), late = [];
  await new Promise((done) => { let v = 10; const f = () => { if (v > 10 && read() !== String(v - 1)) late.push(v - 1); if (v > 20) return done(); T.setPaced(v++); requestAnimationFrame(f); }; requestAnimationFrame(f); });
  return late.slice(1);
}, bar.toString()), []);
check("drawing(): a value set in the app's own frame callback reaches the bar in that frame", await p.evaluate(async (bar) => {
  const read = new Function("return (" + bar + ")()");
  return new Promise((r) => requestAnimationFrame(() => { T.drawing(() => T.setPaced(77)); r(read()); }));
}, bar.toString()), "77");

// Keyboard
const keys = (q) => p.evaluate((q) => [[...document.querySelectorAll(q + " .rhp-plot > *")].map((e) => e.dataset.n + e.tabIndex).join(" "),
  document.activeElement.dataset?.n ?? document.activeElement.className], q);
const press = async (...list) => {
  const went = [];
  for (const key of list) {
    await p.keyboard.press(key);
    went.push(await p.evaluate(() => document.activeElement.dataset?.n ?? document.activeElement.className));
  }
  return went;
};
check("keyboard: Tab stops at one row, the first shown, and a Plot without `keyboard` gives its rows no tabindex",
  [await keys(".kb-slide"), await p.evaluate(() => document.querySelector(".paced .rhp-plot > *").hasAttribute("tabindex"))], [["a0 b-1 c-1", ""], false]);
await p.focus(".kb-before");
check("keyboard: Tab reaches the tab stop, the arrow keys go to the row shown after or before it, Home and End to the ends",
  await press("Tab", "ArrowDown", "ArrowRight", "ArrowDown", "Home", "End", "ArrowUp", "ArrowLeft", "ArrowDown"), ["a", "c", "b", "b", "a", "b", "c", "a", "c"]);
check("keyboard: Tab then stops at the row focused last", await keys(".kb-slide"), ["a-1 b-1 c0", "c"]);
await p.focus(".kb-slide [data-n=c] .kbi");
check("keyboard: an arrow key in a field inside a row stays in the field", [await press("ArrowDown"), (await keys(".kb-slide"))[0]], [["kbi"], "a-1 b-1 c0"]);
await p.focus(".kb-slide [data-n=c]");
await p.evaluate(() => T.setKbSlide([1, 2, 3]));
check("keyboard: sorted again, the row keeps its focus, and the keys follow the new order", [await keys(".kb-slide"), await press("ArrowDown")], [["a-1 b-1 c0", "c"], ["b"]]);
await p.focus(".kb-move [data-n=b]");
await p.evaluate(() => T.setKbMove([{ n: "a", v: 1 }, { n: "b", v: 3 }, { n: "c", v: 2 }]));
check("keyboard: a row moved in the page keeps its focus", await keys(".kb-move"), ["b0 c-1 a-1", "b"]);
await p.evaluate(() => T.setKbMove([{ n: "a", v: 1 }, { n: "c", v: 2 }]));
check("keyboard: when the row with focus is removed, the first row shown takes it", await keys(".kb-move"), ["c0 a-1", "c"]);
await p.focus(".kb-refill [data-n=a]");
await p.evaluate(() => T.setKbRefill([1, 2, 3]));
check("keyboard: a row that refills another slot takes its focus there", await keys(".kb-refill"), ["c-1 b-1 a0", "a"]);
// A static Plot draws a row anew when its data changes: c's does here
await p.focus(".kb-still [data-n=c]");
const drawnAgain = await p.evaluate(() => {
  const before = document.activeElement;
  T.setKbStill([1, 4, 3]);
  return document.activeElement !== before && !before.isConnected;
});
check("keyboard: a static Plot's row keeps its focus when it is drawn again, and the keys move the tab stop",
  [drawnAgain, await keys(".kb-still"), await press("ArrowUp"), (await keys(".kb-still"))[0]], [true, ["a-1 b-1 c0", "c"], ["b"], "a-1 b0 c-1"]);

// One element for the row the reader is on
const tip = () => p.evaluate(() => { const t = document.querySelectorAll(".one-tip"); return [t.length, t[0]?.closest("[data-row]")?.dataset.n ?? null]; });
check("one element: no row draws a tip until the reader is on it", await tip(), [0, null]);
await p.hover(".one [data-n=b] .rhp-bar");
check("one element: the row under the pointer draws it, and it is the only one in the page", await tip(), [1, "b"]);
const drawn = await p.evaluate(() => T.drawn);
await p.hover(".one [data-n=c] .rhp-bar");
check("one element: moving to the next row draws those two rows again, not all of them", [await tip(), (await p.evaluate(() => T.drawn)) - drawn], [[1, "c"], 2]);
await p.hover(".one [data-n=a] .one-name");
check("one element: an edge label in the gutter counts as pointing at its row", await tip(), [1, "a"]);
await p.mouse.move(0, 0);
check("one element: the pointer leaving the chart takes it away", await tip(), [0, null]);
await p.focus(".one [data-n=b]");
check("one element: focus draws it too, so a keyboard reader gets the same tip", await tip(), [1, "b"]);
check("one element: the arrow keys move it", [await press("ArrowDown"), await tip()], [["c"], [1, "c"]]);
await p.evaluate(() => document.activeElement.blur());
check("one element: focus leaving takes it away", await tip(), [0, null]);

// Shapes and outlines
const clip = (q) => p.evaluate((q) => getComputedStyle(document.querySelector(q)).clipPath, q);
check("shape: a block wears it as a clip, in px where it was written in px", await clip(".shape-h .sh"), (v) => /^polygon/.test(v) && v.includes("26px") && v.split(",").length === 5);
check("shape: the same shape turns with the chart", await Promise.all([clip(".shape-h .sh"), clip(".shape-v .sh")]), ([h, v]) => h !== v && v.includes("26px") && v.split(",").length === 5);
check("shape: a bar that runs backward wears it the other way round", [await clip(".shape-h .shb") !== await clip(".shape-h .sh"), (await clip(".shape-h .shb")).includes("26px")], [true, true]);
check("smooth: Area joins its points with curves, and without it with lines", await p.evaluate(() => [
  document.querySelector(".shape-h .sm path").getAttribute("d").includes("C"), document.querySelector(".shape-h .st path").getAttribute("d").includes("C")]), [true, false]);
const outlines = (chart = ".outline-css") => p.evaluate((chart) => [".oa path", ".ol .rhp-stroke"].map((q) => {
  const b = document.querySelector(chart + " " + q).getBBox();
  return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)];
}), chart);
const until = async (read, want) => {
  let got = await read();
  for (const end = Date.now() + 3000; JSON.stringify(got) !== JSON.stringify(want) && Date.now() < end; got = await read()) await p.waitForTimeout(50);
  return got;
};
const twoFrames = () => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const before = await outlines();
await p.evaluate(() => T.setOutline([[0, 4], [5, 1], [10, 3]]));
await p.waitForTimeout(500);
const midway = await outlines();
const after = await until(outlines, await outlines(".outline-end"));
check("outline: halfway through the CSS version's transition, an Area and a Line are between their two outlines", midway.map((m, k) => [before[k], after[k]].every((end) => end.join() !== m.join())), [true, true]);
check("outline: and they end on the outline a chart drawn from the new data has", after, await outlines(".outline-end"));
const jsPaths = await p.evaluate(() => [".oa path", ".ol .rhp-stroke"].map((q) => getComputedStyle(document.querySelector(".outline-js " + q)).transitionProperty));
check("outline: the JS version gives a path no CSS transition of d: rhp's count moves the outline", jsPaths.map((t) => t.split(", ").includes("d")), [false, false]);
check("outline: and a slat's own transition on a path, for interaction, still runs in the JS version", jsPaths[0], "fill");
await p.evaluate(() => T.setOutlineO("vertical"));
await twoFrames();
const soon = await outlines();
await p.waitForTimeout(1100);
check("outline: turning the chart draws the turned outline at once", [soon.join() !== after.join(), soon.join() === (await outlines()).join()], [true, true]);
const tall = () => p.evaluate(() => Math.round(document.querySelector(".outline-retarget .ra path").getBBox().height));
const start = await tall();
await p.evaluate(() => T.setRetarget(8));
await p.waitForTimeout(500);
const sent = await p.evaluate(async () => {
  const path = document.querySelector(".outline-retarget .ra path");
  T.setRetarget(4);
  const heights = [];
  for (const end = performance.now() + 1400; performance.now() < end; ) {
    await new Promise((r) => requestAnimationFrame(r));
    heights.push(Math.round(path.getBBox().height));
  }
  return heights;
});
check("outline: a change mid-way starts a new transition from where the outline is, as CSS does",
  [start, sent[0] > 400 && sent[0] < 800, Math.max(...sent) - sent[0] <= 5, await until(tall, 400)], [200, true, true, 400]);

// Place
const spot = (chart) => p.evaluate((chart) => {
  const el = document.querySelector(chart + " .spot"), track = el.closest(".rhp-plot").getBoundingClientRect();
  const box = el.getBoundingClientRect(), child = el.querySelector("i").getBoundingClientRect(), cs = getComputedStyle(el);
  return { size: [Math.round(box.width), Math.round(box.height)], paint: cs.backgroundColor,
    alongTrack: Math.round(((chart === ".spot-v" ? track.bottom - box.bottom : box.left - track.left) / (chart === ".spot-v" ? track.height : track.width)) * 100),
    acrossTrack: Math.round(((chart === ".spot-v" ? box.left - track.left : track.bottom - box.bottom) / (chart === ".spot-v" ? track.width : track.height)) * 100),
    childOn: Math.abs(child.left - box.left) < 1 && Math.abs(child.top - box.top) < 1 };
}, chart);
check("Place: no size, nothing drawn, and it sits at its value with what it holds", await spot(".spot-h"), { size: [0, 0], paint: "rgba(0, 0, 0, 0)", alongTrack: 40, acrossTrack: 50, childOn: true });
check("Place: the same in a vertical chart", await spot(".spot-v"), { size: [0, 0], paint: "rgba(0, 0, 0, 0)", alongTrack: 40, acrossTrack: 50, childOn: true });
check("Place: on a cross scale it sits at its cross value across the band", (await spot(".spot-x")).acrossTrack, 25);

// What is React's own: which slats React draws again
const renders = () => p.evaluate(() => ({ ...T.renders }));
let r0 = await renders();
await p.evaluate(() => T.setCounted([10, 25, 30]));
let r1 = await renders();
const delta = (a, b, keys) => keys.map((k) => (b[k] ?? 0) - (a[k] ?? 0));
check("React: a new value in one row draws that row's slat again and no other", delta(r0, r1, ["c-a", "c-b", "c-c"]), [0, 1, 0]);
r0 = r1;
await p.evaluate(() => T.setUnrelated(1));
r1 = await renders();
check("React: the app drawn again with the same data draws no slat again", delta(r0, r1, ["c-a", "c-b", "c-c", "u-a", "u-b", "u-c", "p-a", "p-b", "p-c"]), [0, 0, 0, 0, 0, 0, 0, 0, 0]);
r0 = r1;
await p.evaluate(() => T.setSorted(true));
r1 = await renders();
check("React: sorting moves every row, and draws again only the slats that read their position",
  [delta(r0, r1, ["u-a", "u-b", "u-c"]), delta(r0, r1, ["p-a", "p-b", "p-c"]), await p.evaluate(() => [...document.querySelectorAll(".unread .rhp-plot > *")].map((e) => e.style.getPropertyValue("--rhp-position")).join(" ")),
    await p.evaluate(() => [...document.querySelectorAll(".positioned .rhp-plot > *")].map((e) => e.dataset.pos).join(" "))],
  [[0, 0, 0], [1, 0, 1], "2 1 0", "2 1 0"]);
check("React: a new value writes its own bar's style and no other, and no element is made again", await p.evaluate(async () => {
  // The writes of the checks before (in the next frame) are done first
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const bars = [...document.querySelectorAll(".counted .rhp-bar")], seen = [];
  const mo = new MutationObserver((ms) => ms.forEach((m) => seen.push(m.target.closest("[data-n]").dataset.n)));
  document.querySelectorAll(".counted .rhp-plot > *").forEach((r) => mo.observe(r, { attributes: true, subtree: true, attributeFilter: ["style"] }));
  T.setCounted([10, 25, 31]);
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r)));
  mo.disconnect();
  return { same: bars.every((b, i) => b === document.querySelectorAll(".counted .rhp-bar")[i]), rows: [...new Set(seen)] };
}), { same: true, rows: ["c"] });
const hooks0 = await p.evaluate(() => T.hooks);
await p.evaluate(() => document.querySelector('.hooked [data-n="b"]').click());
check("React: a slat can hold state of its own with hooks", await p.evaluate(() => [...document.querySelectorAll(".hooked .rhp-plot > *")].map((e) => e.dataset.n + e.hasAttribute("data-on")).join(" ")), "afalse btrue");
check("React: and only that slat is drawn again for it", (await p.evaluate(() => T.hooks)) - hooks0, 1);
await p.evaluate(() => T.setPeople([{ name: "B", v: 2 }, { name: "C", v: 3 }]));
check("React: d.index and d.position read later (in a handler) are the row's latest, after a row before it is removed",
  await p.evaluate(() => (document.querySelector('.clicked [data-n="C"]').click(), T.clicked)), "1:0");

// StrictMode draws each component twice and runs each effect twice as it mounts
check("React: in StrictMode the chart is drawn once, sorted, with one tab stop", await p.evaluate(() =>
  [document.querySelectorAll(".strict .rhp-chart").length, [...document.querySelectorAll(".strict .rhp-plot > *")].map((e) => e.dataset.n + "@" + e.style.getPropertyValue("--rhp-position") + ":" + e.tabIndex).join(" ")]),
  [1, "a@1:-1 b@0:0"]);
await p.evaluate(() => T.setStrictV([9, 2]));
check("React: and it follows its data", await p.evaluate(() => [...document.querySelectorAll(".strict .rhp-plot > *")].map((e) => e.dataset.n + "@" + e.style.getPropertyValue("--rhp-position") + ":" + e.tabIndex).join(" ")),
  "a@0:0 b@1:-1");

// useAnimated
const moving = await p.evaluate(async () => {
  T.setMoving(100);
  const seen = [];
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => requestAnimationFrame(r));
    seen.push(+document.querySelector(".moving").dataset.v);
  }
  return seen;
});
check("useAnimated: an app's own value moves to its new value over its duration, frame by frame, and ends on it",
  [moving.some((v) => v > 0 && v < 100), moving.every((v, i) => i === 0 || v >= moving[i - 1]), moving.at(-1)], [true, true, 100]);

// The JS version frame by frame: a race where c passes a and b, and e passes d, while b's value and the others' stay
const race = await p.evaluate(async () => {
  const read = () => [...document.querySelectorAll(".race .rhp-plot > *")].map((e) => ({
    n: e.dataset.n,
    p: +e.style.getPropertyValue("--rhp-position"),
    bar: +e.querySelector(".rhp-bar").style.getPropertyValue("--rhp-to"),
    label: +e.querySelector(".rv").textContent,
  }));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const before = { ...T.renders };
  T.setRace([50, 40, 90, 5, 25]);
  const frames = [];
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => requestAnimationFrame(r));
    frames.push(read());
  }
  const drawn = Object.fromEntries(["a", "b", "c", "d", "e"].map((k) => [k, (T.renders["race-" + k] ?? 0) - (before["race-" + k] ?? 0)]));
  return { frames, drawn };
});
const last = race.frames.at(-1);
check("JS version: in every frame a slat's label shows the value its bar is at (both read the same in-between value)",
  race.frames.every((f) => f.every((r) => Math.abs(r.label - r.bar) <= 0.5)), true);
check("JS version: in every frame the rows are in one place each", race.frames.every((f) => f.map((r) => r.p).sort().join() === "0,1,2,3,4"), true);
check("JS version: values move between frames, and the race ends on the new values in their new order",
  [race.frames.some((f) => f.find((r) => r.n === "c").bar > 30 && f.find((r) => r.n === "c").bar < 90), last.map((r) => r.n + r.bar + "@" + r.p).join(" ")],
  [true, "a50@1 b40@2 c90@0 d5@4 e25@3"]);
check("JS version: only the slats whose values move are drawn in its frames", [race.drawn.a, race.drawn.b, race.drawn.c > 5, race.drawn.d > 5, race.drawn.e > 5], [0, 0, true, true, true]);

// What a screen reader gets, from Chromium's accessibility tree
if (ENGINE === "chromium") {
  const cdp = await p.context().newCDPSession(p);
  const tree = async (sel) => {
    const { nodes } = await cdp.send("Accessibility.getFullAXTree");
    const byId = new Map(nodes.map((n) => [n.nodeId, n]));
    const { node: { backendNodeId } } = await cdp.send("DOM.describeNode", { objectId: (await cdp.send("Runtime.evaluate", { expression: `document.querySelector(${JSON.stringify(sel)})` })).result.objectId });
    const text = (n) => (n.ignored ? (n.childIds ?? []).map((c) => text(byId.get(c))).join(" ") : n.role?.value === "StaticText" ? n.name?.value ?? "" : (n.childIds ?? []).map((c) => text(byId.get(c))).join(" ")).replace(/\s+/g, " ").trim();
    const root = nodes.find((n) => n.backendDOMNodeId === backendNodeId);
    // Ignored and generic nodes (plain divs) are skipped, and their children take their place
    const walk = (n) => n.ignored || n.role?.value === "generic" ? (n.childIds ?? []).flatMap((c) => walk(byId.get(c))) : [n];
    const shown = (n) => (n.childIds ?? []).flatMap((c) => walk(byId.get(c)));
    return { root, text, shown };
  };
  const { root, text, shown } = await tree(".a11y-fruit");
  const list = shown(root).find((n) => n.role.value === "list");
  check("a11y: a chart with a label is a figure with that name", [root.role.value, root.name?.value], ["figure", "Fruit sold this week"]);
  check("a11y: a Plot is a list of its rows, in the order they are shown", list && shown(list).map((n) => [n.role.value, text(n)]),
    [["listitem", "Kiwis 22"], ["listitem", "Bananas 18"], ["listitem", "Apples 12"], ["listitem", "Cherries 7"]]);
  check("a11y: the axis numbers are left out", text(root).includes("30"), false);
  await p.evaluate(() => T.setA11ySold([1, 2, 30, 3])); await p.waitForTimeout(500);
  const again = await tree(".a11y-fruit"), list2 = again.shown(again.root).find((n) => n.role.value === "list");
  check("a11y: a new order reads in its new order", again.shown(list2).map((n) => again.text(n).split(" ")[0]), ["Cherries", "Kiwis", "Bananas", "Apples"]);
  const keyed = await tree(".a11y-keyed"), kl = keyed.shown(keyed.root).find((n) => n.role.value === "list");
  check("a11y: keyed rows read in the order shown too", keyed.shown(kl).map((n) => keyed.text(n).split(" ")[0]), ["Apples", "Cherries", "Bananas"]);
  const own = await tree(".a11y-own");
  check("a11y: a slat root with its own role keeps it, and its own id", [own.shown(own.shown(own.root)[0])[0]?.role.value, await p.evaluate(() => !!document.getElementById("own-0"))], ["group", true]);
  const heat = await tree(".a11y-heat");
  const heatList = heat.shown(heat.root).find((n) => n.role.value === "list");
  check("a11y: a Plot inside a row, and an overlap Plot, are not lists of their own", [
    heat.shown(heatList)[0] && heat.shown(heat.shown(heatList)[0]).some((n) => n.role.value === "list"),
    own.shown(own.root).filter((n) => n.role.value === "list").length], [false, 1]);
  const sc = await tree(".a11y-scale");
  check("a11y: a Scale is left out", sc.text(sc.root).includes("20"), false);
  check("a11y: a chart with no name is no figure", sc.root.role.value !== "figure", true);
} else {
  console.log("skip what a screen reader gets (Chromium only)");
}

check("no page errors", errors, []);
console.log(failed ? `${failed} failed` : "all passed");
await browser.close();
process.exit(failed ? 1 : 0);
