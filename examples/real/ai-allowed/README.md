# What GitHub's biggest projects say about AI

Two Reddit posters that answer the question r/opensource's new no-AI rule raised ("is Linux banned now?") with each project's own words.
They cover the 50 most-starred GitHub projects that pass the rule's other requirements, and what each one's repository says about AI in contributions.
43 of the 50 are AI projects (21) or allow AI-assisted code (22 of the other 29: 11 by written policy, 11 in practice); yt-dlp forbids it, Godot and Immich limit it, and four show no sign either way.

- `ai-allowed-infographic.html` and `.png`: the rule, six projects in their own words (Linux, React, VS Code, Flutter, Go, Kubernetes), and all 50 as squares in order of stars; a square names its project on hover, tap or focus. 750 by 1000 CSS pixels (3:4), saved at 1500 by 2002.
- `ai-allowed-chart.html` and `.png`: the rule under the headline, as on the infographic, and the 17 most-starred as bars in their stance's color, AI projects hollow and tagged, with a box beside the 9th to the 17th giving the picked project's rank, repository, stance, own words and source (Linux's at rest; a hover, tap or key picks another). 1080 by 1440 (3:4, the infographic's shape), saved at 2160 by 2883; Microsoft Activation Scripts is labeled MAS so the box fits.
- `previews/` (made by `export.mjs`, not committed): each PNG at the size Reddit shows it, 390px wide on a phone and in the desktop feed's box.
- `chart.template.html`, `infographic.template.html`: the editable pages.
- `selection.json`: the rule that picks the 50, the AI projects with the description each rests on, and the reason for every repository left out above the 50th.
- `evidence.json`: each project's stance, the file and the words that show it, or the commit trailer.
- `checked.json`: the same, verified against each repository at its current commit, with permalinks and live star counts.
- `candidates.json`, `scan/`, `ai-commits.json`, `contributors*.txt`, `top-*.json` (the search's fields that `build.mjs` reads), `sources/`: the raw reads.
- `post.txt`: Reddit titles, body and first comment; `research.txt`: interest, sources, method, how Reddit shows images, limitations.

To read the repositories again and rebuild (needs an authenticated `gh`; the commit search allows 30 requests a minute):

```sh
node examples/real/ai-allowed/scan.mjs            # policy files, agent files, contributing guides
node examples/real/ai-allowed/read-agent-files.mjs
node examples/real/ai-allowed/ai-commits.mjs      # commits that credit an AI tool
node examples/real/ai-allowed/verify.mjs          # every quote and trailer against its repository, live stars
node examples/real/ai-allowed/build.mjs
node examples/real/ai-allowed/audit.mjs           # every number on the posters
node examples/real/ai-allowed/export.mjs          # PNGs through the download button, and Reddit-size previews
```

`verify.mjs` checks all 50 projects: every quoted excerpt appears word for word in its file, and every cited commit carries its AI trailer.
`audit.mjs` checks the counts, the names in the headlines and keys, and that every printed quote is part of a verified one.
`fit.test.mjs` picks every bar of the chart in turn and checks that its words fit the readout, at 1280 and 390 pixels; `overlap.test.mjs` checks that the box and its hint keep 12 pixels from every bar and label.
The rhp checker reports no problems for either page at 1280, 1024, 768, 390, 360 and 320 pixels.
Open the HTML with an internet connection for the pinned rhp module and the PNG exporter.
