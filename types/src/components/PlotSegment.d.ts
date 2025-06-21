import { CSSObject } from '@emotion/react';
import { FullBarElementType as PlotSegmentElementType } from './types/FullBarElementType';
import { Observable } from '@legendapp/state';
declare const PlotSegment: ({ item }: {
    item: Observable<{
        dataIndex: number;
        varIndex: number;
        order: number;
        width: string;
        decorationWidth: string;
        elements: PlotSegmentElementType[];
        id: string;
        CSS: string | CSSObject;
    }>;
}) => import("@emotion/react/jsx-runtime").JSX.Element;
export default PlotSegment;
