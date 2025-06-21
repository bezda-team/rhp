import { CSSObject } from '@emotion/react';
import { BarElementType } from './types/BarElementType';
import { Observable } from '@legendapp/state';
declare const BarAndDecContainer: ({ item }: {
    item: Observable<{
        barIndex: number;
        elements: BarElementType[];
        decorationWidth?: string;
        order?: number;
        CSS: string | CSSObject;
        onClickHandler?: React.MouseEventHandler<HTMLDivElement>;
    }>;
}) => import("@emotion/react/jsx-runtime").JSX.Element;
export default BarAndDecContainer;
