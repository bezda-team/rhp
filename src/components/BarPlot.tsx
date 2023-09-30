/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react'
import styled from '@emotion/styled';
// import { useEffect } from 'react';
import FullBar from './FullBar';
import PlotState from '../PlotStore';
import { useEffect } from 'react';
import { For, useObservable, useSelector } from "@legendapp/state/react"
import FullBarElementType from './types/FullBarElementType';

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

type TrackedData = {
    id: string,
    index: number,
    barConfig: FullBarElementType[],
    width: string,
    data: number[],
}

const Div = styled.div``;

const BarPlot = () => {

    const {data, barConfig, width, height, CSS,  orientation} = useObservable(PlotState);

    const {barHeight, barWidth} = useSelector(() => {
      const plot = document.getElementById("bar_plot");
      const plotWidth = plot?.clientWidth;
      const plotHeight = plot?.clientHeight;
      const newWidth = plotWidth? (plotWidth/data.length) : parseInt(width.get(), 10)/data.length;
      const newHeight = plotHeight? (plotHeight/data.length) : parseInt(height.get(), 10)/data.length;
    
      let widthEnding = width.get().replace(parseInt(width.get(), 10).toString(), "").trim();
      widthEnding = plotWidth? "px" : (widthEnding.length > 1? widthEnding.slice(-2): widthEnding);
    
      let heightEnding = height.get().replace(parseInt(height.get(), 10).toString(), "").trim();
      heightEnding = plotHeight? "px" : (heightEnding.length > 1? heightEnding.slice(-2): heightEnding);
    
      const barHeight = newHeight + heightEnding;
      const barWidth = newWidth + widthEnding;
      return {barHeight, barWidth};
    });

    const newData = useSelector(() => {
      const untrackedData = data.peek();
      const newData: TrackedData[] = [];
      untrackedData.forEach((value, i) => {
        newData.push({
                      id: "full_bar_" + i, 
                      index: i, 
                      barConfig: barConfig.peek(), 
                      width: orientation.peek()===0? barHeight : barWidth, 
                      data: typeof value === "number"? [value] as number[] : value as number[]
                    });
      });
      return newData;
    });

    const trackedData = useObservable(newData);

    useEffect(() => {
        console.log("-->BarPlot mounted");
        return () => {
            console.log("-->BarPlot unmounted");
        }
    }, []);



    console.log("width: " + barWidth + ", height: " + barHeight);
  
    return (
      <Div 
        id="bar_plot"
        className="bar-plot" 
        style={orientation.get()===0? {display: "flex", flexDirection: "column", alignItems: "center", width: width.get(), height: height.get(), overflow: "hidden"} : {display: "flex", flexDirection: "row", alignItems: "center", height: width.get(), width: height.get(), overflow: "hidden"}} 
        css={css`${CSS.get()["bar-plot"]}`}> 
          {/* <For each={trackedData}>
                { item => (
                  <FullBar 
                    key={item.get()?.id}
                    id={item.get()?.id}
                    index={item.get()?.index??0}
                    elements={item.get()?.barConfig??[]}
                    data={item.get()?.data??[]}
                    order={item.get()?.index??0}
                    width={item.get()?.width??"10%"}
                    decorationWidth={item.get()?.width??"10%"}
                    CSS={DEFAULT_CSS["full-bar"]}
                  />
                )}
          </For> */}
      </Div>
    );
  }

export default BarPlot;