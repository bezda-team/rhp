// test/ssr.jsx on a page that links rhp's core stylesheet itself (dist/rhp.css): linkedCss() before anything draws, on
// the server (this module, in Node) and in the browser (the same module, as the page's script: it hydrates, or with
// #fresh draws from nothing; ?unlinked is a page that says it links the stylesheet but doesn't).
import { isServer, renderToString, generateHydrationScript, hydrate, render } from "solid-js/web";
import { linkedCss } from "../src/index.js";
import App from "./ssr.jsx";
linkedCss();
export const page = (linked = true) => `<!doctype html><html><head><meta charset=utf-8>${linked ? '<link rel="stylesheet" href="../../dist/rhp.css">' : ""}${generateHydrationScript()}</head><body><div id="root">${renderToString(() => <App />)}</div><script src="ssr-linked-client.js"></script></body></html>`;
if (!isServer) {
  const root = document.getElementById("root");
  const go = () => (location.hash === "#fresh" ? (root.replaceChildren(), render(() => <App />, root)) : hydrate(() => <App />, root));
  if (location.search.includes("wait")) window.go = go;
  else go();
}
