// The scale benchmark: one scatter plot or one line chart of n points per page, in every library of scale/.
//   node scale.mjs build                 bundles out-scale/<lib>.js and its page
//   node scale.mjs run [libs]            Chromium (BENCH_BROWSER to pick a build), writes <BENCH_RESULTS>/scale.json
// The chart is made at the start of a frame; "frame" is that frame's work until it is drawn, "total" all main-thread
// time in the 2 seconds after (deferred drawing and entry animations), "nodes" the DOM elements it added. Median of 5.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { transformAsync } from "@babel/core";
const here = path.dirname(fileURLToPath(import.meta.url)), at = (f) => path.join(here, f);
const [cmd = "run", only] = process.argv.slice(2);
const LIBS = fs.readdirSync(at("scale")).filter((f) => /\.(js|jsx)$/.test(f) && f !== "harness.js").map((f) => f.replace(/(\.solid)?\.jsx?$/, ""));
const file = (name) => fs.readdirSync(at("scale")).find((f) => f.replace(/(\.solid)?\.jsx?$/, "") === name);
const SCENARIOS = [["scatter", 1000], ["scatter", 10000], ["line", 1000], ["line", 100000]];
const REPS = 5;

if (cmd === "build") {
  const solid = { name: "solid", setup(b) {
    b.onLoad({ filter: /\.solid\.jsx$|[\\/]src[\\/].*\.jsx$/ }, async (a) => {
      const r = await transformAsync(await fs.promises.readFile(a.path, "utf8"), { presets: [["babel-preset-solid", {}]], filename: a.path, babelrc: false, configFile: false });
      return { contents: r.code, loader: "js" };
    });
  } };
  const css = { name: "css", setup(b) { b.onLoad({ filter: /\.css$/ }, async (a) => ({ contents: (await fs.promises.readFile(a.path, "utf8")), loader: "text" })); } };
  fs.mkdirSync(at("out-scale"), { recursive: true });
  for (const name of LIBS) {
    const entry = at(`out-scale/${name}.entry.js`);
    fs.writeFileSync(entry, `import lib from "../scale/${file(name)}";\nimport { install } from "../scale/harness.js";\ninstall(lib);\n`);
    await build({ entryPoints: [entry], outfile: at(`out-scale/${name}.js`), bundle: true, minify: true, format: "iife", platform: "browser", target: "es2020", jsx: "automatic",
      plugins: [solid, css], define: { "process.env.NODE_ENV": '"production"' }, logLevel: "error", nodePaths: [at("node_modules"), at("../node_modules")] });
    fs.writeFileSync(at(`out-scale/${name}.html`), `<!doctype html><html><head><meta charset="utf-8"><title>${name}</title></head><body style="margin:0"><script src="${name}.js"></script></body></html>`);
    console.log("built", name);
  }
} else {
  const { chromium } = await import("playwright");
  const server = http.createServer((q, r) => {
    const f = at("out-scale" + new URL(q.url, "http://x").pathname);
    if (!fs.existsSync(f)) return r.writeHead(404).end();
    r.writeHead(200, { "content-type": f.endsWith(".html") ? "text/html" : "text/javascript" }).end(fs.readFileSync(f));
  }).listen(0, "127.0.0.1");
  await new Promise((r) => server.on("listening", r));
  const browser = await chromium.launch({ executablePath: process.env.BENCH_BROWSER });
  const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const results = { engine: "chromium", date: new Date().toISOString(), libs: {} };
  for (const lib of LIBS.filter((l) => !only || only.split(",").includes(l))) {
    const r = (results.libs[lib] = {});
    for (const [kind, n] of SCENARIOS) {
      const runs = [];
      for (let i = 0; i < REPS; i++) {
        const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(`http://127.0.0.1:${server.address().port}/${lib}.html`);
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("Performance.enable");
        const metric = async (k) => (await cdp.send("Performance.getMetrics")).metrics.find((m) => m.name === k).value;
        const n0 = await metric("Nodes"), t0 = await metric("TaskDuration");
        const frame = await Promise.race([page.evaluate(([kind, n]) => window.bench.run({ kind, n }), [kind, n]), new Promise((res) => setTimeout(() => res(null), 60000))]);
        await new Promise((res) => setTimeout(res, 2000));
        runs.push({ frame, total: ((await metric("TaskDuration")) - t0) * 1000, nodes: (await metric("Nodes")) - n0, errors: errors.length });
        await page.close();
      }
      r[`${kind}-${n}`] = { frame: +median(runs.map((x) => x.frame ?? Infinity)).toFixed(1), total: +median(runs.map((x) => x.total)).toFixed(1), nodes: median(runs.map((x) => x.nodes)), errors: Math.max(...runs.map((x) => x.errors)) };
    }
    console.log(lib, JSON.stringify(r));
  }
  await browser.close();
  server.close();
  const dir = process.env.BENCH_RESULTS ?? "results";
  fs.mkdirSync(at(dir), { recursive: true });
  fs.writeFileSync(at(`${dir}/scale.json`), JSON.stringify(results, null, 2));
}
