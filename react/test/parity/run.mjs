// node react/test/parity/run.mjs [chart,chart...]
// Draws charts.jsx with rhp (Solid) and with rhp-react, and compares them chart by chart, first as drawn and then after
// each step of their data: every element's tag, attributes, CSS variables and text, and the pixels on screen.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { build } from "esbuild";
import { transformAsync } from "@babel/core";
import { chromium, webkit, firefox } from "playwright";
import { cssText } from "../../build.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const RHP = path.resolve(here, "../../..");
const out = path.join(here, "out");
fs.mkdirSync(out, { recursive: true });
const only = process.argv[2]?.split(",");
const DEV = process.env.DEV === "1";

// The same charts, with "rhp" as rhp's source (Solid) and as rhp-react's
const alias = (to) => ({
  name: "rhp",
  setup(b) {
    b.onResolve({ filter: /^rhp$/ }, () => ({ path: to }));
  },
});
const solidJsx = {
  name: "solid",
  setup(b) {
    b.onLoad({ filter: /\.jsx$/ }, async (a) => {
      const src = await fs.promises.readFile(a.path, "utf8");
      const r = await transformAsync(src, { presets: [[path.join(RHP, "node_modules/babel-preset-solid/index.js"), {}]], filename: a.path, babelrc: false, configFile: false });
      return { contents: r.code, loader: "js" };
    });
  },
};
const common = { bundle: true, format: "iife", platform: "browser", target: "es2022", minify: !DEV, logLevel: "warning", nodePaths: [path.join(RHP, "node_modules")],
  define: { "process.env.NODE_ENV": DEV ? '"development"' : '"production"' } };
await build({ ...common, entryPoints: [path.join(here, "solid-page.jsx")], outfile: path.join(out, "solid.js"), plugins: [alias(path.join(RHP, "src/index.js")), solidJsx, cssText] });
await build({ ...common, entryPoints: [path.join(here, "react-page.jsx")], outfile: path.join(out, "react.js"), jsx: "automatic", plugins: [alias(path.join(RHP, "react/src/index.js")), cssText] });
for (const side of ["solid", "react"]) {
  fs.writeFileSync(path.join(out, side + ".html"), `<!doctype html><html><head><meta charset="utf-8"><title>${side}</title>` +
    `<style>body { margin: 0; font: 13px system-ui; } [data-chart] { width: 600px; margin: 8px 8px 28px; } .poster { display: block; }</style></head>` +
    `<body><div id="root"></div><script src="${side}.js"></script></body></html>`);
}

// What a chart is in the page, element by element: tag, attributes, CSS variables of its style attribute and text (ids
// that rhp makes for aria-owns say U where they hold the id React or Solid made for the Plot)
const snapshot = () => {
  window.snap = (box) => {
    const lines = [];
    const id = (v) => v.split(" ").map((t) => t.replace(/^rhp-(.*)-(\d+)$/, "rhp-U-$2")).join(" ");
    const walk = (el, depth) => {
      const pad = " ".repeat(depth);
      let text = "";
      const flush = () => {
        if (text.trim()) lines.push(pad + JSON.stringify(text));
        text = "";
      };
      for (const node of el.childNodes) {
        if (node.nodeType === 3) {
          text += node.data;
          continue;
        }
        if (node.nodeType !== 1) continue;
        flush();
        const tag = node.tagName.toLowerCase();
        const attrs = [...node.attributes].filter((a) => a.name !== "style").map((a) => a.name + "=" + JSON.stringify(a.name === "id" || a.name === "aria-owns" ? id(a.value) : a.value)).sort();
        const style = [...node.style].map((k) => k + ":" + node.style.getPropertyValue(k).trim()).sort();
        lines.push(pad + "<" + tag + (attrs.length ? " " + attrs.join(" ") : "") + (style.length ? " {" + style.join("; ") + "}" : "") + ">");
        if (tag === "style") lines.push(pad + " " + JSON.stringify(node.textContent));
        else walk(node, depth + 1);
      }
      flush();
    };
    walk(box, 0);
    return lines;
  };
};

