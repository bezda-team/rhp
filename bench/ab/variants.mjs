// Variants of rhp: each is a list of edits to its source, made while bundling (src/ itself is never changed).
// A CSS edit works on the parsed stylesheet and must touch exactly the rules it expects; a JS edit replaces text that
// must occur exactly once. So a variant can't silently measure nothing.
import { editCss, drop, decls, setDecls, rules } from "./css-edit.mjs";

// The rules that protect a chart from the page's CSS (guard.css). The 2026-10-24 study measured these variants on
// rhp 2.0.5, whose rhp.css held them (results/study-2026-10-24, and this file at dc06a3a); they edit guard.css now.
const isGuard = (r) => r.prelude.startsWith(":where(.rhp-body") && r.body.includes("display: revert");
const isSizes = (r) => r.prelude.startsWith(":where(.rhp-body") && r.body.includes("width: auto") && !r.body.includes("display");
const isViewTransition = (r) => r.prelude.includes(":active-view-transition");
const isHidden = (r) => r.prelude.startsWith(":where(.rhp-body") && r.prelude.endsWith("[hidden]");
const isPseudo = (r) => r.prelude.includes("::before") && r.body.includes("display: none");
const isSelection = (r) => r.prelude.includes("::selection");
const isTransition = (r) => /transition-property/.test(r.body) && !r.prelude.includes("rhp-reorder");

const css = (file, f, expect) => ({ file, css: (text) => editCss(text, f, expect) });
const js = (file, find, replace) => ({ file, find, replace });

// The guard without its resets (box-sizing, which rhp's own geometry needs, is a rule of rhp.css)
const noResets = (tree) => drop(tree, isGuard);

const guardOnly = (keep) => (tree) => {
  let n = 0;
  for (const r of rules(tree)) {
    if (!isGuard(r)) continue;
    setDecls(r, decls(r).filter(([k, v]) => keep(k, v)));
    n++;
  }
  return n;
};

export const VARIANTS = {
  base: { about: "rhp as it is", edits: [] },
  "base-b": { about: "rhp as it is, a second bundle (A/A control)", edits: [] },

  noguard: {
    about: "the guard's 42 resets gone (box-sizing kept, so a clean page draws the same)",
    edits: [css("guard.css", noResets, 1)],
  },

  "guard-inherit": {
    about: "the guard keeps only its 25 inherit declarations (font, color, letter-spacing...)",
    edits: [css("guard.css", guardOnly((k, v) => v === "inherit"), 1)],
  },

  "guard-reset": {
    about: "the guard keeps only its 17 resets that aren't inherit (margin, padding, border, display...)",
    edits: [css("guard.css", guardOnly((k, v) => v !== "inherit"), 1)],
  },

  noprotect: {
    about: "every page-protection rule gone: guard, sizes, view-transition, [hidden], ::before/::after, ::selection (as noCssGuard())",
    edits: [css("guard.css", (tree) => noResets(tree) + drop(tree, (r) => isSizes(r) || isViewTransition(r) || isHidden(r) || isPseudo(r) || isSelection(r)), 6)],
  },

  noselection: {
    about: "the ::selection rule gone",
    edits: [css("guard.css", (tree) => drop(tree, isSelection), 1)],
  },

  notransition: {
    about: "the CSS version's transition rules gone",
    edits: [css("rhp.css", (tree) => drop(tree, isTransition), 3)],
  },

  // Normal declarations instead of !important. The layers are declared in the other order, so placement still beats a
  // slat's CSS and the core for normal declarations (on a clean page this draws the same; on a hostile one it doesn't).
  noimportant: {
    about: "no !important anywhere (layers reversed so precedence among rhp's own rules stays the same)",
    edits: [
      js("style.js", 'const LAYERS = "@layer rhp.place, rhp.slat, rhp.core;";', 'const LAYERS = "@layer rhp.core, rhp.slat, rhp.place;";'),
      js("style.js", 'export const coreSheet = () => (coreText ??= LAYERS + "\\n" + position(positionInherits) + "\\n" + important(CORE) + "\\n" + MANYDOTS);', 'export const coreSheet = () => (coreText ??= LAYERS + "\\n" + position(positionInherits) + "\\n" + CORE + "\\n" + MANYDOTS);'),
      js("style.js", "export const guardSheet = (gated) => (gated ? (gatedText ??= important(gate(GUARD))) : (guardText ??= important(GUARD)));", "export const guardSheet = (gated) => (gated ? (gatedText ??= gate(GUARD)) : (guardText ??= GUARD));"),
      js("style.js", 'export const gutterSheet = () => (guttersText ??= important(GUTTERS));', "export const gutterSheet = () => (guttersText ??= GUTTERS);"),
      js("style.js", 'export const crossSheet = () => (crossText ??= important(CROSS));', "export const crossSheet = () => (crossText ??= CROSS);"),
    ],
  },
};


