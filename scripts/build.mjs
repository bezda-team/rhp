// npm run build: dist/index.js, the package's module (Solid left to the app), and dist/standalone.js (Solid included).
import fs from "fs";
import zlib from "zlib";
import { lib, standalone } from "./bundle.mjs";
await lib("src/index.js", "dist/index.js");
await standalone("src/standalone.js", "dist/standalone.js");
for (const [f, note] of [["dist/index.js", "Solid not included"], ["dist/standalone.js", "Solid included"]]) {
  const js = fs.readFileSync(f);
  console.log(`${f} ${js.length} B, ${zlib.gzipSync(js, { level: 9 }).length} B gzip (${note})`);
}
