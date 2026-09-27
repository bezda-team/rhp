// rhp brings its own CSS; there is nothing to import. The core is one stylesheet, and each slat type
// with `css` adds one, both built once and adopted by every document (or shadow root) that shows a chart.
//
// Why a page can't change a chart: every declaration is made !important inside rhp's cascade layers.
// For !important the first-declared layer wins, and any layered !important beats an unlayered one,
// so no page rule wins, whatever its specificity, order or own !important. The page reaches a chart
// only through the theme object and props (and inline !important, which nothing writes by accident).
import CORE from "./rhp.css";

const LAYERS = "@layer rhp.place, rhp.slat, rhp.core;";

// Adds !important to every declaration except custom properties and the insides of @keyframes.
export function important(css) {
  css = uncomment(css);
  let out = "", seg = "", depth = 0, quote = null, paren = 0, frames = -1;
  const flush = (end) => {
    const t = seg.trim();
    const decl = t && t[0] !== "@" && !t.startsWith("--") && frames < 0 && /^[a-z-]+\s*:/i.test(t) && !/!important\s*$/i.test(t);
    out += (decl ? seg.replace(/\s*$/, " !important") : seg) + end;
    seg = "";
  };
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === "\\") { seg += ch + (css[++i] ?? ""); continue; } // an escaped character is never a quote, paren or brace
    if (quote) { seg += ch; if (ch === quote || ch === "\n") quote = null; continue; }
    if (ch === '"' || ch === "'") { quote = ch; seg += ch; continue; }
    if (ch === "(") paren++;
    else if (ch === ")") paren--;
    if (paren > 0) { seg += ch; continue; }
    // @keyframes and the descriptor at-rules (@font-face, @property…) take no !important: it would make them invalid
    if (ch === "{") { if (frames < 0 && DESCRIPTORS.test(seg.trim())) frames = depth; out += seg + "{"; seg = ""; depth++; }
    else if (ch === "}") { flush("}"); depth--; if (depth === frames) frames = -1; }
    else if (ch === ";") flush(";");
    else seg += ch;
  }
  return out + seg;
}
const DESCRIPTORS = /^@(-webkit-)?keyframes\b|^@(font-face|property|counter-style|font-palette-values|font-feature-values|view-transition|position-try)\b/i;

// Removes comments, but not a "/*" inside a string.
function uncomment(css) {
  let out = "", quote = null;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === "\\") { out += ch + (css[++i] ?? ""); continue; }
    if (quote) { out += ch; if (ch === quote || ch === "\n") quote = null; continue; }
    if (ch === '"' || ch === "'") { quote = ch; out += ch; continue; }
    if (ch === "/" && css[i + 1] === "*") { const end = css.indexOf("*/", i + 2); i = end < 0 ? css.length : end + 1; continue; }
    out += ch;
  }
  return out;
}

