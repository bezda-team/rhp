// Builds one page per library into out/: the library's adapter (libs/) and the harness, minified like an app would ship.
// Also measures each library's size: a minimal bar chart app, minified and gzipped, with and without its framework.
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build, transform } from "esbuild";
import { transformAsync } from "@babel/core";
const here = path.dirname(fileURLToPath(import.meta.url)), at = (f) => path.join(here, f);
fs.mkdirSync(at("out"), { recursive: true });

// rhp's slats are Solid JSX; the React libraries' views are React JSX.
const solid = { name: "solid", setup(b) {
  b.onLoad({ filter: /\.solid\.jsx$|[\\/]src[\\/].*\.jsx$/ }, async (a) => {
    const r = await transformAsync(await fs.promises.readFile(a.path, "utf8"), { presets: [["babel-preset-solid", {}]], filename: a.path, babelrc: false, configFile: false });
    return { contents: r.code, loader: "js" };
  });
}};
// CSS: rhp embeds its own as text; a library's stylesheet (Charts.css) is injected as a <style> by the bundle.
const css = { name: "css", setup(b) {
  b.onLoad({ filter: /\.css$/ }, async (a) => {
    const min = (await transform(await fs.promises.readFile(a.path, "utf8"), { loader: "css", minify: true })).code.trim();
    if (a.path.includes(`${path.sep}src${path.sep}`)) return { contents: min, loader: "text" };
    return { contents: `document.head.appendChild(document.createElement("style")).textContent = ${JSON.stringify(min)};`, loader: "js" };
  });
}};
const LIBS = (process.env.BENCH_ONLY?.split(",")) ?? fs.readdirSync(at("libs")).filter((f) => /\.(js|jsx)$/.test(f) && f !== "react.js").map((f) => f.replace(/(\.solid)?\.jsx?$/, ""));
const file = (name) => fs.readdirSync(at("libs")).find((f) => f.replace(/(\.solid)?\.jsx?$/, "") === name);
const common = { bundle: true, minify: process.env.BENCH_MINIFY !== "0", platform: "browser", target: "es2020", jsx: "automatic", plugins: [solid, css],
  define: { "process.env.NODE_ENV": '"production"' }, logLevel: "error", nodePaths: [at("node_modules"), at("../node_modules")] };

const sizes = {};
for (const name of LIBS) {
  const entry = at(`out/${name}.entry.js`);
  fs.writeFileSync(entry, `import lib from "../libs/${file(name)}";\nimport { install } from "../harness.js";\ninstall(lib);\n`);
  await build({ ...common, entryPoints: [entry], outfile: at(`out/${name}.js`), format: "iife" });
  fs.writeFileSync(at(`out/${name}.html`), `<!doctype html><html><head><meta charset="utf-8"><title>${name}</title></head><body style="margin:0"><script src="${name}.js"></script></body></html>`);
  // Size: the adapter alone (the chart code an app ships), and without React, Solid or Chart.js's own framework-free core counted twice.
  const gz = async (external) => {
    const r = await build({ ...common, entryPoints: [at(`libs/${file(name)}`)], write: false, format: "esm", external });
    return zlib.gzipSync(r.outputFiles[0].contents, { level: 9 }).length;
  };
  sizes[name] = { total: await gz([]), withoutFramework: await gz(["react", "react-dom", "react-dom/*", "react/*", "solid-js", "solid-js/*"]) };
}
if (!process.env.BENCH_ONLY) fs.writeFileSync(at("out/sizes.json"), JSON.stringify(sizes, null, 2)); // a partial build keeps the full list
console.table(sizes);
