"""An independent recount of data/vocabulary.json.

Written in Python from the rules in README.md, sharing no code with the JavaScript steps, it reads the lyrics in
cache/songs/ again and recomputes every number the article shows: each rapper's words, different words, runs of
35,000 words, growth, and each album's words, different words, new words and density; then the field's medians.
It reports every value that differs, checks the run statistics by brute force at sampled positions, and lists the
facts the article states, computed again.

    python3 -I pipeline/check.py
"""

import json
import math
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SAMPLE = 35000
DENSITY = 1000
STEP = 2000
COVERAGE = 0.8
LATE = 0.1

problems = []


def problem(text):
    problems.append(text)


# Comparing names and titles -------------------------------------------------------------------------------------------

def simple(title):
    plain = unicodedata.normalize("NFKD", title.lower())
    plain = "".join(c for c in plain if not 0x300 <= ord(c) <= 0x36F).replace("&", "and").replace("$", "s")
    bare = re.sub(r"[^a-z0-9]", "", re.sub(r"\(.*?\)|\[.*?\]", "", plain))
    return bare or re.sub(r"[^a-z0-9]", "", plain)


def bigrams(s):
    out = {}
    for i in range(len(s) - 1):
        out[s[i:i + 2]] = out.get(s[i:i + 2], 0) + 1
    return out


def alike(a, b):
    a, b = simple(a), simple(b)
    if not a or not b:
        return 0
    if a == b:
        return 1
    if min(len(a), len(b)) >= 4 and (a.startswith(b) or b.startswith(a)):
        return 0.9
    x, y = bigrams(a), bigrams(b)
    shared = sum(min(n, y.get(g, 0)) for g, n in x.items())
    return 2 * shared / ((len(a) - 1 + len(b) - 1) or 1)


# Words ----------------------------------------------------------------------------------------------------------------

def is_word_char(c):
    return unicodedata.category(c)[0] in "LN"


def words(line):
    line = unicodedata.normalize("NFKC", line).lower()
    line = re.sub(r"\[[^\]]*\]", " ", line)
    line = re.sub("['’‘ʼ`´]", "", line)
    out, cur, i = [], [], 0
    # Runs of letters and digits, joined by single hyphens between them
    while i < len(line):
        c = line[i]
        if is_word_char(c):
            cur.append(c)
        elif c == "-" and cur and i + 1 < len(line) and is_word_char(line[i + 1]):
            cur.append(c)
        else:
            if cur:
                out.append("".join(cur))
            cur = []
        i += 1
    if cur:
        out.append("".join(cur))
    return out


SPLIT = re.compile(r",|&|\+|/|\||\band\b|\bx\b|\bwith\b|\bfeat\.?|\bft\.?", re.I | re.A)
EVERYONE = {"all", "both", "everyone", "everybody", "together", "group", "allartists"}
KINDS = re.compile(r"(intro|outro|verse|chorus|hook|bridge|pre-chorus|post-chorus|refrain|interlude|break|skit)\b", re.I | re.A)
NOTES = re.compile(r"(repeat\b|x\s*\d|\d+\s*x\b)", re.I | re.A)


def names_in(text):
    out = []
    for p in SPLIT.split(re.sub(r"\(.*?\)", "", text)):
        p = p.replace("*", "").strip()
        if p and not NOTES.match(p):
            out.append(p)
    return out


def performers(header):
    if ":" not in header:
        return []
    after = names_in(header[header.index(":") + 1:])
    before = header[:header.index(":")]
    if after and all(KINDS.match(n) for n in after) and not KINDS.match(before.strip()):
        return names_in(before)
    return after


def parts(text):
    out = [{"kind": "", "performers": [], "words": []}]
    for line in text.split("\n"):
        m = re.fullmatch(r"\[([^\]]*)\]", line.strip())
        if m:
            out.append({"kind": m.group(1).split(":")[0].strip(), "performers": performers(m.group(1)), "words": []})
        else:
            out[-1]["words"].extend(words(line))
    return [p for p in out if p["words"]]


def slip(a, b):
    """One letter changed, added or dropped, or two neighbors swapped."""
    if a == b:
        return True
    if abs(len(a) - len(b)) > 1:
        return False
    if len(a) == len(b):
        diff = [i for i in range(len(a)) if a[i] != b[i]]
        if len(diff) == 1:
            return True
        return len(diff) == 2 and diff[1] == diff[0] + 1 and a[diff[0]] == b[diff[1]] and a[diff[1]] == b[diff[0]]
    longer, shorter = (a, b) if len(a) > len(b) else (b, a)
    return any(longer[:i] + longer[i + 1:] == shorter for i in range(len(longer)))


