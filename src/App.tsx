import BarPlot from './components/BarPlot';
import BarElementType from './components/types/BarElementType';
import BarContentContainerElementType from './components/types/BarContentContainerElementType';
import FullBarElementType from './components/types/FullBarElementType';
import PlotState from './PlotState';
import { ChakraProvider, extendBaseTheme, NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper } from "@chakra-ui/react"
import { NumberInput as NumberIn } from "@chakra-ui/theme/components"
import { useEffect } from 'react';

const theme = extendBaseTheme({
  components: {
    NumberIn,
  },
})

const App = () => {
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

  useEffect(() => {
    PlotState.data.set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    PlotState.dataMax.set(10);
    PlotState.theme.set({});
    PlotState.barConfig.set(fullBarElements);
    PlotState.width.set("900px");
    PlotState.height.set("900px");
    PlotState.orientation.set(0);
    PlotState.vars.set({
      "color": ["orange", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "gray", "black"],
      "bar-label": ["label 1", "label 2", "label 3", "label 4", "label 5", "label 6", "label 7", "label 8", "label 9", "label 10"],
      "bar-val": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    });
  }, []);
  return (
    <ChakraProvider >
      <div id="bar_plot" style={{width: "100%", height: "100%"}}>
        <NumberInput defaultValue={10} min={5} max={20} onChange={(value) => PlotState.data.set([parseInt(value), 2, 3, 4, 5, 6, 7, 8, 9, 10])}>
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
        <BarPlot/>
      </div>
    </ChakraProvider>
  )
};

export default App;