// Adds the poster's fit-to-screen and PNG download block to a standalone HTML page, before </body>.
// The block is the same in every recipe; this copies it from one, so the agent never reads it.
// Usage: node scripts/add-download.mjs <page.html>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const page = process.argv[2];
if (!page || !fs.existsSync(page)) {
  console.error("Usage: node scripts/add-download.mjs <page.html> (the page must exist)");
  process.exit(1);
}

const html = fs.readFileSync(page, "utf8");
if (html.includes('id="poster-download-script"')) {
  console.log(`${page} already has the download block.`);
  process.exit(0);
}
if (!/<\/body>/i.test(html)) {
  console.error(`${page} has no </body>: add the block by hand, from <style id="poster-download-styles"> to </body> of any recipe.`);
  process.exit(1);
}

const recipe = fs.readFileSync(path.join(here, "../recipes/bar.html"), "utf8");
const start = recipe.indexOf('<style id="poster-download-styles">');
const end = recipe.lastIndexOf("</body>");
const block = recipe.slice(start, end);

// We insert before the last </body>, so a </body> inside a script or a comment is left alone.
const at = html.toLowerCase().lastIndexOf("</body>");
fs.writeFileSync(page, html.slice(0, at) + block + html.slice(at));
console.log(`Added the fit-to-screen and download block to ${page} (${block.length} characters). The poster needs the class "poster" for the block to find it.`);
