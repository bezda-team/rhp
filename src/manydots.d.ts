import type { JSX } from "solid-js";
import type { Color, Shape } from "./index.js";

/** One appearance or coordinate value, or an accessor evaluated in a single collection update. */
export type ManyDotsValue<T, V> = V | ((row: T, index: number) => V);

/** A light-DOM scatter collection inside a Chart with a cross scale. */
export interface ManyDotsProps<T> extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children" | "innerHTML" | "textContent" | "color" | "style"> {
  rows: readonly T[];
  /** Value-axis coordinate. Nonfinite coordinates omit the point. */
  at: ManyDotsValue<T, number>;
  /** Cross-axis coordinate. */
  cross: ManyDotsValue<T, number>;
  /** Stable point identity; the source row index is used by default. */
  key?: (row: T, index: number) => unknown;
  /** A theme key or literal CSS color. A shared value is resolved once per update. */
  color?: ManyDotsValue<T, Color | null | undefined>;
  /** Diameter: numbers are pixels, strings are CSS lengths. Defaults to 4px. */
  size?: ManyDotsValue<T, number | string | null | undefined>;
  shape?: ManyDotsValue<T, Shape | null | undefined>;
  /** Application classes applied to individual points. */
  pointClass?: ManyDotsValue<T, string | null | undefined>;
  /** Point appearance overrides. The collection retains ownership of coordinates. */
  pointStyle?: ManyDotsValue<T, JSX.CSSProperties | null | undefined>;
  style?: JSX.CSSProperties | string;
}

/** Bulk HTML points with native DOM queries and events, without per-point slats or rendering effects. */
export function ManyDots<T>(props: ManyDotsProps<T>): JSX.Element;
