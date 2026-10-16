"""Recall of base-run fixes by finding kind (test R3): which kinds of fix an
arm misses. Uses compare-runs.sh's match rule: same page and anchor line
within 2, or a 30-character run of the normalised quote in common.

Usage: python3 -I recall-by-kind.py <triage workareas dir> <arm> <base>...
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

W = Path(sys.argv[1])
ARM, BASES = sys.argv[2], sys.argv[3:]


def norm(s):
    return re.sub(" +", " ", re.sub("[^a-z0-9 ]", "", (s or "").lower()))


def fixes(run):
    wa = W / f"exp-{run}"
    recs = {r["id"]: r for r in json.loads((wa / "findings.json").read_text())["records"]}
    moves = {}
    for g in sorted((wa / "calibration/grades").glob("*.json")):
        for it in json.loads(g.read_text()).get("items", []):
            moves[it["cluster"]] = it["move"]
    out = []
    for c in json.loads((wa / "triage.json").read_text())["clusters"]:
        if moves.get(c["id"]) not in ("R", "C", "W"):
            continue
        r = recs[c.get("chosen") or c["members"][0]]
        out.append({"page": r["page"], "line": int(r.get("anchorLine") or r.get("line") or 0),
                    "q": norm(r.get("quote")), "kind": r["kind"], "kinds": c.get("kinds", [r["kind"]])})
    return out


def match(a, b):
    if a["page"] != b["page"]:
        return False
    if a["line"] > 0 and abs(a["line"] - b["line"]) <= 2:
        return True
    return (len(a["q"]) >= 30 and a["q"][:30] in b["q"]) or (len(b["q"]) >= 30 and b["q"][:30] in a["q"])


arm = fixes(ARM)
total, hit = Counter(), Counter()
for base in BASES:
    for f in fixes(base):
        k = "contradiction" if "contradiction" in f["kinds"] else f["kind"]
        total[k] += 1
        hit[k] += any(match(f, a) for a in arm)
rows = {k: {"base_fixes": total[k], "matched": hit[k], "recall": round(hit[k] / total[k], 2)} for k in sorted(total, key=lambda k: -total[k])}
all_t, all_h = sum(total.values()), sum(hit.values())
no_k = {k: v for k, v in total.items() if k != "contradiction"}
print(json.dumps({"arm": ARM, "bases": BASES, "recall": round(all_h / all_t, 2),
                  "recall_without_contradictions": round(sum(hit[k] for k in no_k) / sum(no_k.values()), 2),
                  "by_kind": rows}, indent=2))
