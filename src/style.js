// rhp brings its own CSS, so there is nothing to import. The core is one stylesheet, and each slat type with `css` adds
// its own. Each is built once and adopted by every document (or shadow root) that shows a chart.
// NOTE: A page can't change a chart because every declaration is made !important inside rhp's cascade layers. For
// !important the first declared layer wins and any layered !important beats an unlayered one, so no page rule wins.
// The page reaches a chart only through the theme and props.
import CORE from "./rhp.css";
import GUTTERS from "./gutters.css";

const LAYERS = "@layer rhp.place, rhp.slat, rhp.core;";

// @keyframes and descriptor at-rules (@font-face, @property...) can't take !important (it makes them invalid)
const DESCRIPTORS = /^@(-webkit-)?keyframes\b|^@(font-face|property|counter-style|font-palette-values|font-feature-values|view-transition|position-try)\b/i;

// Adds !important to every declaration except custom properties and what is inside @keyframes
export function important(css) {
  css = uncomment(css);
  let out = "";
  let seg = "";
  let depth = 0;
  let quote = null;
  let paren = 0;
  let frames = -1;
  const flush = (end) => {
    const t = seg.trim();
    const declaration = t && t[0] !== "@" && !t.startsWith("--") && frames < 0 && /^[a-z-]+\s*:/i.test(t) && !/!important\s*$/i.test(t);
    out += (declaration ? seg.replace(/\s*$/, " !important") : seg) + end;
    seg = "";
  };
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === "\\") {
      // an escaped character is never a quote, paren or brace
      seg += ch + (css[++i] ?? "");
      continue;
    }
    if (quote) {
      seg += ch;
      if (ch === quote || ch === "\n") quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      seg += ch;
      continue;
    }
    if (ch === "(") paren++;
    else if (ch === ")") paren--;
    if (paren > 0) {
      seg += ch;
      continue;
    }
    if (ch === "{") {
      if (frames < 0 && DESCRIPTORS.test(seg.trim())) frames = depth;
      out += seg + "{";
      seg = "";
      depth++;
    } else if (ch === "}") {
      flush("}");
      depth--;
      if (depth === frames) frames = -1;
    } else if (ch === ";") {
      flush(";");
    } else {
      seg += ch;
    }
  }
  return out + seg;
}

// Removes comments (but not a "/*" inside a string)
function uncomment(css) {
  let out = "";
  let quote = null;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === "\\") {
      out += ch + (css[++i] ?? "");
      continue;
    }
    if (quote) {
      out += ch;
      if (ch === quote || ch === "\n") quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      out += ch;
      continue;
    }
    if (ch === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      i = end < 0 ? css.length : end + 1;
      continue;
    }
    out += ch;
  }
  return out;
}

