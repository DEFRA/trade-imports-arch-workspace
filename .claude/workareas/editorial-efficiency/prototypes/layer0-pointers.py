"""Layer 0 pointers (test R3): the R1 detectors run over a run's reviewed
pages, written as attention pointers for the paragraph pass. A pointer is a
place to look, not a finding.

Usage: python3 -I layer0-pointers.py <pages dir> <out md>
"""
import re
import sys
from pathlib import Path

PAGES, OUT = Path(sys.argv[1]), Path(sys.argv[2])
REVIEWED = ["02a-ins-auth-session-service-design.md", "02b-ins-auth-session-record.md", "02c-ins-auth-session-api.md"]
CONTEXT = ["00-ins-auth-foundations.md"]
KNOWN = set("INS IDM IPAFFS CDP BTMS OIDC JWT TTL CSRF HTTP HTTPS API URL ID SVG UK EU SPS ADR B2B B2C UI JSON GET POST PUT DELETE".split())
FORBIDDEN = {r"\bsnapshot\b": "session assertion", r"\bcookie value\b": "sealed value", r"\bfront door UI\b": "front door", r"\brefresh(es|ed|ing)? the session\b": "re-confirmation"}
PARTICIPLE_EXCEPT = set("based used needed required allowed concerned interested supposed signed expired sealed".split())
SENT_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z`\[(])")
WORD = re.compile(r"[A-Za-z0-9'`_-]+")


def prose_lines(path):
    fence = False
    for n, raw in enumerate(path.read_text().splitlines(), 1):
        s = raw.strip()
        if s.startswith("```"):
            fence = not fence
            continue
        if fence or not s or s.startswith("<!--") or s.startswith("---") or s.startswith("title:"):
            continue
        yield n, s


def sentences(t):
    return [x for x in SENT_SPLIT.split(t) if x]


def words(t):
    return WORD.findall(re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", t))


def slug(h):
    h = re.sub(r"[`*_]", "", h.lower()).strip()
    return re.sub(r" +", "-", re.sub(r"[^a-z0-9 -]", "", h))


def shingles(ws, k=3):
    ws = [w.lower() for w in ws]
    return {tuple(ws[i:i + k]) for i in range(len(ws) - k + 1)}


pages = {p: list(prose_lines(PAGES / p)) for p in REVIEWED + CONTEXT}
anchors = {p: {slug(t.lstrip("#").strip()) for _, t in ls if t.startswith("#")} for p, ls in pages.items()}
all_sents = [(p, n, shingles(words(s))) for p, ls in pages.items() for n, t in ls
             if not t.startswith(("#", "|")) for s in sentences(t) if len(words(s)) >= 8]

out = ["# Layer 0 Pointers", "", "Places for the paragraph pass to look first. A pointer is a mechanical signal, not a finding: judge each in context and report a finding only for a real defect.", ""]
for p in REVIEWED:
    out.append(f"## {p}")
    seen = set()
    for n, t in pages[p]:
        notes = []
        prose = not t.startswith(("#", "|"))
        if prose:
            sents = sentences(t)
            long_s = [len(words(s)) for s in sents if len(words(s)) > 30]
            if long_s:
                notes.append(f"long sentence ({', '.join(map(str, long_s))} words)")
            if len(words(t)) > 120 or len(sents) > 6:
                notes.append(f"long paragraph ({len(words(t))} words, {len(sents)} sentences)")
            m = next((m for m in re.finditer(r"\b(is|are|was|were|be|been|being)\s+(?:\w+ly\s+)?(\w+(?:ed|en))\b", t) if m.group(2).lower() not in PARTICIPLE_EXCEPT), None)
            if m:
                notes.append(f'passive "{m.group(0)}"')
            if any(s.count(";") >= 2 or (s.count(",") >= 3 and re.search(r",\s+(and|or)\s", s)) for s in sents):
                notes.append("possible hidden list")
            for s in sents:
                sh = shingles(words(s))
                if len(words(s)) < 8 or not sh:
                    continue
                hit = next(((q, qn) for q, qn, qsh in all_sents if (q, qn) != (p, n) and qsh and len(sh & qsh) / len(sh | qsh) >= 0.5), None)
                if hit:
                    notes.append(f"near-duplicate of {hit[0][:3]}:{hit[1]}")
                    break
        for m in re.finditer(r"\b[A-Z][A-Z0-9]{1,}s?\b", t):
            a = m.group(0).rstrip("s")
            if a in KNOWN or a in seen or len(a) < 2:
                continue
            seen.add(a)
            if not re.search(r"\(" + re.escape(a) + r"\)", t) and not re.search(re.escape(a) + r"\s*\(", t):
                notes.append(f"acronym {a} not expanded at first use")
        for pat, pref in FORBIDDEN.items():
            m = re.search(pat, t, re.I)
            if m:
                notes.append(f'term "{m.group(0)}": run notes prefer "{pref}"')
        for m in re.finditer(r"\]\(([^)#]*)#([^)]+)\)", t):
            target = Path(m.group(1) or p).name
            if target in anchors and m.group(2) not in anchors[target]:
                notes.append(f"anchor #{m.group(2)} not found in {target}")
        if notes:
            out.append(f"- line {n}: " + "; ".join(notes))
    out.append("")
OUT.write_text("\n".join(out))
print(f"layer0-pointers: {sum(1 for l in out if l.startswith('- line'))} paragraphs flagged")
