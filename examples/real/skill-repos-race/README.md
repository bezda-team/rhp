# The Claude skill repo race

A bar chart race of the most-starred Claude skill repositories on GitHub, every day from the launch of Agent Skills on October 16, 2025 to October 25, 2026.
Each day shows the ten most-starred skill repos among those with 5,000 stars or more, the most any untracked skill repo has, so every day's ranking is complete.
anthropics/skills led for five months, from October 19, 2025 to March 18, 2026; obra/superpowers then led, except for 20 days in April when affaan-m/ECC did, and on October 25, 2026 it leads mattpocock/skills by 1,856 stars (304,973 to 303,117).
mattpocock/skills got its first stars on February 11, 2026, entered the top ten on April 23, and gained 33,550 stars in the last 30 days to superpowers' 13,426.
The poster projects that, if both kept that 30-day pace (mattpocock/skills closing 671 stars a day), mattpocock/skills would take first place around October 28; the page computes the date from the data, and `audit.mjs` prints it.
Counts between archived captures are straight-line estimates, so a lead change can be off by a day or two.

- `skill-repos-race.html`: the interactive poster, with embedded data and fonts, Play, a week graph that scrubs the year, a readout on hover, tap and focus, repo names that open each repo on GitHub in a new tab, and PNG download.
- `skill-repos-race.png`: the publication image, saved through the poster's own download button (GitHub dark theme, today's standings).
- `poster.template.html`: the editable HTML, CSS and chart source.
- `data.json`: the daily star counts of every repo that was ever in the race, each day's top ten, the weeks, the leaders and the checks (falls between captures, observations per repo).
- `repos.json`: the inclusion rule, the 55 tracked repos with notes on the judgment calls, and 19 borderline repos left out with reasons.
- `live.json`: each tracked repo read from the GitHub API, with the time of the read.
- `captures.json`: every archived GitHub page read, with its Internet Archive URL, star count and repository id (pages of another repository are kept and rejected).
- `first-stars.json`: the first day GH Archive recorded a star for each repo name.
- `wayback.mjs`: the rate-limited reader of archived pages; `collect.mjs`: saves the inputs; `analyze.mjs`: builds `data.json`; `build.mjs`: embeds data, fonts and the download block.
- `post.txt`: Reddit titles, body and first comment; `research.txt`: interest, sources, method and limitations.
- `assets/`: Mona Sans (SIL Open Font License) and the Octicons star (MIT), with their licenses.

To rebuild from the saved inputs:

```sh
node examples/real/skill-repos-race/analyze.mjs
node examples/real/skill-repos-race/build.mjs
```

To collect again (needs an authenticated `gh`; the archive reads take about an hour at one request every five seconds per worker):

```sh
node examples/real/skill-repos-race/collect.mjs <cache>   # the live counts first
node examples/real/skill-repos-race/wayback.mjs <cache> 14 [repo ...]
node examples/real/skill-repos-race/collect.mjs <cache>
```

Open the HTML with an internet connection for the pinned rhp module and the PNG exporter.
The race plays once by itself when half of it is in view (not under reduced motion); Play replays it, and pointing, tapping or dragging on the week graph, or its arrow keys, move through the year.
A click or a tap on a repo stars it or unstars it, as GitHub's Star button does: a starred repo's bar and its leader labels turn gold, and it stays starred as it moves through the race; Enter or Space does the same on a focused bar, and the first two of the last day start starred.
A click on a repo's name opens it on GitHub in a new tab instead.
The download icon opens a menu: the poster as a PNG, or the whole race as an animated GIF (about 19 seconds and 5.6 MB at 1080 pixels wide, made in the browser in a little over a minute); both keep the stars and the picked repo as they are on screen.
The poster uses GitHub's dark theme, with Primer's colors.

`audit.mjs` recomputes every number on the poster and in the post from `data.json`, and checks that each day's top ten is sorted and past the entry bar and that every repo ends on its live count; all checks pass.
All 734 archived pages read had a star count and the repository's own id.
The rhp checker reports no problems at 1280, 1024, 768, 390, 360 and 320 pixels.
The PNG (2160 by 2695 pixels, from a 1080 by 1348 CSS-pixel poster, 4:5) was saved through the download button in Chromium, WebKit and Firefox and compared with each engine's screenshot; Safari's export dropped inset shadows, so the bar outlines and the week ring are borders and an outline.
Frames were inspected at launch week, January, the March and April lead changes, July and today, at 1280 and 320 pixels; long names end in an ellipsis only where they would leave the chart, with the full name in the slat's label and the readout.
Play, Pause between days, the week graph's pointer and keys, picking a repo by pointer, tap and keyboard, starring and unstarring by click, tap, Enter and Space, and the name links were tried; on a phone the readout, Play and the week graph stay pinned above the chart while it scrolls.
