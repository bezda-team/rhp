# Future changes and enhancements

## General concepts to be reminded of

 - The component library provides react components that should make it easier to build full plots components with desired features in appearance and behavior
    - These full plot components (that are built) should only need the plot data values, the template dictionaries for the main sections of the plot, and additional parameters to construct the plot out of the components of this library.
    - These full plot components should decide the level of customization that is offered to users (what users can configure/change and what is fixed) and should implement all possible behaviors
        - behavior involving an instance of a core component and its inner elements should be implemented inside the core component and/or its in its inner elements
        - behavior involving multiple instances of the same or different core components should be implemented in the full plot component.
            - for example: function adjusting the data range upper limit of the Scale component to match the data value of the largest FullBar component should be implemented in the full plot component (BarPlot component)

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
