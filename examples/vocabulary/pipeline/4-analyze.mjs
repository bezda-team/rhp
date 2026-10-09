// Step 4: the numbers.
// Reads the lyrics from cache/songs/ and writes data/vocabulary.json, the only data the article loads, and
// data/attribution-review.txt, whose parts were left out of each artist's words and why.
// Left out: albums Genius has too few lyrics of, and posthumous albums (out after the artist died, or for a group,
// after a member who raps on it died).
// Each artist's words are their own parts only (see words.mjs), album by album in release order,
// each album's songs in track order.

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "./http.mjs";
import { parts, owns, named, words } from "./words.mjs";
import { simple } from "./simple.mjs";
import artists from "../data/artists.json" with { type: "json" };
import names from "../data/names.json" with { type: "json" };

export const SAMPLE = 35000;
const DENSITY = 1000;
const STEP = 2000;

// An album counts when Genius has the lyrics of at least this share of its songs
const COVERAGE = 0.8;

// A group's album is posthumous when members who had died rap at least this share of its words
const LATE = 0.1;

// Whether an album came out after a death: a date given only as a year is not after a death in that same year
function after(release, death) {
  return (release + "-00-00").slice(0, 10) > (death + "-99-99").slice(0, 10);
}

// The commonest small words of Spanish and of English: an album with more of the first is mostly in Spanish
const SPANISH = new Set(["de", "la", "que", "el", "en", "y", "los", "las", "del", "se", "por", "un", "una", "con", "no", "mi", "es", "lo", "tu", "yo", "para", "como", "mas", "pero", "al", "le", "te", "me", "su", "si"]);
const ENGLISH = new Set(["the", "and", "to", "a", "i", "you", "in", "it", "my", "of", "is", "that", "on", "me", "for", "with", "we", "they", "be", "this"]);

function spanish(tokens) {

  let es = 0;
  let en = 0;

  for (const w of tokens) {
    if (SPANISH.has(w)) es++;
    if (ENGLISH.has(w)) en++;
  }

  return es > en;
}

// Words never shown as an example, though they are counted
const UNSHOWN = /^(nigg|niga|negro|fag|faggot|retard|tranny|chink|spic|kike|wetback|dyke|coon|gook|beaner|towelhead)/;

// Sounds that are not words, for telling an ad-lib ("oh-woah-oh-oh") from a word made with hyphens
const SOUNDS = new Set(["ah", "aah", "ay", "ayy", "aye", "da", "eh", "ha", "hah", "hey", "hmm", "ho", "hoo", "huh", "la", "mm", "mmm", "na", "nah", "oh", "ohh", "ooh", "oooh", "uh", "wo", "woah", "whoa", "woo", "ya", "yah", "yea", "yeah", "yo", "yuh"]);

// Whether a word makes a good example: a real word, not a slur, a number, a repeated sound ("la-la-la"), a held note
// ("yeahhh"), a stutter ("f-f-filet") or an ad-lib of sounds ("oh-woah-oh-oh")
function showable(word) {

  const pieces = word.split("-");
  if (pieces.length > 1 && (pieces.some((p) => p.length === 1) || pieces.every((p) => SOUNDS.has(p)))) return false;
  return word.length >= 4 && !UNSHOWN.test(word) && !/\d/.test(word) && !/^(\p{L}+)(-\1)+$/u.test(word) && !/(\p{L})\1\1/u.test(word);
}

// How many different words there are in every run of `size` words in a row: the first run's count, and the
// mean, lowest and highest over all of them
export function runs(tokens, size) {

  if (tokens.length < size) return null;
  const counts = new Map();
  let distinct = 0;
  let sum = 0;
  let low = Infinity;
  let high = 0;
  let first = 0;

  for (let i = 0; i < tokens.length; i++) {
    const n = counts.get(tokens[i]) ?? 0;
    counts.set(tokens[i], n + 1);
    if (n === 0) distinct++;

    if (i >= size) {
      const old = counts.get(tokens[i - size]);
      counts.set(tokens[i - size], old - 1);
      if (old === 1) distinct--;
    }

    if (i >= size - 1) {
      if (i === size - 1) first = distinct;
      sum += distinct;
      low = Math.min(low, distinct);
      high = Math.max(high, distinct);
    }
  }

  return { first, mean: Math.round(sum / (tokens.length - size + 1)), low, high };
}

