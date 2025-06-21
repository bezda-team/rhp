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
};
export declare const DEFAULT_MARKUP: {
    "bar-label": string;
    "bar-content-container": string;
    "bar-dec-container": string;
    bar: string;
    "bar-decoration": string;
};
export declare const DEFAULT_SEGMENT_TEMPLATE: FullBarElementType[];
export declare const changeSegmentOrder: (newOrder: number[], trackedBarsConfig: ConfigObservable) => void;
export declare const changeSegmentOrderBasedOnMagnitude: (plotData: Observable<number[][]>, trackedBarsConfig: ConfigObservable) => void;
declare const SegmentPlot: ({ width, height, dataIndexForOrdering, segmentConfig, segmentTemplate, decorationWidth, id, style, CSS, children }: {
    width: string;
    height: string;
    dataIndexForOrdering?: import('@legendapp/state').ObservablePrimitiveBaseFns<number> | undefined;
    segmentConfig?: import('@legendapp/state').ObservableArray<{
        dataIndex: number;
        varIndex: number;
        order: number;
        width: string;
        decorationWidth: string;
        elements: FullBarElementType[];
        id: string;
        CSS: string | CSSObject;
    }[]> | undefined;
    segmentTemplate?: FullBarElementType[] | undefined;
    decorationWidth?: string | undefined;
    id?: string | undefined;
    style?: import('react').CSSProperties | undefined;
    CSS?: string | CSSObject | undefined;
    children?: never[] | import('react').ReactElement<any, string | import('react').JSXElementConstructor<any>> | undefined;
}) => import("@emotion/react/jsx-runtime").JSX.Element;
export default SegmentPlot;