// The second set: what other parts of the core CSS and the chart root cost (diagnostic: several change the surface)
const ruleWith = (prelude, has) => (r) => r.prelude === prelude && (!has || r.body.includes(has));
const editRule = (prelude, has, f) => (tree) => {
  let n = 0;
  for (const r of rules(tree)) {
    if (!ruleWith(prelude, has)(r)) continue;
    setDecls(r, f(decls(r)));
    n++;
  }
  return n;
};
const without = (list, ...names) => list.filter(([k]) => !names.includes(k));
const swap = (list, name, ...add) => {
  const i = list.findIndex(([k]) => k === name);
  if (i < 0) throw new Error("no declaration " + name);
  return [...list.slice(0, i), ...add, ...list.slice(i + 1)];
};
const all = (...fs) => (tree) => fs.reduce((n, f) => n + f(tree), 0);

Object.assign(VARIANTS, {
  regprops: {
    about: "--rhp-lo, --rhp-hi and --rhp-p registered as <number> (inherits: true), so each is worked out once per element",
    edits: [js("rhp.css", "@layer rhp.core {\n\n  /* Every element rhp makes", '@property --rhp-lo { syntax: "<number>"; inherits: true; initial-value: 0; }\n@property --rhp-hi { syntax: "<number>"; inherits: true; initial-value: 0; }\n@property --rhp-p { syntax: "<number>"; inherits: true; initial-value: 0; }\n@layer rhp.core {\n\n  /* Every element rhp makes')],
  },

  noknobs: {
    about: "the chart root no longer sets 24 --rhp-* knobs to initial (page variables could then reach in)",
    edits: [js("plot.jsx", '  KNOBS["--rhp-" + name] = "initial";', "  void name;")],
  },

  leanguard: {
    about: "the guard's shorthands that expand to many longhands narrowed to the longhands that stop the page: animation-name, transition-property/delay/behavior, text-decoration-line",
    edits: [css("guard.css", (tree) => {
      let n = 0;
      for (const r of rules(tree)) {
        if (!isGuard(r)) continue;
        let d = decls(r);
        d = swap(d, "animation", ["animation-name", "none"]);
        d = swap(d, "transition", ["transition-property", "none"], ["transition-delay", "0s"], ["transition-behavior", "normal"]);
        d = swap(d, "text-decoration", ["text-decoration-line", "none"]);
        setDecls(r, d);
        n++;
      }
      return n;
    }, 1)],
  },

  nostarting: {
    about: "the gridlines' @starting-style rule gone",
    edits: [css("rhp.css", (tree) => {
      const before = JSON.stringify(tree).length;
      const walk = (list) => {
        for (let i = list.length - 1; i >= 0; i--) {
          if (list[i].prelude?.startsWith("@starting-style")) list.splice(i, 1);
          else if (list[i].children) walk(list[i].children);
        }
      };
      walk(tree);
      return JSON.stringify(tree).length < before ? 1 : 0;
    }, 1)],
  },

  noclip: {
    about: "the blocks' clip-path: var(--rhp-clip, none) rule gone (shapes stop working)",
    edits: [css("rhp.css", (tree) => drop(tree, (r) => /^clip-path: var\(--rhp-clip, none\);?$/.test(r.body.trim())), 1)],
  },

  noradius: {
    about: "the Bar's four corner rules gone (square bars)",
    edits: [css("rhp.css", (tree) => drop(tree, (r) => /^border-top-left-radius/.test(r.body.trim()) && /rhp-bar/.test(r.prelude)), 4)],
  },

  notoward: {
    about: "--rhp-toward-end set on the Plot and on backward bars only, not on every forward bar",
    edits: [css("rhp.css", all(
      (tree) => { let n = 0; for (const r of rules(tree)) if (r.prelude === '.rhp-plot[data-rhp-o="h"], .rhp-bar[data-rhp-o="h"]:not([data-rhp-back])') { r.prelude = '.rhp-plot[data-rhp-o="h"]'; n++; } return n; },
      (tree) => { let n = 0; for (const r of rules(tree)) if (r.prelude === '.rhp-plot[data-rhp-o="v"], .rhp-bar[data-rhp-o="v"]:not([data-rhp-back])') { r.prelude = '.rhp-plot[data-rhp-o="v"]'; n++; } return n; },
    ), 2)],
  },

  nocontainer: {
    about: "the chart body is no longer a size container (cq units in slat CSS stop working)",
    edits: [css("rhp.css", editRule(".rhp-body", "container-type", (d) => without(d, "container-type")), 1)],
  },

  // Centering without a translate (a translate gives every element a transform of its own to paint): margins and
  // insets instead. Only the blocks the scenarios draw, horizontal and vertical; gridline numbers and cross labels keep theirs.
  nocenter: {
    about: "bars, ticks, dots and labels centered with auto margins or negative margins instead of translate",
    edits: [
      css("rhp.css", all(
        editRule('.rhp-bar[data-rhp-o="h"]', "translate", (d) => without(swap(d, "top", ["top", "0"], ["bottom", "0"], ["margin-top", "auto"], ["margin-bottom", "auto"]), "translate")),
        editRule('.rhp-bar[data-rhp-o="v"]', "translate", (d) => without(swap(d, "left", ["left", "0"], ["right", "0"], ["margin-left", "auto"], ["margin-right", "auto"]), "translate")),
        editRule('.rhp-dot[data-rhp-o="h"]', "translate", (d) => [...without(d, "translate"), ["margin-left", "calc(var(--rhp-size, 10px) / -2)"], ["margin-top", "calc(var(--rhp-size, 10px) / -2)"]]),
        editRule('.rhp-dot[data-rhp-o="v"]', "translate", (d) => [...without(d, "translate"), ["margin-left", "calc(var(--rhp-size, 10px) / -2)"], ["margin-bottom", "calc(var(--rhp-size, 10px) / -2)"]]),
        editRule('.rhp-tick[data-rhp-o="h"]', "translate", (d) => [...without(swap(d, "top", ["top", "0"], ["bottom", "0"], ["margin-top", "auto"], ["margin-bottom", "auto"]), "translate"), ["margin-left", "calc(var(--rhp-tick-width, 2px) / -2)"]]),
        editRule('.rhp-tick[data-rhp-o="v"]', "translate", (d) => [...without(swap(d, "left", ["left", "0"], ["right", "0"], ["margin-left", "auto"], ["margin-right", "auto"]), "translate"), ["margin-bottom", "calc(var(--rhp-tick-width, 2px) / -2)"]]),
        editRule('.rhp-label[data-rhp-at][data-rhp-o="h"]', "translate", (d) => without(swap(d, "top", ["top", "0"], ["bottom", "0"], ["height", "fit-content"], ["margin-top", "auto"], ["margin-bottom", "auto"]), "translate")),
        editRule('.rhp-label[data-rhp-at][data-rhp-o="h"][data-rhp-side="before"]', "translate", (d) => [...without(d, "translate"), ["left", "auto"], ["right", "calc((1 - min(var(--rhp-p), 1)) * 100%)"]]),
        editRule('.rhp-label[data-rhp-at][data-rhp-o="v"]', "translate", (d) => without(swap(d, "left", ["left", "0"], ["right", "0"], ["width", "fit-content"], ["margin-left", "auto"], ["margin-right", "auto"]), "translate")),
        editRule('.rhp-label[data-rhp-at][data-rhp-o="v"][data-rhp-side="before"]', "translate", (d) => [...without(d, "translate"), ["bottom", "auto"], ["top", "calc((1 - max(var(--rhp-p), 0)) * 100%)"]]),
        editRule('.rhp-label[data-rhp-edge][data-rhp-o="h"]', "translate", (d) => without(swap(d, "top", ["top", "0"], ["bottom", "0"], ["height", "fit-content"], ["margin-top", "auto"], ["margin-bottom", "auto"]), "translate")),
      ), 11),
      css("cross.css", all(
        editRule('.rhp-chart[data-rhp-cross] .rhp-dot[data-rhp-o="h"]', "translate", (d) => [...without(d, "translate"), ["margin-bottom", "calc(var(--rhp-size, 10px) / -2)"]]),
      ), 1),
    ],
  },
});


