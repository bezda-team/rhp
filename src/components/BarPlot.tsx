import styled from '@emotion/styled';
import FullBar from './FullBar';
import { ChakraProvider, extendBaseTheme, NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper } from "@chakra-ui/react"
import { NumberInput as NumberIn } from "@chakra-ui/theme/components"
import PlotContext from './PlotContext';
import { useContext, useMemo, useRef } from 'react';
import { useObservable, For } from '@legendapp/state/react';
import FullBarElementType from './types/FullBarElementType';
import { enableReactUse } from '@legendapp/state/config/enableReactUse';
import { opaqueObject } from '@legendapp/state';

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

type TrackedData = {
    id: string,
    index: number,
    barConfig: FullBarElementType[],
    width: string,
    data: number[],
}

const Div = styled.div``;

const BarPlot = () => {
  
  const {plotData, dataMax, theme, orientation, vars} = useContext(PlotContext);
  const renderCount = ++useRef(0).current;
  console.log("Test APP: " + renderCount);

  const index = useObservable(0);
  

  useMemo(() => {
      plotData.set([[1], [2], [6], [2], [5], [9], [7]]);
      dataMax.set(10);
      vars.set({
      "color": ["orange", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "gray", "black"],
      "bar-label": ["label 1", "label 2", "label 3", "label 4", "label 5", "label 6", "label 7", "label 8", "label 9", "label 10"],
      "bar-val": plotData.get().flat(),
    });
  }, []);

    const fullBarElements: FullBarElementType[] = [
      {
        type: "bar-content-container",
        elements: [{
                      type: "bar-dec-container",
                      elements: [{
                                    type: "bar",
                                    order: 1,
                                    css: "background-color: red; height: auto; transition: all 0.5s ease-in-out;",
                                    markup: "<div style='background-color: {{color}};height:100%'></div>",
                                  },
                                  {
                                    type: "decoration",
                                    order: 2,
                                    css: "color: white; div {font-size: small; text-align: center; text-orientation: sideways-right;writing-mode: vertical-rl;}",
                                    markup: "<div style='font-weight: bold;color: {{color}};height: fit-content;'>{{bar-val}}</div>",
                                  }],
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
                  ],
                  decorationWidth: "10%",
                  order: 1,
                  CSS:"padding-right: 1rem;"
                }, 
                {
                  type: "decoration",
                  order: 0,
                  css: "display: flex; flex-direction: row-reverse;background: none; color: black; margin-right: 0.5rem; div {text-align: center; text-orientation: sideways-right;writing-mode: vertical-rl;}",
                  markup: "<div style='width: fit-content;'>{{bar-label}}</div>",
                },
              ];

    const trackedBarsData = useObservable(() => {
      const untrackedData = plotData.peek();
      const newBarsDataTemp : {index: number, data: number[], order: number, width: string, decorationWidth: string, barElements: FullBarElementType[], id: string, CSS:string}[] = [];
      untrackedData.forEach((value, i) => {
          newBarsDataTemp.push({
                                id: "full_bar_a_" + i,
                                index: i,
                                data: value,
                                // data: plotData[i].get(),
                                order: i,
                                width: "12%",
                                decorationWidth: "10%",
                                barElements: opaqueObject(fullBarElements),  // Avoid strange unexplainable circular reference errors for each element of this array on first render
                                CSS: "padding-top: 0.5rem; padding-bottom: 0.5rem; transition: all 0.5s ease-in-out;",
                              });
      });
      return newBarsDataTemp;
  });

  return (
      <ChakraProvider >
          <PlotContext.Provider value={{ plotData: plotData, dataMax: dataMax, orientation: orientation, theme: theme, vars: vars}}>
            <div id="bar_plot" style={{width: "100%", height: "100%", padding: "6rem"}}>
              {`Select Bar:`}
              <NumberInput defaultValue={index.get()} min={0} max={trackedBarsData.get().length} onChange={(value) => index.set(parseInt(value))}>
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              {`Change Bar Value:`}
              <NumberInput defaultValue={trackedBarsData[index.get()].data.get()[0]} min={1} max={20} onChange={(value) => trackedBarsData[index.get()].data.set([parseInt(value)])}>
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              {`Change Bar Parameter Selection Index:`}
              <NumberInput defaultValue={0} min={0} max={20} onChange={(value) => trackedBarsData[index.get()].index.set(parseInt(value))}>
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              {`Change Bar Order:`}
              <NumberInput defaultValue={trackedBarsData[index.get()].order.get()} min={0} max={20} onChange={(value) => trackedBarsData[index.get()].order.set(parseInt(value))}>
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <div id={"Bar-and-dec-test"} style={{width: "100%", height: "100%"}}>
                {/* <div id={"full_bar_plot-1"} style={{width: "100%", height: "600px", display: "flex", flexDirection: "column"}}> */}
                <div id={"full_bar_plot-1"} style={{width: "100%", height: "600px", position: "relative"}}>
                  <For each={trackedBarsData} item={FullBar} />
                </div>
                  {`Index: ` + index.get()}
                  {`PlotData: ` + plotData[index.get()].get()}
                  {`\nDataMax: ` + dataMax.get()??`None`}
              </div>
            </div>
          </PlotContext.Provider>
      </ChakraProvider>
  )
}

// const BarPlot = () => {

//     const {data, barConfig, width, height, CSS,  orientation} = useObservable(PlotState);

//     const {barHeight, barWidth} = useSelector(() => {
//       const plot = document.getElementById("bar_plot");
//       const plotWidth = plot?.clientWidth;
//       const plotHeight = plot?.clientHeight;
//       const newWidth = plotWidth? (plotWidth/data.length) : parseInt(width.get(), 10)/data.length;
//       const newHeight = plotHeight? (plotHeight/data.length) : parseInt(height.get(), 10)/data.length;
    
//       let widthEnding = width.get().replace(parseInt(width.get(), 10).toString(), "").trim();
//       widthEnding = plotWidth? "px" : (widthEnding.length > 1? widthEnding.slice(-2): widthEnding);
    
//       let heightEnding = height.get().replace(parseInt(height.get(), 10).toString(), "").trim();
//       heightEnding = plotHeight? "px" : (heightEnding.length > 1? heightEnding.slice(-2): heightEnding);
    
//       const barHeight = newHeight + heightEnding;
//       const barWidth = newWidth + widthEnding;
//       return {barHeight, barWidth};
//     });

//     const newData = useSelector(() => {
//       const untrackedData = data.peek();
//       const newData: TrackedData[] = [];
//       untrackedData.forEach((value, i) => {
//         newData.push({
//                       id: "full_bar_" + i, 
//                       index: i, 
//                       barConfig: barConfig.peek(), 
//                       width: orientation.peek()===0? barHeight : barWidth, 
//                       data: typeof value === "number"? [value] as number[] : value as number[]
//                     });
//       });
//       return newData;
//     });

//     const trackedData = useObservable(newData);

//     useEffect(() => {
//         console.log("-->BarPlot mounted");
//         return () => {
//             console.log("-->BarPlot unmounted");
//         }
//     }, []);



//     console.log("width: " + barWidth + ", height: " + barHeight);
  
//     return (
//       <Div 
//         id="bar_plot"
//         className="bar-plot" 
//         style={orientation.get()===0? {display: "flex", flexDirection: "column", alignItems: "center", width: width.get(), height: height.get(), overflow: "hidden"} : {display: "flex", flexDirection: "row", alignItems: "center", height: width.get(), width: height.get(), overflow: "hidden"}} 
//         css={css`${CSS.get()["bar-plot"]}`}> 
//           {/* <For each={trackedData}>
//                 { item => (
//                   <FullBar 
//                     key={item.get()?.id}
//                     id={item.get()?.id}
//                     index={item.get()?.index??0}
//                     elements={item.get()?.barConfig??[]}
//                     data={item.get()?.data??[]}
//                     order={item.get()?.index??0}
//                     width={item.get()?.width??"10%"}
//                     decorationWidth={item.get()?.width??"10%"}
//                     CSS={DEFAULT_CSS["full-bar"]}
//                   />
//                 )}
//           </For> */}
//       </Div>
//     );
//   }

export default BarPlot;