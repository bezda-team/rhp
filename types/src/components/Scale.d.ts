import { CSSObject } from '@emotion/react';
import { FullBarElementType } from './types/FullBarElementType';
import { Observable } from '@legendapp/state';
export declare const fullBarElements: FullBarElementType[];
export type ScaleDataObservable = Observable<{
    index: number;
    data: number[];
    order: number;
    width: string;
    decorationWidth: string;
    elements: FullBarElementType[];
    id: string;
    CSS: string | CSSObject;
}>;
declare const Scale: ({ width, height, spacing, dataMaxLimit, scaleData, scaleTemplate, id, style, decorationWidth, decouple, CSS }: {
    width: string;
    height: string;
    spacing: Observable<number>;
    dataMaxLimit: number;
    scaleData?: import('@legendapp/state').ObservableObject<{
        index: number;
        data: number[];
        order: number;
        width: string;
        decorationWidth: string;
        elements: FullBarElementType[];
        id: string;
        CSS: string | CSSObject;
    }> | undefined;
    scaleTemplate?: FullBarElementType[] | undefined;
    id?: string | undefined;
    style?: import('react').CSSProperties | undefined;
    decorationWidth?: string | undefined;
    decouple?: boolean | undefined;
    CSS?: string | CSSObject | undefined;
}) => import("@emotion/react/jsx-runtime").JSX.Element;
export default Scale;
