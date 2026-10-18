# Teen tobacco and nicotine pouches

A Reddit poster and interactive companion answering whether falling vaping prevalence simply leaves nicotine pouches out of the statistics.
The latest FDA table shows that reported use of any tobacco product among U.S. high school students fell from 16.5% to 9.5% between 2022 and 2025, even as pouch use rose from 1.4% to 2.3%.
The total already includes both products.
This does not establish how individual students switched or how much nicotine they consumed.

## Files

- `teen-tobacco.html`: self-contained poster with embedded fonts and artwork; an internet connection loads rhp and the PNG exporter.
- `teen-tobacco.png`: full default-state PNG, saved through the page's download button.
- `poster.template.html` and `build.mjs`: editable source and reproducible builder.
- `source-snapshot.json`: transcribed facts from Table 3 of the latest primary paper, including confidence intervals and definitions.
- `analyze.mjs`: validates the source and computes the claims.
- `data.json` and `estimates.csv`: analysis output used by the chart.
- `post.txt`: copyable title, body, first comment and posting notes.
- `research.txt`: observed Reddit interest, rejected candidates, current rules and evidence limitations.
- `artwork-credits.json`: background-generation provenance and final prompt.
- `validation.json`: browser, interaction, image-export and display checks.

## Rebuild

```sh
node examples/real/teen-tobacco/analyze.mjs
node examples/real/teen-tobacco/build.mjs
node mcp/bin/rhp-mcp.js check examples/real/teen-tobacco/teen-tobacco.html --widths 1280,1024,768,390,360,320
```

Open `teen-tobacco.html` in a browser to inspect a year by pointing, tapping, using the year buttons or pressing arrow keys on the plot.
Download saves the current selection at twice the natural CSS dimensions, including when fitted to the screen.
The default desktop poster is 1000 CSS pixels wide and about 1361 pixels tall, exporting at 2000 by 2722 pixels in Chromium.
The phone companion reflows for legibility; the Reddit image keeps the desktop composition.

## Evidence

Source: [FDA's 2025 National Youth Tobacco Survey analysis, Table 3](https://academic.oup.com/ntr/advance-article/doi/10.1093/ntr/ntag116/8712569), published June 23, 2026.
All series concern U.S. high school students in grades 9 to 12 and use on at least one of the past 30 days.
The headline is `(16.5 - 9.5) / 16.5 = 42.424%`, rounded to 42%.
The three four-year trends are significant, while their 2024 to 2025 changes are not.
Categories overlap and cannot be added.
Other oral nicotine products entered the composite in 2023, expanding the measured scope after 2022.
Low response, self-reporting, changing samples and school-based coverage limit interpretation.
See the companion's expanded methods for confidence intervals and further details.

## Design and skill test

The comparison uses a common percentage scale, solid and dashed strokes, and different point shapes.
Direct labels keep the static image complete, while fixed readout columns and confidence-interval lines let readers inspect each year without layout shifts.
Line-end labels scale with the available plot width, and the chart reserves their measured width instead of a fixed empty gutter.
The crosshair spans the full plot and follows the selected points immediately, including the square pouch marker.
Equal side padding and larger gaps below the caption and plot keep the existing composition open on desktop and phone screens.
School-locker materials, institutional condensed typography and subdued light put the survey in its high-school context.
The generated background is decorative and explicitly disclosed, with all factual marks and words rendered in code.
The first artwork drafts had implausible door hardware; the final background was regenerated as three equal doors with latches opposite their hinges.
That feedback belongs in artwork review: check that depicted objects function plausibly before integrating them.

The skill's order was followed: audience question, suitable primary data, computed conclusion, design, post draft and interaction/export verification.
The strongest direct audience discussion is from April 2026; September discussions establish continued broad topic interest, rather than new evidence about U.S. switching.
Success on Reddit has not been tested and no post has been submitted.
