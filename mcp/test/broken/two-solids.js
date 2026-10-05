// Imports solid-js beside the standalone module, which carries its own Solid. expect: two-solids
import { createSignal } from "solid-js";
import { Chart, Plot, Bar, Label, slat, html } from "@bezda/rhp/standalone";

const fruit = ["Apples", "Bananas", "Cherries"];
const [sold] = createSignal([12, 18, 7]);

const Fruit = slat({ thickness: 36, room: { start: 90, end: 40 } }, (d) => html`
  <div>
    <${Label} edge="start">${() => d.fruit}<//>
    <${Bar} to=${() => d.sold} />
    <${Label} at=${() => d.sold}>${() => d.sold}<//>
  </div>`);

export default function FruitChart() {
  return html`
    <${Chart} scale=${[0, 20]} label="Fruit sold today">
      <${Plot} fruit=${fruit} sold=${sold}>${Fruit}<//>
    <//>`;
}
