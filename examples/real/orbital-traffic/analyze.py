from pathlib import Path
import collections
import csv
import gzip
import hashlib
import io
import json

HERE = Path(__file__).resolve().parent
source = json.loads((HERE / "source-snapshot.json").read_text())
raw = gzip.decompress((HERE / source["snapshot"]).read_bytes())
assert hashlib.sha256(raw).hexdigest() == source["sha256"], "The source snapshot changed"
rows = list(csv.DictReader(io.StringIO(raw.decode("utf-8-sig"))))
assert all(row["LAUNCH_DATE"] <= source["retrieved"] for row in rows)
orbiting = [row for row in rows if row["ORBIT_CENTER"] == "EA"
            and row["ORBIT_TYPE"] == "ORB" and not row["DECAY_DATE"]]
low_orbit = []
for row in orbiting:
    if not row["PERIGEE"] or not row["APOGEE"]:
        continue
    perigee, apogee = float(row["PERIGEE"]), float(row["APOGEE"])
    if 0 <= perigee <= apogee < 2000:
        low_orbit.append({**row, "midpoint_km": (perigee + apogee) / 2})

groups = [
    {"id": "payload", "name": "Spacecraft", "catalogTypes": ["PAY"], "color": "#91d9e8"},
    {"id": "debris", "name": "Debris", "catalogTypes": ["DEB"], "color": "#f3af78"},
    {"id": "other", "name": "Other", "catalogTypes": ["R/B", "UNK"], "color": "#b5b9b9"},
]
bands = []
for identifier, name, low, high, dominant in [
    ("lower", "Below 600 km", 0, 600, "payload"),
    ("upper", "600 to 1,100 km", 600, 1100, "debris"),
]:
    selected = [row for row in low_orbit if low <= row["midpoint_km"] < high]
    counts = collections.Counter(row["OBJECT_TYPE"] for row in selected)
    categories = [{**group,
                   "count": sum(counts[code] for code in group["catalogTypes"]),
                   "percent": sum(counts[code] for code in group["catalogTypes"]) / len(selected) * 100}
                  for group in groups]
    assert sum(category["count"] for category in categories) == len(selected)
    assert abs(sum(category["percent"] for category in categories) - 100) < 1e-9
    bands.append({"id": identifier, "name": name, "minKm": low, "maxKm": high,
                  "total": len(selected), "dominant": dominant,
                  "catalogCounts": dict(counts), "categories": categories})
    # Each miniature summarizes about 750 objects, using actual altitude quantiles.
    symbols = []
    for category in categories:
        members = sorted((row for row in selected if row["OBJECT_TYPE"] in category["catalogTypes"]),
                         key=lambda row: (row["midpoint_km"], int(row["NORAD_CAT_ID"])))
        symbol_count = int(len(members) / 750 + .5)
        for index in range(symbol_count):
            representative = members[min(len(members) - 1, int((index + .5) * len(members) / symbol_count))]
            symbols.append({"category": category["id"], "altitude": representative["midpoint_km"],
                            "index": index, "categorySymbols": symbol_count,
                            "band": identifier, "key": f"{identifier}-{category['id']}-{index}"})
    bands[-1]["symbols"] = symbols

data = {
    "source": source,
    "method": "Earth-centred ORB entries with no decay date; 0 <= perigee <= apogee < 2,000 km. Band by (apogee + perigee) / 2, with exclusive upper limits.",
    "rawRows": len(rows), "orbitingRows": len(orbiting), "lowOrbitRows": len(low_orbit),
    "missingAltitudeRows": sum(not row["PERIGEE"] or not row["APOGEE"] for row in orbiting),
    "groups": groups, "bands": bands,
    "symbolUnit": 750, "symbolMethod": "Nearest whole symbol per category and band; altitude quantiles from the actual category records; angular placement illustrative.",
    "limits": [
        "The public catalogue excludes uncatalogued and unpublished objects and almost all small debris.",
        "Payloads include working and inactive spacecraft; the comparison does not measure operational status.",
        "DEB is the catalogue's other-debris category; rocket bodies are shown separately within Other.",
        "Midpoint altitude is not an instantaneous position. Elliptical orbits can cross band boundaries.",
        "Object shares are not collision probabilities, debris mass, orbital density or a safety ranking.",
    ],
}
(HERE / "data.json").write_text(json.dumps(data, indent=2) + "\n")
with (HERE / "summary.csv").open("w", newline="") as output:
    writer = csv.writer(output, lineterminator="\n")
    writer.writerow(["band", "category", "count", "total", "percent"])
    for band in bands:
        for category in band["categories"]:
            writer.writerow([band["name"], category["name"], category["count"], band["total"], f"{category['percent']:.8f}"])
for band in bands:
    print(band["name"], band["total"], [(category["name"], category["count"], round(category["percent"], 2)) for category in band["categories"]])
