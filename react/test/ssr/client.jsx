// Takes the server's HTML over when the check says so (window.go), or draws the app alone (?alone)
import { hydrateRoot, createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { App } from "./app.jsx";

const T = (window.T = { errors: [] });
const root = document.getElementById("root");
if (location.search.includes("alone")) {
  flushSync(() => createRoot(root).render(<App T={T} />));
} else {
  window.go = () => hydrateRoot(root, <App T={T} />, { onRecoverableError: (e) => T.errors.push(String(e)) });
}
