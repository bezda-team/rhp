import { CSSObject } from '@emotion/react';
import { FullBarElementType } from './types/FullBarElementType';
import { DataObservable } from './types/DataObservable';
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
export declare const DEFAULT_BAR_TEMPLATE: FullBarElementType[];
export declare const changeOrder: (newOrder: number[], trackedBarsConfig: DataObservable) => void;
export declare const changeOrderBasedOnMagnitude: (trackedBarsConfig: DataObservable) => void;
declare const BarPlot: ({ width, height, barsConfig, barTemplate, decorationWidth, id, style, CSS }: {
    width: string;
    height: string;
    barsConfig?: import('@legendapp/state').ObservableArray<{
        index: number;
        data: number[];
        order: number;
        width: string;
        decorationWidth: string;
        elements: FullBarElementType[];
        id: string;
        CSS: string | CSSObject;
    }[]> | undefined;
    barTemplate?: FullBarElementType[] | undefined;
    decorationWidth?: string | undefined;
    id?: string | undefined;
    style?: import('react').CSSProperties | undefined;
    CSS?: string | CSSObject | undefined;
}) => import("@emotion/react/jsx-runtime").JSX.Element;
export default BarPlot;
