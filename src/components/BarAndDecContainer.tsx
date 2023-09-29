/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react'
import styled from '@emotion/styled';
import DOMPurify from "dompurify";
import { Observable, observable } from '@legendapp/state';
// import Bar from './Bar';
// import BarDecoration from './BarDecoration';
import BarElementType from './types/BarElementType';
import BarContext from './BarContext';
import { useContext } from 'react';
import { observer, useSelector } from "@legendapp/state/react"
import { For, useObservable, useObserve } from '@legendapp/state/react';
import { enableReactUse } from '@legendapp/state/config/enableReactUse';

enableReactUse();

const Div = styled.div``;

const Bar = ({ item }:{item: Observable<{id: string | undefined, barIndex: number, order: number | undefined, CSS: string | undefined, markup: string | undefined}>}) => {

    const {index, data, dataMax, theme, orientation, vars} = useContext(BarContext);

    const orientationValue = orientation.use()
    const id = item.id.use()
    const barIndex = item.barIndex.use()
    const CSS = item.CSS.use()

    const trackedData = useSelector(() => {
       return orientation.get()===0? {width: data.get()[item.barIndex.get()]*100/dataMax.get() + "%", order: item.order.get(), height: "inherit"} : {height: data.get()[item.barIndex.get()]*100/dataMax.get() + "%", order: item.order.get(), width: "inherit"};
    })

    const sanitizedMarkup = useSelector(() => {
        if (item.markup !== undefined){
        Object.keys(vars).forEach((key) => {
            const value = vars[key][index.get()??item.barIndex];
            item.markup.set(item.markup.get()?.replace(`{{${key}}}`, value.toString()));
        });
        }
        const sanitizedMarkup = DOMPurify.sanitize(item.markup.get()??"");
        return sanitizedMarkup;
    });

    return (
        <Div 
          id={id? id : "bar-" + barIndex} 
          className={"bar" + (orientationValue === 0?" horizontal":" vertical")} 
          dangerouslySetInnerHTML={{__html: sanitizedMarkup }} 
          style={trackedData} 
          css={css`${CSS}`} 
          // onClick={onClickHandler??undefined}
        />
    );
}

const BarDecoration = ({item} : {item: Observable<{decIndex: number, id: string | undefined, order: number | undefined, width: string, CSS: string | undefined, markup: string | undefined}>}) => {

    const {index, theme, orientation, vars} = useContext(BarContext); 

    Object.keys(vars).forEach((key) => {
        const value = vars[key][index.get()??item.decIndex];
        item.markup.set((item.markup.get()??"").replace(`{{${key}}}`, value.toString()));
    });
    const sanitizedMarkup = DOMPurify.sanitize(item.markup.get()??"");
    return (
        <Div 
            id={"bar-dec-" + item.decIndex.get()} 
            className={"bar-decoration" + (orientation.get()===0?" horizontal":" vertical")}  
            dangerouslySetInnerHTML={{__html: sanitizedMarkup }} 
            style={orientation.get()===0? (item.width.get()?{order: item.order.get(), width: item.width.get()}:{order: item.order.get()}):(item.width.get()?{order: item.order.get(), height: item.width.get()}:{order: item.order.get()})} 
            css={css`${item.CSS.get()}`} 
            // onClick={onClickHandler??undefined}
        />
    );
}

const BarAndDecContainer = ({barIndex, elements, CSS="", decorationWidth="10%", order=1, index=undefined, onClickHandler=undefined}: {barIndex: number, elements: BarElementType[], decorationWidth?: string, order?: number, CSS: string, index?: number, onClickHandler?: React.MouseEventHandler<HTMLDivElement> }) => {
    const {data, dataMax, theme, orientation} = useContext(BarContext);

    // if (data.peek().length === 0){
    //     data.set([4]);
    //     dataMax.set(10);
    // }

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
          style={orientation.get()===0? {display: "flex", flexDirection: "row", width: "100%", order: order, height: "inherit", alignItems: "center"} : {display: "flex", flexDirection: "column-reverse", height: "100%", order: order, width: "inherit", alignItems: "center"}} 
          css={css`${CSS}`} 
          // onClick={onClickHandler??undefined}
          >
            <For each={trackedData} item={Bar} />
            <For each={trackedDecorationsList} item={BarDecoration} />
        </Div>
    )
}

export default BarAndDecContainer;