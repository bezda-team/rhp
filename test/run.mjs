// npm test: builds the test pages and the gallery, then checks them in Chromium (Playwright).
// CHROMIUM=/path/to/chrome picks the browser; otherwise Playwright's own.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import { chromium } from "playwright";
import { page as bundle } from "../scripts/bundle.mjs";
const here = path.dirname(fileURLToPath(import.meta.url)), at = (f) => path.join(here, f);
fs.mkdirSync(at("out"), { recursive: true });
for (const t of ["core", "cost", "mount"]) {
  await bundle(at(t + ".jsx"), at(`out/${t}.js`));
  fs.writeFileSync(at(`out/${t}.html`), `<!doctype html><html><head><meta charset=utf-8></head><body><script src="${t}.js"></script></body></html>`);
}
execFileSync("node", [path.join(here, "../examples/gallery/make.mjs")], { stdio: "inherit" });
const gallery = "file://" + path.join(here, "../examples/gallery/out/slat-gallery.html");

let failed = 0;
const check = (name, got, want) => {
  const ok = typeof want === "function" ? want(got) : JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `: got ${JSON.stringify(got)}, want ${typeof want === "function" ? want.toString() : JSON.stringify(want)}`}`);
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const open = async (url, opts = {}) => {
  const p = await browser.newPage({ viewport: { width: 900, height: 900 }, ...opts });
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.goto(url);
  await p.waitForTimeout(400);
  return p;
};

// Plot behavior (test/core.jsx)
{
  const p = await open("file://" + at("out/core.html"));
  const names = (sel) => p.evaluate((sel) => [...document.querySelectorAll(sel)].map((e) => e.dataset.name), sel);
  await p.evaluate(() => { window.cK = document.querySelector('.keyed > [data-name="C"]'); T.seen.keyed = []; T.seen.plain = []; T.setRows([{ name: "A", v: 10 }, { name: "C", v: 30 }]); });
  await p.waitForTimeout(600);
  check("key: a removed row takes its slat with it", await names(".keyed > *"), ["A", "C"]);
  check("key: the next row keeps its element", await p.evaluate(() => document.querySelector('.keyed > [data-name="C"]') === window.cK), true);
  check("key: the next row doesn't animate from the removed row's value", await p.evaluate(() => [...new Set(T.seen.keyed)]), ["A:10", "C:30"]);
  check("the longest list sets the slat count", await p.evaluate(() => document.querySelectorAll(".cnt").length), 5);
  check("data that arrives later draws", await p.evaluate(() => (T.setLate([3, 4, 5]), document.querySelectorAll(".late").length)), 3);
  const hid = () => p.evaluate(() => [...document.querySelectorAll(".hid")].map((e) => e.dataset.n + (e.hidden ? "(hidden)" : "@" + e.style.getPropertyValue("--rhp-position"))).join(" "));
  check("order: null hides a row", await hid(), "a@2 b(hidden) c@0 d@1");
  await p.evaluate(() => T.setPos([0, 1, 2, 3]));
  check("order: positions change", await hid(), "a@0 b@1 c@2 d@3");
  const c0 = await p.evaluate(() => T.computed);
  await p.evaluate(() => T.setVals("v", 1, 70)); await p.waitForTimeout(50);
  check("a computed group re-runs once for the one row that changed", (await p.evaluate(() => T.computed)) - c0, 1);
  check("computed values reach the blocks", await p.evaluate(() => [...document.querySelectorAll(".cmp .rhp-label")].map((e) => e.textContent).join(",")), "10,140,18");
  check("reorder=move puts the DOM in display order", await p.evaluate(() => [...document.querySelectorAll(".mv")].map((e) => e.textContent).join("")), "bca");
  check("sortBy keeps ties in data order", await p.evaluate(() => [...document.querySelectorAll(".tie")].map((e) => e.dataset.n + "@" + e.style.getPropertyValue("--rhp-position")).join(" ")), "a@1 b@2 c@0 d@3");
  await p.evaluate(() => T.setRows([{ name: "A", v: NaN }, { name: "C", v: 30 }])); await p.waitForTimeout(700);
  check("a NaN value doesn't keep the page clock running", await p.evaluate(async () => { const a = T.framesDrawn(); await new Promise((r) => setTimeout(r, 500)); return T.framesDrawn() - a; }), 0);
  const ticks = () => p.evaluate(() => [...document.querySelectorAll(".sc .tk")].map((e) => [+e.dataset.at, +e.dataset.next, e.dataset.end]));
  check("Scale: the Chart's scale in steps of 5, its ends included, with next, first and last", await ticks(),
    [[0, 5, "first"], [5, 10, ""], [10, 15, ""], [15, 20, ""], [20, 25, ""], [25, 27, ""], [27, 27, "last"]]);
  check("Scale: the Chart draws no axis of its own; one without a Scale does", await p.evaluate(() => [document.querySelectorAll(".sc .rhp-axis").length, document.querySelectorAll(".nosc .rhp-axis").length]), [0, 1]);
  await p.evaluate(() => { window.t25 = document.querySelector('.sc .tk[data-at="25"]'); T.setTop(30); });
  check("Scale: a new max moves the ticks, and a tick keeps its slat", [(await ticks()).map((t) => t[0]).join(" "), await p.evaluate(() => document.querySelector('.sc .tk[data-at="25"]') === window.t25)], ["0 5 10 15 20 25 30", true]);
  check("no page errors", p.errors, []);
  await p.close();
}

// Update cost (test/cost.jsx): 1,000 slats per Plot, one value changed
{
  const p = await open("file://" + at("out/cost.html"));
  const ms = await p.evaluate(() => T.mount());
  const r = await p.evaluate(async () => {
    const mo = { plain: 0, store: 0 }, plots = document.querySelectorAll(".rhp-plot");
    const watch = (el, k) => new MutationObserver((rs) => (mo[k] += rs.length)).observe(el, { attributes: true, subtree: true, attributeFilter: ["style"] });
    watch(plots[0], "plain"); watch(plots[1], "store");
    T.runs.plain = 0; T.runs.store = 0;
    const next = T.plain().slice(); next[500] = 3; T.setPlain(next);
    T.setSt("v", 500, 3);
    await new Promise((r) => setTimeout(r, 50));
    return { runs: { ...T.runs }, writes: mo };
  });
  check("a plain array replaced: every slat re-runs, one style write", [r.runs.plain, r.writes.plain], [1000, 1]);
  check("a store item set: one slat re-runs, one style write", [r.runs.store, r.writes.store], [1, 1]);
  console.log(`     mount, 2 Plots x 1,000 slats: ${ms.toFixed(1)} ms`);
  await p.close();
}

// Mount cost (test/mount.jsx): 50 charts of 7 slats; and a page's view-transition-name on a slat class
{
  const p = await open("file://" + at("out/mount.html"));
  const ms = await p.evaluate(() => T.mount());
  const vt = await p.evaluate(async () => {
    const s = document.createElement("style");
    s.textContent = ".slat { view-transition-name: card }"; // 350 slat roots with one name: a duplicate aborts the transition
    document.head.append(s);
    const t = document.startViewTransition(() => {});
    try { await t.finished; return "ran"; } catch (e) { return e.message; }
  });
  check("a page's view-transition-name on slat roots doesn't abort the page's view transition", vt, "ran");
  check("no page errors", p.errors, []);
  console.log(`     mount, 50 charts x 7 slats, with style and layout: ${ms.toFixed(1)} ms`);
  await p.close();
}

// The gallery: 20 charts, both orientations, both animation versions, light and dark, desktop and phone
{
  const p = await open(gallery, { viewport: { width: 1280, height: 900 } });
  await p.click("label:has(#motion-js)"); await p.waitForTimeout(200);
  const gaps = () => p.evaluate(() => {
    let worst = 0;
    for (const plot of document.querySelectorAll("#stacked .rhp-plot .rhp-plot")) {
      const r = [...plot.querySelectorAll(".rhp-bar")].map((e) => e.getBoundingClientRect()).filter((b) => b.width).sort((a, b) => a.left - b.left); // hidden (empty) segments aside
      for (let i = 1; i < r.length; i++) worst = Math.max(worst, Math.abs(r[i].left - r[i - 1].right));
    }
    return worst;
  });
  let worst = 0;
  await p.click("#new-data");
  for (let t = 0; t < 12; t++) { await p.waitForTimeout(40); worst = Math.max(worst, await gaps()); }
  check("JS version: stacked segments stay joined while they move (px)", +worst.toFixed(2), (w) => w < 0.5);
  check("no page errors", p.errors, []);
  await p.close();
  for (const scheme of ["light", "dark"]) for (const width of [1280, 390]) for (const motion of ["css", "js"]) {
    const q = await open(gallery, { viewport: { width, height: 900 }, colorScheme: scheme });
    if (motion === "js") { await q.click("label:has(#motion-js)"); await q.waitForTimeout(100); }
    const bad = [];
    for (const o of ["horizontal", "vertical", "horizontal"]) {
      await q.click(`label:has(#orient-${o})`); await q.waitForTimeout(700);
      bad.push(...await q.evaluate((o) => {
        const out = [];
        if (document.documentElement.scrollWidth > innerWidth) out.push(`${o}: page ${document.documentElement.scrollWidth}px wide`);
        for (const ch of document.querySelectorAll(".rhp-chart")) {
          const c = ch.getBoundingClientRect();
          for (const e of ch.querySelectorAll("*")) {
            const b = e.getBoundingClientRect();
            if (!b.width && !b.height) continue;
            // What shows: the box cut by each clipping ancestor inside the chart. A slat may hide what it draws
            // (the dots past their window, a photo zoomed in its circle); only what is left counts.
            let { left, top, right, bottom } = b;
            for (let a = e.parentElement; a !== ch; a = a.parentElement) {
              const s = getComputedStyle(a);
              if (s.overflowX === "visible" && s.overflowY === "visible") continue;
              const k = a.getBoundingClientRect();
              if (s.overflowX !== "visible") { left = Math.max(left, k.left); right = Math.min(right, k.right); }
              if (s.overflowY !== "visible") { top = Math.max(top, k.top); bottom = Math.min(bottom, k.bottom); }
            }
            if (right < left || bottom < top) continue;
            const name = e.localName + [...e.classList].map((x) => "." + x).join("");
            if (Math.max(right - c.right, c.left - left, bottom - c.bottom, c.top - top) > 0.5) { out.push(`${o}: ${ch.closest(".card").id} ${name} sticks out`); break; }
          }
        }
        return out;
      }, o));
    }
    check(`${scheme}, ${width}px, ${motion.toUpperCase()} version: nothing outside its chart or the page, after turning`, bad, []);
    check(`${scheme}, ${width}px, ${motion.toUpperCase()} version: no page errors`, q.errors, []);
    await q.close();
  }
}

