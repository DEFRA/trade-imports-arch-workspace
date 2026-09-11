# editorial-triage record contract and state shape

This file is the single home for the finding record, the triage state and the rules the helpers apply. The review workflow's schemas mirror the reviewer-set fields; `build-triage.sh` validates them and writes the state described here; `grade-triage.sh` reads that state and writes the calibration and closing files. Change this file first, then the helpers, then the review schemas.

## Workarea layout

Canonical run directory: `~/trade-imports-arch-workspace/.claude/workareas/editorial-triage/<run>/` (gitignored task-local state).

| File | Written by | Holds |
| --- | --- | --- |
| `manifest.json` | build | run slug, source, docs commit, pages, parameters, `legacy` flag, builder version |
| `review.json` | build | the ingested review result, verbatim |
| `review/<page>.classified.json` | LEGACY_CLASSIFIER | reviewer-set fields for pre-v2 findings, keyed by legacy reference |
| `findings.json` | build | one normalised record per finding |
| `triage.json` | build | clusters, buckets, ranks, summary |
| `index.json` | build | per page: cluster ids with `needs` |
| `held.json` | parent session, optional | items already parked with the user; tagged, never re-asked |
| `calibration/` | grade, GRADER | rounds, labels, grades, agreement and the score |
| `closing/` | grade | the closing plan, the spot check and the apply record |
| `gate/` | workers | scratch files for check-prose runs |

## The finding record (`findings.json`)

`findings.json` is `{"records": [record, ...]}`. Reviewer-set fields are what a reviewer can know; tool-set fields are computed by `build-triage.sh` and never emitted by a reviewer.

### Reviewer-set fields

| Field | Type | Values or rule | Required |
| --- | --- | --- | --- |
| `page` | string | page filename (for example `03-ins-auth-session-record.md`) | yes |
| `line` | integer or null | line number from the Read tool; pages use one line per paragraph | when known |
| `quote` | string | verbatim phrase or heading the finding anchors to | yes |
| `kind` | enum | `fact`, `citation`, `contradiction`, `absolute`, `omission`, `ambiguity`, `term`, `reference`, `repetition`, `compression`, `flow`, `residue` | yes |
| `severity` | enum | `S1` wrong; `S2` contradiction; `S3` overreach; `S4` effort; `S5` preference | yes |
| `defect` | string | one sentence naming the defect and the question that exposed it | yes |
| `action` | enum | `correct`, `reconcile`, `delete`, `shorten`, `split`, `move`, `restructure`, `rename`, `expand`, `point`, `qualify`, `own`, `rewrite`, `ask` | yes |
| `basis` | enum | `rule`, `source`, `set`, `inference`, `author` | yes |
| `cites` | array of strings | rule name, source section, or `<page> "<verbatim quote>"` for basis `set`; the one unstated step for `inference` | unless basis is `author` |
| `point` | string | one sentence naming what the passage is trying to establish | yes |
| `bearing` | enum | `central`, `supporting`, `tangential` | yes |
| `removes` | string | the smallest whole unit (sentence, bullet, table row, paragraph) or complete parenthetical aside whose deletion resolves the finding, or `none: <why the unit has to stay>`. Never a fragment inside a surviving sentence | yes |
| `before` | string | verbatim span the proposal replaces | when a rewrite is offered |
| `after` | string | replacement text; empty string means delete | with `before` |
| `loss` | string | what the reader loses without the addition | when `after` is longer than `before` |
| `question` | string | the precise question for the author | when basis is `author` |
| `owner` | string | who answers the question | with `question` |
| `related` | array of `{page, line, quote}` | anchors of the other statements in a cross-page defect | when the defect spans pages |
| `moveTo` | string | target section or page | for `move` and `restructure` |

Severity range per kind: `fact` S1 to S3; `citation` S1; `reference` S1, S3, S4; `contradiction` S2 only; `absolute` S3; `omission` S3 or S4; `ambiguity` S2 to S4; `term` S4 or S5; `repetition` S4 or S5; `compression` S4; `flow` S4 or S5; `residue` S4 or S5.

Basis as confidence: `rule`, `source` and `set` are high; `inference` is medium; `author` is low and never applied. A `contradiction` may carry basis `set` only when one side is the structural home, carries a mechanism against a bare assertion, or is the majority of three or more statements; otherwise basis is `author`.

`removes` is the concentrate-and-distil field. Every finding names the smallest whole unit whose deletion would resolve it, or states why that unit has to stay. A `none:` reason is required before any `after` longer than `before`. `loss` may not be one of: completeness, context, clarity, helpful, useful (the denylist).

### Legacy fields (pre-v2 findings)