// The third set: ::selection, and guards that keep their protection
const splitWhere = (prelude) => {
  // :where(a, b, c) as :where(a), :where(b), :where(c): the same zero specificity, one selector per class for the browser
  const m = prelude.match(/^:where\((.*)\)(\[hidden\])?$/s);
  if (!m) return null;
  const parts = [];
  let depth = 0, cur = "";
  for (const ch of m[1]) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  parts.push(cur.trim());
  return parts.map((x) => `:where(${x})${m[2] ?? ""}`).join(", ");
};

Object.assign(VARIANTS, {
  "sel-labels": {
    about: "::selection only on labels and axis numbers themselves, not on what is inside blocks",
    edits: [css("guard.css", (tree) => {
      let n = 0;
      for (const r of rules(tree)) {
        if (!isSelection(r)) continue;
        r.prelude = ":is(.rhp-label, .rhp-gridline > span)::selection";
        n++;
      }
      return n;
    }, 1)],
  },

  "sel-inside": {
    about: "::selection only on what is inside blocks and labels (the descendant half of the rule)",
    edits: [css("guard.css", (tree) => {
      let n = 0;
      for (const r of rules(tree)) {
        if (!isSelection(r)) continue;
        r.prelude = ":is(.rhp-label, .rhp-gridline > span, .rhp-bar, .rhp-dot, .rhp-tick, .rhp-cell) ::selection";
        n++;
      }
      return n;
    }, 1)],
  },

  wheresplit: {
    about: "every :where(a, b, ...) guard rule written as :where(a), :where(b), ... (same specificity and protection)",
    edits: [css("guard.css", (tree) => {
      let n = 0;
      for (const r of rules(tree)) {
        const next = r.prelude.startsWith(":where(.rhp-body") && !r.prelude.includes("::") ? splitWhere(r.prelude) : null;
        if (!next) continue;
        r.prelude = next;
        n++;
      }
      return n;
    }, 3)],
  },

  // The inherit declarations matter only where there is text: labels, axis numbers, slat roots and Plots (their
  // labels inherit from them), and any block with something inside. An empty Bar, Dot, Tick or Cell skips them.
  emptyguard: {
    about: "the guard's inherit declarations skipped on empty blocks (:empty), everything else as before",
    edits: [css("guard.css", (tree) => {
      let n = 0;
      for (let i = 0; i < tree.length; i++) {
        const layer = tree[i];
        if (!layer.children) continue;
        for (let j = 0; j < layer.children.length; j++) {
          const r = layer.children[j];
          if (!r.body || !isGuard(r)) continue;
          const d = decls(r);
          const inherit = d.filter(([, v]) => v === "inherit");
          const rest = d.filter(([, v]) => v !== "inherit");
          r.body = rest.map(([k, v]) => `${k}: ${v}`).join("; ");
          const text = ":where(.rhp-body, .rhp-axis, .rhp-gridline, .rhp-gridline > span, .rhp-plot, .rhp-plot > :not(.rhp-bar, .rhp-dot, .rhp-tick, .rhp-cell), .rhp-label, .rhp-place, .rhp-area, .rhp-area path, .rhp-line, .rhp-line path, :is(.rhp-bar, .rhp-dot, .rhp-tick, .rhp-cell):not(:empty))";
          layer.children.splice(j + 1, 0, { prelude: text, body: inherit.map(([k, v]) => `${k}: ${v}`).join("; ") });
          n++;
          j++;
        }
      }
      return n;
    }, 1)],
  },
});


