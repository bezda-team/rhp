import { CSSObject } from '@emotion/react';
import { FullBarElementType } from './types/FullBarElementType';
import { Observable } from '@legendapp/state';
declare const FullBar: ({ item }: {
    item: Observable<{
        index: number;
        data: number[];
        order: number;
        width: string;
        decorationWidth: string;
        elements: FullBarElementType[];
        id: string;
        CSS: string | CSSObject;
    }>;
}) => import("@emotion/react/jsx-runtime").JSX.Element;
export default FullBar;
