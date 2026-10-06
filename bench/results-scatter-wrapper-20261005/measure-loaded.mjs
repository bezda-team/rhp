import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const run = process.argv[2] ? path.resolve(process.argv[2]) : path.dirname(fileURLToPath(import.meta.url));
const repo = "/Users/anasb/repositories/rhp";
const require = createRequire(path.join(repo, "package.json"));
const { build } = require("esbuild");
const { transformAsync } = require("@babel/core");
const { chromium } = require("playwright");
const out = path.join(run, "out");
fs.mkdirSync(out, { recursive: true });
const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const solid = { name: "solid", setup(builder) {
  builder.onLoad({ filter: /\.jsx$/ }, async (args) => {
    const result = await transformAsync(fs.readFileSync(args.path, "utf8"), {
      presets: [[require.resolve("babel-preset-solid"), {}]], filename: args.path, babelrc: false, configFile: false,
    });
    return { contents: result.code, loader: "js" };
  });
} };
const css = { name: "css-text", setup(builder) {
  builder.onLoad({ filter: /\.css$/ }, (args) => ({ contents: fs.readFileSync(args.path, "utf8"), loader: "text" }));
} };
for (const variant of ["before", "after"]) {
  const entry = path.join(out, variant + ".entry.js");
  fs.writeFileSync(entry, `import lib from "../bench/scale/${variant}.solid.jsx";\nimport { install } from "../bench/scale/harness.js";\ninstall(lib);\n`);
  await build({ entryPoints: [entry], outfile: path.join(out, variant + ".js"), bundle: true, minify: true,
    format: "iife", platform: "browser", target: "es2020", jsx: "automatic", plugins: [solid, css],
    define: { "process.env.NODE_ENV": '"production"' }, logLevel: "error", nodePaths: [path.join(repo, "node_modules")] });
  fs.writeFileSync(path.join(out, variant + ".html"), `<!doctype html><html><head><meta charset="utf-8"><title>${variant}</title></head><body style="margin:0"><script src="${variant}.js"></script></body></html>`);
}

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const cpu = () => os.cpus().reduce((sum, core) => ({ idle: sum.idle + core.times.idle,
  total: sum.total + Object.values(core.times).reduce((a, b) => a + b, 0) }), { idle: 0, total: 0 });
const result = { started: new Date().toISOString(), ...JSON.parse(fs.readFileSync(path.join(run, "inputs.json"), "utf8")),
  machine: { cpu: os.cpus()[0].model, cores: os.cpus().length, memoryGiB: os.totalmem() / 2 ** 30,
    platform: os.platform(), release: os.release(), node: process.version, loadStart: os.loadavg() },
  method: { repeats: 5, freshPages: true, alternatingOrder: true, viewport: { width: 1000, height: 900 },
    static: true, totalWindowMs: 2000, frameHarness: "Original bench/scale/harness.js", nodeMetric: "connected-elements" },
  bundles: Object.fromEntries(["before", "after"].map((v) => [v, hash(path.join(out, v + ".js"))])), cases: {}, checks: [] };
