# rhp-react against rhp, measured on 2026-11-11 and 2026-11-12

Each file is one run of `run.mjs`: paired rounds with an A/A control (the base again), every sample kept.
`base` is rhp for Solid as on branch `react-rewrite`, and `react` is rhp-react (`react/src`) on the same shared core, drawing the same charts (`scenarios-react.jsx`); `verify.mjs` found every box and pixel the same in all 11 scenarios before the runs.
Chromium (Playwright's build, headless), on an Apple M5 MacBook Air in use during the runs (VS Code, Chrome, and another project's study runs during `mount-a.json`), so the A/A noise is wide: a change is only real where its interval leaves out 0 and it is larger than the noise.

| File | What it measures |
|---|---|
| `mount-a.json`, `mount-b.json` | two runs of the first chart on a page (cold) and the fastest of 4 more (warm): 20 bars, 1,000 bars, 50 charts of 7 bars, a 50 by 50 heatmap, 1,000 dots |
| `one.json` | one value of 1,000 bars changed, in the CSS and the JS version: the 24 frames after it |
| `all.json`, `sort.json`, `scale.json` | every value changed, every row reversed, the scale from 0..100 to 0..150: the 24 frames after |
| `stream.json` | one value changed in every frame for 120 frames, as a dragged slider: work per frame |

The tables below are made from the runs' logs.
"Script" is the main thread's JavaScript; "style" and "layout" the browser's work on the page that the chart makes.

## Mount, run b (16 rounds)

| scenario | metric | rhp (Solid), ms | rhp-react, ms | change [95%] | A/A noise | |
|---|---|---:|---:|---|---|---|
| bars20 | cold.frame | 17.59 | 16.49 | +1.8% [-15.5, +21.9] | ±14.7% | same (interval includes 0) |
| bars20 | warm.frame | 2.64 | 4.21 | +38.9% [+8.8, +82.8] | ±28.7% | differs |
| bars20 | warm.script | 0.76 | 1.84 | +100.6% [+50.8, +165.3] | ±29.0% | differs |
| bars20 | warm.style | 0.79 | 0.79 | +0.8% [-11.7, +27.2] | ±31.2% | same (interval includes 0) |
| bars20 | warm.layout | 0.30 | 0.43 | +18.8% [-13.9, +62.1] | ±30.3% | same (interval includes 0) |
| bars1000 | cold.frame | 62.02 | 61.48 | +4.6% [-6.9, +18.6] | ±13.6% | same (interval includes 0) |
| bars1000 | warm.frame | 37.52 | 39.20 | +6.6% [-2.0, +16.9] | ±6.7% | same (interval includes 0) |
| bars1000 | warm.script | 6.50 | 8.34 | +32.6% [+12.2, +54.8] | ±19.8% | differs |
| bars1000 | warm.style | 17.48 | 17.88 | +3.6% [-5.7, +12.5] | ±9.5% | same (interval includes 0) |
| bars1000 | warm.layout | 6.17 | 6.11 | +0.7% [-2.9, +5.1] | ±4.8% | same (interval includes 0) |
| dash50 | cold.frame | 43.88 | 45.33 | +4.8% [-5.9, +22.0] | ±12.3% | same (interval includes 0) |
| dash50 | warm.frame | 25.29 | 27.57 | +0.8% [-8.6, +12.0] | ±23.6% | same (interval includes 0) |
| dash50 | warm.script | 7.56 | 9.56 | +22.0% [+9.6, +38.5] | ±31.3% | within noise |
| dash50 | warm.style | 9.03 | 10.03 | +1.1% [-7.9, +16.0] | ±24.5% | same (interval includes 0) |
| dash50 | warm.layout | 3.51 | 3.57 | -3.7% [-11.4, +6.5] | ±23.7% | same (interval includes 0) |
| heat50 | cold.frame | 51.12 | 49.45 | -2.2% [-10.3, +7.6] | ±10.9% | same (interval includes 0) |
| heat50 | warm.frame | 30.61 | 35.65 | +13.2% [-6.6, +34.8] | ±16.6% | same (interval includes 0) |
| heat50 | warm.script | 8.45 | 12.60 | +48.0% [+14.5, +93.1] | ±25.7% | differs |
| heat50 | warm.style | 12.83 | 13.18 | -0.9% [-14.7, +14.5] | ±14.3% | same (interval includes 0) |
| heat50 | warm.layout | 3.42 | 3.29 | -2.3% [-10.4, +4.1] | ±6.8% | same (interval includes 0) |
| dots1000 | cold.frame | 39.53 | 43.65 | +7.8% [+1.2, +15.7] | ±11.0% | within noise |
| dots1000 | warm.frame | 27.13 | 27.06 | +0.1% [-10.5, +10.0] | ±14.5% | same (interval includes 0) |
| dots1000 | warm.script | 6.70 | 7.49 | +14.1% [+1.5, +32.1] | ±19.7% | within noise |
| dots1000 | warm.style | 14.57 | 15.06 | +0.3% [-9.8, +7.4] | ±9.5% | same (interval includes 0) |
| dots1000 | warm.layout | 1.38 | 1.34 | -3.1% [-12.2, +3.0] | ±10.2% | same (interval includes 0) |

