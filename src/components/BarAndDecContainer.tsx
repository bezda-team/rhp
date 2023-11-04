/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import type { CSSObject } from '@emotion/react';
import styled from '@emotion/styled';
import Bar from './Bar';
import Decoration from './Decoration';
import type { BarElementType } from './types/BarElementType';
import BarContext from './BarContext';
import PlotContext from './PlotContext';
import { useContext } from 'react';
import type { Observable } from '@legendapp/state';
import { useSelector } from "@legendapp/state/react"
import { For, useObservable } from '@legendapp/state/react';

const Div = styled.div``;

const BarAndDecContainer = ({item} : {item: Observable<{barIndex: number, elements: BarElementType[], decorationWidth?: string, order?: number, CSS: string | CSSObject, onClickHandler?: React.MouseEventHandler<HTMLDivElement>}>}) => {
    // const renderCount = ++useRef(0).current;
    // console.log("BarAndDecContainer render count: " + renderCount);

    const {theme, orientation} = useContext(PlotContext);
    const {data} = useContext(BarContext);

    const barIndex = useSelector(item.barIndex);
    const elements = useSelector<BarElementType[]>(item.elements);
    const decorationWidth = useSelector(item.decorationWidth);
    const order = useSelector(item.order);
    const CSS = useSelector(item.CSS);

    // The following does not result in rerender when data changes.
    // This means that elements added or removed from the array will not result in bars or decorations being added or removed.
    // If this is desired, it is recommended not to track data here because the whole array of components will be reconstructed 
    // every time data changes and not just when data is added or removed. This is undesirable because each component in the array
    // already tracks changes in the piece of data that is relevant to them. A possible solution is to convert the anonymous function
    // to a named function and pass it to `useObservable`. Then track when length of data changes and call this function to generate a 
    // new array which can then be used to update the `trackedData` observable. 
    const trackedData = useObservable(() => {
        const untrackedData = data.peek();
        const newData : {id: string | undefined, barIndex: number, order: number | undefined, CSS: string | CSSObject | undefined, markup: string | undefined}[] = [];
        untrackedData.forEach((value, i) => {
            const element = elements.find(element => element.type === "bar" && (element.isDefault??(element.dataIndex??[0]).includes(i)))
            if (element !== undefined){ 
                newData.push({
                        id: element.id??"bar_" + i,
                        barIndex: i,
                        order: element.order,
                        CSS: element.CSS,
                        markup: element.markup,
                      });
            }
        });
        return newData;
    });
      
    // const trackedData = useObservable(updatedData);

    const decorationsList = useSelector(() => {
        const untrackedElements = elements;
        const newDecorationsList : {decIndex: number, id: string | undefined, order: number | undefined, dataIndex: number | undefined, width: string, CSS: string | CSSObject | undefined, markup: string | undefined, useData: boolean | undefined, useDataMax: boolean | undefined}[] = []; 
        untrackedElements.filter(element => element.type === "decoration").forEach((element, i) => { //typeof should be used instead of element.type
            newDecorationsList.push({
                            id: element.id,
                            decIndex: i,
                            order: element.order,
                            width: decorationWidth,
                            dataIndex: element.dataIndex as number | undefined,
                            useData: element.useData,
                            useDataMax: element.useDataMax,
                            CSS: element.CSS,
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
          css={css(CSS)} 
          // onClick={onClickHandler??undefined}
          >
            <For each={trackedData} item={Bar} optimized/>
            <For each={trackedDecorationsList} item={Decoration} optimized/>
        </Div>
    )
}

export default BarAndDecContainer;