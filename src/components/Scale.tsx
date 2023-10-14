import BarElementType from './types/BarElementType';
import BarContentContainerElementType from './types/BarContentContainerElementType';
import { extendBaseTheme } from "@chakra-ui/react"
import { NumberInput as NumberIn } from "@chakra-ui/theme/components"
import FullBar from './FullBar';
import PlotContext from './PlotContext';
import { useContext, useRef } from 'react';
import { useObservable, useObserve, useComputed } from '@legendapp/state/react';
import FullBarElementType from './types/FullBarElementType';
import { enableReactUse } from '@legendapp/state/config/enableReactUse';
import { Observable } from '@legendapp/state';

enableReactUse();

const theme = extendBaseTheme({
  components: {
    NumberIn,
  },
})

const elements: BarElementType[] = [
    {
      type: "bar",
      order: 1,
      isDefault: true,
      CSS: "background-color: none; height: 13px!important; transition: all 0.4s ease-in-out;border-left: 4px solid #00000011;",
      markup: "<div style='font-weight: bold;font-size: small;height:100%;display: flex; justify-content: flex-start;padding-left: 4px;color: #555555'><span style='margin-top: -4px;'>{{$scaleLabel}}</span></div>",
    },
    {
      type: "decoration",
      order: 20,
      useDataMax: true,
      CSS: "position:absolute;left: calc(100% - 2rem);width: 3rem;height: 100%;color: #555555; div {font-size: small; text-align: left;border-left: 4px solid #555555;}", //We subtract 2rem from `left` to account for padding that impacts where the bars stop
      markup: "<div style='display: flex;font-weight: bold;height: 150%;padding-left: 4px;'><span style='margin-top: -4px;width: 100%;'>{{$dataMaxValue}}</span></div>",
    }
];

const contentElements: BarContentContainerElementType[] = [
  {
    type: "bar-dec-container",
    elements: elements,
    CSS: "background: none;align-items: flex-start!important;overflow-x: hidden!important;",
    decorationWidth: "10%",
    order: 1,
  }, 
];

const fullBarElements: FullBarElementType[] = [
  {
    type: "bar-content-container",
    elements: contentElements,
    decorationWidth: "10%",
    order: 1,
    CSS:"padding-right: 2rem;& .bar-dec-cont > .bar:first-of-type {border-left: none;} "  // This element hides content that overflows the bar and so we add 2rem to the right to stop the bars and allow space for decoration to be visible.
  }, 
  {
    type: "decoration",
    order: 0,
    CSS: "height: inherit;border-right: 4px solid #555555;",
    markup: "",
  }
];

export type ScaleDataObservable = Observable<{
    index: number, 
    data: number[], 
    order: number, 
    width: string, 
    decorationWidth: string,
    elements: FullBarElementType[], 
    id: string, 
    CSS: string
  }>

const Scale = ({width, height, spacing, dataMaxLimit, scaleData, id, style, decorationWidth, decouple=false}:{width: string, height: string, spacing: Observable<number>, dataMaxLimit: number, scaleData?: ScaleDataObservable, id?: string, style?: React.CSSProperties, decorationWidth?: string, decouple?: boolean}) => {
    const renderCount = ++useRef(0).current;
    console.log("Test APP: " + renderCount);

    const { vars } = useContext(PlotContext);

    const dataMaxLimitObservable = useObservable(dataMaxLimit);

    const defaultScaleData = useObservable({
        id: "full_bar_scale",
        index: 0,
        data: Array(Math.floor(dataMaxLimitObservable.get()/spacing.get())).fill(spacing.get()),
        order: 0,
        width: "100%",
        decorationWidth: decorationWidth??"6rem",
        elements: fullBarElements, 
        CSS: "",
    });


    const newScaleData = scaleData? scaleData : defaultScaleData;

    const scaleLabels = useComputed(() => { 
        const spacingWidth : number = spacing.get();
        const labelNumbers = Array(Math.floor(dataMaxLimitObservable.get()/spacingWidth)).fill(0).map((_, i) => i*spacingWidth);
        return labelNumbers;
    })

    useObserve(scaleLabels, ({value}) => {
        defaultScaleData.CSS?.set("& .bar {opacity: 0;}")
        setTimeout(() => {
          console.log("scaleLabels: " + value??[0])
          defaultScaleData.data?.set(Array((value??[0]).length).fill(spacing?.get()))
          console.log("data: " + Array((value??[0]).length).fill(spacing?.get()))
          vars["$scaleLabel"]?.set([value??[0]])
          // vars?.set({...vars?.get()??{}, "$scaleLabel": [value??[0]]})
        }, 340);
        setTimeout(() => {
          defaultScaleData.CSS?.set("& .bar {opacity: 1;}")
       }, 840);
    })

    return (
            <div id={id} className='scale' style={{...style, width: width, height: height, overflow: "hidden"}}>
                <div className='plot-area' style={{width: "100%", height: "100%", position: "relative"}}>
                    <FullBar item={newScaleData} />
                </div>
            </div>
          )
}

export default Scale;