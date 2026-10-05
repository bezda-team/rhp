"""Measures the customization ladder: for each library and step, the size of the page's code and how much of the
previous step had to change.
    python3 ladder.py <ladder dir>      prints JSON
Lines count non-blank lines; tokens are estimated at 2.2 characters per token (the Claude 5 tokenizer on HTML and JS,
measured in this harness); "changed" is lines added plus lines removed against the previous step (a line diff)."""
import difflib, json, os, re, sys

STEPS = ["basic", "labels", "editorial", "annotation", "phone", "readout", "animate", "pictogram"]


def code_lines(text):
    return [l.rstrip() for l in text.splitlines() if l.strip()]


def measure(root):
    out = {}
    for lib in sorted(os.listdir(root)):
        d = os.path.join(root, lib)
        if not os.path.isdir(d) or lib == "shots":
            continue
        prev = None
        rows = []
        for i, step in enumerate(STEPS, 1):
            f = os.path.join(d, f"step-{i}-{step}.html")
            if not os.path.exists(f):
                rows.append(None)
                continue
            text = open(f).read()
            lines = code_lines(text)
            row = {"step": step, "lines": len(lines), "chars": len(text), "tokens": round(len(text) / 2.2)}
            if prev is not None:
                diff = [l for l in difflib.unified_diff(prev, lines, lineterm="", n=0) if not l.startswith(("---", "+++", "@@"))]
                row["added"] = sum(1 for l in diff if l.startswith("+"))
                row["removed"] = sum(1 for l in diff if l.startswith("-"))
                row["changed"] = row["added"] + row["removed"]
            prev = lines
            rows.append(row)
        out[lib] = rows
    return out


if __name__ == "__main__":
    print(json.dumps(measure(sys.argv[1]), indent=1))
