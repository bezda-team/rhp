import styled from '@emotion/styled';
import { ChakraProvider, extendBaseTheme, NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper, Button, ButtonGroup, Stack } from "@chakra-ui/react"
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
    "full-bar":"padding-top: 0.5rem; padding-bottom: 0.5rem;transition: all 0.3s ease-in-out;",
    "bar-label": "display: flex; flex-direction: row-reverse;background-color: slategray; color: white; div {text-align: center; text-orientation: sideways-right;writing-mode: vertical-rl;}",
    "bar-content-container": "background-color: green;",
    "bar-dec-container": "",
    "bar": "background-color: blue;",
    "bar-decoration": "background-color: blue;",
    "desaturate-bar": "padding-top: 0.5rem; padding-bottom: 0.5rem;filter: saturate(40%); transition: all 0.3s ease-in-out;&:hover {filter: saturate(110%);}"
}
  
export const DEFAULT_MARKUP = {
    "bar-label": "<div style='width: fit-content;'>Bar label</div>",
    "bar-content-container": "",
    "bar-dec-container": "",
    "bar": "",
    "bar-decoration": "",
}

const App = () => {
  
  const {plotData, dataMax, theme, orientation, vars} = useContext(PlotContext);
  const renderCount = ++useRef(0).current;
  console.log("Test APP: " + renderCount);

  const index = useObservable(0);
  const cssObservable = useObservable("padding-top: 0.5rem; padding-bottom: 0.5rem;transition: all 0.3s ease-in-out;");
  cssObservable.use();
  // const cssObservable = useObservable("padding-top: 0.5rem; padding-bottom: 0.5rem;filter: saturate(40%); transition: all 0.3s ease-in-out;&:hover {filter: saturate(110%);}");

  useMemo(() => {
    plotData.set([[1], [2], [18], [3], [25], [13], [20]]);
    dataMax.set(30);
    vars.set({
      "color": ["#577590","#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51", "#ce4257", "pink", "brown", "gray", "black"],
      "bar-label": ["Fruit A", "Fruit B", "Fruit C", "Fruit D", "Fruit E", "Fruit F", "Fruit G"],
      "bar-val": ["grape", "watermelon", "pear", "banana", "orange","peach", "strawberry"],
      "fruit-svgs":['<img src="./grape.svg" alt="grape" />', '<img src="./watermelon.svg" alt="watermelon" />' , '<img src="./pear.svg" alt="pear" />', '<img src="./banana.svg" alt="banana" />', '<img src="./orange.svg" alt="orange" />', '<img src="./peach.svg" alt="peach" />', '<img src="./strawberry.svg" alt="strawberry" />'],
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
                                  css: "box-sizing: border-box;border-radius: 0 1rem 1rem 0;overflow: hidden;height: auto; transition-property: flex, border;transition-duration: 0.4s;transition-timing-function: ease-in-out;&:hover {border: 4px solid black;}& div {display:flex;align-items: center;}& img {flex-grow: 1; max-width: 300px;min-width: 50px;}",
                                  markup: "<div style='background-color: {{color}};height:100%;'>{{fruit-svgs}}</div>",
                                },
                                {
                                  type: "decoration",
                                  order: 2,
                                  css: "color: white; div {font-size: small; text-align: left; margin-left: 0.5rem;}",
                                  markup: "<div style='font-weight: bold;color: {{color}};height: fit-content;'>{{bar-val}}</div>",
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
                CSS:"padding-right: 5.1rem;"
              }, 
              {
                type: "decoration",
                order: 0,
                css: "display: flex; flex-direction: row-reverse;background: none; color: black; margin-right: 1rem; div {text-align: center;}",
                markup: "<div style='width: fit-content;font-weight: 600;color: #555555;'>{{bar-label}}</div>",
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
                                decorationWidth: "6%",
                                elements: opaqueObject(fullBarElements),  // Avoid strange unexplainable circular reference errors for each element of this array on first render
                                CSS: DEFAULT_CSS["full-bar"],
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
    tempBarData.map((value, i) => data.push([trackedBarsData[i].data.get()[0], tempBarData[i].order, i]));

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

  const changeCSS = (css: string) => {
    trackedBarsData.forEach((value, i) => {
      value.CSS.set(css);
    });
  }

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
            <NumberInput defaultValue={trackedBarsData[index.get()].data.get()[0]} min={0} max={50} onChange={(value) => trackedBarsData[index.get()].data.set([parseInt(value)])}>
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
            <Stack direction='row' spacing={4} align='center' margin={6}>
              <ButtonGroup gap='4'>
                <Button colorScheme='blackAlpha' onClick={() => changeOrder([0,1,2,4,3,5,6], trackedBarsData)} >Re-Order</Button>
                <Button colorScheme='blackAlpha' onClick={() => changeOrderBasedOnMagnitude(trackedBarsData)}>Arrange</Button>
                <Button colorScheme='blackAlpha' onClick={() => changeCSS(DEFAULT_CSS["desaturate-bar"])}>Dim</Button>
                <Button colorScheme='blackAlpha' onClick={() => changeCSS(DEFAULT_CSS["full-bar"])}>Brighten</Button>
              </ButtonGroup>
            </Stack>
              <BarPlot 
                id='bar_plot_1'
                width='100%'
                height='600px'
                style={{padding: "4rem", borderRadius: "1rem", backgroundColor: "white", border: "3px solid #999999", marginTop: "2rem", marginBottom: "2rem"}}
                barsData={trackedBarsData} 
                plotData={plotData}
                dataMax={dataMax}
                orientation={orientation}
                theme={theme}
                vars={vars}
              />
              <a href="https://www.freevector.com/flat-colorful-fruits-26803#">FreeVector.com</a>
          </div>
    </ChakraProvider>
  )
}

export default App;