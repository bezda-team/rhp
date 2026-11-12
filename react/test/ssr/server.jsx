import { renderToString } from "react-dom/server";
import { App } from "./app.jsx";
export const html = () => renderToString(<App />);
