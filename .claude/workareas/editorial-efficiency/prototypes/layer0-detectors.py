"""Layer 0 reach (offline test 1): how many review findings could mechanical
checks have caught?

Runs prototype detectors over the frozen corpus pages and matches their flags
against every finding the experiment runs raised on those pages, pooled and
de-duplicated by (page, anchor line, kind). The pages hold one paragraph per
line, so a line is a paragraph.

Usage: python3 -I layer0-detectors.py <workareas dir> <corpus dir> <out json>
"""
import json
import re
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path

WA, CORPUS, OUT = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
REVIEWED = ["02a-ins-auth-session-service-design.md", "02b-ins-auth-session-record.md", "02c-ins-auth-session-api.md"]
CONTEXT = ["00-ins-auth-foundations.md"]

# Acronyms the run notes and the reader frame make known.
KNOWN = set("INS IDM IPAFFS CDP BTMS OIDC JWT TTL CSRF HTTP HTTPS API URL ID SVG UK EU SPS ADR B2B B2C UI JSON GET POST PUT DELETE".split())
# Terms the run notes forbid, with the preferred term.
FORBIDDEN = {
    r"\bsnapshot\b": "session assertion",
    r"\bcookie value\b": "sealed value",
    r"\bfront door UI\b": "front door",
    r"\brefresh(es|ed|ing)? the session\b": "re-confirmation",
}
PARTICIPLE_EXCEPT = set("based used needed required allowed concerned interested supposed signed expired sealed".split())
SENT_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z`\[(])")
WORD = re.compile(r"[A-Za-z0-9'`_-]+")


def prose_lines(path):
    """Yield (line number, text) for prose lines: no fences, tables kept apart."""
    fence = False
    for n, raw in enumerate(path.read_text().splitlines(), 1):
        s = raw.strip()
        if s.startswith("```"):
            fence = not fence
            continue
        if fence or not s or s.startswith("<!--") or s.startswith("---") or s.startswith("title:"):
            continue
        yield n, s


def sentences(text):
    return [t for t in SENT_SPLIT.split(text) if t]


def words(text):
    return WORD.findall(re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text))


def slug(heading):
    h = re.sub(r"[`*_]", "", heading.lower()).strip()
    h = re.sub(r"[^a-z0-9 -]", "", h)
    return re.sub(r" +", "-", h)


pages = {p: list(prose_lines(CORPUS / p)) for p in REVIEWED + CONTEXT}
anchors = {p: {slug(t.lstrip("#").strip()) for _, t in lines if t.startswith("#")} for p, lines in pages.items()}

flags = defaultdict(set)  # (page, line) -> detector names


def flag(page, line, name):
    flags[(page, line)].add(name)


# Shingles for near-duplicate sentences across the set (reviewed and context pages).
def shingles(ws, k=3):
    ws = [w.lower() for w in ws]
    return {tuple(ws[i:i + k]) for i in range(len(ws) - k + 1)}


all_sents = []
for p, lines in pages.items():
    for n, t in lines:
        if t.startswith("#") or t.startswith("|"):
            continue
        for s in sentences(t):
            ws = words(s)
            if len(ws) >= 8:
                all_sents.append((p, n, shingles(ws)))

for p in REVIEWED:
    seen_acr = set()
    for n, t in pages[p]:
        is_table = t.startswith("|")
        is_head = t.startswith("#")
        if not is_head and not is_table:
            sents = sentences(t)
            if any(len(words(s)) > 30 for s in sents):
                flag(p, n, "long-sentence")
            if len(words(t)) > 120 or len(sents) > 6:
                flag(p, n, "long-paragraph")
            for m in re.finditer(r"\b(is|are|was|were|be|been|being)\s+(?:\w+ly\s+)?(\w+(?:ed|en))\b", t):
                if m.group(2).lower() not in PARTICIPLE_EXCEPT:
                    flag(p, n, "passive")
                    break
            for s in sents:
                if s.count(";") >= 2 or (s.count(",") >= 3 and re.search(r",\s+(and|or)\s", s)):
                    flag(p, n, "list-candidate")
                    break
        for m in re.finditer(r"\b[A-Z][A-Z0-9]{1,}s?\b", t):
            a = m.group(0).rstrip("s")
            if a in KNOWN or a in seen_acr or len(a) < 2:
                continue
            seen_acr.add(a)
            if not re.search(r"\(" + re.escape(a) + r"\)", t) and not re.search(re.escape(a) + r"\s*\(", t):
                flag(p, n, "acronym-first-use")
        for pat in FORBIDDEN:
            if re.search(pat, t, re.I):
                flag(p, n, "forbidden-term")
        for m in re.finditer(r"\]\(([^)#]*)#([^)]+)\)", t):
            target = m.group(1) or p
            target = Path(target).name
            if target in anchors and m.group(2) not in anchors[target]:
                flag(p, n, "dangling-anchor")
        if not is_head and not is_table:
            for s in sentences(t):
                ws = words(s)
                if len(ws) < 8:
                    continue
                sh = shingles(ws)
                for q, qn, qsh in all_sents:
                    if (q, qn) == (p, n) or not sh or not qsh:
                        continue
                    if len(sh & qsh) / len(sh | qsh) >= 0.5:
                        flag(p, n, "near-duplicate")
                        break

