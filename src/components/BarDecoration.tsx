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

const BarDecoration = ({item} : {item: Observable<{decIndex: number, id: string | undefined, order: number | undefined, width: string, CSS: string | undefined, markup: string | undefined}>}) => {
    const renderCount = ++useRef(0).current;
    console.log("BarDecoration render count: " + renderCount);
    const {index} = useContext(BarContext); 
    const {theme, orientation, vars} = useContext(PlotContext);

    const trackedIndex = index.use()
    const CSS = item.CSS.use()
    const decIndex = item.decIndex.use()

    const trackedStyle = useSelector(() => {
        const tempOrder = item.order.get();
        const tempWidth = item.width.get();

        return orientation.get()===0? (tempWidth?{order: tempOrder, flex: "0 0 " + tempWidth}:{order: tempOrder}):(tempWidth?{order: tempOrder, flex: "0 0 " + tempWidth}:{order: tempOrder})
    })

    const sanitizedMarkup = useSelector(() => {
        console.log(trackedIndex)
        let newMarkup = item.markup.get();
        if (item.markup.get() !== undefined){
            Object.keys(vars).forEach((key) => {
                length = vars[key].length;
                const value = vars[key][trackedIndex < length? trackedIndex : trackedIndex%length];
                newMarkup = newMarkup?.replace(`{{${key}}}`, value.toString());
            });
        }
        const sanitizedMarkup = DOMPurify.sanitize(newMarkup??"");
        return sanitizedMarkup;
    });

    return (
        <Div 
            id={"bar-dec-" + trackedIndex + "-" + decIndex} 
            className={"bar-decoration decoration " + (orientation.get()===0?"horizontal":"vertical")}  
            dangerouslySetInnerHTML={{__html: sanitizedMarkup }} 
            style={trackedStyle} 
            css={css`${CSS}`} 
            // onClick={onClickHandler??undefined}
        />
    );
}

export default BarDecoration;