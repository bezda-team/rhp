# Election Night 2026

A live results article for the 2026 midterm elections, built with rhp: the Senate, the House and the governors, from the whole country down to a single county, updating as the votes are counted.

## Run it

```sh
npm install          # at the repository's root: Vite, Solid and the Solid plugin come from there
npm run build        # at the root too: the article imports @bezda/rhp from this repository's dist/
node examples/election-night/site.mjs          # a dev server at http://localhost:5175
node examples/election-night/site.mjs build    # examples/election-night/dist/, a static site
```

The page needs no server of its own: it reads the results from the browser.

## Screens

- **Nation** (`#/`): who is winning each chamber, the wire (calls, flips, lead changes, poll closings), the next poll closing, the races that decide the Senate, a tile map of every Senate or governor's race, how far fully counted counties moved since 2024, and the closest House races.
- **Senate**, **House**, **Governors** (`#/senate`, `#/house`, `#/governors`): each chamber's balance of power and all its races.
- **A race** (`#/race/<id>`): its candidates, the count and the vote still out, how the lead moved, and every county.

Pointing at a race anywhere lights it in every chart on the page, and a click or Enter opens it.

## Data

Vote counts are the Associated Press's, from the files The New York Times publishes for its own live results pages (`static01.nyt.com/elections-assets/pages/data/2026-11-03/`).
Race calls come from several news organizations' decision desks, each from the files its own live results pages read:

| Desk | Files | Read by |
|---|---|---|
| The Associated Press | the Times's results files | any page |
| CNN | `politics.api.cnn.io/results/national-races/` | any page |
| Fox News | `feeds-elections.foxnews.com/.../2026_Generals/` | any page |
| NBC News | `nbcnews.com/firecracker/api/v2/national-results/` | the article's server |
| CBS News | `cbsnews.com/election-api/2026/general-races.json` | the article's server |

NBC News and CBS News let no other site read their files from a browser, so the article's server reads them: `server/election-calls.js` passes on their calls only, at `/api/election-night-calls`.
The CDN keeps its answer 20 seconds, so their files are read about three times a minute however many people read the article.
The dev server (`site.mjs`) and the rhp site both serve it; a copy without it leaves those two desks out, as it leaves out any desk whose file stops answering.
A desk's call counts only once the desk has released it (CNN's file can hold a call under embargo until the polls close), and only when it names one of the AP's candidates.
The reader chooses whose calls the page counts, at the top of every screen: the first desk to call a race, or one desk.

- `src/feed/worker.js` downloads the files in a worker (the Senate's, the governors' and the desks' every 20 seconds, the House's 9 MB every 45, and the open race's own file every 15), so the page never parses them itself.
- `src/feed/normalize.js` turns the AP's files into the few fields the article draws, and `src/feed/desks.js` reads each desk's calls.
  Their functions are pure, so Node can run them on a saved file.
- `src/feed/store.js` keeps the page's copy and compares each update with the one before: a desk's new call, a lead that changed hands, the first votes in a race.
  Those become the wire's entries and the notifications.

Only the AP's calls carry a time (and Fox's House calls).
The page times every other call when it first sees it, keeps that time in the browser, and writes "by" before a call that was already made when the page opened.

Every call on the wire, in a notification and on a race page links to that desk's own results page.
The page uses the AP's vote counts, calls and expected vote, and the race ratings and 2024 presidential margins in the same files.
It shows none of the news organizations' text, model estimates or images.
The governors not up this year (14) are written in `normalize.js`, since the governors' file carries no seat totals.

Candidate portraits are free-licensed photos from Wikimedia Commons, found through Wikidata (`data/portraits.json` has each one's file, author and license; the images are in `public/portraits/`).
A candidate without a confident match gets initials instead.
Each candidate's introduction is the opening of their English Wikipedia article (CC BY-SA), linked beside it: `node pipeline/people.mjs` writes `data/people.json` from the Wikidata items in `data/portraits.json`.

## On the rhp site

The site's gallery serves the built page at `/gallery/articles/election-night/` (rhp-documentation: `npm run sync-articles` copies `dist/election-night.html` and `dist/portraits/`, and `npm run article-thumbnails election-night` takes the card's pictures).
There it shows a view count and a like button, as the site's other article does: `src/Engagement.jsx` draws them, and `server/article-stats.js` is the API the sync copies to `/api/election-night-stats`, with its own keys in the site's Redis database.
The sync also copies `server/election-calls.js` to `/api/election-night-calls`.

## Development

`?demo` in the address (dev server only) replays the latest calls as notifications.
