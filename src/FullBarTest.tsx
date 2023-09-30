import BarElementType from './components/types/BarElementType';
import BarContentContainerElementType from './components/types/BarContentContainerElementType';
import { ChakraProvider, extendBaseTheme, NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper } from "@chakra-ui/react"
import { NumberInput as NumberIn } from "@chakra-ui/theme/components"
import FullBar from './components/FullBar';
import BarContext from './components/BarContext';
import { useContext } from 'react';
import { useSelector } from '@legendapp/state/react';
import FullBarElementType from './components/types/FullBarElementType';

const theme = extendBaseTheme({
  components: {
    NumberIn,
  },
})

const App = () => {

    const {index, data, dataMax, theme, orientation, vars, width, decorationWidth} = useContext(BarContext);


    if (data.peek().length === 0){
        data.set([5]);
        dataMax.set(10);
    }

    // const trackedData = useSelector(data);


    if ((vars.peek().keys?.length??0) === 0){
        console.log("undefined vars")
        vars.set({
        "color": ["orange", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "gray", "black"],
        "bar-label": ["label 1", "label 2", "label 3", "label 4", "label 5", "label 6", "label 7", "label 8", "label 9", "label 10"],
        "bar-val": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      });
    }

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

    return (
        <ChakraProvider >
            <BarContext.Provider value={{index: index, data: data, dataMax: dataMax, orientation: orientation, theme: theme, vars: vars, width: width, decorationWidth: decorationWidth}}>
            <div id="bar_plot" style={{width: "100%", height: "100%", padding: "6rem"}}>
                <NumberInput defaultValue={5} min={1} max={20} onChange={(value) => data.set([parseInt(value)])}>
                    <NumberInputField />
                    <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                    </NumberInputStepper>
                </NumberInput>
                <NumberInput defaultValue={1} min={1} max={25} onChange={(value) => index.set(parseInt(value))}>
                    <NumberInputField />
                    <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                    </NumberInputStepper>
                </NumberInput>
                <div id={"Bar-and-dec-test"} style={{width: "100%", height: "100%"}}>
                    <div id={"full_bar_plot-1"} style={{width: "100%", height: "200px"}}>
                        <FullBar
                            index={0}
                            data={[2]}
                            elements={fullBarElements}
                            width="200px"
                            decorationWidth="10%"
                            order={0}
                            CSS=""
                        />
                    </div>
                    {`Data: ` + data.get()?.length??`None`}
                    {`\nDataMax: ` + dataMax.get()??`None`}
                    {`\nVars: ` + vars.get()?.length??`None`}
                </div>
            </div>
            </BarContext.Provider>
        </ChakraProvider>
    )
};

export default App;