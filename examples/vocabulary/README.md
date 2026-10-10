# Every word they ever rapped

A long-form article built with rhp: the largest vocabularies in hip hop, counted over each rapper's whole official discography.
It follows [The Largest Vocabulary in Hip Hop](https://pudding.cool/projects/vocabulary/index.html) (Matt Daniels, The Pudding, 2014, updated 2019), which counted the different words in each rapper's first 35,000 words.
This one counts every word on every official album, for the same 149 rappers, through October 2026.

The example has two parts:

- `pipeline/`, a small data project that finds each rapper's albums, gets their lyrics and counts their words;
- the article itself (`index.html`, `src/`), a Solid app that draws its charts with rhp.

## Run the article

```sh
npm install          # at the repository's root: Vite, Solid and the Solid plugin come from there
npm run build        # at the root too: the article imports @bezda/rhp from this repository's dist/
node examples/vocabulary/site.mjs          # a dev server at http://localhost:5174
node examples/vocabulary/site.mjs build    # examples/vocabulary/dist/, a static site
```

The article reads only `data/vocabulary.json`, which is committed, so it runs without the pipeline.

## Run the pipeline

```sh
node pipeline/1-artists.mjs    # data/artists.json: the 149 rappers on MusicBrainz and on Genius
node pipeline/2-albums.mjs     # data/albums.json: their official albums and each album's track list
node pipeline/3-lyrics.mjs     # cache/songs/: the lyrics; data/tracks.json and data/names.json
node pipeline/4-analyze.mjs    # data/vocabulary.json: the numbers the article draws
node pipeline/5-portraits.mjs  # data/portraits.json and cache/portraits/: a free portrait of each rapper
python3 -I pipeline/check.py   # an independent recount of vocabulary.json, in Python
```

Every response is kept gzipped in `cache/http/`, so a step that runs again downloads nothing it already has.
A full run makes about 2,500 requests to MusicBrainz (one a second, as it asks) and about 30,000 to Genius, so the first run takes a few hours.
Genius limits its search more strictly than its other pages, and the pipeline waits it out.
A step that stops halfway can simply run again.
`ONLY="Nas,Common" node pipeline/3-lyrics.mjs` runs a few rappers, for trying a change.

**The lyrics and the portraits are never committed.**
`cache/` is ignored by git.
What the repository keeps is derived from them: counts, and for each rapper up to a dozen words only they used and up to four new words per album.
The article's build puts the portraits it finds in `cache/portraits/` into the page; without them it draws initials.

## The rules

### Which rappers

The 149 rappers the 2019 article ranked, from its published data (`data/pudding-2019.csv`), with its era for each.
The rows it marked "remove" stay out.

### Which albums

Every official album released under the rapper's name, alone or jointly (Watch the Throne counts for Jay-Z and for Kanye West), through October 2026.

- **Studio albums only.** MusicBrainz types every release group. An album with no secondary type is a studio album, and the rest drop out: mixtapes, compilations, best-ofs, live albums, remix albums, DJ mixes, soundtracks and demos. Only official releases count, so bootlegs drop out too.
- **A second opinion.** An album also has to be in the rapper's discography on Wikipedia, as a studio or a collaborative album. `data/albums-review.txt` lists, for every rapper, what both sources say and what was kept. Disagreements were settled by hand in `pipeline/choices.mjs`, each with its reason.
- **The rapper under another name counts when they are its only rapper:** a persona (MF DOOM as Viktor Vaughn, Kool Keith as Dr. Octagon), or a duo with a producer or a DJ (Eric B. & Rakim, Madvillain, Kool G Rap & DJ Polo, PRhyme). Duos of two headliners under a new name (Black Star, Kids See Ghosts, The Carters) do not.
- **No posthumous albums.** An album released after the rapper died is left out (2Pac from *The Don Killuminati* on, Big L, DMX, Mac Miller, MF DOOM's last). So is a group's album on which members who had died rap a tenth of the words or more (Gang Starr's *One of the Best Yet*, UGK's *UGK 4 Life*, A Tribe Called Quest's last); an archival line does not count (Ol' Dirty Bastard's on two later Wu-Tang Clan albums, about 1% of each).
- **The standard edition.** Each album's track list is its first standard release on MusicBrainz, never a deluxe or anniversary edition. Tracks named "Skit" are left out.
- **Never released.** Albums that were never publicly released are left out (Wu-Tang Clan's *Once Upon a Time in Shaolin*, Foxy Brown's *Ill Na Na 2*).

### Which words

Lyrics come from Genius, as in 2019.
Each MusicBrainz track is matched to a Genius song by title.
An album counts only when Genius has the lyrics of at least 80% of its songs; the few that fall short are named in the article (mostly albums released in the last weeks, or too obscure for Genius).
An album whose songs are all instrumentals (a beat tape) has no lyrics to count and is left out too.

Only the rapper's own words count.
Genius marks who performs each part of a song (`[Verse 2: Kanye West]`, `[Chorus: Nas & Lauryn Hill]`).
A part counts when it names no performer, or names the rapper: their name, an alias, or for a group one of its members (from MusicBrainz, plus a few nicknames in `choices.mjs`).
Parts by guests and skits do not count.
A name matches when it is the same, a longer or a shorter form of one of the rapper's names ("Raekwon the Chef", "Busta"), one typing slip away ("Talib Kewli"), or in quotes inside a full name ('Sandra "Pepa" Denton').
A joint name such as "Method Man & Redman" is never one of the rapper's own: on *Blackout!* Redman's verses count for Redman and Method Man's for Method Man.
One rapper is told apart differently: $uicideboy$ credit their verses to dozens of personas (Oddy Nuff da Snow Leopard, $lick $loth, Yung Plague and more) that Genius credits on none of their songs, so for them a part counts unless it names a guest Genius credits on the song.
`data/attribution-review.txt` lists, for every rapper, the words left out and whose they were; it was read for all 149, and every name it showed missing was added.

Words are counted by the 2019 article's rules (`pipeline/words.mjs`):

- lowercase, with apostrophes removed, so *pimpin'* and *pimpin* are one word;
- every spelling is its own word, so *pimp*, *pimps*, *pimping* and *pimpin* are four;
- hyphenated words stay whole (*hip-hop*), numbers count, bracketed asides (*[?]*) do not.

### The numbers

For each rapper:

- **different words**: every distinct word on every counted album;
- **new words per album**: the words an album has that none of the rapper's earlier albums had. They add up to the different words, which is why each bar in the ranking is a row of its albums;
- **per 35,000 words**: the different words in every run of 35,000 words in a row through the whole career, averaged, with the weakest and the strongest run. It keeps the 2019 article's yardstick, which a choruses-and-verses text needs (35,000 words picked at random would count far more different words), but measures the whole career instead of its start;
- **the first 35,000**, recounted, to check the pipeline against 2019's published counts;
- **how the vocabulary grew**: different words so far after every 2,000 words, and the median rapper's line, while at least 20 rappers have rapped that many words.

### The portraits

Each rapper's portrait is the picture Wikidata gives them (property P18), a file on Wikimedia Commons under a free license, fetched at 120px.
The article credits each one where it is shown large, with its author and license linked to the file's page.
A picture credited to a sheriff's office or a police department is a booking photo, not a portrait.
Where Wikidata gives only a booking photo (Trick Daddy), or a portrait too tight for a circle (Jay-Z's showed his head and nothing around it), another free file on Commons is picked by hand, with the square kept from it (`CHOSEN` in `pipeline/5-portraits.mjs`).
Five rappers keep their initials, with no usable free picture on Commons: Big L, Geto Boys (its members only, one at a time) and K.A.A.N. have none, the pictures of Goodie Mob show the group too small for a circle, and the one of Rittz shows his face behind his fist and microphone.
`node pipeline/5-portraits.mjs <name>…` redoes only the rappers named.

## The article

- **The ranking** draws each rapper as a row of their albums.
  The first time it comes into view, the shelves are stacked album by album.
- **Switching the count** (every album, or per 35,000 words) happens in two beats: the shelves shrink or grow in place, then the slats slide to their new places.
  A slat that comes into the list (the top 25, or an era) rises from the last place as it fades in, and a slat that leaves slides down to the last place as it fades out, so no slat appears or vanishes in one frame.
  The rapper whose breakdown is open stays in the list, below the top 25 if the switch takes them there.
- **Picking a rapper**, by a click or a tap in any chart, or by name in the search box, picks them in every chart: their breakdown opens in the ranking, their face sits on each column of the album chart at their own album's new words, and they are lifted in the era chart.
  A chip in the corner names them, goes back to their albums, and lets them go.
- **Opening a rapper** is a view transition: their albums fly off the shelf into the album-by-album chart, and back when it closes.
- **The era chart**'s faces start at their era's 2019 median and spread to their places when it comes into view.
  An era's name filters the ranking.
- **Picking from further down the page** (a face or an era's name in the era chart) opens the rapper or the era in the ranking without moving the page: what was clicked stays where it is on screen, in every frame, while the ranking above grows.
  Letting go with the chip's × does the same for what is in the middle of the screen, and "Show the top 25 only" keeps the button where it is.
  Picking in the ranking itself still goes to the rapper's breakdown.
- With reduced motion asked for, everything is drawn in place at once.
- A page that carries `<meta name="back-link" content="<url>" data-label="<name>">` shows a link back there in place of the kicker: the rhp site's copy of the article (its `npm run sync-articles` adds it) links back to the gallery.

`check-page.mjs` checks what the built page (or the page at a URL it is given) draws against `data/vocabulary.json`: every rank, name, number and bar length in the ranking, every rapper's breakdown, and the two charts about everyone.

## Files

| | |
|---|---|
| `pipeline/http.mjs` | requests with a cache, one queue per host |
| `pipeline/simple.mjs` | comparing titles and names across MusicBrainz, Wikipedia and Genius |
| `pipeline/choices.mjs` | the decisions made by hand |
| `pipeline/words.mjs` | lyrics to words, and whose part is whose |
| `data/` | the inputs and outputs worth reviewing; all of it committed |
| `src/Ranking.jsx` | the ranking: shelves of albums, the views, opening a rapper |
| `src/Dossier.jsx` | a rapper's breakdown |
| `src/Field.jsx` | the charts about every rapper at once |
| `src/state.js` | what the charts share: the rapper picked, the rapper pointed at, the era |
| `src/faces.jsx`, `src/Picked.jsx` | the portraits and their credits; the chip for the rapper picked |
| `src/article.css` | the page: tokens for both themes, type, layout |
