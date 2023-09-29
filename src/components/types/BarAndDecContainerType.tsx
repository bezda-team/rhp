import BarElementType from "./BarElementType";

type BarAndDecContainerType =
{
  type: "bar-dec-container";
  elements: BarElementType[];
  CSS?: string;
  decorationWidth?: string;
  order?: number;
  onClickHandler?: React.MouseEventHandler<HTMLDivElement>;
}

export default BarAndDecContainerType;