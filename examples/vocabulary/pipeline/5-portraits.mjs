// Step 5: a portrait of each rapper, when Wikimedia Commons has a free one.
// The picture is the one Wikidata gives the rapper (property P18), which is always a file on Commons under a free
// license. Writes data/portraits.json: for each rapper the file, its author, its license and the link the license asks
// for. The images themselves go to cache/portraits/ (never committed); the article's build puts them in the page.

import { execFileSync } from "node:child_process";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT, json } from "./http.mjs";
import { simple } from "./simple.mjs";
import artists from "../data/artists.json" with { type: "json" };

const WIDTH = 120;

// A booking photo is a public record, not a portrait: a rapper whose only free picture is one gets their initials
const BOOKING = /sheriff|police|corrections|mug ?shot|booking|arrest|jail|prison|inmate/i;

// Text from Commons' metadata, which is HTML: "<a href=...>Coup d'Oreille</a>" is "Coup d'Oreille"
function plain(html) {
  return (html ?? "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\s+/g, " ").trim();
}

await mkdir(join(ROOT, "cache", "portraits"), { recursive: true });
const out = {};

for (const artist of artists) {
  const mb = await json(`https://musicbrainz.org/ws/2/artist/${artist.musicbrainz}?inc=url-rels&fmt=json`);
  const qid = mb.relations.find((r) => r.type === "wikidata")?.url.resource.split("/").pop();
  const file = qid ? (await json(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`)).entities[qid]?.claims?.P18?.[0]?.mainsnak.datavalue.value : null;

  if (!file) {
    console.log(`${artist.name.padEnd(28)} no portrait`);
    continue;
  }

  if (BOOKING.test(file)) {
    console.log(`${artist.name.padEnd(28)} no portrait (a booking photo)`);
    continue;
  }

  const info = await json(`https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent("File:" + file)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=${WIDTH}&format=json&formatversion=2`);
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
    execFileSync("sips", ["-Z", "120", "-s", "format", "jpeg", "-s", "formatOptions", "70", source, "--out", join(ROOT, "cache", "portraits", name)], { stdio: "ignore" });
  } catch {
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

await writeFile(join(ROOT, "data", "portraits.json"), JSON.stringify(out, null, 1) + "\n");
console.log(Object.keys(out).length, "portraits");
