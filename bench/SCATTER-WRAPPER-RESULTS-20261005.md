# Scatter point wrapper measurement (October 5, 2026)

The scatter adapter now uses a Dot directly as each overlap slat's root, replacing `<div><Dot /></div>` with `<Dot />`.
The library already supports this form, so no library implementation change was needed.
The line adapter and scatter points that also contain labels were left unchanged.

## Results

Times are milliseconds; lower is better.
Each entry is the median of five fresh pages.

| Points | Frame before | Frame after | Main thread before | Main thread after | Main-thread time reduction |
|---|---:|---:|---:|---:|---:|
| 1,000 | 29.8 | 24.0 | 30.9 | 25.1 | 18.8% |
| 10,000 | 239.9 | 156.1 | 244.9 | 163.1 | 33.4% |

At 10,000 points this is 1.50 times faster, leaving 66.6% of the original main-thread cost.
The requested 10% to 15% target would be 24.5 to 36.7 ms in this comparison.
Wrapper removal alone does not reach that target.

| 10,000-point component | Before (ms) | After (ms) |
|---|---:|---:|
| JavaScript | 32.8 | 29.6 |
| Style calculation | 142.3 | 92.0 |
| Layout | 29.6 | 13.9 |

Connected elements fell from 2,031 to 1,031 at 1,000 points and from 20,031 to 10,031 at 10,000 points.
Style calculation remains the largest measured component.
These duration counters are diagnostic components, not a complete accounting of all main-thread work.

## Method and limitations

Both variants were compiled from one frozen snapshot of the current working tree, including pre-existing source edits.
Only the point wrapper differed between variants.
The benchmark used its existing seeded scatter data, 600px chart width, 400px plot height, static rendering, and original frame harness.
The viewport was 1,000 by 900 CSS pixels.
Before and after ran in alternating order on fresh pages in Chromium 153.0.8010.12 on Apple M5.
Main-thread time includes the two-second window after rendering, matching the existing scale benchmark.
Connected elements were counted outside the timing window.

Other applications were active.
The optional idle gate failed to reach 90% aggregate CPU idle for three consecutive samples within two minutes.
The paired comparison therefore ran under recorded background activity rather than a quiet-machine baseline.
Measured-window CPU idle ranged from 72.7% to 85.4%.
All samples were retained, and the raw results include the failed idle check and per-sample CPU activity.
Treat the timings as a local paired comparison, not an isolated-machine performance guarantee.

## Correctness

The 1,000-point before and after images were pixel-identical, including the axes.
Every point's size and coordinates were checked at both benchmark counts.
The direct-root form also passed 72 geometry checks in Chromium and WebKit across static, CSS reactive, and JS animated modes, initially horizontal and vertical.
Those checks covered coordinate changes, append and remove, scale changes, and orientation changes.
Clicks selected the correct row, and arrow-key and End-key navigation worked in all twelve cases.
There were no page errors.

## Artifacts

- [Raw timings, samples, environment, input hashes, and method](results-scatter-wrapper-20261005/results.json)
- [Correctness results](results-scatter-wrapper-20261005/correctness.json)
- [Changed scatter adapter](scale/rhp.solid.jsx)

The frozen source and compiled variants are retained locally at `/private/tmp/rhp-scatter-wrapper-ee_jfjk9`.
The capture runner is saved alongside the raw results and accepts the frozen snapshot directory as its argument.
A future repeat should capture the then-current source afresh rather than reuse another experiment's binaries.

To replay this captured experiment while the snapshot remains available:

```sh
node bench/results-scatter-wrapper-20261005/measure-loaded.mjs /private/tmp/rhp-scatter-wrapper-ee_jfjk9
```
