/** @jsxImportSource @emotion/react */
import type { CSSObject } from "@emotion/react";

// TODO: Create global function to check if children are compatible with the template.
//       Consider using React.FC type for the type of the elements in the array of acceptible children


export const BarTemplate = ({children, dataIndex, order, markup, isDefault, CSS, onClickHandler}:{children?:React.ReactElement<any> | React.ReactElement<any>[] | never[], dataIndex?: number[], order?: number, markup?: string, isDefault?: boolean, CSS?: string | CSSObject, onClickHandler?:  React.MouseEventHandler<HTMLDivElement>}) => {

    return (
        <>
            {children}
        </>
    )
}

export const DecTemplate = ({children, dataIndex, useData, useDataMax, order, markup, CSS, onClickHandler}:{children?:React.ReactElement<any> | React.ReactElement<any>[] | never[], dataIndex?: number[], useData?: boolean, useDataMax?: boolean, order?: number, markup?: string, CSS?: string | CSSObject, onClickHandler?:  React.MouseEventHandler<HTMLDivElement>}) => {

    return (
        <>
            {children}
        </>
    )
}

export const BarsAndDecsTemplate = ({children, decorationWidth, order, CSS, onClickHandler}:{children?:React.ReactElement<any> | React.ReactElement<any>[] | never[], decorationWidth?: string, order?: number, CSS?: string | CSSObject, onClickHandler?:  React.MouseEventHandler<HTMLDivElement>}) => {

    const checkChildren = () => {
        if (Array.isArray(children)){
            if (children.length){
                children.forEach((child) => {
                    const childType = child.type;
                    if (childType !== BarTemplate && childType !== DecTemplate){
                        return false
                    }
                });
                return true;
            } else {
                return false;
            }
        }
        else {
            const childrenType = children?.type;
            if (childrenType !== BarTemplate && childrenType !== DecTemplate){
                return false
            } else {
                return true;
            }
        }
    }

    if (checkChildren()){
        return (
            <>
                {children}
            </>
        )
    }
    else {
        return (
            <>
                {"incompatible template component(s)"}
            </>
        )
    }
}

export const PlotAreaTemplate = ({children, decorationWidth, order, CSS, onClickHandler}:{children?:React.ReactElement<any> | React.ReactElement<any>[] | never[], decorationWidth?: string, order?: number, CSS?: string | CSSObject, onClickHandler?:  React.MouseEventHandler<HTMLDivElement>}) => {

    const checkChildren = () => {
        if (Array.isArray(children)){
            if (children.length){
                children.forEach((child) => {
                    const childType = child.type;
                    if (childType !== BarsAndDecsTemplate && childType !== DecTemplate){
                        return false
                    }
                });
                return true;
            } else {
                return false;
            }
        }
        else {
            const childrenType = children?.type;
            if (childrenType !== BarsAndDecsTemplate && childrenType !== DecTemplate){
                return false
            } else {
                return true;
            }
        }
    }

    if (checkChildren()){
        return (
            <>
                {children}
            </>
        )
    }
    else {
        return (
            <>
                {"incompatible template component(s)"}
            </>
        )
    }
}


export const SegmentTemplate = ({children, width, decorationWidth, order, CSS, onClickHandler}:{children?:React.ReactElement<any> | React.ReactElement<any>[] | never[], width?: string, decorationWidth?: string, order?: number[], CSS?: string | CSSObject, onClickHandler?:  React.MouseEventHandler<HTMLDivElement>}) => {

    const checkChildren = () => {
        if (Array.isArray(children)){
            if (children.length){
                children.forEach((child) => {
                    const childType = child.type;
                    if (childType !== PlotAreaTemplate && childType !== DecTemplate){
                        return false
                    }
                });
                return true;
            } else {
                return false;
            }
        }
        else {
            const childrenType = children?.type;
            if (childrenType !== PlotAreaTemplate && childrenType !== DecTemplate){
                return false
            } else {
                return true;
            }
        }
    }

    if (checkChildren()){
        return (
            <>
                {children}
            </>
        )
    }
    else {
        return (
            <>
                {"incompatible template component(s)"}
            </>
        )
    }
}
