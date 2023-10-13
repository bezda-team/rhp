# Developer notes and plans (ideas, issues, TODOs)

## General concepts to be reminded of

 - The component library provides react components that should make it easier to build full plots components with desired features in appearance and behavior
    - These full plot components (that are built) should only need the data values, the template dictionaries for the main sections of the plot, and additional parameters to construct the plot out of the components of this library.
    - These full plot components should decide the level of customization that is offered to users (what users can configure/change and what is fixed) and should implement all possible behaviors
        - behavior involving an instance of a core component and its inner elements should be implemented inside the core component and/or its in its inner elements
        - behavior involving multiple instances of the same or different core components should be implemented in the full plot component.
            - for example: function adjusting the data range upper limit of the Scale component to match the data value of the largest FullBar component should be implemented in the full plot component (BarPlot component)

### Structure
Traditionally, with bar graphs (and many other types of graphs), the plot area is dealt with seperately from the axis and labels and connected information outside the plot area. In other words, the bar labels, icons, and text outside the plot area is constructed separately or detached from the associated bar inside the plot area. 

The pattern that inspired component-ization of plot elements/segments is a tiny bit outside the box (pun intended). The pattern can be most easily seen in bar plots (bar group plots and stacked bar plots as well), candlestick/box and whisker plots, and rectangular heatmap plots. For example, if you look at bar chart infographic templates offered on sites like [Smart Draw](https://www.smartdraw.com/bar-graph/examples/) or [Slide Members](https://www.slidemembers.com/en_US/view/Diagram/various-types-of-bar-chart-infographic-diagram-11342), you will easily see this pattern. 

Lets look at the following template graphics from Slide Members:

![Screenshot 2023-10-13 034651](https://github.com/bouzidanas/react-html-plots/assets/25779130/d29fe3f6-ed84-492d-8704-2d90c2291cad)

Each of these can be divided into stacked elements with the same structure where the only differences are due to differences in the data each stacked element is representing and conveying:

![stacked_info_segment_pattern](https://github.com/bouzidanas/react-html-plots/assets/25779130/71f4951d-8c64-453b-9c46-38940b3cd07e)

This pattern lead to main overarching concept which is that given a template for just one of the stacked elements and all the information/data needed to fill in/configure the template for each element, we should be able to construct the plot. So we build a component that takes a template and builds itself according to the template. The template itself should indicate where the data or information will be inserted if its not obvious or consistent. Each component should have access to the data/information and will watch for changes in the parts of the data that matter to it and will update itself automatically when changes occur.

## CSS

All components should be stylable with CSS as many ways as possible. Currently, every inner component and container of the core FullBar component can be styled by CSS that is provided in the FullBar template object. However, users should also be able to style all components with a global style sheet. To achieve the same effect as the template, apply one CSS string to the same components across FullBar elements, classes need to be added to each container and inner component. The benefit of doing this is that it should be simpler and easier to change classes to make changes in appearance than to change entire CSS applied to the component/container. However, the reason for the CSS attribute in the templates in the first place is to be able to inject variable values and have the CSS change according to data. This could be achieved with a global stylesheet and classes but would require much more repetitive CSS and many more classes and thus could prove more difficult to manage.

### What needs to be added or implemented

  - [x] dictionaries (in the templates that configures a container or inner component) should have an optional CSS property
  - [x] lowest level inner components (Bar, BarDecoration) should have variable injection feature for inner markup
  - [ ] lowest level inner components (Bar, BarDecoration) should have variable injection feature for CSS
  - [ ] each dictionary should have an optional classList property
  - [ ] each container and component should be given a sensible base default classList


## Interactivity

All containers and components should be able to respond to mouse/touch events. However, due to the deeply nested nature and the sheer quantity of these elements, great strides must be made to minimize the number of even handlers and to manage (create/destroy) them efficiently. I think an event listener should be created for every major branch of the component tree and then use event target to decipher which inner component received the event. An example would be to give each FullBar component an event listener. This could tie in well the templates.add 

### What needs to be added or implemented

 - [ ] add mouse event listeners
 - [ ] add ability to customize listeners is some useful way via properties in template.

## Doing things the react way

This project was inspired by a non-react svg plotting library and as a result, extra effort is required to restructure the pieces into react components that people will find intuitive to use and follow common design configurations. Currently, the plan is to provide BOTH black-box react components (where you dont have to worry/care about whats inside after you have created/chosen the templates) and your typical react components where you can set things up so that all inner elements are accessable at the top level.

## Cleanup

 - [ ] add interface props for all components
 - [ ] differentiate `BarType` and `DecorationType` and use `BarType | DecorationType` in type requirements in components that mix both
 - [ ] change `BarPlot` component name to `BarPlotArea`
 - [ ] move `PlotContext,provider` (context provider) from BarPlotArea and Scale components to the parent full plot component.
