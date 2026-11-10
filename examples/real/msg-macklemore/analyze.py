#!/usr/bin/env python3
"""Builds data.json for the two posters from the saved sources: kworb's listener table, its archived copies, the saved
Spotify artist pages and setlist.fm's list of shows at Madison Square Garden."""
import glob
import json
import os
import re
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
TODAY = "2026-11-08"
ROW = re.compile(r'<tr>(?:<td>(\d+)</td>)?<td class="text"><div><a href="artist/([^"_.]+)(?:_songs)?\.html">([^<]+)</a></div></td><td>([\d,]+)</td>')
MACKLEMORE = "3JhNCzhSMTxs9WLGJJxWOY"


def table(path):
    text = open(path, encoding="utf8", errors="replace").read()
    return [(i + 1, spotify, name.replace("&amp;", "&"), int(listeners.replace(",", ""))) for i, (_, spotify, name, listeners) in enumerate(ROW.findall(text))]


def spotify_page(name):
    text = open(os.path.join(HERE, "sources/spotify", name + ".html"), encoding="utf8").read()
    amount, unit = re.search(r'og:description" content="Artist · ([\d.]+)([KM]) monthly listeners', text).groups()
    return float(amount) * {"K": 1e3, "M": 1e6}[unit]


# Who headlined each music night in the arena, read from setlist.fm's listing and confirmed by the tour's own dates.
# Left out: Dave Chappelle (comedy), the NYC Still Rising benefit of Sep 10 (comedians and one musician) and Avery Wilson
# on Oct 20 (no concert could be confirmed). Openers are not headliners.
HEADLINERS = {
    "Harry Styles": "Together, Together",
    "Olivia Dean": "The Art of Loving Tour",
    "J. Cole": "The Fall-Off Tour",
    "Gorillaz": "The Mountain Tour",
    "beabadoobee": "Powerlines",
    "Bryson Tiller": "Neo Trapsoul",
    "Kacey Musgraves": "Middle of Nowhere",
    "Jonas Brothers": "The Burning Up Tour",
    "Mumford & Sons": "Prizefighter",
    "Lily Allen": "West End Girl",
    "The Red Clay Strays": "Grateful",
    "Two Door Cinema Club": "Tourist History 15th Anniversary",
    "Mt. Joy": "World Tour 2026",
    "Rush": "Fifty Something Tour",
    "Hilary Duff": "The Lucky Me Tour",
}
FROM_SPOTIFY = {"Mt. Joy": "Mt_Joy", "Rush": "Rush", "Hilary Duff": "Hilary_Duff"}
EARLIER = [
    {"name": "Goose", "page": "Goose_US", "when": "2025", "what": "sold out"},
    {"name": "Dispatch", "page": "Dispatch", "when": "2007", "what": "3 sold-out benefit nights"},
    {"name": "Vulfpeck", "page": "Vulfpeck", "when": "2019", "what": "sold out, no major label"},
]

kworb = table(os.path.join(HERE, "sources/kworb/listeners.html"))
by_name = {name: listeners for _, _, name, listeners in kworb}
macklemore = next(row for row in kworb if row[1] == MACKLEMORE)

shows = [s for s in json.load(open(os.path.join(HERE, "shows.json"))) if s["venue"].startswith("Madison")]
MONTHS = {m: i + 1 for i, m in enumerate("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split())}


def iso(text):
    year, month, day = text.split("-")
    return f"{year}-{MONTHS[month]:02d}-{int(day):02d}"


acts = []
for name, tour in HEADLINERS.items():
    nights = sorted({iso(s["date"]) for s in shows if s["artist"] == name})
    assert nights, name
    listeners = spotify_page(FROM_SPOTIFY[name]) if name in FROM_SPOTIFY else by_name[name]
    acts.append({"name": name, "listeners": listeners, "tour": tour, "nights": len(nights), "first": nights[0], "last": nights[-1]})
acts.sort(key=lambda a: -a["listeners"])

history = []
for path in sorted(glob.glob(os.path.join(HERE, "sources/wayback/snap/*.html"))):
    row = next((r for r in table(path) if r[1] == MACKLEMORE), None)
    if row:
        stamp = os.path.basename(path)[:8]
        history.append({"date": f"{stamp[:4]}-{stamp[4:6]}-{stamp[6:]}", "listeners": row[3], "rank": row[0]})
history.append({"date": TODAY, "listeners": macklemore[3], "rank": macklemore[0]})
# One reading a day: an archive copy can repeat the day before's table
history = [h for i, h in enumerate(history) if i == 0 or h["date"] != history[i - 1]["date"]]

after = [h for h in history if h["date"] >= "2023-04-01"]
high = max(history, key=lambda h: h["listeners"])
low = min(after, key=lambda h: h["listeners"])
values = sorted(a["listeners"] for a in acts)
data = {
    "today": TODAY,
    "macklemore": {"listeners": macklemore[3], "rank": macklemore[0]},
    "acts": acts,
    "earlier": [{**{k: v for k, v in e.items() if k != "page"}, "listeners": spotify_page(e["page"])} for e in EARLIER],
    "fewer": sum(a["listeners"] < macklemore[3] for a in acts),
    "median": values[len(values) // 2],
    "history": history,
    "high": high,
    "low": low,
    "window": [min(a["first"] for a in acts), max(a["last"] for a in acts)],
    "arenas": [
        {"name": "Accor Arena", "city": "Paris", "date": "Oct 29", "capacity": 20300},
        {"name": "3Arena", "city": "Dublin", "date": "Oct 26", "capacity": 13000},
        {"name": "OVO Arena Wembley", "city": "London", "date": "Oct 30", "capacity": 12500},
    ],
    "msgCapacity": 22000,
}
assert len(values) % 2 == 1
json.dump(data, open(os.path.join(HERE, "data.json"), "w"), indent=1)
print(f"{data['fewer']} of {len(acts)} headliners have fewer listeners; median {data['median']:,.0f}; window {data['window']}")
print(f"high {high}; low since Apr 2023 {low}; points {len(history)}; days span {(date.fromisoformat(TODAY) - date.fromisoformat(history[0]['date'])).days}")
for a in acts:
    print(f"{a['name']:24}{a['listeners']/1e6:6.1f}M nights {a['nights']} {a['first']} {a['last']}")