// The guard split by what each kind of element needs, dropping only resets that do nothing there (see the report):
//   background: Bar, Dot, Tick and Cell set their whole background themselves
//   float, vertical-align: every element but the body is absolutely placed or a grid item, where both do nothing
//   the inherit declarations: an empty block has no text (as emptyguard)
//   and the shorthands narrowed as in leanguard
const ALL = ".rhp-body, .rhp-axis, .rhp-gridline, .rhp-gridline > span, .rhp-plot, .rhp-plot > *, .rhp-bar, .rhp-dot, .rhp-tick, .rhp-label, .rhp-cell, .rhp-place, .rhp-area, .rhp-area path, .rhp-line, .rhp-line path";
const NO_OWN_BG = ".rhp-body, .rhp-axis, .rhp-gridline, .rhp-gridline > span, .rhp-plot, .rhp-plot > :not(.rhp-bar, .rhp-dot, .rhp-tick, .rhp-cell), .rhp-label, .rhp-place, .rhp-area, .rhp-area path, .rhp-line, .rhp-line path";
const TEXT = ".rhp-body, .rhp-axis, .rhp-gridline, .rhp-gridline > span, .rhp-plot, .rhp-plot > :not(.rhp-bar, .rhp-dot, .rhp-tick, .rhp-cell), .rhp-label, .rhp-place, .rhp-area, .rhp-area path, .rhp-line, .rhp-line path, :is(.rhp-bar, .rhp-dot, .rhp-tick, .rhp-cell):not(:empty)";
VARIANTS.trimguard = {
  about: "the guard split by element kind, without the resets that do nothing there, and with leanguard's narrowed shorthands",
  edits: [css("guard.css", (tree) => {
    let n = 0;
    for (const layer of tree) {
      if (!layer.children) continue;
      const i = layer.children.findIndex((r) => r.body && isGuard(r));
      if (i < 0) continue;
      const d = decls(layer.children[i]);
      const get = (k) => d.find(([x]) => x === k);
      const common = d.filter(([k, v]) => v !== "inherit" && !["background", "float", "vertical-align", "animation", "transition", "text-decoration"].includes(k));
      common.push(["animation-name", "none"], ["transition-property", "none"], ["transition-delay", "0s"], ["transition-behavior", "normal"], ["text-decoration-line", "none"]);
      const text = d.filter(([, v]) => v === "inherit");
      const body = (list) => list.map(([k, v]) => `${k}: ${v}`).join("; ");
      layer.children.splice(i, 1,
        { prelude: `:where(${ALL})`, body: body(common) },
        { prelude: `:where(${NO_OWN_BG})`, body: body([get("background")]) },
        { prelude: ":where(.rhp-body)", body: body([get("float"), get("vertical-align")]) },
        { prelude: `:where(${TEXT})`, body: body(text) });
      n++;
    }
    return n;
  }, 1)],
};


