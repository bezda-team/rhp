/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react'
import styled from '@emotion/styled';
import DOMPurify from "dompurify";
import { Observable } from '@legendapp/state';
import BarContext from './BarContext';
import PlotContext from './PlotContext';
import { useContext, useRef } from 'react';
import { useSelector } from "@legendapp/state/react"
import { enableReactUse } from '@legendapp/state/config/enableReactUse';

enableReactUse();

const Div = styled.div``;

const Bar = ({ item }:{item: Observable<{id: string | undefined, barIndex: number, order: number | undefined, CSS: string | undefined, markup: string | undefined}>}) => {

    const renderCount = ++useRef(0).current;
    console.log("Bar render count: " + renderCount);

    const {index, data} = useContext(BarContext);
    const {dataMax, theme, orientation, vars} = useContext(PlotContext);

    const orientationValue = orientation.use()
    const id = item.id.use()
    const barIndex = item.barIndex.use()
    const CSS = item.CSS.use()

    const trackedData = useSelector(() => {
        const tempDataMax = dataMax.get();
        const tempData = data.get();
        const tempBarIndex = item.barIndex.get();
        const tempOrder = item.order.get();

        return orientation.get()===0? {flex: "0 0 " + (tempData[tempBarIndex] > tempDataMax? tempDataMax: tempData[tempBarIndex])*100/tempDataMax + "%", order: tempOrder, height: "inherit"} : {flex: "0 0 " +  (tempData[tempBarIndex] > tempDataMax? tempDataMax: tempData[tempBarIndex])*100/tempDataMax + "%", order: tempOrder, width: "inherit"};
    })

    const trackedIndex = index.use()

    const sanitizedMarkup = useSelector(() => {
        console.log(trackedIndex)
        const untrackedVars = vars.peek();
        let newMarkup = item.markup.get();
        if (item.markup.get() !== undefined){
            Object.keys(vars).forEach((key) => {
                length = vars[key].length;
                const value = vars.get()[key]
                // const value = vars.get()[key][trackedIndex < length? trackedIndex : trackedIndex%length];
                console.log(key)
                console.log(value)
                // newMarkup = newMarkup?.replace(`{{${key}}}`, value.toString());
            });
        }
        const sanitizedMarkup = DOMPurify.sanitize(newMarkup??"");
        return sanitizedMarkup;
    });

    return (
        <Div 
          id={id? id : "bar-" + trackedIndex + "-" + barIndex} 
          className={"bar" + (orientationValue === 0?" horizontal":" vertical")} 
          dangerouslySetInnerHTML={{__html: sanitizedMarkup }} 
          style={trackedData} 
          css={css`${CSS}`} 
          // onClick={onClickHandler??undefined}
        />
    );
}

export default Bar;