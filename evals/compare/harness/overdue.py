"""Runs past the time budget (60 minutes from launch) whose agent hasn't finished and hasn't been told to stop yet.
    python3 overdue.py            prints run id and agent id for each
    python3 overdue.py --mark ID  records that the run's agent was told to wrap up"""
import json, os, sys, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from status import finished, RUNS
BUDGET = datetime.timedelta(minutes=60)
now = datetime.datetime.now(datetime.timezone.utc)
for run in sorted(os.listdir(RUNS)):
    p = os.path.join(RUNS, run, "meta.json")
    if not os.path.exists(p): continue
    m = json.load(open(p))
    if not m.get("agent"): continue
    if "--mark" in sys.argv:
        if m["agent"] in sys.argv[sys.argv.index("--mark") + 1:]:
            m["capped"] = now.isoformat(); json.dump(m, open(p, "w"), indent=2); print("marked", run)
        continue
    start = datetime.datetime.fromisoformat((m.get("launched") or m["created"]).replace("Z", "+00:00"))
    if start.tzinfo is None: start = start.replace(tzinfo=datetime.timezone.utc)
    done, n = finished(m.get("transcript"))
    if not done and not m.get("capped") and now - start > BUDGET:
        print(run, m["agent"], int((now - start).total_seconds() // 60), "min")
