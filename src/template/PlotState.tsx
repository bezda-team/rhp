import { enableLegendStateReact } from "@legendapp/state/react"
import { observable } from '@legendapp/state';
import type { Vars } from './types/Vars';
import type { FullBarElementType } from './types/FullBarElementType';
import type { PlotCSS } from './types/PlotCSS';
import type { BarElementType } from "./types/BarElementType";
import type { BarContentContainerElementType } from "./types/BarContentContainerElementType";

enableLegendStateReact();

export const DEFAULT_CSS = {
    "bar-plot": "",
    "full-bar": "background: #dddddd; &.horizontal { margin-top: 0.5rem; margin-bottom: 0.5rem;} &.vertical {margin-left: 0.5rem; margin-right: 0.5rem;}",
    "bar-label": "display: flex; flex-direction: row-reverse;background-color: slategray; color: white; div {text-align: center; text-orientation: sideways-right;writing-mode: vertical-rl;}",
    "bar-content-container": "background-color: green;",
    "bar-dec-container": "",
    "bar": "background-color: blue;",
    "bar-decoration": "background-color: blue;",
}
  
export const DEFAULT_MARKUP = {
    "bar-label": "<div style='width: fit-content;'>Bar label</div>",
    "bar-content-container": "",
    "bar-dec-container": "",
    "bar": "",
    "bar-decoration": "",
}

const elements: BarElementType[] = [
    {
      type: "bar",
      order: 1,
      CSS: "background-color: red; height: auto;",
      markup: "<div style='background-color: {{color}};height:100%'></div>",
    },
    {
      type: "decoration",
      order: 2,
      CSS: "color: white; div {font-size: small; text-align: center; text-orientation: sideways-right;writing-mode: vertical-rl;}",
      markup: "<div style='font-weight: bold;color: {{color}};height: fit-content;'>{{bar-val}}</div>",
    }
  ];

  const contentElements: BarContentContainerElementType[] = [
    {
      type: "bar-dec-container",
      elements: elements,
      CSS: "background: none;",
      decorationWidth: "10%",
      order: 1,
    }, 
    // {
    //   type: "decoration",
    //   order: 0,
    //   css: "background-color: slategray; color: white; div {text-align: left;}",
    //   markup: "<div style='width: fit-content;'>My text decoration</div>",
    //   onClickHandler: () => console.log("decoration clicked")
    // },
    // {
    //   type: "decoration",
    //   order: 2,
    //   css: "background-color: slategray; color: white; div {text-align: left;}",
    //   markup: "<div style='width: fit-content;'>My text decoration</div>",
    //   onClickHandler: () => console.log("decoration clicked")
    // }
  ];

  const fullBarElements: FullBarElementType[] = [
    {
      type: "bar-content-container",
      elements: contentElements,
      decorationWidth: "10%",
      order: 1,
    }, 
    {
      type: "decoration",
      order: 0,
      CSS: "display: flex; flex-direction: row-reverse;background: none; color: black; margin-right: 0.5rem; div {text-align: center; text-orientation: sideways-right;writing-mode: vertical-rl;}",
      markup: "<div style='width: fit-content;'>{{bar-label}}</div>",
    },
  ];

const PlotState = observable<{
    data: object[] | number[], 
    dataMax: number, 
    theme: object, 
    barConfig: FullBarElementType[], 
    width: string, 
    height: string, 
    CSS: PlotCSS, 
    markup: object, 
    orientation: number, 
    vars: Vars,
    order: number[],
}>({
    data: [4,9,5,6,1,2],
    dataMax: 6, 
    theme: {}, 
    barConfig: fullBarElements, 
    width: "900px", 
    height: "900px", 
    CSS: DEFAULT_CSS, 
    markup: DEFAULT_MARKUP, 
    orientation: 0, 
    vars: {
        "color": ["orange", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "gray", "black"],
        "bar-label": ["label 1", "label 2", "label 3", "label 4", "label 5", "label 6", "label 7", "label 8", "label 9", "label 10"],
        "bar-val": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    }, 
    order: [0,1,2,3,4,5]
});

export default PlotState;