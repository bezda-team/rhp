# rhp against itself

This folder compares versions of rhp with each other: a change against `master`, one commit against another, or a CSS rule with and without a part of it.
It is built to give a trustworthy answer on a machine that is in use, so it never assumes the machine is quiet: it measures the noise in every run and says when a change is smaller than it.
The library comparison (rhp against D3, Chart.js and the others) stays in `bench/`.

## Running it

You need the root's `npm install` and `npx playwright install`.

```sh
cd bench/ab
node build.mjs base,noguard                    # out/base.js, out/noguard.js: one page per variant, every scenario in it
node verify.mjs --variants base,noguard --scenarios bars20,dash50,dots1000,heat50
node run.mjs --variants base,noguard --scenarios bars1000,heat50 --rounds 12
```

`run.mjs` prints, for every scenario and metric, each variant's median, its spread, and its change against the first variant with a 95% interval.
A change marked `*` has an interval that leaves out zero; `(within noise)` means it is no larger than the run's own A/A difference.
Every run is saved as JSON in `results/` with every sample, the machine's state and the bundles' hashes.

To compare commits, build the other commit's source under its own name:

```sh
git worktree add ../../../rhp-master master
RHP_SRC=../../../rhp-master/src AS=master node build.mjs base
node build.mjs base
node run.mjs --variants master,base --scenarios bars1000,dash50,heat50,dots10k
```

## What a run does

- **Variants are edits.**
  A variant (`variants.mjs`) is a list of edits to rhp's source, made while bundling, so `src/` is never changed.
  A CSS edit works on the parsed stylesheet and must touch exactly the number of rules it names; a text edit must match exactly once.
  A variant that matches nothing fails to build instead of measuring nothing.
- **Checked before it is timed.**
  `verify.mjs` draws each scenario with each variant and compares every element's box and every screenshot pixel with the first variant.
  `--hostile` adds page CSS of the kind resets and frameworks write (margins, borders, fonts, transitions on every `div`), to see what a variant gives up.
- **Paired and balanced.**
  Each round measures every variant once, each on a fresh page, in an order that rotates every round and reverses every other cycle.
  A variant is compared with the base round by round, so whatever the machine did during a round hits both.
  Use a number of rounds that is a multiple of twice the number of variants for a fully balanced order.
- **Its own control.**
  The first variant runs twice in every round, the second time as `<name>~aa`.
  Its difference from itself is the run's noise floor, printed as `[noise ±x%]`.
- **Numbers interference can't inflate.**
  Another program can only make a mount slower, so a page's warm numbers are the fastest of its warm mounts (`--warm 4`; `--reduce median` for the median).
  In Chromium the browser's counters are read in the main thread's CPU time, and a second DevTools session reads them in wall time, so each sample also records `stall`: how long its frame's tasks waited for a CPU.
- **Deterministic statistics.**
  `stats.mjs` works on the paired log ratios: the change is their Hodges-Lehmann estimate, with the exact distribution-free interval of the Wilcoxon signed-rank test.
  There is no resampling and no random number anywhere, so the same samples always give the same answer.
- **As many rounds as it takes.**
  `--target 1.5 --max-rounds 40` keeps adding rounds after `--rounds` until every variant's interval on `--key` (the warm frame by default) is within 1.5% on each side, and stops at 40 if it can't get there.

## Scenarios and protocols

Every value comes from a formula of its index (no generator, seeded or not), so every variant draws exactly the same thing.

| Scenario | What it draws |
|---|---|
| `bars20`, `bars1000` | a name, a bar and its value per row (the bench's chart), 24px and 8px rows |
| `bars1000static`, `bars1000js` | the same, `static`, and in the JS version |
| `bars1000u1`, `bars1000u1000` | the same with one value for every bar, or every value different |
| `positioned1000` | bars whose slat CSS reads `--rhp-position` on the name label |
| `dash50` | 50 charts of 7 bars, made at once |
| `dots1000`, `dots10k` | a scatter plot, one Dot per slat |
| `manydots10k` | the same points with ManyDots |
| `heat50`, `heat50u` | a 50 by 50 heatmap (100 values, or nearly all different) |
| `line100k` | one Line of 100,000 points |
| `plain1000` | 1,000 rows of plain DOM: with `?pre=1` on a page that already shows a chart |

| Protocol | What it measures |
|---|---|
| `mount` | the first chart on a fresh page (cold) and the fastest of `--warm` mounts after it (warm): the frame in the page, and in Chromium script, style and layout |
| `update:<kind>` | after the chart is drawn, 6 changes (`one`, `all`, `scale`, `sort`), and for each the work of every one of the 24 frames after it |
| `stream:<kind>` | a change in every frame for 120 frames: work per frame and dropped frames |

`--engine chromium` (the default, new headless), `chrome`, `webkit` or `firefox`; WebKit and Firefox report the frames measured in the page only.
A variant can carry its own query: `base?pre=1`, `base?css=selection`, `base?as=bars1000u1` (another scenario in the same round).

## Where the time goes

- `trace.mjs --variant base --scenario bars1000 --warm` traces a mount and gives main-thread self time by phase (script, style, layout, pre-paint, paint, layerize, commit, GC).
  It also counts how many elements each style pass touched and how many objects each layout did.
  Those counts don't depend on the machine, so CI can check them (a one-value update restyles 2 elements) without timing anything.
  `--update all` traces an update instead; `--selectors` adds Chrome's selector statistics.
- `count-cache.mjs` reads Chromium's own style counters for one mount or update: elements styled, styles added to its style cache and styles taken from it, pseudo-element styles.
  A chart's body is a size container, so Chromium styles a mount's contents during layout, where the trace has no counters: count mounts on `count-base` and `count-pos` (the same without the container), and `--cold` counts the first chart on a page.
  On rhp as it is, a first chart of 1,000 bars takes 0 of its 6,029 styles from the cache; with `--rhp-position` not inherited, 4,759.
- `profile.mjs` gives script self time by function, on an unminified build: `MINIFY=0 OUT=out/dev node build.mjs base`.
- `micro/` holds pages without rhp that isolate one browser behavior, such as what makes a style unshareable: `node micro/run-micro.mjs style-cache.html`.
- `bundle-audit.mjs` lists the bytes each source file puts into an app's bundle, and `size-ablate.mjs` what a piece of rhp costs in gzip bytes.

## Noise

On a MacBook Air (no fan), on battery and in use, mount frames waited for a CPU about 3% of the time, the A/A interval was 1 to 7 points wide at 10 to 12 rounds, and dashboards of many small charts were the noisiest scenario.
Between 4 and 15% of A/A intervals left out zero, against the 5% the statistics promise, so treat a change as real only when it is clearly larger than its run's noise floor.
Changes of 10% and more are unmistakable this way.
A change of 1% needs a quiet machine on AC power, or `--target 1` with many rounds.
`machine.mjs` records the load, the CPU idle share, the power source and any thermal limit with every round, and the load and CPU idle share with every sample; it doesn't wait for the machine unless asked (`--quiet 0.85`).
A chart as small as 20 bars can't be timed this way: its warm frame is about 3 ms, and scheduling noise is half of that.

The study that built this harness, with every result file, is in `results/study-2026-10-24/`.
