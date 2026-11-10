// Puts the data, the shared CSS and the PNG exporter into the two poster pages.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const data = fs.readFileSync(path.join(here, "data.json"), "utf8");
const css = fs.readFileSync(path.join(here, "shared.css"), "utf8");
const download = fs.readFileSync(path.join(root, "skills/rhp/references/download.md"), "utf8").match(/```html\n([\s\S]*?)\n```/)[1];

for (const [template, page] of [["headliners.template.html", "msg-headliners.html"], ["rise.template.html", "macklemore-rise.html"]]) {
  const html = fs.readFileSync(path.join(here, template), "utf8")
    .replace("__SHARED_CSS__", () => css)
    .replace("__DATA__", () => data)
    .replace("__DOWNLOAD__", () => download);
  fs.writeFileSync(path.join(here, page), html);
  console.log(`Built ${page}`);
}
