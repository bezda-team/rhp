import BarElementType from './components/types/BarElementType';
import BarContentContainerElementType from './components/types/BarContentContainerElementType';
import { ChakraProvider, extendBaseTheme, NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper } from "@chakra-ui/react"
import { NumberInput as NumberIn } from "@chakra-ui/theme/components"
import FullBar from './components/FullBar';
import PlotContext from './components/PlotContext';
import { useContext, useMemo, useRef } from 'react';
import { useObservable, useSelector, observer } from '@legendapp/state/react';
import FullBarElementType from './components/types/FullBarElementType';
import { enableReactUse } from '@legendapp/state/config/enableReactUse';

enableReactUse();

const theme = extendBaseTheme({
  components: {
    NumberIn,
  },
})

const App = () => {

    const {plotData, dataMax, theme, orientation, vars} = useContext(PlotContext);

    const index = useObservable(0);

    // const trackedData = useSelector(data);
    const renderCount = ++useRef(0).current;
    console.log("Test APP: " + renderCount);

    useMemo(() => {
        plotData.set([[1], [2], [6], [2], [5], [9], [7]]);
        dataMax.set(10);
        vars.set({
        "color": ["orange", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "gray", "black"],
        "bar-label": ["label 1", "label 2", "label 3", "label 4", "label 5", "label 6", "label 7", "label 8", "label 9", "label 10"],
        "bar-val": plotData.get().flat(),
      });
    }, []);

    const elements: BarElementType[] = [
        {
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
          CSS:"padding-right: 1rem;"
        }, 
        {
          type: "decoration",
          order: 0,
          css: "display: flex; flex-direction: row-reverse;background: none; color: black; margin-right: 0.5rem; div {text-align: center; text-orientation: sideways-right;writing-mode: vertical-rl;}",
          markup: "<div style='width: fit-content;'>{{bar-label}}</div>",
        },
      ];


      const newBarObservable = useObservable({
                                            id: "full_bar_a_1",
                                            index: 0,
                                            data: plotData[0].get(),
                                            order: 0,
                                            width: "100%",
                                            decorationWidth: "10%",
                                            elements: fullBarElements,
                                            CSS: "",
                                        });


    return (
        <ChakraProvider >
            <PlotContext.Provider value={{ plotData: plotData, dataMax: dataMax, orientation: orientation, theme: theme, vars: vars}}>
            <div id="bar_plot" style={{width: "100%", height: "100%", padding: "6rem"}}>
                <NumberInput defaultValue={newBarObservable.data.get()[0]} min={1} max={20} onChange={(value) => newBarObservable.data.set([parseInt(value)])}>
                    <NumberInputField />
                    <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                    </NumberInputStepper>
                </NumberInput>
                <NumberInput defaultValue={0} min={0} max={20} onChange={(value) => newBarObservable.index.set(parseInt(value))}>
                    <NumberInputField />
                    <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                    </NumberInputStepper>
                </NumberInput>
                <div id={"Bar-and-dec-test"} style={{width: "100%", height: "100%"}}>
                    <div id={"full_bar_plot-1"} style={{width: "100%", height: "200px"}}>
                        <FullBar item={newBarObservable} />
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

export default App;