import { CSSObject } from '@emotion/react';
import { FullBarElementType } from './types/FullBarElementType';
import { Observable } from '@legendapp/state';
import { ConfigObservable } from './types/ConfigObservable';
export declare const DEFAULT_CSS: {
    "bar-plot": string;
    "full-bar": string;
    "bar-label": string;
    "bar-content-container": string;
    "bar-dec-container": string;
    bar: string;
    "bar-decoration": string;
    "desaturate-bar": string;
};
export declare const DEFAULT_MARKUP: {
    "bar-label": string;
    "bar-content-container": string;
    "bar-dec-container": string;
    bar: string;
    "bar-decoration": string;
};
export declare const DEFAULT_BOX_WHISKER_TEMPLATE: FullBarElementType[];
export declare const processData: (data: number[][]) => number[][];
export declare const changeBWOrder: (newOrder: number[], boxWhiskerConfig: ConfigObservable) => void;
export declare const changeOrderBasedOnPosition: (plotData: Observable<number[][]>, boxWhiskerConfig: ConfigObservable, index?: number) => void;
declare const BoxWhiskerPlot: ({ width, height, dataIndexForOrdering, boxWhiskerConfig, boxWhiskerTemplate, decorationWidth, id, style, CSS }: {
    width: string;
    height: string;
    dataIndexForOrdering?: import('@legendapp/state').ObservablePrimitiveBaseFns<number> | undefined;
    boxWhiskerConfig?: import('@legendapp/state').ObservableArray<{
        dataIndex: number;
        varIndex: number;
        order: number;
        width: string;
        decorationWidth: string;
        elements: FullBarElementType[];
        id: string;
        CSS: string | CSSObject;
    }[]> | undefined;
    boxWhiskerTemplate?: FullBarElementType[] | undefined;
    decorationWidth?: string | undefined;
    id?: string | undefined;
    style?: import('react').CSSProperties | undefined;
    CSS?: string | CSSObject | undefined;
}) => import("@emotion/react/jsx-runtime").JSX.Element;
export default BoxWhiskerPlot;