function count(tokens) {

  const counts = new Map();

  for (const t of tokens) {
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }

  return counts;
}

function median(values) {

  const v = [...values].sort((a, b) => a - b);
  if (!v.length) return null;
  const h = (v.length - 1) / 2;
  return (v[Math.floor(h)] + v[Math.ceil(h)]) / 2;
}

function quantile(values, q) {

  const v = [...values].sort((a, b) => a - b);
  const i = (v.length - 1) * q;
  return v[Math.floor(i)] + (v[Math.ceil(i)] - v[Math.floor(i)]) * (i - Math.floor(i));
}

async function load(artist) {

  const file = join(ROOT, "cache", "songs", simple(artist.name) + ".json");
  const songs = JSON.parse(await readFile(file, "utf8"));
  const who = names[artist.name];
  const own = new Set(who.names.map(simple));
  const dropped = new Map();
  const albums = [];

  for (const album of songs.albums) {
    const tracks = album.tracks.filter((t) => !t.skipped && !t.instrumental);
    const found = tracks.filter((t) => t.text);
    // Members who had died when the album came out: a group's album is posthumous when they rap a tenth of it or more
    // (an archival line of Ol' Dirty Bastard's does not make a Wu-Tang album posthumous; Guru's verses on Gang Starr's
    // last album do)
    const gone = who.dead.filter((m) => after(album.date, m.died)).map((m) => ({ ...m, names: new Set(m.names.map(simple)) }));
    let late = 0;
    const mine = [];
    const all = [];

    for (const track of found) {
      const guests = who.credited ? new Set((track.credits ?? []).map(simple).filter((c) => !own.has(c))) : null;

      for (const part of parts(track.text)) {
        all.push(...part.words);
        if (gone.some((m) => part.performers.some((p) => named(p, m.names)))) late += part.words.length;

        if (owns(part, own, guests)) {
          mine.push(...part.words);
        } else {
          const who = /skit/i.test(part.kind) ? `(skit) ${part.performers.join(" & ")}` : part.performers.join(" & ") || `(${part.kind})`;
          dropped.set(who, (dropped.get(who) ?? 0) + part.words.length);
        }
      }
    }

    const posthumous = (who.died != null && after(album.date, who.died)) || (all.length > 0 && late >= all.length * LATE);
    albums.push({
      title: album.title,
      year: album.year,
      with: album.with,
      songs: found.length,
      of: tracks.length,
      // An album of instrumentals has no song with lyrics, and counts no more than one Genius has not transcribed
      late: all.length ? +(late / all.length).toFixed(3) : 0,
      spanish: spanish(all),
      complete: found.length > 0 && found.length >= tracks.length * COVERAGE,
      instrumental: tracks.length === 0,
      posthumous,
      mine,
      all,
    });
  }

  return { albums, dropped };
}

const loaded = [];

for (const artist of artists) {
  try {
    loaded.push({ artist, ...(await load(artist)) });
  } catch {
    console.warn(`${artist.name}: no lyrics yet (run step 3)`);
  }
}

// How many artists use each word: a word only one artist uses is theirs alone
const users = new Map();

for (const { albums } of loaded) {
  for (const word of new Set(albums.filter((a) => a.complete && !a.posthumous).flatMap((a) => a.mine))) {
    users.set(word, (users.get(word) ?? 0) + 1);
  }
}

const common = loaded.length * 0.25;
const out = [];
const review = [];

