type DecorationType = 
{
  id?: string;
  type: "decoration";
  order?: number;
  css?: string;
  markup?: string;
  onClickHandler?: React.MouseEventHandler<HTMLDivElement>;
}

export default DecorationType;