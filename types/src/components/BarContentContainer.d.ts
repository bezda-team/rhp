import { CSSObject } from '@emotion/react';
import { BarContentContainerElementType } from './types/BarContentContainerElementType';
import { Observable } from '@legendapp/state';
declare const BarContentContainer: ({ item }: {
    item: Observable<{
        id: string;
        elements: BarContentContainerElementType[];
        order?: number;
        decorationWidth?: string;
        CSS?: string | CSSObject;
        onClickHandler?: React.MouseEventHandler<HTMLDivElement>;
    }>;
}) => import("@emotion/react/jsx-runtime").JSX.Element;
export default BarContentContainer;
