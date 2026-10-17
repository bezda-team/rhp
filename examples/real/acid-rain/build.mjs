import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const fonts = [
  ["Barlow Condensed", 700, "barlow-condensed-700.ttf"],
  ["IBM Plex Sans", 400, "ibm-plex-sans-400.ttf"],
  ["IBM Plex Sans", 600, "ibm-plex-sans-600.ttf"],
].map(([family, weight, file]) => `@font-face {font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url(data:font/ttf;base64,${fs.readFileSync(path.join(here,"assets",file)).toString("base64")}) format('truetype');}`).join("\n");
const download = fs.readFileSync(path.join(root, "skills/rhp/references/download.md"), "utf8").match(/```html\n([\s\S]*?)\n```/)[1];
const template = fs.readFileSync(path.join(here, "poster.template.html"), "utf8")
  .replace("__FONTS__", fonts)
  .replace("__DATA__", JSON.stringify(JSON.parse(fs.readFileSync(path.join(here,"data.json"), "utf8"))))
  .replace("__DOWNLOAD__", download);
fs.writeFileSync(path.join(here, "acid-rain.html"), template.replace("__VARIANT_STYLES__", "").replace("__PHOTO__", "null"));
const background = fs.readFileSync(path.join(here, "assets/rain-on-glass.png")).toString("base64");
const photoBackgroundStyles = `
.poster {
 position:relative;isolation:isolate;background-color:#04141e;
}
.poster-photo {position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.44;z-index:-1;pointer-events:none;}
.poster .rhp-chart {background:transparent;}
`;
const photoStyles = photoBackgroundStyles + `.poster .readout {background:rgb(7 28 40 / .42);padding-inline:14px;}
.poster .note {background:rgb(7 28 40 / .42);padding:14px;}
@media (max-width:640px) {.poster .readout {padding-inline:8px;} .poster .note {padding:12px 8px;}}
`;
fs.writeFileSync(path.join(here, "acid-rain-glass.html"), template.replace("__VARIANT_STYLES__", photoStyles).replace("__PHOTO__", JSON.stringify(`data:image/png;base64,${background}`)));
fs.writeFileSync(path.join(here, "acid-rain-glass-normal.html"), template.replace("__VARIANT_STYLES__", photoBackgroundStyles).replace("__PHOTO__", JSON.stringify(`data:image/png;base64,${background}`)));
console.log("Built three acid-rain poster variants");
