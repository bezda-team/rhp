/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import type { CSSObject } from '@emotion/react';
import PlotContext from './PlotContext';
import { useContext, useRef} from 'react';
import { useObservable, useObserve, useComputed, For } from '@legendapp/state/react';
import type { FullBarElementType } from './types/FullBarElementType';
import { opaqueObject } from '@legendapp/state';
import type { Observable } from '@legendapp/state';
import type { ConfigObservable } from './types/ConfigObservable';
import PlotSegment from './PlotSegment';

export const DEFAULT_CSS = {
  "bar-plot": "",
  "full-bar":"padding-top: 0.5rem; padding-bottom: 0.5rem;transition: all 0.3s ease-in-out;&:hover .decoration>.image img {transform: scale(1.5)!important;}&:hover .decoration>.image {border: 5px solid #555555!important;}&:hover .decoration>div {color: black!important;} &:hover div div.box {border: 5px solid #555555!important;color: #555555!important; font-weight: 500} &:hover div div.whisker {border: 3px solid #555555!important;} & div.bar-content-container div.bar {transition-timing-function: ease-in-out;}",
  "bar-label": "display: flex; flex-direction: row-reverse;background-color: slategray; color: white; div {text-align: center; text-orientation: sideways-right;writing-mode: vertical-rl;}",
  "bar-content-container": "background-color: green;",
  "bar-dec-container": "",
  "bar": "background-color: blue;",
  "bar-decoration": "background-color: blue;",
  "desaturate-bar": "padding-top: 0.5rem; padding-bottom: 0.5rem;filter: saturate(10%); transition: all 0.3s ease-in-out;&:hover .decoration>img {border: 5px solid #555555!important;}&:hover .decoration>div {color: black!important;} &:hover div div.box {border: 5px solid #555555!important;color: #555555!important; font-weight: 500} &:hover div div.whisker {border: 3px solid #555555!important;}&:hover {filter: saturate(110%);}& div.bar-content-container div.bar {transition-timing-function: ease-in-out;}"
}

export const DEFAULT_MARKUP = {
  "bar-label": "<div style='width: fit-content;'>Bar label</div>",
  "bar-content-container": "",
  "bar-dec-container": "",
  "bar": "",
  "bar-decoration": "",
}

// Box and Whisker Default Template
export const DEFAULT_BOX_WHISKER_TEMPLATE: FullBarElementType[] = [
  {
    type: "bar-content-container",
    elements: [{
                  type: "bar-dec-container",
                  elements: [{
                                  type: "bar",
                                  order: 1,
                                  dataIndex: [2],
                                  CSS: "box-sizing: border-box;overflow: hidden;height: auto; transition-property: flex, border;transition-duration: 0.4s;transition-timing-function: ease-in-out;& div {display:flex;align-items: center;justify-content: center;}& img {flex-grow: 1; max-width: 300px;min-width: 50px;}",
                                  markup: "<div class='box' style='transition: border 0.4s ease-in-out, color 0.4s ease-in-out;border: 4px solid {{color}};color: {{color}};height:100%;'>{{clouds}}</div>",
                              },
                              {
                                  type: "bar",
                                  order: 1,
                                  dataIndex: [0],
                                  CSS: "background: none;border: none!important;height: auto; transition-property: flex, border;transition-duration: 0.4s;transition-timing-function: ease-in-out;& div {display:flex;align-items: center;}",
                                  markup: "",
                              },
                              {
                                  type: "bar",
                                  order: 1,
                                  dataIndex: [1],
                                  CSS: "border: none!important;display: flex;align-items: center;overflow: hidden;height: auto; transition-property: flex;transition-duration: 0.4s;transition-timing-function: ease-in-out;",
                                  markup: "<div class='whisker' style='transition: border 0.4s ease-in-out;border-left: 4px solid {{color}};height:30%;width: 0%;'></div><div class='whisker' style='transition: border 0.4s ease-in-out;border: 3px solid {{color}};height:0%;width: 100%;'></div>",
                              },
                              {
                                  type: "bar",
                                  order: 1,
                                  dataIndex: [3],
                                  CSS: "border: none!important;display: flex;align-items: center;height: auto; transition-property: flex;transition-duration: 0.4s;transition-timing-function: ease-in-out;",
                                  markup: "<div class='whisker' style='transition: border 0.4s ease-in-out;border: 3px solid {{color}};height:0%;width: 100%;'></div><div class='whisker' style='transition: border 0.4s ease-in-out;border-right: 4px solid {{color}};height:30%;width: 0%;margin-right: -4px;'></div>",
                              },
                              {
                                  type: "decoration",
                                  order: 2,
                                  useData: true,
                                  CSS: "display: inline-flex;align-items: center;margin-bottom: 2px;color: white; div {font-size: small; text-align: left; margin-left: 0.5rem;}",
                                  markup: "<div style='font-weight: bold;color: {{color}};height: fit-content;'>{{last-whisker-pos}}</div>",
                              }],
                  CSS: "background: none;", 
                  decorationWidth: "10%",
                  order: 1,
                }, 
              ],
    decorationWidth: "10%",
    order: 1,
    CSS:"padding-right: 2rem;"
  }, 
  {
    type: "decoration",
    order: 0,
    CSS: "display: flex; flex-direction: row-reverse;justify-content: center;height: 100%;background: none; color: black; div {text-align: center;}",
    markup: "<div class='image' style='height: 100%;aspect-ratio: 1/1;border-radius: 50%;transition: border 0.4s ease-in-out;border: 4px solid #00000011;overflow: hidden;' ><img style= 'height: 100%; width: 100%;object-fit: cover;transition: transform 0.4s ease-in-out;transform: scale(5);' src='{{cloud-img-src}}'  alt='{{clouds}}'></img></div>",
  },
];