// trimguard without its text-skip on empty blocks: every element keeps every inherit declaration
VARIANTS.safetrim = {
  about: "trimguard keeping the inherit declarations on every element: only background on blocks that set their own, float/vertical-align off the body, and leanguard's shorthands",
  edits: [css("guard.css", (tree) => {
    let n = 0;
    for (const layer of tree) {
      if (!layer.children) continue;
      const i = layer.children.findIndex((r) => r.body && isGuard(r));
      if (i < 0) continue;
      const d = decls(layer.children[i]);
      const get = (k) => d.find(([x]) => x === k);
      const common = d.filter(([k]) => !["background", "float", "vertical-align", "animation", "transition", "text-decoration"].includes(k));
      common.push(["animation-name", "none"], ["transition-property", "none"], ["transition-delay", "0s"], ["transition-behavior", "normal"], ["text-decoration-line", "none"]);
      const body = (list) => list.map(([k, v]) => `${k}: ${v}`).join("; ");
      layer.children.splice(i, 1,
        { prelude: `:where(${ALL})`, body: body(common) },
        { prelude: `:where(${NO_OWN_BG})`, body: body([get("background")]) },
        { prelude: ":where(.rhp-body)", body: body([get("float"), get("vertical-align")]) });
      n++;
    }
    return n;
  }, 1)],
};


