"""Joins every run's result (collect.mjs) with the judges' scores (judge.mjs collect) into one table, and summarizes
it by condition.
    python3 aggregate.py <runs dir> <judging dir> <out.json>"""
import json, os, statistics as st, sys
from collections import defaultdict

runs_dir, judging_dir, out_file = sys.argv[1:4]
CRITERIA = ["fidelity", "data", "design", "legibility", "overall"]

scores = json.load(open(os.path.join(judging_dir, "scores.json"))) if os.path.exists(os.path.join(judging_dir, "scores.json")) else []
by_run = defaultdict(list)
for s in scores:
    by_run[s["runId"]].append(s)

rows = []
for rid in sorted(os.listdir(runs_dir)):
    f = os.path.join(runs_dir, rid, "result.json")
    if not os.path.exists(f):
        continue
    r = json.load(open(f))
    if r.get("exclude"):
        continue
    t = r["usage"]["totals"]
    j = by_run.get(rid, [])
    row = {
        "run": rid, "poster": r["poster"], "lib": r["lib"], "tooling": r["tooling"], "condition": r["condition"], "rep": r["rep"], "model": r["model"],
        "hasPoster": r["hasPoster"], "renders": bool(r["scan"] and r["scan"]["renders"]),
        "requests": t["requests"], "contextMax": t["context_max"], "cacheRead": t["cache_read"], "cacheWrite": t["cache_write_5m"] + t["cache_write_1h"],
        "uncached": t["input_uncached"], "output": t["output_est"], "cost": t.get("cost_usd"), "minutes": round(r["usage"]["wall_seconds"] / 60, 1),
        "toolCalls": sum(v for k, v in r["usage"]["tools"].items() if k != "SubagentHandback"), "imagesRead": t["images_read"],
        "bash": r["usage"]["bash"], "sources": r["usage"].get("context_sources", {}), "checks": r["usage"].get("checks", []),
        "violations": r["usage"].get("violations", []), "scan": r["scan"], "posterBytes": r["posterBytes"],
        "judgePasses": len(j),
    }
    for c in CRITERIA + ["rankScore"]:
        vals = [x[c] for x in j if isinstance(x.get(c), (int, float))]
        row[c] = round(st.mean(vals), 2) if vals else None
    row["issues"] = sorted({i for x in j for i in x.get("issues", [])})[:12]
    rows.append(row)


def summarize(group):
    s = {"n": len(group)}
    for k in ["requests", "contextMax", "cacheRead", "cacheWrite", "output", "cost", "minutes", "toolCalls", "imagesRead"] + CRITERIA + ["rankScore"]:
        vals = [g[k] for g in group if isinstance(g.get(k), (int, float))]
        if vals:
            s[k] = {"mean": round(st.mean(vals), 3), "median": round(st.median(vals), 3), "min": min(vals), "max": max(vals)}
    s["renders"] = sum(1 for g in group if g["renders"]) / len(group)
    s["defects"] = {k: round(st.mean([(g["scan"] or {}).get(k, 0) if not isinstance((g["scan"] or {}).get(k, 0), list) else len(g["scan"][k]) for g in group]), 2) for k in ["overlaps", "cut", "tiny", "lowContrast", "sideways"]}
    return s

by_condition = defaultdict(list)
for r in rows:
    by_condition[r["condition"]].append(r)
summary = {c: summarize(g) for c, g in sorted(by_condition.items())}
json.dump({"rows": rows, "byCondition": summary}, open(out_file, "w"), indent=1)
for c, s in summary.items():
    print(f"{c:22} n={s['n']:2}  overall={s.get('overall', {}).get('mean')}  rank={s.get('rankScore', {}).get('mean')}  cost=${s.get('cost', {}).get('mean')}  min={s.get('minutes', {}).get('mean')}  req={s.get('requests', {}).get('mean')}")
