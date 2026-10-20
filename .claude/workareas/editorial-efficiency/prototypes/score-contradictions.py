"""Score a design-consistency check (test R2) against the contradiction
findings the experiment runs raised on the same pages.

A ground-truth finding is found when a reported contradiction cites a fact on
the same page within one line of the finding's line or one of its related
lines. Reports recall over every finding and over the robust ones (raised by
three or more runs), whether the cookie contradiction (02a lines 14 and 29)
was found, and the reported contradictions that match no finding.

Usage: python3 -I score-contradictions.py <ground-truth.json> <contradictions.json> <ground-truth-raw.jsonl>
"""
import json
import sys

gt = json.load(open(sys.argv[1]))
found = json.load(open(sys.argv[2]))
raw = [json.loads(l) for l in open(sys.argv[3]) if l.strip()]
related = {}
for r in raw:
    related.setdefault((r["page"], r["line"]), set()).update((x["page"], int(x.get("line") or 0)) for x in r.get("related", []))

cited = []
for c in found:
    cited.append({(f["page"], int(f.get("line") or 0)) for f in c.get("facts", [])})


def near(a, b):
    return a[0] == b[0] and abs(a[1] - b[1]) <= 1


def match(g):
    spots = {(g["page"], g["line"])} | related.get((g["page"], g["line"]), set())
    return [i for i, cs in enumerate(cited) if any(near(s, c) for s in spots for c in cs)]


hits = {(g["page"], g["line"]): match(g) for g in gt}
robust = [g for g in gt if g["runs"] >= 3]
used = {i for v in hits.values() for i in v}
cookie = [g for g in gt if g["page"].startswith("02a") and g["line"] in (14, 29)]
out = {
    "ground_truth": len(gt),
    "found": sum(1 for v in hits.values() if v),
    "robust": len(robust),
    "robust_found": sum(1 for g in robust if hits[(g["page"], g["line"])]),
    "cookie_found": any(hits[(g["page"], g["line"])] for g in cookie),
    "reported": len(found),
    "reported_matching_a_finding": len(used),
    "reported_new": [{"summary": found[i].get("summary"), "severity": found[i].get("severity"),
                      "facts": [(f["page"], f.get("line")) for f in found[i].get("facts", [])]}
                     for i in range(len(found)) if i not in used],
    "missed_robust": [{"page": g["page"], "line": g["line"], "runs": g["runs"], "defect": g["defect"][:140]}
                      for g in robust if not hits[(g["page"], g["line"])]],
}
print(json.dumps(out, indent=2))