for (const { artist, albums: every, dropped } of loaded) {
  const albums = every.filter((a) => a.complete && !a.posthumous);
  const tokens = albums.flatMap((a) => a.mine);
  const all = albums.flatMap((a) => a.all);
  // The words of the artist's own names ("aesop", "makaveli"): no example is the artist naming themselves
  const own = names[artist.name].names.flatMap((n) => words(n)).filter((w) => w.length >= 3);
  const self = (word) => own.some((n) => n.startsWith(word) || word.startsWith(n));
  const seen = new Set();
  const growth = [];
  const rows = [];
  let total = 0;

  for (const album of albums) {
    const counts = count(album.mine);
    const fresh = [...counts.keys()].filter((w) => !seen.has(w));
    const examples = fresh.filter((w) => showable(w) && !self(w) && counts.get(w) >= 2 && (users.get(w) ?? 0) <= common)
      .sort((a, b) => counts.get(b) - counts.get(a) || a.localeCompare(b)).slice(0, 4);

    for (const word of album.mine) {
      total++;
      seen.add(word);
      if (total % STEP === 0) growth.push([total, seen.size]);
    }

    if (growth.at(-1)?.[0] !== total) growth.push([total, seen.size]);

    rows.push({
      title: album.title,
      year: album.year,
      with: album.with,
      songs: album.songs,
      words: album.mine.length,
      unique: counts.size,
      new: fresh.length,
      total: seen.size,
      density: runs(album.mine, DENSITY)?.mean ?? null,
      late: album.late,
      spanish: album.spanish,
      examples,
    });
  }

  const counts = count(tokens);
  const signature = [...counts].filter(([w, n]) => users.get(w) === 1 && n >= 4 && showable(w) && !self(w))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12);
  const left = every.filter((a) => !a.complete || a.posthumous)
    .map((a) => ({ title: a.title, year: a.year, why: a.posthumous ? "posthumous" : a.instrumental ? "instrumental" : `lyrics for ${a.songs} of ${a.of} songs` }));
  const kept = tokens.length;

  out.push({
    name: artist.name,
    era: artist.era,
    pudding: artist.pudding,
    words: kept,
    unique: counts.size,
    songs: rows.reduce((sum, a) => sum + a.songs, 0),
    guests: all.length ? +(1 - kept / all.length).toFixed(3) : 0,
    sample: runs(tokens, SAMPLE),
    sampleAll: runs(all, SAMPLE)?.first ?? null,
    albums: rows,
    left,
    growth,
    signature,
  });

  const top = [...dropped].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([who, n]) => `${n} ${who}`).join(", ");
  review.push(`${artist.name}: kept ${kept} of ${all.length} words (${Math.round((100 * kept) / (all.length || 1))}%). Left out: ${top}`);
  if (left.length) review.push(`  left out: ${left.map((a) => `${a.title} (${a.year}, ${a.why})`).join(", ")}`);
  console.log(`${artist.name.padEnd(28)} ${String(kept).padStart(7)} words ${String(counts.size).padStart(6)} unique  first 35k ${out.at(-1).sample?.first ?? "-"} (2019: ${artist.pudding})`);
}

// The field: the median artist's vocabulary after each 2,000 words, while at least 20 artists have that many,
// and the new words of each album by its place in a career, while at least 20 artists have that many albums
const field = { growth: [], byAlbum: [] };

for (let w = STEP; ; w += STEP) {
  const reached = out.map((a) => a.growth.find(([n]) => n === w)?.[1]).filter((u) => u != null);
  if (reached.length < 20) break;
  field.growth.push([w, Math.round(median(reached))]);
}

for (let k = 0; ; k++) {
  const nth = out.map((a) => a.albums[k]).filter(Boolean);
  if (nth.length < 20) break;
  const fresh = nth.map((a) => a.new);
  const share = nth.map((a) => a.new / a.unique);
  field.byAlbum.push({
    album: k + 1,
    artists: nth.length,
    new: Math.round(median(fresh)),
    low: Math.round(quantile(fresh, 0.25)),
    high: Math.round(quantile(fresh, 0.75)),
    share: +median(share).toFixed(3),
    density: Math.round(median(nth.map((a) => a.density).filter((d) => d != null))),
  });
}

await writeFile(join(ROOT, "data", "vocabulary.json"), JSON.stringify({ sample: SAMPLE, step: STEP, field, artists: out }) + "\n");
await writeFile(join(ROOT, "data", "attribution-review.txt"), review.join("\n") + "\n");
