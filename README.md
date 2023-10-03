# react-html-plots

React component library for building plots with HTML and CSS

## Overview and Concept
The main goal of this component library is to be able to build extremely customizable plots that are responsive to changes in data and customization parameters/properties.
 - Use CSS for styling so that styling can be customized/altered.
 - Use dictionary/json containing a template to construct repeating main plot elements like bars or lines
 and use other inputs to alter the template for each specific instance.
 - Only re-render elements that are altered so that changes are less costly, making it possible
 to have more changes occur in less time.
 - Allow elements to respond to changes with CSS transitions and animations.
 - Core components should have self-contained state handling and context
    - Components nested inside Core components should respond to changes in parent Core component state variables that impact itself and ignore all others.

## Developer notes:
This project is currently in development. Core components and utilities are in flux.

### State management system and impact on component design.
[Legend-State](https://github.com/LegendApp/legend-state) was chosen for this library to handle state management for most components. React context is used in conjunction with Legend-State to minimize prop drilling and localize states to different levels of component trees. These choices have significantly impacted component function signatures and the types of the props that components require/accept. More specifically, Legend-State requires the use of "observables" to contain, track, and manipulate state. Currently, it has been more convenient to pass these around (through contexts, imports, and/or props) instead of raw data.