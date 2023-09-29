type BarType = 
{
  id?: string;
  type: "bar";
  dataIndex?: number;
  order?: number;
  css?: string;
  markup?: string;
  onClickHandler?: React.MouseEventHandler<HTMLDivElement>;
}

export default BarType;