## Mount, run a (12 rounds, a busier machine)

| scenario | metric | rhp (Solid), ms | rhp-react, ms | change [95%] | A/A noise | |
|---|---|---:|---:|---|---|---|
| bars20 | cold.frame | 13.28 | 15.04 | +18.5% [-2.1, +47.0] | ±11.4% | same (interval includes 0) |
| bars20 | warm.frame | 2.12 | 2.42 | +25.3% [-10.9, +55.1] | ±28.1% | same (interval includes 0) |
| bars20 | warm.script | 0.70 | 1.10 | +61.6% [+20.8, +92.9] | ±30.9% | differs |
| bars20 | warm.style | 0.80 | 0.65 | -2.8% [-37.0, +29.2] | ±54.6% | same (interval includes 0) |
| bars20 | warm.layout | 0.26 | 0.25 | +4.2% [-27.6, +23.3] | ±32.4% | same (interval includes 0) |
| bars1000 | cold.frame | 54.56 | 61.22 | +12.0% [+0.6, +22.8] | ±14.5% | within noise |
| bars1000 | warm.frame | 45.89 | 44.44 | -2.2% [-14.4, +15.2] | ±21.5% | same (interval includes 0) |
| bars1000 | warm.script | 10.36 | 11.71 | +10.4% [-10.1, +53.9] | ±38.4% | same (interval includes 0) |
| bars1000 | warm.style | 21.61 | 19.66 | -5.8% [-16.5, +7.7] | ±19.1% | same (interval includes 0) |
| bars1000 | warm.layout | 6.63 | 6.46 | -1.7% [-6.7, +4.3] | ±11.4% | same (interval includes 0) |
| dash50 | cold.frame | 38.52 | 40.64 | +5.3% [-6.2, +17.2] | ±15.2% | same (interval includes 0) |
| dash50 | warm.frame | 27.23 | 20.50 | -7.7% [-24.4, +10.3] | ±31.0% | same (interval includes 0) |
| dash50 | warm.script | 8.81 | 6.97 | -1.6% [-19.1, +33.0] | ±42.7% | same (interval includes 0) |
| dash50 | warm.style | 9.68 | 7.72 | -10.2% [-26.4, +2.1] | ±26.5% | same (interval includes 0) |
| dash50 | warm.layout | 3.59 | 2.86 | -13.1% [-26.2, +0.7] | ±22.5% | same (interval includes 0) |
| heat50 | cold.frame | 44.49 | 46.55 | +6.3% [-4.4, +15.0] | ±18.2% | same (interval includes 0) |
| heat50 | warm.frame | 26.47 | 31.22 | +13.3% [-0.6, +25.9] | ±29.9% | same (interval includes 0) |
| heat50 | warm.script | 7.55 | 11.26 | +46.1% [+21.9, +77.8] | ±52.1% | within noise |
| heat50 | warm.style | 11.10 | 12.02 | -0.2% [-10.6, +10.0] | ±23.5% | same (interval includes 0) |
| heat50 | warm.layout | 3.38 | 3.30 | -3.6% [-10.9, +3.0] | ±14.4% | same (interval includes 0) |
| dots1000 | cold.frame | 33.69 | 33.33 | +5.4% [-9.1, +22.5] | ±15.7% | same (interval includes 0) |
| dots1000 | warm.frame | 17.04 | 19.30 | +9.6% [-13.6, +37.2] | ±25.1% | same (interval includes 0) |
| dots1000 | warm.script | 3.47 | 5.25 | +33.1% [-8.6, +83.8] | ±37.8% | same (interval includes 0) |
| dots1000 | warm.style | 10.09 | 10.13 | +2.0% [-18.6, +26.4] | ±27.1% | same (interval includes 0) |
| dots1000 | warm.layout | 1.06 | 1.05 | -2.3% [-17.6, +14.0] | ±15.1% | same (interval includes 0) |

