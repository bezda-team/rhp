// @bezda/rhp/standalone: rhp with Solid included. Its types are rhp's and Solid's.
export * from "./index.js";
export { render } from "solid-js/web";
export { default as html } from "solid-js/html";
export { createSignal, createMemo, createEffect, createRoot, onMount, onCleanup, batch, untrack, For, Index, Show } from "solid-js";
export { createStore, reconcile, produce, unwrap } from "solid-js/store";
