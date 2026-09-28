// @bezda/rhp-react: rhp charts as React components.
// A chart is written once with rhp and Solid's html template, and toReact turns it into a React component. The React
// props reach the chart through a Solid store that is reconciled after each render, so a change only updates what it
// touches (one number in a list updates one bar). Everything @bezda/rhp/standalone exports is exported here too, so an
// app has one copy of Solid for all its charts.
import { createElement, useEffect, useLayoutEffect, useRef } from "react";
import { render, createStore, reconcile } from "@bezda/rhp/standalone";

export * from "@bezda/rhp/standalone";

// The chart is drawn before the browser paints, so there is no empty frame (on a server, nothing runs)
const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;

// Every prop goes to the chart except the wrapper's own (className, style) and React's children
const data = ({ className, style, children, ...rest }) => rest;

// Turns an rhp chart into a React component:
//
//   const FruitChart = toReact((props) => html`
//     <${Chart} scale=${[0, 30]}>
//       <${Plot} fruit=${() => props.fruit} sold=${() => props.sold}>${row}<//>
//     <//>`);
//
//   <FruitChart fruit={fruit} sold={sold} className="card" />
//
// draw(props) returns the chart. Read the props inside functions (${() => props.sold}) so the chart follows them.
// The component renders a <div> that the chart draws into, and className and style go on it.
export function toReact(draw) {

  function RhpChart(props) {

    const box = useRef(null);
    const set = useRef(null);

    useBeforePaint(() => {
      const [state, setState] = createStore(data(props));
      set.current = setState;
      const dispose = render(() => draw(state), box.current);

      return () => {
        set.current = null;
        dispose();
      };
    }, []);

    // After every render, only what changed notifies (reconcile compares lists item by item)
    useBeforePaint(() => {
      set.current?.(reconcile(data(props)));
    });

    return createElement("div", { ref: box, className: props.className, style: props.style });
  }

  RhpChart.displayName = `rhp(${draw.name || "chart"})`;

  return RhpChart;
}
