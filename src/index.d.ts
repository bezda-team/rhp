// rhp's types. A plot is a stack of slats: a slat is a function of one row of data (d) that returns one element, and
// blocks (Bar, Dot, Tick, Label, Cell, Area) draw inside it.
import type { JSX } from "solid-js";

/** "horizontal": bars run left to right and slats stack top to bottom, as rows. "vertical": bars run bottom to top, slats side by side, as columns. */
export type Orientation = "horizontal" | "vertical";

/** A row as a slat sees it: each data group by name, its row number (index) and its place on screen (position, null when hidden). */
export type Row<T extends object = Record<string, any>> = Readonly<T> & {
  readonly index: number;
  readonly position: number | null;
};

/** A theme key or any CSS color. A theme key follows the page's theme: "series-1", "positive", "muted"... */
export type Color =
  | `series-${number}`
  | "positive"
  | "negative"
  | "ink"
  | "muted"
  | "grid"
  | "surface"
  | "low"
  | "high"
  | (string & {});

/** A coordinate of a shape: a share of the block's box (0 to 1), or a CSS length. A length that starts with a minus
 * is measured back from the far end ("-26px" is 26px in from the block's end), which is what a cap wants. */
export type Coord = number | string;

/** One step of a shape, in SVG's commands: move, line, a quadratic curve, a cubic curve, or close. */
export type ShapeCommand =
  | ["M", Coord, Coord]
  | ["L", Coord, Coord]
  | ["Q", Coord, Coord, Coord, Coord]
  | ["C", Coord, Coord, Coord, Coord, Coord, Coord]
  | ["Z"];

/** A shape a block can wear instead of its rectangle: made by shape(), given to a block's `shape`. */
export interface Shape {
  /** Whether it holds a curve (and so needs clip-path: shape(), with lines as the fallback). */
  readonly curved: boolean;
  /** Its clip for a chart drawn this way, made once per direction and kept. */
  clip(vertical: boolean, backward: boolean): string;
}

/** A timing curve: a CSS name, cubic-bezier numbers, or a function of 0..1. */
export type Ease = "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out" | [number, number, number, number] | ((t: number) => number);

/** Ticks: a list of values, about that many round values, a function of the scale's [min, max], or false for none. */
export type Ticks = readonly number[] | number | ((range: [number, number]) => number[]) | false;

/** What a tick shows: text, or elements. */
export type Format = (value: number) => JSX.Element;

/** A value for both orientations, or one for each. */
export type PerOrientation<T> = T | { horizontal?: T; vertical?: T };

/** Room outside the plot in px, named along the value axis (start, end) and along the stack (before, after). */
export interface Room {
  start?: number | "auto";
  end?: number | "auto";
  before?: number;
  after?: number;
}

/** A slat type's own CSS and layout. */
export interface SlatLayout {
  /** CSS scoped to this type's slats. Theme colors are var(--rhp-<key>); :horizontal and :vertical match an orientation.
   * A list is joined, so a look someone else wrote is taken as it is and added to: css: [WEATHER, own]. */
  css?: string | readonly (string | null | undefined)[];
  /** px per slat along the stack: a row's height, or a column's width. Without one, slats share what the chart has: a
   * vertical chart's width, a horizontal chart's height (one with no height gives its slats 32px each and grows with them). */
  thickness?: PerOrientation<number>;
  /** The empty share of the band on each side of a Bar, Tick or Area (0.18 by default), or a CSS length. */
  inset?: PerOrientation<number | string>;
  /** Room for what the slat draws outside the plot. "auto" sizes start or end to the widest edge label. */
  room?: PerOrientation<Room | "auto">;
}

/** A slat: one element per row. */
export type Slat<T extends object = Record<string, any>> = ((d: Row<T>) => JSX.Element) & { layout?: SlatLayout; css?: string; scope?: string };

/** An order function: the position of each row, from the rows and their current positions (like sortBy()). */
export type OrderFn = (rows: Row[], current: readonly (number | null)[]) => (number | null)[];

export interface Timing {
  /** ms a value takes to move (150 by default). */
  duration?: number;
  ease?: Ease;
  /** ms a slat takes to slide to a new place (175 in the JS version by default). */
  slide?: number;
}

