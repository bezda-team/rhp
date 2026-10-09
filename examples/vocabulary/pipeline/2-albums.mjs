// Step 2: each artist's official albums and their track lists.
// MusicBrainz says which releases are official albums, and of which kind: a release group with the
// primary type Album and no secondary type is a studio album. Mixtapes, compilations, live albums,
// remix albums, DJ mixes, soundtracks and demos all carry a secondary type, so they drop out here.
// Wikipedia's discography tables are the second opinion: an album only one of the two lists is
// reported, and settled in choices.mjs.
// Each album's track list is its first standard edition, never a deluxe or anniversary one.
// Writes data/albums.json and data/albums-review.txt.

import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT, json } from "./http.mjs";
import { CHOICES } from "./choices.mjs";
import { simple, alike } from "./simple.mjs";
import artists from "../data/artists.json" with { type: "json" };

const MB = "https://musicbrainz.org/ws/2";
const EXTRA = /\b(deluxe|expanded|anniversary|bonus|special|edition|platinum|reissue|remaster|collector|tour|complete|super|limited|version|instrumentals?)\b/i;

// Every official album release the artist is credited on, grouped by release group
async function releaseGroups(artistId) {

  const groups = new Map();

  for (let offset = 0; ; offset += 100) {
    const page = await json(`${MB}/release?artist=${artistId}&type=album&status=official&inc=release-groups+media+artist-credits&limit=100&offset=${offset}&fmt=json`);

    for (const release of page.releases) {
      const group = release["release-group"];
      if (!groups.has(group.id)) groups.set(group.id, { group, releases: [] });
      groups.get(group.id).releases.push(release);
    }

    if (offset + 100 >= page["release-count"]) break;
  }

  return [...groups.values()];
}

// The release whose track list stands for the album: one from its first year, not a deluxe one, on CD or digital,
// on the fewest discs (a bonus disc drops out; a digital double album is one medium), with the most common
// track count among those, and the fewest tracks on a tie
function standard(group, releases) {

  const year = (group["first-release-date"] ?? "").slice(0, 4);
  const tracks = (r) => r.media.reduce((sum, m) => sum + (m["track-count"] ?? 0), 0);
  let pool = releases.filter((r) => tracks(r) > 0);
  const first = pool.filter((r) => (r.date ?? "").slice(0, 4) === year);
  if (first.length) pool = first;
  const plain = pool.filter((r) => !EXTRA.test(r.disambiguation ?? "") && !EXTRA.test(r.title.replace(group.title, "")));
  if (plain.length) pool = plain;
  const discs = pool.filter((r) => r.media.every((m) => /CD|Digital/.test(m.format ?? "")));
  if (discs.length) pool = discs;
  const fewest = Math.min(...pool.map((r) => r.media.length));
  pool = pool.filter((r) => r.media.length === fewest);
  const often = new Map();

  for (const r of pool) {
    often.set(tracks(r), (often.get(tracks(r)) ?? 0) + 1);
  }

  return pool.sort((a, b) => often.get(tracks(b)) - often.get(tracks(a)) || tracks(a) - tracks(b) || (a.date ?? "9").localeCompare(b.date ?? "9"))[0];
}

async function trackList(releaseId) {

  const release = await json(`${MB}/release/${releaseId}?inc=recordings&fmt=json`);
  return release.media.flatMap((m) => (m.tracks ?? []).map((t) => ({ title: t.title, seconds: Math.round((t.length ?? 0) / 1000) })));
}

