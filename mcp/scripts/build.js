// Copies the rhp skill (../skills/rhp) into skill/, which the published package serves, and rhp's LICENSE, which npm
// packs only from this folder. npm pack runs it first (prepack). Dotfiles and dot folders (.DS_Store, a recipe's
// .preview) are left out.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const FROM = path.join(here, "../../skills/rhp");
const TO = path.join(here, "../skill");

// Copies a folder without its dotfiles; returns how many files it copied
function copy(from, to) {

  let count = 0;
  fs.mkdirSync(to, { recursive: true });

  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory()) {
      count += copy(path.join(from, entry.name), path.join(to, entry.name));
    } else if (entry.isFile()) {
      fs.copyFileSync(path.join(from, entry.name), path.join(to, entry.name));
      count++;
    }
  }

  return count;
}

if (!fs.existsSync(path.join(FROM, "SKILL.md"))) {
  console.error(`build: there is no skill to copy (${path.join(FROM, "SKILL.md")} is missing)`);
  process.exit(1);
}

fs.rmSync(TO, { recursive: true, force: true });
const count = copy(FROM, TO);
fs.copyFileSync(path.join(here, "../../LICENSE"), path.join(here, "../LICENSE"));

console.error(`build: copied the skill's ${count} files to skill/, and rhp's LICENSE`);
