// test/ssr.jsx with linkedCss and noCssGuard, on a page that links dist/rhp-no-css-guard.css itself, and a chart that
// says noCssGuard as well (which has no guard to turn off, so rhp doesn't warn). ?wait works as in ssr-client.jsx.
import { isServer, renderToString, generateHydrationScript, hydrate } from "solid-js/web";
import { Chart, Plot, Bar, linkedCss, noCssGuard } from "../src/index.js";
import App from "./ssr.jsx";
linkedCss();
noCssGuard();
const Page = () => <>
  <App />
  <Chart noCssGuard><Plot v={[1, 2]}>{(d) => <div><Bar to={d.v} /></div>}</Plot></Chart>
</>;
export const page = () => `<!doctype html><html><head><meta charset=utf-8><link rel="stylesheet" href="../../dist/rhp-no-css-guard.css">${generateHydrationScript()}</head><body><div id="root">${renderToString(() => <Page />)}</div><script src="ssr-no-guard-linked-client.js"></script></body></html>`;
if (!isServer) {
  const root = document.getElementById("root");
  const go = () => hydrate(() => <Page />, root);
  if (location.search.includes("wait")) window.go = go;
  else go();
}