// The artist's English Wikipedia page, through MusicBrainz's link to Wikidata
async function wikipediaTitle(artistId) {

  const artist = await json(`${MB}/artist/${artistId}?inc=url-rels&fmt=json`);
  const link = artist.relations.find((r) => r.type === "wikidata")?.url.resource;
  if (!link) return null;
  const qid = link.split("/").pop();
  const data = await json(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`);
  return data.entities[qid]?.sitelinks?.enwiki?.title ?? null;
}

async function wikitext(page) {

  const found = await json(`https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&formatversion=2&redirects=1`);
  return found?.parse?.wikitext ?? null;
}

function linkText(cell) {
  return cell.replace(/<ref[\s\S]*?(<\/ref>|\/>)/g, "").replace(/<br\s*\/?>/gi, " ").replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1").replace(/''+/g, "").replace(/<[^>]+>/g, "").trim();
}

// Parts of a discography that are not albums of new songs
const NOT_ALBUMS = /mixtape|extended play|\bEPs?\b|compilation|live|single|video|remix|guest|featur|soundtrack|instrumental|reissue|box set|other|promotional|unreleased|street|demo/i;

// The album titles under a heading that matches `heading` (table cells or a list), leaving out the parts under a
// sub-heading for mixtapes, EPs, compilations and the like
function section(text, heading) {

  const titles = [];
  const lines = text.split("\n");
  let level = 0;
  let skip = 0;

  for (const line of lines) {
    const h = line.match(/^(=+)\s*(.*?)\s*=+\s*$/);

    if (h) {
      if (level && h[1].length <= level) level = 0;
      if (skip && h[1].length <= skip) skip = 0;
      if (!level && heading.test(h[2])) level = h[1].length;
      else if (level && !skip && NOT_ALBUMS.test(h[2])) skip = h[1].length;
      continue;
    }

    if (!level || skip) continue;
    // A table cell that starts with the title in italics (after its attributes, if any), or a list item that does
    const cell = line.match(/^[|!](?:[^|'\[]*\|)?\s*(''+.+?''+)/);
    const item = line.match(/^\*\s*(''+.+?''+)/);
    const title = cell ? linkText(cell[1]) : item ? linkText(item[1]) : null;
    if (title) titles.push(title.replace(/\s*\(.*?\)\s*$/, ""));
  }

  return titles;
}

// Whether a Wikipedia title and a MusicBrainz title name the same album: "Cypress Hill IV" is "IV",
// "Animal Ambition" is "Animal Ambition: An Untamed Desire to Win", "U Know What I'm Sayin?" is "uknowhatimsayin¿"
function same(a, b, artist) {

  const bare = (t) => simple(t).replace(new RegExp("^" + simple(artist)), "") || simple(t);
  const [x, y] = [bare(a), bare(b)];
  if (x === y) return true;
  if (Math.min(x.length, y.length) >= 6 && (x.startsWith(y) || y.startsWith(x))) return true;
  return alike(x, y) >= 0.85 || alike(a, b) >= 0.85;
}

async function wikipediaAlbums(artist) {

  const page = await wikipediaTitle(artist.musicbrainz);
  if (!page) return { page: null, studio: [], shared: [] };
  const base = page.replace(/\s*\(.*\)$/, "");

  // The discography page, its albums page when it is split in two, then the artist's own page
  for (const source of [`${page} discography`, `${base} discography`, `${base} albums discography`, page]) {
    const text = await wikitext(source);
    if (!text) continue;
    let studio = section(text, /studio albums?|posthumous albums?/i);
    if (!studio.length) studio = section(text, /^albums$|^discography$/i);
    if (studio.length) return { page: source, studio, shared: section(text, /collaborat|joint|with .* albums?|as part of/i) };
  }

  return { page: null, studio: [], shared: [] };
}

const out = [];
const review = [];

for (const artist of artists) {
  const choice = CHOICES[artist.name] ?? {};
  const groups = [];

  for (const id of [artist.musicbrainz, ...(choice.also ?? [])]) {
    for (const g of await releaseGroups(id)) {
      groups.push({ ...g, chosen: id !== artist.musicbrainz });
    }
  }

  // MusicBrainz sometimes has two release groups for one album: the one with more releases comes first and is kept
  groups.sort((a, b) => b.releases.length - a.releases.length);

  const wiki = await wikipediaAlbums(artist);
  const wikiAll = [...wiki.studio, ...wiki.shared];
  const albums = [];
  const lines = [];

  for (const { group, releases, chosen } of groups) {
    if (group["primary-type"] !== "Album" || group["secondary-types"]?.length) continue;
    if (/\b(instrumentals?|a ?cappellas?|acapellas?|remix(es|ed)?)\b/i.test(group.title)) continue;
    if (albums.some((a) => a.musicbrainz === group.id || simple(a.title) === simple(group.title))) continue;

    const credit = group["artist-credit"].map((c) => c.name + c.joinphrase).join("");
    const others = group["artist-credit"].filter((c) => c.artist.id !== artist.musicbrainz && !(choice.also ?? []).includes(c.artist.id)).map((c) => c.name);
    const presents = group["artist-credit"].some((c) => /presents?/i.test(c.joinphrase));
    const inWiki = wikiAll.some((t) => same(t, group.title, artist.name));
    const key = simple(group.title);
    const decided = choice.add?.some((t) => t === group.title || simple(t) === key);
    const dropped = choice.drop?.some((t) => t === group.title || simple(t) === key);
    const year = +(group["first-release-date"] ?? "0").slice(0, 4);

    // Without a discography on Wikipedia, MusicBrainz alone decides
    let keep = (inWiki || !wiki.page || chosen) && !presents;
    if (decided) keep = true;
    if (dropped) keep = false;
    lines.push(`  ${keep ? "+" : "-"} ${year} ${group.title} [${credit}]${inWiki ? "" : "  (not on Wikipedia)"}${presents ? "  (presents)" : ""}`);
    if (!keep) continue;

    const release = standard(group, releases);
    albums.push({
      title: group.title,
      credit,
      year,
      date: group["first-release-date"],
      with: others,
      musicbrainz: group.id,
      release: release.id,
      tracks: await trackList(release.id),
    });
  }

  for (const title of wikiAll) {
    if (!albums.some((a) => same(title, a.title, artist.name)) && !groups.some((g) => same(title, g.group.title, artist.name))) {
      lines.push(`  ? ${title}  (Wikipedia only)`);
    }
  }

  albums.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  out.push({ name: artist.name, albums });
  review.push(`${artist.name}: ${albums.length} albums (${wiki.page ?? "no Wikipedia page"}; Wikipedia lists ${wiki.studio.length} studio, ${wiki.shared.length} shared)`, ...lines.sort((a, b) => a.slice(4).localeCompare(b.slice(4))), "");
  console.log(`${artist.name.padEnd(28)} ${albums.length} albums`);

  // Written after every artist, so step 3 can start on the first ones while this one goes on
  await writeFile(join(ROOT, "data", "albums.json"), JSON.stringify(out, null, 1) + "\n");
  await writeFile(join(ROOT, "data", "albums-review.txt"), review.join("\n") + "\n");
}
