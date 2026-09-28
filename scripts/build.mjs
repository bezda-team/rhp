// npm run build:
//   dist/index.js       the package's module for a browser (Solid left to the app), able to take over a server's HTML
//   dist/server.js      the same for a server; package.json picks it where Solid picks its own server build
//   dist/source/        the source, for a Solid app's own build (package.json's "solid" condition): SolidStart, Astro and
//                       Vite with vite-plugin-solid compile it as the app needs, for a server, a browser or both
//   dist/rhp.css        rhp's stylesheet (the core and the gutters), for a page that links it once itself (linkedCss)
//   dist/standalone.js  rhp and Solid in one module, for a page with no build step
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { lib, server, standalone, minifiedCss, coreStylesheet } from "./bundle.mjs";
await lib("src/index.js", "dist/index.js");
await server("src/index.js", "dist/server.js");
await standalone("src/standalone.js", "dist/standalone.js");
fs.writeFileSync("dist/rhp.css", (await coreStylesheet()) + "\n");
// The source as it is, but for rhp.css: style.js imports it as text, which is a JS module here (an app's build would
// treat a .css import as a stylesheet for the page).
fs.rmSync("dist/source", { recursive: true, force: true });
fs.mkdirSync("dist/source", { recursive: true });
for (const f of fs.readdirSync("src")) {
  if (f === "standalone.js") continue;
  if (f.endsWith(".css")) { // as text, in a JS module: style.js makes rhp's stylesheets from it
    fs.writeFileSync(path.join("dist/source", f + ".js"), `// src/${f}, minified.\nexport default ${JSON.stringify(await minifiedCss(path.join("src", f)))};\n`);
    continue;
  }
  let text = fs.readFileSync(path.join("src", f), "utf8");
  if (f === "style.js") text = text.replace(/from "\.\/(\w+)\.css";/g, 'from "./$1.css.js";');
  fs.writeFileSync(path.join("dist/source", f), text);
}
for (const [f, note] of [["dist/index.js", "Solid not included"], ["dist/server.js", "for a server"], ["dist/standalone.js", "Solid included"], ["dist/rhp.css", "the stylesheet to link"]]) {
  const js = fs.readFileSync(f);
  console.log(`${f} ${js.length} B, ${zlib.gzipSync(js, { level: 9 }).length} B gzip (${note})`);
}
