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
    const {index, data} = useContext(BarContext);
    const {dataMax, theme, orientation, vars} = useContext(PlotContext);

    // const renderCount = ++useRef(0).current;
    // console.log("Bar render count: " + renderCount);

    const orientationValue = orientation.use()
    const id = item.id.use()
    const barIndex = item.barIndex.use()
    const CSS = item.CSS.use()

    const trackedData = useSelector(() => {
      const tempDataMax = dataMax.get();
      const tempBarIndex = item.barIndex.get();
      const tempOrder = item.order.get();
      const tempData = data[tempBarIndex].get();    // Only changes in the data array ELEMENT that is used here causes rerender 

      return orientation.get()===0? {flex: "0 0 " + (tempData > tempDataMax? tempDataMax: tempData)*100/tempDataMax + "%", order: tempOrder, height: "inherit"} : {flex: "0 0 " +  (tempData > tempDataMax? tempDataMax: tempData)*100/tempDataMax + "%", order: tempOrder, width: "inherit"};
    })

    const trackedIndex = index.use()

    const sanitizedMarkup = useSelector(() => {
        // console.log(trackedIndex)
        let newMarkup = item.markup.get();
        if (item.markup.get() !== undefined){
            Object.keys(vars.peek()).forEach((key) => {
                if (newMarkup?.includes(`{{${key}}}`)){               // This makes sure that only changes in the `vars` properties that are used in the markup cause rerender.
                    const length = vars[key].length;
                    const value = vars[key].get()[trackedIndex < length? trackedIndex : trackedIndex%length];
                    if (Array.isArray(value)){
                        newMarkup = newMarkup?.replaceAll(`{{${key}}}`, value[barIndex]?.toString());
                    } else {
                        newMarkup = newMarkup?.replaceAll(`{{${key}}}`, value?.toString());
                    }
                }
            });
            if(newMarkup??"".includes("{{$dataValue}}")) newMarkup = newMarkup?.replaceAll(`{{$dataValue}}`, data[barIndex].get()?.toString());
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