/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react'
import styled from '@emotion/styled';
import BarDecoration from './BarDecoration';
import BarContentContainer from './BarContentContainer';
import type { FullBarElementType as PlotSegmentElementType } from './types/FullBarElementType';
import BarContext from './BarContext';
import PlotContext from './PlotContext';
import { useContext, useEffect, useRef } from 'react';
import type { BarContentContainerElementType } from './types/BarContentContainerElementType';
import { enableReactUse } from '@legendapp/state/config/enableReactUse';
import { For, useObservable, useSelector } from '@legendapp/state/react';
import { Observable } from '@legendapp/state';
// import { Observable } from '@legendapp/state';

enableReactUse();    // Adds use function to observables. Ex: observable.use();

const Div = styled.div``;

//============================================================= FULL BAR =================================================================

const PlotSegment = ({item} : {item: Observable<{dataIndex: number, varIndex: number, order: number, width: string, decorationWidth: string, elements: PlotSegmentElementType[], id: string, CSS:string}>}) => {
    // const renderCount = ++useRef(0).current;
    // console.log("PlotSegment render count: " + renderCount);
    
    const {orientation, plotData} = useContext(PlotContext);

    const trackCSS = item.CSS.use();
    const trackOrientation = orientation.use();
    const trackWidth = item.width.use();
    const trackOrder = item.order.use();
    const trackId = item.id.use();


    const {newContContainers, newPlotSegmentDecs} = useSelector(() => {
        const untrackedElements = item.elements.peek();
        const newContContainers : {id: string, elements: BarContentContainerElementType[], order?: number, decorationWidth?: string, CSS?: string, onClickHandler?: React.MouseEventHandler<HTMLDivElement> }[] = [];
        const newPlotSegmentDecs : {decIndex: number, id: string | undefined, order: number | undefined, width: string, CSS: string | undefined, markup: string | undefined}[] = []; 
        untrackedElements.forEach((element, i) => {
            if (element.type === "bar-content-container"){
                newContContainers.push({
                                id: "bar_cont_cont_" + i,
                                elements: element.elements, 
                                CSS: element.CSS??"", 
                                decorationWidth: element.decorationWidth??"10%",
                                order: i, 
                              });
            } else {
                newPlotSegmentDecs.push({
                                id: element.id,
                                decIndex: i, 
                                order: element.order,
                                width: item.decorationWidth.peek(),
                                CSS: element.CSS, 
                                markup: element.markup
                              });
            }
          });
        return {newContContainers, newPlotSegmentDecs};
    });

    const trackedContContainersList = useObservable(newContContainers);
    const trackedPlotSegmentDecsList = useObservable(newPlotSegmentDecs);

    return (
        <BarContext.Provider value={{index: item.varIndex, order: item.order, data: plotData[item.dataIndex.get()], width: item.width, decorationWidth: item.decorationWidth}}>
            <Div 
                key={"full_bar_" + item.dataIndex.peek()}
                id={trackId??"full_bar_" + item.dataIndex.peek()}
                className={"full-bar" + (orientation.get()===0?" horizontal":" vertical")}
                style={orientation.get()===0? {display: "flex", flexDirection: "row-reverse", alignItems: "center", width: "100%", height: trackWidth, overflow: "hidden", order: trackOrder, position: "absolute", left: "0", top: "calc(" + trackWidth + "*" + trackOrder + ")"} : {display: "flex", flexDirection: "column", alignItems: "center", height: "100%", width: trackWidth, overflow: "hidden", order: trackOrder, position: "absolute", bottom: "0", left: "calc(" + trackWidth + "*" + trackOrder + ")"}} 
                css={css`${trackCSS}`} // Consider moving the props in the above style starting from 'position' to this css prop to allow for overriding
                // onClick={onClickHandler??undefined}
            >
                <For each={trackedContContainersList} item={BarContentContainer} optimized/>
                <For each={trackedPlotSegmentDecsList} item={BarDecoration} optimized/>
            </Div>
        </BarContext.Provider>
    );
  }

export default PlotSegment;