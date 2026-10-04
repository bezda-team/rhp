// Static checks of a chart's code, for what rhp's html template and the standalone module get wrong with no error:
//   bare-boolean       <${Plot} keyboard> passes "", which is false
//   handler-at-render  onClick=${() => go()} on a component is read as a value: it runs at render and is never attached
//   style-string       style="..." on a Chart or a Plot is dropped (they take a style object)
//   class-name         className in a template: on a block it replaces rhp's class, and the block is not drawn
//   two-solids         @bezda/rhp/standalone imported beside solid-js: two copies of Solid, and reactivity breaks
//   missing-export     a name the standalone module doesn't export, with what to use instead
import fs from "fs";
import path from "path";
import { parseSync } from "@babel/core";
import { closest } from "../guard/rules.js";

const STANDALONE = "@bezda/rhp/standalone";

// The props of rhp's components (and Solid's Show) that take a boolean, and what "" (false) does to each
const BOOLEANS = { Chart: ["animate", "static"], Plot: ["overlap", "static", "keyboard", "animate"], Area: ["mirror", "smooth"], Line: ["fill", "smooth"], Show: ["keyed"] };
const OFF = {
  overlap: "its slats don't share one band",
  static: "the chart is not static",
  keyboard: "its slats take no focus",
  animate: "the JS version stays off",
  mirror: "the Area is not mirrored",
  smooth: "the outline stays straight",
  fill: "nothing is filled under the Line",
  keyed: "Show is not keyed",
};
const BLOCKS = new Set(["Bar", "Dot", "Tick", "Label", "Cell", "Place", "Area", "Line"]);

// What to use for what the standalone module doesn't have
const INSTEAD = {
  createRenderEffect: "createEffect",
  Dynamic: "a function that returns the template for the current choice",
  Portal: "render() into the other element",
  createResource: "fetch in onMount, and keep the result in a signal",
  ErrorBoundary: "a check of the data before it is drawn (standalone has no error boundary)",
  createContext: "values passed as props, or kept in a signal at the top of the module",
  useContext: "values passed as props, or kept in a signal at the top of the module",
  createUniqueId: "an id of your own (a counter)",
  lazy: "a plain import",
  Suspense: "Show, with a signal that says when the data is there",
  children: "props.children, read inside a function",
};

// The names a module exports, from its last export statement (what esbuild writes at the end of a bundle)
const exportsOf = new Map();
function exported(file) {

  if (!exportsOf.has(file)) {
    const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
    const list = text.match(/export\s*\{([^}]*)\}\s*;?\s*$/)?.[1];
    exportsOf.set(file, list ? new Set(list.split(",").map((x) => x.trim().split(/\s+as\s+/).pop()).filter(Boolean)) : null);
  }

  return exportsOf.get(file);
}

// Every node of a Babel AST, depth first
function walk(node, visit) {

  if (!node || typeof node.type !== "string") return;

  visit(node);

  for (const key of Object.keys(node)) {
    if (key === "loc" || key.endsWith("Comments") || key === "extra") continue;
    const v = node[key];
    if (Array.isArray(v)) {
      for (const child of v) {
        walk(child, visit);
      }
    } else if (v && typeof v.type === "string") {
      walk(v, visit);
    }
  }
}

const isSpace = (c) => c === " " || c === "\n" || c === "\t" || c === "\r" || c === "\f";

