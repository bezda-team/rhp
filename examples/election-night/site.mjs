// The article, built by Vite like any Solid app.
//   node site.mjs        a dev server at http://localhost:5175
//   node site.mjs build  dist/, a static site
// node_modules/@bezda/rhp links to this repository, so Vite takes rhp by its package exports as an app would.
// Run `npm run build` at the repository's root first. Vite, Solid and the Solid plugin come from the repository.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build, createServer } from "vite";
import solid from "vite-plugin-solid";

const root = path.dirname(fileURLToPath(import.meta.url));
const link = path.join(root, "node_modules/@bezda/rhp");
fs.mkdirSync(path.dirname(link), { recursive: true });
if (!fs.existsSync(link)) fs.symlinkSync(path.relative(path.dirname(link), path.join(root, "../..")), link, "dir");

// NBC News and CBS News send no CORS header, so the dev server relays their results files to the page
const UA = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36" };
const relay = {
  "/relay/nbc": { target: "https://www.nbcnews.com", changeOrigin: true, headers: UA, rewrite: (p) => p.replace(/^\/relay\/nbc/, "/firecracker/api/v2/national-results/2026-elections") },
  "/relay/cbs": { target: "https://www.cbsnews.com", changeOrigin: true, headers: UA, rewrite: (p) => p.replace(/^\/relay\/cbs/, "/election-api/2026") },
};

const config = { root, configFile: false, base: "./", plugins: [solid()], server: { port: 5175, host: true, proxy: relay }, preview: { port: 5176, proxy: relay } };

if (process.argv[2] === "build") {
  const out = path.join(root, "dist");
  await build({ ...config, logLevel: "warn", build: { outDir: out, emptyOutDir: true } });

  // dist/election-night.html: the same page in one file, its script and CSS inside it; the portraits stay in dist/portraits/
  let page = fs.readFileSync(path.join(out, "index.html"), "utf8");
  page = page.replace(/<script type="module" crossorigin src="\.\/([^"]+)"><\/script>/, (_, src) =>
    `<script type="module">${fs.readFileSync(path.join(out, src), "utf8").replace(/<\/script/g, "<\\/script")}</script>`);
  page = page.replace(/<link rel="stylesheet" crossorigin href="\.\/([^"]+)">/, (_, href) =>
    `<style>${fs.readFileSync(path.join(out, href), "utf8")}</style>`);
  fs.writeFileSync(path.join(out, "election-night.html"), page);
  console.log(`dist/election-night.html ${Math.round(page.length / 1024)} kB`);
} else {
  const server = await createServer(config);
  await server.listen();
  server.printUrls();
}
