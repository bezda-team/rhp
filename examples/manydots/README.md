# ManyDots prototype

`ManyDots` is an experimental bulk HTML scatter collection exported by `@bezda/rhp` and `@bezda/rhp/standalone`.
Use it explicitly inside a `Chart` with both a value scale and a cross scale.
`Dot` remains available at every point count for custom slat content and individual block behavior.
There is no automatic switch at 500 points.

```jsx
import { Chart, ManyDots } from "@bezda/rhp";

const samples = [
  { id: "a", x: 20, y: 35, group: "warm", color: "#bd355a", diameter: 6, selected: true },
  { id: "b", x: 60, y: 80, group: "cool", color: "#2388b4", diameter: 8, selected: false },
];

export default function App() {
  return (
    <Chart scale={[0, 100]} cross={[0, 100]} height={320} label="Sample measurements">
      <ManyDots
        rows={samples}
        at={row => row.x}
        cross={row => row.y}
        key={row => row.id}
        size="6px"
        pointClass={row => row.group}
      />
    </Chart>
  );
}
```

```css
.warm { background-color: #bd355a; }
.cool { background-color: #2388b4; }
```

## Appearance

`size`, `color`, `shape`, `pointClass`, and `pointStyle` each accept a shared value or a `(row, index) => value` accessor.
Shared sizes, colors, shapes, and centering offsets are written as concrete declarations in one stylesheet per collection.
The stylesheet uses an implicit parent `@scope` in light DOM, so collections and independently rendered server islands keep their own defaults.
The inner container retains shared variables as a fallback for browsers without `@scope` support.
Per-point accessor values become inline declarations.
Coordinates are resolved in JavaScript into percentage `left` and `bottom` declarations, with no per-point axis-variable chain.
Fixed sizes use negative offsets for centering, while percentage and math sizes use calculations appropriate to each axis.
Intrinsic sizes and sizes containing CSS variables retain the browser's size-relative translation behavior.
For custom CSS size transitions with fixed dimensions, transition the centering margins together with width and height to keep the center stationary.
Percentage and math dimensions require coordinating their centering changes in left and bottom with the size transition.

| Prop | Value |
| --- | --- |
| `rows` | Required array of data rows |
| `at`, `cross` | Required numbers or coordinate accessors |
| `key` | Optional stable identity accessor, otherwise the source row index |
| `size` | Diameter as a CSS length or a number of pixels, default `4px` |
| `color` | CSS color or theme key such as `series-1`, default `series-1` |
| `shape` | An rhp `shape()` outline, default circular points |
| `pointClass` | Space-separated application classes |
| `pointStyle` | A Solid CSS properties object for point appearance |

Numeric `size` values are pixels here.
`Dot` instead interprets numeric sizes as a fraction of the slat's band.
For identical marker sizes across the two components, use an explicit CSS length such as `"4px"`.

Unique colors and sizes remain available:

```jsx
<ManyDots
  rows={samples}
  at={row => row.x}
  cross={row => row.y}
  color={row => row.color}
  size={row => row.diameter}
  pointStyle={row => ({ opacity: row.selected ? 1 : 0.4 })}
/>
```

Category classes share reusable application rules without generating one CSS rule per point.
Ordinary application classes can set background color, border radius, opacity, outlines, filters, and transforms.
Explicit per-point color and shape accessors produce inline styles, which take precedence over ordinary class rules for those properties.
Size, color, and shape accessors also take precedence over the same properties supplied through `pointStyle`.
The collection owns `left` and `bottom` coordinates.
Width and height are protected geometry, although explicit inline sizes in `pointStyle` can override a shared size.
Margins, padding, borders, min/max dimensions, position, top/right offsets, and centering are guarded because page-wide box rules can otherwise distort or displace a marker.
The point stylesheet does not apply the general text or font reset used by a slat.

## DOM and updates

The collection uses light DOM, with a host `.rhp-manydots`, one owned stylesheet, one `.rhp-manydots-points` container, and one plain `.rhp-manydot` element per valid row.
Native document queries, Testing Library queries, and page-level event delegation see those elements directly.
Use `getBoundingClientRect()` to position overlays against the visible point box, including application transforms.
Host `class`, `classList`, `style`, `ref`, attributes, and event handlers work as on a normal `div`.
Use the Chart's `label` to name the figure, and provide a textual summary or data table when readers need access to the individual values.
Leaf content and custom per-point handlers are outside this prototype's API.
For text labels or richer point content, compose other rhp blocks or use `Dot` in a slat.
Use native host events for interaction, or keep `Dot` in a `Plot` when you need Plot's selection, keyboard navigation, or readout APIs.

Every point carries `data-rhp-index`, the index of its original row, including when nonfinite coordinates cause preceding rows to be skipped.
A delegated click can recover the row from that attribute:

```jsx
<ManyDots
  rows={samples}
  at={row => row.x}
  cross={row => row.y}
  onClick={event => {
    const point = event.target.closest(".rhp-manydot");
    if (point) console.log(samples[Number(point.dataset.rhpIndex)]);
  }}
/>
```

Both domains must have finite, distinct endpoints.
Nonfinite point coordinates are skipped, and duplicate keys among rendered points throw an error.
Stable keys preserve leaf elements across replacement arrays, reordering, and removals.
One collection computation visits every row when its dependencies change, while unchanged points receive no style writes.
When a point's styles change, its managed declarations are reapplied in order so a shorthand cannot overwrite a cached explicit color or geometry value.
Changing one point therefore avoids style writes to other points, but still requires a bulk row pass.
Native listeners, attributes, and styles outside the collection's managed declarations survive ordinary updates.
Application edits to a managed declaration can be overwritten when that point's managed styles change.
An empty point container uses native DOM property assignment and a document fragment to create its points together, without running update bookkeeping for each new element.
This path also handles later population or repopulation of an empty collection.
Existing leaves retain their keyed element-reuse path, and foreign child nodes are preserved.
Client point construction uses no HTML-string parsing or Trusted Types policy.

Server rendering writes the complete collection with no per-point hydration keys.
Hydration reuses the existing host, container, and leaf elements.
Initial server leaves are adopted by order, after which the client establishes the keyed records for later updates.
Server keys are not serialized, so keep the initial server and client row order aligned when row-specific DOM identity must survive hydration.
When client appearance props differ from the server's props, hydration reconciles shared defaults and removes obsolete server inline declarations before applying the current point styles.
Data changes currently move points immediately, without `Dot`'s per-point transition behavior.
JavaScript-driven Chart scale animation updates the resolved coordinates through the chart's shared frame.

The [comparison benchmark](../../bench/manydots/README.md) measures initial rendering with shared color, ten category classes, and unique per-point colors.
It does not yet establish the crossover point, update performance, or animation cost.
The [performance and capabilities explanation](TRADEOFFS.md) distinguishes optimization tradeoffs from the prototype's existing differences from `Dot`.