// The v1 replicas in the gallery (fruit bars, box and whisker, animated dots): v1's assets and geometry,
// and a dots window that stays full while the rows move
{
  const p = await open(gallery, { viewport: { width: 1280, height: 900 } });
  check("v1 replicas: all 14 images load", await p.evaluate(async () => {
    const imgs = [...document.querySelectorAll("#fruit img, #clouds img")];
    await Promise.all(imgs.map((i) => i.decode().catch(() => {})));
    return [imgs.length, imgs.filter((i) => !i.naturalWidth).map((i) => i.alt)];
  }), [14, []]);

  // Where master's demos draw the top row and the scale, measured in Chromium at 1088px wide: [x, y, width, height]
  // from the plot's corner (the box plot's card), or [x, y] where a text starts.
  const V1 = {
    fruit: { bar: [112, 48, 944, 62.84], img: [112, -70.58, 300, 300], value: [1064, 69.67], name: [31.75, 67.42, 48.5, 24],
      "mark 0": [108, 24, 4], "mark 5": [300.8, 24, 4], "mark 25": [1056, 24, 4], "num 5": [308.8, 20] },
    clouds: { box: [803.53, 48, 212.27, 62.84], "cap 0": [626.66, 70, 4, 18.84], "cap 1": [1051.17, 70, 4, 18.84], circle: [16.58, 48, 62.84, 62.84],
      value: [1059.17, 68.67], "mark 0": [92, 24, 4], "mark 5": [272.88, 24, 4, 13], "mark 27": [1051.2, 24, 4], "num 5": [280.88, 20] },
  };
  await p.addStyleTag({ content: "#fruit .rhp-chart, #clouds .v1-card { width: 1088px !important; }" });
  await p.waitForTimeout(100);
  const off = [];
  for (const [id, root] of [["fruit", "#fruit .rhp-chart"], ["clouds", "#clouds .v1-card"]]) {
    const got = await p.evaluate((root) => {
      const o = document.querySelector(root).getBoundingClientRect();
      const box = (e) => { const b = e.getBoundingClientRect(); return [b.left - o.left, b.top - o.top, b.width, b.height]; };
      // a text: where its glyphs start and how wide they are, and the top and height of its line (v1 measured fit-content boxes)
      const text = (e) => { const r = document.createRange(); r.selectNodeContents(e); const t = r.getBoundingClientRect(), b = box(e); return [t.left - o.left, b[1], t.width, b[3]]; };
      const [scale, rows] = document.querySelectorAll(root + " .rhp-body > .rhp-plot");
      const top = [...rows.children].find((s) => s.style.getPropertyValue("--rhp-position") === "0");
      const out = { value: text(top.querySelector(".value")) };
      const name = top.querySelector(".name"), img = top.querySelector(".bar > img");
      if (name) out.name = text(name);
      if (img) out.img = box(img);
      for (const c of ["bar", "box", "circle"]) if (top.querySelector("." + c)) out[c] = box(top.querySelector("." + c));
      top.querySelectorAll(".cap").forEach((e, i) => (out["cap " + i] = box(e)));
      for (const s of scale.children) { out["mark " + s.textContent] = box(s.querySelector(".mark")); out["num " + s.textContent] = text(s.querySelector(".num")); }
      return out;
    }, root);
    for (const [k, want] of Object.entries(V1[id])) {
      const g = got[k]?.slice(0, want.length);
      if (!g || want.some((v, i) => Math.abs(g[i] - v) > 1)) off.push(`${id} ${k}: got ${g?.map((v) => +v.toFixed(2))}, v1 ${want}`);
    }
  }
  check("v1 replicas: the top rows and scales sit where v1 draws them, within 1px", off, []);

  // The scale's end line stays at the end of the track in every frame while the max changes, also when the new max
  // lands on a tick (that tick must not become the end and slide there), in both animation versions.
  for (const motion of ["css", "js"]) {
    if (motion === "js") await p.click("label:has(#motion-js)");
    const drift = await p.evaluate(async () => {
      const input = document.querySelector("#fruit .slider input"), body = document.querySelector("#fruit .rhp-body");
      const set = (v) => { input.value = v; input.dispatchEvent(new Event("input", { bubbles: true })); };
      let worst = 0;
      for (const [from, to] of [[29, 31], [31, 29], [31, 30], [26, 25], [30, 31], [25, 26]]) {
        set(from); await new Promise((r) => setTimeout(r, 600));
        set(to);
        for (let f = 0; f < 36; f++) {
          await new Promise((r) => requestAnimationFrame(r));
          const end = document.querySelector("#fruit .rhp-scale .end .mark");
          worst = Math.max(worst, Math.abs(end.getBoundingClientRect().left - body.getBoundingClientRect().right));
        }
      }
      set(1); // v1's value again
      return +worst.toFixed(1);
    });
    check(`Scale, ${motion.toUpperCase()} version: the end line never leaves the end while the max changes (px)`, drift, (w) => w <= 1);
  }
  await p.click("label:has(#motion-css)");
  await p.waitForTimeout(600);

  // While the JS version moves the scale, its lines appear when the moving end reaches them and go when it passes
  // them: none drawn past the end, none missing inside the scale on screen (fruit: a Scale; medals, coffee: the axis).
  await p.click("label:has(#motion-js)");
  const lines = await p.evaluate(async () => {
    const input = document.querySelector("#fruit .slider input"), chart = document.querySelector("#fruit .rhp-chart");
    const set = (v) => { input.value = v; input.dispatchEvent(new Event("input", { bubbles: true })); };
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    const out = { past: 0, missing: 0, axis: 0 };
    for (const [from, to] of [[25, 60], [60, 25]]) {
      set(from); await new Promise((r) => setTimeout(r, 700));
      set(to);
      for (let f = 0; f < 30; f++) {
        await frame();
        const max = +chart.style.getPropertyValue("--rhp-max"), end = chart.querySelector(".rhp-body").getBoundingClientRect().right;
        const marks = [...chart.querySelectorAll(".rhp-scale > :not(.end)")].map((s) => ({ v: +s.querySelector(".num").textContent, x: s.querySelector(".mark").getBoundingClientRect().left }));
        if (marks.some((m) => m.x > end + 0.5)) out.past++;
        for (let v = 5; v < max - 0.5; v += 5) if (!marks.some((m) => m.v === v)) { out.missing++; break; }
      }
    }
    set(1);
    for (let k = 0; k < 4; k++) {
      document.querySelector("#new-data").click();
      for (let f = 0; f < 30; f++) {
        await frame();
        for (const id of ["grouped", "stacked"]) {
          const b = document.querySelector(`#${id} .rhp-body`).getBoundingClientRect();
          if ([...document.querySelectorAll(`#${id} .rhp-gridline`)].some((g) => { const x = g.getBoundingClientRect().left; return x > b.right + 0.5 || x < b.left - 0.5; })) out.axis++;
        }
      }
    }
    return out;
  });
  check("JS version, while the scale moves: frames with a line past the end, with a line missing, with an axis line outside", [lines.past, lines.missing, lines.axis], [0, 0, 0]);

  // A steady drag moves a bar steadily in the JS version: a change mid-move adds to the motion, so the speed never
  // collapses and recovers at each step (restarting an ease-in-out at every input made the bar pulse).
  const pulses = await p.evaluate(async () => {
    const input = document.querySelector("#fruit .slider input");
    const set = (v) => { input.value = v; input.dispatchEvent(new Event("input", { bubbles: true })); };
    const bar = document.querySelector("#fruit .rhp-body > .rhp-plot:last-child > * .bar");
    set(12); await new Promise((r) => setTimeout(r, 900));
    const w = [];
    for (let v = 12; v <= 24; v++) for (let k = 0; k < 3; k++) { set(v); await new Promise((r) => requestAnimationFrame(r)); w.push(bar.getBoundingClientRect().width); }
    const speed = w.slice(1).map((x, i) => x - w[i]);
    let n = 0;
    for (let i = 2; i < speed.length; i++) if (speed[i - 1] < speed[i - 2] * 0.25 && speed[i] > Math.max(0.5, speed[i - 1] * 2)) n++;
    set(1);
    return n;
  });
  check("JS version: a steady drag never makes the bar's speed collapse and recover", pulses, 0);
  await p.click("label:has(#motion-css)");
  await p.waitForTimeout(600);

  // The dots: each row's whole dots in the window, lit or not, and whether the window shows a hole anywhere in the row:
  // a gap wider than the 8px between dots (counting the dots just past its ends), or no dot within 4px of an end.
  const look = () => p.evaluate(() => [...document.querySelectorAll("#dots .rhp-body > .rhp-plot > *")].map((row) => {
    const w = row.getBoundingClientRect();
    const d = [...row.querySelectorAll(".rhp-dot")].map((e) => ({ b: e.getBoundingClientRect(), lit: getComputedStyle(e).backgroundColor === "rgb(242, 204, 143)" }))
      .sort((a, b) => a.b.left - b.b.left);
    let hole = !d.length || d[0].b.left - w.left > 4.5 || w.right - d.at(-1).b.right > 4.5;
    for (let i = 1; i < d.length; i++) if (d[i].b.left > w.left && d[i - 1].b.right < w.right) hole ||= d[i].b.left - d[i - 1].b.right > 8.5;
    const shown = d.filter((x) => x.b.right > w.left && x.b.left < w.right), whole = shown.filter((x) => x.b.left >= w.left - 0.5 && x.b.right <= w.right + 0.5);
    return { lit: whole.map((x) => (x.lit ? "#" : ".")).join(""), hole, x: shown[0]?.b.left - w.left, size: [shown[0]?.b.width, shown[1]?.b.left - shown[0]?.b.left] };
  }));
  await p.hover("#dots .dots-window"); await p.waitForTimeout(600); // hovering holds v1's logo, whatever the 5 s cycle is doing
  const rest = await look();
  await p.mouse.move(0, 0); // leaving starts the cycle again
  check("v1 dots: v1's logo, 11 whole dots by 9 rows, 52px dots 60px apart", [rest.map((r) => r.lit), rest[0].size.map((v) => +v.toFixed(2))],
    [["...........", "....#......", "....#......", ".##.##..##.", "#...#.#.#.#", "#...#.#.##.", "........#..", "........#..", "..........."], [52, 60]]);
  // Every 5 s the rows scatter or come back. Sample the window through one change in each animation version.
  for (const motion of ["css", "js"]) {
    if (motion === "js") await p.click("label:has(#motion-js)");
    const still = JSON.stringify((await look()).map((r) => Math.round(r.x)));
    let samples = 0, between = 0, holes = 0;
    for (const end = Date.now() + 6000; Date.now() < end && !samples; ) if (JSON.stringify((await look()).map((r) => Math.round(r.x))) !== still) samples = 1;
    for (const end = Date.now() + 700; Date.now() < end; samples++) {
      const rows = await look();
      if (rows.some((r) => r.hole)) holes++;
      if (rows.some((r) => Math.abs(r.x - 4) > 0.5)) between++;
    }
    check(`v1 dots, ${motion.toUpperCase()} version: rows moved, and no frame shows a hole in the window`, [between > 0, holes], [true, 0]);
  }
  check("no page errors", p.errors, []);
  await p.close();
}
await browser.close();
console.log(failed ? `${failed} failed` : "all passed");
process.exit(failed ? 1 : 0);
