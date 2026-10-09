// Step 3: the lyrics, from Genius.
// Each album from step 2 is found on Genius, and each track of its standard edition is matched to a
// Genius song by title. Genius album pages often hold bonus tracks too: only the matched ones count.
// A track missing from the album page is looked for with a song search.
// Lyrics come from each song's embed, which carries the same text and section headers as its page.
//
// Writes data/tracks.json (what matched what, no lyrics) and data/names.json (who counts as the artist in a
// section header: their names, aliases, and a group's members; and who has died, for leaving out posthumous albums). The lyrics themselves stay in cache/songs/,
// which is never committed.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT, json, text, each } from "./http.mjs";
import { CHOICES } from "./choices.mjs";
import { simple, alike } from "./simple.mjs";
import artists from "../data/artists.json" with { type: "json" };

const GENIUS = "https://genius.com/api";
const MB = "https://musicbrainz.org/ws/2";

// Every album an artist has on Genius, page by page
const shelves = new Map();

async function albumsOnGenius(id) {

  if (!shelves.has(id)) {
    shelves.set(id, (async () => {
      const all = [];

      for (let page = 1; page; ) {
        const list = await json(`${GENIUS}/artists/${id}/albums?page=${page}&per_page=50`);
        all.push(...list.response.albums);
        page = list.response.next_page;
      }

      return all;
    })());
  }

  return shelves.get(id);
}

// The Genius album for an album: from the artist's own albums on Genius first, then by a search (for an album filed
// under another artist, as a duo's album is)
async function geniusAlbum(artist, album, ids) {

  const score = (a) => alike(a.name, album.title) - (/deluxe|expanded|anniversary|edition|instrumental/i.test(a.name) ? 0.05 : 0);
  const best = (list) => list.map((a) => ({ a, s: score(a) })).sort((x, y) => y.s - x.s)[0];

  for (const id of ids) {
    const hit = best(await albumsOnGenius(id));
    if (hit && hit.s >= 0.85) return hit.a;
  }

  // The album's artist on Genius is ours, or one named in the album's credit ("Malibu Ken" for Aesop Rock and TOBACCO)
  const owns = (a) => ids.includes(a.artist.id) || simple(a.artist.name).includes(simple(artist.name)) || simple(album.credit ?? "").includes(simple(a.artist.name));

  // An album credited to another name (Deltron 3030) is searched by that name first
  for (const who of credits(artist, album)) {
    const found = await json(`${GENIUS}/search/album?q=${encodeURIComponent(`${who} ${album.title}`)}`);
    const hit = best(found.response.sections.flatMap((s) => s.hits.map((h) => h.result)).filter(owns));
    if (hit && hit.s >= 0.8) return hit.a;
  }

  return null;
}

async function albumTracks(albumId) {

  const tracks = [];

  for (let page = 1; page; ) {
    const list = await json(`${GENIUS}/albums/${albumId}/tracks?page=${page}&per_page=50`);
    tracks.push(...list.response.tracks.map((t) => t.song));
    page = list.response.next_page;
  }

  return tracks;
}

// The names to search an album's songs by: its credit when that is another name, then the artist's
function credits(artist, album) {
  return [...new Set([album.credit, artist.name].filter((c) => c && simple(c) !== "").filter((c, i, all) => i === all.length - 1 || simple(c) !== simple(artist.name)))];
}

async function searchSong(artist, album, title, ids) {

  const by = (s) => s.primary_artist?.name ?? "";
  const ours = (s) => ids.includes(s.primary_artist?.id) || simple(by(s)).includes(simple(artist.name)) || (by(s) && simple(album.credit ?? "").includes(simple(by(s))));

  for (const who of credits(artist, album)) {
    const found = await json(`${GENIUS}/search/song?q=${encodeURIComponent(`${who} ${title}`)}`);
    const hits = found.response.sections.flatMap((s) => s.hits.map((h) => h.result)).filter(ours);
    const best = hits.map((s) => ({ s, score: alike(s.title, title) })).sort((x, y) => y.score - x.score)[0];
    if (best && best.score >= 0.85) return best.s;
  }

  return null;
}

