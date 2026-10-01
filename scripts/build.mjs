// npm run build
//   dist/index.js       the package for a browser (Solid is left to the app). It can take over a server's HTML.
//   dist/server.js      the package for a server
//   dist/source/        the source, for a Solid app's own build ("solid" condition in package.json)
//   dist/rhp.css        rhp's stylesheet, for a page that links it once itself (linkedCss)
//   dist/posters.css    the gallery's poster looks, for a page that wants them (import "@bezda/rhp/posters.css")
//   dist/standalone.js  rhp and Solid in one module, for a page with no build step
//   dist/*.d.ts         the types, written by hand in src (index.d.ts, standalone.d.ts)
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { lib, server, standalone, minifiedCss, coreStylesheet } from "./bundle.mjs";

await lib("src/index.js", "dist/index.js");
await server("src/index.js", "dist/server.js");
await standalone("src/standalone.js", "dist/standalone.js");
fs.writeFileSync("dist/rhp.css", (await coreStylesheet()) + "\n");
// The poster looks are the page's CSS, not rhp's: copied as they are, comments and all, for a page to start from.
fs.copyFileSync("src/posters.css", "dist/posters.css");

// The source as it is, except the CSS files, which style.js imports as text. They become JS modules here, since an
// app's build would treat a .css import as a stylesheet for the page.
fs.rmSync("dist/source", { recursive: true, force: true });
fs.mkdirSync("dist/source", { recursive: true });
for (const f of fs.readdirSync("src")) {
  if (f.endsWith(".d.ts")) {
    fs.copyFileSync(path.join("src", f), path.join("dist", f));
    continue;
  }
  if (f === "standalone.js") continue;
  if (f === "posters.css") continue;
  if (f.endsWith(".css")) {
    const css = await minifiedCss(path.join("src", f));
    fs.writeFileSync(path.join("dist/source", f + ".js"), `// src/${f}, minified.\nexport default ${JSON.stringify(css)};\n`);
    continue;
  }
  let text = fs.readFileSync(path.join("src", f), "utf8");
  if (f === "style.js") text = text.replace(/from "\.\/(\w+)\.css";/g, 'from "./$1.css.js";');
  fs.writeFileSync(path.join("dist/source", f), text);
}

const built = [
  ["dist/index.js", "Solid not included"],
  ["dist/server.js", "for a server"],
  ["dist/standalone.js", "Solid included"],
  ["dist/rhp.css", "the stylesheet to link"],
  ["dist/posters.css", "the poster looks, if imported"],
];
for (const [f, note] of built) {
  const js = fs.readFileSync(f);
  console.log(`${f} ${js.length} B, ${zlib.gzipSync(js, { level: 9 }).length} B gzip (${note})`);
}
