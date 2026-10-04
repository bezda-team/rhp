// What the browser loads. An html page loads rhp from a CDN, and the checker answers with a guarded standalone module
// (built here once, and kept in the OS temp dir). A solid, react or module file is bundled here with the guard, rhp,
// Solid (and React) into one script, which a page the checker writes loads.
// One Solid: the user's code, rhp and the guard must share one copy of solid-js, or reactivity silently breaks. Every
// import of solid-js (and of react) resolves to one copy: the user's project's if their file's folder resolves one,
// else the checker's own.
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import * as esbuild from "esbuild";

const here = path.dirname(fileURLToPath(import.meta.url));
const GUARD = path.join(here, "../guard");
const OWN = path.join(here, "../..");

const cacheDir = () => path.join(os.tmpdir(), "rhp-check-cache");

// A package as Node finds it from a folder (walking up through node_modules): its folder, and the folder whose
// node_modules holds it (resolving its name from there finds this copy). Null if there is none.
function findPackage(name, from) {

  let dir = path.resolve(from);

  for (;;) {
    const candidate = path.join(dir, "node_modules", name, "package.json");
    if (fs.existsSync(candidate)) return { root: fs.realpathSync(path.dirname(candidate)), base: dir };
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

const versionOf = (root) => JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;

// The packages a check uses: the user's where their folder has them, else the checker's
export function packages(dir) {

  const pick = (name) => {
    const user = findPackage(name, dir);
    const found = user ?? findPackage(name, OWN);
    return found && { ...found, version: versionOf(found.root), user: !!user };
  };

  return { rhp: pick("@bezda/rhp"), solid: pick("solid-js"), react: pick("react"), reactDom: pick("react-dom") };
}

// The JSX of a file's project, from the nearest package.json that names react, solid-js or vite-plugin-solid: "react"
// for react without solid-js, "solid" for solid-js (or its Vite plugin) without react, else null
function projectJsx(file) {

  for (let dir = path.dirname(path.resolve(file)); ; dir = path.dirname(dir)) {
    const json = path.join(dir, "package.json");
    if (fs.existsSync(json)) {
      let pkg = {};
      try {
        pkg = JSON.parse(fs.readFileSync(json, "utf8"));
      } catch {
        // a package.json that doesn't parse says nothing
      }
      const deps = { ...pkg.peerDependencies, ...pkg.devDependencies, ...pkg.dependencies };
      const react = "react" in deps;
      const solid = "solid-js" in deps || "vite-plugin-solid" in deps;
      if (react || solid) return react === solid ? null : react ? "react" : "solid";
    }
    if (path.dirname(dir) === dir) return null;
  }
}

// The format of a file: html, solid, react or module. A .jsx or .tsx file is React or Solid as its project says, then
// as its imports say (a React file with the automatic JSX runtime imports nothing from react).
export function detectFormat(file, text) {

  const ext = path.extname(file ?? "").toLowerCase();
  const imports = [...text.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map((m) => m[1]);
  const uses = (re) => imports.some((x) => re.test(x));
  const react = uses(/^(react|react-dom|preact)(\/|$)|^@bezda\/rhp-react$|^next(\/|$)/);

  if (ext === ".html" || ext === ".htm") return "html";
  if (!ext && /^\s*(<!doctype html|<html|<head|<body)/i.test(text)) return "html";
  if (ext === ".jsx" || ext === ".tsx") return projectJsx(file) ?? (react ? "react" : "solid");
  if (react) return "react";
  if (!ext && /<[A-Z][\w.]*[\s/>]/.test(text) && !uses(/^@bezda\/rhp\/standalone$/)) return "solid";

  return "module";
}

// The export list of rhp's standalone module, for the guarded one: rhp's own, then Solid's, as standalone.d.ts says
function standaloneSource(rhpRoot, guard) {

  const types = fs.readFileSync(path.join(rhpRoot, "dist/standalone.d.ts"), "utf8");
  const lines = types.split("\n").filter((l) => /^export\b/.test(l));
  const out = [];

  for (const line of lines) {
    if (/from "\.\/index\.js"/.test(line)) out.push(line.replace('"./index.js"', '"@bezda/rhp"'));
    else if (guard && /export \{ render \} from "solid-js\/web"/.test(line)) out.push(`export { render } from ${JSON.stringify(path.join(GUARD, "render.js"))};`);
    else out.push(line);
  }

  return out.join("\n") + "\n";
}

// A file's text, hashed with whatever else decides what is built from it
const hash = (...parts) => crypto.createHash("sha1").update(parts.join("\0")).digest("hex").slice(0, 16);

function guardHash() {

  const files = fs.readdirSync(GUARD).sort().map((f) => fs.readFileSync(path.join(GUARD, f), "utf8"));

  return hash(...files, fs.readFileSync(fileURLToPath(import.meta.url), "utf8"));
}

let babel;
async function compileSolid(file, text, rhpSource) {

  babel ??= { core: await import("@babel/core"), preset: (await import("babel-preset-solid")).default };
  let src = text;

  // As rhp's own build does: isServer becomes a constant in rhp's source
  const env = /^import \{ isServer \} from "\.\/env\.js";\n/m;
  if (rhpSource && env.test(src)) src = src.replace(env, "").replace(/\bisServer\b/g, "false");

  if (/\.tsx$/.test(file)) src = (await esbuild.transform(src, { loader: "tsx", jsx: "preserve", sourcefile: file })).code;

  const key = hash(file, src, babel.core.version, versionOf(findPackage("babel-preset-solid", OWN).root));
  const cached = path.join(cacheDir(), "babel", key + ".js");
  if (fs.existsSync(cached)) return fs.readFileSync(cached, "utf8");

  const out = await babel.core.transformAsync(src, { presets: [[babel.preset, {}]], filename: file, babelrc: false, configFile: false, sourceMaps: "inline" });
  fs.mkdirSync(path.dirname(cached), { recursive: true });
  fs.writeFileSync(cached, out.code);

  return out.code;
}

const ASSETS = [".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico", ".bmp", ".woff", ".woff2", ".ttf", ".otf", ".eot", ".mp4", ".webm", ".mp3", ".wav"];
const PINNED = /^(solid-js|react|react-dom|scheduler)(\/.*)?$/;
const SKIP = { rhpCheckSkip: true };

// esbuild plugins: rhp (guarded or not) and one copy of Solid and React, Solid's JSX, and Vite's ?url, ?raw, ?inline
function plugins({ format, guard, pkgs, rhpSource }) {

  const roots = { "solid-js": pkgs.solid, react: pkgs.react, "react-dom": pkgs.reactDom };
  const rhpRoot = pkgs.rhp.root;
  const rhpExports = JSON.parse(fs.readFileSync(path.join(rhpRoot, "package.json"), "utf8")).exports ?? {};
  const inRhp = (p) => p.startsWith(path.join(rhpRoot, "dist") + path.sep);

  const resolveRhp = (sub) => {
    const entry = rhpExports["./" + sub];
    const target = typeof entry === "string" ? entry : entry?.default ?? entry?.browser ?? entry?.import;
    return target ? path.join(rhpRoot, target) : path.join(rhpRoot, "dist", sub);
  };

  const pin = {
    name: "rhp-check-pin",
    setup(b) {
      b.onResolve({ filter: PINNED }, async (a) => {
        if (a.pluginData?.rhpCheckSkip) return undefined;
        const name = a.path.match(PINNED)[1];
        const pkg = roots[name] ?? (name === "scheduler" ? roots["react-dom"] : null);
        if (!pkg) return undefined;
        const r = await b.resolve(a.path, { kind: a.kind, resolveDir: pkg.base, pluginData: SKIP });
        return r.errors.length ? undefined : { path: r.path, sideEffects: r.sideEffects };
      });
    },
  };

  const rhp = {
    name: "rhp-check-rhp",
    setup(b) {
      b.onResolve({ filter: /^@bezda\/rhp(\/.*)?$|^rhp-check:/ }, (a) => {
        if (a.path === "rhp-check:rhp") return { path: path.join(rhpRoot, "dist/source/index.js") };
        if (a.path === "@bezda/rhp") return { path: guard ? path.join(GUARD, "rhp.js") : path.join(rhpRoot, "dist/source/index.js") };
        if (a.path === "@bezda/rhp/standalone") return { path: "standalone", namespace: "rhp-check" };
        if (a.path.startsWith("@bezda/rhp/")) return { path: resolveRhp(a.path.slice("@bezda/rhp/".length)) };
        return undefined;
      });
      b.onLoad({ filter: /^standalone$/, namespace: "rhp-check" }, () => ({ contents: standaloneSource(rhpRoot, guard), loader: "js", resolveDir: GUARD }));
    },
  };

  const solidJsx = {
    name: "rhp-check-solid-jsx",
    setup(b) {
      b.onLoad({ filter: /\.(jsx|tsx)$/ }, async (a) => {
        const ours = inRhp(a.path);
        if (!ours && (format !== "solid" || a.path.includes(`${path.sep}node_modules${path.sep}`))) return undefined;
        const text = await fs.promises.readFile(a.path, "utf8");
        try {
          return { contents: await compileSolid(a.path, text, ours && rhpSource), loader: "js", resolveDir: path.dirname(a.path) };
        } catch (e) {
          return { errors: [{ text: (e.message ?? String(e)).replace(/^[^:]*: /, "").split("\n")[0], location: e.loc ? { file: a.path, line: e.loc.line, column: e.loc.column } : null }] };
        }
      });
    },
  };

  const vite = {
    name: "rhp-check-vite-queries",
    setup(b) {
      b.onResolve({ filter: /\?(url|raw|inline)$/ }, (a) => {
        const [file, query] = a.path.split("?");
        return { path: path.resolve(a.resolveDir, file), namespace: "rhp-check-asset", pluginData: { query } };
      });
      b.onLoad({ filter: /.*/, namespace: "rhp-check-asset" }, async (a) => ({
        contents: await fs.promises.readFile(a.path),
        loader: a.pluginData.query === "raw" ? "text" : a.pluginData.query === "inline" ? "dataurl" : "file",
        resolveDir: path.dirname(a.path),
      }));
    },
  };

  return [pin, rhp, solidJsx, vite];
}

// The code that mounts a file's component: the default export, or the only exported component, into #root (#chart for a
// module), unless importing the file already drew into it
function entrySource(file, format) {

  const target = format === "module" ? "chart" : "root";
  const pickCode = `
const target = document.getElementById(${JSON.stringify(target)});
const candidates = Object.entries(M).filter(([name, v]) => (name === "default" || /^[A-Z]/.test(name)) && (typeof v === "function" || (v && typeof v === "object" && v.$$typeof)) && !v.scope && !v.layout && v.css === undefined);
const component = typeof M.default === "function" || (M.default && M.default.$$typeof) ? M.default : candidates.length === 1 ? candidates[0][1] : null;
const store = (globalThis.__rhpCheck ??= { findings: [] });
if (component == null && candidates.length > 1) store.findings.push({ level: "error", code: "no-component", message: "The file exports several components (" + candidates.map((c) => c[0]).join(", ") + ") and no default one, so the checker can't tell which is the chart.", fix: "Export the chart component as the default export: export default function Chart() { ... }." });
const drawn = target.childNodes.length > 0;
`;

  if (format === "solid") {
    return `import * as M from ${JSON.stringify(file)};
import { render, createComponent } from "solid-js/web";
${pickCode}
if (component && !drawn) render(() => createComponent(component, {}), target);
`;
  }

  if (format === "react") {
    return `import * as M from ${JSON.stringify(file)};
import { createElement } from "react";
import { createRoot } from "react-dom/client";
${pickCode}
if (component && !drawn) createRoot(target).render(createElement(component));
`;
  }

  return `import * as M from ${JSON.stringify(file)};
import { render } from "@bezda/rhp/standalone";
${pickCode}
if (component && !drawn) render(() => component({}), target);
`;
}

// Bundles a solid, react or module file. Returns the files the page loads (path -> { body, type }), its HTML, and the
// problems found while building (syntax errors, imports that don't resolve).
export async function bundle({ file, format, guard = true }) {

  const dir = path.dirname(file);
  const pkgs = packages(dir);

  const options = {
    stdin: { contents: entrySource(file, format), resolveDir: dir, sourcefile: "rhp-check-entry.js", loader: "js" },
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    target: "es2022",
    outdir: "/rhp-check-out",
    entryNames: "bundle",
    assetNames: "[name]-[hash]",
    publicPath: "/__rhp/",
    sourcemap: "inline",
    plugins: plugins({ format, guard, pkgs, rhpSource: true }),
    loader: Object.fromEntries([...ASSETS.map((e) => [e, "file"]), [".module.css", "local-css"]]),
    define: { "process.env.NODE_ENV": '"production"' },
    nodePaths: [path.join(OWN, "node_modules")],
    jsx: "automatic",
    jsxImportSource: "react",
    logLevel: "silent",
  };

  try {
    const result = await esbuild.build(options);
    const files = new Map();

    for (const out of result.outputFiles) {
      const name = path.basename(out.path);
      files.set("/__rhp/" + name, { body: Buffer.from(out.contents), type: contentType(name) });
    }

    const css = files.has("/__rhp/bundle.css") ? '<link rel="stylesheet" href="/__rhp/bundle.css">\n' : "";
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>rhp check</title>
${css}</head>
<body>
<div id="${format === "module" ? "chart" : "root"}"></div>
<script type="module" src="/__rhp/bundle.js"></script>
</body>
</html>
`;

    return { ok: true, files, html, problems: [] };
  } catch (e) {
    return { ok: false, files: new Map(), html: "", problems: buildProblems(e, dir) };
  }
}

// esbuild's errors as findings
function buildProblems(e, dir) {

  const errors = e.errors ?? [{ text: e.message ?? String(e) }];

  return errors.map((err) => {
    const loc = err.location;
    const where = loc?.file ? `${path.relative(dir, path.resolve(dir, loc.file)) || loc.file}:${loc.line}:${loc.column + 1}` : "";
    const missing = err.text.match(/^Could not resolve "([^"]+)"/);
    if (missing) {
      return {
        level: "error",
        code: "missing-import",
        message: `${where ? where + ": " : ""}${err.text}.`,
        fix: missing[1].startsWith(".") ? `Fix the path, or add the file ${missing[1]}.` : `Install ${missing[1]} in the project (npm install ${missing[1].split("/").slice(0, missing[1].startsWith("@") ? 2 : 1).join("/")}), or import it from a package the project has.`,
      };
    }
    return {
      level: "error",
      code: "syntax-error",
      message: `${where ? where + ": " : ""}${err.text}${loc?.lineText ? ` (${loc.lineText.trim().slice(0, 120)})` : ""}.`,
      fix: "Fix the code at that line: the file must parse before anything can be drawn.",
    };
  });
}

export const contentType = (name) => ({
  ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".html": "text/html", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".webp": "image/webp", ".avif": "image/avif", ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2",
  ".ttf": "font/ttf", ".otf": "font/otf", ".map": "application/json", ".txt": "text/plain", ".csv": "text/csv",
}[path.extname(name).toLowerCase()] ?? "application/octet-stream");

// rhp's standalone module with the guard in it, for html pages: built once per rhp, Solid and guard, and kept on disk
export async function guardedStandalone(pkgs) {

  const key = hash(pkgs.rhp.root, pkgs.rhp.version, pkgs.solid.root, pkgs.solid.version, esbuild.version, guardHash());
  const file = path.join(cacheDir(), `standalone-${pkgs.rhp.version}-${key}.js`);
  if (fs.existsSync(file)) return file;

  const result = await esbuild.build({
    stdin: { contents: 'export * from "@bezda/rhp/standalone";', resolveDir: GUARD, sourcefile: "rhp-check-standalone.js", loader: "js" },
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    target: "es2020",
    minify: true,
    plugins: plugins({ format: "module", guard: true, pkgs, rhpSource: true }),
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "silent",
  });

  fs.mkdirSync(cacheDir(), { recursive: true });
  const tmp = file + "." + process.pid + ".tmp";
  fs.writeFileSync(tmp, result.outputFiles[0].contents);
  fs.renameSync(tmp, file);

  return file;
}

// Problems an html page has before it runs: a script that doesn't parse, rhp loaded by a plain script tag, a bare
// import with no import map
export async function htmlProblems(file, text) {

  const problems = [];
  const lineAt = (index) => text.slice(0, index).split("\n").length;
  const scripts = [...text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
  const importMap = scripts.find((m) => /type\s*=\s*["']?importmap/i.test(m[1]));
  let mapped = {};

  if (importMap) {
    try {
      mapped = JSON.parse(importMap[2]).imports ?? {};
    } catch (e) {
      problems.push({ level: "error", code: "syntax-error", message: `${path.basename(file)}:${lineAt(importMap.index)}: the import map is not valid JSON (${e.message}).`, fix: "Write the import map as JSON: { \"imports\": { \"@bezda/rhp/standalone\": \"https://cdn.jsdelivr.net/npm/@bezda/rhp@2/dist/standalone.js\" } }." });
    }
  }

  for (const m of scripts) {
    const attrs = m[1];
    const src = attrs.match(/\bsrc\s*=\s*["']?([^"'\s>]+)/i)?.[1];
    const module = /type\s*=\s*["']?module/i.test(attrs);
    if (/importmap|json|text\/(?!javascript)/i.test(attrs.match(/type\s*=\s*["']?([^"'\s>]+)/i)?.[1] ?? "")) continue;

    if (src && /@bezda\/rhp/.test(src) && !module) {
      problems.push({
        level: "error",
        code: "plain-script-tag",
        message: `${path.basename(file)}:${lineAt(m.index)}: rhp is loaded with a plain <script src="${src}">, but it is an ES module, so the browser can't run it.`,
        fix: 'Load it with an import map and a module script: <script type="importmap">{ "imports": { "@bezda/rhp/standalone": "https://cdn.jsdelivr.net/npm/@bezda/rhp@2/dist/standalone.js" } }</script>, then <script type="module">import { Chart, html, render } from "@bezda/rhp/standalone"; ...</script>.',
      });
      continue;
    }

    if (src || !m[2].trim()) continue;

    const body = m[2];
    const start = lineAt(m.index + m[0].indexOf(">") + 1);
    try {
      await esbuild.transform(body, { loader: "js", format: module ? "esm" : undefined, logLevel: "silent" });
    } catch (e) {
      const err = e.errors?.[0];
      if (err) {
        const line = start + (err.location?.line ?? 1) - 1;
        problems.push({ level: "error", code: "syntax-error", message: `${path.basename(file)}:${line}:${(err.location?.column ?? 0) + 1}: ${err.text}${err.location?.lineText ? ` (${err.location.lineText.trim().slice(0, 120)})` : ""}.`, fix: "Fix the script at that line: it must parse before anything can be drawn." });
      }
    }

    if (module) {
      for (const [, spec] of body.matchAll(/(?:from|import)\s*\(?\s*["']([^"'./][^"']*)["']/g)) {
        if (/^(https?:|data:|blob:)/.test(spec) || spec in mapped || Object.keys(mapped).some((k) => k.endsWith("/") && spec.startsWith(k))) continue;
        problems.push({
          level: "error",
          code: "missing-import-map",
          message: `${path.basename(file)}:${start}: the module script imports "${spec}", but no import map says where it comes from.`,
          fix: spec.startsWith("@bezda/rhp") ? 'Add <script type="importmap">{ "imports": { "@bezda/rhp/standalone": "https://cdn.jsdelivr.net/npm/@bezda/rhp@2/dist/standalone.js" } }</script> before the module script.' : `Add "${spec}" to the page's import map, or import it by URL.`,
        });
      }
    }
  }

  return problems;
}
