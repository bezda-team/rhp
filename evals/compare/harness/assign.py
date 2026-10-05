"""Records which agent runs which run folder, and marks runs done.
    python3 assign.py <run id> <agent id>      python3 assign.py --done <agent id>"""
import json, sys, os, datetime
RUNS = os.environ.get("RUNS") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "runs")
# Claude Code keeps a subagent's transcript in ~/.claude/projects/<project>/<session>/subagents/agent-<id>.jsonl
T = os.path.join(os.environ.get("TRANSCRIPTS", "."), "agent-{}.jsonl")
if sys.argv[1] == "--done":
    for aid in sys.argv[2:]:
        for run in os.listdir(RUNS):
            p = os.path.join(RUNS, run, "meta.json")
            if not os.path.exists(p): continue
            m = json.load(open(p))
            if m.get("agent") == aid:
                m["done"] = datetime.datetime.utcnow().isoformat() + "Z"; json.dump(m, open(p, "w"), indent=2); print("done", run)
else:
    pairs = sys.argv[1:]
    for run, aid in zip(pairs[::2], pairs[1::2]):
        p = os.path.join(RUNS, run, "meta.json"); m = json.load(open(p))
        m["agent"] = aid; m["transcript"] = T.format(aid); m["launched"] = datetime.datetime.utcnow().isoformat() + "Z"
        json.dump(m, open(p, "w"), indent=2); print("assigned", run, aid)
