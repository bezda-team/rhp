import styled from '@emotion/styled';
import PlotSegment from './PlotSegment';
import { useContext, useRef } from 'react';
import { For, useObservable } from '@legendapp/state/react';
import type { FullBarElementType } from './types/FullBarElementType';
import { opaqueObject } from '@legendapp/state';
import type { Observable } from '@legendapp/state';
import type { ConfigObservable } from './types/ConfigObservable';
import PlotContext from './PlotContext';
import {SegmentTemplate, PlotAreaTemplate, BarsAndDecsTemplate, BarTemplate, DecTemplate} from './SegmentTemplate';
import { BarContentContainerElementType } from './types/BarContentContainerElementType';
import { BarAndDecContainerType } from './types/BarAndDecContainerType';
import { BarType } from './types/BarType';
import { DecorationType } from './types/DecorationType';
import { BarElementType } from './types/BarElementType';

export const DEFAULT_CSS = {
    "bar-plot": "",
    "full-bar": "overflow: visible!important; &.vertical {padding-left: 0.5rem; padding-right: 0.5rem;}",
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

const DEFAULT_SEGMENT_BARSANDDECS_ELEMENTS_TEMPLATE : BarElementType[] = [{
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
}]

const DEFAULT_SEGMENT_PLOTAREA_TEMPLATE: BarContentContainerElementType[] = [{
  type: "bar-dec-container",
  elements: DEFAULT_SEGMENT_BARSANDDECS_ELEMENTS_TEMPLATE ,
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
]

export const DEFAULT_SEGMENT_TEMPLATE: FullBarElementType[] = [
{
  type: "bar-content-container",
  elements: DEFAULT_SEGMENT_PLOTAREA_TEMPLATE,
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
export const changeSegmentOrder = (newOrder: number[], trackedBarsConfig: ConfigObservable) => {
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
export const changeSegmentOrderBasedOnMagnitude = ( plotData: Observable<number[][]>, trackedBarsConfig: ConfigObservable) => {
  const order: number[] = [];
  const data: number[][] = [];
  const indexSortedByValue : number[] = []
  const tempBarData = trackedBarsConfig.peek();
  tempBarData.map((value, i) => {
    order.push( value.order);
    data.push([plotData[i].get()[0], value.order, i]);
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
  if (JSON.stringify(finalOrder) !== JSON.stringify(order)) changeSegmentOrder(finalOrder, trackedBarsConfig);
}

// - Using React.Children allows you to manipulate and transform the JSX you received as the children prop.
// It is considered Legacy API and is not recommended for use in new code. Furthermore, it can lead to fragile code.
// - Although we map through the children in the following function, we are not manipulating the JSX. We are simply
// reading the props from the children and using them to create new objects. The new objects are used to put together a template.
// - It is also important to remember that all the Template components are just dummy components that are used to provide users with 
// a react-component-tree visual pattern that the user may be more comfortable with. These dummy components are not rendered in the DOM.
// - The default template is used as a fall back in the cases where the user does not provide important elements of the template.
const generateTemplate = (nestedChildren: React.ReactElement<any>[]) : (DecorationType | BarContentContainerElementType | FullBarElementType | BarAndDecContainerType | BarType)[]=> {
  return (Array.isArray(nestedChildren)?nestedChildren:([nestedChildren] as React.ReactElement<any>[])).map((child, i) => {
    const {children,...props} = child.props;
    // switch statement version
    switch (child.type){
      case DecTemplate:
        return {
          type: "decoration",
          ...props,
        } as DecorationType
      case PlotAreaTemplate:
        return {
          type: "bar-content-container",
          ...props,
          elements: child.props.children ? generateTemplate(child.props.children) : [] as BarContentContainerElementType[],
        } as BarContentContainerElementType
      case BarsAndDecsTemplate:
        return {
          type: "bar-dec-container",
          ...props,
          elements: child.props.children ? generateTemplate(child.props.children) : [] as BarElementType[],
        } as BarAndDecContainerType
      case BarTemplate:
        return {
          type: "bar",
          ...props,
        } as BarType
      default:
        return {} as FullBarElementType;
    }
  });
}

const Div = styled.div``;

const SegmentPlot = ({width, height, dataIndexForOrdering, segmentConfig, segmentTemplate, decorationWidth, id, style, CSS, children}:{width: string, height: string, dataIndexForOrdering?: Observable<number>, segmentConfig?: ConfigObservable, segmentTemplate?: FullBarElementType[], decorationWidth?: string, id?: string, style?: React.CSSProperties, CSS?: string, children?: React.ReactElement<any> | never[]}) => {
  
  const {plotData} = useContext(PlotContext);
  const renderCount = ++useRef(0).current;
  console.log("SegmentPlot rendered: " + renderCount);

  const defaultDataOrderIndex = useObservable(2); // Default to ordering by the second data value
  const dataOrderIndex = dataIndexForOrdering??defaultDataOrderIndex;

  const defaultSegmentConfig = useObservable(() => {
    const untrackedData = plotData.peek();
    const newSegmentConfigTemp : {dataIndex: number, varIndex: number, order: number, width: string, decorationWidth: string, elements: FullBarElementType[], id: string, CSS:string}[] = []
    untrackedData.forEach((value, i) => {
        newSegmentConfigTemp.push({
                              id: "full_segment_" + i,
                              dataIndex: i,
                              varIndex: i,
                              order: i,
                              width: "calc(100%/" + (untrackedData.length) + ")",
                              decorationWidth: decorationWidth??"6rem",
                              elements: opaqueObject(segmentTemplate??DEFAULT_SEGMENT_TEMPLATE),  // Avoid strange unexplainable circular reference errors for each element of this array on first render
                              CSS: DEFAULT_CSS["full-bar"],
                            });
    });
    return newSegmentConfigTemp;
  });

  const trackedSegmentConfig = segmentConfig??defaultSegmentConfig;

  if (Array.isArray(children)){
    console.warn("No template component provided. Perhaps you mean to close the SegmentPlot tag with /> instead?")
  }
  else if(children?.type === SegmentTemplate && children?.props){
      
    const props = children.props;
    if(props.order && props.order.length === trackedSegmentConfig.length){
      (props.order as number[]).forEach((value, i) => {
        trackedSegmentConfig[i].order.set(value);
      });
    }
    trackedSegmentConfig.peek().forEach((value, i) => {
      const trackedRow = trackedSegmentConfig[i];
      // TODO: Check if setting the properties wholesale is slower than setting them individually
      if(props.width){
        trackedRow.width.set(props.width as string);
      }
      if(props.decorationWidth){
        trackedRow.decorationWidth.set(props.decorationWidth as string);
      }
      if(props.CSS){
        trackedRow.CSS.set(props.CSS as string);
      }
    });

    if((props.children && Array.isArray(props.children) && props.children.length)){
      const newTemplate : FullBarElementType[] = generateTemplate(props.children as React.ReactElement<any>[]) as FullBarElementType[];
      if(newTemplate.length){
        trackedSegmentConfig.peek().forEach((value, i) => {
          trackedSegmentConfig[i].elements.set(opaqueObject(newTemplate));
        });
      }
      // console.log(typeof newTemplate);
      // console.log(newTemplate);
    } else if ((props.children && !Array.isArray(props.children) && (props.children.type === PlotAreaTemplate || props.children.type === DecTemplate))){
      const newTemplate: FullBarElementType[] = generateTemplate([props.children] as React.ReactElement<any>[]) as FullBarElementType[];
      if(newTemplate.length){
        trackedSegmentConfig.peek().forEach((value, i) => {
          trackedSegmentConfig[i].elements.set(opaqueObject(newTemplate));
        });
      }
    }
  }

  return ( 
    <div id={id} className='bar-plot' style={{...style, width: width, height: height, overflow: "hidden"}}>
        <div className='plot-area' style={{width: "100%", height: "100%", position: "relative"}}>
          <For each={trackedSegmentConfig} item={PlotSegment} optimized/>
        </div>
    </div>
  )
}

export default SegmentPlot;