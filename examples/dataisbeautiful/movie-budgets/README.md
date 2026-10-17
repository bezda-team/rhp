# 2026 movie budgets and worldwide box office

An interactive cinema programme compares ten of 2026's largest reported production budgets with their cumulative worldwide ticket sales, using the actual film poster artwork to identify each row.
The Odyssey and the live-action Moana share a reported $250 million production budget, but their captured worldwide grosses differ by 5.511186050598942 times, shown as 5.5 times.
Toy Story 5 is the third film with the same reported budget.

- `movie-budgets.html`: portable chart with embedded fonts, ten embedded poster images, budget and gross ordering, keyboard navigation, and the full-poster PNG download icon.
- `movie-budgets.png`: publication image saved through the actual download button, at 1840 by 2867 pixels.
- `poster.template.html` and `build.mjs`: editable chart source and reproducible portable-page build.
- `data.json` and `movie-budgets.csv`: the ten selected films, exact dollar figures, ratios, source links, and derived comparison.
- `source-snapshot.json`: the 100 screened films and extracted factual fields, with source URLs and the retrieval timestamp.
- `fetch-data.mjs`: source collection, selection, reconciliation, and offline regeneration of the analysis.
- `fetch-assets.mjs`: retrieval of each identifying film poster and proportional thumbnail creation through browser canvas.
- `artwork-credits.json`: original image URLs, studio credits, original and embedded dimensions, and the resizing operation.
- `assets/`: the complete, proportionally resized poster images, embedded fonts, and font licenses.
- `post.txt`: descriptive Reddit title, source-and-tools comment, and posting notes.
- `research.txt`: method, limitations, audience precedents, and rule review.

Open the HTML with an internet connection for the pinned rhp and PNG-export modules.
The artwork and fonts are embedded, so they do not depend on external image servers when the page loads or exports.
The two order buttons sort by reported production budget or worldwide box office.
The chart supports focus and arrow-key navigation, and each film's accessible label gives exact figures.
Both dollar bars start at zero on the same linear scale.
The poster images identify films and do not encode the dollar values through their size.

The selection starts from The Numbers' 100 highest-grossing 2026 releases at the capture date of October 17, 2026.
Sixty had reported budgets, and 59 also met the gross and US theatrical-release criteria.
The chart takes the ten largest qualifying budgets, from $150 million to $250 million, with ties ordered by worldwide gross.
This is a reproducible screened sample, not an exhaustive census of all production spending worldwide.
All ten worldwide grosses agree exactly between the annual chart and the individual film pages, and each domestic plus international total reconciles exactly with worldwide gross.
Budgets are consistently taken from The Numbers and may differ from estimates in other publications.
Gross is ticket sales, not studio revenue or profit; the chart does not estimate losses or apply a generic break-even threshold.
The full year is not complete, and some theatrical runs are ongoing.

To rebuild from the saved factual snapshot:

```sh
node examples/dataisbeautiful/movie-budgets/fetch-data.mjs --offline
node examples/dataisbeautiful/movie-budgets/build.mjs
```

To retrieve the public figures and identifying images again, use the repository's installed dependencies and Playwright browser:

```sh
node examples/dataisbeautiful/movie-budgets/fetch-data.mjs
node examples/dataisbeautiful/movie-budgets/fetch-assets.mjs
node examples/dataisbeautiful/movie-budgets/build.mjs
```

The cutoff remains October 17, 2026.
Rerunning the online collection later can change running worldwide totals and reported budgets, so keep the supplied snapshot to reproduce the supplied image.
The film artwork belongs to the respective studios and rightsholders and is credited separately from the original visualization.
The fonts use the included SIL Open Font License files.

The checker reports no findings at 1280, 1024, 768, 390, 360, and 320 pixels, including the intervening layout breakpoint boundaries.
All twenty bars were measured against the underlying figures and share the same origin and dollar scale.
Both sort orders were verified visually in Chromium, WebKit, and Firefox, including after pointer and keyboard PNG downloads.
A real touch download preserves the chosen order at 320 pixels.
All ten embedded artwork images load and appear in the exported PNG.
The exported and native screenshot artwork was compared with at most one device pixel of registration to account for fractional CSS rasterization.
Mean absolute channel differences over the full poster, on a 0 to 255 scale, were 0.65 in Chromium, 2.32 in WebKit, and 1.25 in Firefox.
The source recipe and the new poster were visually compared, and the actual artwork keeps the subject recognizable on narrow phones.
The Reddit draft has not been submitted.
