// Lyrics to words, by the 2019 article's rules: lowercase, apostrophes removed (pimpin' and pimpin are one word),
// and every spelling its own word (pimp, pimps, pimping and pimpin are four).
// Hyphenated words stay whole ("hip-hop"), numbers count ("40"), and bracketed asides ("[?]") do not.

import { simple, dice } from "./simple.mjs";

const APOSTROPHES = /['’‘ʼ`´]/g;
const WORD = /[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu;

export function words(line) {
  return line.normalize("NFKC").toLowerCase().replace(/\[[^\]]*\]/g, " ").replace(APOSTROPHES, "").match(WORD) ?? [];
}

// Genius marks who performs each part: "[Verse 2: Kanye West]", "[Chorus: Nas & Lauryn Hill]", "[Hook]".
// A part names its performers after the colon; asides in parentheses are ad-libs, not performers, and notes such as
// "repeat 2X" are not names. A few headers put the name first ("[Big Daddy Kane: Verse 1]"): then the name is before
// the colon.
const KINDS = /^(intro|outro|verse|chorus|hook|bridge|pre-chorus|post-chorus|refrain|interlude|break|skit)\b/i;
const NOTES = /^(repeat\b|x\s*\d|\d+\s*x\b)/i;

function names(text) {
  return text.replace(/\(.*?\)/g, "").split(/,|&|\+|\/|\||\band\b|\bx\b|\bwith\b|\bfeat\.?|\bft\.?/i)
    .map((name) => name.replace(/\*/g, "").trim()).filter((name) => name && !NOTES.test(name));
}

function performers(header) {

  const colon = header.indexOf(":");
  if (colon < 0) return [];
  const after = names(header.slice(colon + 1));
  const before = header.slice(0, colon);
  if (after.length && after.every((name) => KINDS.test(name)) && !KINDS.test(before.trim())) return names(before);
  return after;
}

// Words that name everyone in a part
const EVERYONE = new Set(["all", "both", "everyone", "everybody", "together", "group", "allartists"]);

// A song's lyrics split into its parts: { kind, performers, words }
export function parts(text) {

  const out = [{ kind: "", performers: [], words: [] }];

  for (const line of text.split("\n")) {
    const header = line.trim().match(/^\[([^\]]*)\]$/);

    if (header) {
      out.push({ kind: header[1].split(":")[0].trim(), performers: performers(header[1]), words: [] });
      continue;
    }

    out.at(-1).words.push(...words(line));
  }

  return out.filter((p) => p.words.length);
}

// Whether two names are one typing slip apart: one letter changed, added, dropped, or two swapped ("Kewli", "Kweli")
function slip(a, b) {

  if (Math.abs(a.length - b.length) > 1 || a === b) return a === b;
  let i = 0;

  while (i < a.length && a[i] === b[i]) {
    i++;
  }

  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

// Whether a performer is one of `names`: the same name, a longer form of one ("Raekwon the Chef" is Raekwon), a short
// one ("Busta" is Busta Rhymes), one spelled a little differently ("Posdnuous" is Posdnuos, "Talib Kewli" is Talib
// Kweli), or a full name with the stage name in quotes ('Sandra "Pepa" Denton' is Pepa)
export function named(performer, names) {

  const quoted = performer.match(/["“”'‘’](.+?)["“”'‘’]/)?.[1];
  if (quoted && named(quoted, names)) return true;
  const p = simple(performer);
  if (names.has(p) || EVERYONE.has(p)) return true;

  for (const name of names) {
    if (name.length >= 5 && p.startsWith(name)) return true;
    if (p.length >= 5 && name.startsWith(p)) return true;
    if (name.length >= 6 && Math.abs(p.length - name.length) <= 2 && dice(p, name) >= 0.8) return true;
    if (name.length >= 8 && slip(p, name)) return true;
  }

  return false;
}

// Whether a part is the artist's own: it names no performer, names them (or one of their aliases or members),
// or names everyone. Skits are nobody's.
// For a rapper whose headers name dozens of personas (choices.mjs), `guests` holds the song's credited artists instead,
// and a part is theirs unless it names only those guests.
export function owns(part, names, guests) {

  if (/skit/i.test(part.kind)) return false;
  if (!part.performers.length) return true;
  if (part.performers.some((p) => named(p, names))) return true;
  return guests ? !part.performers.some((p) => named(p, guests)) : false;
}
