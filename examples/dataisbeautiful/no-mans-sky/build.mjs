import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const data = JSON.parse(fs.readFileSync(path.join(here, "data.json"), "utf8"));
const fonts = [
  ["Space Grotesk", 700, "space-grotesk-700.ttf"],
  ["IBM Plex Sans", 400, "ibm-plex-sans-400.ttf"],
  ["IBM Plex Sans", 600, "ibm-plex-sans-600.ttf"],
].map(([family, weight, file]) => `@font-face { font-family: '${family}'; font-style: normal; font-weight: ${weight}; font-display: swap; src: url(data:font/ttf;base64,${fs.readFileSync(path.join(here, "assets", file)).toString("base64")}) format('truetype'); }`).join("\n");
const download = fs.readFileSync(path.join(root, "skills/rhp/references/download.md"), "utf8").match(/```html\n([\s\S]*?)\n```/)[1];
const embedded = { ...data, rows: data.rows.map(({ query, url, ...row }) => row), aggregate: { positive: data.aggregate.positive, negative: data.aggregate.negative, total: data.aggregate.total } };
const page = fs.readFileSync(path.join(here, "poster.template.html"), "utf8")
  .replace("__FONTS__", fonts)
  .replace("__DATA__", JSON.stringify(embedded))
  .replace("__DOWNLOAD__", download);
fs.writeFileSync(path.join(here, "no-mans-sky.html"), page);
console.log(`Built ${path.join(here, "no-mans-sky.html")}`);