// The attributes in an html template, in order: { tag, name, value, at } with tag { component, expr, name }, value
// { kind: "bare" | "text" | "expr" | "mixed", text, node }, and at the attribute's offset in the source
function attributes(template) {

  const { quasis, expressions } = template;
  const out = [];
  let state = "text";
  let tag = null;
  let attr = null;
  let quote = "";
  let tagName = "";

  const begin = (name, at) => (attr = { tag, name, value: null, at, text: "", parts: [] });
  const end = (value) => {
    if (attr && attr.name !== "..." && attr.name) out.push({ tag: attr.tag, name: attr.name, at: attr.at, value: value ?? { kind: "bare" } });
    attr = null;
  };
  const closeTag = () => {
    tag = null;
    state = "text";
  };

  for (let q = 0; q < quasis.length; q++) {
    const raw = quasis[q].value.raw;
    const base = quasis[q].start;

    for (let i = 0; i < raw.length; i++) {
      const c = raw[i];

      if (state === "text") {
        if (c !== "<") continue;
        if (raw.startsWith("<!--", i)) state = "comment";
        else if (raw[i + 1] === "/") state = "close";
        else {
          state = "open";
          tagName = "";
        }
      } else if (state === "comment") {
        if (raw.startsWith("-->", i)) {
          state = "text";
          i += 2;
        }
      } else if (state === "close") {
        if (c === ">") state = "text";
      } else if (state === "open") {
        if (/[A-Za-z0-9-]/.test(c)) {
          tagName += c;
        } else {
          if (!tagName) {
            state = "text";
            continue;
          }
          tag = { component: false, name: tagName.toLowerCase() };
          state = "tag";
          i--;
        }
      } else if (state === "tag") {
        if (isSpace(c)) continue;
        if (c === ">") closeTag();
        else if (c === "/" && raw[i + 1] === ">") {
          closeTag();
          i++;
        } else {
          begin(c, base + i);
          state = "name";
        }
      } else if (state === "name") {
        if (c === "=") state = "equals";
        else if (isSpace(c)) state = "named";
        else if (c === ">" || (c === "/" && raw[i + 1] === ">")) {
          end();
          state = "tag";
          i--;
        } else {
          attr.name += c;
        }
      } else if (state === "named") {
        if (isSpace(c)) continue;
        if (c === "=") state = "equals";
        else {
          end();
          state = "tag";
          i--;
        }
      } else if (state === "equals") {
        if (isSpace(c)) continue;
        if (c === '"' || c === "'") {
          quote = c;
          state = "quoted";
        } else {
          attr.text = c;
          state = "unquoted";
        }
      } else if (state === "quoted") {
        if (c === quote) {
          end(attr.parts.length === 1 && !attr.text.trim() ? { kind: "expr", node: attr.parts[0] } : attr.parts.length ? { kind: "mixed" } : { kind: "text", text: attr.text });
          state = "tag";
        } else {
          attr.text += c;
        }
      } else if (state === "unquoted") {
        if (isSpace(c) || c === ">") {
          end({ kind: "text", text: attr.text });
          state = "tag";
          i--;
        } else {
          attr.text += c;
        }
      }
    }

    if (q === expressions.length) break;
    const expr = expressions[q];

    if (state === "open" && !tagName) {
      tag = { component: true, expr };
      state = "tag";
    } else if (state === "open") {
      tag = { component: false, name: tagName.toLowerCase() };
      state = "tag";
    } else if (state === "equals") {
      end({ kind: "expr", node: expr });
      state = "tag";
    } else if (state === "quoted") {
      attr.parts.push(expr);
    } else if (state === "name" || state === "named") {
      // a spread (...${props}) or a name made of an expression: nothing to check
      attr = null;
      state = "tag";
    }
  }

  return out;
}

