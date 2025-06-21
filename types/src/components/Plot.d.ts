import { CSSObject } from '@emotion/react';
import { FC } from 'react';
import { FullBarElementType } from './types/FullBarElementType';
import { Observable } from '@legendapp/state';
export type DataObservable = Observable<{
    index: number;
    data: number[];
    order: number;
    width: string;
    decorationWidth: string;
    elements: FullBarElementType[];
    id: string;
    CSS: string;
}[]>;
export declare const DEFAULT_CSS: {
    "bar-plot": string;
    "full-bar": string;
    "bar-label": string;
    "bar-content-container": string;
    "bar-dec-container": string;
    bar: string;
    "bar-decoration": string;
};
export declare const DEFAULT_MARKUP: {
    "bar-label": string;
    "bar-content-container": string;
    "bar-dec-container": string;
    bar: string;
    "bar-decoration": string;
};
export declare const changeOrder: (newOrder: number[], trackedBarsData: Observable<{
    index: number;
    data: number[];
    order: number;
    width: string;
    decorationWidth: string;
    elements: FullBarElementType[];
    id: string;
    CSS: string;
}[]>) => void;
export declare const changeOrderBasedOnMagnitude: (trackedBarsData: Observable<{
    index: number;
    data: number[];
    order: number;
    width: string;
    decorationWidth: string;
    elements: FullBarElementType[];
    id: string;
    CSS: string;
}[]>) => void;
type PlotChildrenProps = FC<{
    item: Observable<{
        index: number;
        data: number[];
        order: number;
        width: string;
        decorationWidth: string;
        elements: FullBarElementType[];
        id: string;
        CSS: string;
    }>;
}>;
declare const Plot: ({ width, height, childrenData, children, id, style, CSS }: {
    width: string;
    height: string;
    childrenData: DataObservable;
    children: FC<PlotChildrenProps>;
    id?: string | undefined;
    style?: import('react').CSSProperties | undefined;
    CSS?: string | CSSObject | undefined;
}) => import("@emotion/react/jsx-runtime").JSX.Element;
export default Plot;