// Splits a list of selectors on the commas that are not inside (), [] or quotes
function split(list) {
  const parts = [];
  let cur = "";
  let depth = 0;
  let quote = null;
  for (let i = 0; i < list.length; i++) {
    const ch = list[i];
    if (ch === "\\") {
      cur += ch + (list[++i] ?? "");
      continue;
    }
    if (quote) {
      cur += ch;
      if (ch === quote || ch === "\n") quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === "(" || ch === "[") {
      depth++;
    } else if (ch === ")" || ch === "]") {
      depth--;
    } else if (ch === "," && depth === 0) {
      parts.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

// Where the pseudo-element of a selector starts, if it has one (outside of (), [] and strings)
function pseudoAt(sel) {
  let depth = 0;
  let quote = null;
  for (let i = 0; i < sel.length; i++) {
    const ch = sel[i];
    if (ch === "\\") {
      i++;
      continue;
    }
    if (quote) {
      if (ch === quote || ch === "\n") quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (depth === 0 && ch === ":" && (sel[i + 1] === ":" || /^:(before|after|first-letter|first-line)(?![-\w])/i.test(sel.slice(i)))) return i;
  }
  return -1;
}

// A slat's CSS only applies inside that slat type's own slats (the slat root included). It doesn't reach the page,
// other slat types, or a slat of another type nested inside it.
// The slat root carries data-rhp-slat="<scope>" (S), and each selector X becomes `S:is(.rhp-chart X), S :is(.rhp-chart X)`
// so that every part of X has to be inside the chart. A pseudo-element stays at the end, and a nested rule stays relative
// to its (scoped) parent. The slat's @keyframes names get the scope as a prefix so a page animation can't replace them.
export function scoped(css, scope) {
  css = uncomment(css);
  for (const [, name] of css.matchAll(/@(?:-webkit-)?keyframes\s+([-\w]+)/g)) {
    const own = scope + "-" + name;
    const word = "(?<![-\\w])" + name + "(?![-\\w])";
    css = css
      .replace(new RegExp("(@(?:-webkit-)?keyframes\\s+)" + word, "g"), "$1" + own)
      .replace(/(animation(?:-name)?\s*:)([^;{}]*)/g, (_, prop, value) => prop + value.replace(new RegExp(word, "g"), own));
  }
  const S = `[data-rhp-slat="${scope}"]`;
  const other = `:not(:where(${S} [data-rhp-slat]:not(${S}), ${S} [data-rhp-slat]:not(${S}) *))`;
  const one = (sel) => {
    const at = pseudoAt(sel);
    const base = oriented((at < 0 ? sel : sel.slice(0, at)).trim());
    const pe = at < 0 ? "" : sel.slice(at);
    // A selector that already starts at .rhp-chart is kept as it is
    const x = !base ? "" : /^[^\s>+~]*\.rhp-chart(?![-\w])/.test(base) ? `:is(${base})` : `:is(.rhp-chart ${base})`;
    return `${S}${x}${other}${pe}, ${S} ${x}${other}${pe}`;
  };
  const tail = (sel) => {
    const at = pseudoAt(sel);
    if (at < 0) return oriented(sel) + other;
    return oriented(sel.slice(0, at)) + other + sel.slice(at);
  };
  let out = "";
  let seg = "";
  let quote = null;
  let paren = 0;
  const kinds = []; // "at" (a grouping rule), "frames", "rule" (a style rule), "nested" or "scope"
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === "\\") {
      seg += ch + (css[++i] ?? "");
      continue;
    }
    if (quote) {
      seg += ch;
      if (ch === quote || ch === "\n") quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      seg += ch;
      continue;
    }
    if (ch === "(") paren++;
    else if (ch === ")") paren--;
    if (paren > 0) {
      seg += ch;
      continue;
    }
    if (ch === "{") {
      const pre = seg.trim();
      const lead = seg.slice(0, seg.length - seg.trimStart().length);
      const inRule = kinds.includes("rule");
      const asIs = kinds.includes("frames") || kinds.includes("scope");
      if (pre.startsWith("@")) {
        const sc = !inRule && !asIs && pre.match(/^@scope\s*\(([^]*?)\)([^]*)$/i);
        if (sc) {
          // @scope (A) gets A scoped instead of its rules
          kinds.push("scope");
          out += `${lead}@scope (${split(sc[1]).map(one).join(", ")})${sc[2]} {`;
        } else {
          kinds.push(/^@(-webkit-)?keyframes/i.test(pre) ? "frames" : inRule ? "nested" : "at");
          out += seg + "{";
        }
      } else if (asIs) {
        kinds.push("nested");
        out += seg + "{";
      } else if (inRule) {
        kinds.push("nested");
        out += lead + split(pre).map(tail).join(", ") + " {";
      } else {
        kinds.push("rule");
        out += lead + split(pre).map(one).join(", ") + " {";
      }
      seg = "";
    } else if (ch === "}") {
      out += seg + "}";
      seg = "";
      kinds.pop();
    } else if (ch === ";" && (kinds.length === 0 || kinds[kinds.length - 1] === "at")) {
      // @import and @layer statements
      out += seg + ";";
      seg = "";
    } else {
      seg += ch;
    }
  }
  return out + seg;
}

// :horizontal and :vertical in a slat's CSS match a slat root, block or Plot drawn in that orientation. rhp marks those
// elements with data-rhp-o. (Not inside strings, and not after a pseudo-element.)
function oriented(sel) {
  if (!/:(horizontal|vertical)/.test(sel)) return sel;
  let out = "";
  let quote = null;
  for (let i = 0; i < sel.length; i++) {
    const ch = sel[i];
    if (ch === "\\") {
      out += ch + (sel[++i] ?? "");
      continue;
    }
    if (quote) {
      out += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      out += ch;
      continue;
    }
    const m = ch === ":" && sel[i - 1] !== ":" && sel.slice(i).match(/^:(horizontal|vertical)(?![-\w(])/);
    if (m) {
      out += `[data-rhp-o="${m[1][0]}"]`;
      i += m[0].length - 1;
      continue;
    }
    out += ch;
  }
  return out;
}

// A short name made from the CSS text, so a server and a browser pick the same one
const hash = (text) => {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = (h * 33) ^ text.charCodeAt(i);
  return (h >>> 0).toString(36);
};

// Every root that shows a chart (the document, an iframe's or a popup's document, a shadow root) gets every sheet.
// An entry is one stylesheet's text, and each root holds its own copy of it.
const roots = new Map(); // root -> Map of entry -> the sheet adopted there (or its <style>)
const entries = [];

function adoptInto(root, entry) {
  if (entry.core && linked && root === document) return; // the page links it itself (linkedCss)
  const doc = root.ownerDocument ?? root;
  if (!Array.isArray(root.adoptedStyleSheets)) {
    // jsdom and older browsers get a <style> element instead
    const el = doc.createElement("style");
    el.textContent = entry.css;
    (root.head ?? root).append(el);
    roots.get(root).set(entry, el);
    return;
  }
  const sheet = new (doc.defaultView ?? window).CSSStyleSheet(); // a sheet belongs to one document
  sheet.replaceSync(entry.css);
  roots.get(root).set(entry, sheet);
  root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
}

// Adopted sheets come after every <link> and <style>, so a page layer would be declared before rhp's layers.
// This <style> declares rhp's layers first and makes sure it stays first (a head manager or emotion's injectFirst may put
// a sheet before it later). Under a strict CSP it takes the page's nonce, or the statement goes into the first sheet
// rhp is allowed to edit.
const MARK = "data-rhp-layers";
function declareLayers(root) {
  const doc = root.ownerDocument ?? root;
  const parent = root.nodeType === 9 ? root.head : root;
  if (!parent) return;
  const el = doc.createElement("style");
  el.textContent = LAYERS;
  el.setAttribute(MARK, "");
  const nonce = doc.querySelector("style[nonce], link[nonce], script[nonce]")?.nonce;
  if (nonce) el.nonce = nonce;
  const edited = new WeakSet();
  let moves = 0;
  let reset;
  const keep = () => {
    const first = root.querySelector('style:not([data-rhp-server]), link[rel~="stylesheet"]');
    if (!first?.hasAttribute(MARK)) {
      // If another script keeps putting its own sheet first, we stop instead of looping with it
      if (++moves > 20) return;
      reset ??= setTimeout(() => {
        moves = 0;
        reset = undefined;
      }, 1000);
      if (first) first.before(el);
      else parent.prepend(el);
    }
    if (el.sheet) return;
    // The <style> was blocked (CSP)
    for (const sheet of root.styleSheets) {
      if (edited.has(sheet)) return;
      try {
        sheet.insertRule(LAYERS, 0);
        edited.add(sheet);
        return;
      } catch {
        // a cross-origin sheet can't be edited
      }
    }
  };
  keep();
  const mo = new (doc.defaultView ?? window).MutationObserver(keep);
  mo.observe(parent, { childList: true });
  if (root.nodeType === 9) mo.observe(root.documentElement, { childList: true });
}

function addRoot(root) {
  if (roots.has(root)) return;
  roots.set(root, new Map());
  declareLayers(root);
  for (const entry of entries) adoptInto(root, entry);
}

function add(css, core = false) {
  if (!roots.size) addRoot(document);
  const entry = { css, core };
  entries.push(entry);
  for (const root of roots.keys()) adoptInto(root, entry);
  return entry;
}

function update(entry, css) {
  entry.css = css;
  for (const own of roots.values()) {
    const sheet = own.get(entry);
    if (!sheet) continue;
    if (sheet.replaceSync) sheet.replaceSync(css);
    else sheet.textContent = css;
  }
}

let coreText;
let guttersText;
// rhp's core stylesheet (its layers first, then every declaration made !important)
export const coreSheet = () => (coreText ??= LAYERS + "\n" + important(CORE));
// The rules for gutters sized by their labels (room "auto"), added when a chart first asks for them
export const gutterSheet = () => (guttersText ??= important(GUTTERS));
// What a page can link itself (dist/rhp.css)
export const pageSheet = () => coreSheet() + "\n" + gutterSheet();

// A page that links rhp's stylesheet itself (@bezda/rhp/rhp.css) calls linkedCss() where the app starts, on the server
// and in the browser. The server then leaves the core out of each chart's HTML (it would come with every island), and
// the browser doesn't add it to the document. The first chart in the browser checks that the page really has it.
let linked = false;
let checked = false;
export function linkedCss() {
  linked = true;
}
export function checkLinked(body) {
  if (!linked || checked) return;
  checked = true;
  if (getComputedStyle(body).display === "grid") return;
  console.warn("rhp: linkedCss() was called, but this page doesn't link @bezda/rhp/rhp.css: rhp adds its core stylesheet itself");
  linked = false;
  const own = roots.get(document);
  if (!own) return;
  for (const entry of entries) {
    if (entry.core && !own.has(entry)) adoptInto(document, entry);
  }
}

// On a server, the CSS a chart needs goes into the page with it: rhp's core, the gutter rules when the chart uses
// room "auto", and the sheets of its slat types. Each sheet goes into a page once per render (`render` is an object that
// the whole render shares). A chart rendered on its own (an island) brings everything it needs.
const written = new WeakMap(); // render -> the sheets already in its page
export function serverSheets(slats, render, gutters) {
  const seen = render ? written.get(render) ?? written.set(render, new Set()).get(render) : new Set();
  let out = "";
  if (!linked && !seen.has("core")) {
    seen.add("core");
    out += coreSheet();
  }
  if (!linked && gutters && !seen.has("gutters")) {
    seen.add("gutters");
    out += "\n" + gutterSheet();
  }
  for (const fn of slats) {
    if (seen.has(fn.scope)) continue;
    seen.add(fn.scope);
    out += "\n" + slatSheet(fn);
  }
  return out;
}

let gutters = false;
export function useGutters() {
  if (gutters || typeof document === "undefined") return;
  gutters = true;
  add(gutterSheet(), true);
}

let core = false;
export function useCore() {
  if (core || typeof document === "undefined") return;
  core = true;
  add(coreSheet(), true);
}

// Called by a Chart once it is in the page and whenever its size changes. A chart in another document or in a shadow
// root (even one moved there later, like a popup) gets the sheets there, and a root whose adoptedStyleSheets were
// overwritten gets them back.
export function useRoot(el) {
  const root = el.getRootNode();
  if (root === el || (root.nodeType !== 9 && root.nodeType !== 11)) return;
  if (!roots.has(root)) return addRoot(root);
  const own = [...roots.get(root).values()];
  const list = root.adoptedStyleSheets;
  if (Array.isArray(list) && own.some((sheet) => !list.includes(sheet))) {
    root.adoptedStyleSheets = [...list.filter((sheet) => !own.includes(sheet)), ...own];
  }
}

let ro;
export function watchRoot(el) {
  if (typeof ResizeObserver === "undefined") return () => {};
  ro ??= new ResizeObserver((changes) => {
    for (const change of changes) useRoot(change.target);
  });
  // We watch both the root's border box and the body's content box: one of them changes when rhp's CSS is removed,
  // whatever size the page gives the chart
  const body = el.querySelector(".rhp-body");
  ro.observe(el, { box: "border-box" });
  if (body) ro.observe(body);
  return () => {
    ro.unobserve(el);
    if (body) ro.unobserve(body);
  };
}

const sheets = new Map(); // a slat type's scope -> its sheet's entry
export function useSlatCss(fn) {
  if (!fn?.scope || typeof document === "undefined") return;
  if (sheets.has(fn.scope)) return;
  useCore();
  sheets.set(fn.scope, add(slatSheet(fn)));
}

// --rhp-radius sets all four corners of a Bar to one length. Several lengths (like border-radius takes) make it invalid.
const manyRadii = (css) => [...css.matchAll(/--rhp-radius\s*:([^;{}]*)/g)].some(([, value]) => {
  // Remove whatever is in parentheses (calc, var...) before counting the lengths
  let text = value;
  let inner;
  while ((inner = text.replace(/\([^()]*\)/g, "")) !== text) text = inner;
  return text.trim().split(/\s+/).filter((x) => x && x !== "!important").length > 1;
});
const checkRadii = (css) => manyRadii(css) && console.warn("rhp: --rhp-radius takes one length. For different corners, use --rhp-start-radius and --rhp-end-radius, or border-radius.");

function slatSheet(fn) {
  // The core hides the ::before and ::after of plots and slat roots. A slat whose CSS draws them gets them back.
  const S = `[data-rhp-slat="${fn.scope}"]`;
  const own = /:(before|after)\b/i.test(fn.css)
    ? `:where(${S}, ${S} :where(.rhp-plot, .rhp-plot > *))::before, :where(${S}, ${S} :where(.rhp-plot, .rhp-plot > *))::after { content: none; display: inline; }\n`
    : "";
  return `@layer rhp.slat {\n${important(own + scoped(fn.css, fn.scope))}\n}`;
}

// Gives a slat type new CSS. Every slat of that type restyles at once, wherever it is shown, and none is made again.
// This is for style editors and live previews. The slat type must have been made with `css` (an empty string will do).
export function restyle(fn, css) {
  if (!fn?.scope) throw new Error("rhp: restyle takes a slat type made by slat() with css");
  checkRadii(css);
  fn.css = css;
  const entry = sheets.get(fn.scope);
  if (entry) update(entry, slatSheet(fn));
}

// A slat type: the slat function plus its own CSS and layout, so it looks and lays out the same in any app.
//   css        its CSS, scoped to its slats (theme colors are var(--rhp-<key>))
//   thickness  px per slat along the stack (a row's height or a column's width), or { horizontal, vertical }
//   inset      the empty share of the band on each side of a Bar, Tick or Area (0.18 by default), or a CSS length
//   room       px its labels need outside the plot: { start, end, before, after } (or per orientation).
//              "auto" for start or end (or room: "auto") sizes that side to its widest edge label.
const made = new Map(); // CSS hash -> how many slat types were made with that CSS
export function slat(def, fn) {
  if (typeof def === "function") return def;
  fn.layout = def;
  fn.css = def.css;
  if (def.css != null) {
    // The scope is the hash of its CSS (numbered when another type has the same CSS) so each type has its own
    checkRadii(def.css);
    const h = hash(def.css);
    const n = (made.get(h) ?? 0) + 1;
    made.set(h, n);
    fn.scope = "rhp-s" + h + (n > 1 ? "-" + n : "");
  }
  return fn;
}