export const processData = (data: number[][]) => {
  const formattedData: number[][] = [];
  data.forEach((value, i) => {
    formattedData.push([value[0], value[1] - value[0], value[2] - value[1], value[3] - value[2]]);
  });

  return formattedData;
}

// TODO: Set all z-index of bars based on order BEFORE changing order so that bars going up always lie on top of bars going down
export const changeBWOrder = (newOrder: number[], boxWhiskerConfig: ConfigObservable) => {
  if (newOrder.length !== boxWhiskerConfig.length) {
    console.log("newOrder.length !== trackedBarsData.length");
    return;
  }
  else {
    newOrder.forEach((value, i) => {
      boxWhiskerConfig[i].order.set(value);
    });
  }
}

export const changeOrderBasedOnPosition = ( plotData: Observable<number[][]>, boxWhiskerConfig: ConfigObservable, index: number = 0 ) => {
  const order: number[] = [];
  const data: number[][] = [];
  const indexSortedByValue : number[] = []
  const tempBarData = boxWhiskerConfig.peek();
  tempBarData.forEach((value, i) => {
    order.push( value.order);
    data.push([index === 0? plotData[i].get()[0] : plotData[i].get().slice(0, index + 1).reduce((a, b) => a + b, 0), tempBarData[i].order, i]);
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
  if (JSON.stringify(finalOrder) !== JSON.stringify(order)) changeBWOrder(finalOrder, boxWhiskerConfig);
}

const BoxWhiskerPlot = ({width, height, dataIndexForOrdering, boxWhiskerConfig, boxWhiskerTemplate, decorationWidth, id, style, CSS}:{width: string, height: string, dataIndexForOrdering?: Observable<number>, boxWhiskerConfig?: ConfigObservable, boxWhiskerTemplate?: FullBarElementType[], decorationWidth?: string, id?: string, style?: React.CSSProperties, CSS?: string | CSSObject}) => {
  
  const {plotData, vars} = useContext(PlotContext);
  const renderCount = ++useRef(0).current;
  console.log("Box and Whisker Plot renders: " + renderCount);

  const defaultDataOrderIndex = useObservable(2); // 0: order by first whisker position, 1: by first quartile/bar start position, 2: by third quartile/bar end position, 3: by last whisker position
  const dataOrderIndex = dataIndexForOrdering??defaultDataOrderIndex;

  // Generate array observable containing the props for each full bar element
  const defaultBoxWhiskerConfig = useObservable(() => {
    const untrackedData = plotData.peek();
    const newBarsDataTemp : {dataIndex: number, varIndex: number, order: number, width: string, decorationWidth: string, elements: FullBarElementType[], id: string, CSS:string | CSSObject}[] = [];
    untrackedData.forEach((value, i) => {
        newBarsDataTemp.push({
                              id: "full_box_and_whisker_" + i,
                              dataIndex: i,
                              varIndex: i,
                              order: i,
                              width: "calc(100%/" + (untrackedData.length) + ")",
                              decorationWidth: decorationWidth??"6rem",
                              elements: opaqueObject(boxWhiskerTemplate??DEFAULT_BOX_WHISKER_TEMPLATE),  // Avoid strange unexplainable circular reference errors for each element of this array on first render
                              CSS: DEFAULT_CSS["full-bar"],
                            });
    });
    return newBarsDataTemp;
  });

  const trackedBoxWhiskerConfig = boxWhiskerConfig??defaultBoxWhiskerConfig;

  // The following code recalculates the order of the bars (starting from their current order)
  // based on new data values. The new order should result in the bars being re-arranged 
  // so that bars with greater data value sit above (or to the left of) bars with lower data value.
  // NOTE: A key requirement here is making sure that the returned new orders are arranged according 
  // to the position of the corresponding bar in the trackedBoxWhiskerConfig array without messing with sorting
  // stability.
  // ADDITIONAL NOTE: `useComputed` re-executes when inner tracked observables change. 
  // `trackedBoxWhiskerConfig[i].data.get()` is the tracked observable in this `useComputed`.
  const trackedOrder = useComputed(() => {
    const data: number[][] = [];
    const indexSortedByValue : number[] = []
    const tempBarData = trackedBoxWhiskerConfig.peek();
    const trackedOrderIndex = dataOrderIndex.get();
    tempBarData.map((value, i) => data.push([trackedOrderIndex === 0? plotData[i].get()[0] : plotData[i].get().slice(0, trackedOrderIndex + 1).reduce((a, b) => a + b, 0), tempBarData[i].order, i]));

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
    return finalOrder;
  });

  // changes order of bars when trackedOrder changes
  useObserve(trackedOrder, () => { changeBWOrder(trackedOrder.peek(), trackedBoxWhiskerConfig);});

  useObserve(() => {
    const untrackedBoxWhiskerConfig = plotData.peek();
    untrackedBoxWhiskerConfig.forEach((value, i) => {
      const dataArray = plotData[i].get();
      const dataArrayTotal = dataArray.reduce((a, b) => a + b, 0);
      if ("last-whisker-pos" in vars) {
        const labels = vars["last-whisker-pos"].peek(); 
        if (labels[i] !== dataArrayTotal) vars["last-whisker-pos"][i].set(dataArrayTotal);
      }
    });
  });

  return (
    <div id={id} className='box-whisker-plot' style={{...style, width: width, height: height, overflow: "hidden"}}  css={css(CSS)} >
        <div className='plot-area' style={{width: "100%", height: "100%", position: "relative"}}>
          <For each={boxWhiskerConfig} item={PlotSegment} optimized/>
        </div>
    </div>         
  )
}

export default BoxWhiskerPlot;