QUOTED = re.compile("[\"\u201c\u201d'\u2018\u2019](.+?)[\"\u201c\u201d'\u2018\u2019]")


def dice(a, b):
    if len(a) < 2 or len(b) < 2:
        return 1 if a == b else 0
    x, y = bigrams(a), bigrams(b)
    return 2 * sum(min(n, y.get(g, 0)) for g, n in x.items()) / (len(a) - 1 + len(b) - 1)


def named(performer, names):
    quoted = QUOTED.search(performer)
    if quoted and named(quoted.group(1), names):
        return True
    p = simple(performer)
    if p in names or p in EVERYONE:
        return True
    for name in names:
        if len(name) >= 5 and p.startswith(name):
            return True
        if len(p) >= 5 and name.startswith(p):
            return True
        if len(name) >= 6 and abs(len(p) - len(name)) <= 2 and dice(p, name) >= 0.8:
            return True
        if len(name) >= 8 and slip(p, name):
            return True
    return False


def owns(part, names, guests=None):
    if re.search("skit", part["kind"], re.I):
        return False
    if not part["performers"]:
        return True
    if any(named(p, names) for p in part["performers"]):
        return True
    return guests is not None and not any(named(p, guests) for p in part["performers"])


def after(release, death):
    return (str(release) + "-00-00")[:10] > (str(death) + "-99-99")[:10]


# Numbers --------------------------------------------------------------------------------------------------------------

def js_round(x):
    return math.floor(x + 0.5)


def runs(tokens, size, every=False):
    """Different words in every run of `size` words in a row: the first run's, and the mean, lowest and highest."""
    if len(tokens) < size:
        return None
    counts, distinct, seen = {}, 0, []
    for i, t in enumerate(tokens):
        counts[t] = counts.get(t, 0) + 1
        if counts[t] == 1:
            distinct += 1
        if i >= size:
            old = tokens[i - size]
            counts[old] -= 1
            if counts[old] == 0:
                distinct -= 1
        if i >= size - 1:
            seen.append(distinct)
    out = {"first": seen[0], "mean": js_round(sum(seen) / len(seen)), "low": min(seen), "high": max(seen)}
    return (out, seen) if every else out


def median(values):
    v = sorted(values)
    h = (len(v) - 1) / 2
    return (v[math.floor(h)] + v[math.ceil(h)]) / 2


def quantile(values, q):
    v = sorted(values)
    i = (len(v) - 1) * q
    lo, hi = math.floor(i), math.ceil(i)
    return v[lo] + (v[hi] - v[lo]) * (i - lo)


SPANISH = {"de", "la", "que", "el", "en", "y", "los", "las", "del", "se", "por", "un", "una", "con", "no", "mi", "es", "lo", "tu",
           "yo", "para", "como", "mas", "pero", "al", "le", "te", "me", "su", "si"}
ENGLISH = {"the", "and", "to", "a", "i", "you", "in", "it", "my", "of", "is", "that", "on", "me", "for", "with", "we", "they",
           "be", "this"}

UNSHOWN = re.compile(r"^(nigg|niga|negro|fag|faggot|retard|tranny|chink|spic|kike|wetback|dyke|coon|gook|beaner|towelhead)")


def letters_only(s):
    return bool(s) and all(unicodedata.category(c)[0] == "L" for c in s)


SOUNDS = {"ah", "aah", "ay", "ayy", "aye", "da", "eh", "ha", "hah", "hey", "hmm", "ho", "hoo", "huh", "la", "mm", "mmm", "na",
          "nah", "oh", "ohh", "ooh", "oooh", "uh", "wo", "woah", "whoa", "woo", "ya", "yah", "yea", "yeah", "yo", "yuh"}


def showable(word):
    pieces = word.split("-")
    if len(pieces) > 1 and (any(len(p) == 1 for p in pieces) or all(p in SOUNDS for p in pieces)):
        return False
    if len(word) < 4 or UNSHOWN.match(word) or re.search(r"[0-9]", word):
        return False
    if len(pieces) > 1 and letters_only(pieces[0]) and all(p == pieces[0] for p in pieces):
        return False
    for i in range(len(word) - 2):
        if unicodedata.category(word[i])[0] == "L" and word[i] == word[i + 1] == word[i + 2]:
            return False
    return True


# The recount ----------------------------------------------------------------------------------------------------------

