import styled from '@emotion/styled';
import { ChakraProvider, extendBaseTheme, NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper, Button, ButtonGroup } from "@chakra-ui/react"
import { NumberInput as NumberIn } from "@chakra-ui/theme/components"
import PlotContext from './components/PlotContext';
import { useContext, useMemo, useRef } from 'react';
import { useObservable, useObserve, useComputed } from '@legendapp/state/react';
import FullBarElementType from './components/types/FullBarElementType';
import { opaqueObject } from '@legendapp/state';
import BarPlot, { changeOrder, changeOrderBasedOnMagnitude } from './components/BarPlot';

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

const Div = styled.div``;

const App = () => {
  
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

 const orderList = useObservable(() => {
    const length = plotData.get().length;
    return Array.from(Array(length).keys());
  });

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
      const newBarsDataTemp : {index: number, data: number[], order: number, width: string, decorationWidth: string, elements: FullBarElementType[], id: string, CSS:string}[] = [];
      untrackedData.forEach((value, i) => {
          newBarsDataTemp.push({
                                id: "full_bar_a_" + i,
                                index: i,
                                data: value,
                                // data: plotData[i].get(),
                                order: orderList.get()[i],
                                width: "calc(100%/" + (untrackedData.length) + ")",
                                decorationWidth: "10%",
                                elements: opaqueObject(fullBarElements),  // Avoid strange unexplainable circular reference errors for each element of this array on first render
                                CSS: "padding-top: 0.5rem; padding-bottom: 0.5rem; transition: all 0.5s ease-in-out;",
                              });
      });
      return newBarsDataTemp;
  });

  // The following code recalculates the order of the bars (starting from their current order)
  // based on new data values. The new order should result in the bars being re-arranged 
  // so that bars with greater data value sit above (or to the left of) bars with lower data value.
  // NOTE: A key requirement here is making sure that the returned new orders are arranged according 
  // to the position of the corresponding bar in the trackedBarsData array without messing with sorting
  // stability.
  // ADDITIONAL NOTE: `useComputed` re-executes when inner tracked observables change. 
  // `trackedBarsData[i].data.get()` is the tracked observable in this `useComputed`.
  const trackedOrder = useComputed(() => {
    const data: number[][] = [];
    const indexSortedByValue : number[] = []
    const tempBarData = trackedBarsData.peek();
    tempBarData.map((value, i) => {
      data.push([trackedBarsData[i].data.get()[0], tempBarData[i].order, i]); 
    });

    // the following line sorts the data array according to the current order of the bars
    // (ie how they are currently displayed) 
    data.sort((a, b) => a[1] - b[1]);  //ascending order

    // the data is then sorted by current value which should reflect recent changes to the data
    data.sort((a, b) => b[0] - a[0]);  //descending value


    // The new order is the index of the new indexSortedByValue array 
    // and the value of this new array is the index of the original bar data array
    // where this new order must be placed
    data.forEach((value, i) => {
      indexSortedByValue.push(value[2]);                        
    });

    // Again, the new orders are in the index of indexSortedByValue. They need to be pulled out 
    // and sorted by the index of the bar they go with. So, the order is the index and the value
    // is the bar index to be sorted by.
    const finalOrder = indexSortedByValue.map((value, i) => i).sort((a, b) => indexSortedByValue[a] - indexSortedByValue[b]); 
    return finalOrder;
  });

  // changes order of bars when trackedOrder changes
  useObserve(trackedOrder, () => { changeOrder(trackedOrder.peek(), trackedBarsData);});

  return (
    <ChakraProvider >
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
            {`Change Data Max:`}
            <NumberInput defaultValue={dataMax.get()} min={1} max={50} onChange={(value) => dataMax.set(parseInt(value))}>
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
            <ButtonGroup gap='4'>
              <Button colorScheme='blackAlpha' onClick={() => changeOrder([0,1,2,4,3,5,6], trackedBarsData)} >Re-Order</Button>
              <Button colorScheme='blackAlpha' onClick={() => changeOrderBasedOnMagnitude(trackedBarsData)}>Arrange</Button>
            </ButtonGroup>
              <BarPlot 
                id='bar_plot_1'
                width='100%'
                height='600px'
                style={{padding: "4rem"}}
                barsData={trackedBarsData} 
                plotData={plotData}
                dataMax={dataMax}
                orientation={orientation}
                theme={theme}
                vars={vars}
              />
              {`Index: ` + index.get()}
              {`PlotData: ` + plotData[index.get()].get()}
              {`\nDataMax: ` + dataMax.get()??`None`}
          </div>
    </ChakraProvider>
  )
}

export default App;