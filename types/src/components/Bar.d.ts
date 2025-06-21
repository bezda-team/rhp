import { CSSObject } from '@emotion/react';
import { Observable } from '@legendapp/state';
declare const Bar: ({ item }: {
    item: Observable<{
        id: string | undefined;
        barIndex: number;
        order: number | undefined;
        CSS: string | CSSObject | undefined;
        markup: string | undefined;
    }>;
}) => import("@emotion/react/jsx-runtime").JSX.Element;
export default Bar;
