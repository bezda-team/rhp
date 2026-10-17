# No Man's Sky review poster

The launch year accounts for 48.1% of the current negative Steam recommendations in the captured data.
The chart compares exact positive and negative counts by original posting year.
These are current recommendations, including edits, rather than historical score snapshots.

- `no-mans-sky.html`: portable interactive poster with embedded aggregate data and fonts, plus a PNG download icon.
- `no-mans-sky.png`: publication image saved through the real download button.
- `poster.template.html`: editable chart source.
- `data.json`: fixed source snapshot, exact API parameters, and reconciliation totals.
- `reviews-by-year.csv`: the eleven annual aggregates.
- `fetch-data.mjs`: reproducible data collection with independent total checks.
- `build.mjs`: embeds the data, licensed fonts, and canonical PNG exporter.
- `post.txt`: descriptive Reddit title, first source-and-tools comment, and posting notes.
- `research.txt`: audience evidence, dates, sources, duplicate-search limits, and rule review.

Open `no-mans-sky.html` in a browser with an internet connection for the pinned rhp and PNG export modules.
Tap or focus a year to inspect its positive share; arrow keys move between years.
The download control saves the full poster at twice its CSS dimensions and preserves the selected year.

To query current recommendations again and rebuild:

```sh
node examples/dataisbeautiful/no-mans-sky/fetch-data.mjs
node examples/dataisbeautiful/no-mans-sky/build.mjs
```

The creation-date cutoff stays fixed at 16 October 2026 UTC.
Rerunning later can change counts because reviews can be edited or removed.
The supplied image uses the fixed capture in `data.json`, collected on 17 October 2026 UTC.

The three font files are distributed under their included SIL Open Font License files.
No individual review text or account identifiers are retained.

Validation passed at 1280, 1024, 768, 390, 360, and 320 pixels, with no checker findings.
Every year was selected at each tested width without moving the surrounding layout.
Real pointer and keyboard PNG downloads preserve the selected year in Chromium, WebKit, and Firefox.
A real touch download at 390 pixels preserves the selected year too.
The supplied PNG is 2000 by 2667 pixels, saved through the download button rather than substituted with a screenshot.
The exports were visually inspected and compared against browser screenshots.
Mean absolute channel differences on a 0 to 255 scale were 0.13 in Chromium, 2.26 in WebKit, and 1.02 in Firefox.
The exported and screenshot images differ by one final raster row because the poster's CSS height is fractional.
All 22 WebKit bar boundaries agreed within one device pixel; its remaining differences are rasterization details.
