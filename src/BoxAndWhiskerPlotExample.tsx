import styled from '@emotion/styled';
import { ChakraProvider, extendBaseTheme, NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper, Button, ButtonGroup, Stack, Box, Slider, SliderMark, SliderTrack, SliderFilledTrack, SliderThumb, Select, RadioGroup, Radio, Center } from "@chakra-ui/react"
import { NumberInput as NumberIn } from "@chakra-ui/theme/components"
import PlotContext from './components/PlotContext';
import { useContext, useMemo, useRef, useState } from 'react';
import { useObservable, useObserve, useComputed, useSelector } from '@legendapp/state/react';
import FullBarElementType from './components/types/FullBarElementType';
import { opaqueObject, Observable } from '@legendapp/state';
import Scale from './components/Scale';
import { enableReactUse } from '@legendapp/state/config/enableReactUse';
import BoxWhiskerPlot, { processData, changeBWOrder, changeOrderBasedOnPosition, DEFAULT_BOX_WHISKER_TEMPLATE } from './BoxAndWhiskerPlot';

const theme = extendBaseTheme({
  components: {
    NumberIn,
  },
})

enableReactUse();

const Div = styled.div`
@media (max-width: 600px) {
  padding: 0.5rem 1.5rem;
  margin: 0;
  width: 470px;
  #plot {
    margin-left: -1.1rem;
    width: 456px;
  }
}
@media (min-width: 601px) and (min-width: 900px){
    padding: 1rem 3rem;
    margin: 0;
    width: 100%;
}
@media (min-width: 801px){
    padding: 3rem 6rem;
    margin: 0;
    width: 100%;
}`;

export const DEFAULT_CSS = {
    "bar-plot": "",
    "full-bar":"padding-top: 0.5rem; padding-bottom: 0.5rem;transition: all 0.3s ease-in-out;& div.bar-content-container div.bar {transition-timing-function: ease-in-out;}",
    "bar-label": "display: flex; flex-direction: row-reverse;background-color: slategray; color: white; div {text-align: center; text-orientation: sideways-right;writing-mode: vertical-rl;}",
    "bar-content-container": "background-color: green;",
    "bar-dec-container": "",
    "bar": "background-color: blue;",
    "bar-decoration": "background-color: blue;",
    "desaturate-bar": "padding-top: 0.5rem; padding-bottom: 0.5rem;filter: saturate(40%); transition: all 0.3s ease-in-out;&:hover {filter: saturate(110%);}& div.bar-content-container div.bar {transition-timing-function: ease-in-out;}"
}
  
export const DEFAULT_MARKUP = {
    "bar-label": "<div style='width: fit-content;'>Bar label</div>",
    "bar-content-container": "",
    "bar-dec-container": "",
    "bar": "",
    "bar-decoration": "",
}

const ScaleRadio = ({value, children}:{value: Observable<string>, children: React.ReactNode}) => {
  const currValue = value.use();
  return (
    <RadioGroup onChange={value.set} value={currValue}>
      {children}
    </RadioGroup>
  )
}

const DataValueSlider = ({defaultValue=0, value=0, min=0, max=1, step=1, onChange=undefined}:{defaultValue?: number, value?: number, min?: number, max?: number, step?: number, onChange?: (value:number)=>{}}) => {
  const [sliderValue, setSliderValue] = useState(defaultValue)

  useMemo(() => {
    setSliderValue(value);
  }, [value]);

  const labelStyles = {
    mt: '2',
    ml: '-2.5',
    fontSize: 'sm',
  }

  return (
    <Box pt={6} pb={2}>
      <Slider aria-label='slider-ex-6' defaultValue={defaultValue} value={sliderValue} min={min} max={max} step={step} onChange={(val) => {setSliderValue(val); if(onChange)onChange(val);}}>
        <SliderMark value={1} {...labelStyles}>
          0
        </SliderMark>
        <SliderMark value={50} {...labelStyles}>
          50
        </SliderMark>
        <SliderMark value={99} {...labelStyles}>
          100
        </SliderMark>
        <SliderMark
          value={sliderValue}
          textAlign='center'
          bg='blue.500'
          color='white'
          mt='-10'
          ml='-5'
          w='12'
        >
          {sliderValue}
        </SliderMark>
        <SliderTrack>
          <SliderFilledTrack />
        </SliderTrack>
        <SliderThumb />
      </Slider>
    </Box>
  )
}

