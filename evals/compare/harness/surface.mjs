// How much API a library asks a reader to learn, measured from its published TypeScript declarations:
// the names it exports, and the option paths reachable from the types a chart is configured with.
//   node surface.mjs   prints JSON
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(here, "..", "..", "..");
const require = createRequire(path.join(REPO, "package.json"));
const ts = require("typescript");
const LAB = path.join(here, "..");
const BENCH = path.join(REPO, "bench/node_modules");

// Each library: its declaration entry, and the types a chart is configured with
const LIBS = {
  rhp: { entry: path.join(REPO, "dist/index.d.ts"), roots: ["ChartProps", "PlotSettings", "ScaleProps", "BarProps", "DotProps", "TickProps", "PlaceProps", "CellProps", "LabelProps", "LineProps", "AreaProps", "PosterProps", "SlatLayout", "ThemeValues"], own: true },
  apexcharts: { entry: path.join(LAB, "node_modules/apexcharts/types/apexcharts.d.ts"), roots: ["ApexOptions"] },
  highcharts: { entry: path.join(BENCH, "highcharts/highcharts.d.ts"), roots: ["Options"] },
  echarts: { entry: path.join(BENCH, "echarts/types/dist/echarts.d.ts"), roots: ["EChartsOption"] },
  chartjs: { entry: path.join(BENCH, "chart.js/dist/types/index.d.ts"), roots: ["ChartConfiguration"] },
  plot: { entry: path.join(BENCH, "@observablehq/plot/src/index.d.ts"), roots: ["PlotOptions"] },
  flint: { entry: path.join(LAB, "node_modules/flint-chart/dist/index.d.ts"), roots: ["ChartAssemblyInput"] },
  semiotic: { entry: path.join(LAB, "node_modules/semiotic/dist/semiotic.d.ts"), roots: ["BarChartProps", "LineChartProps", "ScatterplotProps", "HeatmapProps", "DonutChartProps", "StackedBarChartProps"] },
  g2: { entry: path.join(BENCH, "@antv/g2/lib/index.d.ts"), roots: ["G2Spec"] },
};

function analyze(name, { entry, roots, own }) {
  if (!fs.existsSync(entry)) return { error: `no ${entry}` };
  const program = ts.createProgram([entry], { skipLibCheck: true, noEmit: true, types: [], jsx: ts.JsxEmit.Preserve, moduleResolution: ts.ModuleResolutionKind.Bundler, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 });
  const checker = program.getTypeChecker();
  const sf = program.getSourceFile(entry);
  const moduleSymbol = checker.getSymbolAtLocation(sf) ?? sf.symbol;
  const exports = moduleSymbol ? checker.getExportsOfModule(moduleSymbol) : [];
  let values = 0, types = 0;
  const exported = new Map();
  for (const e of exports) {
    const s = e.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(e) : e;
    exported.set(e.name, s);
    if (s.flags & (ts.SymbolFlags.Value)) values++;
    if (s.flags & (ts.SymbolFlags.Type)) types++;
  }
  // Declaration size: every .d.ts file of the package the program loaded
  const pkgRoot = entry.slice(0, entry.indexOf("/", entry.lastIndexOf("node_modules/") + 13 + (entry.includes("node_modules/@") ? entry.slice(entry.lastIndexOf("node_modules/") + 13).indexOf("/") + 1 : 0)) + 1) || path.dirname(entry);
  let dtsBytes = 0, dtsLines = 0;
  for (const f of program.getSourceFiles()) {
    if (name === "rhp" ? f.fileName === entry : f.fileName.startsWith(pkgRoot)) { dtsBytes += f.text.length; dtsLines += f.text.split("\n").length; }
  }
  // Option paths: properties reachable from the roots, through objects, arrays and unions, to a depth of 6
  const names = new Set();
  let paths = 0;
  const domKeys = new Set();
  const walk = (type, depth, seen) => {
    if (depth > 6) return;
    if (type.isUnion() || type.isIntersection()) { for (const t of type.types) walk(t, depth, seen); return; }
    if (checker.isArrayType?.(type) || checker.isTupleType?.(type)) { for (const t of checker.getTypeArguments(type)) walk(t, depth, seen); return; }
    if (!(type.flags & ts.TypeFlags.Object)) return;
    if (type.getCallSignatures().length && !type.getProperties().length) return;
    const id = type.id;
    if (seen.has(id)) return;
    const next = new Set(seen).add(id);
    for (const p of checker.getPropertiesOfType(type)) {
      const decl = p.declarations?.[0];
      const file = decl?.getSourceFile().fileName ?? "";
      if (file.includes("/solid-js/") || file.includes("/typescript/lib/") || file.includes("/@types/react/") || file.includes("/csstype/")) continue; // DOM/JSX attributes and CSS
      names.add(p.name);
      paths++;
      const t = decl ? checker.getTypeOfSymbolAtLocation(p, decl) : checker.getTypeOfSymbol?.(p);
      if (!t) continue;
      walk(checker.getNonNullableType(t), depth + 1, next);
    }
  };
  const found = [];
  for (const r of roots) {
    const s = exported.get(r) ?? checker.resolveName(r, sf, ts.SymbolFlags.Type, false);
    if (!s) continue;
    found.push(r);
    walk(checker.getDeclaredTypeOfSymbol(s), 1, new Set());
  }
  return { exportedValues: values, exportedTypes: types, roots: found, optionPaths: paths, distinctOptionNames: names.size, dtsKB: Math.round(dtsBytes / 1024), dtsLines };
}

const out = {};
for (const [name, cfg] of Object.entries(LIBS)) {
  try { out[name] = analyze(name, cfg); } catch (e) { out[name] = { error: e.message }; }
  console.error(name, JSON.stringify(out[name]));
}
console.log(JSON.stringify(out, null, 1));
