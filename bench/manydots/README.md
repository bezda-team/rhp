# ManyDots comparison

This benchmark compares light-DOM `ManyDots` against the existing direct-root `Dot` scatter adapter.
It also measures the original wrapped `Dot` structure for the 10,000-point uniform case, so the requested 10% to 15% cost target has a reference from the same source snapshot.

The three appearance cases use one collection color, ten reusable category classes, and one distinct RGB color per point.
All variants receive the same seeded coordinates and data objects, 4px point diameter, 600px chart width, 400px plot height, domains, axes, and static mode.
Every `Chart` sets its first theme color to `#2878b5`.
The uniform fixtures omit the point color prop, using the shared theme default in both `Dot` and `ManyDots` and avoiding an unnecessary per-point color variable in the baseline.
The category stylesheet supplies `--rhp-color` for the existing `Dot` and ordinary `background-color` for `ManyDots`, scoped to the respective point class.
Both declarations contain the same color.

Run the commands from the repository root.

```sh
node bench/manydots.mjs prepare
node bench/manydots.mjs check --snapshot /private/tmp/rhp-manydots-EXAMPLE
node bench/manydots.mjs run --snapshot /private/tmp/rhp-manydots-EXAMPLE --results bench/results-manydots-EXAMPLE
```

Use the actual snapshot path printed by `prepare`.
Prepare freezes every library source file and fixture into a fresh temporary directory, records hashes and dependency versions, and compiles one browser bundle containing every variant.
The working tree can subsequently change without changing the measured inputs.
Repeat preparation after a source change when measuring that change.

Check validates all point coordinates, sizes, colors, and collection bounds at 1,000 and 10,000 points, and requires exact screenshot equivalence for the complete chart.
Page errors fail the check.
Check and timing are separate commands so correctness tests do not overlap timing.

Run uses five paired repetitions on fresh Chromium pages, reversing variant order on alternate repetitions.
The initial frame follows the existing scale benchmark's `requestAnimationFrame` and `MessageChannel` protocol.
CDP captures main-thread, script, style-calculation, and layout durations through the two-second window after rendering.
Connected elements and all connected DOM nodes are counted outside the timing window.
The CDP node counter is saved only as a diagnostic because it includes detached nodes and can change after garbage collection.

The runner records aggregate CPU idle for every measured sample and for a background sample before each case.
It does not claim an idle-machine baseline.
Stop other benchmark and correctness-test processes before running it, and describe remaining background activity when reporting results.
Every sample is retained in `results.json`, together with medians, paired ratios, environment details, source hashes, and correctness results.

This benchmark measures initial rendering.
It does not establish update, hover, animation, or memory performance, and it does not determine an automatic crossover point between the two components.

## Paired source changes

To compare an optimized ManyDots against its original frozen implementation, use the paired preparation mode.

```sh
node bench/manydots.mjs prepare-pair --baseline /private/tmp/rhp-manydots-ORIGINAL
node bench/manydots.mjs check --snapshot /private/tmp/rhp-manydots-pair-EXAMPLE
node bench/manydots.mjs run --snapshot /private/tmp/rhp-manydots-pair-EXAMPLE --results bench/results-manydots-pair-EXAMPLE
```

Both variants use the same captured current library source, except the `before` variant restores `manydots.jsx` and `manydots.css` from the original frozen snapshot.
Preparation verifies that only these two approved source files differ between variants.
The original data and frame harness are reused, with changes limited to the adapter import and outside-timing geometry selectors.
The paired adapter includes both complete library variants in one browser bundle and supplies identical chart options and point accessors.
It measures five alternating-order pairs at 10,000 points for all three appearance modes.
Each timing sample retains the complete initial and final CDP metric sets, all metric deltas, and duration deltas in milliseconds.
Exact complete-chart pixel equivalence is required before timing.
Tracing marks are not added to the timing fixture.
