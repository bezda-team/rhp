import { CSSObject } from "@emotion/react";
import type { BarContentContainerElementType } from "./BarContentContainerElementType";

type BarContentContainerType =
{
  type: "bar-content-container";
  elements: BarContentContainerElementType[];
  CSS?: string | CSSObject;
  decorationWidth?: string;
  order?: number;
  onClickHandler?: React.MouseEventHandler<HTMLDivElement>;
}

export type { BarContentContainerType };