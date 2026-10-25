// test/ssr.jsx on a page that calls noCssGuard(): a server writes rhp's core without the guard, and the browser adopts
// none. #fresh and ?wait work as in ssr-client.jsx.
import { isServer, renderToString, generateHydrationScript, hydrate, render } from "solid-js/web";
import { noCssGuard } from "../src/index.js";
import App from "./ssr.jsx";
noCssGuard();
export const page = () => `<!doctype html><html><head><meta charset=utf-8>${generateHydrationScript()}</head><body><div id="root">${renderToString(() => <App />)}</div><script src="ssr-no-guard-client.js"></script></body></html>`;
if (!isServer) {
  const root = document.getElementById("root");
  const go = () => (location.hash === "#fresh" ? (root.replaceChildren(), render(() => <App />, root)) : hydrate(() => <App />, root));
  if (location.search.includes("wait")) window.go = go;
  else go();
}
