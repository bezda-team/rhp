// The facts the article's text states, worked out from the data so the text stays true for it

import { ARTISTS, ERAS, FIELD, SAMPLE } from "./data.js";

const sum = (list, f) => list.reduce((s, x) => s + f(x), 0);

function median(values) {

  const v = [...values].sort((a, b) => a - b);
  const h = (v.length - 1) / 2;
  return (v[Math.floor(h)] + v[Math.ceil(h)]) / 2;
}

function ranks(list, f) {
  return new Map([...list].sort((a, b) => f(b) - f(a)).map((a, i) => [a.name, i + 1]));
}

// Posthumous albums left out, by rapper, and the group albums kept although a member who had died raps a line on them
export const POSTHUMOUS = ARTISTS.map((a) => ({ name: a.name, albums: a.left.filter((l) => l.why === "posthumous") })).filter((p) => p.albums.length);
export const ARCHIVAL = ARTISTS.flatMap((a) => a.albums.filter((al) => al.late > 0).map((al) => ({ name: a.name, ...al })));

export const TOTALS = {
  rappers: ARTISTS.length,
  albums: sum(ARTISTS, (a) => a.albums.length),
  songs: sum(ARTISTS, (a) => a.songs),
  words: sum(ARTISTS, (a) => a.words),
  left: sum(ARTISTS, (a) => a.left.length),
  posthumous: sum(ARTISTS, (a) => a.left.filter((l) => l.why === "posthumous").length),
};

// The two leaders: the most different words in all, and the most per 35,000 words
const byTotal = [...ARTISTS].sort((a, b) => b.unique - a.unique);
const counted = ARTISTS.filter((a) => a.sample);
const byFair = [...counted].sort((a, b) => b.fair - a.fair);
export const MOST = byTotal[0];
export const SECOND = byTotal[1];
export const RICHEST = byFair[0];
export const RICHEST_2019 = [...ARTISTS].sort((a, b) => b.pudding - a.pudding)[0];
export const FEWEST = byFair.at(-1);
export const UNCOUNTED = ARTISTS.filter((a) => !a.sample);

// 2019's published places (among all its rappers) against the places in today's per-35,000 view (among the rappers
// it can rank), for the rappers in both
export const THEN = ranks(ARTISTS, (a) => a.pudding);
export const NOW = ranks(counted, (a) => a.fair);
// 2019's places among the same rappers, so a move compares like with like
const THEN_COUNTED = ranks(counted, (a) => a.pudding);
const moves = counted.map((a) => ({ a, from: THEN_COUNTED.get(a.name), to: NOW.get(a.name) })).map((m) => ({ ...m, by: m.from - m.to }));
export const RISERS = [...moves].sort((x, y) => y.by - x.by || x.to - y.to).slice(0, 3);
export const FALLERS = [...moves].sort((x, y) => x.by - y.by || x.to - y.to).slice(0, 3);
export const KEPT_TOP = counted.filter((a) => THEN_COUNTED.get(a.name) <= 10 && NOW.get(a.name) <= 10).length;

// Careers longer now than twice the 2019 yardstick
export const DOUBLED = ARTISTS.filter((a) => a.words >= 2 * SAMPLE).length;

// Careers that thinned: the whole career's average run of 35,000 words below its own first 35,000
export const THINNER = counted.filter((a) => a.sample.mean < a.sample.first);
export const MOST_THINNED = [...counted].sort((a, b) => (a.sample.mean - a.sample.first) - (b.sample.mean - b.sample.first))[0];
export const MOST_GROWN = [...counted].sort((a, b) => (b.sample.mean - b.sample.first) - (a.sample.mean - a.sample.first))[0];

// Albums: the debut against later albums, and the rappers whose late albums still bring the most new words
export const DEBUT = FIELD.byAlbum[0];
export const LATER = FIELD.byAlbum.find((b) => b.album === 5) ?? FIELD.byAlbum.at(-1);
export const LAST_ROW = FIELD.byAlbum.at(-1);
// (an album mostly in another language is left out of this comparison: most of its words are new for that reason)
const veterans = ARTISTS.filter((a) => a.albums.length >= 8);
export const OTHER_LANGUAGE = veterans.filter((a) => a.albums.at(-1).spanish).map((a) => ({ name: a.name, album: a.albums.at(-1) }));
export const STILL_FINDING = veterans.filter((a) => !a.albums.at(-1).spanish)
  .map((a) => ({ a, share: a.albums.at(-1).new / a.albums.at(-1).unique, last: a.albums.at(-1) }))
  .sort((x, y) => y.share - x.share)
  .slice(0, 3);
export const VETERANS = veterans.length;

// Density: an album's different words in every 1,000, which does not depend on the albums before it. Rappers with five
// albums or more whose latest album is denser than their debut
const long = ARTISTS.filter((a) => a.albums.length >= 5 && a.albums[0].density != null && a.albums.at(-1).density != null);
export const LONG = long.length;
export const DENSER = long.filter((a) => a.albums.at(-1).density > a.albums[0].density).length;

// Lupe Fiasco, whose albums got denser after his first two
const lupe = ARTISTS.find((a) => a.name === "Lupe Fiasco");
export const LUPE = lupe && {
  first: lupe.albums.slice(0, 2),
  densest: [...lupe.albums].sort((x, y) => (y.density ?? 0) - (x.density ?? 0))[0],
  later: lupe.albums.slice(2).filter((al) => al.density > Math.max(lupe.albums[0].density, lupe.albums[1].density)).length,
  count: lupe.albums.length,
};

export const COUNTED = counted.length;

// Eras: each era's median per 35,000 words over whole careers, against 2019's median of the first 35,000
export const ERA_MEDIANS = ERAS.map((era) => {
  const all = ARTISTS.filter((a) => a.era === era);
  const fair = all.filter((a) => a.sample).map((a) => a.fair);
  return { era, then: Math.round(median(all.map((a) => a.pudding))), now: fair.length ? Math.round(median(fair)) : null, count: fair.length };
});

// The check against 2019: our count of each rapper's first 35,000 words against 2019's published count
const pairs = counted.map((a) => [a.sample.first, a.pudding]);
const mean = (v) => v.reduce((s, x) => s + x, 0) / v.length;
const mx = mean(pairs.map((p) => p[0]));
const my = mean(pairs.map((p) => p[1]));
let num = 0;
let dx = 0;
let dy = 0;

for (const [x, y] of pairs) {
  num += (x - mx) * (y - my);
  dx += (x - mx) ** 2;
  dy += (y - my) ** 2;
}

export const CHECK = {
  rappers: pairs.length,
  r: num / Math.sqrt(dx * dy),
  median: median(pairs.map(([x, y]) => Math.abs(x - y) / y)),
  within: pairs.filter(([x, y]) => Math.abs(x - y) / y <= 0.1).length,
  // 2019 counted every voice on a song, guests included: counted that way too
  everyVoice: median(counted.filter((a) => a.sampleAll).map((a) => Math.abs(a.sampleAll - a.pudding) / a.pudding)),
};

// The eras with the lowest median then and now
export const LOWEST_THEN = [...ERA_MEDIANS].sort((a, b) => a.then - b.then)[0];
export const LOWEST_NOW = [...ERA_MEDIANS].filter((m) => m.now != null).sort((a, b) => a.now - b.now)[0];

export const GUESTS = median(ARTISTS.map((a) => a.guests));
export { SAMPLE };
