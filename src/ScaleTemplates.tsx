import BarElementType from "./components/types/BarElementType";
import BarContentContainerElementType from "./components/types/BarContentContainerElementType";
import FullBarElementType from "./components/types/FullBarElementType";
import DecorationType from "./components/types/DecorationType";
import BarContentContainerType from "./components/types/BarContentContainerType";
import BarType from "./components/types/BarType";
import BarAndDecContainerType from "./components/types/BarAndDecContainerType";

//-------------------------------------- Bars --------------------------------------------//
const solidLineLeftAndBottomBorderScaleBars: BarType =
{
  type: "bar",
  order: 1,
  isDefault: true,
  CSS: "background-color: none; height: auto; transition: all 0.4s ease-in-out;border-left: 4px solid #555555;border-bottom: 4px solid #555555;",
  markup: "<div style='font-weight: bold;font-size: small;height:100%;display: flex; justify-content: flex-start;padding-left: 4px;color: #555555'><span style='margin-top: -4px;'>{{$scaleLabel}}</span></div>",
}

const dashedLineLeftBorderScaleBars: BarType = 
{
  type: "bar",
  order: 1,
  isDefault: true,
  CSS: "background-color: none; height: auto; transition: all 0.4s ease-in-out;border-left: 4px dashed #00000011;",
  markup: "<div style='font-weight: bold;font-size: small;height:100%;display: flex; justify-content: flex-start;padding-left: 4px;color: #555555'><span style='margin-top: -4px;'>{{$scaleLabel}}</span></div>",
}

//-------------------------------------- Decorations --------------------------------------------//

//Empty dummy decoration
const emptyDecoration: DecorationType =
{
  type: "decoration",
  order: 0,
  CSS: "",
  markup: "",
}

// Dictionary for Full Scale Bar decoration that adds a line at the beginning of the scale (at zero)
const fullScaleZeroLine: DecorationType = 
{
  type: "decoration",
  order: 0,
  CSS: "height: inherit;border-right: 4px solid #555555;",
  markup: "",
}

// Dictionary for decoration showing DataMax value and final tickmark at the end of the scale
const finalTickDecoration: DecorationType =
{
  type: "decoration",
  order: 20,  // Order shouldnt matter because this decoration is expected to be lifted from the flex flow and placed at the end of the scale
  useDataMax: true,
  CSS: "position:absolute;left: calc(100% - 2rem);width: 3rem;height: 100%;color: #555555; div {font-size: small; text-align: left;border-left: 4px solid #555555;}", //We subtract 2rem from `left` to account for padding that impacts where the bars stop
  markup: "<div style='display: flex;font-weight: bold;height: 150%;padding-left: 4px;'><span style='margin-top: -4px;width: 100%;'>{{$dataMaxValue}}</span></div>",
}
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
//+++++++++++++++++++++++++++++++++++++++ INNER BAR AND DEC CONTAINER TEMPLATES ++++++++++++++++++++++++++++++++++++++++//

//------------------------------------ DEFAULT INNER BAR AND DEC CONTAINER TEMPLATE ------------------------------------//
const DEFAULT_SCALE_BAR_DEC_TEMPLATE: BarElementType[] = [
    solidLineLeftAndBottomBorderScaleBars,
    finalTickDecoration
];

// Template for a scale that is intended to span the full height of container. Scale is meant to be in the background behind the plot
// Note: This template does not specify a "bar-dec-container" dictionary. This is because it would be redundant as it is the exact same
// as in the default template (the one in the default is passed into the "bar-content-container" dictionary).
const FULLHEIGHT_SOLIDSTARTEND_DASHEDINNER: BarElementType[] = [
  dashedLineLeftBorderScaleBars,
  finalTickDecoration
];

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//

//-------------------------------------- Bar And Dec Containers --------------------------------------------//
const defaultBarDecContainer: BarAndDecContainerType = 
{
  type: "bar-dec-container",
  elements: DEFAULT_SCALE_BAR_DEC_TEMPLATE,
  CSS: "background: none;",
  decorationWidth: "10%",
  order: 1,
}


//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
//++++++++++++++++++++++++++++++++++++++++++++ CONTENT CONTAINER TEMPLATES +++++++++++++++++++++++++++++++++++++++++++++//

//----------------------------------------- DEFAULT CONTENT CONTAINER TEMPLATE -----------------------------------------//
const DEFAULT_SCALE_BAR_DEC_CONTAINER_TEMPLATE: BarContentContainerElementType[] = [
  defaultBarDecContainer, 
];

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//

//-------------------------------------- Bar Content Containers --------------------------------------------//
const defaultBarContentContainer: BarContentContainerType = 
  {
    type: "bar-content-container",
    elements: DEFAULT_SCALE_BAR_DEC_CONTAINER_TEMPLATE,
    decorationWidth: "10%",
    order: 1,
    CSS:"padding-right: 2rem;& .bar-dec-cont > .bar:first-of-type {border-left: none;} "  // This element hides content that overflows the bar and so we add 2rem to the right to stop the bars and allow space for decoration to be visible.
  }


//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
//+++++++++++++++++++++++++++++++++++++++++++++++++ FULL BAR TEMPLATES +++++++++++++++++++++++++++++++++++++++++++++++++//

//--------------------------------------------- DEFAULT FULL BAR TEMPLATE ----------------------------------------------//
const DEFAULT_SCALE_FULL_BAR_TEMPLATE: FullBarElementType[] = [
  defaultBarContentContainer, 
  emptyDecoration
];

// Full bar with decoration used to make a line at the beginning of the scale (at zero)
const FULL_BAR_WITH_ZERO_LINE: FullBarElementType[] = [
  defaultBarContentContainer, 
  fullScaleZeroLine
];

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//

