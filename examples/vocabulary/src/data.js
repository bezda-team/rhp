// The numbers from pipeline/4-analyze.mjs, with what the charts work out from them

import { nice } from "@bezda/rhp";
import raw from "../data/vocabulary.json";

export const SAMPLE = raw.sample;
export const STEP = raw.step;
export const FIELD = raw.field;

export const ERAS = ["1980s", "1990s", "2000s", "2010s"];

export const number = new Intl.NumberFormat("en-US");

// A scale that ends just past its furthest mark, with round ticks inside it (nice() alone would round the end up to
// the next round number, and leave up to a fifth of the chart empty)
export function snug(lo, hi, pad = 0.02) {

  const round = nice(lo, hi);
  const max = hi + (hi - lo) * pad;
  return { min: lo, max, ticks: round.ticks.filter((t) => t >= lo && t <= max) };
}
export const compact = (n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

function rankBy(list, value) {

  const ranked = list.filter((a) => value(a) != null).sort((a, b) => value(b) - value(a));
  return new Map(ranked.map((a, i) => [a.name, i + 1]));
}

export const ARTISTS = raw.artists.filter((a) => a.albums.length).map((a) => {

  let words = 0;
  const albums = a.albums.map((album) => {
    words += album.words;
    return { ...album, from: album.total - album.new, to: album.total, words: album.words, through: words };
  });

  return {
    ...a,
    albums,
    fair: a.sample?.mean ?? null,
    first: albums[0].year,
    last: albums.at(-1).year,
  };
});

const catalog = rankBy(ARTISTS, (a) => a.unique);
const fair = rankBy(ARTISTS, (a) => a.fair);

for (const a of ARTISTS) {
  a.rank = { catalog: catalog.get(a.name), fair: fair.get(a.name) ?? null };
}

export const byName = new Map(ARTISTS.map((a) => [a.name, a]));

// The median album's different words per 1,000 words, over every counted album
const densities = ARTISTS.flatMap((a) => a.albums.map((al) => al.density)).filter((d) => d != null).sort((x, y) => x - y);
export const MEDIAN_DENSITY = (densities[Math.floor((densities.length - 1) / 2)] + densities[Math.ceil((densities.length - 1) / 2)]) / 2;
