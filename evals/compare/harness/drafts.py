"""Saves each run's first draft of poster.html (the content of the first Write to it, from the transcript) as
first-draft.html in the run folder, so it can be rendered and scanned like the final poster, and counts the changes
made after it.
    python3 drafts.py <runs dir> [run id filter]"""
import json, os, sys

runs_dir = sys.argv[1]
flt = sys.argv[2] if len(sys.argv) > 2 else ""
for rid in sorted(os.listdir(runs_dir)):
    if flt not in rid:
        continue
    mp = os.path.join(runs_dir, rid, "meta.json")
    if not os.path.exists(mp):
        continue
    m = json.load(open(mp))
    t = m.get("transcript")
    if not t or not os.path.exists(t) or not m.get("done"):
        continue
    first = None
    later = {"Write": 0, "Edit": 0, "bash_edits": 0}
    for line in open(t):
        if '"tool_use"' not in line:
            continue
        r = json.loads(line)
        if r.get("type") != "assistant":
            continue
        for c in r["message"]["content"]:
            if c.get("type") != "tool_use":
                continue
            inp = c.get("input") or {}
            target = str(inp.get("file_path", ""))
            if c["name"] == "Write" and target.endswith("project/poster.html"):
                if first is None:
                    first = inp.get("content", "")
                else:
                    later["Write"] += 1
            elif c["name"] in ("Edit", "MultiEdit") and target.endswith("project/poster.html") and first is not None:
                later["Edit"] += 1
            elif c["name"] == "Bash" and first is not None and "poster.html" in inp.get("command", "") and any(k in inp.get("command", "") for k in ("write_text", "open(p, 'w')", 'open(p, "w")', "> poster.html", "sed -i", "s.replace", "writeFileSync")):
                later["bash_edits"] += 1
    if first is None:
        print(rid, "no Write of poster.html")
        continue
    open(os.path.join(runs_dir, rid, "first-draft.html"), "w").write(first)
    m["draftEdits"] = later
    json.dump(m, open(mp, "w"), indent=2)
    print(rid, len(first), "chars;", later)
