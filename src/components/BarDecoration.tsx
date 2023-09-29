/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react'
import DOMPurify from "dompurify";
import styled from '@emotion/styled';
import BarContext from './BarContext';
import { useContext } from 'react';
  
const Div = styled.div``;

const BarDecoration = ({decIndex=0, id=undefined, width=undefined, CSS="", markup="", order=2, onClickHandler=undefined}: {decIndex: number, id?: string, width?: string, CSS?: string, markup?: string, order?: number, onClickHandler?: React.MouseEventHandler<HTMLDivElement> }) => {

    const {index, theme, orientation, vars} = useContext(BarContext); 
    
    // const {index, theme, orientation, vars} = useFullBarStore.getState();

  Object.keys(vars).forEach((key) => {
    const value = vars[key][index.get()??decIndex];
    markup = markup.replace(`{{${key}}}`, value.toString());
  });
  const sanitizedMarkup = DOMPurify.sanitize(markup);
  return (
      <Div 
        id={"bar-dec-" + decIndex} 
        className={"bar-decoration" + (orientation.get()===0?" horizontal":" vertical")}  
        dangerouslySetInnerHTML={{__html: sanitizedMarkup }} 
        style={orientation.get()===0? (width?{order: order, width: width}:{order: order}):(width?{order: order, height: width}:{order: order})} 
        css={css`${CSS}`} 
        // onClick={onClickHandler??undefined}
      />
  );
}

export default BarDecoration;