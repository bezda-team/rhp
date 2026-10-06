# ManyDots performance and capabilities

`ManyDots` keeps one ordinary HTML element per point, with light DOM, per-point appearance, and keyed updates.
Its speed comes from removing work around those elements and simplifying how their geometry and shared styles are resolved.
It remains an explicit alternative to `Dot`, with no automatic switch at any point count.

The final controlled comparison reduces the original ManyDots prototype's 10,000-point median total time by approximately 11 to 12 ms.
The final medians are 62.1 to 64.6 ms, leaving approximately 12.1 to 14.6 ms above the 50 ms target.
The median of the individual paired reductions is 17.3% to 20.2%, which differs from taking a ratio of the separately aggregated medians below.

| 10,000-point appearance | Original ManyDots prototype | Final implementation |
| --- | ---: | ---: |
| Shared color | 75.6 ms | 63.5 ms |
| Ten category classes | 74.3 ms | 62.1 ms |
| Unique colors | 75.8 ms | 64.6 ms |

Style calculation improves by approximately 5 to 6 ms, and other rendering work improves by approximately 5 to 6 ms between the combined variant medians.
Script and layout do not show consistent median reductions in the combined comparison.
The fresh native DOM constructor alone is approximately neutral for shared color and saves approximately 3 ms for category and unique-color cases in its separate comparison.
These measurements do not establish a speed ordering between styling modes.

## What work was removed

The earlier direct-root `Dot` change removed one wrapper element per point.
That change kept the existing Dot and Plot behavior.
Choosing a direct-root slat changes its DOM nesting, so wrapper-specific child selectors need adjustment.
The subsequent `ManyDots` prototype replaced individual slats and rendering computations with a bulk row pass, resolved coordinates in JavaScript, and replaced the general slat guard with a narrow geometry stylesheet.
The prototype preserved unique colors and category classes.
Those mechanisms were measured together, so the prototype measurement does not assign an independent saving to each one.

The centering optimization replaced the default marker's percentage translation with half-size offsets.
This reduced other rendering work by approximately 5 to 7 ms in the paired 10,000-point measurement.
Sizes that depend on CSS variables or intrinsic dimensions retain native size-relative translation.
The shared CSS optimization writes concrete dimensions, color, and clipping into one scoped stylesheet per collection.
It reduced style calculation by approximately 2 to 5 ms in its separate paired measurement.
The fresh construction optimization creates points with native DOM property assignment and a document fragment, initializing their keyed records without running the update diff for each new element.
It also handles later population or repopulation when the container is empty.
Hydration and subsequent updates retain the element-reuse path.
An HTML-parser experiment increased total time by approximately 5% to 14%, with script medians approximately 7 ms higher, so that candidate was rejected.
The final client constructor does not serialize markup, parse an HTML string, or add Trusted Types policy branches.

The [centering results](../../bench/MANYDOTS-CENTERING-RESULTS-20261005.md), [shared CSS results](../../bench/MANYDOTS-SCOPED-CSS-RESULTS-20261005.md), [fresh DOM results](../../bench/MANYDOTS-FRESH-DOM-RESULTS-20261005.md), and [combined results](../../bench/MANYDOTS-COMBINED-RESULTS-20261005.md) contain the controlled measurements.
The [rejected parser results](../../bench/MANYDOTS-FRESH-MOUNT-RESULTS-20261005.md) preserve every sample from that unsuccessful experiment.
Savings from separate experiments should not be added together as if they were one measurement.

## What remains available

Shared, category-based, and unique per-point colors remain supported.
Per-point sizes, shapes, classes, opacity, outlines, filters, and transforms remain supported.
Application classes can override the ordinary appearance defaults.
Native document and Testing Library queries can reach the points, and page-level events can see their original targets.
Delegated handlers can recover the original row through `data-rhp-index`.
Keyed replacements, reordering, removals, server rendering, hydration, independently rendered islands, and Chart scale animation remain supported.
The implementation uses no shadow root, canvas, point sampling, or coordinate quantization.
It retains every valid input point.

## Tradeoffs introduced by these optimizations

| Change | Consequence |
| --- | --- |
| Centering with explicit half-size offsets | Custom CSS size animations must coordinate fixed-size margins or percentage/math coordinate adjustments with width and height; variable-based and intrinsic sizes retain the native translation fallback. |
| Centering affects layout offsets | `offsetLeft` and `offsetTop` can differ even when the visible point box matches, so use `getBoundingClientRect()` for overlays. |
| Concrete scoped shared CSS | One style element and its text are added per collection; browsers without native `@scope` use inherited-variable fallback styling and do not receive the measured CSS speed benefit. |
| Custom rendering effects | Opacity, filters, transforms, and clipped shapes can add rendering work whose performance is not established by the benchmark's opaque 4px circles. |
| Style changes on an existing point | Managed declarations are reapplied in order for that point to preserve shorthand precedence, which can write additional unchanged declarations on the affected point. |

The Trusted Types checks isolate native point construction using already warmed Solid templates.
They establish that ManyDots does not create its own policy or pass point markup through an application default policy.
They do not establish that an entire Solid application can start under any Trusted Types policy.
Style-attribute policy checks confirm native point property assignment still works while comparing enforcement in active and inert documents.
There is no policy-dependent point construction path in the final implementation.

## Existing differences from Dot

These limitations were already part of the ManyDots prototype, before the centering, shared CSS, and first-render changes.

| Capability | ManyDots contract |
| --- | --- |
| Rich point content | Leaves are plain points, so use Dot and other blocks for text, nested content, or custom slats. |
| Slat-specific selectors | Leaves use `.rhp-manydot`, so adapt selectors that expect `.rhp-dot`, a slat root, or a wrapper. |
| Plot interaction | Plot's selection, keyboard navigation, and readout APIs are not built into ManyDots; native host handlers and delegated interaction remain available. |
| Per-point handlers | There is no handler accessor for each leaf; attach host handlers or use delegated native events. |
| Data transitions | Data changes take effect immediately, without Dot's per-point transition behavior; shared Chart scale animation remains available. |
| Fine-grained row computation | A dependency change visits all rows, even when only one point changes, while reusing stable keyed elements. |
| Initial hydration identity | Server keys are not serialized, so align the initial server and client row order when row-specific DOM identity must survive positional adoption; client keys govern subsequent updates. |
| CSS guard | Geometry is protected, with appearance open to application CSS and no full slat text or font reset. |
| Geometry customization | Coordinates, centering, padding, and borders are guarded; use size or explicit pointStyle width and height for dimensions, and outlines for marker edging. |
| Numeric size | Numbers mean pixels, rather than Dot's fraction of a slat band; explicit CSS lengths work in both components. |

## Correctness improvements and measurement limits

The work also reconciles current client shared defaults and removes obsolete server inline styles during hydration, while preserving the existing elements.
Point-style updates preserve shorthand and explicit accessor precedence by applying managed declarations in order when a point's styles change.
Native listeners, attributes, and unmanaged styles survive ordinary updates, while application edits to managed declarations can be overwritten when that point's managed styles change.
Valid vendor-prefixed pointStyle property names are accepted according to the browser's CSS support.
These are correctness improvements, with no measured initial-render saving assigned to them.

The measurements cover initial rendering of 10,000 points in Chromium on the recorded machine, with shared color, ten category classes, or unique inline colors.
They include recorded background activity and preserve every sample.
They do not establish update, hover, animation, server-rendering, or memory performance, a crossover point between Dot and ManyDots, or a universal device timing.
