// Mount cost: 50 charts of 7 slats (two Labels and a Bar each, slat CSS), like the gallery's first chart.
// location.hash drops core rules to see what they cost: #noguard drops the guard (its :where rules),
// #g<k> only the k-th of them, #none every core rule.
import { render } from "solid-js/web";
import { Plot, Chart, Bar, Label, slat, series } from "../src/index.js";
import { useCore } from "../src/style.js";
const NAMES = ["Apple", "Banana", "Cherry", "Grape", "Kiwi", "Lemon", "Orange"];
const S = slat({ thickness: 32, room: { horizontal: { start: 104, end: 44 } }, css: `.slat:hover { background: red } .icon { position: absolute; right: 2px }` },
  (d) => <div class="slat"><Label edge="start">{d.name}</Label><Bar to={d.value} color={d.color}><span class="icon">*</span></Bar><Label at={d.value}>{d.value}</Label></div>);

useCore();
const core = document.adoptedStyleSheets[0], v = location.hash.slice(1);
const guard = [];
const walk = (rs) => { for (const r of rs) r.cssRules && !r.selectorText ? walk(r.cssRules) : r.selectorText?.startsWith(":where(") && guard.push(r); };
walk(core.cssRules);
const drop = (rules, test) => {
  for (let i = rules.length - 1; i >= 0; i--) {
    const r = rules[i];
    if (r.cssRules && !r.selectorText) drop(r.cssRules, test);
    else if (test(r)) (r.parentRule ?? r.parentStyleSheet).deleteRule(i);
  }
};
if (v === "noguard") drop(core.cssRules, (r) => guard.includes(r));
if (/^g\d+$/.test(v)) drop(core.cssRules, (r) => r === guard[+v.slice(1)]);
if (v === "none") drop(core.cssRules, () => true);

window.T = {
  mount() {
    const t0 = performance.now();
    render(() => Array.from({ length: 50 }, (_, c) => (
      <Chart scale={[0, 30]}><Plot name={NAMES} value={NAMES.map((_, i) => (i * 7 + c) % 30)} color={series()}>{S}</Plot></Chart>
    )), document.body);
    document.body.offsetHeight; // style and layout
    return performance.now() - t0;
  },
};
