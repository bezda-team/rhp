// The browser side of test/ssr.jsx. It hydrates the server's HTML, or draws the app from scratch with #fresh.
// ?wait holds it back until the test calls window.go().
import { hydrate, render } from "solid-js/web";
import App from "./ssr.jsx";
const root = document.getElementById("root");
const go = () => (location.hash === "#fresh" ? (root.replaceChildren(), render(() => <App />, root)) : hydrate(() => <App />, root));
if (location.search.includes("wait")) window.go = go;
else go();
