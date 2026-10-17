// The download reference is both the agent's paste-ready block and the source of every recipe's controls.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = fileURLToPath(new URL("..", import.meta.url));
export const downloadBlock = fs.readFileSync(path.join(root, "skills/rhp/references/download.md"), "utf8").match(/```html\n([\s\S]*?)\n```/)[1];

export function withPosterDownload(html) {
  const clean = html.replace(/\n?<style id="poster-download-styles">[\s\S]*?<\/style>\n?/g, "\n")
    .replace(/\n?<script type="module" id="poster-download-script">[\s\S]*?<\/script>\n?/g, "\n");
  return clean.replace(/\s*<\/body>/, `\n${downloadBlock}\n</body>`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const recipes = path.join(root, "skills/rhp/recipes");
  for (const file of fs.readdirSync(recipes).filter(file => file.endsWith(".html"))) {
    const target = path.join(recipes, file);
    fs.writeFileSync(target, withPosterDownload(fs.readFileSync(target, "utf8")));
  }
  const posters = execFileSync("git", ["ls-files", "--", "examples/**/*.html"], {cwd:root,encoding:"utf8"}).trim().split("\n").filter(Boolean);
  let count = 0;
  for (const file of posters) {
    const target = path.join(root, file), html = fs.readFileSync(target, "utf8");
    if (!html.includes('id="poster-download-script"')) continue;
    fs.writeFileSync(target, withPosterDownload(html)); count++;
  }
  console.log(`Updated shared poster controls in every recipe and ${count} example posters.`);
}
