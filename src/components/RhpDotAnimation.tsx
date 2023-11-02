import PlotContext from './PlotContext';
import { useContext, useMemo, useRef, useEffect } from 'react';
import type { FullBarElementType } from './types/FullBarElementType';
import SegmentPlot from './SegmentPlot';

export const DEFAULT_CSS = {
    "bar-plot": "",
    "full-bar":"overflow: visible!important;transition: all 0.3s ease-in-out;& div.bar-content-container div.bar {transition-timing-function: ease-in-out;}",
    "bar-label": "display: flex; flex-direction: row-reverse;background-color: slategray; color: white; div {text-align: center; text-orientation: sideways-right;writing-mode: vertical-rl;}",
    "bar-content-container": "background-color: green;",
    "bar-dec-container": "",
    "bar": "background-color: blue;",
    "bar-decoration": "background-color: blue;",
    "desaturate-bar": "overflow: visible!important;filter: saturate(40%); transition: all 0.3s ease-in-out;&:hover {filter: saturate(110%);}& div.bar-content-container div.bar {transition-timing-function: ease-in-out;}"
}
  
export const DEFAULT_MARKUP = {
    "bar-label": "<div style='width: fit-content;'>Bar label</div>",
    "bar-content-container": "",
    "bar-dec-container": "",
    "bar": "",
    "bar-decoration": "",
}

