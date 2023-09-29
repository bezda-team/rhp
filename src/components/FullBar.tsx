/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react'
import styled from '@emotion/styled';
import BarDecoration from './BarDecoration';
import BarContentContainer from './BarContentContainer';
import FullBarElementType from './types/FullBarElementType';
import BarContext from './BarContext';
import { useEffect } from 'react';
import { useObservable } from "@legendapp/state/react"
import PlotState from '../PlotStore';

const Div = styled.div``;

const FullBar = ({index, data, order, width, decorationWidth, elements, id=undefined, CSS="", onClickHandler=undefined}: {index: number, data: number[], order: number, width: string, decorationWidth: string, elements: FullBarElementType[], id?: string, CSS?: string, onClickHandler?:  React.MouseEventHandler<HTMLDivElement> }) => {
    const {dataMax, orientation, theme, vars} = useObservable(PlotState);

    const observedIndex = useObservable(index);
    const observedData = useObservable(data);
    const observedWidth = useObservable(width);
    const observedDecorationWidth = useObservable(decorationWidth);

    useEffect(() => {
        console.log("---->Fullbar " + index + " mounted");
        return () => {
            console.log("---->Fullbar " + index + " unmounted");
        }
    }, []);

    return (
        <BarContext.Provider value={{index: observedIndex, data: observedData, dataMax: dataMax, orientation: orientation, theme: theme, vars: vars, width: observedWidth, decorationWidth: observedDecorationWidth}}>
            <Div 
                key={"full_bar_" + index}
                id={id??"full_bar_" + index}
                className={"full-bar" + (orientation.get()===0?" horizontal":" vertical")}
                style={orientation.get()===0? {display: "flex", flexDirection: "row-reverse", alignItems: "center", width: "100%", height: width, overflow: "hidden", order: order} : {display: "flex", flexDirection: "column", alignItems: "center", height: "100%", width: width, overflow: "hidden", order: order}} 
                css={css`${CSS}`} 
                // onClick={onClickHandler??undefined}
            >
                {elements.map((element, i) => {
                    if (element.type === "bar-content-container"){
                    return <BarContentContainer 
                                key={"full_bar_" + i}
                                elements={element.elements} 
                                decorationWidth={element.decorationWidth} 
                                CSS={element.CSS??""}
                                // onClickHandler={element.onClickHandler??undefined} 
                            />
                    } else {
                    return <BarDecoration 
                                key={"full_decoration_" + i}
                                id={element.id}
                                decIndex={i} 
                                order={element.order}
                                width={decorationWidth}
                                CSS={element.css} 
                                markup={element.markup} 
                                // onClickHandler={element.onClickHandler??undefined} 
                            />
                    }
                })
                }
            </Div>
        </BarContext.Provider>
    );
  }

export default FullBar;