// A React app's chart, in a file that imports nothing from react (the automatic JSX runtime): the project's
// package.json names react and not solid-js, so it is checked as React. expect: none
import { RhpChart } from "./RhpChart.jsx";
import { FruitChart } from "./fruit-chart.js";

export default function Check() {
  return <RhpChart chart={FruitChart} sold={[12, 18, 7]} />;
}
