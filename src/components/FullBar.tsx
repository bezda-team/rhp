/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react'
import styled from '@emotion/styled';
import DOMPurify from "dompurify";
// import BarDecoration from './BarDecoration';
// import BarContentContainer from './BarContentContainer';
import FullBarElementType from './types/FullBarElementType';
import BarElementType from './types/BarElementType';
import BarContext from './BarContext';
import BarAndDecContainer from './BarAndDecContainer';
import { useContext, useEffect, useRef } from 'react';
import BarContentContainerElementType from './types/BarContentContainerElementType';
import { enableReactUse } from '@legendapp/state/config/enableReactUse';
import { For, useObservable, useSelector } from '@legendapp/state/react';
import { Observable } from '@legendapp/state';

enableReactUse();

const Div = styled.div``;

const BarDecoration = ({item} : {item: Observable<{decIndex: number, id: string | undefined, order: number | undefined, width: string, CSS: string | undefined, markup: string | undefined}>}) => {
    const renderCount = ++useRef(0).current;
    console.log("BarDecoration render count: " + renderCount);
    const {index, theme, orientation, vars} = useContext(BarContext); 

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

//============================================================= BAR AND DECORATION CONTAINER =================================================================

const BarContentContainer = ({item}:{item: Observable<{id: string, elements: BarContentContainerElementType[], order?: number, decorationWidth?: string, CSS?: string, onClickHandler?: React.MouseEventHandler<HTMLDivElement>}>}) => {
    const {orientation} = useContext(BarContext);

    const orientationValue = orientation.use()
    const trackedOrder = item.order.use();
    const trackedCSS = item.CSS.use();
    const elements = item.elements.use();
    const decorationWidth = item.decorationWidth.use();
    const order = item.order.use();

    const {newBarAndDecs, newContDecs} = useSelector(() => {
        const untrackedElements = item.elements.peek();
        const newBarAndDecs : {id: string, barIndex: number, elements: BarElementType[], decorationWidth?: string, order?: number, CSS: string, index?: number, onClickHandler?: React.MouseEventHandler<HTMLDivElement>}[] = [];
        const newContDecs : {decIndex: number, id: string | undefined, order: number | undefined, width: string, CSS: string | undefined, markup: string | undefined}[] = []; 
        untrackedElements.forEach((element, i) => {
            if (element.type === "bar-dec-container"){
              newBarAndDecs.push({
                                id: "bar-dec-" + i,
                                barIndex: i,
                                elements: element.elements, 
                                CSS: element.CSS??"", 
                                decorationWidth: element.decorationWidth??"10%",
                                order: i, 
                              });
            } else {
              newContDecs.push({
                                id: element.id,
                                decIndex: i, 
                                order: element.order,
                                width: decorationWidth,
                                CSS: element.css, 
                                markup: element.markup
                              });
            }
          });
        return {newBarAndDecs, newContDecs};
    });

    const trackedBarAndDecsList = useObservable(newBarAndDecs);
    const trackedContDecsList = useObservable(newContDecs);


    useEffect(() => {
        console.log("---->BarContentContainer mounted");
        return () => {
            console.log("---->BarContentContainer unmounted");
        }
    }, []);

    return (
        <Div 
          className="bar-content-container" 
          style={orientation.get()===0? {display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", overflow: "hidden", order: order??1} : {display: "flex", flexDirection: "row", height: "100%", width: "100%", overflow: "hidden", order: order??1}} 
          css={css`${trackedCSS}`} 
          // onClick={onClickHandler??undefined}
        >
            <For each={trackedBarAndDecsList} item={BarAndDecContainer} />
            <For each={trackedContDecsList} item={BarDecoration} />
        </Div>
    );
  }



//============================================================= FULL BAR =================================================================

const FullBar = ({index, data, order, width, decorationWidth, elements, id=undefined, CSS="", onClickHandler=undefined}: {index: number, data: number[], order: number, width: string, decorationWidth: string, elements: FullBarElementType[], id?: string, CSS?: string, onClickHandler?:  React.MouseEventHandler<HTMLDivElement> }) => {
    const {dataMax, orientation, theme, vars} = useContext(BarContext);

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
        
            <Div 
                key={"full_bar_" + index}
                id={id??"full_bar_" + index}
                className={"full-bar" + (orientation.get()===0?" horizontal":" vertical")}
                style={orientation.get()===0? {display: "flex", flexDirection: "row-reverse", alignItems: "center", width: "100%", height: width, overflow: "hidden", order: order} : {display: "flex", flexDirection: "column", alignItems: "center", height: "100%", width: width, overflow: "hidden", order: order}} 
                css={css`${CSS}`} 
                // onClick={onClickHandler??undefined}
            >
                <For each={trackedContContainersList} item={BarContentContainer} />
                <For each={trackedFullBarDecsList} item={BarDecoration} />
            </Div>
    );
  }

export default FullBar;