// The study's gated, gated-off and pos* variants are rhp itself now: noCssGuard on a Chart gates the guard (measure it
// with base?pre=noguard and base?noguard=1), and --rhp-position stays on slat roots (base?inherit=1 passes it down as
// rhp 2.0 did). Their definitions are in this file at dc06a3a.


// ::selection written as one rule for everything inside a chart body (a superset of what today's rule covers)
VARIANTS["sel-body"] = {
  about: "::selection as .rhp-body ::selection (everything inside a chart, one simple rule)",
  edits: [css("guard.css", (tree) => { let n = 0; for (const r of rules(tree)) if (isSelection(r)) { r.prelude = ".rhp-body ::selection"; n++; } return n; }, 1)],
};
VARIANTS["sel-flat"] = {
  about: "::selection as today, written as a plain list without :is()",
  edits: [css("guard.css", (tree) => { let n = 0; for (const r of rules(tree)) if (isSelection(r)) { r.prelude = ".rhp-label::selection, .rhp-gridline > span::selection, .rhp-label ::selection, .rhp-gridline > span ::selection, .rhp-bar ::selection, .rhp-dot ::selection, .rhp-tick ::selection, .rhp-cell ::selection"; n++; } return n; }, 1)],
};

// The guard rules in a layer of their own after rhp.core (for !important the later layer loses, so rhp's own rules
// still win without the guard needing zero specificity), with plain selectors the browser can file by class, tag or
// attribute. Slat roots are matched by the data-rhp-o rhp puts on them (the chart root, which belongs to the page, is left out).
const GUARD_TARGETS = ".rhp-body, .rhp-axis, .rhp-gridline, .rhp-gridline > span, .rhp-plot, [data-rhp-o]:not(.rhp-chart), .rhp-bar, .rhp-dot, .rhp-tick, .rhp-label, .rhp-cell, .rhp-place, .rhp-area, .rhp-area path, .rhp-line, .rhp-line path";
VARIANTS.guardlayer = {
  about: "guard, sizes and [hidden] rules in their own last layer (rhp.guard) with plain selectors",
  edits: [
    js("style.js", 'const LAYERS = "@layer rhp.place, rhp.slat, rhp.core;";', 'const LAYERS = "@layer rhp.place, rhp.slat, rhp.core, rhp.guard;";'),
    css("guard.css", (tree) => {
      const moved = [];
      for (const layer of tree) {
        if (!layer.children || layer.prelude !== "@layer rhp.core") continue;
        for (let i = layer.children.length - 1; i >= 0; i--) {
          const r = layer.children[i];
          if (!r.body || !(isGuard(r) || isSizes(r) || isHidden(r))) continue;
          layer.children.splice(i, 1);
          if (isGuard(r)) r.prelude = GUARD_TARGETS;
          else if (isSizes(r)) r.prelude = GUARD_TARGETS.replace("[data-rhp-o]:not(.rhp-chart)", "[data-rhp-o]:not(.rhp-chart, svg, img, canvas, video, iframe, embed, object)").replace(", .rhp-place, .rhp-area, .rhp-area path, .rhp-line, .rhp-line path", "");
          else r.prelude = GUARD_TARGETS.split(", ").filter((x) => !x.endsWith(" path")).map((x) => x.includes(":not(") ? x.replace(":not(.rhp-chart)", "[hidden]:not(.rhp-chart)") : x + "[hidden]").join(", ");
          moved.unshift(r);
        }
        break;
      }
      if (moved.length) tree.push({ prelude: "@layer rhp.guard", children: moved });
      return moved.length;
    }, 3),
  ],
};


