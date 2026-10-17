# Reported movie-loss forecasts, 2026

A 4:5 cinema poster compares four quantified trade-press loss forecasts for films released in 2026, with real promotional artwork and director and lead-actor credits.
The editorial hook is Digger, for which TheWrap quoted sources forecasting losses of $200 million to $215 million and $250 million.
The four films have the largest comparable forecasts verified in the documented source review, ordered by upper estimate, with ties preserved.
These are dated forecasts, not final accounts or a complete ranking of the year's actual losses.

- `movie-bombs.html` is the portable poster page, with embedded images and fonts, a full-poster PNG download icon, and the source assumptions below the poster.
- `movie-bombs.png` is the publication image saved through the actual download control, at 2160 by 2700 pixels.
- `poster.template.html` and `build.mjs` are the editable chart and portable-page build.
- `forecasts.json` records the original reports, dates, quoted estimates, revenue windows, and assumptions.
- `selection-audit.json` records eligibility, the 24 discovery candidates and six supplemental films, qualifying forecasts, excluded estimates, and limitations.
- `source-snapshot.json` preserves The Numbers' factual box-office, budget, artwork, and cast-and-crew fields at capture.
- `data.json` joins those facts to the reviewed forecast records.
- `fetch-data.mjs` validates that join and supports offline reconstruction.
- `fetch-assets.mjs` retrieves each real film poster and resizes it proportionally to at most 480 pixels high, without cropping or changing the art.
- `artwork-credits.json` records the original image URLs, source pages, dimensions, processing, and rights credits.
- `assets/` contains the identifying images, embedded fonts, and font licenses.
- `post.txt` contains a descriptive Reddit title and the sources-and-tools comment.
- `research.txt` records the audience evidence, community rules, editorial decisions, and limits.

Open the HTML in a browser, or use the local preview at `http://127.0.0.1:4396/movie-bombs.html` while its development server is running.
The pinned rhp module and first PNG export require an internet connection.
At full desktop width the poster is 1080 by 1350 CSS pixels, and the download saves it at twice that resolution.
The HTML reflows on smaller screens, so a download on a narrow phone reflects that displayed layout.
Use the supplied publication PNG for the fixed 4:5 Reddit image.
Pointing, tapping, or using Tab and the arrow keys highlights a film, reveals a short forecast note beside its bar, and updates a compact source summary below the poster.
The full report assumptions remain in the source cards below that summary.
A touch scroll does not select a film.
The PNG captures the current highlight and note, and activating download preserves that selection.
The supplied publication image shows Digger selected at rest.

Each solid bar runs from zero to the lowest estimate in that report, and hatching extends to its highest estimate.
The empty outline is the common zero to $250 million scale, not a budget or a missing cost component.
All three styles are labeled in the legend.
The hatching is an envelope of quoted estimates, not a statistical confidence interval.
The Bride! has an approximate $90 million estimate and no artificial range extension.
The four bars use the same zero-based dollar scale.
The artwork identifies the films and does not encode values by its size.
The report dates and revenue windows are printed in the image, and the source records explain the assumptions in full.
Moana's later gross has exceeded its July forecast's $250 million assumption; the image says so explicitly.
All four forecasts include post-theatrical income, although their dates and underlying accounting assumptions differ.
Supergirl uses Deadline's 29 June $125 million first-cycle forecast, replacing the earlier draft's theatrical-only Variety estimates.
It ties Moana's upper estimate and has no invented range extension.
The audit records why reported claims for Desert Warrior, Masters of the Universe, The Mandalorian and Grogu, and other candidates do not provide a verified comparable first-cycle forecast.
Missing estimates remain unknown, rather than being treated as zero or necessarily smaller than the four shown.
Current gross is contextual ticket-sales data, not studio revenue or a loss calculation.
No forecast is recomputed using a generic ticket-rental percentage, and the unlike forecasts are not added into a total.

Rebuild from the saved factual snapshot:

```sh
node examples/dataisbeautiful/movie-bombs/fetch-data.mjs --offline
node examples/dataisbeautiful/movie-bombs/build.mjs
```

To retrieve fresh primary-source film facts and identifying images:

```sh
node examples/dataisbeautiful/movie-bombs/fetch-data.mjs
node examples/dataisbeautiful/movie-bombs/fetch-assets.mjs
node examples/dataisbeautiful/movie-bombs/build.mjs
```

The loss reports are manually reviewed, dated records in `forecasts.json`; refreshing ticket sales does not update those forecasts.
Preserve the supplied snapshot to reproduce the supplied publication image.
The artwork belongs to the respective studios and rightsholders, and the fonts use their included SIL Open Font Licenses.

The final chart passes the checker at 1280, 1024, 768, 390, 360, and 320 pixels, including breakpoint boundaries.
The bar lengths and range endpoints were measured against the source values, and all four images and fonts loaded.
The actual PNG download was compared with native screenshots in Chromium, WebKit, and Firefox, with matching 2160 by 2700 pixel dimensions.
Mean absolute channel differences were 0.007, 1.365, and 0.128 respectively, on a 0 to 255 scale.
Bar strips are compared separately, since a whole-poster average can hide a displaced range mark.
The shared exporter preserves original grid-position rules from both ordinary and adopted stylesheets, fixing Safari's incorrect computed offsets for nonzero range starts in subgrids.
Artwork comparisons allowed at most one device pixel of registration for fractional CSS rasterization.
Pointer and keyboard downloads passed in all three engines, and a touch download passed at 320 pixels.
The interactive export check covered all six widths in all three engines, comparing the downloaded bar strips with native screenshots and preserving the chosen film through completed downloads.
Touch downloads of the selected film also passed at 390, 360, and 320 pixels in Chromium and WebKit.
The publication image was inspected at 390 and 360 pixel feed widths, separately from the HTML's responsive layouts.
The starting recipe was rendered and visually compared, and the new chart's composition, typography, artwork, and range marks are distinct.
The Reddit draft has not been submitted, and the new poster has not been added to the public gallery.