Records built from a pre-v2 review keep the original `category`, `location`, `proposal` and free text, carry `legacy: true`, and have the reviewer-set fields above filled from `review/<page>.classified.json` when a classifier has run. Until then `kind`, `severity`, `action`, `basis`, `point`, `bearing` and `removes` are null and the record is bucketed `unclassified`.

### Tool-set fields

| Field | Values | How |
| --- | --- | --- |
| `id` | `F-<NN>-<seq>` | `NN` is the page's leading digits (or `xx`); `seq` is zero-padded per page in source order |
| `source` | `drill`, `editor`, `structural` | which reviewer produced it |
| `reviewer` | string | the reviewer label (`drill:<page>`, `editor`, `structural:redundancies`, `structural:structure`, `structural:crossReferences`, `structural:shapes`) |
| `legacyRef` | object | where the record came from in the raw result (`{unit, index}` or `{section, index}`) |
| `legacy` | boolean | true when built from a pre-v2 result |
| `anchorLine` | integer or null | the line the anchor resolved to |
| `anchorResolved` | `reviewer`, `exact`, `stripped`, `span`, `prefix`, `line`, `none`, `conflict` | the ladder rung that resolved it; `line` when the reviewer gave a line but no quote matched anywhere (the line is trusted); `conflict` when the reviewer's line and the search disagree (the search wins) |
| `applicable` | `unique`, `multiple`, `missing`, `none` | whether `before` occurs exactly once in the page; `none` when no `before` |
| `gate` | `pass`, `fail`, `none` | check-prose result on `after`; `none` when no `after` |
| `delta` | integer | words in `after` minus words in `before` |
| `band` | `shrinks`, `neutral`, `grows`, `none` | `shrinks` below 0; `neutral` 0 to 3 words and at most 10%; `grows` otherwise; `none` when no `before` |
| `guess` | boolean | set by the reviewer, or by a classifier on a pre-v2 record, when the proposal states a mechanism or reason the set does not establish |
| `cluster` | `C-<NN>-<seq>` | the cluster the record joined |
| `checks` | array of strings | validation failures (`severity-range`, `cites-missing`, `cites-not-found`, `loss-denylist`, `removes-missing`, `question-missing`) |

### Anchor ladder

`build-triage.sh` resolves each record's anchor against its page in this order and records the rung: the reviewer's `line` when that line contains the quote, its stripped form or its 30-character prefix (`reviewer`); the quote found in the page (`exact`); the quote with quotes and backticks stripped (`stripped`); the longest double-quoted span inside the quote (`span`); the first 30 characters (`prefix`); a reviewer `line` with no match anywhere (`line`); otherwise `none`. When the reviewer's `line` and a search hit disagree, the search wins and the rung is `conflict`. A quote found more than once resolves to the first hit and sets `applicable: multiple` if it is also the `before`.

### Classified file (`review/<page>.classified.json`)

Written by `LEGACY_CLASSIFIER` for one page of a pre-v2 review. `build-triage.sh` merges each item onto the record with the same `legacyRef`; any field present in the item overrides the record.

```json
{
  "page": "03-ins-auth-session-record.md",
  "classifiedBy": "LEGACY_CLASSIFIER v1",
  "items": [
    {
      "legacyRef": {"unit": "03-ins-auth-session-record.md", "index": 29},
      "line": 117, "quote": "and the 30-minute rolling B2C session",
      "kind": "contradiction", "severity": "S2", "action": "reconcile", "basis": "set",
      "cites": ["03 \"That cookie never reaches INS and plays no part in these times\""],
      "point": "The decisions table states which limits apply when INS sets none.",
      "bearing": "central", "removes": "and the 30-minute rolling B2C session",
      "before": "the refresh-token lifetime and the 30-minute rolling B2C session, both of which IDM can change",
      "after": "the refresh-token lifetime, which IDM can change",
      "loss": null, "question": null, "owner": null, "related": [{"page": "03-ins-auth-session-record.md", "line": 81, "quote": "plays no part in these times"}],
      "moveTo": null, "guess": false
    }
  ]
}
```

The classifier may also rewrite `defect` to one sentence and set `page` and `line` for editor and structural records whose page was not recoverable from their text.

## Clusters (`triage.json`)

`triage.json` is `{"params": {...}, "clusters": [cluster, ...], "summary": {...}}`.

