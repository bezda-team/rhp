// @bezda/rhp-react: rhp charts as React components. Everything @bezda/rhp/standalone exports is exported here too.
import type { CSSProperties, FunctionComponent } from "react";
import type { JSX } from "solid-js";

export * from "@bezda/rhp/standalone";

/** Turns a chart drawn by draw(props) into a React component. Read the props inside functions (() => props.sold) so the
 * chart follows them; className and style go on the <div> the chart draws into. */
export function toReact<P extends object>(draw: (props: P) => JSX.Element): FunctionComponent<P & { className?: string; style?: CSSProperties }>;
