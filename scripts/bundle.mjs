// Shared build step: JSX compiled by babel-preset-solid, rhp.css minified and embedded as a string (style.js injects it).
import { build, transform } from "esbuild";
import { transformAsync } from "@babel/core";
import fs from "fs";

const solid = { name: "solid", setup(b) {
  b.onLoad({ filter: /\.jsx$/ }, async (a) => {
    const src = await fs.promises.readFile(a.path, "utf8");
    const r = await transformAsync(src, { presets: [["babel-preset-solid", {}]], filename: a.path, babelrc: false, configFile: false });
    return { contents: r.code, loader: "js" };
  });
}};
const cssText = { name: "css-text", setup(b) {
  b.onLoad({ filter: /\.css$/ }, async (a) => {
    const r = await transform(await fs.promises.readFile(a.path, "utf8"), { loader: "css", minify: true });
    return { contents: r.code.trim(), loader: "text" };
  });
}};

// A page bundle (examples, tests): Solid included, one IIFE. Imported images become data URLs, so a page stays one file.
export const page = (entry, outfile) => build({
  entryPoints: [entry], outfile, bundle: true, format: "iife", minify: !process.env.DEV, platform: "browser", target: "es2020",
  plugins: [solid, cssText], loader: { ".svg": "dataurl", ".jpg": "dataurl" }, define: { "process.env.NODE_ENV": '"production"' }, logLevel: "warning",
});

// The package: one ES module, Solid left to the app.
export const lib = (entry, outfile) => build({
  entryPoints: [entry], outfile, bundle: true, format: "esm", platform: "browser", target: "es2020",
  plugins: [solid, cssText], external: ["solid-js", "solid-js/*"], logLevel: "warning",
});
