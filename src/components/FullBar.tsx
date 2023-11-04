/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import type { CSSObject } from '@emotion/react';
import styled from '@emotion/styled';
import Decoration from './Decoration';
import BarContentContainer from './BarContentContainer';
import type { FullBarElementType } from './types/FullBarElementType';
import BarContext from './BarContext';
import PlotContext from './PlotContext';
import { useContext, useEffect} from 'react';
import type { BarContentContainerElementType } from './types/BarContentContainerElementType';
import { For, useObservable, useSelector } from '@legendapp/state/react';
import type { Observable } from '@legendapp/state';
const Div = styled.div``;

//============================================================= FULL BAR =================================================================

const FullBar = ({item} : {item: Observable<{index: number, data: number[], order: number, width: string, decorationWidth: string, elements: FullBarElementType[], id: string, CSS: string | CSSObject}>}) => {
    // const renderCount = ++useRef(0).current;
    // console.log("FullBar render count: " + renderCount);
    
    const {orientation} = useContext(PlotContext);

    const trackCSS = useSelector(item.CSS);
    const trackOrientation = useSelector(orientation);
    const trackWidth = useSelector(item.width);
    const trackOrder = useSelector(item.order);
    const trackId = useSelector(item.id);


    useEffect(() => {
        console.log("---->Fullbar " + item.index.peek() + " mounted");
        return () => {
            console.log("---->Fullbar " + item.index.peek() + " unmounted");
        }
    }, []);

    const {newContContainers, newFullBarDecs} = useSelector(() => {
        const untrackedElements = item.elements.peek();
        const newContContainers : {id: string, elements: BarContentContainerElementType[], order?: number, decorationWidth?: string, CSS?: string | CSSObject, onClickHandler?: React.MouseEventHandler<HTMLDivElement> }[] = [];
        const newFullBarDecs : {decIndex: number, id: string | undefined, order: number | undefined, width: string, CSS: string | CSSObject | undefined, markup: string | undefined}[] = []; 
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
                                width: item.decorationWidth.peek(),
                                CSS: element.CSS, 
                                markup: element.markup
                              });
            }
          });
        return {newContContainers, newFullBarDecs};
    });

    const trackedContContainersList = useObservable(newContContainers);
    const trackedFullBarDecsList = useObservable(newFullBarDecs);

    return (
        <BarContext.Provider value={{index: item.index, order: item.order, data: item.data, width: item.width, decorationWidth: item.decorationWidth}}>
            <Div 
                key={"full_bar_" + item.index.peek()}
                id={trackId??"full_bar_" + item.index.peek()}
                className={"full-bar" + (trackOrientation===0?" horizontal":" vertical")}
                style={trackOrientation===0? {display: "flex", flexDirection: "row-reverse", alignItems: "center", width: "100%", height: trackWidth, overflow: "hidden", order: trackOrder, position: "absolute", left: "0", top: "calc(" + trackWidth + "*" + trackOrder + ")"} : {display: "flex", flexDirection: "column", alignItems: "center", height: "100%", width: trackWidth, overflow: "hidden", order: trackOrder, position: "absolute", bottom: "0", left: "calc(" + trackWidth + "*" + trackOrder + ")"}} 
                css={css(trackCSS)} // Consider moving the props in the above style starting from 'position' to this css prop to allow for overriding
                // onClick={onClickHandler??undefined}
            >
                <For each={trackedContContainersList} item={BarContentContainer} optimized/>
                <For each={trackedFullBarDecsList} item={Decoration} optimized/>
            </Div>
        </BarContext.Provider>
    );
  }

export default FullBar;