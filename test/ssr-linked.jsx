// test/ssr.jsx with linkedCss, on a page that links dist/rhp.css itself (page(false) leaves the link out).
// In Node this module writes the page, and in the browser it hydrates it (#fresh and ?wait work as in ssr-client.jsx).
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
