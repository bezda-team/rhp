// Builds one page per variant into out/: the harness, every scenario and that variant of rhp, minified like an app.
//   node build.mjs [variant,variant...]     (all variants by default)
// RHP_SRC points at another copy of rhp's src/ (a worktree of another commit), to compare commits, and AS names the
// bundle it makes (one variant at a time):
//   git worktree add ../../../rhp-master master
//   RHP_SRC=../../../rhp-master/src AS=master node build.mjs base    # out/master.js, from master's source
//   node build.mjs base                                              # out/base.js, from this working tree
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
const RHP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const { build, transform } = await import(`${RHP}/node_modules/esbuild/lib/main.js`);
const { transformAsync } = await import(`${RHP}/node_modules/@babel/core/lib/index.js`);
import { VARIANTS, applyEdits, checkEdits } from "./variants.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(process.env.RHP_SRC ?? `${RHP}/src`);
const out = path.join(here, process.env.OUT ?? "out");
fs.mkdirSync(out, { recursive: true });
const names = process.argv[2] ? process.argv[2].split(",") : Object.keys(VARIANTS);

const solidPreset = `${RHP}/node_modules/babel-preset-solid/index.js`;
const manifest = fs.existsSync(path.join(out, "manifest.json")) ? JSON.parse(fs.readFileSync(path.join(out, "manifest.json"), "utf8")) : {};

if (process.env.AS && names.length !== 1) throw new Error("AS names one bundle: build one variant at a time");

for (const name of names) {
  const variant = VARIANTS[name];
  const bundle = process.env.AS ?? name;
  if (!variant) throw new Error("no variant " + name);
  const seen = new Set();

  const plugin = {
    name: "variant",
    setup(b) {
      b.onResolve({ filter: /^rhp$/ }, () => ({ path: path.join(src, "index.js") }));
      b.onLoad({ filter: /\.(jsx?|css)$/ }, async (a) => {
        const inRhp = a.path.startsWith(src + path.sep);
        if (!inRhp && !a.path.startsWith(here + path.sep)) return undefined;
        let text = await fs.promises.readFile(a.path, "utf8");
        const file = path.basename(a.path);
        if (inRhp) {
          seen.add(file);
          text = applyEdits(variant, file, text);
        }
        if (file.endsWith(".css")) return { contents: (await transform(text, { loader: "css", minify: true })).code.trim(), loader: "text" };
        if (file.endsWith(".jsx")) {
          const r = await transformAsync(text, { presets: [[solidPreset, {}]], filename: a.path, babelrc: false, configFile: false });
          return { contents: r.code, loader: "js" };
        }
        return { contents: text, loader: "js" };
      });
    },
  };

  await build({
    entryPoints: [path.join(here, "page.js")],
    outfile: path.join(out, `${bundle}.js`),
    bundle: true,
    minify: process.env.MINIFY !== "0",
    format: "iife",
    platform: "browser",
    target: "es2022",
    plugins: [plugin],
    define: { "process.env.NODE_ENV": '"production"' },
    nodePaths: [`${RHP}/node_modules`],
    logLevel: "error",
  });
  checkEdits(variant, seen);

  fs.writeFileSync(path.join(out, `${bundle}.html`), `<!doctype html><html><head><meta charset="utf-8"><title>${bundle}</title></head>` +
    `<body style="margin:0"><div id="stage" style="width:600px;margin:8px"></div><script src="${bundle}.js"></script></body></html>`);
  const bytes = fs.readFileSync(path.join(out, `${bundle}.js`));
  manifest[bundle] = { variant: name, about: variant.about, src, sha256: crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 16), bytes: bytes.length };
  console.log(bundle.padEnd(16), manifest[bundle].sha256, bytes.length, "B");
}

fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