/** The colors and font a chart draws with. */
export interface ThemeValues {
  series?: string[];
  positive?: string;
  negative?: string;
  ink?: string;
  muted?: string;
  grid?: string;
  surface?: string;
  low?: string;
  high?: string;
  font?: string;
}

type Ref<E> = E | ((el: E) => void);

export interface ChartProps {
  /** [min, max] of the value axis ([0, 100] by default). */
  scale?: readonly [number, number];
  orientation?: Orientation;
  /** The plot's height in px (240 by default when vertical). A horizontal chart with a height fits slats without a thickness into it. */
  height?: number;
  /** The axis' ticks (5 round values by default); a Scale inside draws its own instead. */
  ticks?: Ticks;
  format?: Format;
  /** true for the JS version, where the numbers themselves move; or its timing. The Plots inside take it too. */
  animate?: boolean | Timing;
  /** Theme keys for this chart, over those of a Theme around it. */
  theme?: ThemeValues;
  /** For data that doesn't change: each row is drawn once and keeps no signals. */
  static?: boolean;
  /** A second axis across the band, [min, max]: an overlap Plot's slats share the whole plot, and a Dot, Label or Line takes
   * a cross value on it (scatter plots, lines). */
  cross?: readonly [number, number];
  /** The cross axis' ticks (5 round values by default, false for none). */
  crossTicks?: Ticks;
  crossFormat?: Format;
  /** Names the chart for screen readers, which then read it as a figure. */
  label?: string;
  id?: string;
  class?: string;
  role?: string;
  style?: JSX.CSSProperties;
  ref?: Ref<HTMLDivElement>;
  children?: JSX.Element;
  [aria: `aria-${string}`]: string | undefined;
}

/** A Plot's own settings. Every other prop is a data group: a list (one item per row) or one value for every row. */
export interface PlotSettings<T extends object = Record<string, any>> {
  children: Slat<T> | ((d: Row<T>) => JSX.Element);
  /** Positions (null hides a row) or an order function like sortBy(). */
  order?: readonly (number | null)[] | OrderFn;
  /** How slats change places: slide on screen (the default), move in the page, or refill the slots. */
  reorder?: "slide" | "move" | "refill";
  /** The Chart's or the Plot's around it by default; "across" is the other one. */
  orientation?: Orientation | "across";
  /** Every slat in one band: stacked segments, strips of dots, layers. */
  overlap?: boolean;
  /** The number of rows (the longest data group by default). */
  slats?: number;
  /** A data group name, or a function of the row, that identifies a row, so a removed row takes its own slat with it. */
  key?: string | ((d: Row<T>) => unknown);
  /** Rows as objects, their keys read like data groups. */
  rows?: readonly object[];
  /** The JS version for every data group of numbers (true), for some of them (their names), or with a timing. */
  animate?: boolean | readonly string[] | (Timing & { groups?: readonly string[] });
  /** A Plot inside a slat fills this share of the band (or a CSS length). */
  thick?: number | string;
  static?: boolean;
  /** The slats take focus: Tab stops at one slat, the arrow keys go to the slat before or after it (in the order shown), and
   * Home and End to the first and last. */
  keyboard?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  ref?: Ref<HTMLDivElement>;
}

export type PlotProps<T extends object = Record<string, any>> = PlotSettings<T> & { [group: string]: unknown };

/** What each tick's slat sees in a Scale. */
export interface ScaleTick {
  /** The tick's value. */
  at: number;
  /** The next tick's value (the scale's max for the last). */
  next: number;
  first: boolean;
  last: boolean;
  /** px from the tick to the end of the scale, once measured in the browser (Infinity before). */
  toEnd: number;
}

export interface ScaleProps {
  ticks?: Ticks;
  class?: string;
  style?: JSX.CSSProperties;
  children: Slat<ScaleTick> | ((t: Row<ScaleTick>) => JSX.Element);
}

type BlockProps = Omit<JSX.HTMLAttributes<HTMLDivElement>, "color" | "style"> & {
  style?: JSX.CSSProperties | string;
  children?: JSX.Element;
};

