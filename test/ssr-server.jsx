// The server side of test/ssr.jsx: the app's HTML, and the other ways a server may render it
import { renderToString, renderToStringAsync, generateHydrationScript, NoHydration } from "solid-js/web";
import { Chart, Plot, Bar, Label, slat } from "../src/index.js";
import App from "./ssr.jsx";
const shell = (body, script) => `<!doctype html><html><head><meta charset=utf-8>${generateHydrationScript()}</head><body><div id="root">${body}</div><script src="${script}"></script></body></html>`;
export const html = () => renderToString(() => <App />);
export const page = (script = "ssr-client.js") => shell(html(), script);
export const htmlAsync = () => renderToStringAsync(() => <App />);
// no hydration keys, for a page that is never hydrated
export const plain = () => renderToString(() => <NoHydration><App /></NoHydration>);
// a slat that returns text instead of one element
export const bad = () => renderToString(() => <Chart><Plot v={[1]}>{() => "text"}</Plot></Chart>);
// a chart with an aspect, whose ratio a server writes for the page's CSS
export const aspect = () => renderToString(() => <Chart aspect={2}><Plot v={[1]}>{(d) => <div><Bar to={d.v} /></div>}</Plot></Chart>);
// values from users: none may end the <style> a server writes, or add a declaration of its own
const Untrusted = slat({ css: '.u { content: "</style><img src=x onerror=window.ran=1>"; }' }, (d) => (
  <div class="u"><Bar to={d.v} color={d.c} /><Label at={1} style={{ "--note": '"a;b"', "--mix": "{a:1}" }}>{d.v}</Label></div>
));
export const untrusted = () => renderToString(() => (
  <Chart scale={[0, 10]} theme={{ ink: "red;position:fixed;inset:0" }}>
    <Plot v={["5;background:url(https://evil.example/pixel)", 3]} c={["red;position:fixed;inset:0", "blue"]}>{Untrusted}</Plot>
  </Chart>
));
