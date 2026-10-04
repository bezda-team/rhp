// Imports a package that is not installed. expect: missing-import
import { scaleLinear } from "d3-scale-nope";
import { Chart, Plot, Bar, slat, html } from "@bezda/rhp/standalone";

const sold = [12, 18, 7].map(scaleLinear());

const Fruit = slat((d) => html`<div><${Bar} to=${() => d.sold} /></div>`);

export default function FruitChart() {
  return html`<${Chart} scale=${[0, 20]}><${Plot} sold=${sold}>${Fruit}<//><//>`;
}
