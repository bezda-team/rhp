# Chart accessor cost and slat wrapper audit

This audit covers the Chart integration added for ManyDots, the repository gallery, standalone recipes and reference examples, and the sibling rhp-documentation repository.
It identifies existing-API cleanup opportunities separately from changes that require new placement or root ownership behavior.
The original audit changed no production examples or library implementation.
The follow-up implements the single-block overlap and Scale cleanup candidates listed below and clarifies the direct-root exception in the guides.
Ordinary Plot, multi-block, and nested-Plot wrappers remain in place.
Direct Cell-root support is tracked separately in [GitHub enhancement #29](https://github.com/bezda-team/rhp/issues/29), with explicit requirements to preserve visual gaps and avoid cell hover or activation over a gap.
The runtime probes used temporary fixtures with the current library source.

## Chart accessors

The additions at [plot.jsx](../src/plot.jsx) create two functions and add two properties to each Chart's already-existing frame object.
They do not create another frame or context provider.

```js
crossShown: () => crossed() ? crossShown() : null,
theme: () => ({ ...theme(), ...props.style }),
```

These functions are constructed once when a Chart is constructed.
Ordinary Plot and Dot paths do not call them.
They add no signals, memos, effects, observers, DOM nodes, style writes, or animation timers to charts without ManyDots.
One Chart containing 10,000 Dots therefore adds two functions, not 20,000 functions.
A page containing 50 Charts adds 100 functions.
Exact allocated bytes and elapsed time depend on the JavaScript engine and were not measured here.
The source establishes fixed mount allocation, with no added callback execution on ordinary chart updates.

The [usePointFrame helper](../src/plot.jsx) reads the existing context and returns one small object per ManyDots collection.
It supplies references to existing orientation and scale accessors plus the new cross/theme readers.
There is no hook call per point.

When ManyDots is used, the costs differ:

| Read | Work |
| --- | --- |
| Value scale | The existing shown() returns a two-number array. |
| Cross scale without animation | Returns the existing cross-domain array. |
| Cross scale with animation | Uses the Chart's existing lazy cross animation state and returns a two-number array. |
| Theme | Copies the existing 15 default theme variables and any Chart style properties into a new object. |

The compiled browser path evaluates the theme reader three times during initial collection construction, for inherited defaults, scoped CSS, and points.
The server path also has three evaluations.
These calls are per collection, outside the point loop.
Additional collections multiply that work.

The dependency breadth is more consequential than the copies themselves.
The current points pass reads the theme even when its colors are literal strings or supplied through classes.
A tracked theme or Chart-style change can therefore rerun the entire row pass, including when the changed property is irrelevant to the visible points.
That is work in an active ManyDots collection, not a global cost on ordinary plots.

Chart static does not freeze data updates.
Static Plot disposes each per-row reactive owner after drawing and redraws rows when collection inputs change.
ManyDots already has no per-point Solid owners or computations and preserves keyed elements through its collection-level update path.
The unused static field returned by usePointFrame is not evidence of a lost static capability.

The new component and its CSS also add package weight.
That is separate from the runtime accessor allocations discussed above.

## The rule for removing wrappers

A Plot already uses the element returned by its slat function directly; it does not add a wrapper of its own.
The wrapper is in the example's template.
Overlap Plot placement deliberately leaves block roots to use their own geometry.
Scale internally uses an overlap Plot, so it can also use a single block root.

```jsx
const Hair = slat(settings, d => (
  <Tick at={d.year} thick={1} class="hair" />
));

<Plot overlap year={[selectedYear]}>{Hair}</Plot>
```

Ordinary non-overlap Plot placement takes ownership of the root's row position and band dimensions.
Its rules override part of a bare block's own geometry.
The existing warning at [plot.jsx](../src/plot.jsx) documents this incompatibility.
The relevant rules are in the placement layer of [rhp.css](../src/rhp.css).

Single-block overlap roots can retain intentional children inside that block.
Existing stacked Bars with text, strip Dots with accessible text, and the linked-views Bar with an SVG child demonstrate this.
Independent sibling blocks that currently measure against the full band cannot simply become children of a smaller mark.

The follow-up also checks the documentation's actual development server.
Solid Refresh wrapped named Line and Area components in accessors, so a direct Line root failed Plot's native-element validation even though production rendering and hydration passed.
The blocks source now uses Solid Refresh's documented `@refresh skip` pragma to keep these native primitives as elements.
The opt-out applies to the library's blocks module; app and example component refresh remains enabled, and changes to the blocks module propagate to its importing parent.
The browser, server, standalone, and CSS production outputs remain byte-for-byte identical after rebuilding with this source pragma.

Before removing a wrapper, check its classes, styles, attributes, refs, handlers, hit area, clipping, stacking, roles, IDs, orientation, and gutter behavior.
For example, a full-band wrapper can provide a larger pointer target than a Dot or SVG stroke.
Descendant selectors may need same-element selectors after classes move onto the block.
Automatic label gutters expect edge labels directly inside the slat root, so text-bearing root conversions need separate scrutiny.

## Existing-API candidates

Each removal saves one element per slat, while retaining the existing per-row Solid and Plot bookkeeping.
The counts below describe the displayed examples, not a measured performance percentage.

| Source | Root candidate | Elements saved | Notes |
| --- | --- | ---: | --- |
| [Gallery RestSlat](../examples/gallery/gallery.jsx), line 773 | Tick | 1 | Scale uses overlap internally. |
| [Scale benchmark Curve](scale/rhp.solid.jsx), line 6 | Line | 1 | One SVG represents the whole series, regardless of point count. |
| [Line recipe Curve](../skills/rhp/recipes/line.html), line 63 | Line | 1 | Single curve with its own styling. |
| [Multi-line Crosshair](../skills/rhp/recipes/multi-line.html), line 143 | Tick | 1 when active | Keep the independent country-line/label wrappers. |
| [Sparklines Crosshair](../skills/rhp/recipes/sparklines.html), line 108 | Tick | 1 | The invisible year interaction bands serve a separate purpose. |
| [Multi-line Mark](../skills/rhp/recipes/multi-line.html), line 148 | Dot | One per country | Move story onto the Dot and change .story .dot to .dot.story. |
| [API Mean](../skills/rhp/references/api.md), line 291 | Tick | 1 | Mean overlay already uses overlap. |
| [API Lisbon](../skills/rhp/references/api.md), lines 750 and 752 | Line and Dot | 13 | One series plus twelve monthly points. |
| [Interaction Trend](../skills/rhp/references/interaction.md), line 387 | Line | 1 | Keep the separate multi-block selected-point overlay. |
| [Design Baseline](../skills/rhp/references/design.md), line 731 | Tick | 1 | Single baseline overlay. |
| rhp-documentation/src/demos/scale-cross-line.jsx, lines 20 and 27 | Line and Dot | 13 | Same Lisbon pattern as the reference example. |
| rhp-documentation/src/gallery/examples/stem-plot/poster/chart.jsx, line 22 | Tick | 1 | Resting line under Scale. |
| rhp-documentation/src/gallery/examples/linked-views/simple/chart.jsx, line 42 | Bar with SVG child | 3 | Rewrite orientation selectors to target the new root directly. |

The linked-views example currently uses .slat:vertical .slice and .slat:horizontal .slice.
Moving slat and slice onto the Bar means those ancestor selectors no longer match.
The isolated equivalent uses .slice:vertical and .slice:horizontal, while retaining the SVG child and inherited color.

## Gallery inventory

The main gallery contains 32 named slat definitions, HourCell, and an inline logo-point callback, for 34 row templates.

| Classification | Templates |
| --- | ---: |
| Already direct block roots | 5 |
| Safe removal with current API | 1 |
| Structurally tempting but currently incompatible | 2 |
| Independent layout, multiple blocks, or row interaction responsibility | 26 |

The already-direct roots are LayerSlat, ChargeSlat, SpineSlat, PatientSlat, and the inline logo Dot.
They avoid approximately 18, 20, 8 to 40, 90, and 270 wrappers respectively in their current examples.
Those counts depend on the data where applicable.

| Wrapper retained | Responsibility |
| --- | --- |
| V1Scale | Tick and independently positioned Label |
| FruitSlat | Name, Bar/image, value, and shared color/filter boundary |
| WindSlat | Name/dial, Bar, value, and row hover |
| BoxSlat | Multiple positioned blocks and shared hover/color boundary |
| MedalSlat | Ribbon, medal, and band hover/stacking |
| TeamSlat | Team Label and grouped Plot |
| DrinkSlat | Name, cup, segment Plot, total, and serving hover |
| BatterySlat | Name, shell, nub, and charge Plot |
| ShelfSlat | Genre, spine Plot, count, and shelf border |
| AgeSlat | Two Bars and three Labels |
| MonthSlat | Month Label, Bar, value, and tinted band |
| NormalSlat | Tick and Label |
| BinSlat | Bar, bin Label, tally Label, and row hover |
| SampleSlat | Bell stem and tip with shared fade/stagger variables |
| KeySlat | Piano-key Bar and changing Label |
| InstrumentSlat | Label, Area, Bar, Dot, and instrument event boundary |
| DayRow | Day Label and perpendicular hourly Plot |
| ArmSlat | Label, patient Plot, mean Tick, and average Label |
| ClimbSlat | Name, route, Dots, and height |
| GoalSlat | Independently positioned blocks and row hover |
| StepSlat | Labels, main/ghost Bars, connector, and cut/click state |
| MonthBandSlat | Shaded Bar and conditional month Label |
| TradeSlat | Labels, job/progress/dimension Bars, and hover |
| TodaySlat | Tick and Label |
| DaySlat | Wick, candle body, conditional Label, and day hit area |
| CrossSlat | Tick and independent price Label |

The README Fruit and React README examples also need their common coordinate-frame divs.
Ordinary grouped-Bar and Cell wrappers in the documentation are not safe overlap-style substitutions.
Scatter and bubble examples with independent coordinate labels require the common frame too.
Invisible year bands in line, multi-line, and sparkline examples provide pointer and keyboard interaction even when their only child is accessible text.

## Larger opportunities requiring placement changes

### Heatmap Cell roots

The gallery has 168 hourly rows.
Eight contain hour labels, while 160 contain only a Cell.
Those 160 single-Cell wrappers are a meaningful future target.

The current bare-root substitution removes 160 elements but does not preserve geometry.
Across Chromium, WebKit, and Firefox, every converted Cell loses its 1px inset, becomes 2px wider and taller, and shifts its origin by 1px.
Color and title remain correct, while the bare-root warning appears.
Supporting this requires combining row placement with Cell gap geometry in the placement layer.
The eight labeled rows can retain wrappers initially.
Similar opportunities exist in heatmap, grouped bars, and plain block examples, but they need explicit supported placement rather than deleting divs.

### Nested Plot roots

Gallery DotRow wraps only a nested Plot, so removing its nine wrappers initially looks attractive.
Returning Plot directly currently throws because the component returns a provider accessor and the browser slat path requires an Element.
The diagnostic fixture explicitly unwrapped it only to investigate the next problem.
All 270 logo Dots then moved incorrectly, with the first row shrinking from 60px to 18px.
The nested root owns --rhp-n:30 and resets --rhp-pitch, while outer row placement needs the parent's count of nine and its 60px pitch.

The documentation's animated-dots simple/poster examples and the waffle recipe have related nested-Plot wrappers.
General support would require separate outer-row and inner-Plot metadata ownership, plus provider resolution, orientation, CSS scope, IDs, roles, and keyboard checks.
This is an architecture change, not an existing-API cleanup.

## Verification and recommendations

Representative direct Line, styled Dot, crosshair Tick, and linked-view Bar variants passed 144 geometry/style/path/pixel comparisons across Chromium, WebKit, and Firefox.
Those comparisons cover static, CSS, and JavaScript modes, both orientations, and initial/changed data.
Screenshots were compared at the same viewport position to avoid translation-dependent SVG rasterization differences.
Native click selection and End-key focus were verified for the marker variant in all three engines.
Chromium server-only, hydrated, and fresh rendering also matched for all four representative variants, with hydration retaining their existing leaves.

The exact Rest Tick styling was separately verified with a 36-row bell setup in all three engines, both orientations, updates, SSR, hydration, and bubbling events.
Scale remains aria-hidden and hydration reuses the server Tick.
No unexpected warnings or page errors occurred in the supported candidates.
These probes establish functional equivalence for the tested variants, not a performance percentage for every example.

The follow-up adopts the single-block overlap and Scale cleanups, together with the required selector and class migration.
Focused direct Cell-root support for dense heatmaps is deferred to enhancement #29.
Keep nested Plot-root support as a separate architecture decision.
The root guidance in references/api.md, the product skill, and the documentation's slat, Plot, Scale, and first-chart guides now explains the overlap and Scale exception.
The guidance also distinguishes children positioned within a block from sibling marks that need a common full-band container.

- [Representative single-block comparisons](results-wrapper-audit-20261005/single-block.json)
- [Representative SSR and hydration checks](results-wrapper-audit-20261005/single-block-ssr.json)
- [Rest Tick SSR, hydration, orientation, and update checks](results-wrapper-audit-20261005/rest-ssr.json)
- [Complete gallery geometry diagnostics, gzip](results-wrapper-audit-20261005/gallery-geometry.json.gz)

## Cleanup validation

The actual main-gallery before/after comparison covers all 20 cards, with 1,440 exact pixel and block geometry comparisons across Chromium, WebKit, and Firefox, desktop and phone widths, both orientations, CSS and JavaScript motion, initial data, New data, and post-ring states.
All 96 bell click, touch, Enter, and Space checks after New data pass with identical resulting waves.
All six benchmark Line cases, 1,000 and 100,000 points in each browser, preserve exact pixels, paths, geometry, and styling while removing one element.
There are no browser errors or warnings in these comparisons.

The three edited recipe pages pass another 144 exact pixel, geometry, style, and text comparisons in the same three engines, at desktop and phone widths, both orientations, and initial, click, keyboard, and touch states.
External fonts are loaded, with shared asset responses frozen between variants.
The capture harness forces a full paint without changing layout or hit targets before comparing images, removing native SVG partial-paint history differences without a pixel tolerance.
All 41 reference JavaScript blocks parse.

The final integrated regression suite passes all 228 checks, including gallery interactions, SSR, hydration, accessibility, types, package builds, and the new development HMR regression.
The documentation gallery checker passes 72 renders of all 46 examples at desktop and phone widths, with its already-documented findings unchanged.
The 30-recipe diagnostic scan reports 28 clean pages and settling-budget diagnostics for the two continuously playing examples.
Separate desktop and phone checks establish that live and race advance, pause, resume, retain stable paused images, and respond to the race slider and keyboard.
Neither playback nor checker behavior is changed to make those diagnostics disappear.

The documentation build produces all 72 pages.
Its 140 bell checks, 68 live style-editor checks, and 22 server-only versus hydrated demo checks pass.
The actual changed documentation views pass 762 before/after checks across 246 states in Chromium, WebKit, and Firefox, on desktop and mobile.
Those states cover both orientations and motion modes where the examples offer them, New data, bell strikes after New data, and linked-view selection and Escape reset.
All chart pixels, mark geometry, content, and expected wrapper reductions agree.
The actual Astro development page hydrates direct Line roots and native Area roots in both orientations in all three engines, with app refresh still enabled and no page errors.
The persistent Vite development regression also passes seven checks in each engine, including native roots, reactive updates, app HMR without a document reload, and a distinct data update after HMR.

- [Actual gallery and benchmark comparisons](results-wrapper-audit-20261005/cleanup-gallery.json)
- [Actual recipe comparisons](results-wrapper-audit-20261005/cleanup-recipes.json)
- [Live and race controls](results-wrapper-audit-20261005/cleanup-live-controls.json)
- [Actual documentation views](results-wrapper-audit-20261005/cleanup-documentation.json)
- [Documentation development integration](results-wrapper-audit-20261005/cleanup-documentation-dev.json)

The temporary source fixtures remain at /private/tmp/rhp-root-wrapper-audit-mySmWW and /private/tmp/rhp-gallery-wrapper-audit.
