import { CSSObject } from '@emotion/react';
type BarType = {
    id?: string;
    type: "bar";
    dataIndex?: number[];
    order?: number;
    CSS?: string | CSSObject;
    useData?: boolean;
    useDataMax?: boolean;
    markup?: string;
    isDefault?: boolean;
    onClickHandler?: React.MouseEventHandler<HTMLDivElement>;
};
export type { BarType };