const save = () => fs.writeFileSync(path.join(run, "results-loaded.json"), JSON.stringify(result, null, 2) + "\n");
result.method.quietBaseline = false;
result.method.notes = "Paired comparison under current background activity; the optional 90% idle check timed out. CPU idle is recorded per measured sample.";
result.priorIdleCheck = JSON.parse(fs.readFileSync(path.join(run, "idle-gate-failure.json"), "utf8")).failure;
const baselineCPU = async () => {
  const before = cpu();
  await new Promise(resolve => setTimeout(resolve, 2000));
  const after = cpu();
  return { at: new Date().toISOString(), idlePercent: (after.idle - before.idle) / (after.total - before.total) * 100 };
};
const browser = await chromium.launch();
result.machine.browser = browser.version();
try {
  for (const n of [1000, 10000]) {
    const caseResult = result.cases[n] = { baselineCPU: await baselineCPU(), before: [], after: [] };
    console.log(`Recorded CPU baseline for ${n} points: ${caseResult.baselineCPU.idlePercent.toFixed(1)}% idle`);
    for (let rep = 0; rep < 5; rep++) {
      for (const variant of rep % 2 ? ["after", "before"] : ["before", "after"]) {
        const page = await browser.newPage({ viewport: result.method.viewport });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        try {
          await page.goto("file://" + path.join(out, variant + ".html"));
          const cdp = await page.context().newCDPSession(page);
          await cdp.send("Performance.enable");
          const metrics = async () => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map(({ name, value }) => [name, value]));
          const initialElements = await page.evaluate(() => document.querySelectorAll("*").length);
          const initialCPU = cpu();
          const initial = await metrics();
          const frame = await page.evaluate((n) => bench.run({ kind: "scatter", n }), n);
          await page.waitForTimeout(2000);
          const final = await metrics();
          const finalCPU = cpu();
          const delta = (key) => (final[key] - initial[key]) * 1000;
          const sample = { rep: rep + 1, frame, total: delta("TaskDuration"), script: delta("ScriptDuration"),
            style: delta("RecalcStyleDuration"), layout: delta("LayoutDuration"),
            nodes: (await page.evaluate(() => document.querySelectorAll("*").length)) - initialElements,
            aggregateCPUIdlePercent: (finalCPU.idle - initialCPU.idle) / (finalCPU.total - initialCPU.total) * 100, errors };
          caseResult[variant].push(sample);
          if (errors.length) throw new Error(`${variant} ${n} page errors: ${errors.join(" | ")}`);
          if (sample.nodes !== (variant === "before" ? 2 * n + 31 : n + 31)) throw new Error(`Unexpected element count: ${sample.nodes}`);
          if (rep === 0) {
            const geometry = await page.evaluate(() => {
              const plot = document.querySelector(".rhp-body > .rhp-plot"), box = plot.getBoundingClientRect();
              let maximumError = 0, wrongSizes = 0;
              for (const dot of document.querySelectorAll(".rhp-dot")) {
                const rect = dot.getBoundingClientRect();
                const x = +dot.style.getPropertyValue("--rhp-at"), y = +dot.style.getPropertyValue("--rhp-cross");
                maximumError = Math.max(maximumError, Math.abs(rect.left + rect.width / 2 - (box.left + x / 100 * box.width)),
                  Math.abs(rect.top + rect.height / 2 - (box.bottom - y / 100 * box.height)));
                if (Math.abs(rect.width - 4) > .01 || Math.abs(rect.height - 4) > .01) wrongSizes++;
              }
              return { maximumError, wrongSizes };
            });
            result.checks.push({ n, variant, ...geometry });
            if (geometry.maximumError > .1 || geometry.wrongSizes) throw new Error(`Incorrect point geometry: ${JSON.stringify(geometry)}`);
            if (n === 1000) await page.locator(".rhp-chart").screenshot({ path: path.join(run, variant + ".png") });
          }
          console.log(`${n} ${variant} ${rep + 1}/5: frame ${frame.toFixed(1)} ms, total ${sample.total.toFixed(1)} ms, ${sample.nodes} elements`);
          save();
        } finally {
          await page.close();
        }
      }
    }
    caseResult.medians = Object.fromEntries(["before", "after"].map((variant) => [variant,
      Object.fromEntries(["frame", "total", "script", "style", "layout", "nodes"].map((metric) => [metric, median(caseResult[variant].map((s) => s[metric]))]))]));
    console.log(`Medians ${n}: ${JSON.stringify(caseResult.medians)}`);
  }
  const compare = await browser.newPage();
  result.pixelComparison = await compare.evaluate(async (images) => {
    const pixels = async (url) => {
      const image = new Image();
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url; });
      const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
      const context = canvas.getContext("2d"); context.drawImage(image, 0, 0);
      return { width: image.width, height: image.height, pixels: context.getImageData(0, 0, image.width, image.height).data };
    };
    const [before, after] = await Promise.all(images.map(pixels));
    if (before.width !== after.width || before.height !== after.height) throw new Error("Screenshots have different dimensions");
    let differentChannels = 0, maxDifference = 0;
    for (let i = 0; i < before.pixels.length; i++) {
      const difference = Math.abs(before.pixels[i] - after.pixels[i]);
      if (difference) differentChannels++;
      maxDifference = Math.max(maxDifference, difference);
    }
    return { width: before.width, height: before.height, differentChannels, maxDifference };
  }, ["before", "after"].map((v) => "data:image/png;base64," + fs.readFileSync(path.join(run, v + ".png")).toString("base64")));
  await compare.close();
  if (result.pixelComparison.differentChannels) throw new Error(`Rendered image changed: ${JSON.stringify(result.pixelComparison)}`);
  result.completed = new Date().toISOString();
  result.machine.loadEnd = os.loadavg();
  save();
  console.log(`PASS pixel comparison: ${JSON.stringify(result.pixelComparison)}`);
} catch (error) {
  result.failure = { message: error.message, idleSamples: error.samples };
  save();
  throw error;
} finally {
  await browser.close();
}
