# design-consistency state JSON shape

A run's state lives under `~/trade-imports-arch-workspace/.claude/workareas/design-consistency/<run id>/` (gitignored task state). A run id names a page set; re-running it after edits re-extracts only the pages whose hash changed.

| File | Writer | Holds |
| --- | --- | --- |
| `manifest.json` | `start-design-consistency.sh` | the run's pages with path, hash and facts file |
| `facts/<page stem>.json` | one `FACT_EXTRACTOR` per page | the page's facts and the hash of the page they were read from |
| `register.json`, `register.tsv` | `build-register.sh` | every page's facts in one list, sorted by actor then object |
| `contradictions.json` | the `CONSISTENCY_CHECKER` | the contradictions, each citing at least two facts |
| `questions.md` | `render-design-consistency.sh` | the contradictions as questions, most severe first |

## Schema

```jsonc
// manifest.json
{"run": "ins-auth-session", "updated": "2026-10-16T18:00:00Z",
 "pages": [{"page": "02a-design.md", "path": "~/...", "hash": "<sha256>", "facts": "~/.../facts/02a-design.json"}]}

// facts/<page stem>.json
{"page": "02a-design.md", "sourceHash": "<sha256 of the page read>",
 "facts": [{"id": "02a-design-001", "line": 12, "quote": "<verbatim, at most 30 words>",
            "actor": "the session service", "action": "holds", "object": "the signing key",
            "condition": null, "force": "only", "value": null}]}

// contradictions.json
[{"id": "K-001", "severity": "S1", "summary": "<one sentence>",
  "facts": [{"id": "02a-design-001", "page": "02a-design.md", "line": 12, "quote": "<quote>"}],
  "question": "<what the author must answer>"}]
```

## Field rules

- `hash`, `sourceHash`: SHA-256 of the page file. A facts file counts only when its `sourceHash` equals the manifest hash; `start-design-consistency.sh` and `build-register.sh` both check this.
- `id`, `line`, `quote`, `actor`, `action` and `force` are required; `object`, `condition` and `value` may be null.
- `force`: one of `always`, `never`, `only`, `may`, `must`; `build-register.sh` refuses any other value.
- `condition`: the when or unless clause, or the page's own open marking (`working assumption`, `to be decided`); null when the rule is unconditional and settled.
- `line`: the Read tool's line number in the page as hashed.
- `facts` on a contradiction: at least two register fact ids; `render-design-consistency.sh` flags any contradiction that cites fewer.
