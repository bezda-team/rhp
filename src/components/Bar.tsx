/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react'
import DOMPurify from "dompurify";
import styled from '@emotion/styled';
import BarContext from './BarContext';
import { useContext } from 'react';
  
const Div = styled.div``;

const Bar = ({barIndex=0, id=undefined, CSS=undefined, markup=undefined, order=1, onClickHandler=undefined}: {barIndex: number, id?: string, CSS?: string, markup?: string, order?: number, onClickHandler?: React.MouseEventHandler<HTMLDivElement> }) => {

    const {index, data, dataMax, theme, orientation, vars} = useContext(BarContext);

    if (markup !== undefined){
      Object.keys(vars).forEach((key) => {
        const value = vars[key][index.get()??barIndex];
        markup = markup?.replace(`{{${key}}}`, value.toString());
      });
    }
    const sanitizedMarkup = DOMPurify.sanitize(markup? markup : "");
  
    return (
        <Div 
          id={id? id : "bar-" + barIndex} 
          className={"bar" + (orientation.get()===0?" horizontal":" vertical")} 
          dangerouslySetInnerHTML={{__html: sanitizedMarkup }} 
          style={orientation.get()===0? {width: data.get()[barIndex]*100/dataMax.get() + "%", order: order, height: "inherit"} : {height: data.get()[barIndex]*100/dataMax.get() + "%", order: order, width: "inherit"}} 
          css={css`${CSS}`} 
          // onClick={onClickHandler??undefined}
        />
    );
}

export default Bar;