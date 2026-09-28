import { renderToString, generateHydrationScript } from "solid-js/web";
import App from "./app.jsx";
export const page = () => `<!doctype html><html><head><meta charset=utf-8>${generateHydrationScript()}</head><body><div id="root">${renderToString(() => <App />)}</div><script src="client/client.js"></script></body></html>`;
