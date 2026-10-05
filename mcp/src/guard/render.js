// Solid's render, as @bezda/rhp/standalone exports it, checking what it is given first
import { render as solidRender } from "solid-js/web";
import { note, safely } from "./note.js";

export function render(code, element, ...rest) {

  safely(() => {
    if (typeof code !== "function") {
      note("error", "bad-prop", "render's first argument is not a function.", "Give render a function that returns the chart: render(() => html`<${Chart} ...>`, element).");
    }
    if (element == null) {
      note("error", "bad-prop", "render's element is missing (null): the page has no element with that id when the script runs.", "Give the page that element (<div id=\"chart\"></div>) before the module script, or fix the id in getElementById.");
    }
  });

  return solidRender(code, element, ...rest);
}
