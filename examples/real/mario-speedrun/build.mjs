// Builds mario-speedrun.html from the template: the data, and rhp's download block from the skill.
// usage: node build.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const data = fs.readFileSync(path.join(here, "data.json"), "utf8").trim();
const download = fs.readFileSync(path.join(root, "skills/rhp/references/download.md"), "utf8").match(/```html\n([\s\S]*?)\n```/)[1];
const page = fs.readFileSync(path.join(here, "poster.template.html"), "utf8")
  .replace("__DATA__", () => data)
  .replace("__DOWNLOAD__", () => download);
fs.writeFileSync(path.join(here, "mario-speedrun.html"), page);
console.log("Built mario-speedrun.html");
