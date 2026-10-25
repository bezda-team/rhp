// Gzip bytes a piece of rhp costs a bar chart app: the bundle built with that piece taken out, against the whole.
// Each variant is a copy of src/ with one edit (checked to apply), built with isServer folded as rhp's build does.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const here = path.dirname(new URL(import.meta.url).pathname);
const SRC = path.resolve(here, "../../src");
const edit = (file, find, replace) => ({ file, find, replace });
const VARIANTS = {
  whole: [],
  "no gutters.css + cross.css text": [edit("style.js", 'import GUTTERS from "./gutters.css";\nimport CROSS from "./cross.css";', 'const GUTTERS = "";\nconst CROSS = "";')],
  "no manydots.css in the core sheet": [edit("style.js", 'import MANYDOTS from "./manydots.css";', 'const MANYDOTS = "";')],
  "no rhp.css text": [edit("style.js", 'import CORE from "./rhp.css";', 'const CORE = "";')],
  "no console.warn messages": "warn",
};
const results = {};
for (const [name, edits] of Object.entries(VARIANTS)) {
  const dir = path.join(here, "out", "size-variants", name.replace(/[^a-z0-9]+/gi, "-"), "src");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.cpSync(SRC, dir, { recursive: true });
  if (edits === "warn") {
    // every console.warn(...) call with its message becomes void 0 (balanced parentheses, strings respected)
    let n = 0;
    for (const f of fs.readdirSync(dir).filter((f) => /\.(js|jsx)$/.test(f))) {
      let t = fs.readFileSync(path.join(dir, f), "utf8");
      let i;
      while ((i = t.indexOf("console.warn(")) >= 0) {
        let j = i + "console.warn(".length, depth = 1, q = null;
        for (; j < t.length && depth; j++) {
          const c = t[j];
          if (q) { if (c === "\\") j++; else if (c === q) q = null; continue; }
          if (c === '"' || c === "'" || c === "`") q = c; else if (c === "(") depth++; else if (c === ")") depth--;
        }
        t = t.slice(0, i) + "void 0" + t.slice(j);
        n++;
      }
      fs.writeFileSync(path.join(dir, f), t);
    }
    console.log(`  (${n} console.warn calls removed)`);
  } else {
    for (const e of edits) {
      const f = path.join(dir, e.file), t = fs.readFileSync(f, "utf8");
      if (t.split(e.find).length !== 2) throw new Error("edit not found: " + e.find);
      fs.writeFileSync(f, t.replace(e.find, e.replace));
    }
  }
  const out = execFileSync("node", [path.join(here, "bundle-audit.mjs"), "bars"], { env: { ...process.env, FOLD: "1", RHP_SRC: dir }, encoding: "utf8" });
  const m = out.match(/(\d+) B minified, (\d+) B gzip/);
  results[name] = { min: +m[1], gz: +m[2] };
}
const w = results.whole;
for (const [name, r] of Object.entries(results)) console.log(`${name.padEnd(36)} ${String(r.min).padStart(6)} B min ${String(r.gz).padStart(6)} B gz   saves ${w.min - r.min} B min, ${w.gz - r.gz} B gz`);
fs.mkdirSync(path.join(here, "results"), { recursive: true });
fs.writeFileSync(path.join(here, "results", "size.json"), JSON.stringify(results, null, 2));
