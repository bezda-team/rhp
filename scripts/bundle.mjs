// The build steps. JSX is compiled by babel-preset-solid, and rhp.css is minified and embedded as a string (style.js injects it).
import { build, transform } from "esbuild";
import { transformAsync } from "@babel/core";
import fs from "fs";

// JSX for the browser, or for a server with { generate: "ssr" }. hydratable means it can also take over a server's HTML.
// In rhp's own files, isServer (src/env.js) becomes a constant, so the build drops the code for the other side.
const jsx = (options = {}) => ({
  name: "solid",
  setup(b) {
    b.onLoad({ filter: /\.jsx$/ }, async (a) => {
      let src = await fs.promises.readFile(a.path, "utf8");
      const env = /^import \{ isServer \} from "\.\/env\.js";\n/m;
      if (env.test(src)) src = src.replace(env, "").replace(/\bisServer\b/g, String(options.generate === "ssr"));
      const r = await transformAsync(src, {
        presets: [["babel-preset-solid", options]],
        filename: a.path,
        babelrc: false,
        configFile: false,
      });
      return { contents: r.code, loader: "js" };
    });
  },
});
const solid = jsx();

const cssText = {
  name: "css-text",
  setup(b) {
    b.onLoad({ filter: /\.css$/ }, async (a) => {
      const r = await transform(await fs.promises.readFile(a.path, "utf8"), { loader: "css", minify: true });
      return { contents: r.code.trim(), loader: "text" };
    });
  },
};

// A CSS file minified, as style.js embeds it
export const minifiedCss = async (file) => {
  const r = await transform(await fs.promises.readFile(file, "utf8"), { loader: "css", minify: true });
  return r.code.trim();
};

// The stylesheet a page can link itself (dist/rhp.css): pageSheet() from style.js
export const coreStylesheet = async () => {
  const r = await build({
    stdin: { contents: 'import { pageSheet } from "./src/style.js"; export default pageSheet();', resolveDir: process.cwd(), loader: "js" },
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    plugins: [cssText],
    logLevel: "warning",
  });
  const module = await import("data:text/javascript;base64," + Buffer.from(r.outputFiles[0].text).toString("base64"));
  return module.default;
};

// A page bundle (examples and tests): one script with Solid included. Images become data URLs so a page stays one file.
export const page = (entry, outfile) => build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  format: "iife",
  minify: !process.env.DEV,
  platform: "browser",
  target: "es2020",
  plugins: [solid, cssText],
  loader: { ".svg": "dataurl", ".jpg": "dataurl" },
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
});

// rhp and Solid in one minified module, for pages with no build step
export const standalone = (entry, outfile) => build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  format: "esm",
  minify: true,
  platform: "browser",
  target: "es2020",
  plugins: [solid, cssText],
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
});

// The package: one module for the browser (it can take over a server's HTML) and one for a server. Solid is left to the app.
export const lib = (entry, outfile) => build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2020",
  minifySyntax: true,
  plugins: [jsx({ hydratable: true }), cssText],
  external: ["solid-js", "solid-js/*"],
  logLevel: "warning",
});
export const server = (entry, outfile) => build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  format: "esm",
  platform: "node",
  target: "es2020",
  minifySyntax: true,
  plugins: [jsx({ generate: "ssr", hydratable: true }), cssText],
  external: ["solid-js", "solid-js/*"],
  logLevel: "warning",
});

// A test app drawn on a server and taken over in the browser (test/ssr.jsx): the server side as a Node module with
// Solid's server build in it, and the browser side as a page script
export const ssrServer = (entry, outfile) => build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  format: "esm",
  platform: "node",
  target: "es2020",
  plugins: [jsx({ generate: "ssr", hydratable: true }), cssText],
  loader: { ".svg": "dataurl", ".jpg": "dataurl" },
  logLevel: "warning",
});
export const ssrClient = (entry, outfile) => build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  plugins: [jsx({ hydratable: true }), cssText],
  loader: { ".svg": "dataurl", ".jpg": "dataurl" },
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
});

// The same test app with the published package ("@bezda/rhp"), which picks dist/server.js or dist/index.js by its
// exports. On the server side, Node resolves it (as an app's server would).
export const ssrPackage = (entry, outfile, side) => {
  const serverOptions = { format: "esm", platform: "node", external: ["@bezda/rhp", "solid-js", "solid-js/*"] };
  const browserOptions = { format: "iife", platform: "browser", define: { "process.env.NODE_ENV": '"production"' } };
  const usePackage = {
    name: "package",
    setup(b) {
      b.onResolve({ filter: /\/src\/index\.js$/ }, (a) => {
        if (side === "server") return { path: "@bezda/rhp", external: true };
        return b.resolve("@bezda/rhp", { kind: a.kind, resolveDir: a.resolveDir });
      });
    },
  };
  return build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    target: "es2020",
    logLevel: "warning",
    ...(side === "server" ? serverOptions : browserOptions),
    plugins: [usePackage, jsx(side === "server" ? { generate: "ssr", hydratable: true } : { hydratable: true }), cssText],
  });
};
