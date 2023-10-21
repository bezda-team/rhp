import type { BarContentContainerElementType } from "./BarContentContainerElementType";

type BarContentContainerType =
{
  type: "bar-content-container";
  elements: BarContentContainerElementType[];
  CSS?: string;
  decorationWidth?: string;
  order?: number;
  onClickHandler?: React.MouseEventHandler<HTMLDivElement>;
}

export type { BarContentContainerType };