import type { CSSObject } from "@emotion/react";

type DecorationType = 
{
  id?: string;
  type: "decoration";
  dataIndex?: number;
  useData?: boolean;
  useDataMax?: boolean;
  order?: number;
  CSS?: string | CSSObject;
  markup?: string;
  onClickHandler?: React.MouseEventHandler<HTMLDivElement>;
}

export type { DecorationType };