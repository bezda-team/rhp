/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react'
import styled from '@emotion/styled';
import Bar from './Bar';
import BarDecoration from './BarDecoration';
import BarElementType from './types/BarElementType';
import BarContext from './BarContext';
import PlotContext from './PlotContext';
import { useContext, useRef } from 'react';
import { Observable } from '@legendapp/state';
import { useSelector } from "@legendapp/state/react"
import { For, useObservable } from '@legendapp/state/react';
import { enableReactUse } from '@legendapp/state/config/enableReactUse';

enableReactUse();

const Div = styled.div``;

const BarAndDecContainer = ({item} : {item: Observable<{barIndex: number, elements: BarElementType[], decorationWidth?: string, order?: number, CSS: string, onClickHandler?: React.MouseEventHandler<HTMLDivElement>}>}) => {
    const renderCount = ++useRef(0).current;
    console.log("BarAndDecContainer render count: " + renderCount);
    const {dataMax, theme, orientation} = useContext(PlotContext);
    const {data} = useContext(BarContext);

    const barIndex = item.barIndex.use()
    const elements = item.elements.use()
    const decorationWidth = item.decorationWidth.use()
    const order = item.order.use()
    const CSS = item.CSS.use()

    const newData = useSelector(() => {
        const untrackedData = data.peek();
        const newData : {id: string | undefined, barIndex: number, order: number | undefined, CSS: string | undefined, markup: string | undefined}[] = [];
        untrackedData.forEach((value, i) => {
            const element = elements.find(element => element.type === "bar" && (element.dataIndex??0) === i)
            if (element !== undefined){ 
                newData.push({
                        id: element.id,
                        barIndex: i,
                        order: element.order,
                        CSS: element.css,
                        markup: element.markup,
                      });
            } else{
                newData.push({
                        id: "bar_" + i,
                        barIndex: i,
                        order: 1,
                        CSS: "background-color: blue;",
                        markup: "",
                  });
            }
        });
        return newData;
    });

      const trackedData = useObservable(newData);

      const decorationsList = useSelector(() => {
          const untrackedElements = elements;
          const newDecorationsList : {decIndex: number, id: string | undefined, order: number | undefined,width: string, CSS: string | undefined, markup: string | undefined}[] = []; 
          untrackedElements.filter(element => element.type === "decoration").forEach((element, i) => { 
              newDecorationsList.push({
                                id: element.id,
                                decIndex: i,
                                order: element.order,
                                width: decorationWidth,
                                CSS: element.css,
                                markup: element.markup,
                            });
            
        });
        return newDecorationsList;
    });

    const trackedDecorationsList = useObservable(decorationsList);

    return (
        <Div 
          key={"bar_dec_cont-" + barIndex}
          id={"bar_dec_cont-" + barIndex} 
          className="bar-dec-cont" 
          style={orientation.get()===0? {display: "flex", flexDirection: "row", width: "100%", order: order, height: "inherit", alignItems: "center", overflowX : "visible"} : {display: "flex", flexDirection: "column-reverse", height: "100%", order: order, width: "inherit", alignItems: "center", overflowY : "visible"}} 
          css={css`${CSS}`} 
          // onClick={onClickHandler??undefined}
          >
            <For each={trackedData} item={Bar} />
            <For each={trackedDecorationsList} item={BarDecoration} />
        </Div>
    )
}

export default BarAndDecContainer;