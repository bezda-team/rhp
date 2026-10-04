// rhp with Solid included, for a page with no build step (one ES module from a CDN).
// Slats are written with Solid's html template tag instead of JSX, and a value that changes is wrapped in a function:
// ${() => d.value}
export * from "./index.js";
export { render } from "solid-js/web";
export { default as html } from "solid-js/html";
export { createSignal, createMemo, createEffect, createRoot, createSelector, createComputed, on, onMount, onCleanup, batch, untrack, mergeProps, splitProps, For, Index, Show, Switch, Match } from "solid-js";
export { createStore, reconcile, produce, unwrap } from "solid-js/store";