export interface BarProps extends BlockProps {
  /** An outline to wear instead of its rectangle, from shape(). */
  shape?: Shape;
  /** Where the bar starts on the value axis (0 by default). */
  from?: number;
  /** Where it ends. */
  to?: number;
  /** Its size across the band: a CSS length, or a share of the band (0.6). */
  thick?: number | string;
  color?: Color;
}

export interface DotProps extends BlockProps {
  /** An outline to wear instead of its circle, from shape(). */
  shape?: Shape;
  /** Its value on the value axis. */
  at?: number;
  /** Its diameter: a CSS length (10px by default), or a share of the band. */
  size?: number | string;
  /** Where it sits across the band, 0 to 1 (0.5 by default). */
  across?: number;
  /** Its value on the Chart's cross scale (a scatter plot's y), instead of across. */
  cross?: number;
  color?: Color;
}

export interface TickProps extends BlockProps {
  /** An outline to wear instead of its rectangle, from shape(). */
  shape?: Shape;
  at?: number;
  /** Its length across the band: a CSS length, or a share of the band. */
  thick?: number | string;
  color?: Color;
}

export interface PlaceProps extends BlockProps {
  /** Its value on the value axis. */
  at?: number;
  /** Where it sits across the band, 0 to 1 (0.5 by default). */
  across?: number;
  /** Its value on the Chart's cross scale, instead of across. */
  cross?: number;
}

export interface CellProps extends BlockProps {
  /** An outline to wear instead of its rectangle, from shape(). */
  shape?: Shape;
  /** Colored on the scale, from the theme's low to its high. */
  value?: number;
  color?: Color;
}

export interface LabelProps extends BlockProps {
  /** An outline to wear instead of its box, from shape(). */
  shape?: Shape;
  /** Just after this value (or before it, with side="before"). */
  at?: number;
  side?: "after" | "before";
  /** Outside the track, in the chart's gutter: names at the start, totals at the end. */
  edge?: "start" | "end";
  /** Its value on the Chart's cross scale (a point's label). */
  cross?: number;
}

export interface LineProps extends Omit<JSX.SvgSVGAttributes<SVGSVGElement>, "color" | "style" | "fill"> {
  /** [x, y] pairs: x on the value axis, y across the band (or on the Chart's cross scale). In any order: out of x's order, a
   * connected scatter plot. */
  points?: readonly (readonly [number, number])[];
  /** Across the band, the y that fills it (the largest y by default). Not used on a cross scale. */
  peak?: number;
  /** Also fill what is under the line, down to the band's edge or, on a cross scale, down to base. */
  fill?: boolean;
  /** Where the fill ends on a cross scale (0 by default). */
  base?: number;
  /** Join the points with curves instead of straight lines. */
  smooth?: boolean;
  color?: Color;
  style?: JSX.CSSProperties | string;
}

export interface AreaProps extends Omit<JSX.SvgSVGAttributes<SVGSVGElement>, "color" | "style"> {
  /** [x, y] pairs, sorted by x, y >= 0. */
  points?: readonly (readonly [number, number])[];
  /** The y that fills the band (the largest y by default). */
  peak?: number;
  /** Drawn both ways from the middle of the band (violins), not up from its edge (ridgelines). */
  mirror?: boolean;
  /** Join the points with curves instead of straight lines. */
  smooth?: boolean;
  color?: Color;
  style?: JSX.CSSProperties | string;
}

export function Chart(props: ChartProps): JSX.Element;
export function Plot<T extends object = Record<string, any>>(props: PlotProps<T>): JSX.Element;
export function Scale(props: ScaleProps): JSX.Element;
export function Theme(props: { value: ThemeValues; children?: JSX.Element }): JSX.Element;
export function Axis(props: { ticks: readonly number[]; format?: Format }): JSX.Element;

export const Bar: (props: BarProps) => JSX.Element;
export const Dot: (props: DotProps) => JSX.Element;
export const Tick: (props: TickProps) => JSX.Element;
export const Cell: (props: CellProps) => JSX.Element;
/** A place on the chart and nothing else: no size and nothing drawn, so whatever you put inside it sits at its value. */
export const Place: (props: PlaceProps) => JSX.Element;
export const Label: (props: LabelProps) => JSX.Element;
export function Area(props: AreaProps): JSX.Element;
/** A line through points: a sparkline in a slat, or on a Chart's cross scale a line chart. */
export function Line(props: LineProps): JSX.Element;