const ENGINE = process.env.BROWSER ?? "chromium";
const browser = await { chromium, webkit, firefox }[ENGINE].launch(ENGINE === "chromium" ? { args: ["--disable-low-res-tiling", "--disable-partial-raster", "--disable-gpu-rasterization", "--disable-features=PaintHolding"] } : {});
const open = async (side) => {
  const p = await browser.newPage({ viewport: { width: 640, height: 900 }, deviceScaleFactor: 1 });
  p.logs = [];
  p.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") p.logs.push(m.type() + ": " + m.text());
  });
  p.on("pageerror", (e) => p.logs.push("pageerror: " + e.message));
  await p.addInitScript(snapshot);
  await p.goto("file://" + path.join(out, side + ".html"));
  await p.waitForTimeout(900);
  return p;
};
const solid = await open("solid");
const react = await open("react");

// Two screenshots, compared pixel by pixel in the browser: the number of pixels that differ
const differing = async (a, b) => {
  if (a.equals(b)) return 0;
  return solid.evaluate(async ([x, y]) => {
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
      if (i.d[k] !== j.d[k] || i.d[k + 1] !== j.d[k + 1] || i.d[k + 2] !== j.d[k + 2] || i.d[k + 3] !== j.d[k + 3]) n++;
    }
    return n;
  }, [a.toString("base64"), b.toString("base64")]);
};

let failed = 0;
let checked = 0;
const names = (await solid.evaluate(() => P.names)).filter((n) => !only || only.includes(n));
const compare = async (name, when) => {
  const [a, b] = await Promise.all([solid, react].map((p) => p.evaluate((n) => snap(document.querySelector(`[data-chart="${n}"]`)), name)));
  const [x, y] = await Promise.all([solid, react].map((p) => p.locator(`[data-chart="${name}"]`).screenshot()));
  const pixels = await differing(x, y);
  checked++;
  const same = JSON.stringify(a) === JSON.stringify(b);
  if (same && pixels === 0) {
    console.log(`ok   ${name} ${when}`);
    return;
  }
  failed++;
  console.log(`FAIL ${name} ${when}: ${same ? "same elements" : "elements differ"}, ${pixels} pixels differ`);
  if (!same) {
    let shown = 0;
    for (let k = 0; k < Math.max(a.length, b.length) && shown < 6; k++) {
      if (a[k] === b[k]) continue;
      shown++;
      console.log(`  line ${k}\n    solid: ${a[k]}\n    react: ${b[k]}`);
    }
  }
  if (pixels) {
    fs.writeFileSync(path.join(out, `${name}-${when}-solid.png`), x);
    fs.writeFileSync(path.join(out, `${name}-${when}-react.png`), y);
  }
};

for (const name of names) {
  await compare(name, "drawn");
  const steps = await solid.evaluate((n) => P.step[n] && 1, name);
  if (!steps) continue;
  for (let k = 0; ; k++) {
    const has = await solid.evaluate(([n, k]) => {
      try {
        P.step[n](k);
        return true;
      } catch {
        return false;
      }
    }, [name, k]);
    if (!has) break;
    await react.evaluate(([n, k]) => P.step[n](k), [name, k]);
    await Promise.all([solid.waitForTimeout(900), react.waitForTimeout(900)]);
    await compare(name, "step" + (k + 1));
  }
}

for (const p of [solid, react]) {
  const title = await p.title();
  if (p.logs.length) {
    failed++;
    console.log(`FAIL ${title}: console\n  ` + p.logs.join("\n  "));
  }
}

console.log(`${checked - (failed - 0)} of ${checked} the same${failed ? "" : ", no console errors"}`);
await browser.close();
process.exit(failed ? 1 : 0);
