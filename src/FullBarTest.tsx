import type { BarElementType } from './components/types/BarElementType';
import type { BarContentContainerElementType } from './components/types/BarContentContainerElementType';
import { ChakraProvider, extendBaseTheme, NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper } from "@chakra-ui/react"
import { NumberInput as NumberIn } from "@chakra-ui/theme/components"
import FullBar from './components/FullBar';
import PlotContext from './components/PlotContext';
import { useContext, useMemo, useRef } from 'react';
import { useObservable, useSelector, observer, useObserve, useComputed } from '@legendapp/state/react';
import type { FullBarElementType } from './components/types/FullBarElementType';
import { enableReactUse } from '@legendapp/state/config/enableReactUse';
import { Observable, opaqueObject } from '@legendapp/state';

enableReactUse();

const theme = extendBaseTheme({
  components: {
    NumberIn,
  },
})

const App = () => {

    const {plotData, dataMax, theme, orientation, vars} = useContext(PlotContext);

    const index = useObservable(0);
    const spacing = useObservable(10);
    const dataMaxLimit = useObservable(100);

    // const trackedData = useSelector(data);
    const renderCount = ++useRef(0).current;
    console.log("Test APP: " + renderCount);

    useMemo(() => {
        plotData.set([[1], [2], [6], [2], [5], [9], [7]]);
        dataMax.set(10);
        vars.set({
        "color": ["orange", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "gray", "black"],
        "bar-label": ["label 1", "label 2", "label 3", "label 4", "label 5", "label 6", "label 7", "label 8", "label 9", "label 10"],
        "bar-val": [0],
      });
    }, []);

    const elements: BarElementType[] = [
      {
        type: "bar",
        order: 1,
        isDefault: true,
        CSS: "background-color: none; height: auto; transition: all 0.1s linear;border-left: 4px solid black;border-bottom: 4px solid black;",
        markup: "<div style='font-weight: bold;font-size: small;height:100%;display: flex; justify-content: flex-start;padding-left: 2px;'><span>{{bar-val}}</div>",
      },
      {
        type: "decoration",
        order: 20,
        useDataMax: true,
        CSS: "position:absolute;left: calc(100% - 2rem);width: 3rem;height: 100%;color: black; div {font-size: small; text-align: left;border-left: 4px solid black;}", //We subtract 2rem from `left` to account for padding that impacts where the bars stop
        markup: "<div style='font-weight: bold;height: 100%;background-color: white;padding-left: 2px;'>{{$dataMaxValue}}</div>",
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
    ];

    const fullBarElements: FullBarElementType[] = [
      {
        type: "bar-content-container",
        elements: contentElements,
        decorationWidth: "10%",
        order: 1,
        CSS:"padding-right: 2rem;"
      }, 
    ];


    const newBarObservable = useObservable({
                                              id: "full_bar_a_" + 0,
                                              index: 0,
                                              data: Array(Math.floor(dataMaxLimit.get()/spacing.get())).fill(spacing.get()),
                                              // data: plotData[i].get(),
                                              order: 0,
                                              width: "100%",
                                              decorationWidth: "6%",
                                              elements: fullBarElements,  // Avoid strange unexplainable circular reference errors for each element of this array on first render
                                              CSS: "",
                                            });

    const scaleLabels = useComputed(() => { 
      const spacingWidth : number = spacing.get();
      const labelNumbers = Array(Math.floor(dataMaxLimit.get()/spacingWidth)).fill(0).map((_, i) => i*spacingWidth);
      return labelNumbers;
    })

    useObserve(scaleLabels, ({value}) => {
      vars?.set({...vars.get(), "bar-val": [value??[0]]})
    })

    return (
        <ChakraProvider >
            <PlotContext.Provider value={{ plotData: plotData, dataMax: dataMax, orientation: orientation, theme: theme, vars: vars}}>
            <div id="bar_plot" style={{width: "100%", height: "100%", padding: "6rem"}}>
                {`Mark every:`}
                <NumberInput defaultValue={10} min={1} max={50} onChange={(value) => newBarObservable.data.set([parseInt(value), parseInt(value), parseInt(value), parseInt(value), parseInt(value), parseInt(value), parseInt(value), parseInt(value), parseInt(value), parseInt(value), parseInt(value), parseInt(value)])}>
                    <NumberInputField />
                    <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                    </NumberInputStepper>
                </NumberInput>
                {`Change Data Max:`}
                <NumberInput defaultValue={dataMax.get()} min={1} max={dataMaxLimit.get()} onChange={(value) => dataMax.set(parseInt(value))}>
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <div id='bar_plot_1' className='bar-plot' style={{padding: "4rem", borderRadius: "1rem", backgroundColor: "white", border: "3px solid #999999", marginTop: "2rem", marginBottom: "2rem", width: '100%', height: '156px', overflow: "hidden"}}>
                  <div className='plot-area' style={{width: "100%", height: "100%", position: "relative"}}>
                    <FullBar item={newBarObservable} />
                  </div>
                </div>
            </div>
            </PlotContext.Provider>
        </ChakraProvider>
    )
}

export default App;