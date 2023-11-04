/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import type { CSSObject } from '@emotion/react';
import styled from '@emotion/styled';
import { useContext } from 'react';
import Decoration from './Decoration';
import BarAndDecContainer from './BarAndDecContainer';
import PlotContext from './PlotContext';
import type { BarElementType } from './types/BarElementType';
import type { BarContentContainerElementType } from './types/BarContentContainerElementType';
import type { Observable } from '@legendapp/state';
import { For, useObservable, useSelector } from '@legendapp/state/react';

const Div = styled.div``;  

const BarContentContainer = ({item}:{item: Observable<{id: string, elements: BarContentContainerElementType[], order?: number, decorationWidth?: string, CSS?: string | CSSObject, onClickHandler?: React.MouseEventHandler<HTMLDivElement>}>}) => {
  const {orientation} = useContext(PlotContext);

  // const renderCount = ++useRef(0).current;
  //   console.log("BarContentContainer render count: " + renderCount);

  const orientationValue = useSelector(orientation);
  const trackedCSS = useSelector(item.CSS);
  useSelector<BarContentContainerElementType[]>(item.elements);
  const decorationWidth = useSelector(item.decorationWidth);
  const order = useSelector(item.order);

  const {newBarAndDecs, newContDecs} = useSelector(() => {
      const untrackedElements = item.elements.peek();      //The `peek` here might be ineffective because `useSelector` is called on the elements and so rerender is triggered anyway.
      const newBarAndDecs : {id: string, barIndex: number, elements: BarElementType[], decorationWidth?: string, order?: number, CSS: string | CSSObject, index?: number, onClickHandler?: React.MouseEventHandler<HTMLDivElement>}[] = [];
      const newContDecs : {decIndex: number, id: string | undefined, order: number | undefined, width: string, CSS: string | CSSObject | undefined, markup: string | undefined}[] = []; 
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
                              CSS: element.CSS, 
                              markup: element.markup
                            });
          }
        });
      return {newBarAndDecs, newContDecs};
  });

  const trackedBarAndDecsList = useObservable(newBarAndDecs);
  const trackedContDecsList = useObservable(newContDecs);

  return (
      <Div 
        className="bar-content-container" 
        style={orientationValue===0? {display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", overflow: "hidden", order: order??1} : {display: "flex", flexDirection: "row", height: "100%", width: "100%", overflow: "hidden", order: order??1}} 
        css={css(trackedCSS)} 
        // onClick={onClickHandler??undefined}
      >
          <For each={trackedBarAndDecsList} item={BarAndDecContainer} optimized/>
          <For each={trackedContDecsList} item={Decoration} optimized/>
      </Div>
  );
}

export default BarContentContainer;