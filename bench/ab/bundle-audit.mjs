// What an app ships of rhp: a bar chart app bundled and minified as the bench builds it (Solid left out), with the
// minified bytes each source file puts into it, and the whole gzipped.
//   node bundle-audit.mjs [entry-name]
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
const RHP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const { build, transform } = await import(`${RHP}/node_modules/esbuild/lib/main.js`);
const { transformAsync } = await import(`${RHP}/node_modules/@babel/core/lib/index.js`);
const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(process.env.RHP_SRC ?? `${RHP}/src`);

const ENTRIES = {
  bars: `import { Chart, Plot, Bar, Label, slat } from "rhp";
import { render } from "solid-js/web";
const Row = slat({ thickness: 24 }, (d) => <div><Label edge="start">{d.name}</Label><Bar to={d.value} /><Label at={d.value}>{d.value}</Label></div>);
export const mount = (el, names, values) => render(() => <Chart scale={[0, 100]}><Plot name={names} value={values}>{Row}</Plot></Chart>, el);`,
  scatter: `import { Chart, Plot, Dot, slat } from "rhp";
import { render } from "solid-js/web";
const P = slat({}, (d) => <Dot at={d.x} cross={d.y} />);
export const mount = (el, rows) => render(() => <Chart scale={[0, 100]} cross={[0, 100]}><Plot overlap rows={rows}>{P}</Plot></Chart>, el);`,
  everything: `export * from "rhp";`,
};

const plugin = {
  name: "audit",
  setup(b) {
    b.onResolve({ filter: /^rhp$/ }, () => ({ path: path.join(src, "index.js") }));
    b.onResolve({ filter: /^entry:/ }, (a) => ({ path: a.path, namespace: "entry" }));
    b.onLoad({ filter: /.*/, namespace: "entry" }, async (a) => {
      const r = await transformAsync(ENTRIES[a.path.slice(6)], { presets: [[`${RHP}/node_modules/babel-preset-solid/index.js`, {}]], filename: "entry.jsx", babelrc: false, configFile: false });
      return { contents: r.code, loader: "js", resolveDir: here };
    });
    b.onLoad({ filter: /\.(jsx|css)$/ }, async (a) => {
      if (!a.path.startsWith(src)) return undefined;
      let text = await fs.promises.readFile(a.path, "utf8");
      // FOLD=1 does what rhp's own build does (scripts/bundle.mjs): isServer becomes false in rhp's .jsx files
      const env = /^import \{ isServer \} from "\.\/env\.js";\n/m;
      if (process.env.FOLD && env.test(text)) text = text.replace(env, "").replace(/\bisServer\b/g, "false");
      if (a.path.endsWith(".css")) return { contents: (await transform(text, { loader: "css", minify: true })).code.trim(), loader: "text" };
      const r = await transformAsync(text, { presets: [[`${RHP}/node_modules/babel-preset-solid/index.js`, {}]], filename: a.path, babelrc: false, configFile: false });
      return { contents: r.code, loader: "js" };
    });
  },
};

for (const name of process.argv[2] ? [process.argv[2]] : Object.keys(ENTRIES)) {
  const r = await build({
    entryPoints: ["entry:" + name], bundle: true, write: false, format: "esm", minify: true, platform: "browser", target: "es2020",
    plugins: [plugin], external: ["solid-js", "solid-js/*"], metafile: true, logLevel: "error", outfile: "x.js",
  });
  const out = r.outputFiles[0].contents;
  const gz = zlib.gzipSync(out, { level: 9 }).length;
  const meta = Object.values(r.metafile.outputs)[0];
  const rows = Object.entries(meta.inputs).map(([f, v]) => [f.replace(src + "/", "src/").replace(/^.*\/src\//, "src/"), v.bytesInOutput]).sort((a, b) => b[1] - a[1]);
  console.log(`\n${name}: ${out.length} B minified, ${gz} B gzip (Solid not included)`);
  for (const [f, bytes] of rows) {
    if (bytes) console.log(`  ${String(bytes).padStart(7)}  ${f}`);
  }
}
