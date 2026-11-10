# Macklemore and Madison Square Garden

Two Reddit posters answering MSG's statement that Macklemore is "not an arena level act".

- `msg-headliners.html` and `.png`: the arena's 15 music headliners from July 30 to October 31, 2026, against his monthly listeners.
- `macklemore-rise.html` and `.png`: his listeners since September 2022, and the three European arenas reported sold out.

`post.txt` has the proposed titles and first comments.
`research.txt` records the audience evidence and the limits of the claim.

## Display

Both posters are 800 by about 1,068 CSS pixels, exported at 2x as 1600 by about 2,136.
In Reddit's desktop feed they show at about 404 by 540, and on a phone at 390 by 521.
`export.mjs` writes those previews to `previews/`, which is not committed.
The PNG leaves out the "tap or point" hint, which only applies to the web page.

## Data

| What | Source | File |
|---|---|---|
| Shows at MSG, July 30 to November 7, 2026 | setlist.fm venue listing, 12 pages | `sources/setlistfm`, `shows.json` |
| Listeners of acts above 5.95M, November 8, 2026 | kworb.net listener table | `sources/kworb` |
| Listeners of smaller acts | Spotify artist pages (rounded by Spotify) | `sources/spotify` |
| Macklemore's history | kworb.net tables in Internet Archive copies | `sources/wayback`, `history.json` |

The saved pages in `sources/` are not committed (65 MB, mostly Internet Archive copies), so rerunning the parsers means saving them again.
`parse_shows.py` and `parse.py` read the saved pages, and `analyze.py` writes `data.json`.
`node build.mjs` then builds both pages, and `node export.mjs` saves the PNGs.

## Who counts as a headliner

Each night's headliner comes from setlist.fm's listing and the tour's own dates.
Openers are not counted.
Three kinds of entry are left out: Dave Chappelle (comedy), the NYC Still Rising benefit of September 10, and Avery Wilson on October 20, for whom no concert could be confirmed.
Every other act counts once, however many nights it played.

## Why the window is 14 weeks

setlist.fm limits how fast its pages can be read, and collection stopped at 12 pages rather than pushing past that limit.
A longer window needs setlist.fm's official API, which requires a key.