function decode(html) {
  return html.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
}

// The lyrics of a Genius song as plain text with its section headers, or null when Genius has none
export async function lyrics(songId) {

  const src = await text(`https://genius.com/songs/${songId}/embed.js`);
  if (!src) return null;
  const literal = src.match(/JSON\.parse\('((?:[^'\\]|\\.)*)'\)/)?.[1];
  if (!literal) return null;
  const html = JSON.parse(literal.replace(/\\(u[0-9a-fA-F]{4}|.)/g, (_, c) => (c.length > 1 ? String.fromCharCode(parseInt(c.slice(1), 16)) : c)));
  const start = html.indexOf('class="rg_embed_body"');
  const end = html.lastIndexOf("<div", html.indexOf('class="rg_embed_footer"'));
  if (start < 0) return null;
  const body = html.slice(html.indexOf(">", start) + 1, end < start ? undefined : end);
  const lines = decode(body.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]+>/g, "")).replace(/\n{3,}/g, "\n\n").trim();
  // An empty body, or Genius's note that the lyrics are not out yet, is no lyrics
  return lines && !/^lyrics for this song have yet to be/i.test(lines) ? lines : null;
}

// Who the artist is: the names that count as them in a part's header (theirs, their aliases, the names of the other
// artists in choices.mjs they also record as, and their members for a group), the day they died, if they have, and the
// members of a group who have died, with their names
async function people(artist, choice) {

  const all = new Set([artist.name, artist.sheet, artist.check.genius?.name, ...(choice.names ?? [])].filter(Boolean));
  // A joint name ("Redman & Method Man") is never one of the rapper's own names: headers name the two apart
  const keep = (list) => [...new Set(list.filter((n) => simple(n).length >= 2 && !/\s(&|and|x|\+)\s|\//i.test(n)))].sort();
  let died = null;
  const dead = [];

  for (const id of [artist.musicbrainz, ...(choice.also ?? [])]) {
    const mb = await json(`${MB}/artist/${id}?inc=aliases+artist-rels&fmt=json`);
    all.add(mb.name);
    if (id === artist.musicbrainz && mb.type === "Person" && mb["life-span"]?.ended) died = mb["life-span"].end;

    for (const alias of mb.aliases ?? []) {
      all.add(alias.name);
    }

    // Members count only for the rapper's own group: the other half of a duo under another name ("Method Man &
    // Redman", Madvillain's Madlib) is not the rapper
    for (const rel of id === artist.musicbrainz ? mb.relations ?? [] : []) {
      if (rel.type !== "member of band" || rel.direction !== "backward") continue;
      const member = await json(`${MB}/artist/${rel.artist.id}?inc=aliases&fmt=json`);
      const known = [rel.artist.name, ...(member.aliases ?? []).map((a) => a.name)];
      // choices.mjs may give a member more names, under any name MusicBrainz knows them by
      const more = Object.entries(choice.members ?? {}).filter(([key]) => known.some((n) => simple(n) === simple(key))).flatMap(([, list]) => list);
      const own = [...known, ...more];

      for (const name of own) {
        all.add(name);
      }

      if (member["life-span"]?.ended && member["life-span"].end) dead.push({ name: rel.artist.name, names: keep(own), died: member["life-span"].end });
    }
  }

  return { names: keep([...all]), died, dead, credited: choice.attribution === "credited" };
}

// The artist's albums from step 2, waiting for them while step 2 is still running
async function albumsOf(artist) {

  for (;;) {
    const list = JSON.parse(await readFile(join(ROOT, "data", "albums.json"), "utf8"));
    const found = list.find((d) => d.name === artist.name);
    if (found) return found.albums;
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

await mkdir(join(ROOT, "cache", "songs"), { recursive: true });

// ONLY="Nas,Common" runs a few artists, for trying a change
const only = process.env.ONLY?.split(",");
const chosen = artists.filter((a) => !only || only.includes(a.name));

// tracks.json and names.json keep every artist's entry, in the order of artists.json, and are written after each
// artist, one write at a time, so the next steps can start on the artists done so far
const read = async (file, empty) => {
  try {
    return JSON.parse(await readFile(join(ROOT, "data", file), "utf8"));
  } catch {
    return empty;
  }
};
const report = new Map((await read("tracks.json", [])).map((r) => [r.name, r]));
const nameList = await read("names.json", {});
let writing = Promise.resolve();

function save() {

  const order = artists.map((a) => a.name);
  const tracks = order.filter((n) => report.has(n)).map((n) => report.get(n));
  const names = Object.fromEntries(order.filter((n) => nameList[n]).map((n) => [n, nameList[n]]));
  writing = writing.then(() => Promise.all([
    writeFile(join(ROOT, "data", "tracks.json"), JSON.stringify(tracks, null, 1) + "\n"),
    writeFile(join(ROOT, "data", "names.json"), JSON.stringify(names, null, 1) + "\n"),
  ]));
  return writing;
}

// Three artists at a time: the requests to Genius still go through its one queue
await each(chosen, 3, async (artist) => {
  try {
    await lyricsOf(artist);
  } catch (error) {
    console.warn(`${artist.name}: ${error.message} (run this step again to finish it)`);
  }
});

async function lyricsOf(artist) {

  const choice = CHOICES[artist.name] ?? {};
  const ids = [artist.genius, ...(choice.geniusArtists ?? [])];
  const albums = await albumsOf(artist);
  const songs = [];
  const matched = [];

  for (const album of albums) {
    const page = choice.genius?.[album.title] ? (await json(`${GENIUS}/albums/${choice.genius[album.title]}`)).response.album : await geniusAlbum(artist, album, ids);
    const pool = page ? await albumTracks(page.id) : [];
    const used = new Set();
    const tracks = [];

    for (const [i, track] of album.tracks.entries()) {
      if (/\bskit\b/i.test(track.title)) {
        tracks.push({ title: track.title, skipped: "skit" });
        continue;
      }

      const best = pool.map((s, j) => ({ s, score: alike(s.title, track.title) - Math.abs(i - j) * 0.001 }))
        .filter((x) => !used.has(x.s.id)).sort((x, y) => y.score - x.score)[0];
      let song = best && best.score >= 0.75 ? best.s : null;
      if (!song) song = await searchSong(artist, album, track.title, ids);
      if (song) used.add(song.id);
      // Who Genius credits on the song, for the rappers whose parts are told apart by credits (choices.mjs)
      const credits = song ? [song.primary_artist?.name, ...(song.featured_artists ?? []).map((a) => a.name)].filter(Boolean) : [];
      tracks.push({ title: track.title, genius: song?.id ?? null, geniusTitle: song?.title ?? null, instrumental: song?.instrumental ?? false, credits });
    }

    await each(tracks.filter((t) => t.genius && !t.instrumental), 4, async (t) => {
      t.text = await lyrics(t.genius);
    });

    songs.push({ title: album.title, year: album.year, date: album.date, with: album.with, genius: page?.id ?? null, tracks });
    matched.push({
      title: album.title,
      year: album.year,
      genius: page ? `${page.id} ${page.name}` : null,
      tracks: tracks.map((t) => (t.skipped ? `${t.title}: skipped (${t.skipped})` : t.genius ? `${t.title} = ${t.geniusTitle} ${t.genius}${t.instrumental ? " (instrumental)" : t.text ? "" : " (no lyrics)"}` : `${t.title}: NOT FOUND`)),
    });
  }

  nameList[artist.name] = await people(artist, choice);
  await writeFile(join(ROOT, "cache", "songs", simple(artist.name) + ".json"), JSON.stringify({ name: artist.name, albums: songs }));
  const all = songs.flatMap((a) => a.tracks.filter((t) => !t.skipped));
  const found = all.filter((t) => t.text).length;
  report.set(artist.name, { name: artist.name, albums: matched });
  await save();
  console.log(`${artist.name.padEnd(28)} ${songs.length} albums, ${found}/${all.length} songs with lyrics`);
}
