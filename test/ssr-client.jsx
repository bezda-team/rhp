// The browser's side of test/ssr.jsx: takes over the server's HTML, or with #fresh draws the app from nothing.
// ?wait holds the script back until the test calls window.go(), so the server's HTML can be looked at alone.
import { hydrate, render } from "solid-js/web";
import App from "./ssr.jsx";
const root = document.getElementById("root");
const go = () => (location.hash === "#fresh" ? (root.replaceChildren(), render(() => <App />, root)) : hydrate(() => <App />, root));
if (location.search.includes("wait")) window.go = go;
else go();