| Field | Meaning |
| --- | --- |
| `id` | `C-<NN>-<seq>` |
| `page`, `path` | the page the cluster anchors to; `set` for set-wide items |
| `anchorLine`, `key` | the cluster key: `page:anchorLine`, or `page:q:<normalised first 40 characters of the quote>` when unresolved |
| `members` | record ids, in join order |
| `severity` | the most severe member (S1 is most severe) |
| `kinds`, `actions` | distinct values across members |
| `reach` | `{pages: n, reviewers: n}` |
| `dispersion` | number of distinct normalised `after` texts among members with a rewrite |
| `chosen` | the record whose rewrite the cluster carries, or null |
| `alternatives` | member ids whose rewrite differs from the chosen one |
| `conflict` | true when `alternatives` is non-empty |
| `related` | cluster ids linked through `related` anchors (never merged) |
| `bearing` | inherited from the chosen record, or the most conservative member (`central` beats `supporting` beats `tangential`) when no rewrite |
| `removes` | removal first: the chosen record's span when that record names one, else the first member that names a real span, else the `none:` reason. One reviewer's `none:` never discards a cluster another reviewer can close by cutting a span |
| `questions` | union of member questions with owners |
| `held` | true when the cluster matches an entry in `held.json` |
| `bucket` | `fix`, `propose`, `author`, `discard`, `unclassified` |
| `reason` | the partition rule that placed it (`tangent`, `removal`, `author`, `restructure`, `dispersion`, `inference`, `grows`, `preference`, `verified`, `no-rewrite`, `fallback`, `gate-fail`, `unresolved`, `unclassified`, or a validation check name) |
| `rank` | position within the bucket |
| `needs` | `reconcile`, `verify`, `bearing`, `none` |

Dedup rule: records sharing a key form one cluster. Within a key, members are ordered drill, editor, structural, and each record joins the first sub-cluster whose quote contains or is contained by its own, or whose kind it shares; otherwise it starts a new sub-cluster. Inheritance: severity max, questions union, reviewers distinct. The chosen record is the first by: `applicable` unique, `gate` pass, basis strength (`rule` = `source` > `set` > `inference` > `author`), band (`shrinks` > `neutral` > `grows`), source order, shorter `after`.

### Partition rules, in precedence order

Parameters (`params` in `triage.json`, overridable with `--params`): `growthAllowance` (default 12 words), `growSeverityMax` (default 3: the least severe level whose rewrite may grow the text and still be `fix`), `neutralWords` (3), `neutralRatio` (0.10), `absolutesBlocking` (false), `demoteBelowHigh` (false), `essentialCap` (12).

1. `bearing` tangential: `propose` a removal of `removes` (reason `tangent`); any question is recorded on the proposal as the reason the text invited the question. If `removes` is `none`, `discard` with reason `tangent`.
2. `action` `delete` or `shorten`: `propose` (reason `removal`).
3. `basis` `author` with bearing central or supporting, or kind `omission` with no `after`: `author`.
4. `action` `restructure`, or `dispersion` above 1: `propose` (reason `restructure` or `dispersion`).
5. `basis` `inference`: `propose` (reason `inference`); with `demoteBelowHigh` on, `author` instead.
6. `band` `grows`: `fix` only when severity is S1 to S3, `delta` is at most `growthAllowance`, `removes` starts with `none:`, `loss` is present and off the denylist, `before` occurs once in the page (`applicable` unique) and `after` passes the gate; otherwise `propose` (reason `grows`).
7. severity S5: `fix` only when kind is `term` or `residue`, basis is `rule`, `applicable` is unique and the gate passes; otherwise `propose` (reason `preference`), ranked last.
8. `basis` `rule`, `source` or `set` with a rewrite that is applicable and passes the gate: `fix` (reason `verified`). Without a rewrite: `propose` (reason `no-rewrite`). Anything else: `propose` (reason `fallback`).

Before the rules, in this order: a record with no `kind` is `unclassified`; a record with `checks` non-empty is `discard` (reason is the first check); a record whose `gate` is `fail` is `propose` with reason `gate-fail`; a record with `anchorResolved` `none` and no `before` is `propose` with reason `unresolved`. The rules run on the cluster's lead record (the chosen rewrite, else the first member) with the cluster's severity. Records that are pure twins (same normalised `after` as the chosen one) are members, never separate items. With `absolutesBlocking` on, kind `absolute` at S3 is treated as blocking for the essential section.

The rules are implemented once, in `tools/editorial-triage/triage-lib.jq`, which `build-triage.sh` loads through `lib/triage.jq`. The bucket is the axis the calibration sample draws across; the closing move itself comes from the grader.

`fix` means apply and show the diff, never apply unseen. Removals never reach `fix` under these rules; a later parameter may promote them once the veto rate on a removal sample is 0.

### Rank

