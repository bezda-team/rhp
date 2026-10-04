// @bezda/rhp/standalone: rhp with Solid included. Its types are rhp's and Solid's.
export * from "./index.js";
export { render } from "solid-js/web";
export { default as html } from "solid-js/html";
export { createSignal, createMemo, createEffect, createRoot, createSelector, createComputed, on, onMount, onCleanup, batch, untrack, mergeProps, splitProps, For, Index, Show, Switch, Match } from "solid-js";
export { createStore, reconcile, produce, unwrap } from "solid-js/store";
