/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react'
import styled from '@emotion/styled';
import BarAndDecContainer from './BarAndDecContainer';
import BarDecoration from './BarDecoration';
import BarContentContainerElementType from './types/BarContentContainerElementType';
import BarContext from './BarContext';
import { useContext, useEffect } from 'react';
  
const Div = styled.div``;

const BarContentContainer = ({elements, CSS="", decorationWidth="100%", onClickHandler=undefined}: { elements: BarContentContainerElementType[], decorationWidth?: string, CSS?: string, onClickHandler?: React.MouseEventHandler<HTMLDivElement> }) => {
    const {orientation} = useContext(BarContext);

    useEffect(() => {
        console.log("---->BarContentContainer mounted");
        return () => {
            console.log("---->BarContentContainer unmounted");
        }
    }, []);

    return (
      <Div 
        className="bar-content-container" 
        style={orientation.get()===0? {display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", overflow: "hidden"} : {display: "flex", flexDirection: "row", height: "100%", width: "100%", overflow: "hidden"}} 
        css={css`${CSS}`} 
        // onClick={onClickHandler??undefined}
      >
        {elements.map((element, i) => {
            if (element.type === "bar-dec-container"){
              return <BarAndDecContainer 
                        key={"content_bar_" + i}
                        barIndex={i} 
                        order={element.order}
                        elements={element.elements} 
                        decorationWidth={decorationWidth} 
                        CSS={element.CSS??""}
                        // onClickHandler={element.onClickHandler??undefined} 
                      />
            } else {
              return <BarDecoration 
                        key={"content_decoration_" + i}
                        id={element.id}
                        order={element.order}
                        CSS={element.css} 
                        markup={element.markup} 
                        decIndex={i}
                        // onClickHandler={element.onClickHandler??undefined} 
                      />
            }
          })
        }
      </Div>
    );
  }

export default BarContentContainer;