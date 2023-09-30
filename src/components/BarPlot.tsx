/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react'
import styled from '@emotion/styled';
// import { useEffect } from 'react';
import FullBar from './FullBar';
import PlotState from '../PlotState';
import { useEffect } from 'react';
import { For, useObservable, useSelector } from "@legendapp/state/react"
import FullBarElementType from './types/FullBarElementType';
import Vars from './types/Vars';
import PlotCSS from './types/PlotCSS';
import FullBarWrapped from '../FullBarWrapped';

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

type BarData = {
    id: string,
    index: number,
    data: number[], 
    dataMax: number, 
    theme: object, 
    barConfig: FullBarElementType[], 
    width: string,  
    CSS: PlotCSS, 
    markup: object, 
    orientation: number, 
    vars: Vars,
    order: number,
}

const Div = styled.div``;

const BarPlot = () => {

    const {data, dataMax, theme, barConfig, width, height, CSS, markup, orientation, vars, order} = useObservable(PlotState);

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
      const newData: BarData[] = [];
      untrackedData.forEach((value, i) => {
        newData.push({
                      id: "full_bar_" + i, 
                      index: i, 
                      data: typeof value === "number"? [value] as number[] : value as number[],
                      dataMax: dataMax.peek(),
                      theme: theme.peek(),
                      barConfig: barConfig.peek(), 
                      width: orientation.peek()===0? barHeight : barWidth, 
                      CSS: CSS.peek(),
                      markup: markup.peek(),
                      orientation: orientation.peek(),
                      vars: vars.peek(),
                      order: order.peek()[i],
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
          <For each={trackedData} item={FullBarWrapped} />
      </Div>
    );
  }

export default BarPlot;