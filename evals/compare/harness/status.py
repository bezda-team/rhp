"""Which runs are finished: a run is finished when its agent called SubagentHandback (its last act).
    python3 status.py            prints one line per launched run
    python3 status.py --wait N   exits 0 when at least N launched runs not yet marked done have finished"""
import json, os, sys
RUNS = os.environ.get("RUNS") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "runs")
def finished(t):
    if not t or not os.path.exists(t): return False, 0
    reqs = set(); done = False
    for l in open(t):
        if '"assistant"' not in l: continue
        r = json.loads(l)
        if r.get("type") != "assistant": continue
        reqs.add(r["message"]["id"])
        if any(c.get("type") == "tool_use" and c.get("name") == "SubagentHandback" for c in r["message"]["content"]): done = True
    return done, len(reqs)
rows = []
for run in sorted(os.listdir(RUNS)):
    p = os.path.join(RUNS, run, "meta.json")
    if not os.path.exists(p): continue
    m = json.load(open(p))
    if not m.get("agent"): continue
    done, n = finished(m.get("transcript"))
    rows.append((run, done, n, bool(m.get("done"))))
if "--wait" in sys.argv:
    need = int(sys.argv[sys.argv.index("--wait") + 1])
    new = [r for r in rows if r[1] and not r[3]]
    for r in new: print("finished:", r[0])
    sys.exit(0 if len(new) >= need else 1)
for run, done, n, marked in rows:
    print(f"{run:42} {'FINISHED' if done else 'running '} {n:4} requests{'  (collected)' if marked else ''}")
