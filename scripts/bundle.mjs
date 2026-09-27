// Shared build step: JSX compiled by babel-preset-solid, rhp.css minified and embedded as a string (style.js injects it).
import { build, transform } from "esbuild";
import { transformAsync } from "@babel/core";
import fs from "fs";

// JSX for the browser, or with { generate: "ssr" } for a server; hydratable: it can also take over a server's HTML.
// isServer (src/env.js) becomes a constant in each file, so the build drops the code for the other side.
const jsx = (options = {}) => ({ name: "solid", setup(b) {
  b.onLoad({ filter: /\.jsx$/ }, async (a) => {
    const src = (await fs.promises.readFile(a.path, "utf8"))
      .replace(/^import \{ isServer \} from "\.\/env\.js";\n/m, "").replace(/\bisServer\b/g, String(options.generate === "ssr"));
    const r = await transformAsync(src, { presets: [["babel-preset-solid", options]], filename: a.path, babelrc: false, configFile: false });
    return { contents: r.code, loader: "js" };
  });
}});
const solid = jsx();
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

// The standalone module: rhp and Solid in one minified ES module, for pages with no build step.
export const standalone = (entry, outfile) => build({
  entryPoints: [entry], outfile, bundle: true, format: "esm", minify: true, platform: "browser", target: "es2020",
  plugins: [solid, cssText], define: { "process.env.NODE_ENV": '"production"' }, logLevel: "warning",
});

// The package: one ES module, Solid left to the app. The browser's can take over a server's HTML (hydrate); the
// server's writes a chart as HTML (renderToString), for the same app's server.
export const lib = (entry, outfile) => build({
  entryPoints: [entry], outfile, bundle: true, format: "esm", platform: "browser", target: "es2020", minifySyntax: true,
  plugins: [jsx({ hydratable: true }), cssText], external: ["solid-js", "solid-js/*"], logLevel: "warning",
});
export const server = (entry, outfile) => build({
  entryPoints: [entry], outfile, bundle: true, format: "esm", platform: "node", target: "es2020", minifySyntax: true,
  plugins: [jsx({ generate: "ssr", hydratable: true }), cssText], external: ["solid-js", "solid-js/*"], logLevel: "warning",
});

// A test app drawn on a server and taken over in the browser (test/ssr.jsx): the server's side as a Node module with
// Solid's server build in it, and the browser's as a page script that hydrates.
export const ssrServer = (entry, outfile) => build({
  entryPoints: [entry], outfile, bundle: true, format: "esm", platform: "node", target: "es2020",
  plugins: [jsx({ generate: "ssr", hydratable: true }), cssText], logLevel: "warning",
});
export const ssrClient = (entry, outfile) => build({
  entryPoints: [entry], outfile, bundle: true, format: "iife", platform: "browser", target: "es2020",
  plugins: [jsx({ hydratable: true }), cssText], define: { "process.env.NODE_ENV": '"production"' }, logLevel: "warning",
});
// The same test app with the published package: rhp as the package itself ("@bezda/rhp"), which picks dist/server.js
// or dist/index.js by its exports. The server's is left for Node to resolve, as an app's server would; the browser's
// is bundled with the browser's conditions.
export const ssrPackage = (entry, outfile, side) => build({
  entryPoints: [entry], outfile, bundle: true, target: "es2020", logLevel: "warning",
  ...(side === "server" ? { format: "esm", platform: "node", external: ["@bezda/rhp", "solid-js", "solid-js/*"] }
    : { format: "iife", platform: "browser", define: { "process.env.NODE_ENV": '"production"' } }),
  plugins: [{ name: "package", setup(b) { b.onResolve({ filter: /\/src\/index\.js$/ }, (a) => (side === "server" ? { path: "@bezda/rhp", external: true } : b.resolve("@bezda/rhp", { kind: a.kind, resolveDir: a.resolveDir }))); } },
    jsx(side === "server" ? { generate: "ssr", hydratable: true } : { hydratable: true }), cssText],
});