artists = json.loads((ROOT / "data/artists.json").read_text())
people = json.loads((ROOT / "data/names.json").read_text())
published = json.loads((ROOT / "data/vocabulary.json").read_text())
theirs = {a["name"]: a for a in published["artists"]}

loaded = []
for artist in artists:
    path = ROOT / "cache/songs" / (simple(artist["name"]) + ".json")
    if not path.exists() or artist["name"] not in people:
        problem(f"{artist['name']}: no lyrics in the cache, so not recounted")
        continue
    who = people[artist["name"]]
    own = {simple(n) for n in who["names"]}
    songs = json.loads(path.read_text())
    albums = []
    for album in songs["albums"]:
        if not album.get("date"):
            problem(f"{artist['name']}: {album['title']} has no release date")
        tracks = [t for t in album["tracks"] if not t.get("skipped") and not t.get("instrumental")]
        found = [t for t in tracks if t.get("text")]
        gone = [{"names": {simple(n) for n in m["names"]}} for m in who["dead"] if after(album.get("date"), m["died"])]
        late = 0
        mine, every = [], []
        for t in found:
            guests = {simple(c) for c in t.get("credits", [])} - own if who.get("credited") else None
            for p in parts(t["text"]):
                every.extend(p["words"])
                if any(any(named(x, m["names"]) for x in p["performers"]) for m in gone):
                    late += len(p["words"])
                if owns(p, own, guests):
                    mine.extend(p["words"])
        posthumous = (who["died"] is not None and after(album.get("date"), who["died"])) or (len(every) > 0 and late >= len(every) * LATE)
        albums.append({"title": album["title"], "year": album["year"], "songs": len(found), "of": len(tracks),
                       "late": float(f"{late / len(every):.3f}") if every else 0,
                       "spanish": sum(w in SPANISH for w in every) > sum(w in ENGLISH for w in every),
                       "complete": len(found) > 0 and len(found) >= len(tracks) * COVERAGE, "posthumous": posthumous,
                       "instrumental": len(tracks) == 0,
                       "mine": mine, "all": every})
    loaded.append((artist, who, albums))

users = {}
for _, _, albums in loaded:
    for w in {w for a in albums if a["complete"] and not a["posthumous"] for w in a["mine"]}:
        users[w] = users.get(w, 0) + 1
common = len(loaded) * 0.25

mine_all = {}
recount = []
checked = 0


def same(label, ours, js):
    global checked
    checked += 1
    if ours != js:
        problem(f"{label}: recount {ours!r}, vocabulary.json {js!r}")


def ranked_words(counts, keep, limit):
    """The `limit` words with the highest counts among those `keep` accepts, as a list of (word, count) with the ties
    at the cut kept whole, so that the order of equal counts does not matter."""
    chosen = sorted(((w, n) for w, n in counts.items() if keep(w, n)), key=lambda x: -x[1])
    if len(chosen) <= limit:
        return chosen, chosen
    cut = chosen[limit - 1][1]
    return [x for x in chosen if x[1] > cut], [x for x in chosen if x[1] >= cut]


