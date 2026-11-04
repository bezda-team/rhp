// data/people.json: a short introduction of each candidate whose Wikidata item data/portraits.json names,
// from the opening of their English Wikipedia article (CC BY-SA), with the article's address.
//   node pipeline/people.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const portraits = JSON.parse(fs.readFileSync(path.join(root, "data/portraits.json"), "utf8"));
const out = path.join(root, "data/people.json");
const people = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, "utf8")) : {};
const UA = { "User-Agent": "rhp-election-night/1.0 (anasbouzid@gmail.com)" };

async function json(url) {

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: UA });
    if (res.ok) return res.json();
    if (res.status === 404) return null;
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }

  return null;
}

// The first sentences of an article's summary, up to about 260 characters. A sentence ends at a period before a
// capital, but not after initials or a short title (U.S., D.C., Jr., St.).
function opening(text) {

  const sentences = text.replace(/\s+/g, " ").split(/(?<![A-Z]\.[A-Z]\.|\b(?:Jr|Sr|St|Mr|Mrs|Ms|Dr|Gen|Lt|Col|Sen|Rep|Gov|No)\.|\b[A-Z]\.)(?<=[.!?])\s+(?=[A-Z"“])/);
  let bio = "";

  for (const s of sentences) {
    if (bio && (bio + " " + s).length > 260) break;
    bio += (bio ? " " : "") + s;
  }

  return bio.trim();
}

const byQ = {};
for (const [cid, p] of Object.entries(portraits)) {
  if (p.wikidata && !people[cid]) (byQ[p.wikidata] ||= []).push(cid);
}

const ids = Object.keys(byQ);
const titles = {};

for (let i = 0; i < ids.length; i += 50) {
  const batch = ids.slice(i, i + 50);
  const data = await json(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=sitelinks|descriptions&sitefilter=enwiki&languages=en&ids=${batch.join("|")}`);
  for (const [q, e] of Object.entries(data?.entities || {})) {
    titles[q] = { title: e.sitelinks?.enwiki?.title || null, description: e.descriptions?.en?.value || null };
  }
}

const queue = Object.entries(titles);
async function work() {

  while (queue.length) {
    const [q, t] = queue.shift();
    let bio = null, wiki = null;
    if (t.title) {
      const s = await json(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t.title.replace(/ /g, "_"))}`);
      if (s?.extract) bio = opening(s.extract);
      wiki = s?.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(t.title.replace(/ /g, "_"))}`;
    }
    for (const cid of byQ[q]) {
      people[cid] = { wikidata: q, description: t.description, bio, wiki };
    }
  }
}

await Promise.all(Array.from({ length: 6 }, work));
fs.writeFileSync(out, JSON.stringify(people, null, 1) + "\n");
console.log(`${Object.keys(people).length} people, ${Object.values(people).filter((p) => p.bio).length} with an introduction`);
