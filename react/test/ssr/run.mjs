// node react/test/ssr/run.mjs: the app (app.jsx) drawn on a server with react-dom/server, then
//   - its HTML alone (no script) against the app drawn in the browser alone, pixel for pixel
//   - taken over by hydrateRoot (React's development build, which says what doesn't match): no warning, every element
//     the server drew kept, the server's CSS turned off for the browser's own, the same pixels, and the data followed
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { build } from "esbuild";
import { chromium, webkit, firefox } from "playwright";
import { cssText } from "../../build.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const RHP = path.resolve(here, "../../..");
const out = path.join(here, "out");
fs.mkdirSync(out, { recursive: true });
const common = { bundle: true, jsx: "automatic", plugins: [cssText], logLevel: "warning", nodePaths: [path.join(RHP, "node_modules")] };
await build({ ...common, entryPoints: [path.join(here, "server.jsx")], outfile: path.join(out, "server.mjs"), format: "esm", platform: "node", external: ["react", "react-dom"] });
await build({ ...common, entryPoints: [path.join(here, "client.jsx")], outfile: path.join(out, "client.js"), format: "iife", platform: "browser", define: { "process.env.NODE_ENV": '"development"' } });

const { html } = await import(pathToFileURL(path.join(out, "server.mjs")) + "?" + Date.now());
const body = html();
const page = (inner) => `<!doctype html><html><head><meta charset="utf-8"><style>body { margin: 0; font: 13px system-ui; } .page { width: 600px; padding: 8px; } .page > * { margin-bottom: 24px; }</style></head>` +
  `<body><div id="root">${inner}</div><script src="client.js"></script></body></html>`;
fs.writeFileSync(path.join(out, "ssr.html"), page(body));
fs.writeFileSync(path.join(out, "alone.html"), page(""));

