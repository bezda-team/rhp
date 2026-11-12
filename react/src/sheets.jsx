// On a server, the CSS a chart needs goes into the page with it, as React's stylesheets: a <style> with an href and a
// precedence is written once per render however many charts ask for it, and React puts it in the page's head (it may put
// several in one <style>, its data-href naming each). In the browser rhp adopts sheets of its own (style.js), and turns
// a server's <style> off once it has every sheet in it.
import { jsx } from "react/jsx-runtime";
import { LAYERS } from "../../src/style.js";

const texts = new WeakMap(); // slat type -> [its CSS, its sheet], so a server makes each slat type's sheet once

// NOTE: Each sheet starts with rhp's layer order, so whichever sheet comes first in the page (React writes them in the
// order it meets them, and may join them) declares the layers in rhp's order: a slat's CSS never wins over placement.
export function ServerSheet({ name, css, of }) {

  let text;
  if (of) {
    const known = texts.get(of);
    if (known?.[0] === of.css) text = known[1];
    else texts.set(of, [of.css, (text = css())]);
  } else {
    text = css();
  }

  // A "</style" anywhere in the CSS (even in a string) would end the <style>: "\/" is "/" to CSS
  return jsx("style", { href: name, precedence: "rhp", children: (text.startsWith(LAYERS) ? text : LAYERS + "\n" + text).replace(/<\/(style)/gi, "<\\/$1") });
}

// The browser has its own copy of sheet `name` now, so a server's <style> (if the page came from a server) stops
// applying once the browser has every sheet in it. The page's <style> elements are a list the browser keeps up to date,
// and a page has few of them, so this is quick however many charts it has.
const adopted = new Set();
let styles;
export function dropServerSheet(name) {

  if (typeof document === "undefined") return;

  adopted.add(name);
  styles ??= document.getElementsByTagName("style");

  for (let i = 0; i < styles.length; i++) {
    const el = styles[i];
    if (el.getAttribute("data-precedence") !== "rhp" || !el.sheet || el.sheet.disabled) continue;
    const names = el.getAttribute("data-href")?.split(" ") ?? [];
    if (names.includes(name) && names.every((n) => adopted.has(n))) el.sheet.disabled = true;
  }
}
