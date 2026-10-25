import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const data = JSON.parse(fs.readFileSync(path.join(here, "data.json"), "utf8"));
// The page carries only what it draws: the race's repos, each frame's top ten and the weeks
const page = { start: data.start, frames: data.frames, entry: data.entry, tracked: data.tracked, captures: data.captures, weeks: data.weeks, totals: data.totals, top: data.top, leads: data.leads,
  repos: data.repos.map(({ full, created, zero, stars }) => ({ full, created, zero, stars })) };
const fonts = [
  ["Mona Sans", 400, "mona-sans-400.ttf"],
  ["Mona Sans", 600, "mona-sans-600.ttf"],
  ["Mona Sans", 700, "mona-sans-700.ttf"],
].map(([family, weight, file]) => `@font-face { font-family: '${family}'; font-style: normal; font-weight: ${weight}; font-display: swap; src: url(data:font/ttf;base64,${fs.readFileSync(path.join(here, "assets", file)).toString("base64")}) format('truetype'); }`).join("\n");
const download = fs.readFileSync(path.join(root, "skills/rhp/references/download.md"), "utf8").match(/```html\n([\s\S]*?)\n```/)[1];
const html = fs.readFileSync(path.join(here, "poster.template.html"), "utf8")
  .replace("__FONTS__", () => fonts)
  .replace("__DATA__", () => JSON.stringify(page))
  .replace("__DOWNLOAD__", () => download);
fs.writeFileSync(path.join(here, "skill-repos-race.html"), html);
console.log("Built the skill repo race");