/** An outline for a block to wear instead of its rectangle, drawn in the block's own box: the first coordinate of
 * each point runs along the value axis, from the block's start to its end, and the second across the band. rhp turns
 * it for a vertical chart and for a bar that runs backward, so one shape is written once.
 *
 *     const gable = shape(["M", 0, 0], ["L", "-26px", 0], ["L", 1, .5], ["L", "-26px", 1], ["L", 0, 1], ["Z"]);
 *     <Bar to={d.roof} shape={gable} />
 */
export function shape(...commands: ShapeCommand[]): Shape;
export function shape(commands: readonly ShapeCommand[]): Shape;

/** A slat type: the slat function with its own CSS and layout, so it looks and lays out the same in any app. */
export function slat<T extends object = Record<string, any>>(fn: (d: Row<T>) => JSX.Element): Slat<T>;
export function slat<T extends object = Record<string, any>>(layout: SlatLayout, fn: (d: Row<T>) => JSX.Element): Slat<T>;
/** New CSS for a slat type (made with css): its slats restyle in place. For style editors and live previews. */
export function restyle(type: { scope?: string; css?: unknown }, css: string | readonly (string | null | undefined)[]): void;
/** Call where the app starts, on the server and in the browser, when the page links @bezda/rhp/rhp.css itself. */
export function linkedCss(): void;

/** rhp's default theme. */
export const THEME: Required<ThemeValues>;
/** Item i of a data group (a list wraps around; one value is every row's). */
export function at<T>(group: T | readonly T[], i: number): T | undefined;
/** The orientation of the Plot around, as a signal. */
export function useOrientation(): () => Orientation;
/** A data group of theme colors through the series: "series-1", "series-2"... */
export function series(n?: number): (d: Row) => `series-${number}`;

/** An order function that sorts rows by a data group (or a function of the row), keeping ties where they are on screen. */
export function sortBy(key: string | ((d: Row) => unknown), direction?: "asc" | "desc"): OrderFn;
/** A data group that repeats a list over the rows (palettes). */
export function cycle<T>(list: readonly T[]): (d: Row) => T;
/** [smallest, largest]. */
export function extent(values: Iterable<number>): [number, number];
/** Ticks at every multiple of step in the scale; with ends, its min and max too. */
export function every(step: number, options?: { ends?: boolean }): (range: [number, number]) => number[];
/** A round scale covering lo..hi with about count ticks. */
export function nice(lo: number, hi: number, count?: number): { min: number; max: number; step: number; ticks: number[] };
/** Stacked segments: positive values stack up from 0, negative ones down. */
export function stackUp(values: readonly number[]): { from: number[]; to: number[] };
/** Each value as a share of the total, scaled to total (100 by default). */
export function shares(values: readonly number[], total?: number): number[];
/** Running totals for a waterfall. */
export function running(changes: readonly number[]): { from: number[]; to: number[] };
/** Box and whisker numbers; low and high are the whisker ends (1.5 x IQR). */
export function summary(samples: readonly number[]): {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  low: number;
  high: number;
  mean: number;
  outliers: number[];
};
/** Histogram bins: bin k covers x0[k]..x1[k] and holds tally[k] samples. */
export function bins(samples: readonly number[], options?: { domain?: [number, number]; count?: number }): { x0: number[]; x1: number[]; tally: number[] };
/** A Gaussian kernel density estimate: points pairs of [x, density] (for Area). */
export function density(samples: readonly number[], options?: { domain?: [number, number]; points?: number; bandwidth?: number }): [number, number][];

/** A value that moves to each new value over time: the reader gives the value to draw now, or ms ahead. */
export function animated<T>(read: () => T, settings?: () => { duration?: number; ease?: Ease }): (ahead?: number) => T;
/** A timing curve as a function of 0..1. */
export function curve(ease?: Ease): (t: number) => number;
