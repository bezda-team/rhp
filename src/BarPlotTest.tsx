/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react'
import styled from '@emotion/styled';
// import { useEffect } from 'react';
import PlotState from './PlotState';
import { useEffect, useMemo } from 'react';
import { For, useObservable, useSelector } from "@legendapp/state/react"
import FullBarElementType from './components/types/FullBarElementType';
import Vars from './components/types/Vars';
import PlotCSS from './components/types/PlotCSS';
import FullBarWrapped from './FullBarWrapped';
import BarElementType from './components/types/BarElementType';
import BarContentContainerElementType from './components/types/BarContentContainerElementType';
import { observer } from "@legendapp/state/react"

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

const BarPlot = observer(() => {

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
  })

  const App = observer(() => {
    const state = useObservable(PlotState);

    useMemo(() => {
      const elements: BarElementType[] = [
        {
          type: "bar",
          order: 1,
          css: "background-color: red; height: auto;",
          markup: "<div style='background-color: {{color}};height:100%'></div>",
        },
        {
          type: "decoration",
          order: 2,
          css: "color: white; div {font-size: small; text-align: center; text-orientation: sideways-right;writing-mode: vertical-rl;}",
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
          css: "display: flex; flex-direction: row-reverse;background: none; color: black; margin-right: 0.5rem; div {text-align: center; text-orientation: sideways-right;writing-mode: vertical-rl;}",
          markup: "<div style='width: fit-content;'>{{bar-label}}</div>",
        },
      ];

      state.set({data: [4,9,5,6,1,2], 
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
    }, []);

    return (
      <BarPlot />
    );
  })

export default App;