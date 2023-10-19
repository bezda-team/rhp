import styled from '@emotion/styled';
import { ChakraProvider, extendBaseTheme, NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper, Button, ButtonGroup, Stack, Box, Slider, SliderMark, SliderTrack, SliderFilledTrack, SliderThumb, Select, RadioGroup, Radio, Center } from "@chakra-ui/react"
import { NumberInput as NumberIn } from "@chakra-ui/theme/components"
import PlotContext from './components/PlotContext';
import { useContext, useMemo, useRef, useState } from 'react';
import { useObservable, useObserve, useComputed } from '@legendapp/state/react';
import type { FullBarElementType } from './components/types/FullBarElementType';
import { opaqueObject, Observable } from '@legendapp/state';
import BarPlot, { changeOrder, changeOrderBasedOnMagnitude, DEFAULT_BAR_TEMPLATE } from './components/BarPlot';
import Scale from './components/Scale';
import { enableReactUse } from '@legendapp/state/config/enableReactUse';

enableReactUse();

const theme = extendBaseTheme({
  components: {
    NumberIn,
  },
})

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

// custom scale template
const scaleTemplate: FullBarElementType[] = [
  {
    type: "bar-content-container",
    elements: 
      [
        {
          type: "bar-dec-container",
          elements: 
            [
              {
                type: "bar",
                order: 1,
                isDefault: true,
                CSS: "background-color: none; transition: all 0.4s ease-in-out;border-left: 4px dashed #00000011;",
                markup: "<div style='font-weight: bold;font-size: small;height:100%;display: flex; justify-content: flex-start;padding-left: 4px;color: #555555'><span style='margin-top: -4px;'>{{$scaleLabel}}</span></div>",
              },
              {
                type: "decoration",
                order: 20,
                useDataMax: true,
                CSS: "position:absolute;left: calc(100% - 2rem);width: 3rem;height: 100%;color: #555555; div {font-size: small; text-align: left;border-left: 4px solid #555555;}", //We subtract 2rem from `left` to account for padding that impacts where the bars stop
                markup: "<div style='display: flex;font-weight: bold;height: 150%;padding-left: 4px;'><span style='margin-top: -4px;width: 100%;'>{{$dataMaxValue}}</span></div>",
              }
            ],
          CSS: "background: none;align-items: flex-start!important;overflow-x: hidden!important;",
          decorationWidth: "10%",
          order: 1,
        }, 
      ]
    ,
    decorationWidth: "10%",
    order: 1,
    CSS:"padding-right: 2rem;& .bar-dec-cont > .bar:first-of-type {border-left: none;} "  // This element hides content that overflows the bar and so we add 2rem to the right to stop the bars and allow space for decoration to be visible.
  }, 
  {
    type: "decoration",
    order: 0,
    CSS: "height: inherit;border-right: 4px solid #555555;",
    markup: "",
  }
];

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
  const spacingOption = useObservable("5")
  const spacing = useObservable(parseInt(spacingOption.get()));
  const scaleBehavior = useObservable("1");
  // const trackedDataMax = useSelector(dataMax);
  const cssObservable = useObservable("padding-top: 0.5rem; padding-bottom: 0.5rem;transition: all 0.3s ease-in-out;");
  index.use();
  cssObservable.use();
  // const cssObservable = useObservable("padding-top: 0.5rem; padding-bottom: 0.5rem;filter: saturate(40%); transition: all 0.3s ease-in-out;&:hover {filter: saturate(110%);}");

  useMemo(() => {
    plotData.set([[1], [2], [18], [3], [25], [13], [20]]);
    dataMax.set(30);
    vars.set({
      "color": ["pink","#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51", "#ce4257", "#577590", "brown", "gray", "black"],
      "bar-label": ["Fruit A", "Fruit B", "Fruit C", "Fruit D", "Fruit E", "Fruit F", "Fruit G"],
      "bar-val": ["grape", "watermelon", "pear", "banana", "orange","peach", "strawberry"],
      "fruit-svgs":['<img src="/grape.svg" alt="grape" />', '<img src="/watermelon.svg" alt="watermelon" />' , '<img src="/pear.svg" alt="pear" />', '<img src="/banana.svg" alt="banana" />', '<img src="/orange.svg" alt="orange" />', '<img src="/peach.svg" alt="peach" />', '<img src="/strawberry.svg" alt="strawberry" />'],
    });
  }, []);

 const orderList = useObservable(() => {
    const length = plotData.get().length;
    return Array.from(Array(length).keys());
  });

  const trackedBarsData = useObservable(() => {
    const untrackedData = plotData.peek();
    const newBarsDataTemp : {index: number, data: number[], order: number, width: string, decorationWidth: string, elements: FullBarElementType[], id: string, CSS:string}[] = [];
    untrackedData.forEach((value, i) => {
        newBarsDataTemp.push({
                              id: "full_bar_a_" + i,
                              index: i,
                              data: value,
                              order: orderList.get()[i],
                              width: "calc(100%/" + (untrackedData.length) + ")",
                              decorationWidth: "7rem",
                              elements: opaqueObject(DEFAULT_BAR_TEMPLATE),  // Avoid strange unexplainable circular reference errors for each element of this array on first render
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
    data.forEach((value, i) => indexSortedByValue.push(value[2]));

    // Again, the new orders are in the index of indexSortedByValue. They need to be pulled out 
    // and sorted by the index of the bar they go with. So, the order is the index and the value
    // is the bar index to be sorted by.
    const finalOrder = indexSortedByValue.map((value, i) => i).sort((a, b) => indexSortedByValue[a] - indexSortedByValue[b]); 
    return finalOrder;
  });

  // changes order of bars when trackedOrder changes
  useObserve(trackedOrder, () => { changeOrder(trackedOrder.peek(), trackedBarsData);});

  const newDataMax = useComputed(() => {
    let maxValue = 0;
    trackedBarsData.forEach((value, i) => {
      maxValue = Math.max(...value.data.get()) > maxValue? Math.max(...value.data.get()) : maxValue;
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

  const changeCSS = (css?: string, add?: string, replace?: [string, string]) => {
    if (css) trackedBarsData.forEach((value, i) => value.CSS.set(css));
    else if (add) trackedBarsData.forEach((value, i) => value.CSS.set(value.CSS.get() + add));
    else if (replace) trackedBarsData.forEach((value, i) => value.CSS.set(value.peek().CSS.replace(replace[0], replace[1])));
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
                  height='600px'
                  spacing={spacing}
                  dataMaxLimit={100} 
                  scaleTemplate={scaleTemplate}
                  decorationWidth='7rem'
                  style={{marginTop: "1.5rem", position: "absolute", paddingBottom: "1.2rem"}}
                />
                <BarPlot 
                  id='bar_plot_1'
                  width='100%'
                  height='600px'
                  style={{paddingBottom: "0.5rem", paddingTop: "2.5rem", backgroundColor: "white", marginTop: "0.5rem"}}
                  barsConfig={trackedBarsData} 
                />
              </div>
            </PlotContext.Provider>
              <Stack direction='row' spacing={3} align='center' justifyContent="center" margin={5} marginTop={6} marginBottom={1.5}>
                <ButtonGroup gap='1'>
                  <Button colorScheme='blackAlpha' onClick={() => changeOrder([0,1,2,4,3,5,6], trackedBarsData)} >Initial</Button>
                  <Button colorScheme='blackAlpha' onClick={() => changeOrderBasedOnMagnitude(trackedBarsData)}>Rank</Button>
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
              <DataValueSlider value={trackedBarsData[index.get()].data.get()[0]} min={0} max={100} step={1} onChange={(value) => trackedBarsData[index.peek()].data.set([value])}/>
            </Box>
            {`Bar Parameter Selection Index:`}
            <NumberInput defaultValue={0} min={0} max={20} step={1} onChange={(value) => trackedBarsData[index.peek()].index.set(parseInt(value))}>
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
            {`Bar Order:`}
            <NumberInput defaultValue={trackedBarsData[index.get()].order.get()} min={0} max={20} onChange={(value) => trackedBarsData[index.peek()].order.set(parseInt(value))}>
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