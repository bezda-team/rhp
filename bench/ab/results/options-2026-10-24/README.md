# The two options, measured on 2026-10-24

Each file is one run of `run.mjs`: paired rounds with an A/A control, every sample kept.
`master` is rhp as on master (2.0.5), and `base` the perf-study branch, which keeps `--rhp-position` on slat roots and has `noCssGuard`.
Chromium unless the file name says otherwise.

| File | What it compares |
|---|---|
| `master-base.json` | master and the branch: mounts of 1,000 bars, a 50 by 50 heatmap, 50 small charts, 1,000 dots, and 1,000 bars whose slat CSS reads `--rhp-position` |
| `sort.json`, `all.json` | master and the branch: 1,000 bars sorted, and all their values changed |
| `guard.json` | the branch, with `noCssGuard()` (`?off=1`) and with the Chart prop (`?noguard=1`), before the guard looked for `data-rhp-guard` |
| `gated.json` | a chart that keeps the guard, on a page where another chart says `noCssGuard` (`?pre=noguard`) and where none does (`?pre=1`) |
| `inherit.json` | the branch and `inheritPosition()` |
| `webkit.json`, `firefox.json` | master, the branch and `noCssGuard()`, in WebKit and Firefox |
| `focus-register-dots.json`, `focus-register-all.json` | where nothing can be shared (dots, every value changing): master, the branch and `inheritPosition()` |
| `focus-alias.json` | 1,000 bars whose slat CSS reads the position: master, the branch, and the copy rule matched two other ways |
| `focus-markgate.json`, `focus-markgate-pre.json` | the Chart prop, and what the charts that keep the guard pay, with the old check and with the `data-rhp-guard` mark |
| `webkit-cases.json`, `firefox-cases.json`, `webkit-all.json`, `firefox-all.json` | the three cases that are slower in Chromium, in WebKit and Firefox |
| `flip-prop.json` | the Chart prop after the guard looks for `data-rhp-guard`, against `noCssGuard()` |