# The existing gate's FAIL and WARN lines.
GATE = Path.home() / "trade-imports-arch-workspace/.claude/tools/editorial/check-prose.sh"
for p in REVIEWED:
    out = subprocess.run(["bash", str(GATE), str(CORPUS / p)], capture_output=True, text=True)
    for line in (out.stdout + out.stderr).splitlines():
        m = re.match(r"check-prose: (FAIL|WARN) .*?:(\d+):", line)
        if m:
            flag(p, int(m.group(2)), "gate-" + m.group(1).lower())

# Findings pooled from every experiment workarea on the frozen pages.
COMPATIBLE = {
    "repetition": {"near-duplicate"},
    "term": {"acronym-first-use", "forbidden-term"},
    "reference": {"dangling-anchor"},
    "flow": {"long-paragraph", "list-candidate"},
    "compression": {"long-sentence", "passive", "gate-warn", "gate-fail"},
    "ambiguity": {"long-sentence", "passive", "forbidden-term"},
    "absolute": set(), "omission": set(), "contradiction": set(), "fact": set(), "presentation": set(), "residue": {"gate-warn", "gate-fail"},
}
findings = {}
fixed = set()
for wa in sorted(WA.glob("exp-*")):
    f, t = wa / "findings.json", wa / "triage.json"
    if not f.exists() or not t.exists():
        continue
    recs = {r["id"]: r for r in json.loads(f.read_text())["records"]}
    moves = {}
    for g in wa.glob("calibration/grades/*.json"):
        for it in json.loads(g.read_text()).get("items", []):
            moves[it["cluster"]] = it["move"]
    for c in json.loads(t.read_text())["clusters"]:
        lead = recs.get(c.get("chosen") or c["members"][0])
        if not lead or lead.get("page") not in REVIEWED:
            continue
        line = int(lead.get("anchorLine") or lead.get("line") or 0)
        key = (lead["page"], line, lead["kind"])
        findings.setdefault(key, {"page": lead["page"], "line": line, "kind": lead["kind"], "runs": 0})
        findings[key]["runs"] += 1
        if moves.get(c["id"]) in ("R", "C", "W"):
            fixed.add(key)


def caught(key, strict):
    fl = flags.get((key[0], key[1]), set())
    return bool(fl & COMPATIBLE.get(key[2], set())) if strict else bool(fl)


keys = list(findings)
by_kind = defaultdict(lambda: Counter())
for k in keys:
    by_kind[k[2]]["n"] += 1
    by_kind[k[2]]["strict"] += caught(k, True)
    by_kind[k[2]]["loose"] += caught(k, False)
    if k in fixed:
        by_kind[k[2]]["fixed"] += 1
        by_kind[k[2]]["fixed_strict"] += caught(k, True)

flag_lines = set(flags)
finding_lines = {(k[0], k[1]) for k in keys}
det_stats = Counter()
det_hits = Counter()
for (p, n), names in flags.items():
    for d in names:
        det_stats[d] += 1
        if (p, n) in finding_lines:
            det_hits[d] += 1

result = {
    "distinct_findings": len(keys),
    "fixed_findings": len(fixed),
    "caught_strict": sum(caught(k, True) for k in keys),
    "caught_loose": sum(caught(k, False) for k in keys),
    "fixed_caught_strict": sum(caught(k, True) for k in fixed),
    "by_kind": {k: dict(v) for k, v in sorted(by_kind.items(), key=lambda x: -x[1]["n"])},
    "detectors": {d: {"flagged_paragraphs": det_stats[d], "on_a_finding_paragraph": det_hits[d],
                      "precision": round(det_hits[d] / det_stats[d], 2) if det_stats[d] else None} for d in sorted(det_stats)},
    "flagged_paragraphs": len(flag_lines),
    "finding_paragraphs": len(finding_lines),
}
OUT.write_text(json.dumps(result, indent=2))
print(json.dumps({k: result[k] for k in ("distinct_findings", "fixed_findings", "caught_strict", "caught_loose", "fixed_caught_strict", "flagged_paragraphs", "finding_paragraphs")}))
