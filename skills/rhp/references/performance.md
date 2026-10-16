# Keeping a big chart light

Use this reference when a finished chart has measurable interaction or loading costs, particularly with many slats or many blocks per slat.
Measure the chart before choosing an optimization.
These patterns preserve rhp's slats, blocks, nested Plots, and public APIs.
They do not require any particular interaction.

## Measure the work

Count elements in the page and hidden slats, and observe attribute and child-list mutations during a representative action.
Separate DOM writes from rendering cost: fewer JavaScript writes can still cause the browser to restyle and paint many marks.
Compare actual interaction latency as well as counts when speed matters.

```js
const chart = document.querySelector('.rhp-chart');
console.log(chart.querySelectorAll('*').length);
const changes = [];
const observer = new MutationObserver(records => changes.push(...records));
observer.observe(chart, { subtree: true, attributes: true, childList: true });
// Perform the action, then disconnect and inspect changes.
```

## Switch mark colors through a slat class

When one slat's state changes many marks' colors, give the marks their colors once and switch a CSS variable through a class on the owning slat.
Keep the `color` API so all consumers of the mark's color, including outlines or descendant styling, continue to see the active color.
A generic `background` shorthand override can erase background images and changes only that paint property.
Use an override of a specific paint property only when that is the intended behavior of the existing chart.

```js
const Segment = slat({
  css: `
    .seg { --active-tone: var(--base-tone); }
    .lit .seg { --active-tone: var(--lit-tone); }
  `,
}, s => html`
  <${Bar} class="seg" from=${() => s.from} to=${() => s.to}
    color="var(--active-tone)"
    style=${() => ({ '--base-tone': s.tone, '--lit-tone': s.gold })} />`);

const Shelf = slat({ thickness: 24, room: { start: 70, end: 40 } }, d => html`
  <div class=${() => d.lit ? 'shelf lit' : 'shelf'}>
    <${Label} edge="start">${() => d.name}<//>
    <${Plot} overlap=${true} from=${() => d.from} to=${() => d.to}
      tone=${() => d.tones} gold=${() => d.golds}>${Segment}<//>
  </div>`);
```

`tone` and `gold` here are CSS colors, including theme variables such as `var(--rhp-series-8)`, rather than bare theme-key strings.
Keep their data groups independent of the interaction state.
Continue passing reactive getters when the underlying data or palette can change.
Only the shelf's `lit` data group needs to read the state that chooses the highlighted shelf.
This does not change how the chart chooses that state.

Put the rule in the `css` of the slat type that owns the mark, here `Segment`.
Its selector may name ancestors inside the same chart, including the shelf root.
A shelf's slat CSS does not style another nested slat type's marks.
See api.md, “Slat CSS scope”.

## Put shared dimming state on a parent

When a shared selection dims many slats, a class on their Plot or grouping slat can replace a flag rewritten on every row.
Keep the classes that identify the exceptions.
For example, inside the mark-owning slat's CSS:

```css
.picking .shelf:not(.lit):not(.pointed) .seg { opacity: .3; }
```

Set `picking` on a Plot or slat root inside the chart when the existing interaction has an active selection.
Keep `lit` and `pointed` consistent with the existing selection and preview behavior.
Charts with multiple selections, disabled marks, separate groups, or other exceptions need selectors that preserve all those states.
A class outside the chart, on the poster for example, is outside slat CSS's ancestor scope.

## Render hidden slats' contents conditionally

A Plot row whose `d.position` is `null` is hidden, but its contents normally remain mounted and reactive.
For expensive rows hidden by a filter or top-N view, Solid's `Show` can leave only the slat root mounted:

```js
const Shelf = slat({ thickness: 24, room: { start: 70, end: 40 } }, d => html`
  <div class=${() => d.lit ? 'shelf lit' : 'shelf'}>
    <${Show} when=${() => d.position != null}>
      <${Label} edge="start">${() => d.name}<//>
      <${Plot} overlap=${true} from=${() => d.from} to=${() => d.to}
        tone=${() => d.tones} gold=${() => d.golds}>${Segment}<//>
    <//>
  </div>`);
```

This is normal Solid composition and retains rhp's slat design.
Keep the root outside `Show`, so rhp retains its identity, position, focus target, and keyboard order.
The contents mount when the row receives a position and unmount when it loses that position.
Check leaving animations against when the chart's own order actually becomes `null`.

State owned by the slat root survives this cycle.
State, native input values, subscriptions, and effects owned inside the conditional content follow Solid's mount and cleanup lifecycle.
Keep state that must survive in the root or application, or leave that content mounted.
Showing many rows at once can cost more because their blocks must be created then.
Measure that action before deciding whether this tradeoff suits the chart.

Automatic gutters already follow the visible edge labels in the tested eager and conditional versions.
Both widened when a longer label became visible, with identical widths before and after filtering.
Conditional rendering does not by itself require fixed room.
Verify the chart's gutter geometry, including its own sizing constraints, when changing which labels are mounted.

## Verified example and limits

The vocabulary article already uses these patterns.
A review on 2026-10-16 compared four isolated variants of the article at source commit `4101fdb`: eager contents with per-mark color and dimming updates, then each optimization added in turn.
The test used Chromium and WebKit, widths 1280 and 390, and dark and light themes, for 32 configurations.

| Measurement | Earlier implementation | Optimized implementation |
|---|---:|---:|
| Style writes for one tested shelf hover | 14 | 0 |
| Shelf class changes for that hover | 1 | 1 |
| Changed DOM nodes in the era chart after opening a rapper | 122 | 9 |
| Page elements at desktop rest | 3,101 | 1,449 |
| Descendants retained inside hidden ranking slats | 1,652 | 0 |
| Retained JS heap after collection, Chromium desktop | 16.7 MB | about 10 MB |

These figures describe this page and these actions, not a complexity or frame-rate guarantee.
Visible mark geometry, computed colors and opacity, readout text, tab order, and accessible breakdown content matched in seven states: rest, hover, open breakdown, normalized measure, era filter, show all, and search.
The hovered ranking screenshots matched pixel for pixel in all eight engine/width/theme combinations.
Color transition values matched at 0, 100, and 200ms, and face dimming matched at 0, 100, and 250ms in both engines.
A separate lifecycle fixture verified root identity, root-owned state, arrow-key navigation, nested state reset, native input reset, and cleanup behavior in both engines.
The color-variable example above was also checked with reactive palette changes, an outline that consumes the mark color, and a background image in both engines.

In five fresh-page trials per action at 390px with Chromium CPU throttled 4 times, showing all 149 rows took a median 175ms with mounted contents and 258ms with conditional contents, measured from the action through two animation frames with reduced motion.
Search medians were 239ms and 217ms respectively, with overlapping ranges (206 to 310ms and 195 to 310ms), so these trials establish no consistent search advantage or regression.
CPU throttling is a reproducible browser test setting, not a measurement on a particular phone.

## Validate the specific chart

Compare before and after at the same viewport, theme, scroll position, and interaction state.
Check geometry, colors, labels, readouts, keyboard navigation, touch actions, and accessibility content.
For motion, pause animations at equal times from their starts and compare intermediate frames as well as settled output.
Use a before-versus-before control when screenshots vary between identical builds.
Run the checker again after the change.

Use the class patterns when they reduce measured work and preserve the chart's styling and state semantics.
Choose conditional contents when their lifecycle and reveal cost fit the chart, and explain a material tradeoff to the user before changing existing behavior.
No pattern here removes an rhp capability or calls for replacing slats with a different rendering model.
