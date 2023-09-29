import { enableLegendStateReact } from "@legendapp/state/react"
import { observable } from '@legendapp/state';
import Vars from './components/types/Vars';
import FullBarElementType from './components/types/FullBarElementType';
import PlotCSS from './components/types/PlotCSS';

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
}>({
    data: [], 
    dataMax: 0, 
    theme: {}, 
    barConfig: [], 
    width: "900px", 
    height: "900px", 
    CSS: DEFAULT_CSS, 
    markup: DEFAULT_MARKUP, 
    orientation: 0, 
    vars: {}, 
});

export default PlotState;