// The checks of one module's code. offset is where the code starts in the file, for the line numbers.
function checkModule(code, { offset, lineAt, file, rhpRoot, jsx }) {

  let ast;
  try {
    ast = parseSync(code, { sourceType: "module", configFile: false, babelrc: false, filename: file, parserOpts: { plugins: jsx ? ["jsx", ...(/\.tsx?$/.test(file) ? ["typescript"] : [])] : [], errorRecovery: true } });
  } catch {
    return { problems: [], imports: [] };
  }

  const problems = [];
  const where = (at) => `${path.basename(file)}:${lineAt(offset + at)}`;
  const imports = [];
  const local = new Map(); // a local name -> { source, name } of what it imports
  const params = new Map(); // a function's name -> its number of parameters (null when the name is bound twice)
  const templates = [];

  walk(ast.program, (node) => {
    if (node.type === "ImportDeclaration") {
      imports.push({ source: node.source.value, at: node.start, node });
      for (const s of node.specifiers) {
        const name = s.type === "ImportSpecifier" ? s.imported.name ?? s.imported.value : s.type === "ImportDefaultSpecifier" ? "default" : "*";
        local.set(s.local.name, { source: node.source.value, name, at: s.start });
      }
    } else if (node.type === "ImportExpression" || (node.type === "CallExpression" && node.callee.type === "Import")) {
      const arg = node.source ?? node.arguments?.[0];
      if (arg?.type === "StringLiteral") imports.push({ source: arg.value, at: node.start });
    } else if (node.type === "FunctionDeclaration" && node.id) {
      params.set(node.id.name, params.has(node.id.name) ? null : node.params.length);
    } else if (node.type === "VariableDeclarator" && node.id.type === "Identifier" && /^(Arrow)?FunctionExpression$/.test(node.init?.type ?? "")) {
      params.set(node.id.name, params.has(node.id.name) ? null : node.init.params.length);
    } else if (node.type === "TaggedTemplateExpression") {
      templates.push(node);
    }
  });

  // html is Solid's tagged template, from the standalone module or solid-js/html
  const isHtml = (tag) => {
    if (tag.type !== "Identifier") return false;
    const from = local.get(tag.name);
    if (!from) return tag.name === "html";
    return (from.source === STANDALONE && from.name === "html") || (from.source === "solid-js/html" && from.name === "default");
  };

  // A component's name as rhp names it: what an identifier imports, or the property of rhp.Plot
  const componentName = (expr) => {
    if (expr?.type === "Identifier") {
      const from = local.get(expr.name);
      return from && from.name !== "*" && from.name !== "default" ? from.name : expr.name;
    }
    if (expr?.type === "MemberExpression" && !expr.computed) return expr.property.name;
    return null;
  };

  const noParameter = (node) => {
    if (!node) return false;
    if (node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression") return node.params.length === 0;
    return node.type === "Identifier" && params.get(node.name) === 0;
  };

  for (const t of templates) {
    if (!isHtml(t.tag)) continue;
    for (const a of attributes(t.quasi)) {
      const comp = a.tag.component ? componentName(a.tag.expr) : null;
      const shown = a.tag.component ? `<\${${comp ?? "Component"}}>` : `<${a.tag.name}>`;

      if (a.name === "className") {
        problems.push({
          level: "error",
          code: "class-name",
          message: `${where(a.at)}: className on ${shown}: ${BLOCKS.has(comp) ? "on a block it replaces rhp's class, so the block is not drawn" : "the html template sets no class from it"}.`,
          fix: "Use class, as in HTML: class=\"name\".",
        });
      }

      if (!a.tag.component) continue;

      if (a.value.kind === "bare" && BOOLEANS[comp]?.includes(a.name)) {
        problems.push({
          level: "error",
          code: "bare-boolean",
          message: `${where(a.at)}: ${a.name} on ${shown} is written bare, which passes "" (false), so ${OFF[a.name]}.`,
          fix: `Write ${a.name}=\${true}: in an html template a boolean is written out.`,
        });
      }

      if (/^on(:|[A-Z])/.test(a.name) && a.value.kind === "expr" && noParameter(a.value.node)) {
        problems.push({
          level: "error",
          code: "handler-at-render",
          message: `${where(a.at)}: ${a.name} on ${shown} is a function with no parameter, which the html template reads as a value: it runs once when the chart is drawn, and is never attached.`,
          fix: `Give the handler a parameter: ${a.name}=\${(e) => ...}${a.value.node.type === "Identifier" ? ` (or define ${a.value.node.name} with one: (e) => ...)` : ""}.`,
        });
      }

      const string = a.value.kind === "text" || a.value.kind === "mixed" || (a.value.kind === "expr" && /^(StringLiteral|TemplateLiteral)$/.test(a.value.node.type));
      if (a.name === "style" && (comp === "Chart" || comp === "Plot") && string) {
        problems.push({
          level: "error",
          code: "style-string",
          message: `${where(a.at)}: style on ${shown} is a string, and a ${comp} takes only a style object, so it is dropped.`,
          fix: "Give an object of CSS properties: style=${{ \"pointer-events\": \"none\" }}.",
        });
      }
    }
  }

  // Names the standalone module doesn't have
  const names = exported(path.join(rhpRoot, "dist/standalone.js"));
  for (const [, from] of local) {
    if (from.source !== STANDALONE || !names || from.name === "*" || from.name === "default" || names.has(from.name)) continue;
    const near = closest(from.name, [...names]);
    problems.push({
      level: "error",
      code: "missing-export",
      name: from.name,
      message: `${where(from.at)}: ${STANDALONE} has no export ${from.name}, so the module fails to load and nothing is drawn.`,
      fix: INSTEAD[from.name] ? `Use ${INSTEAD[from.name]}.` : near ? `Did you mean ${near}?` : `It exports rhp and, from Solid: render, html, createSignal, createMemo, createEffect, createRoot, onMount, onCleanup, batch, untrack, For, Index, Show, createStore, reconcile, produce, unwrap.`,
    });
  }

  return { problems, imports: imports.map((x) => ({ source: x.source, where: where(x.at) })) };
}

// The static problems of a chart's file: an html page's module scripts, or a module or component file
export function sourceProblems({ file, text, format, rhpRoot }) {

  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") starts.push(i + 1);
  }
  const lineAt = (offset) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };

  const modules = [];
  if (format === "html") {
    for (const m of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
      if (/\bsrc\s*=/.test(m[1]) || !/type\s*=\s*["']?module/i.test(m[1])) continue;
      modules.push({ code: m[2], offset: m.index + m[0].indexOf(">") + 1, jsx: false });
    }
  } else {
    modules.push({ code: text, offset: 0, jsx: format === "solid" || format === "react" || /\.[jt]sx$/.test(file) });
  }

  const problems = [];
  const imports = [];
  for (const m of modules) {
    const r = checkModule(m.code, { ...m, lineAt, file, rhpRoot });
    problems.push(...r.problems);
    imports.push(...r.imports);
  }

  // Two copies of Solid: the standalone module carries its own
  const standalone = imports.find((x) => x.source === STANDALONE);
  const solid = imports.filter((x) => /^solid-js(\/|$)/.test(x.source));
  if (standalone && solid.length) {
    problems.push({
      level: "error",
      code: "two-solids",
      message: `${solid[0].where}: the code imports ${[...new Set(solid.map((x) => x.source))].join(" and ")} beside ${STANDALONE}, which carries its own Solid: with two copies, a signal from one is not tracked by the other, and the chart silently stops following it.`,
      fix: `Import everything from ${STANDALONE} (it has render, html, createSignal, createMemo, createEffect, Show, For, Index, createStore...), and drop solid-js.`,
    });
  }

  return problems;
}
