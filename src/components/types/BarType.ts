type BarType = 
{
  id?: string;
  type: "bar";
  dataIndex?: number[];
  order?: number;
  CSS?: string;
  useData?: boolean;     //Not needed for Bar (will be removed once type issue is fixed)
  useDataMax?: boolean;  //Not needed for Bar (will be removed once type issue is fixed)
  markup?: string;
  isDefault?: boolean;
  onClickHandler?: React.MouseEventHandler<HTMLDivElement>;
}

export type { BarType };