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

const theme = extendBaseTheme({
  components: {
    NumberIn,
  },
})

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

// TODO: Set all z-index of bars based on order BEFORE changing order so that bars going up always lie on top of bars going down
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

// The following code recalculates the order of the bars (starting from their current order)
// based on new data values. The new order should result in the bars being re-arranged 
// so that bars with greater data value sit above (or to the left of) bars with lower data value.
// NOTE: A key requirement here is making sure that the returned new orders are arranged according 
// to the position of the corresponding bar in the trackedBarsData array without messing with sorting
// stability.
export const changeOrderBasedOnMagnitude = ( trackedBarsData: Observable<{index: number, data: number[], order: number, width: string, decorationWidth: string, elements: FullBarElementType[], id: string, CSS: string}[]>) => {
  const order: number[] = [];
  const data: number[][] = [];
  const indexSortedByValue : number[] = []
  const tempBarData = trackedBarsData.peek();
  tempBarData.map((value, i) => {
    order.push( value.order);
    data.push([trackedBarsData[i].data.get()[0], value.order, i]);
  });

  // the following line sorts the data array according to the current order of the bars
  // (ie how they are currently displayed) 
  data.sort((a, b) => a[1] - b[1]);  //ascending order

  // the data is then sorted by current value which should reflect recent changes to the data
  data.sort((a, b) => b[0] - a[0]);  //descending value

  // The new order is the index of the new indexSortedByValue array 
  // and the value of this new array is the index of the original bar data array
  // where this new order must be placed
  data.forEach((value, i) => indexSortedByValue.push(value[2]));

  // Again, the new orders are in the index of indexSortedByValue. They need to be pulled out 
  // and sorted by the index of the bar they go with. So, the order is the index and the value
  // is the bar index to be sorted by.
  const finalOrder = indexSortedByValue.map((value, i) => i).sort((a, b) => indexSortedByValue[a] - indexSortedByValue[b]); 
  if (JSON.stringify(finalOrder) !== JSON.stringify(order)) changeOrder(finalOrder, trackedBarsData);
}

const Div = styled.div``;

const BarPlot = ({width, height, barsData, id, style, CSS}:{width: string, height: string, barsData: DataObservable, id?: string, style?: React.CSSProperties, CSS?: string}) => {
  const renderCount = ++useRef(0).current;
  console.log("BarPlot rendered: " + renderCount);

  return (
    <ChakraProvider >
          <div id={id} className='bar-plot' style={{...style, width: width, height: height, overflow: "hidden"}}>
              <div className='plot-area' style={{width: "100%", height: "100%", position: "relative"}}>
                <For each={barsData} item={FullBar} optimized/>
              </div>
          </div>
    </ChakraProvider>
  )
}

export default BarPlot;