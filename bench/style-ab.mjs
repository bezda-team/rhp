// Which of rhp's core CSS rules cost style time: mount a 1-bar chart (so the sheet exists), delete rules matching a
// variant's test from rhp's adopted sheets, then measure the style time of mounting n bars.
import fs from "node:fs"; import http from "node:http"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
const here = path.dirname(fileURLToPath(import.meta.url));
const n = +(process.argv[2] ?? 1000), runs = 7;
const server = http.createServer((q, r) => { const f = path.join(here, "out", new URL(q.url, "http://x").pathname); fs.existsSync(f) ? r.writeHead(200, { "content-type": f.endsWith(".html") ? "text/html" : "text/javascript" }).end(fs.readFileSync(f)) : r.writeHead(404).end(); }).listen(0, "127.0.0.1");
await new Promise((r) => server.on("listening", r));
const flat = "(t) => t.replace(/^:where\\(([^{]*?)\\) \\{/, '$1 {')";
const flatAll = "(t) => { const i = t.indexOf('{'), sel = t.slice(0, i); const out = sel.split(/,(?![^(]*\\))/).flatMap((x) => { const m = x.trim().match(/^(.*?):(is|where)\\(([^()]*)\\)(.*)$/); return m ? m[3].split(',').map((a) => m[1] + a.trim() + m[4]) : [x.trim()]; }); return out.join(', ') + ' ' + t.slice(i); }";
const noVarUse = "(t) => { const i = t.indexOf('{'); const body = t.slice(i + 1, t.lastIndexOf('}')).split(/;(?![^(]*\\))/).filter((d) => d.trim() && (d.trim().startsWith('--') || !d.includes('var('))); return body.length ? t.slice(0, i) + '{' + body.join(';') + '}' : null; }";
const noCustom = "(t) => { const i = t.indexOf('{'); const body = t.slice(i + 1, t.lastIndexOf('}')).split(/;(?![^(]*\\))/).filter((d) => d.trim() && !d.trim().startsWith('--')); return body.length ? t.slice(0, i) + '{' + body.join(';') + '}' : null; }";
const VARIANTS = process.env.AB4 ? {
  base: null,
  "no property uses var()": ["s.includes('var(')", noVarUse],
  "no custom properties declared in rules": ["/--rhp-[a-z-]+:/.test(s)", noCustom],
} : process.env.AB3 ? {
  base: null,
  "guard as a plain list": ["s.includes('display: revert')", flat],
  "every :is/:where list flattened": ["/:(is|where)\\(/.test(s) && !s.includes('::selection') && !s.includes('view-transition')", flatAll],
} : process.env.AB2 ? {
  base: null,
  "guard: no inherit resets": ["s.includes('display: revert')", "(t) => t.replace(/[a-z-]+: inherit !important;?\\s*/g, '')"],
  "guard: no revert/none resets": ["s.includes('display: revert')", "(t) => t.replace(/(display|outline|outline-offset): revert !important;?\\s*/g, '').replace(/(transition|animation|box-shadow|float|max-width|max-height|text-decoration): none !important;?\\s*/g, '')"],
  "selection: labels only": ["s.includes('::selection')", "(t) => t.replace(/, :is\\(\\.rhp-label, \\.rhp-gridline > span, \\.rhp-bar, \\.rhp-dot, \\.rhp-tick, \\.rhp-cell\\) ::selection/, '')"],
} : {
  base: null,
  "no guard": "s.includes('display: revert') ",
  "no guard sizes": "s.includes('width: auto') && s.includes('height: auto') && !s.includes('display')",
  "no ::before/::after": "s.includes('::before') && s.includes('display: none')",
  "no ::selection": "s.includes('::selection')",
  "no view-transition": "s.includes('view-transition')",
  "no [hidden]": "s.includes('[hidden]') && !s.includes('.rhp-plot > [hidden]')",
  "no transitions": "s.includes('transition')",
  "guard + transitions + selection gone": "s.includes('display: revert') || s.includes('transition') || s.includes('::selection')",
};
const b = await chromium.launch({ channel: "chrome", headless: false });
const med = (a) => a.sort((x, y) => x - y)[a.length >> 1];
for (const [name, test] of Object.entries(VARIANTS)) {
  const style = [], script = [], total = [];
  for (let i = 0; i < runs; i++) {
    const p = await b.newPage();
    await p.goto(`http://127.0.0.1:${server.address().port}/rhp-css.html`);
    const removed = await p.evaluate(async (test) => {
      await window.bench.mount({ n: 1 });
      if (!test) return 0;
      const [t, edit] = Array.isArray(test) ? test : [test, null];
      const f = new Function("s", "return " + t), change = edit && new Function("return " + edit)();
      let k = 0;
      const walk = (list) => { for (let j = list.length - 1; j >= 0; j--) { const r = list[j]; if (r.cssRules && !(r instanceof CSSStyleRule)) walk(r.cssRules); else if (f(r.cssText)) { const owner = r.parentRule ?? r.parentStyleSheet, text = change && change(r.cssText); owner.deleteRule(j); if (text) owner.insertRule(text, j); k++; } } };
      for (const sh of document.adoptedStyleSheets) walk(sh.cssRules);
      return k;
    }, test);
    const cdp = await p.context().newCDPSession(p); await cdp.send("Performance.enable");
    const get = async () => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
    const a = await get(); await p.evaluate((n) => window.bench.mount({ n, band: 8 }), n); const z = await get();
    style.push((z.RecalcStyleDuration - a.RecalcStyleDuration) * 1000); script.push((z.ScriptDuration - a.ScriptDuration) * 1000); total.push((z.TaskDuration - a.TaskDuration) * 1000);
    if (i === 0) console.log(`  ${name}: removed ${removed} rules`);
    await p.close();
  }
  console.log(name.padEnd(40), "style", med(style).toFixed(1), "script", med(script).toFixed(1), "task", med(total).toFixed(1));
}
await b.close(); server.close();
