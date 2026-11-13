// npm run build (in react/)
//   dist/index.js              the package: one ES module with rhp's core and CSS in it; React is left to the app. It
//                              draws on a server and in a browser, and the browser can take over a server's HTML.
//   dist/rhp.css               rhp's stylesheet, for a page that links it once itself (linkedCss)
//   dist/rhp-no-css-guard.css  the same without the guard, for such a page that goes without it (noCssGuard)
//   dist/posters.css           the gallery's poster looks, for a page that wants them
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { fileURLToPath } from "url";
import { build, transform } from "esbuild";
import { coreStylesheet } from "../scripts/bundle.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const at = (f) => path.join(here, f);

// rhp's CSS files are imported as text (style.js adopts them), minified
export const cssText = {
  name: "css-text",
  setup(b) {
    b.onLoad({ filter: /\.css$/ }, async (a) => {
      const r = await transform(await fs.promises.readFile(a.path, "utf8"), { loader: "css", minify: true });
      return { contents: r.code.trim(), loader: "text" };
    });
  },
};

// The package's build options, for this script and for the tests and benchmarks that bundle the source
export const options = {
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  jsx: "automatic",
  minifySyntax: true,
  plugins: [cssText],
  external: ["react", "react-dom", "react/jsx-runtime"],
  // A Next.js app (or any app with React Server Components) draws charts in its client components
  banner: { js: '"use client";' },
  logLevel: "warning",
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.mkdirSync(at("dist"), { recursive: true });
  await build({ ...options, entryPoints: [at("src/index.js")], outfile: at("dist/index.js") });
  process.chdir(path.join(here, ".."));
  fs.writeFileSync(at("dist/rhp.css"), (await coreStylesheet()) + "\n");
  fs.writeFileSync(at("dist/rhp-no-css-guard.css"), (await coreStylesheet(false)) + "\n");
  fs.copyFileSync(at("../src/posters.css"), at("dist/posters.css"));

  for (const f of ["dist/index.js", "dist/rhp.css"]) {
    const text = fs.readFileSync(at(f));
    console.log(`react/${f} ${text.length} B, ${zlib.gzipSync(text, { level: 9 }).length} B gzip`);
  }
}
