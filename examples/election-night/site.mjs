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

// The relay of the desks whose files no other site may read from a browser (server/election-calls.js), served as the
// site serves it, at /api/election-night-calls
function relay() {

  return {
    name: "election-calls",
    configureServer(server) {
      server.middlewares.use("/api/election-night-calls", async (req, res) => {
        const { handle } = await server.ssrLoadModule("/server/election-calls.js");
        const result = await handle(new Request(`http://localhost${req.originalUrl}`, { method: req.method }));
        res.writeHead(result.status, Object.fromEntries(result.headers));
        res.end(await result.text());
      });
    },
  };
}

const config = { root, configFile: false, base: "./", plugins: [solid(), relay()], server: { port: 5175, host: true } };

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
