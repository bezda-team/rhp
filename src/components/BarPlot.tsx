import styled from '@emotion/styled';
import FullBar from './FullBar';
import { ChakraProvider, extendBaseTheme } from "@chakra-ui/react"
import { NumberInput as NumberIn } from "@chakra-ui/theme/components"
import PlotContext from './PlotContext';
import { useMemo, useRef } from 'react';
import { For } from '@legendapp/state/react';
import FullBarElementType from './types/FullBarElementType';
import Vars from './types/Vars';
import { enableReactUse } from '@legendapp/state/config/enableReactUse';
import { Observable } from '@legendapp/state';

enableReactUse();

const theme = extendBaseTheme({
  components: {
    NumberIn,
  },
})

export const DEFAULT_CSS = {
    "bar-plot": "",
    "full-bar": "&.horizontal { padding-top: 0.5rem; padding-bottom: 0.5rem;} &.vertical {padding-left: 0.5rem; padding-right: 0.5rem;}",
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

export type DataObservable = Observable<{
    index: number, 
    data: number[], 
    order: number, 
    width: string, 
    decorationWidth: string,
    elements: FullBarElementType[], 
    id: string, 
    CSS: string
  }[]>

export const changeOrder = (newOrder: number[], trackedBarsData: Observable<{index: number, data: number[], order: number, width: string, decorationWidth: string, elements: FullBarElementType[], id: string, CSS: string}[]>) => {
  if (newOrder.length !== trackedBarsData.length) {
    console.log("newOrder.length !== trackedBarsData.length");
    return;
  }
  else {
    newOrder.forEach((value, i) => {
      trackedBarsData[i].order.set(value);
    });
  }
}

export const changeOrderBasedOnMagnitude = ( trackedBarsData: Observable<{index: number, data: number[], order: number, width: string, decorationWidth: string, elements: FullBarElementType[], id: string, CSS: string}[]>) => {
  const tempBarData = trackedBarsData.peek();
  const values = Array(tempBarData.length).fill(0);
  tempBarData.map((value, i) => values[i] = tempBarData[i].data[0]);
  const newOrder = values.map((value, i) => i).sort((a, b) => values[b] - values[a]);
  const tempArr :number[] = Array(newOrder.length).fill(0)
  newOrder.map((value, i) => tempArr[value] = i);
  changeOrder(tempArr, trackedBarsData);
  console.log("values: " + values);
  console.log("newOrder: " + newOrder);
  console.log("tempArr: " + tempArr);
}

const Div = styled.div``;

const BarPlot = ({barsData, plotData, dataMax, orientation, vars, theme, id}:{barsData: DataObservable, dataMax: Observable<number>, plotData: Observable<number[][]>, orientation: Observable<number>, vars: Observable<Vars>, theme: Observable<object>, id?: string}) => {
  const renderCount = ++useRef(0).current;
  console.log("BarPlot rendered: " + renderCount);

  return (
    <ChakraProvider >
        <PlotContext.Provider value={{ plotData: plotData, dataMax: dataMax, orientation: orientation, theme: theme, vars: vars}}>
              <div id={id} style={{width: "100%", height: "100%", position: "relative"}}>
                <For each={barsData} item={FullBar} optimized/>
              </div>
        </PlotContext.Provider>
    </ChakraProvider>
  )
}

export default BarPlot;