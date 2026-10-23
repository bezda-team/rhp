# Teen vaping after the 2019 lung-injury outbreak

An alternate version of the [teen-tobacco](../teen-tobacco/) poster, made for a reader who asked to start around 2018 to see how much the 2019 "popcorn lung" scare affected use.
It shows the two national surveys of U.S. teen vaping side by side, with the lung-injury outbreak (EVALI, August 2019 to February 2020, peaking in September 2019) after their 2019 rounds; their 2020 rounds ran in early 2020, until schools closed in mid-March.
In the National Youth Tobacco Survey (NYTS), high school e-cigarette use fell from 27.5% to 19.6%, 29% lower.
In Monitoring the Future (MTF), 12th graders' nicotine vaping went from 25.5% to 24.7% and 10th graders' from 19.9% to 19.3%; its authors report no significant change in past-30-day vaping, though daily vaping fell and perceived risk rose.
Both 2020 rounds were cut short by school closures, and Tobacco 21 and the FDA's flavor enforcement came in the same months, so neither survey can say how much the scare alone did.

An earlier draft showed only the NYTS and led with its drop; it took the reader's premise and one survey, and was rebuilt with MTF.

## Files

- `teen-tobacco-2018.html`: self-contained poster with embedded fonts and artwork; an internet connection loads rhp and the PNG exporter.
- `teen-tobacco-2018.png`: the default state (the 2020 round picked), saved through the page's download button, 2000 by 3207 pixels.
- `poster.template.html` and `build.mjs`: editable source and builder; the fonts and the locker artwork are the earlier poster's (`../teen-tobacco/assets`).
- `source-snapshot.json`: every estimate, interval, survey method, fieldwork note and event, with its source and the quoted text it was checked against.
- `sources/childstats-beh1b.html`: the federal ChildStats table the MTF values come from, as retrieved.
- `analyze.mjs`: validates the snapshot, computes each same-method change and the headline, and writes `data.json` and `estimates.csv`.
- `reply.txt`: a reply to the reader who asked.

## Rebuild

```sh
node examples/real/teen-tobacco-2018/analyze.mjs
node examples/real/teen-tobacco-2018/build.mjs
node mcp/bin/rhp-mcp.js check examples/real/teen-tobacco-2018/teen-tobacco-2018.html --widths 1280,1024,768,390,360,320
```

## Evidence

Every value was checked against the source's own text or table, not a summary.

- NYTS 2018: CDC, MMWR 67(45), November 16, 2018 (no confidence intervals given).
- NYTS 2019: CDC, MMWR Surveillance Summaries 68(12), December 6, 2019, Table 2.
- NYTS 2020: CDC, MMWR 69(50), December 18, 2020.
- NYTS 2021: CDC, MMWR Surveillance Summaries 71(5), March 11, 2022, Table 2.
- NYTS 2022 to 2025: FDA's 2025 analysis in Nicotine & Tobacco Research, Table 3, published June 23, 2026, as in the earlier poster; 2022 to 2024 match the CDC's yearly reports.
- MTF 2018 to 2024: the ChildStats table BEH1.B, from the MTF monograph (Miech, Johnston, Patrick and O'Malley, 2025); 2025 is not yet in it.
- MTF 2019 to 2020 finding: Miech et al., JAMA Pediatrics (2021), doi 10.1001/jamapediatrics.2020.5667.
- MTF methods by year: Health, United States, "Monitoring the Future" sources and definitions (NCHS).
- The outbreak: CDC's EVALI page (archived), last updated February 25, 2020.

The NYTS headline is `(27.5 - 19.6) / 27.5 = 28.7%`, rounded to 29%; its two 95% intervals (25.3 to 29.7 and 17.2 to 22.2) do not overlap.
The NYTS changed method in 2019 (from paper), 2021 (online, about half at home) and 2022 (online), and the chart draws those steps dotted.
MTF tested its 2019 change in a randomized half of schools, found no effect, and says its years compare directly; its 2020 sample was about a quarter of the usual size.
The two surveys ask different questions (any e-cigarette use; vaping nicotine) of different grades, so the chart compares how each changes, not their levels.
Most outbreak cases were linked to THC vaping products with vitamin E acetate, outside both measures.
"Popcorn lung" (bronchiolitis obliterans, linked to the flavoring diacetyl, a concern raised in 2015) has a different cause from the 2019 outbreak.

## Checks

The rhp checker reports no problems at 1280, 1024, 768, 390, 360 and 320px, including the pointer moved along the chart.
