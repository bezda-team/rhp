// A small CSS tree for editing rhp's stylesheet source in variants: rules nested in at-rules, declarations as text.
// It only needs to read rhp's own CSS, which has no strings with braces in it.

const stripComments = (css) => css.replace(/\/\*[^]*?\*\//g, "");

// [{ prelude, body }] for style rules (body is the declarations' text) and [{ prelude, children }] for block at-rules
export function parse(css) {

  css = stripComments(css);
  let i = 0;

  const block = () => {
    const out = [];
    for (;;) {
      // the next prelude, up to { or ; or the block's end
      let j = i;
      while (j < css.length && css[j] !== "{" && css[j] !== "}" && css[j] !== ";") {
        j++;
      }
      const prelude = css.slice(i, j).trim();
      if (j >= css.length || css[j] === "}") {
        i = j + 1;
        return out;
      }
      if (css[j] === ";") {
        if (prelude) out.push({ prelude, statement: true });
        i = j + 1;
        continue;
      }
      i = j + 1;
      if (prelude.startsWith("@") && !/^@(font-face|property|page)\b/.test(prelude)) {
        out.push({ prelude, children: block() });
      } else {
        let depth = 1;
        let k = i;
        while (k < css.length && depth) {
          if (css[k] === "{") depth++;
          else if (css[k] === "}") depth--;
          k++;
        }
        out.push({ prelude, body: css.slice(i, k - 1).trim() });
        i = k;
      }
    }
  };

  return block();
}

export function print(tree, indent = "") {

  return tree.map((node) => {
    if (node.statement) return `${indent}${node.prelude};`;
    if (node.children) return `${indent}${node.prelude} {\n${print(node.children, indent + "  ")}\n${indent}}`;
    return `${indent}${node.prelude} {\n${node.body.split(/;\s*/).filter(Boolean).map((d) => `${indent}  ${d.trim()};`).join("\n")}\n${indent}}`;
  }).join("\n\n");
}

// Every style rule, depth first
export function* rules(tree) {

  for (const node of tree) {
    if (node.children) yield* rules(node.children);
    else if (!node.statement) yield node;
  }
}

// Removes the style rules for which test(rule) is true, and at-rules left empty. Returns how many it removed.
export function drop(tree, test) {

  let n = 0;

  for (let i = tree.length - 1; i >= 0; i--) {
    const node = tree[i];
    if (node.children) {
      n += drop(node.children, test);
      if (!node.children.length) tree.splice(i, 1);
    } else if (!node.statement && test(node)) {
      tree.splice(i, 1);
      n++;
    }
  }

  return n;
}

// The declarations of a rule as [name, value] pairs, and back
export const decls = (rule) => rule.body.split(/;(?![^(]*\))/).map((d) => d.trim()).filter(Boolean).map((d) => {
  const at = d.indexOf(":");
  return [d.slice(0, at).trim(), d.slice(at + 1).trim()];
});

export const setDecls = (rule, list) => {
  rule.body = list.map(([k, v]) => `${k}: ${v}`).join("; ");
};

// Edits a CSS text and checks that the edit did what it says: f(tree) returns how many rules it touched
export function editCss(css, f, expect) {

  const tree = parse(css);
  const n = f(tree);
  if (expect != null && n !== expect) throw new Error(`css edit touched ${n} rules, expected ${expect}`);
  if (!n) throw new Error("css edit touched nothing");

  return print(tree);
}