// custom bar template
const barTemplate: FullBarElementType[] = [
{
    type: "bar-content-container",
    elements: [{
                  type: "bar-dec-container",
                  elements: [
                              {
                                type: "bar",
                                order: 0,
                                CSS: "box-sizing: border-box;border-radius: 26px;overflow: hidden;height: auto; transition-property: flex, border;transition-duration: 1s;transition-timing-function: ease-in-out;& div {display:flex;align-items: center;}& img {flex-grow: 1; max-width: 300px;min-width: 50px;}",
                                markup: "<div style='background-color: {{second-color}};height:100%;'></div>",
                              },
                              {
                                type: "bar",
                                dataIndex: [1],
                                order: 4,
                                CSS: "box-sizing: border-box;border-radius: 26px;overflow: hidden;height: auto; transition-property: flex, border;transition-duration: 1s;transition-timing-function: ease-in-out;& div {display:flex;align-items: center;}& img {flex-grow: 1; max-width: 300px;min-width: 50px;}",
                                markup: "<div style='background-color: {{second-color}};height:100%;'></div>",
                              },
                              {
                                type: "decoration",
                                order: 1,
                                CSS: "border-radius: 50%;color: white;height: 100%;",
                                markup: "<div style='background-color: {{color}};height: 100%;'></div>",
                              },
                              {
                                type: "decoration",
                                order: 1,
                                CSS: "border-radius: 50%;color: white;height: 100%;",
                                markup: "<div style='background-color: {{color}};height: 100%;'></div>",
                              },
                              {
                                type: "decoration",
                                order: 1,
                                CSS: "border-radius: 50%;color: white;height: 100%;",
                                markup: "<div style='background-color: {{color}};height: 100%;'></div>",
                              },
                              {
                                type: "decoration",
                                order: 1,
                                CSS: "border-radius: 50%;color: white;height: 100%;",
                                markup: "<div style='background-color: {{color}};height: 100%;'></div>",
                              },
                              {
                                type: "decoration",
                                order: 1,
                                CSS: "border-radius: 50%;color: white;height: 100%;",
                                markup: "<div style='background-color: {{color}};height: 100%;'></div>",
                              },
                              {
                                type: "decoration",
                                order: 1,
                                CSS: "border-radius: 50%;border-radius: 50%;color: white;height: 100%;",
                                markup: "<div style='background-color: {{color}};height: 100%;'></div>",
                              },
                              {
                                type: "decoration",
                                order: 1,
                                CSS: "border-radius: 50%;color: white;height: 100%;",
                                markup: "<div style='background-color: {{color}};height: 100%;'></div>",
                              },
                              {
                                type: "decoration",
                                order: 1,
                                CSS: "border-radius: 50%;color: white;height: 100%;",
                                markup: "<div style='background-color: {{color}};height: 100%;'></div>",
                              },
                              {
                                type: "decoration",
                                order: 1,
                                CSS: "border-radius: 50%;color: white;height: 100%;",
                                markup: "<div style='background-color: {{color}};height: 100%;'></div>",
                              },
                              {
                                type: "decoration",
                                order: 1,
                                CSS: "border-radius: 50%;color: white;height: 100%;",
                                markup: "<div style='background-color: {{color}};height: 100%;'></div>",
                              },
                              {
                                type: "decoration",
                                order: 1,
                                CSS: "border-radius: 50%;color: white;height: 100%;",
                                markup: "<div style='background-color: {{color}};height: 100%;'></div>",
                              },
                              {
                                type: "decoration",
                                order: 2,
                                CSS: "border-radius: 50%;color: white;height: 100%;",
                                markup: "<div style='background-color: {{color}};height: 100%;'></div>",
                              },
                              {
                                type: "decoration",
                                order: 2,
                                CSS: "border-radius: 50%;color: white;height: 100%;",
                                markup: "<div style='background-color: {{color}};height: 100%;'></div>",
                              },
                              {
                                type: "decoration",
                                order: 2,
                                CSS: "border-radius: 50%;color: white;height: 100%;",
                                markup: "<div style='background-color: {{color}};height: 100%;'></div>",
                              },
                              {
                                type: "decoration",
                                order: 2,
                                CSS: "border-radius: 50%;color: white;height: 100%;",
                                markup: "<div style='background-color: {{color}};height: 100%;'></div>",
                              },
                              {
                                type: "decoration",
                                order: 2,
                                CSS: "border-radius: 50%;color: white;height: 100%;",
                                markup: "<div style='background-color: {{color}};height: 100%;'></div>",
                              },
                              {
                                type: "decoration",
                                order: 2,
                                CSS: "border-radius: 50%;color: white;height: 100%;",
                                markup: "<div style='background-color: {{color}};height: 100%;'></div>",
                              },
                              {
                                type: "decoration",
                                order: 2,
                                CSS: "border-radius: 50%;color: white;height: 100%;",
                                markup: "<div style='background-color: {{color}};height: 100%;'></div>",
                              },
                              {
                                type: "decoration",
                                order: 2,
                                CSS: "border-radius: 50%;color: white;height: 100%;",
                                markup: "<div style='background-color: {{color}};height: 100%;'></div>",
                              },
                              {
                                type: "decoration",
                                order: 2,
                                CSS: "border-radius: 50%;color: white;height: 100%;",
                                markup: "<div style='background-color: {{color}};height: 100%;'></div>",
                              },
                              {
                                type: "decoration",
                                order: 3,
                                CSS: "border-radius: 50%;color: white;height: 100%;",
                                markup: "<div style='background-color: {{color}};height: 100%;'></div>",
                              },
                              {
                                type: "decoration",
                                order: 3,
                                CSS: "border-radius: 50%;color: white;height: 100%;",
                                markup: "<div style='background-color: {{color}};height: 100%;'></div>",
                              },
                              {
                                type: "decoration",
                                order: 3,
                                CSS: "border-radius: 50%;color: white;height: 100%;",
                                markup: "<div style='background-color: {{color}};height: 100%;'></div>",
                              },
                              {
                                type: "decoration",
                                order: 3,
                                CSS: "border-radius: 50%;color: white;height: 100%;",
                                markup: "<div style='background-color: {{color}};height: 100%;'></div>",
                              },
                              {
                                type: "decoration",
                                order: 3,
                                CSS: "border-radius: 50%;color: white;height: 100%;",
                                markup: "<div style='background-color: {{color}};height: 100%;'></div>",
                              },
                              {
                                type: "decoration",
                                order: 3,
                                CSS: "border-radius: 50%;color: white;height: 100%;",
                                markup: "<div style='background-color: {{color}};height: 100%;'></div>",
                              },
                              {
                                type: "decoration",
                                order: 3,
                                CSS: "border-radius: 50%;border-radius: 50%;color: white;height: 100%;",
                                markup: "<div style='background-color: {{color}};height: 100%;'></div>",
                              },
                              {
                                type: "decoration",
                                order: 3,
                                CSS: "border-radius: 50%;border-radius: 50%;color: white;height: 100%;",
                                markup: "<div style='background-color: {{color}};height: 100%;'></div>",
                              },
                              {
                                type: "decoration",
                                order: 3,
                                CSS: "border-radius: 50%;color: white;height: 100%;",
                                markup: "<div style='background-color: {{color}};height: 100%;'></div>",
                              },
                              {
                                type: "decoration",
                                order: 3,
                                CSS: "border-radius: 50%;color: white;height: 100%;",
                                markup: "<div style='background-color: {{color}};height: 100%;'></div>",
                              },
                            ],
                  CSS: "padding-top: 4px;padding-bottom: 4px;gap: 8px;background: none;& .decoration:hover>div {box-shadow: rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px; filter: brightness(1.2)} & .decoration>div {border-radius: 50%; box-shadow: rgba(0, 0, 0, 0.16) 0px 3px 6px, rgba(0, 0, 0, 0.23) 0px 3px 6px;",
                  decorationWidth: "52px",
                  order: 1,
                }, 
                // {
                //   type: "decoration",
                //   order: 0,
                //   css: "background-color: slategray; color: white; div {text-align: left;}",
                //   markup: "<div style='width: fit-content;'>My text decoration</div>",
                //   onClickHandler: () => console.log("decoration clicked")
                // },
              ],
    decorationWidth: "10%",
    order: 1,
    CSS:"overflow: visible!important;",
  },
  {
    type: "decoration",
    order: 0,
    CSS: "",
    markup: "",
  }
  ];

  const App = ({className, style, widthPreset=0, scale=1, animationDelay=5000}:{className?: string, style?: React.CSSProperties, widthPreset?: number, scale?: number, animationDelay?: number}) => {
    // const renderCount = ++useRef(0).current;
  // console.log("Test APP: " + renderCount);
  
  const {plotData, dataMax, theme, orientation, vars} = useContext(PlotContext);
  const intervalRef = useRef<NodeJS.Timeout>();

  useMemo(() => {
    plotData.set([[4, 9], [4, 9], [4, 9], [4, 9], [4, 9], [4, 9], [4, 9], [4, 9], [4, 9]]);
    dataMax.set(40);
    vars.set({
      "color": [
                "#3D405B",
                [
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#f2cc8f", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B"
                ],
                [
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#f2cc8f", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B"
                ], 
                [
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#f2cc8f", 
                  "#f2cc8f", 
                  "#3D405B", 
                  "#f2cc8f", 
                  "#f2cc8f", 
                  "#3D405B", 
                  "#3D405B", 
                  "#f2cc8f", 
                  "#f2cc8f", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B"
                ],  
                [
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#f2cc8f", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#f2cc8f", 
                  "#3D405B", 
                  "#f2cc8f", 
                  "#3D405B", 
                  "#f2cc8f", 
                  "#3D405B", 
                  "#f2cc8f", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B"
                ],
                [
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#f2cc8f", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#f2cc8f", 
                  "#3D405B", 
                  "#f2cc8f", 
                  "#3D405B", 
                  "#f2cc8f", 
                  "#f2cc8f", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B"
                ], 
                [
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#f2cc8f", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B"
                ], 
                [
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#f2cc8f", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B", 
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B",
                  "#3D405B"
                ], 
                  "#3D405B", 
              ],
      "z-index": ["10"],
      "second-color": ["#444444"],
      });
  }, []);

  useEffect(() => {
    newInterval();
    return () => clearInterval(intervalRef.current);
  }, []);

  const stopAnimation = () => {
    clearInterval(intervalRef.current);
    plotData[1][0].set(4);
    plotData[2][0].set(4);
    plotData[3][0].set(4);
    plotData[4][0].set(4);
    plotData[5][0].set(4);
    plotData[6][0].set(4);
    plotData[7][0].set(4);
  }

  const newInterval = () => {
    const interval = setInterval(() => {
      const currOne = plotData.peek();
      if (JSON.stringify(currOne) !== JSON.stringify([[4, 9], [4, 9], [4, 9], [4, 9], [4, 9], [4, 9], [4, 9], [4, 9], [4, 9]])) {
        plotData[1][0].set(4);
        plotData[2][0].set(4);
        plotData[3][0].set(4);
        plotData[4][0].set(4);
        plotData[5][0].set(4);
        plotData[6][0].set(4);
        plotData[7][0].set(4);
      }
      else {
        plotData[1][0].set(Math.floor(Math.random() * 10));
        plotData[2][0].set(Math.floor(Math.random() * 10));
        plotData[3][0].set(Math.floor(Math.random() * 10));
        plotData[4][0].set(Math.floor(Math.random() * 10));
        plotData[5][0].set(Math.floor(Math.random() * 10));
        plotData[6][0].set(Math.floor(Math.random() * 10));
        plotData[7][0].set(Math.floor(Math.random() * 10));
      }
    }, animationDelay);
    intervalRef.current = interval;
  }

  return (
    <PlotContext.Provider value={{ plotData: plotData, dataMax: dataMax, orientation: orientation, theme: theme, vars: vars}}>
      <div id='plot' className={'plot ' + className} style={{margin: "auto", width: (660 + widthPreset*120) +  "px", minWidth: "660px", maxWidth: "1260px", display: "grid", justifyContent: "center", overflow: "hidden", transform: "scale("+ scale + ")", ...style}} onMouseEnter={stopAnimation} onMouseLeave={newInterval}> 
        <SegmentPlot
            id='bar_plot_1'
            width='2442px'
            height='540px'
            decorationWidth="2.9rem"
            style={{ margin: "auto", paddingBottom: "4px"}}
            segmentTemplate={barTemplate}
        />
        </div>
    </PlotContext.Provider>     
  )
}

export default App;