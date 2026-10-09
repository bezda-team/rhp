// Step 1: the artists.
// Reads the 149 artists the 2019 article published (data/pudding-2019.csv), finds each one on MusicBrainz
// and on Genius, and writes data/artists.json.
// The searches are a first guess: SPELLING fixes the sheet's informal names, and PICK settles the ones a
// search gets wrong. Every match in artists.json was checked by hand.

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT, json } from "./http.mjs";

// The sheet's name, and the artist's name as MusicBrainz and Genius spell it
const SPELLING = {
  "BoB": "B.o.B",
  "Big KRIT": "Big K.R.I.T.",
  "J Cole": "J. Cole",
  "Ice T": "Ice-T",
  "Missy Elliot": "Missy Elliott",
  "Del the Funky Homosapian": "Del the Funky Homosapien",
  "Tech n9ne": "Tech N9ne",
  "Cupcakke": "CupcakKe",
  "Royce da 5'9": "Royce da 5'9\"",
  "Tyler the Creator": "Tyler, The Creator",
  "Young Jeezy": "Jeezy",
  "Salt-n-Pepa": "Salt-N-Pepa",
  "Joey BadA$$": "Joey Bada$$",
  "KAAN": "K.A.A.N.",
  "Lil' Kim": "Lil' Kim",
  "ScHoolboy Q": "ScHoolboy Q",
  "Brockhampton": "BROCKHAMPTON",
  "Dizzee Rascal": "Dizzee Rascal",
  "Mobb Deep": "Mobb Deep",
};

// Picked by hand where the first search result is another artist: [MusicBrainz id, Genius id]
const PICK = {
  "A$AP Ferg": ["8ab5d936-49d1-415e-92c8-151e0e7dd912", 15369],
  "BoB": ["94c338ff-1985-4429-9dc8-997b61bb5932", 853],
  "Eve": ["1ac10f5e-2079-4435-b78f-dda6ecdeba15", 458],
  "Kanye West": ["164f0d73-1234-4e2c-8743-d77bf2191051", 72],
  "Machine Gun Kelly": ["f6af669a-56ea-448a-a044-de76181ada33", 1665],
  "Mos Def": ["f5c4c27e-5902-4fc0-adfb-7775da3d5363", 156],
};

function clean(name) {
  return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9$]/g, "");
}

async function musicbrainz(name) {

  const query = encodeURIComponent(`artist:"${name}"`);
  const found = await json(`https://musicbrainz.org/ws/2/artist?query=${query}&fmt=json&limit=5`);
  const artists = found?.artists ?? [];
  const exact = artists.filter((a) => clean(a.name) === clean(name) || a.aliases?.some((b) => clean(b.name) === clean(name)));
  const best = exact[0] ?? artists[0];
  return best && { id: best.id, name: best.name, note: best.disambiguation ?? "", others: artists.slice(0, 4).map((a) => `${a.name} (${a.disambiguation ?? ""})`) };
}

async function genius(name) {

  const found = await json(`https://genius.com/api/search/artist?q=${encodeURIComponent(name)}`);
  const hits = found?.response.sections.flatMap((s) => s.hits.map((h) => h.result)) ?? [];
  const exact = hits.filter((a) => clean(a.name) === clean(name));
  const best = exact[0] ?? hits[0];
  return best && { id: best.id, name: best.name, others: hits.slice(0, 4).map((a) => `${a.name} ${a.id}`) };
}

const rows = (await readFile(join(ROOT, "data", "pudding-2019.csv"), "utf8")).trim().split("\n").slice(1);
const artists = [];

for (const line of rows) {
  const cells = line.match(/("[^"]*"|[^,]*)(,|$)/g).map((c) => c.replace(/,$/, "").replace(/^"|"$/g, ""));
  const [notes, recalc, era, rapper, rapperClean] = cells;
  if (notes === "remove" || !recalc) continue;

  const name = SPELLING[rapperClean] ?? rapperClean;
  const mb = await musicbrainz(name);
  const gn = await genius(name);
  const pick = PICK[rapperClean];

  artists.push({
    name,
    sheet: rapper,
    era,
    pudding: +recalc,
    musicbrainz: pick?.[0] ?? mb?.id,
    genius: pick?.[1] ?? gn?.id,
    check: { musicbrainz: mb, genius: gn },
  });

  console.log(`${name.padEnd(28)} mb: ${mb?.name} (${mb?.note})  genius: ${gn?.name} ${gn?.id}`);
}

await writeFile(join(ROOT, "data", "artists.json"), JSON.stringify(artists, null, 1) + "\n");
console.log(artists.length, "artists");
