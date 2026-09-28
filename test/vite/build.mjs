// Builds the app with Vite for the server and the browser, like a SolidStart or Astro app.
// node_modules/@bezda/rhp links to this repository, so Vite resolves rhp by its exports like it would for any app.
// Prints where @bezda/rhp resolved to on each side, as JSON.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { build, createServer } from "vite";
import solid from "vite-plugin-solid";
const root = path.dirname(fileURLToPath(import.meta.url)), out = path.join(root, "out");
const link = path.join(root, "node_modules/@bezda/rhp");
fs.mkdirSync(path.dirname(link), { recursive: true });
if (!fs.existsSync(link)) fs.symlinkSync(path.relative(path.dirname(link), path.join(root, "../..")), link, "dir");
const base = { root, configFile: false, logLevel: "error", plugins: [solid({ ssr: true })] };
const dev = await createServer({ ...base, server: { middlewareMode: true }, appType: "custom" });
const where = async (ssr) => path.relative(path.join(root, "../.."), (await dev.pluginContainer.resolveId("@bezda/rhp", path.join(root, "app.jsx"), { ssr })).id);
const resolved = { server: await where(true), browser: await where(false) };
await dev.close();
fs.rmSync(out, { recursive: true, force: true });
await build({ ...base, build: { ssr: "entry-server.jsx", outDir: path.join(out, "server"), emptyOutDir: true } });
await build({ ...base, build: { outDir: path.join(out, "client"), emptyOutDir: true, minify: true,
  rollupOptions: { input: path.join(root, "entry-client.jsx"), output: { format: "iife", entryFileNames: "client.js" } } } });
const { page } = await import(path.join(out, "server/entry-server.js"));
fs.writeFileSync(path.join(out, "page.html"), page());
console.log(JSON.stringify(resolved));
