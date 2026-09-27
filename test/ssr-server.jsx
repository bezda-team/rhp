// The server's side of test/ssr.jsx: the app as HTML, with Solid's hydration script for the browser, and the other ways
// a server may render it (test/run.mjs checks each).
import { renderToString, renderToStringAsync, generateHydrationScript, NoHydration } from "solid-js/web";
import { Chart, Plot } from "../src/index.js";
import App from "./ssr.jsx";
const shell = (body, script) => `<!doctype html><html><head><meta charset=utf-8>${generateHydrationScript()}</head><body><div id="root">${body}</div><script src="${script}"></script></body></html>`;
export const html = () => renderToString(() => <App />);
export const page = (script = "ssr-client.js") => shell(html(), script);
export const htmlAsync = () => renderToStringAsync(() => <App />);
// the app with no hydration keys, for a page that never takes it over
export const plain = () => renderToString(() => <NoHydration><App /></NoHydration>);
// a slat that returns text instead of one element
export const bad = () => renderToString(() => <Chart><Plot v={[1]}>{() => "text"}</Plot></Chart>);
