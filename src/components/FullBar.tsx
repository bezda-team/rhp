/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react'
import styled from '@emotion/styled';
import BarDecoration from './BarDecoration';
import BarContentContainer from './BarContentContainer';
import FullBarElementType from './types/FullBarElementType';
import BarContext from './BarContext';
import PlotContext from './PlotContext';
import { useContext, useEffect, useRef } from 'react';
import BarContentContainerElementType from './types/BarContentContainerElementType';
import { enableReactUse } from '@legendapp/state/config/enableReactUse';
import { For, useObservable, useSelector, useComputed, observer } from '@legendapp/state/react';
import { Observable } from '@legendapp/state';
// import { Observable } from '@legendapp/state';

enableReactUse();

const Div = styled.div``;

//============================================================= FULL BAR =================================================================

const FullBar = ({index, data, order, width, decorationWidth, elements, id=undefined, CSS="", onClickHandler=undefined}: {index: Observable<number>, data: Observable<number[]>, order: number, width: string, decorationWidth: string, elements: FullBarElementType[], id?: string, CSS?: string, onClickHandler?:  React.MouseEventHandler<HTMLDivElement> }) => {
    const {plotData, dataMax, orientation, theme, vars} = useContext(PlotContext);

    const renderCount = ++useRef(0).current;
    console.log("FullBar render count: " + renderCount);
    
    const observedIndex = useObservable(index);
    const observedOrder = useObservable(order);
    // const observedData = plotData[trackedIndex];
    const observedWidth = useObservable(width);
    const observedDecorationWidth = useObservable(decorationWidth);

    useEffect(() => {
        console.log("---->Fullbar " + index + " mounted");
        return () => {
            console.log("---->Fullbar " + index + " unmounted");
        }
    }, []);


    const {newContContainers, newFullBarDecs} = useSelector(() => {
        const untrackedElements = elements;
        const newContContainers : {id: string, elements: BarContentContainerElementType[], order?: number, decorationWidth?: string, CSS?: string, onClickHandler?: React.MouseEventHandler<HTMLDivElement> }[] = [];
        const newFullBarDecs : {decIndex: number, id: string | undefined, order: number | undefined, width: string, CSS: string | undefined, markup: string | undefined}[] = []; 
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
                newFullBarDecs.push({
                                id: element.id,
                                decIndex: i, 
                                order: element.order,
                                width: decorationWidth,
                                CSS: element.css, 
                                markup: element.markup
                              });
            }
          });
        return {newContContainers, newFullBarDecs};
    });

    const trackedContContainersList = useObservable(newContContainers);
    const trackedFullBarDecsList = useObservable(newFullBarDecs);

    return (
        <BarContext.Provider value={{index: index, order: observedOrder, data: data, width: observedWidth, decorationWidth: observedDecorationWidth}}>
            <Div 
                key={"full_bar_" + index.get()}
                id={id??"full_bar_" + index.get()}
                className={"full-bar" + (orientation.get()===0?" horizontal":" vertical")}
                style={orientation.get()===0? {display: "flex", flexDirection: "row-reverse", alignItems: "center", width: "100%", height: width, overflow: "hidden", order: order} : {display: "flex", flexDirection: "column", alignItems: "center", height: "100%", width: width, overflow: "hidden", order: order}} 
                css={css`${CSS}`} 
                // onClick={onClickHandler??undefined}
            >
                <For each={trackedContContainersList} item={BarContentContainer} />
                <For each={trackedFullBarDecsList} item={BarDecoration} />
            </Div>
        </BarContext.Provider>
    );
  }

export default FullBar;