for artist, who, every_album in loaded:
    name = artist["name"]
    js = theirs.get(name)
    if js is None:
        problem(f"{name}: missing from vocabulary.json")
        continue
    albums = [a for a in every_album if a["complete"] and not a["posthumous"]]
    tokens = [w for a in albums for w in a["mine"]]
    alltokens = [w for a in albums for w in a["all"]]
    mine_all[name] = tokens
    own = [w for n in who["names"] for w in words(n) if len(w) >= 3]
    is_self = lambda w: any(n.startswith(w) or w.startswith(n) for n in own)

    seen, growth, total = set(), [], 0
    same(f"{name} albums counted", len(albums), len(js["albums"]))
    for k, album in enumerate(albums):
        counts = {}
        for w in album["mine"]:
            counts[w] = counts.get(w, 0) + 1
        fresh = [w for w in counts if w not in seen]
        for w in album["mine"]:
            total += 1
            seen.add(w)
            if total % STEP == 0:
                growth.append([total, len(seen)])
        if not growth or growth[-1][0] != total:
            growth.append([total, len(seen)])
        if k >= len(js["albums"]):
            continue
        ja = js["albums"][k]
        label = f"{name} / {album['title']}"
        same(f"{label} title", album["title"], ja["title"])
        same(f"{label} songs", album["songs"], ja["songs"])
        same(f"{label} words", len(album["mine"]), ja["words"])
        same(f"{label} different words", len(counts), ja["unique"])
        same(f"{label} new words", len(fresh), ja["new"])
        same(f"{label} different words so far", len(seen), ja["total"])
        d = runs(album["mine"], DENSITY)
        same(f"{label} density", d["mean"] if d else None, ja["density"])
        same(f"{label} share by members who had died", album["late"], ja["late"])
        same(f"{label} mostly in Spanish", album["spanish"], ja["spanish"])
        # Examples: the new words used twice or more, by fewer than a quarter of rappers, most used first
        fresh_set = set(fresh)
        sure, possible = ranked_words(counts, lambda w, n: w in fresh_set and showable(w) and not is_self(w) and n >= 2 and users.get(w, 0) <= common, 4)
        ok = all(x in [p[0] for p in possible] for x in ja["examples"]) and all(x[0] in ja["examples"] for x in sure)
        if not ok or len(ja["examples"]) != min(4, len(possible)):
            problem(f"{label} examples: vocabulary.json {ja['examples']}, recount allows {[p[0] for p in possible]}")
        checked += 1

    same(f"{name} words", len(tokens), js["words"])
    same(f"{name} different words", len(set(tokens)), js["unique"])
    same(f"{name} songs", sum(a["songs"] for a in albums), js["songs"])
    same(f"{name} guest share", round(1 - len(tokens) / len(alltokens), 3) if alltokens else 0, js["guests"])
    same(f"{name} growth", growth, js["growth"])
    same(f"{name} first 35,000 of all lyrics", (runs(alltokens, SAMPLE) or {}).get("first"), js["sampleAll"])
    r = runs(tokens, SAMPLE, every=True)
    same(f"{name} runs of 35,000", r[0] if r else None, js["sample"])
    left = [{"title": a["title"], "year": a["year"], "why": "posthumous" if a["posthumous"] else "instrumental" if a["instrumental"] else f"lyrics for {a['songs']} of {a['of']} songs"}
            for a in every_album if not a["complete"] or a["posthumous"]]
    same(f"{name} albums left out", left, js["left"])

    # The sliding count, checked against counting each run from scratch at positions spread over the career
    if r:
        stats, seen_runs = r
        n = len(seen_runs)
        for i in sorted({0, n - 1, *range(0, n, max(1, n // 7))}):
            brute = len(set(tokens[i:i + SAMPLE]))
            if brute != seen_runs[i]:
                problem(f"{name}: the run at {i} has {brute} different words counted from scratch, {seen_runs[i]} sliding")
            checked += 1

    counts = {}
    for w in tokens:
        counts[w] = counts.get(w, 0) + 1
    sure, possible = ranked_words(counts, lambda w, n: users.get(w) == 1 and n >= 4 and showable(w) and not is_self(w), 12)
    jsig = [w for w, _ in js["signature"]]
    if not all(w in [p[0] for p in possible] for w in jsig) or not all(w in jsig for w, _ in sure) or len(jsig) != min(12, len(possible)):
        problem(f"{name} signature: vocabulary.json {jsig}, recount allows {[p[0] for p in possible]}")
    for w, n in js["signature"]:
        same(f"{name} signature count of {w}", counts.get(w), n)
        same(f"{name} signature {w} used by others", users.get(w), 1)

    recount.append({"name": name, "era": artist["era"], "pudding": artist["pudding"], "albums": albums, "words": len(tokens),
                    "unique": len(set(tokens)), "sample": r[0] if r else None, "growth": growth})

# The field
field = published["field"]
expect = []
w = STEP
while True:
    reached = [next((u for n, u in a["growth"] if n == w), None) for a in recount]
    reached = [u for u in reached if u is not None]
    if len(reached) < 20:
        break
    expect.append([w, js_round(median(reached))])
    w += STEP
same("field growth", expect, field["growth"])

rows = []
k = 0
while True:
    nth = [a for a in recount if len(a["albums"]) > k]
    if len(nth) < 20:
        break
    stats = []
    for a in nth:
        seen = set(w for b in a["albums"][:k] for w in b["mine"])
        album = a["albums"][k]
        diff = set(album["mine"])
        stats.append((len(diff - seen), len(diff), (runs(album["mine"], DENSITY) or {}).get("mean")))
    fresh = [s[0] for s in stats]
    rows.append({"album": k + 1, "artists": len(nth), "new": js_round(median(fresh)), "low": js_round(quantile(fresh, 0.25)),
                 "high": js_round(quantile(fresh, 0.75)), "share": round(median([s[0] / s[1] for s in stats]), 3),
                 "density": js_round(median([s[2] for s in stats if s[2] is not None]))})
    k += 1
same("field by album", rows, field["byAlbum"])

# The facts the article states ------------------------------------------------------------------------------------------

def place(values):
    order = sorted(values, key=lambda x: -x[1])
    return {name: i + 1 for i, (name, _) in enumerate(order)}


everyone = [a for a in recount]
counted = [a for a in everyone if a["sample"]]
then = place([(a["name"], a["pudding"]) for a in counted])
now = place([(a["name"], a["sample"]["mean"]) for a in counted])
moves = sorted(((a["name"], then[a["name"]], now[a["name"]]) for a in counted), key=lambda m: (-(m[1] - m[2]), m[2]))
eras = {}
for era in ["1980s", "1990s", "2000s", "2010s"]:
    group = [a for a in everyone if a["era"] == era]
    fair = [a["sample"]["mean"] for a in group if a["sample"]]
    eras[era] = {"then": js_round(median([a["pudding"] for a in group])), "now": js_round(median(fair)) if fair else None, "counted": len(fair)}
pairs = [(a["sample"]["first"], a["pudding"]) for a in counted]
mx = sum(p[0] for p in pairs) / len(pairs)
my = sum(p[1] for p in pairs) / len(pairs)
r = sum((x - mx) * (y - my) for x, y in pairs) / math.sqrt(sum((x - mx) ** 2 for x, _ in pairs) * sum((y - my) ** 2 for _, y in pairs))
def dens(album):
    d = runs(album["mine"], DENSITY)
    return d["mean"] if d else None


long = [a for a in everyone if len(a["albums"]) >= 5 and dens(a["albums"][0]) is not None and dens(a["albums"][-1]) is not None]
by_total = sorted(everyone, key=lambda a: -a["unique"])
by_fair = sorted(counted, key=lambda a: -a["sample"]["mean"])
facts = {
    "rappers": len(everyone),
    "albums": sum(len(a["albums"]) for a in everyone),
    "words": sum(a["words"] for a in everyone),
    "most different words": (by_total[0]["name"], by_total[0]["unique"], len(by_total[0]["albums"])),
    "second": (by_total[1]["name"], by_total[1]["unique"], len(by_total[1]["albums"])),
    "most per 35,000": (by_fair[0]["name"], by_fair[0]["sample"]["mean"]),
    "fewest per 35,000": (by_fair[-1]["name"], by_fair[-1]["sample"]["mean"]),
    "under 35,000 words": len(everyone) - len(counted),
    "at least 70,000 words": sum(1 for a in everyone if a["words"] >= 2 * SAMPLE),
    "2019's top ten in today's top ten": sum(1 for a in counted if then[a["name"]] <= 10 and now[a["name"]] <= 10),
    "climbs (then, now)": moves[:3],
    "falls (then, now)": sorted(moves, key=lambda m: (m[1] - m[2], m[2]))[:3],
    "thinner than their first 35,000": sum(1 for a in counted if a["sample"]["mean"] < a["sample"]["first"]),
    "five albums or more, latest denser than the debut": (
        sum(1 for a in long if dens(a["albums"][-1]) > dens(a["albums"][0])), len(long)),
    "Lupe Fiasco's densities": [(b["title"], dens(b)) for b in next((a["albums"] for a in everyone if a["name"] == "Lupe Fiasco"), [])],
    "eras": eras,
    "guest share, median rapper": median([round(1 - a["words"] / sum(len(b["all"]) for b in a["albums"]), 3) for a in everyone if sum(len(b["all"]) for b in a["albums"])]),
    "every voice, median difference from 2019": median([abs(((runs([w for b in a["albums"] for w in b["all"]], SAMPLE) or {}).get("first", 0)) - a["pudding"]) / a["pudding"] for a in counted]),
    "debut and later albums": rows[0]["new"], 
    "check against 2019": {"rappers": len(pairs), "r": round(r, 3),
                           "median difference": round(median([abs(x - y) / y for x, y in pairs]), 3),
                           "within 10%": sum(1 for x, y in pairs if abs(x - y) / y <= 0.1)},
}

# python3 -I pipeline/check.py --facts facts.json also writes the facts, for checking the article's text against them
if "--facts" in sys.argv:
    Path(sys.argv[sys.argv.index("--facts") + 1]).write_text(json.dumps(facts, indent=1, ensure_ascii=False))

print(f"Recounted {len(recount)} rappers from the cached lyrics: {checked} values compared with vocabulary.json.")
print("Facts, recounted:")
for key, value in facts.items():
    print(f"  {key}: {value}")
if problems:
    print(f"\n{len(problems)} problems:")
    for p in problems[:200]:
        print("  " + p)
    sys.exit(1)
print("\nNo differences.")
