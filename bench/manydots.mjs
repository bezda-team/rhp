// Reproducible, isolated scatter comparison using one frozen library snapshot.
//   node bench/manydots.mjs prepare
//   node bench/manydots.mjs check --snapshot /private/tmp/rhp-manydots-...
//   node bench/manydots.mjs run --snapshot /private/tmp/rhp-manydots-... --results bench/results-manydots-...
// Prepare and correctness checks are separate from timing, so tests need not overlap measurement.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.dirname(here);
const require = createRequire(path.join(repo, "package.json"));
const { build } = require("esbuild");
const { transformAsync } = require("@babel/core");
const { chromium } = require("playwright");
const [command = "prepare", ...arguments_] = process.argv.slice(2);
const options = Object.fromEntries(arguments_.reduce((pairs, arg, i) => {
  if (arg.startsWith("--")) {
    const value = arguments_[i + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}`);
    pairs.push([arg.slice(2), value]);
  }
  return pairs;
}, []));
const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const files = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const file = path.join(directory, entry.name);
  return entry.isDirectory() ? files(file) : [file];
}).sort();
const writeJSON = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
const readJSON = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const git = (...args) => execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
const viewport = { width: 1000, height: 900 };
let scenarios = [1000, 10000].flatMap((n) => ["uniform", "categories", "unique"].map((appearance) => ({ n, appearance })));
let paired = false;
const configure = (inputs) => {
  paired = !!inputs.pair;
  if (paired) scenarios = ["uniform", "categories", "unique"].map((appearance) => ({ n: 10000, appearance }));
};
const variants = ({ n, appearance }) => paired ? ["before", "after"] : n === 10000 && appearance === "uniform" ? ["wrapped", "dot", "manydots"] : ["dot", "manydots"];

async function prepare() {
  const snapshot = options.snapshot ? path.resolve(options.snapshot) : fs.mkdtempSync(path.join(os.tmpdir(), "rhp-manydots-"));
  fs.mkdirSync(snapshot, { recursive: true });
  if (fs.existsSync(path.join(snapshot, "inputs.json"))) throw new Error(`Snapshot already exists: ${snapshot}`);
  const sourceBefore = Object.fromEntries(files(path.join(repo, "src")).map((file) => [path.relative(repo, file), hash(file)]));
  fs.cpSync(path.join(repo, "src"), path.join(snapshot, "src"), { recursive: true });
  fs.mkdirSync(path.join(snapshot, "bench"), { recursive: true });
  fs.cpSync(path.join(here, "manydots"), path.join(snapshot, "bench/manydots"), { recursive: true });
  fs.copyFileSync(fileURLToPath(import.meta.url), path.join(snapshot, "bench/manydots.mjs"));
  const copiedHashes = Object.fromEntries(files(path.join(snapshot, "src")).map((file) => [path.relative(snapshot, file), hash(file)]));
  const sourceAfter = Object.fromEntries(files(path.join(repo, "src")).map((file) => [path.relative(repo, file), hash(file)]));
  if (JSON.stringify(sourceBefore) !== JSON.stringify(sourceAfter) || JSON.stringify(sourceAfter) !== JSON.stringify(copiedHashes)) {
    throw new Error("Source changed while preparing the snapshot; prepare a new snapshot after edits finish");
  }
  const out = path.join(snapshot, "out");
  fs.mkdirSync(out);
  const entry = path.join(out, "entry.js");
  fs.writeFileSync(entry, 'import "../bench/manydots/harness.js";\n');
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
  await build({ entryPoints: [entry], outfile: path.join(out, "benchmark.js"), bundle: true, minify: true,
    format: "iife", platform: "browser", target: "es2020", jsx: "automatic", plugins: [solid, css],
    define: { "process.env.NODE_ENV": '"production"' }, logLevel: "error", nodePaths: [path.join(repo, "node_modules")] });
  fs.writeFileSync(path.join(out, "benchmark.html"), '<!doctype html><html><head><meta charset="utf-8"><title>ManyDots scatter comparison</title></head><body style="margin:0"><script src="benchmark.js"></script></body></html>');
  const packageLock = readJSON(path.join(repo, "package-lock.json"));
  const packages = ["@babel/core", "babel-preset-solid", "esbuild", "playwright", "playwright-core", "solid-js"];
  const inputs = { snapshot, captured: new Date().toISOString(), commit: git("rev-parse", "HEAD"), dirty: !!git("status", "--porcelain"),
    sourceHashes: Object.fromEntries(files(path.join(snapshot, "src")).concat(files(path.join(snapshot, "bench"))).map((file) => [path.relative(snapshot, file), hash(file)])),
    packageLockHash: hash(path.join(repo, "package-lock.json")),
    packages: Object.fromEntries(packages.map((name) => [name, packageLock.packages[`node_modules/${name}`]?.version])),
    bundleHash: hash(path.join(out, "benchmark.js")),
    notes: ["Both variants and the original wrapped reference share every library source file, including pre-existing working-tree edits.",
      "The original wrapped reference runs for the 10,000-point uniform scenario only.",
      "One browser bundle includes all variants, so loading and parsing code do not favor one variant."] };
  writeJSON(path.join(snapshot, "inputs.json"), inputs);
  console.log(JSON.stringify({ snapshot, bundleHash: inputs.bundleHash, sourceFiles: Object.keys(inputs.sourceHashes).length }, null, 2));
}

async function preparePair() {
  if (!options.baseline) throw new Error("Pass --baseline with the immutable original snapshot");
  const baseline = path.resolve(options.baseline), prior = readJSON(path.join(baseline, "inputs.json"));
  for (const [file, expected] of Object.entries(prior.sourceHashes)) {
    if (hash(path.join(baseline, file)) !== expected) throw new Error(`Modified baseline snapshot: ${file}`);
  }
  const snapshot = options.snapshot ? path.resolve(options.snapshot) : fs.mkdtempSync(path.join(os.tmpdir(), "rhp-manydots-pair-"));
  fs.mkdirSync(snapshot, { recursive: true });
  if (fs.existsSync(path.join(snapshot, "inputs.json"))) throw new Error(`Snapshot already exists: ${snapshot}`);
  const sourceBefore = Object.fromEntries(files(path.join(repo, "src")).map((file) => [path.relative(repo, file), hash(file)]));
  for (const variant of ["before", "after"]) {
    fs.cpSync(path.join(repo, "src"), path.join(snapshot, variant, "src"), { recursive: true });
  }
  for (const file of ["manydots.jsx", "manydots.css"]) {
    fs.copyFileSync(path.join(baseline, "src", file), path.join(snapshot, "before/src", file));
  }
  const sourceAfter = Object.fromEntries(files(path.join(repo, "src")).map((file) => [path.relative(repo, file), hash(file)]));
  if (JSON.stringify(sourceBefore) !== JSON.stringify(sourceAfter)) throw new Error("Source changed during capture; prepare a fresh snapshot");
  const sourceHashes = Object.fromEntries(files(path.join(snapshot, "before")).concat(files(path.join(snapshot, "after"))).map((file) => [path.relative(snapshot, file), hash(file)]));
  const differences = files(path.join(snapshot, "before/src")).map((file) => path.relative(path.join(snapshot, "before"), file))
    .filter((file) => hash(path.join(snapshot, "before", file)) !== hash(path.join(snapshot, "after", file)));
  if (differences.some((file) => !["src/manydots.jsx", "src/manydots.css"].includes(file))) throw new Error(`Unapproved variant differences: ${differences}`);
  if (!differences.length) throw new Error("There is no source change to measure");
  fs.mkdirSync(path.join(snapshot, "bench"), { recursive: true });
  fs.cpSync(path.join(here, "manydots"), path.join(snapshot, "bench/manydots"), { recursive: true });
  fs.copyFileSync(fileURLToPath(import.meta.url), path.join(snapshot, "bench/manydots.mjs"));
  const originalHarness = fs.readFileSync(path.join(baseline, "bench/manydots/harness.js"), "utf8");
  const pairHarness = originalHarness.replace('"./adapter.solid.jsx"', '"./pair-adapter.solid.jsx"')
    .replaceAll('variant === "manydots"', 'variant === "before" || variant === "after"');
  fs.writeFileSync(path.join(snapshot, "bench/manydots/harness.js"), pairHarness);
  Object.assign(sourceHashes, Object.fromEntries(files(path.join(snapshot, "bench")).map((file) => [path.relative(snapshot, file), hash(file)])));
  const out = path.join(snapshot, "out");
  fs.mkdirSync(out);
  const entry = path.join(out, "entry.js");
  fs.writeFileSync(entry, 'import "../bench/manydots/harness.js";\n');
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
  const aliases = { name: "variant-aliases", setup(builder) {
    builder.onResolve({ filter: /^rhp-(before|after)$/ }, (args) => ({ path: path.join(snapshot, args.path.slice(4), "src/index.js") }));
  } };
  await build({ entryPoints: [entry], outfile: path.join(out, "benchmark.js"), bundle: true, minify: true,
    format: "iife", platform: "browser", target: "es2020", jsx: "automatic", plugins: [aliases, solid, css],
    define: { "process.env.NODE_ENV": '"production"' }, logLevel: "error", nodePaths: [path.join(repo, "node_modules")] });
  fs.writeFileSync(path.join(out, "benchmark.html"), '<!doctype html><html><head><meta charset="utf-8"><title>ManyDots centering comparison</title></head><body style="margin:0"><script src="benchmark.js"></script></body></html>');
  const packageLock = readJSON(path.join(repo, "package-lock.json"));
  const inputs = { snapshot, captured: new Date().toISOString(), commit: git("rev-parse", "HEAD"), dirty: !!git("status", "--porcelain"),
    pair: { baseline, baselineBundleHash: prior.bundleHash, changedSourceFiles: differences,
      libraryStrategy: "Both variants use current common library source. Before restores only manydots.jsx/css from the original immutable snapshot.",
      fixtureStrategy: "Original frozen dataset and frame harness; only mount import and outside-timing geometry variant selection change." },
    sourceHashes, packageLockHash: hash(path.join(repo, "package-lock.json")),
    packages: Object.fromEntries(["@babel/core", "babel-preset-solid", "esbuild", "playwright", "playwright-core", "solid-js"].map((name) => [name, packageLock.packages[`node_modules/${name}`]?.version])),
    bundleHash: hash(path.join(out, "benchmark.js")),
    notes: ["Both complete library variants are in one browser bundle. No trace markers are added to the timing fixture.", "Only the two approved ManyDots source files differ between variants."] };
  writeJSON(path.join(snapshot, "inputs.json"), inputs);
  console.log(JSON.stringify({ snapshot, bundleHash: inputs.bundleHash, changedSourceFiles: differences }, null, 2));
}

function requireSnapshot() {
  if (!options.snapshot) throw new Error("Pass --snapshot from a completed prepare command");
  const snapshot = path.resolve(options.snapshot);
  const inputs = readJSON(path.join(snapshot, "inputs.json"));
  for (const [file, expected] of Object.entries(inputs.sourceHashes)) {
    if (hash(path.join(snapshot, file)) !== expected) throw new Error(`Snapshot was modified: ${file}`);
  }
  if (hash(path.join(snapshot, "out/benchmark.js")) !== inputs.bundleHash) throw new Error("Snapshot bundle was modified");
  configure(inputs);
  return { snapshot, inputs };
}

async function withBrowser(snapshot, fn) {
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.BENCH_BROWSER });
    return await fn(browser, pathToFileURL(path.join(snapshot, "out/benchmark.html")).href);
  } finally {
    await browser?.close();
  }
}

async function newPage(browser, url) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto(url);
    return { page, errors };
  } catch (error) {
    await page.close();
    throw error;
  }
}

const validateGeometry = (geometry, scenario, variant) => {
  if (geometry.points !== scenario.n || geometry.maximumPositionError > .1 || geometry.wrongSizes || geometry.wrongColors) {
    throw new Error(`${variant} ${scenario.appearance} ${scenario.n} incorrect geometry: ${JSON.stringify(geometry)}`);
  }
};

async function pixelsEqual(browser, paths) {
  const page = await browser.newPage();
  try {
    return await page.evaluate(async (images) => {
      const pixels = async (url) => {
        const image = new Image();
        await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url; });
        const canvas = document.createElement("canvas");
        canvas.width = image.width; canvas.height = image.height;
        const context = canvas.getContext("2d"); context.drawImage(image, 0, 0);
        return { width: image.width, height: image.height, data: context.getImageData(0, 0, image.width, image.height).data };
      };
      const [before, after] = await Promise.all(images.map(pixels));
      if (before.width !== after.width || before.height !== after.height) throw new Error("Screenshot dimensions differ");
      let differentChannels = 0, differentPixels = 0, maxDifference = 0;
      for (let i = 0; i < before.data.length; i += 4) {
        let different = false;
        for (let channel = 0; channel < 4; channel++) {
          const difference = Math.abs(before.data[i + channel] - after.data[i + channel]);
          if (difference) { differentChannels++; different = true; }
          maxDifference = Math.max(maxDifference, difference);
        }
        if (different) differentPixels++;
      }
      return { width: before.width, height: before.height, differentPixels, differentChannels, maxDifference };
    }, paths.map((file) => "data:image/png;base64," + fs.readFileSync(file).toString("base64")));
  } finally {
    await page.close();
  }
}

async function check() {
  const { snapshot, inputs } = requireSnapshot();
  const screenshots = path.join(snapshot, "screenshots");
  fs.mkdirSync(screenshots, { recursive: true });
  const correctness = { checked: new Date().toISOString(), bundleHash: inputs.bundleHash, viewport, cases: [], pixelComparisons: [] };
  const save = () => writeJSON(path.join(snapshot, "correctness.json"), correctness);
  await withBrowser(snapshot, async (browser, url) => {
    correctness.browser = browser.version();
    for (const scenario of scenarios) {
      const geometries = {};
      for (const variant of variants(scenario)) {
        const { page, errors } = await newPage(browser, url);
        try {
          await page.evaluate((args) => window.bench.run(args), { ...scenario, variant });
          await page.waitForTimeout(100);
          if (errors.length) throw new Error(`${variant} page errors: ${errors.join(" | ")}`);
          const geometry = await page.evaluate(([variant, appearance]) => window.bench.geometry(variant, appearance), [variant, scenario.appearance]);
          validateGeometry(geometry, scenario, variant);
          geometries[variant] = geometry;
          const screenshot = path.join(screenshots, `${scenario.n}-${scenario.appearance}-${variant}.png`);
          await page.locator(".rhp-chart").screenshot({ path: screenshot });
          if (errors.length) throw new Error(`${variant} page errors: ${errors.join(" | ")}`);
          correctness.cases.push({ ...scenario, variant, ...geometry, errors });
          save();
        } finally {
          await page.close();
        }
      }
      const baselineName = paired ? "before" : "dot";
      for (const variant of variants(scenario).filter((name) => name !== baselineName)) {
        const baseline = geometries[baselineName];
        if (JSON.stringify(baseline.chart) !== JSON.stringify(geometries[variant].chart) || JSON.stringify(baseline.collection) !== JSON.stringify(geometries[variant].collection)) {
          throw new Error(`${variant} chart or collection bounds differ from ${baselineName}`);
        }
        const comparison = await pixelsEqual(browser, [baselineName, variant].map((name) => path.join(screenshots, `${scenario.n}-${scenario.appearance}-${name}.png`)));
        correctness.pixelComparisons.push({ ...scenario, variant, ...comparison });
        save();
        if (comparison.differentChannels) throw new Error(`${variant} image differs from ${baselineName}: ${JSON.stringify(comparison)}`);
      }
      console.log(`PASS ${scenario.n} ${scenario.appearance}: all positions, sizes, colors, collection bounds, and screenshot pixels match`);
    }
    correctness.completed = new Date().toISOString();
    save();
  }).catch((error) => {
    correctness.failure = { message: error.message, at: new Date().toISOString() };
    save();
    throw error;
  });
}

const cpu = () => os.cpus().reduce((sum, core) => ({ idle: sum.idle + core.times.idle,
  total: sum.total + Object.values(core.times).reduce((a, b) => a + b, 0) }), { idle: 0, total: 0 });
const idlePercent = (before, after) => (after.idle - before.idle) / (after.total - before.total) * 100;
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const metricNames = { total: "TaskDuration", script: "ScriptDuration", style: "RecalcStyleDuration", layout: "LayoutDuration" };
const metricKeys = ["frame", ...Object.keys(metricNames), "elements", "connectedNodes"];
const nodeCounts = (page) => page.evaluate(() => {
  const walker = document.createTreeWalker(document, NodeFilter.SHOW_ALL);
  let connectedNodes = 1;
  while (walker.nextNode()) connectedNodes++;
  return { elements: document.querySelectorAll("*").length, connectedNodes };
});

async function run() {
  const { snapshot, inputs } = requireSnapshot();
  const correctness = readJSON(path.join(snapshot, "correctness.json"));
  if (!correctness.completed || correctness.failure || correctness.bundleHash !== inputs.bundleHash) {
    throw new Error("Run check successfully on this exact snapshot before timing");
  }
  if (!options.results) throw new Error("Pass --results with a new result directory");
  const resultsDirectory = path.resolve(options.results);
  fs.mkdirSync(resultsDirectory, { recursive: true });
  if (fs.existsSync(path.join(resultsDirectory, "results.json"))) throw new Error("Results already exist; use a fresh directory");
  const result = { started: new Date().toISOString(), inputs,
    machine: { cpu: os.cpus()[0].model, cores: os.cpus().length, memoryGiB: os.totalmem() / 2 ** 30,
      platform: os.platform(), release: os.release(), node: process.version, loadStart: os.loadavg() },
    method: { repeats: 5, freshPages: true, alternatingOrder: true, viewport, seed: 42, static: true,
      chart: { width: 600, height: 400, scale: [0, 100], cross: [0, 100] },
      totalWindowMs: 2000, frameHarness: "Same requestAnimationFrame and MessageChannel protocol as bench/scale/harness.js",
      nodeMetrics: ["connected-elements", "all-connected-DOM-nodes"], quietBaseline: false,
      notes: "Paired comparison under recorded background activity. CPU idle is recorded per measured sample. No quiet-machine claim is made. Timing starts after correctness checks finish." },
    correctness, cases: {} };
  if (os.platform() === "darwin") result.machine.macos = {
    version: execFileSync("sw_vers", ["-productVersion"], { encoding: "utf8" }).trim(),
    build: execFileSync("sw_vers", ["-buildVersion"], { encoding: "utf8" }).trim(),
  };
  const save = () => writeJSON(path.join(resultsDirectory, "results.json"), result);
  save();
  await withBrowser(snapshot, async (browser, url) => {
    result.machine.browser = browser.version();
    if (result.machine.browser !== correctness.browser) throw new Error("Correctness and timing browser versions differ");
    for (const scenario of scenarios) {
      const names = variants(scenario);
      const caseResult = result.cases[`${scenario.n}-${scenario.appearance}`] = { ...scenario, samples: Object.fromEntries(names.map((name) => [name, []])) };
      const beforeBaseline = cpu();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      caseResult.backgroundCPU = { at: new Date().toISOString(), idlePercent: idlePercent(beforeBaseline, cpu()) };
      for (let rep = 0; rep < 5; rep++) {
        const order = rep % 2 ? [...names].reverse() : names;
        for (const variant of order) {
          const { page, errors } = await newPage(browser, url);
          try {
            const cdp = await page.context().newCDPSession(page);
            await cdp.send("Performance.enable");
            const metrics = async () => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map(({ name, value }) => [name, value]));
            const initialNodes = await nodeCounts(page);
            const initialCPU = cpu();
            const initial = await metrics();
            const frame = await page.evaluate((args) => window.bench.run(args), { ...scenario, variant });
            await page.waitForTimeout(2000);
            const final = await metrics();
            const finalCPU = cpu();
            const finalNodes = await nodeCounts(page);
            const sample = { rep: rep + 1, order, frame,
              ...Object.fromEntries(Object.entries(metricNames).map(([key, metric]) => [key, (final[metric] - initial[metric]) * 1000])),
              initialMetrics: initial, finalMetrics: final,
              metricDeltas: Object.fromEntries(Object.keys(final).map((name) => [name, final[name] - (initial[name] ?? 0)])),
              durationDeltasMs: Object.fromEntries(Object.keys(final).filter((name) => /Duration$|^(ThreadTime|ProcessTime)$/.test(name))
                .map((name) => [name, (final[name] - (initial[name] ?? 0)) * 1000])),
              elements: finalNodes.elements - initialNodes.elements,
              connectedNodes: finalNodes.connectedNodes - initialNodes.connectedNodes,
              cdpNodesDelta: final.Nodes - initial.Nodes,
              aggregateCPUIdlePercent: idlePercent(initialCPU, finalCPU), errors };
            caseResult.samples[variant].push(sample);
            if (errors.length) throw new Error(`${variant} page errors: ${errors.join(" | ")}`);
            save();
            console.log(`${scenario.n} ${scenario.appearance} ${variant} ${rep + 1}/5: frame ${frame.toFixed(1)} ms, total ${sample.total.toFixed(1)} ms, style ${sample.style.toFixed(1)} ms, ${sample.elements} elements, ${sample.aggregateCPUIdlePercent.toFixed(1)}% CPU idle`);
          } finally {
            await page.close();
          }
        }
      }
      caseResult.medians = Object.fromEntries(names.map((variant) => [variant,
        Object.fromEntries(metricKeys.map((metric) => [metric, median(caseResult.samples[variant].map((sample) => sample[metric]))]))]));
      const candidate = paired ? "after" : "manydots";
      caseResult.pairedRatios = Object.fromEntries(names.filter((name) => name !== candidate).map((baseline) => [baseline,
        Object.fromEntries(["frame", "total", "script", "style", "layout"].map((metric) => [metric,
          median(caseResult.samples[candidate].map((sample, rep) => sample[metric] / caseResult.samples[baseline][rep][metric]))]))]));
      save();
      console.log(`MEDIANS ${scenario.n} ${scenario.appearance}: ${JSON.stringify(caseResult.medians)}`);
    }
    result.completed = new Date().toISOString();
    result.machine.loadEnd = os.loadavg();
    save();
  }).catch((error) => {
    result.failure = { message: error.message, at: new Date().toISOString() };
    save();
    throw error;
  });
  fs.copyFileSync(path.join(snapshot, "correctness.json"), path.join(resultsDirectory, "correctness.json"));
  fs.copyFileSync(path.join(snapshot, "inputs.json"), path.join(resultsDirectory, "inputs.json"));
  console.log(`Saved ${path.join(resultsDirectory, "results.json")}`);
}

if (command === "prepare") await prepare();
else if (command === "prepare-pair") await preparePair();
else if (command === "check") await check();
else if (command === "run") await run();
else throw new Error(`Unknown command: ${command}`);
