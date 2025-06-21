import { CSSObject } from '@emotion/react';
import { Observable } from '@legendapp/state';
declare const Decoration: ({ item }: {
    item: Observable<{
        decIndex: number;
        id: string | undefined;
        order: number | undefined;
        dataIndex: number | undefined;
        width: string;
        CSS: string | CSSObject | undefined;
        markup: string | undefined;
        useData: boolean | undefined;
        useDataMax: boolean | undefined;
    }>;
}) => import("@emotion/react/jsx-runtime").JSX.Element;
export default Decoration;
