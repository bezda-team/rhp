// The chart, as an html template
import { Chart, Plot, Bar, Label, slat, html } from "@bezda/rhp/standalone";

const fruit = ["Apples", "Bananas", "Cherries"];

const Fruit = slat({ thickness: 36, room: { start: 90, end: 40 } }, (d) => html`
  <div>
    <${Label} edge="start">${() => d.fruit}<//>
    <${Bar} to=${() => d.sold} />
    <${Label} at=${() => d.sold}>${() => d.sold}<//>
  </div>`);

export function FruitChart(props) {
  return html`
    <${Chart} scale=${[0, 20]} label="Fruit sold today">
      <${Plot} fruit=${fruit} sold=${props.sold}>${Fruit}<//>
    <//>`;
}