let failed = 0;
const check = (name, got, want) => {
  const ok = typeof want === "function" ? want(got) : JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `: got ${JSON.stringify(got)}, want ${typeof want === "function" ? want.toString() : JSON.stringify(want)}`}`);
};

// React may join several sheets of one precedence in one <style>, its data-href naming them all
const named = [...body.matchAll(/<style data-precedence="rhp" data-href="([^"]+)"/g)].flatMap((m) => m[1].split(" "));
check("server: each sheet once in the page, however many charts ask for it: rhp's core, the guard, the gutters', the cross scale's and each slat type's",
  named, (names) => names.length === new Set(names).size && ["rhp-core", "rhp-guard", "rhp-gutters", "rhp-cross"].every((n) => names.includes(n)) && names.filter((n) => n.startsWith("rhp-s")).length === 2);
check("server: rhp's layers are declared in rhp's order before any of its rules (placement wins over a slat's CSS)",
  body.match(/@layer\s+rhp\.[\w.]+(\s*,\s*rhp\.[\w.]+)*\s*[;{]/)?.[0].replace(/\s+/g, " "), "@layer rhp.place, rhp.slat, rhp.core;");
check("server: with `keyboard`, the HTML makes the first row shown the tab stop", /data-n="Dates"[^>]*tabindex="0"|tabindex="0"[^>]*data-n="Dates"/.test(body), true);

const ENGINE = process.env.BROWSER ?? "chromium";
const browser = await { chromium, webkit, firefox }[ENGINE].launch(ENGINE === "chromium" ? { args: ["--disable-low-res-tiling", "--disable-partial-raster", "--disable-gpu-rasterization", "--disable-features=PaintHolding"] } : {});
console.log(`in ${ENGINE}`);
const open = async (file, js = true) => {
  const ctx = await browser.newContext({ viewport: { width: 640, height: 1000 }, javaScriptEnabled: js });
  const p = await ctx.newPage();
  p.logs = [];
  p.on("console", (m) => (m.type() === "error" || m.type() === "warning") && p.logs.push(m.text()));
  p.on("pageerror", (e) => p.logs.push(e.message));
  const [name, query] = file.split("?");
  await p.goto(pathToFileURL(path.join(out, name)).href + (query ? "?" + query : ""));
  await p.waitForTimeout(500);
  return p;
};
const shot = (p) => p.locator(".page").screenshot();
const differing = async (p, a, b) => {
  if (a.equals(b)) return 0;
  return p.evaluate(async ([x, y]) => {
    const load = async (b64) => {
      const img = await createImageBitmap(await (await fetch("data:image/png;base64," + b64)).blob());
      const c = new OffscreenCanvas(img.width, img.height);
      const g = c.getContext("2d");
      g.drawImage(img, 0, 0);
      return { w: img.width, h: img.height, d: g.getImageData(0, 0, img.width, img.height).data };
    };
    const [i, j] = [await load(x), await load(y)];
    if (i.w !== j.w || i.h !== j.h) return `size ${i.w}x${i.h} against ${j.w}x${j.h}`;
    let n = 0;
    for (let k = 0; k < i.d.length; k += 4) {
      if (i.d[k] !== j.d[k] || i.d[k + 1] !== j.d[k + 1] || i.d[k + 2] !== j.d[k + 2]) n++;
    }
    return n;
  }, [a.toString("base64"), b.toString("base64")]);
};

const alone = await open("alone.html?alone");
const aloneShot = await shot(alone);
const htmlOnly = await open("ssr.html", false);
check("server: the HTML draws every chart before any script runs, as the browser draws the app alone (pixels that differ)", await differing(alone, await shot(htmlOnly), aloneShot), 0);

const ssr = await open("ssr.html");
const kept = await ssr.evaluate(async () => {
  const before = [...document.querySelectorAll(".page *")];
  window.go();
  await new Promise((r) => setTimeout(r, 600));
  const after = [...document.querySelectorAll(".page *")];
  return [before.length, after.length, before.filter((el) => !el.isConnected).length];
});
check("hydration: the page keeps the server's elements (none drawn twice, none left out)", [kept[0] === kept[1], kept[2]], [true, 0]);
check("hydration: no warning and no error, and nothing React had to draw again", [ssr.logs.filter((m) => !m.includes("React DevTools")), await ssr.evaluate(() => T.errors)], [[], []]);
check("hydration: the server's CSS is turned off once the browser has its own", await ssr.evaluate(() => [...document.querySelectorAll('style[data-precedence="rhp"]')].map((s) => s.sheet.disabled)),
  (list) => list.length > 0 && list.every(Boolean));
check("hydration: it still looks the same (pixels that differ)", await differing(ssr, await shot(ssr), aloneShot), 0);
// Every element of the page: its tag, its attributes, its CSS variables and its text (an id React made says U)
const snap = (p) => p.evaluate(() => {
  const lines = [];
  const walk = (el, depth) => {
    for (const node of el.childNodes) {
      if (node.nodeType === 3 && node.data.trim()) lines.push(" ".repeat(depth) + JSON.stringify(node.data));
      if (node.nodeType !== 1) continue;
      const attrs = [...node.attributes].filter((a) => a.name !== "style").map((a) => a.name + "=" + a.value.replace(/_[rR]_\w*?_|«[^»]*»|:[rR]\w*:/g, "U")).sort();
      const style = [...node.style].map((k) => k + ":" + node.style.getPropertyValue(k).trim()).sort();
      lines.push(" ".repeat(depth) + node.tagName + " " + attrs.join(" ") + " {" + style.join(";") + "}");
      walk(node, depth + 1);
    }
  };
  walk(document.querySelector(".page"), 0);
  return lines;
});
check("hydration: and its elements are those the browser draws alone", await snap(ssr), await snap(alone));
await ssr.evaluate(() => T.setSold([30, 2, 14, 5]));
await ssr.waitForTimeout(500);
check("hydration: the chart follows its data", await ssr.evaluate(() => [...document.querySelectorAll(".fruit .rhp-plot:not(.rhp-scale) > *")].map((e) => e.dataset.n + "@" + e.style.getPropertyValue("--rhp-position") + ":" + e.tabIndex).join(" ")),
  "Apples@0:0 Bananas@3:-1 Cherries@1:-1 Dates@2:-1");

for (const p of [alone, htmlOnly]) {
  if (p.logs.length) check("no page errors", p.logs, []);
}
console.log(failed ? `${failed} failed` : "all passed");
await browser.close();
process.exit(failed ? 1 : 0);
