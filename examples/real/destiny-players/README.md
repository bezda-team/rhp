# Destiny 2 player activity around three news events

The poster shows all 169 complete UTC days from May 1 through October 16, 2026, with event markers and nearby notes.
The first weekend after the final-update announcement rose from 13,574 to 18,389 recorded concurrent Steam players, an unrounded 35.4722% increase shown as 35%.
After the unvaulting announcement, the adjacent-weekend peak rose from 18,775 to 37,341, a 98.8868% increase shown as 99%.
The June 9 final update is separately marked, with the period's maximum of 167,867 on June 10.
The October hiring report has no complete follow-up weekend, and the linked official job listing currently names Marathon.
These are observed activity changes, not isolated causal effects or purchase counts.

- `destiny-players.html`: interactive poster with embedded data and licensed fonts, daily inspection, and PNG download.
- `destiny-players.png`: publication image saved through the actual download button.
- `poster.template.html`: editable HTML, CSS, and chart source.
- `data.json`: fixed daily series, source windows, events, exact overlap checks, and weekend comparisons.
- `raw-steamcharts.json`: captured current chart-feed response.
- `archive-2026-06-07.json` and `archive-2026-08-06.json`: archived responses preserving older daily observations.
- `announcement.json`: official publisher Steam news item establishing the September public timestamp.
- `daily-peaks.csv`: all daily peaks, feed-observation counts, and source-snapshot identifiers.
- `analyze.mjs`: collection, validation, historical reconstruction, and calculations.
- `build.mjs`: embeds data, fonts, and the canonical PNG exporter.
- `assets/traveler-white.jpg` and `artwork-credits.json`: the supplied Traveler wallpaper and its source credit.
- `post.txt`: Reddit image title, source-and-tools comment, and posting notes.
- `research.txt`: source verification, interest signals, related posts, rules, and limitations.

Open the HTML with an internet connection for the pinned rhp and export modules.
Point at the timeline to preview a date, or click, tap, use the arrow keys, or adjust the native day slider to commit a date.
The slider, inspected dot, and readout stay synchronized during hover, then return to the committed date when preview ends.
Moving focus, clicking poster text, and downloading the PNG preserve the committed choice.
A single full-width interaction surface maps the pointer to the nearest date, including on phones.
The download icon saves the full poster at twice its displayed dimensions with its current inspected day.

To reproduce the supplied analysis from the saved source captures and rebuild:

```sh
node examples/real/destiny-players/analyze.mjs --offline
node examples/real/destiny-players/build.mjs
```

Omit `--offline` to retrieve the fixed archived feeds and the current public feed again.
The analysis window remains fixed through October 16, 2026 UTC.
Steam Charts changes historical resolution over time; explicit validation fails if the necessary daily observations disappear or overlap checks disagree.
The code excludes coarse monthly points rather than treating them as daily observations.
The two archived capture days are excluded from their source windows to avoid partial-day peaks.
All 46 overlapping dates agree exactly, and the May through September monthly maxima reconcile with the published Steam Charts table.
The three font files use the included SIL Open Font License files.
The background uses the [Traveler White artwork](https://wallpaperswide.com/destiny___traveler_white-wallpapers.html), credited by the source to Bungie.
The original JPEG is embedded without changing its pixels, with CSS opacity of 12% and proportional scaling that keeps the circular artwork visible on desktop and phone layouts.
It sits 80 pixels above its original centered placement, with a soft fade at its top and bottom edges.

The checker passes at 1280, 1024, 768, 390, 360, and 320 pixels, including the responsive breakpoint boundaries.
All 169 dates were individually inspected by pointer at 1280, 390, and 320 pixels, with matching source values and working Home, End, and arrow keys.
The supplied PNG is 1760 by 2303 pixels and was saved through the actual download button.
The poster is 880 CSS pixels wide on desktop, with a data scale equivalent to 410 pixels per 180,000 players, extra annotation headroom, 14.5-pixel annotations, a 5-pixel data line, and 16-pixel event dots with 3-pixel borders.
The inspected-day dot is 18 pixels wide with a 4-pixel border.
Its desktop area is smaller than the previous layout, while chart text and marks are larger.
The May leader is vertical.
The June leader runs diagonally from its event dot toward the label’s top-left corner, at the September leader’s angle, stopping a few pixels before the text.
The two right-hand leaders retain their vertical and angled segments.
Leader endpoints and the June text gap were measured at 1280, 1024, 768, 640, 390, 360, and 320 pixels.
The inspected dot updates immediately, keeping its position aligned with the readout and PNG even after a rapid selection change.
Exports were visually inspected and compared with browser screenshots in Chromium, WebKit, and Firefox.
Mean absolute channel differences on a 0 to 255 scale were 0.85, 2.83, and 0.80 respectively, including small native-control and text rasterization differences.
Pointer and keyboard downloads preserve the selected date in all three engines, and the exported PNG contains the selected-day marker itself.
A real touch download preserves the selected date at 390 pixels too.

The amended checker verifies the native slider as an external selection control and reports no findings.
Its regressions cover overwritten hover selections, blur resets, synchronized previews, dropdowns, numeric inputs, single continuous hit surfaces, and unrelated controls.
