// rhp's gallery (examples/gallery) drawn on a server and taken over in the browser (test/run.mjs): every plot,
// horizontal, vertical and in the JS version. Math.random is seeded (test/seeded.js) so both sides draw the same data.
// As the server's module (in Node) it writes the page; as the page's script it hydrates it, or with #fresh draws it
// from nothing; ?wait holds it back until window.go().
import { seed } from "./seeded.js";
import { isServer, renderToString, generateHydrationScript, hydrate, render } from "solid-js/web";
import { For } from "solid-js";
import { Theme } from "../src/index.js";
import * as G from "../examples/gallery/gallery.jsx";

const PLOTS = ["Fruit", "Tutorial", "Clouds", "Dots", "Grouped", "Stacked", "Segmented", "Units", "Pyramid", "Diverging", "Histogram",
  "Stem", "Violin", "Heatmap", "Strip", "Range", "Bullet", "Waterfall", "Gantt", "Candles"];
const WAYS = [["horizontal", false], ["vertical", false], ["horizontal", true]];
function App() {
  return (
    <main style={{ width: "760px", font: "14px system-ui" }}>
      <For each={WAYS}>{([o, js]) => (
        <For each={PLOTS}>{(k) => (
          <section class="plot" data-plot={`${k}-${o}-${js ? "js" : "css"}`} style={{ margin: "0 0 24px" }}>
            <Theme value={{}}>{(seed(1 + PLOTS.indexOf(k)), G[k]({ o: () => o, js: () => js, seed: () => 0 }))}</Theme>
          </section>
        )}</For>
      )}</For>
    </main>
  );
}
export const page = () => `<!doctype html><html><head><meta charset=utf-8>${generateHydrationScript()}</head><body><div id="root">${renderToString(() => <App />)}</div><script src="ssr-gallery-client.js"></script></body></html>`;
export const plots = () => PLOTS.length * WAYS.length;
if (!isServer) {
  const root = document.getElementById("root");
  const go = () => (location.hash === "#fresh" ? (root.replaceChildren(), render(() => <App />, root)) : hydrate(() => <App />, root));
  if (location.search.includes("wait")) window.go = go;
  else go();
}