Within a bucket: severity ascending (S1 first), then `reach.pages + reach.reviewers` descending, then basis strength, then `delta` ascending. The essential section takes clusters up to `essentialSeverityMax` (default S2; S3 absolutes join when `absolutesBlocking` is on), ordered by severity, then `author`, `propose`, `fix`, each in rank order, capped at `essentialCap` with one overflow line.

### `needs`

`reconcile` when any member kind is `contradiction` or the cluster has `related` links; `bearing` when bucket is `author` or the cluster's bearing is `tangential`; `verify` when bucket is `fix`; else `none`. A cluster may carry more than one, joined with `+`.


## Calibration files (`calibration/`)

Written by `grade-triage.sh` and the `GRADER` worker while the rubric in `grading-rubric.md` is being calibrated against the user's labels.

| File | Written by | Holds |
| --- | --- | --- |
| `round-<n>.json` | `sample` | `{round, seed, size, items[{n, cluster, category, page, line, severity, kind, basis, action, bearing, removes, point, defect, before, after, delta, question, owner, cites, members}]}`; clusters drawn without replacement across rounds, evenly over the `<bucket>/<reason>` categories |
| `round-<n>.md` | `sample` | the cards the user reads, one per item: point, defect, the text, and the closing moves the record supports with the default marked |
| `labels.json` | `label` | `{labels: {<cluster>: {round, n, move, side, note}}}`; move in R, C, W, K, O, I, T (remove, correct, reword, keep one side, record as open with an owner, ignore for now, tell me what to do); side A or B for K; a T carries its instruction as the note |
| `grades/<name>.json` | `GRADER` | `{gradedBy, mode: blind or seen, round, items[{cluster, move, side, span, confidence, heuristic, why}]}`; the grader never predicts T. `span` is optional and only for `R`: the whole sentence, bullet or paragraph to delete, verbatim from the page, which the plan uses in place of the record's span when the record names a fragment. A cluster graded in more than one file takes the later file by name, so a revision file named `revised-<page>.json` overrides the first pass |
| `agree-round-<n>.json` | `agree` | move agreement for the round, per category, a confusion table over the moves, side agreement for K, disagreements with both sides' reasons |
| `score.json` | `score` | run-level scores: counts by move, share closed without the user (R, C, W), load (K, O, T), share ignored, coverage, overall and per page; agreement where labels exist |

## Closing files (`closing/`)

Written by `grade-triage.sh plan` and `grade-triage.sh apply` once the moves are settled. The plan is the whole run in one file: one closing move per cluster, with the text that move needs.

| File | Written by | Holds |
| --- | --- | --- |
| `plan.json` | `plan` | `{run, clusters, counts, closedWithoutUser, leftToUser, ignored, sources, entries[], problems[]}` |
| `plan.md` | `plan` | the same plan to read: Apply, Decide, Open, Ignored, Problems, and a Spot check when `--sample` asked for one |
| `spot-check.json` | `plan --sample <n>` | `{seed, requested, size, of, items[{n, cluster, page, line, move, before, after}]}`, drawn from the apply entries with the hash `sample` uses |
| `applied.json` | `apply` | `{run, dryRun, moves, selected, pages[], entries[], summary}` |

One plan entry per cluster: `{cluster, page, path, line, move, side, before, after, span, sides, cites, defect, note, source, confidence}`. The move comes from `labels.json`, else from the later `grades/*.json` by name; a label wins over a grade and carries no confidence. `R` fills `span` with the removal span (the record's `removes` when that is a real span, else a rewrite whose `after` is empty, else the anchor quote) and leaves `after` empty. `C` and `W` fill `before` and `after` from the cluster's rewrite: the lead record's when that record holds a replacement, else the first member that does, because a lead record proposing a deletion carries an empty `after` and would otherwise hide a usable reword on a sibling record. `K` fills `side` with the surviving side, `sides` with both statements and `span` with the one that goes. `O` fills `note` with the open point and its owner. `T` fills `note` with the user's instruction. `I` fills nothing further. A cluster with no move (`ungraded`), a `C` or `W` whose record carries no rewrite (`no rewrite`), an `R` with no text to remove (`no span`) and a page-editing move on a cluster with no page file (`no page file`, the reason a set-wide cluster takes) go to `problems` with that reason.

`apply` takes the plan's `R`, `C` and `W` entries and edits them into the page files `manifest.json` names, page by page in descending line order. Each phrase is re-resolved in the page and applied only when it occurs exactly once, so a page that has moved on skips rather than guesses. Per entry, `status` is `applied`, `skipped-absent`, `skipped-multiple` or `gate-fail`; `gate-fail` means the edit was made and the page then failed the prose gate. `summary.applied` counts every edit made, `gate-fail` entries included.

