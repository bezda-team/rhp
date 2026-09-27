// npm run gallery: examples/gallery/out/slat-gallery.html, one self-contained page (the core, Solid and the page inlined).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { page } from "../../scripts/bundle.mjs";
const here = path.dirname(fileURLToPath(import.meta.url)), at = (f) => path.join(here, f);
fs.mkdirSync(at("out"), { recursive: true });
// the code shown under each chart: the parts of gallery.jsx between /*<show id>*/ and /*</show>*/
const src = fs.readFileSync(at("gallery.jsx"), "utf8"), code = {};
for (const m of src.matchAll(/\/\*<show (\w+)>\*\/\n([\s\S]*?)\/\*<\/show>\*\//g)) code[m[1]] = m[2].trimEnd();
fs.writeFileSync(at("out/code.json"), JSON.stringify(code));
await page(at("page.jsx"), at("out/page.js"));
const js = fs.readFileSync(at("out/page.js"), "utf8");
if (/<\/script/i.test(js)) throw new Error("bundle contains </script>");
const html = fs.readFileSync(at("page.src.html"), "utf8").replace("/*BUNDLE*/", () => js);
fs.writeFileSync(at("out/slat-gallery.html"), "<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'></head><body>" + html + "</body></html>");
console.log(`examples/gallery/out/slat-gallery.html: ${Object.keys(code).length} charts, ${html.length} B`);
