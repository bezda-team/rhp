// Step 5: a portrait of each rapper, when Wikimedia Commons has a free one.
// The picture is the one Wikidata gives the rapper (property P18), which is always a file on Commons under a free
// license, or one picked by hand (CHOSEN). Writes data/portraits.json: for each rapper the file, its author, its license
// and the link the license asks for. The images themselves go to cache/portraits/ (never committed); the article's
// build puts them in the page.
// node pipeline/5-portraits.mjs [name...] redoes only the rappers named, and keeps everyone else's portrait.

import { execFileSync } from "node:child_process";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT, json } from "./http.mjs";
import { simple } from "./simple.mjs";
import artists from "../data/artists.json" with { type: "json" };

const WIDTH = 120;

// A booking photo is a public record, not a portrait: a rapper whose only free picture is one gets their initials
const BOOKING = /sheriff|police|corrections|mug ?shot|booking|arrest|jail|prison|inmate/i;

// Picked by hand where Wikidata names only a booking photo (Trick Daddy), or a portrait too tight for a circle (Jay-Z's
// shows his head and nothing around it): a file on Commons, and the square kept from it, as
// [left, top, side] in shares of its width. The square is cut from a 480px picture and made 120px, so the page, which
// keeps a portrait's top quarter, crops it no further.
// Commons has no free picture of Big L, Geto Boys (only its members, one at a time) or K.A.A.N.; its pictures of
// Goodie Mob show the group too small to read in a circle, one with a guest, and its one of Rittz shows his face
// behind his fist and microphone. They keep their initials.
const CHOSEN = {
  "Jay-Z": { file: "Jay-Z @ Shawn 'Jay-Z' Carter Foundation Carnival (crop 2).jpg", square: [0, 0, 1] },
  "Trick Daddy": { file: "Trick Daddy 2015.jpg", square: [0.082, 0.093, 0.909] },
};

// Text from Commons' metadata, which is HTML: "<a href=...>Coup d'Oreille</a>" is "Coup d'Oreille"
function plain(html) {
  return (html ?? "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\s+/g, " ").trim();
}

await mkdir(join(ROOT, "cache", "portraits"), { recursive: true });
const only = process.argv.slice(2);
const unknown = only.filter((name) => !artists.some((a) => a.name === name));
if (unknown.length) throw new Error(`No rapper called ${unknown.join(", ")}`);
const out = only.length ? JSON.parse(await readFile(join(ROOT, "data", "portraits.json"), "utf8")) : {};

for (const artist of artists.filter((a) => !only.length || only.includes(a.name))) {
  delete out[artist.name];
  const chosen = CHOSEN[artist.name];
  let file = chosen?.file;
  if (!file) {
    const mb = await json(`https://musicbrainz.org/ws/2/artist/${artist.musicbrainz}?inc=url-rels&fmt=json`);
    const qid = mb.relations.find((r) => r.type === "wikidata")?.url.resource.split("/").pop();
    file = qid ? (await json(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`)).entities[qid]?.claims?.P18?.[0]?.mainsnak.datavalue.value : null;
  }

  if (!file) {
    console.log(`${artist.name.padEnd(28)} no portrait`);
    continue;
  }

  if (BOOKING.test(file)) {
    console.log(`${artist.name.padEnd(28)} no portrait (a booking photo)`);
    continue;
  }

  const info = await json(`https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent("File:" + file)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=${chosen ? 480 : WIDTH}&format=json&formatversion=2`);
  const image = info.query.pages[0]?.imageinfo?.[0];
  const meta = image?.extmetadata ?? {};
  if (!image?.thumburl) continue;

  if (BOOKING.test(plain(meta.Artist?.value))) {
    console.log(`${artist.name.padEnd(28)} no portrait (a booking photo)`);
    continue;
  }

  const response = await fetch(image.thumburl, { headers: { "user-agent": "rhp-vocabulary-example/1.0 (https://github.com/bezda-team/rhp)" } });
  if (!response.ok) {
    console.log(`${artist.name.padEnd(28)} ${response.status} for the image`);
    continue;
  }

  // Kept as a small JPEG (macOS's sips makes it; elsewhere the thumbnail stays as Commons sends it)
  const type = response.headers.get("content-type") ?? "image/jpeg";
  const source = join(ROOT, "cache", "portraits", "source-" + simple(artist.name) + (type.includes("png") ? ".png" : ".jpg"));
  const name = simple(artist.name) + ".jpg";
  await writeFile(source, Buffer.from(await response.arrayBuffer()));

  try {
    let from = source;
    if (chosen) {
      // The square picked by hand, in the picture's pixels
      const [left, top, side] = chosen.square.map((share) => Math.round(share * image.thumbwidth));
      from = join(ROOT, "cache", "portraits", "square-" + simple(artist.name) + ".jpg");
      execFileSync("sips", ["-c", String(side), String(side), "--cropOffset", String(top), String(left), source, "--out", from], { stdio: "ignore" });
    }
    execFileSync("sips", ["-Z", "120", "-s", "format", "jpeg", "-s", "formatOptions", "70", from, "--out", join(ROOT, "cache", "portraits", name)], { stdio: "ignore" });
  } catch {
    if (chosen) throw new Error(`${artist.name}: the square could not be cut (sips, macOS only)`);
    await copyFile(source, join(ROOT, "cache", "portraits", name));
  }

  out[artist.name] = {
    image: name,
    file,
    page: image.descriptionurl,
    author: plain(meta.Artist?.value) || "unknown",
    license: plain(meta.LicenseShortName?.value),
    licenseUrl: meta.LicenseUrl?.value ?? null,
  };
  console.log(`${artist.name.padEnd(28)} ${out[artist.name].license}, ${out[artist.name].author}`);
}

// In the rappers' order, so redoing a few leaves the others where they were
const ordered = Object.fromEntries(artists.filter((a) => out[a.name]).map((a) => [a.name, out[a.name]]));
await writeFile(join(ROOT, "data", "portraits.json"), JSON.stringify(ordered, null, 1) + "\n");
console.log(Object.keys(ordered).length, "portraits");
