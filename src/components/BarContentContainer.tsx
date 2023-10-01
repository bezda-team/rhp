/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react'
import styled from '@emotion/styled';
import { useContext, useEffect, useRef } from 'react';
import BarDecoration from './BarDecoration';
import BarAndDecContainer from './BarAndDecContainer';
import BarContext from './BarContext';
import PlotContext from './PlotContext';
import BarElementType from './types/BarElementType';
import BarContentContainerElementType from './types/BarContentContainerElementType';
import { Observable } from '@legendapp/state';
import { For, useObservable, useSelector } from '@legendapp/state/react';
import { enableReactUse } from '@legendapp/state/config/enableReactUse';

enableReactUse();

const Div = styled.div``;  

const BarContentContainer = ({item}:{item: Observable<{id: string, elements: BarContentContainerElementType[], order?: number, decorationWidth?: string, CSS?: string, onClickHandler?: React.MouseEventHandler<HTMLDivElement>}>}) => {
  const {orientation} = useContext(PlotContext);

  const renderCount = ++useRef(0).current;
    console.log("BarContentContainer render count: " + renderCount);

  const orientationValue = orientation.use()
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

export default BarContentContainer;