## One value changed (24 frames)

| scenario | metric | rhp (Solid), ms | rhp-react, ms | change [95%] | A/A noise | |
|---|---|---:|---:|---|---|---|
| bars1000 | first | 8.25 | 7.71 | -7.3% [-30.4, +52.2] | ±37.3% | same (interval includes 0) |
| bars1000 | frames | 47.32 | 41.46 | -11.7% [-22.6, +48.0] | ±28.2% | same (interval includes 0) |
| bars1000 | script | 4.74 | 4.15 | -7.8% [-32.3, +50.3] | ±22.3% | same (interval includes 0) |
| bars1000 | style | 0.91 | 0.86 | -0.7% [-19.5, +38.7] | ±28.0% | same (interval includes 0) |
| bars1000 | layout | 14.65 | 11.87 | -16.1% [-27.6, +49.6] | ±27.6% | same (interval includes 0) |
| bars1000js | first | 5.46 | 3.18 | -36.9% [-55.8, -4.0] | ±44.2% | within noise |
| bars1000js | frames | 53.40 | 46.93 | -11.6% [-30.7, +23.5] | ±39.0% | same (interval includes 0) |
| bars1000js | script | 6.77 | 10.25 | +49.1% [+17.2, +106.5] | ±29.9% | differs |
| bars1000js | style | 2.02 | 1.75 | -9.3% [-24.1, +29.3] | ±28.0% | same (interval includes 0) |
| bars1000js | layout | 15.51 | 12.50 | -21.5% [-41.3, +29.1] | ±40.0% | same (interval includes 0) |

## Every value changed

| scenario | metric | rhp (Solid), ms | rhp-react, ms | change [95%] | A/A noise | |
|---|---|---:|---:|---|---|---|
| bars1000 | first | 12.31 | 14.61 | +22.2% [+4.4, +47.4] | ±31.4% | within noise |
| bars1000 | frames | 146.09 | 147.15 | +0.7% [-2.4, +3.8] | ±3.8% | same (interval includes 0) |
| bars1000 | script | 6.00 | 17.02 | +189.9% [+137.6, +257.7] | ±32.4% | differs |
| bars1000 | style | 74.72 | 72.20 | -4.0% [-5.5, -2.0] | ±2.8% | differs |
| bars1000 | layout | 24.52 | 24.31 | -1.2% [-6.5, +4.0] | ±5.2% | same (interval includes 0) |

## Every row moved (sorted)

