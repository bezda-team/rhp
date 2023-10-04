type DecorationType = 
{
  id?: string;
  type: "decoration";
  dataIndex?: number;
  useData?: boolean;
  useDataMax?: boolean;
  order?: number;
  CSS?: string;
  markup?: string;
  onClickHandler?: React.MouseEventHandler<HTMLDivElement>;
}

export default DecorationType;