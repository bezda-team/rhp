import { renderToString, generateHydrationScript } from "solid-js/web";
import ManyDotsApp from "./manydots-fixture.jsx";
import { ManyDotsIsland } from "./manydots-islands.jsx";
import { Chart, ManyDots } from "../src/index.js";
import { HydrationChangeApp, HydrationForeignApp } from "./manydots-hydration-change.jsx";

export const html = () => renderToString(() => <ManyDotsApp />);
export const page = (script = "manydots-ssr-client.js") => `<!doctype html><html><head><meta charset=utf-8>${generateHydrationScript()}</head><body><div id="root">${html()}</div><script src="${script}"></script></body></html>`;
export const islandsPage = (script = "manydots-ssr-client.js") => {
  const a = renderToString(() => <ManyDotsIsland id="island-a" />, { renderId: "island-a" });
  const b = renderToString(() => <ManyDotsIsland id="island-b" />, { renderId: "island-b" });
  return `<!doctype html><html><head><meta charset=utf-8>${generateHydrationScript()}<style>body{margin:0;background:white}#islands{width:600px;margin:16px}#mount-island-a{margin-bottom:12px}</style></head><body><div id="islands"><div id="mount-island-a">${a}</div><div id="mount-island-b">${b}</div></div><script src="${script}"></script></body></html>`;
};
export const styleTextCases = () => ['url("#clip&foo")', 'url("</style><img src=x onerror=window.ManyDotsInjected=1>")'].map((clip) =>
  renderToString(() => <Chart scale={[0, 10]} cross={[0, 20]} ticks={false} crossTicks={false}>
    <ManyDots rows={[{ x: 5, y: 10 }]} at={(d) => d.x} cross={(d) => d.y} shape={{ clip: () => clip }} />
  </Chart>));
export const hydrationChangePage = (script = "manydots-ssr-client.js") => {
  const body = renderToString(() => <HydrationChangeApp updated={false} />);
  return `<!doctype html><html><head><meta charset=utf-8>${generateHydrationScript()}<style>body{margin:0;background:white}#root{width:360px;margin:16px}</style></head><body><div id="root" data-hydration-change>${body}</div><script src="${script}"></script></body></html>`;
};
export const hydrationForeignPage = (script = "manydots-ssr-client.js") => {
  const body = renderToString(() => <HydrationForeignApp updated={false} />);
  return `<!doctype html><html><head><meta charset=utf-8>${generateHydrationScript()}<style>body{margin:0;background:white}#root{width:360px;margin:16px}</style></head><body><div id="root" data-hydration-foreign>${body}</div><script src="${script}"></script></body></html>`;
};