| scenario | metric | rhp (Solid), ms | rhp-react, ms | change [95%] | A/A noise | |
|---|---|---:|---:|---|---|---|
| bars1000 | first | 23.63 | 22.49 | -2.4% [-7.8, +7.1] | ±17.9% | same (interval includes 0) |
| bars1000 | frames | 158.71 | 156.53 | -1.4% [-4.2, +3.6] | ±4.9% | same (interval includes 0) |
| bars1000 | script | 3.24 | 7.77 | +132.0% [+102.8, +160.1] | ±25.2% | differs |
| bars1000 | style | 40.77 | 40.66 | -0.4% [-3.7, +6.6] | ±9.1% | same (interval includes 0) |
| bars1000 | layout | 7.82 | 8.13 | +2.2% [-6.6, +11.7] | ±9.4% | same (interval includes 0) |

## A new scale

| scenario | metric | rhp (Solid), ms | rhp-react, ms | change [95%] | A/A noise | |
|---|---|---:|---:|---|---|---|
| bars1000 | first | 3.71 | 4.52 | +26.1% [-13.3, +70.5] | ±30.8% | same (interval includes 0) |
| bars1000 | frames | 133.56 | 130.53 | -0.3% [-6.0, +3.1] | ±7.7% | same (interval includes 0) |
| bars1000 | script | 2.29 | 10.29 | +373.9% [+333.2, +421.2] | ±11.6% | differs |
| bars1000 | style | 75.51 | 76.51 | +0.1% [-2.5, +3.4] | ±7.1% | same (interval includes 0) |
| bars1000 | layout | 17.40 | 16.37 | -4.6% [-12.9, +0.8] | ±9.1% | same (interval includes 0) |

## A value changed in every frame (120 frames)

| scenario | metric | rhp (Solid), ms | rhp-react, ms | change [95%] | A/A noise | |
|---|---|---:|---:|---|---|---|
| bars1000 | work | 5.28 | 5.09 | -11.6% [-32.2, +20.8] | ±38.9% | same (interval includes 0) |
| bars1000 | workP90 | 10.09 | 9.46 | -5.1% [-9.8, -2.2] | ±9.0% | within noise |
| bars1000 | script | 2.21 | 1.42 | -37.0% [-42.9, -29.8] | ±14.4% | differs |
| bars1000 | style | 0.25 | 0.28 | +11.8% [+2.6, +22.0] | ±13.9% | within noise |
| bars1000 | layout | 1.36 | 1.44 | +4.8% [-3.1, +18.7] | ±19.0% | same (interval includes 0) |
| bars1000js | work | 5.71 | 4.73 | -10.2% [-28.2, +2.4] | ±21.6% | same (interval includes 0) |
| bars1000js | workP90 | 9.97 | 10.18 | +3.7% [-3.1, +10.8] | ±6.5% | same (interval includes 0) |
| bars1000js | script | 2.94 | 2.07 | -29.8% [-34.2, -24.7] | ±14.3% | differs |
| bars1000js | style | 0.18 | 0.20 | +8.9% [+1.9, +15.3] | ±11.2% | within noise |
| bars1000js | layout | 1.28 | 1.39 | +10.9% [+2.1, +24.2] | ±14.6% | within noise |

## What the numbers say

- The browser's work is the same: style and layout match in every scenario, since both draw the same elements with the same CSS.
- rhp-react's own script is higher on a mount (React makes a fiber for each element and calls each component): +14% to +100% here, about 1 ms more for a small chart. The frame a chart is made in is the same to about 13% longer.
- After a change, the frames add up to the same work. React's script is higher where rhp's CSS transitions run on many elements (a new scale, a sort, every value): React 19 listens at its root for `transitionrun`, `transitionstart` and `transitionend`, and for each one it walks from the element up its tree. A profile of a new scale on 1,000 bars put 9.5 of 21.8 ms of sampled time in that walk (`getListener`).
- A value changed in every frame costs rhp-react less script than rhp: the app gives a new list each time, which re-runs every slat's reads in Solid, while React compares the rows and draws one slat.
