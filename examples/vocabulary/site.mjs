// The article, built by Vite like any Solid app.
//   node site.mjs        a dev server at http://localhost:5174
//   node site.mjs build  dist/, a static site
// node_modules/@bezda/rhp links to this repository, so Vite takes rhp by its package exports as an app would
// (the "solid" condition: the source in dist/source). Run `npm run build` at the repository's root first.
// Vite, Solid and the Solid plugin come from the repository's own node_modules.
// The rappers' portraits come from cache/portraits/ (pipeline/5-portraits.mjs) and go into the page itself.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build, createServer } from "vite";
import solid from "vite-plugin-solid";

const root = path.dirname(fileURLToPath(import.meta.url));
const link = path.join(root, "node_modules/@bezda/rhp");
fs.mkdirSync(path.dirname(link), { recursive: true });
if (!fs.existsSync(link)) fs.symlinkSync(path.relative(path.dirname(link), path.join(root, "../..")), link, "dir");

// virtual:portraits: each rapper's portrait from cache/portraits/ (pipeline step 5) as a data URL, with its credit.
// Without the cache the article draws initials instead.
function portraits() {

  const id = "\0virtual:portraits";
  return {
    name: "portraits",
    resolveId: (source) => (source === "virtual:portraits" ? id : null),
    load(source) {
      if (source !== id) return null;
      const credits = JSON.parse(fs.readFileSync(path.join(root, "data/portraits.json"), "utf8"));
      const out = {};

      for (const [name, credit] of Object.entries(credits)) {
        const file = path.join(root, "cache/portraits", credit.image);
        if (!fs.existsSync(file)) continue;
        out[name] = { ...credit, src: "data:image/jpeg;base64," + fs.readFileSync(file).toString("base64") };
      }

      return `export default ${JSON.stringify(out)};`;
    },
  };
}

const config = { root, configFile: false, base: "./", plugins: [solid(), portraits()], server: { port: 5174 } };

if (process.argv[2] === "build") {
  const out = path.join(root, "dist");
  await build({ ...config, logLevel: "warn", build: { outDir: out, emptyOutDir: true } });

  // dist/vocabulary.html: the same page in one file, its script and its CSS inside it, to open from a disk or share
  let page = fs.readFileSync(path.join(out, "index.html"), "utf8");
  page = page.replace(/<script type="module" crossorigin src="\.\/([^"]+)"><\/script>/, (_, src) =>
    `<script type="module">${fs.readFileSync(path.join(out, src), "utf8").replace(/<\/script/g, "<\\/script")}</script>`);
  page = page.replace(/<link rel="stylesheet" crossorigin href="\.\/([^"]+)">/, (_, href) =>
    `<style>${fs.readFileSync(path.join(out, href), "utf8")}</style>`);
  fs.writeFileSync(path.join(out, "vocabulary.html"), page);
  console.log(`dist/vocabulary.html ${Math.round(page.length / 1024)} kB`);
} else {
  const server = await createServer(config);
  await server.listen();
  server.printUrls();
}
