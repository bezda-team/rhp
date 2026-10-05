"""Token accounting for one agent run, from its Claude Code transcript (a subagent's JSONL file).

Exact, from each API request's usage: uncached input, cache writes (5-minute and 1-hour), cache reads, and so the
context size of every request. Estimated: output tokens, because a subagent's transcript records each message's usage
when its first block streams, before the output is counted. Each request's output is taken from how much the next
request's context grew (the growth is that output plus the tool results and reminders appended after it), when what
was appended is small enough to estimate closely; otherwise from the visible output (text and tool inputs) plus the
thinking, sized from its signature. Ratios are calibrated on runs of the same model (see calibrate()).

    python3 analyze.py <transcript.jsonl> [--model sonnet]   prints JSON
"""
import base64, json, os, re, struct, sys
from datetime import datetime


def parse(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00"))
from collections import Counter

PRICES = {  # $ per million tokens: input, output, cache write 5m, cache write 1h, cache read
    "claude-sonnet-5-5": (2.00, 10.00, 2.50, 4.00, 0.20),
    "claude-opus-5-5": (4.00, 20.00, 5.00, 8.00, 0.20),
    "claude-haiku-4-5-20251001": (1.00, 5.00, 1.25, 2.00, 0.10),
    "claude-fable-5-1": (10.00, 50.00, 12.50, 20.00, 0.25),
}
# Characters per token (Claude 5 tokenizer), measured with whole-file reads in this harness (calibration run)
CHARS_PER_TOKEN = {"html": 2.2, "md": 2.45, "json": 2.8, "text": 3.0, "bash": 2.3}
SIG_CHARS_PER_THINKING_TOKEN = 2.8   # refined by calibrate()
SIG_OVERHEAD = 300
SMALL_APPEND = 1500                  # tokens: below this, output = context growth - appended


def kind_of(text):
    t = text.lstrip()[:400]
    if t.startswith("{") or t.startswith("["):
        return "json"
    if "<html" in t.lower() or "<!doctype" in t.lower() or "<div" in t or "<script" in t:
        return "html"
    if t.startswith("#") or "\n## " in text[:4000] or "```" in text[:4000]:
        return "md"
    return "text"


def tokens_of(text, kind=None):
    return len(text) / CHARS_PER_TOKEN[kind or kind_of(text)]


def image_size(b64):
    try:
        raw = base64.b64decode(b64[:4000] + "=" * (-len(b64[:4000]) % 4))
    except Exception:
        return None
    if raw[:8] == b"\x89PNG\r\n\x1a\n":
        return struct.unpack(">II", raw[16:24])
    if raw[:2] == b"\xff\xd8":
        i = 2
        while i < len(raw) - 9:
            if raw[i] != 0xFF:
                i += 1
                continue
            marker = raw[i + 1]
            if marker in (0xC0, 0xC1, 0xC2):
                h, w = struct.unpack(">HH", raw[i + 5:i + 9])
                return (w, h)
            i += 2 + struct.unpack(">H", raw[i + 2:i + 4])[0]
    return None


def image_tokens(w, h, long_edge=2576, max_tokens=4784):
    k = min(1.0, long_edge / max(w, h))
    w, h = w * k, h * k
    return min(max_tokens, int(w * h / 750) + 1)


def load(path):
    rows = [json.loads(l) for l in open(path) if l.strip()]
    reqs = []        # one per API request (assistant message id)
    cur = None
    first_user = None
    for r in rows:
        t = r.get("type")
        if t == "assistant":
            m = r["message"]
            if cur is None or cur["id"] != m["id"]:
                cur = {"id": m["id"], "model": m.get("model"), "usage": m["usage"], "blocks": [], "after": [], "ts": r.get("timestamp")}
                reqs.append(cur)
            cur["blocks"] += m["content"]
        elif t == "user":
            c = r["message"]["content"]
            if cur is None:
                first_user = c
                continue
            if isinstance(c, list):
                for b in c:
                    if b.get("type") != "tool_result":
                        if b.get("type") == "text":
                            cur["after"].append(("text", b.get("text", ""), None))
                        continue
                    cc = b.get("content")
                    use = b.get("tool_use_id")
                    if isinstance(cc, list):
                        for x in cc:
                            if x.get("type") == "text":
                                cur["after"].append(("result", x.get("text", ""), use))
                            elif x.get("type") == "image":
                                size = image_size(x.get("source", {}).get("data", ""))
                                cur["after"].append(("image", size, use))
                    else:
                        cur["after"].append(("result", str(cc), use))
            else:
                cur["after"].append(("text", str(c), None))
        elif t == "attachment" and cur is not None:
            rendered = r.get("rendered")
            if rendered and r["attachment"].get("type") != "prompt_snapshot":
                cur["after"].append(("attach", "".join(x.get("content", "") for x in rendered), None))
    return reqs, first_user, rows


def context(u):
    return u["input_tokens"] + u["cache_creation_input_tokens"] + u["cache_read_input_tokens"]


def visible_output(blocks):
    """(tokens, chars) of what the model wrote that the transcript shows: text and tool calls."""
    tok = 0.0
    chars = 0
    for b in blocks:
        if b.get("type") == "text":
            tok += tokens_of(b.get("text", ""), "text")
            chars += len(b.get("text", ""))
        elif b.get("type") == "tool_use":
            inp = b.get("input") or {}
            s = json.dumps(inp, ensure_ascii=False)
            content = inp.get("content") or inp.get("new_string") or ""
            if content:
                rest = len(s) - len(content)
                tok += tokens_of(content) + rest / CHARS_PER_TOKEN["bash"] + 12
            else:
                tok += len(s) / CHARS_PER_TOKEN["bash"] + 12
            chars += len(s)
    return tok, chars


def appended_tokens(after):
    tok = 0.0
    images = 0
    for kind, v, *_ in after:
        if kind == "image":
            images += 1
            tok += image_tokens(*v) if v else 1600
        else:
            tok += tokens_of(v) + 8
    return tok, images


def analyze(path):
    reqs, first_user, rows = load(path)
    model = reqs[0]["model"] if reqs else None
    out = []
    for i, q in enumerate(reqs):
        vis, vchars = visible_output(q["blocks"])
        sig = sum(len(b.get("signature", "")) for b in q["blocks"] if b.get("type") == "thinking")
        think = max(0.0, (sig - SIG_OVERHEAD) / SIG_CHARS_PER_THINKING_TOKEN) if sig else 0.0
        app, imgs = appended_tokens(q["after"])
        est = vis + think
        method = "visible+signature"
        if i + 1 < len(reqs):
            growth = context(reqs[i + 1]["usage"]) - context(q["usage"])
            if app < SMALL_APPEND and growth > 0:
                g = growth - app
                if g >= vis * 0.7:
                    est, method = g, "growth"
        out.append({"out": est, "method": method, "visible": vis, "thinking": think, "sig": sig, "appended": app, "images": imgs})

    u = [q["usage"] for q in reqs]
    # A headless run's stream-json transcript (run-headless.sh) ends with Claude Code's own exact totals
    result = next((r for r in reversed(rows) if r.get("type") == "result" and "usage" in r), None)
    totals = {
        "requests": len(reqs),
        "input_uncached": sum(x["input_tokens"] for x in u),
        "cache_write_5m": sum((x.get("cache_creation") or {}).get("ephemeral_5m_input_tokens", x["cache_creation_input_tokens"]) for x in u),
        "cache_write_1h": sum((x.get("cache_creation") or {}).get("ephemeral_1h_input_tokens", 0) for x in u),
        "cache_read": sum(x["cache_read_input_tokens"] for x in u),
        "output_est": round(sum(o["out"] for o in out)),
        "output_visible_est": round(sum(o["visible"] for o in out)),
        "output_by_growth_share": round(sum(o["out"] for o in out if o["method"] == "growth") / max(1, sum(o["out"] for o in out)), 3),
        "context_first": context(u[0]) if u else 0,
        "context_max": max((context(x) for x in u), default=0),
        "images_read": sum(o["images"] for o in out),
    }
    if result:
        ru = result["usage"]
        totals.update({"input_uncached": ru.get("input_tokens", 0), "cache_read": ru.get("cache_read_input_tokens", 0), "output_est": ru.get("output_tokens", 0),
                       "cache_write_5m": (ru.get("cache_creation") or {}).get("ephemeral_5m_input_tokens", ru.get("cache_creation_input_tokens", 0)),
                       "cache_write_1h": (ru.get("cache_creation") or {}).get("ephemeral_1h_input_tokens", 0), "exact": True})
    totals["input_total"] = totals["input_uncached"] + totals["cache_write_5m"] + totals["cache_write_1h"] + totals["cache_read"]
    p = PRICES.get(model)
    if result and result.get("total_cost_usd") is not None:
        totals["cost_usd"] = round(result["total_cost_usd"], 4)
    elif p:
        totals["cost_usd"] = round((totals["input_uncached"] * p[0] + totals["output_est"] * p[1] + totals["cache_write_5m"] * p[2]
                                    + totals["cache_write_1h"] * p[3] + totals["cache_read"] * p[4]) / 1e6, 4)
        totals["cost_output_usd"] = round(totals["output_est"] * p[1] / 1e6, 4)

    # Tool use
    tools = Counter()
    bash = Counter()
    reads = Counter()
    violations = []
    writes = 0
    for q in reqs:
        for b in q["blocks"]:
            if b.get("type") != "tool_use":
                continue
            name = b["name"]
            tools[name] += 1
            inp = b.get("input") or {}
            if name not in ("Bash", "Read", "Write", "Edit", "Glob", "Grep", "SubagentHandback", "MultiEdit", "NotebookEdit"):
                violations.append(name)
            blob = json.dumps(inp)
            for forbidden in filter(None, os.environ.get("FORBIDDEN_PATHS", "").split(",")):
                if forbidden in blob:
                    violations.append(f"{name} touches {forbidden}")
            if name == "Bash":
                cmd = inp.get("command", "")
                if re.search(r"rhp-mcp\S*\s+check|rhp-mcp\.js\s+check", cmd):
                    bash["rhp check (CLI)"] += 1
                m = re.findall(r"mcp-call\s+(\w+)\s+(\w+)", cmd)
                for server, tool in m:
                    bash[f"mcp {tool}"] += 1
                if re.search(r"playwright|chromium|headless_shell|puppeteer", cmd) and "rhp-mcp" not in cmd:
                    bash["own browser render"] += 1
                if re.search(r"npm (i|install)|npx -y (?!@bezda/rhp-mcp)", cmd):
                    bash["npm install"] += 1
                if not m and not re.search(r"rhp-mcp", cmd):
                    bash["other"] += 1
            elif name == "Read":
                fp = inp.get("file_path", "")
                if "/.claude/skills/" in fp:
                    reads["skill file"] += 1
                elif re.search(r"\.(png|jpe?g|webp)$", fp, re.I):
                    reads["image"] += 1
                else:
                    reads["other"] += 1
            elif name in ("Write", "Edit", "MultiEdit"):
                writes += 1
    # Where the context comes from: each appended item, sized, and how many later requests read it again
    uses = {}
    for q in reqs:
        for b in q["blocks"]:
            if b.get("type") == "tool_use":
                uses[b["id"]] = b
    def source(kind, use):
        if kind == "attach":
            return "harness reminders"
        if kind == "text":
            return "task prompt"
        b = uses.get(use) or {}
        name, inp = b.get("name"), b.get("input") or {}
        if kind == "image":
            return "screenshots"
        if name == "Read":
            fp = inp.get("file_path", "")
            if fp.endswith("TASK.md"):
                return "task (TASK.md, incl. tool listing)"
            if "/.claude/skills/" in fp:
                return "skill docs"
            return "other file reads"
        if name == "Bash":
            cmd = inp.get("command", "")
            m = re.search(r"mcp-call\s+(?:\w+\s+)?(\w+)", cmd)
            if m:
                tool = m.group(1)
                return "MCP check" if tool in ("rhp_check", "render_chart", "renderChart", "validate_chart", "apexcharts_validate_config", "diagnoseConfig") else "MCP docs/tools"
            if "rhp-mcp" in cmd and "check" in cmd:
                return "checker (CLI)"
            if "/.claude/skills/" in cmd:
                return "skill docs"
            return "shell output"
        if name in ("Write", "Edit", "MultiEdit"):
            return "edit confirmations"
        return "other tools"
    attribution = Counter()
    reread = Counter()
    before_draft = Counter()   # what the agent read before it first wrote the poster: the cost of learning
    first_draft = None
    for i, q in enumerate(reqs):
        if any(b.get("type") == "tool_use" and b["name"] == "Write" and str((b.get("input") or {}).get("file_path", "")).endswith("project/poster.html") for b in q["blocks"]):
            first_draft = i
            break
    n = len(reqs)
    for i, q in enumerate(reqs):
        for kind, v, *rest in q["after"]:
            use = rest[0] if rest else None
            t = image_tokens(*v) + 0 if kind == "image" and v else (1600 if kind == "image" else tokens_of(v) + 8)
            src = source(kind, use)
            attribution[src] += t
            reread[src] += t * max(0, n - 2 - i)
            if first_draft is not None and i < first_draft:
                before_draft[src] += t
        o = out[i]["out"]
        attribution["agent output (code, text, thinking)"] += o
        reread["agent output (code, text, thinking)"] += o * max(0, n - 1 - i)
    # What the checkers said, in order: rhp's checker (CLI or MCP), and ApexCharts' validate_config
    checks = []
    for i, q in enumerate(reqs):
        for kind, v, *_ in q["after"]:
            if kind != "result" or not isinstance(v, str):
                continue
            for m in re.finditer(r"rhp check of ([^\n]*?): (no problems found|(?:(\d+) errors?)?(?:, )?(?:(\d+) warnings?)?)\.", v):
                codes = re.findall(r"^\d+\. \[([\w-]+)\]", v, re.M)
                checks.append({"request": i, "tool": "rhp_check", "file": m.group(1).split(" (")[0], "errors": int(m.group(3) or 0), "warnings": int(m.group(4) or 0), "codes": codes})
            if '"ok"' in v and '"issues"' in v:
                try:
                    j = json.loads(v[v.index("{"):v.rindex("}") + 1])
                    checks.append({"request": i, "tool": "apex_validate", "ok": j.get("ok"), "issues": len(j.get("issues", [])), "codes": [x.get("rule") or x.get("code") for x in j.get("issues", [])][:20]})
                except Exception:
                    pass
    ts = [q["ts"] for q in reqs if q["ts"]]
    wall = (parse(ts[-1]) - parse(ts[0])).total_seconds() if len(ts) > 1 else 0
    final_text = ""
    for q in reversed(reqs):
        for b in q["blocks"]:
            if b.get("type") == "tool_use" and b["name"] == "SubagentHandback":
                final_text = json.dumps(b.get("input"))[:3000]
            if b.get("type") == "text" and not final_text:
                final_text = b.get("text", "")[:3000]
        if final_text:
            break
    learning = {"first_draft_request": first_draft, "read_before_draft": {k: round(v) for k, v in before_draft.most_common()},
                "output_before_draft": round(sum(o["out"] for o in out[:first_draft])) if first_draft is not None else None,
                "minutes_before_draft": round((parse(reqs[first_draft]["ts"]) - parse(reqs[0]["ts"])).total_seconds() / 60, 1) if first_draft is not None else None}
    return {"model": model, "totals": totals, "learning": learning, "context_sources": {k: round(v) for k, v in attribution.most_common()},
            "reread_by_source": {k: round(v) for k, v in reread.most_common()}, "tools": dict(tools), "bash": dict(bash), "reads": dict(reads), "writes": writes, "checks": checks,
            "violations": violations, "wall_seconds": round(wall), "final_text": final_text, "per_request": out}


def calibrate(paths):
    """Fits thinking tokens per signature character on requests whose output is known from context growth."""
    xs, ys = [], []
    for p in paths:
        reqs, _, _ = load(p)
        for i, q in enumerate(reqs[:-1]):
            sig = sum(len(b.get("signature", "")) for b in q["blocks"] if b.get("type") == "thinking")
            app, _ = appended_tokens(q["after"])
            if not sig or app > 600:
                continue
            growth = context(reqs[i + 1]["usage"]) - context(q["usage"])
            vis, _ = visible_output(q["blocks"])
            think = growth - app - vis
            if think > 50:
                xs.append(sig)
                ys.append(think)
    if len(xs) < 3:
        return None
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    b = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)
    a = my - b * mx
    return {"n": n, "tokens_per_sig_char": b, "intercept": a, "chars_per_token": 1 / b if b else None}


if __name__ == "__main__":
    if sys.argv[1] == "--calibrate":
        print(json.dumps(calibrate(sys.argv[2:]), indent=1))
    else:
        r = analyze(sys.argv[1])
        if "--full" not in sys.argv:
            r.pop("per_request")
        print(json.dumps(r, indent=1))