// A static Plot's blocks write their element once and make no effect (the row's owner is disposed right after anyway).
// Like the reverted b63fab8, written for today's blocks.jsx.
VARIANTS.staticfast = {
  about: "blocks inside a static Plot set everything once and create no effects",
  edits: [
    js("plot.jsx", "export const useOrientation = () => useContext(Around).orientation;", "export const useOrientation = () => useContext(Around).orientation;\nexport const useStill = () => useContext(Around).still;"),
    js("blocks.jsx", 'import { createMemo, createRenderEffect, splitProps } from "solid-js";', 'import { createMemo, createRenderEffect, splitProps, untrack } from "solid-js";'),
    js("blocks.jsx", 'import { useOrientation, useCrossed, short } from "./plot.jsx";', 'import { useOrientation, useCrossed, useStill, short } from "./plot.jsx";'),
    js("blocks.jsx", "  const el = <div />;\n  if (\"children\" in props) insert(el, () => props.children);", `  // In a static Plot a row is drawn once and its owner disposed right away, so the block writes it all once
  if (useStill()) {
    const el = <div />;
    if ("children" in props) insert(el, props.children);
    untrack(() => {
      el.setAttribute("class", cls(base, props.class));
      el.setAttribute("data-rhp-o", short(orientation()));
      const a = attrs?.();
      for (const key in a) {
        if (a[key] != null) el.setAttribute(key, a[key]);
      }
      if (props.style) style(el, props.style);
      const v = vars(orientation() === "vertical");
      for (const key in v) {
        if (v[key] != null) el.style.setProperty(key, v[key]);
      }
      if (back?.(v)) el.setAttribute("data-rhp-back", "");
    });
    props.ref?.(el);
    return el;
  }

  const el = <div />;
  if ("children" in props) insert(el, () => props.children);`),
  ],
};

// nocenter for the shapes only (Bar, Dot, Tick): labels keep their translate, which is where the pixels changed
VARIANTS["nocenter-shapes"] = {
  about: "bars, ticks and dots centered with margins instead of translate (labels as they are)",
  edits: [
    css("rhp.css", all(
      editRule('.rhp-bar[data-rhp-o="h"]', "translate", (d) => without(swap(d, "top", ["top", "0"], ["bottom", "0"], ["margin-top", "auto"], ["margin-bottom", "auto"]), "translate")),
      editRule('.rhp-bar[data-rhp-o="v"]', "translate", (d) => without(swap(d, "left", ["left", "0"], ["right", "0"], ["margin-left", "auto"], ["margin-right", "auto"]), "translate")),
      editRule('.rhp-dot[data-rhp-o="h"]', "translate", (d) => [...without(d, "translate"), ["margin-left", "calc(var(--rhp-size, 10px) / -2)"], ["margin-top", "calc(var(--rhp-size, 10px) / -2)"]]),
      editRule('.rhp-dot[data-rhp-o="v"]', "translate", (d) => [...without(d, "translate"), ["margin-left", "calc(var(--rhp-size, 10px) / -2)"], ["margin-bottom", "calc(var(--rhp-size, 10px) / -2)"]]),
      editRule('.rhp-tick[data-rhp-o="h"]', "translate", (d) => [...without(swap(d, "top", ["top", "0"], ["bottom", "0"], ["margin-top", "auto"], ["margin-bottom", "auto"]), "translate"), ["margin-left", "calc(var(--rhp-tick-width, 2px) / -2)"]]),
      editRule('.rhp-tick[data-rhp-o="v"]', "translate", (d) => [...without(swap(d, "left", ["left", "0"], ["right", "0"], ["margin-left", "auto"], ["margin-right", "auto"]), "translate"), ["margin-bottom", "calc(var(--rhp-tick-width, 2px) / -2)"]]),
    ), 6),
    css("cross.css", editRule('.rhp-chart[data-rhp-cross] .rhp-dot[data-rhp-o="h"]', "translate", (d) => [...without(d, "translate"), ["margin-bottom", "calc(var(--rhp-size, 10px) / -2)"]]), 1),
  ],
};