const App = () => {
  
  const {plotData, dataMax, theme, orientation, vars} = useContext(PlotContext);
  const renderCount = ++useRef(0).current;
  console.log("Test APP: " + renderCount);

  const index = useObservable(0);
  const nonformatedData = useObservable([[1, 3, 9, 10], [2, 3, 15, 20], [5, 9, 16, 18], [3, 4, 7, 9], [10, 18, 22, 25], [13, 15, 18, 22], [15, 20, 26, 27]]);
  const spacingOption = useObservable("5")
  const spacing = useObservable(parseInt(spacingOption.get()));
  const scaleBehavior = useObservable("1");

  const dataOrderIndex = useObservable(2); // 0: order by first whisker position, 1: by first quartile/bar start position, 2: by third quartile/bar end position, 3: by last whisker position
  const cssObservable = useObservable("padding-top: 0.5rem; padding-bottom: 0.5rem;transition: all 0.3s ease-in-out;");
  index.use();
  cssObservable.use();
  // const cssObservable = useObservable("padding-top: 0.5rem; padding-bottom: 0.5rem;filter: saturate(40%); transition: all 0.3s ease-in-out;&:hover {filter: saturate(110%);}");

  // Setup initial data
  useMemo(() => {
    plotData.set(processData(nonformatedData.peek()));
    dataMax.set(30);
    vars.set({
      "color": ["#9fa2a4","#dfe9ea", "#a5aeb5", "#e6eef1", "#dae6ec", "#c2d6e0", "#c9ced3", "#577590", "brown", "gray", "black"],
      "bar-label": ["Fruit A", "Fruit B", "Fruit C", "Fruit D", "Fruit E", "Fruit F", "Fruit G"],
      "bar-val": ["grape", "watermelon", "pear", "banana", "orange","peach", "strawberry"],
      "last-whisker-pos": [23, 40, 48, 23, 75, 68, 88],
      "clouds":['stratocumulus', '<img src="./watermelon.svg" alt="watermelon" />' , '<img src="./pear.svg" alt="pear" />', '<img src="./banana.svg" alt="banana" />', '<img src="./orange.svg" alt="orange" />', '<img src="./peach.svg" alt="peach" />', '<img src="./strawberry.svg" alt="strawberry" />'],
    });
  }, []);

    // Generate array observable containing the props for each full bar element
    const trackedBoxWhiskersConfig = useObservable(() => {
        const untrackedData = plotData.peek();
        const newBarsDataTemp : {dataIndex: number, varIndex: number, order: number, width: string, decorationWidth: string, elements: FullBarElementType[], id: string, CSS:string}[] = [];
        untrackedData.forEach((value, i) => {
            newBarsDataTemp.push({
                                  id: "full_bar_a_" + i,
                                  dataIndex: i,
                                  varIndex: i,
                                  order: i,
                                  width: "calc(100%/" + (untrackedData.length) + ")",
                                  decorationWidth: "6rem",
                                  elements: opaqueObject(DEFAULT_BOX_WHISKER_TEMPLATE),  // Avoid strange unexplainable circular reference errors for each element of this array on first render
                                  CSS: DEFAULT_CSS["full-bar"],
                                });
        });
        return newBarsDataTemp;
      });

 const orderList = useObservable(() => {
    const length = plotData.get().length;
    return Array.from(Array(length).keys());
  });

  // Calculate and track the maximum data value
  const newDataMax = useComputed(() => {
    let maxValue = 0;
    plotData.forEach((value, i) => {
        const curValue = value.get().reduce((a, b) => a + b, 0);
        maxValue = curValue > maxValue? curValue : maxValue;
    });
    const scaleBehave = scaleBehavior.get();

    const currDataMax = dataMax.peek();
    if (scaleBehave === "1"){
      return maxValue;
    }
    else if (scaleBehave === "2"){
      return maxValue > currDataMax? maxValue : currDataMax;
    }
    else {
      return currDataMax;
    }
  })

  useObserve(newDataMax, () => {dataMax.set(newDataMax.peek());});
  useObserve(spacingOption, () => {spacing.set(parseInt(spacingOption.peek()));});

  useObserve(() => {
    const untrackedBarsData = plotData.peek();
    untrackedBarsData.forEach((value, i) => {
      const dataArray = plotData[i].get();
      const dataArrayTotal = dataArray.reduce((a, b) => a + b, 0);
      const labels = vars["last-whisker-pos"].peek();
      if (labels[i] !== dataArrayTotal) vars["last-whisker-pos"][i].set(dataArrayTotal);
    });
  });

  const changeCSS = (css?: string, add?: string, replace?: [string, string]) => {
    if (css) trackedBoxWhiskersConfig.forEach((value, i) => value.CSS.set(css));
    else if (add) trackedBoxWhiskersConfig.forEach((value, i) => value.CSS.set(value.CSS.get() + add));
    else if (replace) trackedBoxWhiskersConfig.forEach((value, i) => value.CSS.set(value.peek().CSS.replace(replace[0], replace[1])));
  }

  return (
    <ChakraProvider >
          <Div id="bar_plot" >
            <Center marginBottom={"1rem"}>
              <ScaleRadio value={scaleBehavior}>
                <Stack direction='row'>
                  <Radio value='1'>Fit</Radio>
                  <Radio value='2'>Extend</Radio>
                  <Radio value='3'>Fixed</Radio>
                </Stack>
              </ScaleRadio>
            </Center>
            <Center marginBottom={"1rem"}>
              <ScaleRadio value={spacingOption}>
                <Stack direction='row'>
                  <Radio value='5'>5</Radio>
                  <Radio value='10'>10</Radio>
                  <Radio value='25'>25</Radio>
                </Stack>
              </ScaleRadio>
            </Center>
            <Box>
              <DataValueSlider value={dataMax.get()} min={1} max={100} onChange={(value) => dataMax.set(value)} />
            </Box>
            <PlotContext.Provider value={{ plotData: plotData, dataMax: dataMax, orientation: orientation, theme: theme, vars: vars}}>
              <div id='plot' className='plot' style={{position: "relative"}}>
                <Scale
                  id='scale_1'
                  width='100%'
                  height='33px'
                  spacing={spacing}
                  dataMaxLimit={100} 
                  style={{marginTop: "1.5rem", position: "absolute", paddingBottom: "1.2rem"}}
                />
                <BoxWhiskerPlot 
                  id='bw_plot_1'
                  width='100%'
                  height='600px'
                  dataIndexForOrdering={dataOrderIndex}
                  style={{paddingBottom: "0.5rem", paddingTop: "2.5rem", backgroundColor: "white", marginTop: "0.5rem"}}
                  boxWhiskerConfig={trackedBoxWhiskersConfig} 
                />
              </div>
            </PlotContext.Provider>
              <Stack direction='row' spacing={3} align='center' justifyContent="center" margin={5} marginTop={6} marginBottom={1.5}>
                <ButtonGroup gap='1'>
                  <Button colorScheme='blackAlpha' onClick={() => changeBWOrder([0,1,2,4,3,5,6], trackedBoxWhiskersConfig)} >Initial</Button>
                  <Button colorScheme='blackAlpha' onClick={() => changeOrderBasedOnPosition(plotData, trackedBoxWhiskersConfig, 2)}>Rank</Button>
                  <Button colorScheme='blackAlpha' onClick={() => changeCSS(DEFAULT_CSS["desaturate-bar"])}>Desaturate</Button>
                  <Button colorScheme='blackAlpha' onClick={() => changeCSS(DEFAULT_CSS["full-bar"])}>Saturate</Button>
                  {/* <Button colorScheme='blackAlpha' onClick={() => changeCSS( undefined, undefined, ["transition-timing-function: ease-in-out", "transition-timing-function: linear"])}>Linear</Button>
                  <Button colorScheme='blackAlpha' onClick={() => changeCSS(undefined, undefined, ["transition-timing-function: linear", "transition-timing-function: ease-in-out"])}>Ease-in-out</Button> */}
                </ButtonGroup>
              </Stack>
            <Select defaultValue={index.get()} variant='flushed' placeholder='Select fruit' onChange={(event) => index.set(parseInt(event.target.value))}>
              <option value={0}>grape</option>
              <option value={1}>watermelon</option>
              <option value={2}>pear</option>
              <option value={3}>banana</option>
              <option value={4}>orange</option>
              <option value={5}>peach</option>
              <option value={6}>strawberry</option>
            </Select>
            <Box pt={5} pb={5}>
              <DataValueSlider value={plotData[index.get()].get()[0]} min={0} max={100} step={1} onChange={(value) => plotData[index.peek()][0].set(value)}/>
            </Box>
            {`Bar Parameter Selection Index:`}
            <NumberInput defaultValue={0} min={0} max={20} step={1} onChange={(value) => trackedBoxWhiskersConfig[index.peek()].varIndex.set(parseInt(value))}>
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
            {`Bar Order:`}
            <NumberInput defaultValue={trackedBoxWhiskersConfig[index.get()].order.get()} min={0} max={20} onChange={(value) => trackedBoxWhiskersConfig[index.peek()].order.set(parseInt(value))}>
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
              <a href="https://www.freevector.com/flat-colorful-fruits-26803#">FreeVector.com</a>
          </Div>
    </ChakraProvider>
  )
}

export default App;