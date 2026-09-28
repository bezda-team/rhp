import { hydrate, render } from "solid-js/web";
import App from "./app.jsx";
const root = document.getElementById("root");
const go = () => (location.hash === "#fresh" ? (root.replaceChildren(), render(() => <App />, root)) : hydrate(() => <App />, root));
if (location.search.includes("wait")) window.go = go;
else go();