// Splits on commas that are not inside (), [] or quotes.
function split(list) {
  const parts = [];
  let cur = "", depth = 0, quote = null;
  for (let i = 0; i < list.length; i++) {
    const ch = list[i];
    if (ch === "\\") { cur += ch + (list[++i] ?? ""); continue; }
    if (quote) { cur += ch; if (ch === quote || ch === "\n") quote = null; continue; }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (ch === "," && depth === 0) { parts.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

// Where the top level of a selector (outside (), [] and strings) has its pseudo-element, if any.
function pseudoAt(sel) {
  let depth = 0, quote = null;
  for (let i = 0; i < sel.length; i++) {
    const ch = sel[i];
    if (ch === "\\") { i++; continue; }
    if (quote) { if (ch === quote || ch === "\n") quote = null; continue; }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (depth === 0 && ch === ":" && (sel[i + 1] === ":" || /^:(before|after|first-letter|first-line)(?![-\w])/i.test(sel.slice(i)))) return i;
  }
  return -1;
}

// A slat's CSS applies inside that slat type's own slats, the slat root included, and nowhere else: not in the page,
// not in another slat type, not in a slat of another styled type nested inside it. The slat root carries
// data-rhp-slat="<scope>" (S). Each selector X becomes `S:is(.rhp-chart X), S :is(.rhp-chart X)`: the element is the root
// or inside it, and every compound of X is inside the chart (a page's .active or .dark around the chart can't match;
// the Plot's [data-rhp-o] still can; a selector that starts at .rhp-chart is kept as it is). The element also gets :not(:where(the inside of a nested slat of another type)).
// A pseudo-element stays at the end. Rules nested in a style rule (&, or inside an @media in it) keep their selector,
// relative to the scoped parent, plus that :not(). @scope (A) gets A scoped instead of its rules.
// Its @keyframes names get the scope as a prefix, so a page animation with the same name can't replace them.
export function scoped(css, scope) {
  css = uncomment(css);
  for (const [, name] of css.matchAll(/@(?:-webkit-)?keyframes\s+([-\w]+)/g)) {
    const own = scope + "-" + name, word = "(?<![-\\w])" + name + "(?![-\\w])";
    css = css
      .replace(new RegExp("(@(?:-webkit-)?keyframes\\s+)" + word, "g"), "$1" + own)
      .replace(/(animation(?:-name)?\s*:)([^;{}]*)/g, (_, prop, value) => prop + value.replace(new RegExp(word, "g"), own)); // every use in the list
  }
  const S = `[data-rhp-slat="${scope}"]`, other = `:not(:where(${S} [data-rhp-slat]:not(${S}), ${S} [data-rhp-slat]:not(${S}) *))`;
  const one = (sel) => {
    const at = pseudoAt(sel), base = oriented((at < 0 ? sel : sel.slice(0, at)).trim()), pe = at < 0 ? "" : sel.slice(at);
    const x = !base ? "" : /^[^\s>+~]*\.rhp-chart(?![-\w])/.test(base) ? `:is(${base})` : `:is(.rhp-chart ${base})`; // anchored at the chart root
    return `${S}${x}${other}${pe}, ${S} ${x}${other}${pe}`;
  };
  const tail = (sel) => { const at = pseudoAt(sel); return at < 0 ? oriented(sel) + other : oriented(sel.slice(0, at)) + other + sel.slice(at); };
  let out = "", seg = "", quote = null, paren = 0;
  const kinds = []; // "at" (a grouping rule), "frames", "rule" (a style rule), "nested", "scope"
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === "\\") { seg += ch + (css[++i] ?? ""); continue; }
    if (quote) { seg += ch; if (ch === quote || ch === "\n") quote = null; continue; }
    if (ch === '"' || ch === "'") { quote = ch; seg += ch; continue; }
    if (ch === "(") paren++;
    else if (ch === ")") paren--;
    if (paren > 0) { seg += ch; continue; }
    if (ch === "{") {
      const pre = seg.trim(), lead = seg.slice(0, seg.length - seg.trimStart().length);
      const inRule = kinds.includes("rule"), asIs = kinds.includes("frames") || kinds.includes("scope");
      if (pre.startsWith("@")) {
        const sc = !inRule && !asIs && pre.match(/^@scope\s*\(([^]*?)\)([^]*)$/i);
        if (sc) { kinds.push("scope"); out += `${lead}@scope (${split(sc[1]).map(one).join(", ")})${sc[2]} {`; }
        else { kinds.push(/^@(-webkit-)?keyframes/i.test(pre) ? "frames" : inRule ? "nested" : "at"); out += seg + "{"; }
      }
      else if (asIs) { kinds.push("nested"); out += seg + "{"; }
      else if (inRule) { kinds.push("nested"); out += lead + split(pre).map(tail).join(", ") + " {"; } // relative to its scoped parent
      else { kinds.push("rule"); out += lead + split(pre).map(one).join(", ") + " {"; }
      seg = "";
    } else if (ch === "}") { out += seg + "}"; seg = ""; kinds.pop(); }
    else if (ch === ";" && (kinds.length === 0 || kinds[kinds.length - 1] === "at")) { out += seg + ";"; seg = ""; } // @import, @layer statements
    else seg += ch;
  }
  return out + seg;
}

// :horizontal and :vertical in a slat's CSS match a slat root, a block or a Plot drawn in that orientation
// (`.bar:vertical`, `.row:horizontal .name`). rhp marks those elements with data-rhp-o.
// Only outside strings, and not after a pseudo-element (::-webkit-scrollbar:horizontal is the browser's own).
function oriented(sel) {
  if (!/:(horizontal|vertical)/.test(sel)) return sel;
  let out = "", quote = null;
  for (let i = 0; i < sel.length; i++) {
    const ch = sel[i];
    if (ch === "\\") { out += ch + (sel[++i] ?? ""); continue; }
    if (quote) { out += ch; if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'") { quote = ch; out += ch; continue; }
    const m = ch === ":" && sel[i - 1] !== ":" && sel.slice(i).match(/^:(horizontal|vertical)(?![-\w(])/);
    if (m) { out += `[data-rhp-o="${m[1][0]}"]`; i += m[0].length - 1; continue; }
    out += ch;
  }
  return out;
}

// A short, stable name from the CSS text, so a server and a browser pick the same one.
const hash = (t) => { let h = 5381; for (let i = 0; i < t.length; i++) h = (h * 33) ^ t.charCodeAt(i); return (h >>> 0).toString(36); };

// Every root that holds a chart (the document; an iframe's or popup's document; a shadow root) gets every sheet.
// An entry is one stylesheet's text; each root holds its own copy of it, which update() rewrites in place.
const roots = new Map(), entries = []; // root -> Map(entry -> the sheet adopted there, or its <style>)
function adoptInto(root, entry) {
  const doc = root.ownerDocument ?? root;
  if (!Array.isArray(root.adoptedStyleSheets)) { // jsdom, older browsers: a <style> element instead
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
// Adopted sheets come after every <link> and <style>, so a page layer would be declared before rhp's.
// This <style> declares rhp's layers first, in a document and in a shadow root, and stays first: a sheet
// put before it later (emotion/MUI injectFirst, a head manager) or its removal puts it back in front.
// Under a strict CSP it takes the page's nonce; with no nonce, the statement goes into the first sheet the page
// lets rhp edit (CSSOM is not subject to CSP).
const MARK = "data-rhp-layers";
function declareLayers(root) {
  const doc = root.ownerDocument ?? root, parent = root.nodeType === 9 ? root.head : root;
  if (!parent) return;
  const el = doc.createElement("style");
  el.textContent = LAYERS;
  el.setAttribute(MARK, "");
  const nonce = doc.querySelector("style[nonce], link[nonce], script[nonce]")?.nonce;
  if (nonce) el.nonce = nonce;
  const edited = new WeakSet();
  let moves = 0, reset;
  const keep = () => {
    const first = root.querySelector('style:not([data-rhp-server]), link[rel~="stylesheet"]'); // not a server's, which goes
    if (!first?.hasAttribute(MARK)) {
      if (++moves > 20) return; // another script keeps its own sheet first: stop instead of looping with it
      reset ??= setTimeout(() => { moves = 0; reset = undefined; }, 1000);
      first ? first.before(el) : parent.prepend(el);
    }
    if (el.sheet) return;
    for (const s of root.styleSheets) { // blocked by CSP
      if (edited.has(s)) return;
      try { s.insertRule(LAYERS, 0); edited.add(s); return; } catch {} // a cross-origin sheet can't be edited
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
  for (const e of entries) adoptInto(root, e);
}
function add(css) {
  if (!roots.size) addRoot(document);
  const entry = { css };
  entries.push(entry);
  for (const r of roots.keys()) adoptInto(r, entry);
  return entry;
}
function update(entry, css) {
  entry.css = css;
  for (const own of roots.values()) {
    const s = own.get(entry);
    if (s) s.replaceSync ? s.replaceSync(css) : (s.textContent = css);
  }
}

// On a server: the CSS a chart's first paint needs, written into the page with it: rhp's core and the sheets of the slat
// types drawn in it. Each goes into a page once per render (`render`: an object the render shares, its assets list); a chart rendered
// on its own (an island) brings all it needs.
let coreText;
const written = new WeakMap(); // render -> the sheets already in its page
export function serverSheets(slats, render) {
  const seen = render ? written.get(render) ?? written.set(render, new Set()).get(render) : new Set();
  let out = "";
  if (!seen.has("core")) { seen.add("core"); out += (coreText ??= LAYERS + "\n" + important(CORE)); }
  for (const fn of slats) if (!seen.has(fn.scope)) { seen.add(fn.scope); out += "\n" + slatSheet(fn); }
  return out;
}

let core = false;
export function useCore() {
  if (core || typeof document === "undefined") return;
  core = true;
  add(LAYERS + "\n" + important(CORE));
}
// Called by a Chart once it is in the page, and again whenever its size changes: a chart in another document or in a
// shadow root brings the sheets along, also when it is moved there after mount (a popup, Document Picture-in-Picture)
// or was rendered detached; a root whose adoptedStyleSheets were overwritten gets them back.
export function useRoot(el) {
  const r = el.getRootNode();
  if (r === el || (r.nodeType !== 9 && r.nodeType !== 11)) return;
  if (!roots.has(r)) return addRoot(r);
  const own = [...roots.get(r).values()], list = r.adoptedStyleSheets;
  if (Array.isArray(list) && own.some((s) => !list.includes(s))) r.adoptedStyleSheets = [...list.filter((s) => !own.includes(s)), ...own];
}
let ro;
export function watchRoot(el) {
  if (typeof ResizeObserver === "undefined") return () => {};
  ro ??= new ResizeObserver((es) => { for (const e of es) useRoot(e.target); });
  const body = el.querySelector(".rhp-body"); // the root's border box and the body's content box: one of them changes when rhp's CSS goes, whatever size the page fixes
  ro.observe(el, { box: "border-box" }); if (body) ro.observe(body);
  return () => { ro.unobserve(el); if (body) ro.unobserve(body); };
}
const sheets = new Map(); // a slat type's scope -> its sheet's entry
export function useSlatCss(fn) {
  if (!fn?.scope || typeof document === "undefined") return;
  if (sheets.has(fn.scope)) return;
  useCore();
  sheets.set(fn.scope, add(slatSheet(fn)));
}
// --rhp-radius sets every corner of a Bar to one length. Several (as in border-radius) would make them all invalid.
const manyRadii = (css) => [...css.matchAll(/--rhp-radius\s*:([^;{}]*)/g)]
  .some(([, v]) => { let t = v, u; while ((u = t.replace(/\([^()]*\)/g, "")) !== t) t = u; return t.trim().split(/\s+/).filter((x) => x && x !== "!important").length > 1; });
const checkRadii = (css) => manyRadii(css) && console.warn("rhp: --rhp-radius takes one length. For different corners, use --rhp-start-radius and --rhp-end-radius, or border-radius.");
function slatSheet(fn) {
  // The core hides the ::before and ::after of plots and slat roots (display: none, cheaper to style than content: none).
  // A slat whose CSS draws some gets them back inside its own slats; its own rules still win.
  const S = `[data-rhp-slat="${fn.scope}"]`;
  const own = /:(before|after)\b/i.test(fn.css)
    ? `:where(${S}, ${S} :where(.rhp-plot, .rhp-plot > *))::before, :where(${S}, ${S} :where(.rhp-plot, .rhp-plot > *))::after { content: none; display: inline; }\n` : "";
  return `@layer rhp.slat {\n${important(own + scoped(fn.css, fn.scope))}\n}`;
}

/**
 * Gives a slat type new CSS. Every slat of that type restyles at once, wherever it is shown, and none is made again:
 * one stylesheet is rewritten. For style editors and live previews; elsewhere a slat's look is set where it is defined.
 * The slat type must have been made with `css` (an empty string will do), which gives its slats their scope.
 */
export function restyle(fn, css) {
  if (!fn?.scope) throw new Error("rhp: restyle takes a slat type made by slat() with css");
  checkRadii(css);
  fn.css = css;
  const entry = sheets.get(fn.scope);
  if (entry) update(entry, slatSheet(fn));
}

const made = new Map(); // CSS hash -> how many slat types were made with that CSS
/**
 * A slat definition: the slat function plus what it owns, so it looks and lays out the same in any app.
 *   css    its own CSS, scoped to its slats (the slat root included); theme colors as var(--rhp-<key>)
 *   thickness  px along the stack per slat (a row's height, a column's width): a number, or { horizontal, vertical }
 *          (default 32 horizontal; vertical fills)
 *   inset  empty share of the band on each side of a Bar, Tick or Area: 0..0.5 (default 0.18), or a CSS length
 *   room   px the slat's labels need outside the plot: { start, end, before, after }, or per orientation
 *          { horizontal: {…}, vertical: {…} }. start/end are the ends of the value axis (category names go
 *          at start); before/after are the two ends of the stack.
 */
export function slat(def, fn) {
  if (typeof def === "function") return def;
  fn.layout = def;
  fn.css = def.css;
  if (def.css != null) { // the scope is its CSS's hash, numbered when another type has the same CSS, so each type has its own
    checkRadii(def.css);
    const h = hash(def.css), n = (made.get(h) ?? 0) + 1;
    made.set(h, n);
    fn.scope = "rhp-s" + h + (n > 1 ? "-" + n : "");
  }
  return fn;
}
