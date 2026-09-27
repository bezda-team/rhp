// npm run build: dist/index.js, the package's one module.
import fs from "fs";
import zlib from "zlib";
import { lib } from "./bundle.mjs";
await lib("src/index.js", "dist/index.js");
const js = fs.readFileSync("dist/index.js");
console.log(`dist/index.js ${js.length} B, ${zlib.gzipSync(js, { level: 9 }).length} B gzip (Solid not included)`);
