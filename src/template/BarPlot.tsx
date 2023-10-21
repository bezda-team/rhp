import styled from '@emotion/styled';
import FullBar from './FullBar';
import { useContext } from 'react';
import { For, useObservable } from '@legendapp/state/react';
import type { FullBarElementType } from './types/FullBarElementType';
import { opaqueObject } from '@legendapp/state';
import type { DataObservable } from './types/DataObservable';
import PlotContext from './PlotContext';

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

export const DEFAULT_BAR_TEMPLATE: FullBarElementType[] = [
{
  type: "bar-content-container",
  elements: [{
                type: "bar-dec-container",
                elements: [{
                              type: "bar",
                              order: 1,
                              CSS: "box-sizing: border-box;border-radius: 0 1rem 1rem 0;overflow: hidden;height: auto; transition-property: flex, border;transition-duration: 0.4s;transition-timing-function: ease-in-out;&:hover {border: 4px solid black;}& div {display:flex;align-items: center;}& img {flex-grow: 1; max-width: 300px;min-width: 50px;}",
                              markup: "<div style='background-color: {{color}};height:100%;'>{{fruit-svgs}}</div>",
                            },
                            {
                              type: "decoration",
                              order: 2,
                              useData: true,
                              CSS: "color: white; div {font-size: small; text-align: left; margin-left: 0.5rem;}",
                              markup: "<div style='font-weight: bold;color: {{color}};height: fit-content;'>{{$dataValue}}</div>",
                            }],
                CSS: "background: none;&>.bar:hover + .decoration>div {color: black!important;}",
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
            ],
  decorationWidth: "10%",
  order: 1,
  CSS:"padding-right: 2rem;"
}, 
{
  type: "decoration",
  order: 0,
  CSS: "display: flex; flex-direction: row-reverse;justify-content: center;background: none; color: black; div {text-align: center;}",
  markup: "<div style='width: fit-content;font-weight: 600;color: #555555;'>{{bar-val}}</div>",
},
];

// TODO: Set all z-index of bars based on order BEFORE changing order so that bars going up always lie on top of bars going down
export const changeOrder = (newOrder: number[], trackedBarsConfig: DataObservable) => {
  if (newOrder.length !== trackedBarsConfig.length) {
    console.log("newOrder.length !== trackedBarsConfig.length");
    return;
  }
  else {
    newOrder.forEach((value, i) => {
      trackedBarsConfig[i].order.set(value);
    });
  }
}

// The following code recalculates the order of the bars (starting from their current order)
// based on new data values. The new order should result in the bars being re-arranged 
// so that bars with greater data value sit above (or to the left of) bars with lower data value.
// NOTE: A key requirement here is making sure that the returned new orders are arranged according 
// to the position of the corresponding bar in the trackedBarsConfig array without messing with sorting
// stability.
export const changeOrderBasedOnMagnitude = ( trackedBarsConfig: DataObservable) => {
  const order: number[] = [];
  const data: number[][] = [];
  const indexSortedByValue : number[] = []
  const tempBarData = trackedBarsConfig.peek();
  tempBarData.map((value, i) => {
    order.push( value.order);
    data.push([trackedBarsConfig[i].data.get()[0], value.order, i]);
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
  if (JSON.stringify(finalOrder) !== JSON.stringify(order)) changeOrder(finalOrder, trackedBarsConfig);
}

const Div = styled.div``;

const BarPlot = ({width, height, barsConfig, barTemplate, decorationWidth, id, style, CSS}:{width: string, height: string, barsConfig?: DataObservable, barTemplate?: FullBarElementType[], decorationWidth?: string, id?: string, style?: React.CSSProperties, CSS?: string}) => {
  
  const {plotData} = useContext(PlotContext);
  // const renderCount = ++useRef(0).current;
  // console.log("BarPlot rendered: " + renderCount);

  const defaultBarsConfig = useObservable(() => {
    const untrackedData = plotData.peek();
    const newBarsConfigTemp : {index: number, data: number[], order: number, width: string, decorationWidth: string, elements: FullBarElementType[], id: string, CSS:string}[] = [];
    untrackedData.forEach((value, i) => {
        newBarsConfigTemp.push({
                              id: "full_bar_a_" + i,
                              index: i,
                              data: value,
                              order: i,
                              width: "calc(100%/" + (untrackedData.length) + ")",
                              decorationWidth: decorationWidth??"6rem",
                              elements: opaqueObject(barTemplate??DEFAULT_BAR_TEMPLATE),  // Avoid strange unexplainable circular reference errors for each element of this array on first render
                              CSS: DEFAULT_CSS["full-bar"],
                            });
    });
    return newBarsConfigTemp;
  });

  const trackedBarsConfig = barsConfig??defaultBarsConfig;

  return (
    <div id={id} className='bar-plot' style={{...style, width: width, height: height, overflow: "hidden"}}>
        <div className='plot-area' style={{width: "100%", height: "100%", position: "relative"}}>
          <For each={trackedBarsConfig} item={FullBar} optimized/>
        </div>
    </div>
  )
}

export default BarPlot;