// For counting the browser's style cache: without the size container, a mount's style is worked out in one style pass
// (which the trace reports with its counters), not inside layout. count-inherit passes --rhp-position down, as rhp 2.0.
VARIANTS["count-base"] = { about: "nocontainer, for style counters", edits: [...VARIANTS.nocontainer.edits] };
VARIANTS["count-inherit"] = {
  about: "nocontainer with --rhp-position passed down (inheritPosition), for style counters",
  edits: [...VARIANTS.nocontainer.edits, js("style.js", "let positionInherits = false;", "let positionInherits = true;")],
};


// A block's first values written as one cssText instead of a setProperty each, when it has no style prop and every
// value is safe to put in a style attribute (safeCssValue, as a server checks), so a value can't add a declaration
VARIANTS.csstext = {
  about: "a block's first CSS variables set with one cssText, not one setProperty each",
  edits: [js("blocks.jsx", `    const css = st !== prev?.st ? setStyle(el, st, prev?.css, Object.keys(v)) : prev?.css;

    for (const key in v) {
      if (v[key] === prev?.v[key]) continue;
      if (prev) write(el, key, v[key]);
      else if (v[key] != null) el.style.setProperty(key, v[key]);
    }

    if (back) el.toggleAttribute("data-rhp-back", back(v));

    return { c, dir, a, st, css, v };`, `    const css = st !== prev?.st ? setStyle(el, st, prev?.css, Object.keys(v)) : prev?.css;

    // The first values of a block without a style prop go in at once
    let first = !prev && !st;
    for (const key in v) {
      if (first && v[key] != null && !safeCssValue(v[key])) first = false;
    }

    if (first) {
      let text = "";
      for (const key in v) {
        if (v[key] != null) text += key + ":" + v[key] + ";";
      }
      if (text) el.style.cssText = text;
    } else {
      for (const key in v) {
        if (v[key] === prev?.v[key]) continue;
        if (prev) write(el, key, v[key]);
        else if (v[key] != null) el.style.setProperty(key, v[key]);
      }
    }

    if (back) el.toggleAttribute("data-rhp-back", back(v));

    return { c, dir, a, st, css, v };`)],
};

// Applies a variant's edits to one source file's text (file is its name in src/)
export function applyEdits(variant, file, text) {

  for (const edit of variant.edits) {
    if (edit.file !== file) continue;
    if (edit.css) {
      text = edit.css(text);
      continue;
    }
    const count = text.split(edit.find).length - 1;
    if (count !== 1) throw new Error(`${file}: edit text found ${count} times: ${edit.find.slice(0, 80)}`);
    text = text.replace(edit.find, () => edit.replace);
  }

  return text;
}

// Every edit must have found its file
export function checkEdits(variant, seen) {

  for (const edit of variant.edits) {
    if (!seen.has(edit.file)) throw new Error(`edit for ${edit.file} never applied (file not in the bundle)`);
  }
}
