// On a server, the CSS a chart needs goes into the page with it, as React's stylesheets: a <style> with an href and a
// precedence is written once per render however many charts ask for it, and React puts it in the page's head. In the
// browser rhp adopts sheets of its own (style.js), and turns the server's copy of each off once it has it.
import { jsx } from "react/jsx-runtime";

const texts = new WeakMap(); // slat type -> [its CSS, its sheet], so a server makes each slat type's sheet once

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
  return jsx("style", { href: name, precedence: "rhp", children: text.replace(/<\/(style)/gi, "<\\/$1") });
}

// The browser has its own copy of sheet `name` now, so the server's (if the page came from a server) stops applying
export function dropServerSheet(name) {

  if (typeof document === "undefined") return;

  for (const el of document.querySelectorAll('style[data-precedence="rhp"]')) {
    if (el.getAttribute("data-href") === name && el.sheet) el.sheet.disabled = true;
  }
}
