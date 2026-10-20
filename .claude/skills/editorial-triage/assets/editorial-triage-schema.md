# editorial-triage record contract and state shape

This file is the single home for the finding record, the triage state and the rules the helpers apply. The layered review's assembler, `tools/editorial/assemble-review.sh`, validates the reviewer-set fields before the build; `build-triage.sh` validates them and writes the state described here; the `CLAIM_VERIFIER` worker writes the verification files, which the build reads on a rebuild; `grade-triage.sh` reads that state and writes the calibration and closing files. This is contract version 3. Change this file first, then the helpers (`build-triage.sh`, `grade-triage.sh`, `lib/normalize-v2.jq`, `lib/triage.jq`, `triage-lib.jq`, `lib/grade.jq`), then the review validation in `assemble-review.sh`, then the field table in `review-brief.md` and the output shapes in `layer-cards.md`.

## Workarea layout

Canonical run directory: `~/trade-imports-arch-workspace/.claude/workareas/editorial-triage/<run>/` (gitignored task-local state).

| File | Written by | Holds |
| --- | --- | --- |
| `manifest.json` | build | run slug, source, docs commit, pages (each with `hash`, the page as the build found it), parameters, builder version, `mode` (`review` or `revise`), `intent` (`distil` or `clarify`), and `sourceHashes`: page filename to the SHA-256 of the page the review read, copied from the review result (or from `review/run.json` when building from a findings directory); a result without them does not build |
| `review.json` | build | the ingested review result, verbatim |
| `findings.json` | build | one normalised record per finding |
| `retains.json` | build | `{retains: [{page, line, quote, reason, reviewer}]}`: passages a reviewer considered and found adequate; shown in the review report and under Retained in `plan.md`; never clustered or graded |
| `triage.json` | build | clusters, buckets, ranks, summary |
| `index.json` | build | per page: cluster ids with `needs` |
| `held.json` | parent session, optional | items already parked with the user; tagged, never re-asked |
| `verification/` | CLAIM_VERIFIER | one file per page with a verdict on every nominated claim change |
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
| `kind` | enum | `fact`, `citation`, `contradiction`, `absolute`, `omission`, `ambiguity`, `term`, `reference`, `repetition`, `compression`, `flow`, `residue`, `presentation` | yes |
| `severity` | enum | `S1` wrong; `S2` contradiction; `S3` overreach; `S4` effort; `S5` preference | yes |
| `defect` | string | one sentence naming the defect and the question that exposed it | yes |
| `action` | enum | `correct`, `reconcile`, `delete`, `shorten`, `split`, `list`, `move`, `restructure`, `rename`, `expand`, `point`, `qualify`, `own`, `rewrite`, `ask` | yes |
| `basis` | enum | `rule`, `source`, `set`, `inference`, `author` | yes |
| `cites` | array of strings | rule name, source section, or `<page filename> "<verbatim quote>"` for basis `set`, the filename as `manifest.json` lists the page, and the build looks for the quote on that page alone; the one unstated step for `inference` | unless basis is `author` |
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
| `status` | enum | `broken`, `circular`, `unlocated`: how a cross-reference fails | kind `reference` |
| `guess` | boolean | true when the proposal states a mechanism or reason the set does not establish | yes |
| `inventory` | object | `{actors: [string], steps: [{actor, action, condition, quote}], existingDiagram: string or null}`; each `quote` is a verbatim sentence from the page; read by the plan's Presentation section | kind `presentation` |
| `introduced` | array of `{text, status, source}` | one entry per name, path, value, number or example in `after` that occurs in neither `before` nor the page; `status` is `supported`, with `source` a page anchor `<page filename> "<verbatim quote>"` that the build resolves on that page alone, or `unsupported`; a source in any other form (a rule name, free text) is recorded but does not support the item; an empty array when there is none; read by the build (`introducedCheck`) and the plan | with a non-empty `after` |
| `changes` | array of `{kind, original, revised}` | `kind` in `split`, `list`, `reword`, `move`, `merge`, `remove`; one entry for a pure split or list conversion; otherwise one per sentence changed, quoting both wordings, with `revised` empty for a removal; rendered by `plan.md` from the record a plan entry names | when a non-empty `after` differs from `before` in more than one sentence, or `action` is `split` or `list` |

Severity range per kind: `fact` S1 to S3; `citation` S1; `reference` S1, S3, S4; `contradiction` S2 only; `absolute` S3; `omission` S3 or S4; `ambiguity` S2 to S4; `term` S4 or S5; `repetition` S4 or S5; `compression` S3 or S4; `flow` S4 or S5; `residue` S4 or S5; `presentation` S4 or S5.

A `compression` finding is S3 when the reader cannot recover who acts and what the relation is without reading the sentence twice. It is S4 when the sentence reads once and the repair only improves cadence or economy. The distinction matters because partition rule 6 admits a growing rewrite up to `growSeverityMax` (default 3), and naming a hidden actor and a hidden relation usually costs words. Without the S3 grade, every repair for this defect grows the text, falls outside the cap and reaches the user as a proposal, while every shortening repair applies itself.

Basis as confidence: `rule`, `source` and `set` are high; `inference` is medium; `author` is low and never applied. A `contradiction` may carry basis `set` only when one side is the structural home, carries a mechanism against a bare assertion, or is the majority of three or more statements; otherwise basis is `author`.

`removes` is the concentrate-and-distil field. Every finding names the smallest whole unit whose deletion would resolve it, or states why that unit has to stay. A `none:` reason is required before any `after` longer than `before`. `loss` may not be one of: completeness, context, clarity, helpful, useful (the denylist).

State `loss` as what the reader has to do without the addition, for example rearrange the sentence to find the actor and the relation. The denylist matches the whole string, so a specific loss passes and only the bare word is rejected.

A `presentation` finding is an Open finding: a sequence or causal chain of stated interactions between named components, with their stated conditions, that a reader would follow more easily as a sequence, flow or state diagram, or prose that restates a diagram the page already has. It carries `basis: author`, a `question` and an `owner`, `removes: none: presentation`, and no `before` or `after`. Its `inventory` lists only what the page states; it is never a deletion and never an Apply item.

A `split` or `list` finding names the whole paragraph as `before` and gives the page-ready replacement, with real blank lines or list markers, as `after`; `removes` is `none: layout`. `loss` is not required when the build sets `layoutOnly` true.

### Tool-set fields

| Field | Values | Derivation |
| --- | --- | --- |
| `id` | `F-<KEY>-<seq>` | `KEY` is the page's leading digits (or `xx`), suffixed `a`, `b` and so on when more than one page in the run carries that number; `seq` is zero-padded per page in source order |
| `source` | `drill`, `editor`, `structural` | which reviewer produced it |
| `reviewer` | string | the reviewer label (`drill:<page>`, `structural:findings`, `structural:redundancies`, `editor:pages`, `editor:order`, `editor:patterns`) |
| `anchorLine` | integer or null | the line the anchor resolved to |
| `anchorResolved` | `reviewer`, `exact`, `stripped`, `span`, `prefix`, `line`, `none`, `conflict` | the ladder rung that resolved it; `line` when the reviewer gave a line but no quote matched anywhere (the line is trusted); `conflict` when the reviewer's line and the search disagree (the search wins) |
| `applicable` | `unique`, `multiple`, `missing`, `none` | whether `before` occurs exactly once in the page; `none` when no `before` |
| `gate` | `pass`, `fail`, `none` | check-prose result on `after`; for a `layoutOnly` record whose `before` is `unique`, on the whole page with `after` in place of `before`; `none` when no `after` |
| `delta` | integer | words in `after` minus words in `before` |
| `band` | `shrinks`, `neutral`, `grows`, `none` | `shrinks` below 0; `neutral` 0 to 3 words and at most 10%; `grows` otherwise; `none` when no `before` |
| `sourceHash` | string | the page's SHA-256 from the manifest's `sourceHashes`, never computed from the current page |
| `claimDiff` | object or null | `lib/claim-elements.jq` on every record with a `before`, including a deletion (`after` empty): `{added, removed, missingSentence, nominated}`; `added` and `removed` list `{class, term}` over quantifiers, modals, negations, connectives (`and` excepted), numbers and content words; `missingSentence` lists the `before` sentences fewer than half of whose adjacent word pairs survive in `after`; `nominated` is true when any list is non-empty or `after` is empty; null only when there is no `before` |
| `layoutOnly` | boolean | true only when `after` and `before` are the same text once top-level list markers (`- `, `* `, `1. `) are removed and every run of whitespace, including line breaks, is one space: every word, every word boundary and every punctuation mark survives in order. An indented (nested) marker is kept as a depth mark, so a nesting change is a text change; false otherwise |
| `candidateHash` | string or null | the identity of the rewrite candidate: SHA-256 of `before`, a NUL byte and `after`; null without `after`. A verdict is bound to this identity, so a change to the source span or the replacement makes the verdict stale |
| `removalHash` | string or null | the identity of the removal candidate: SHA-256 of `removes`, a NUL byte and the empty string; null when `removes` is `none:` |
| `removalShift` | `none`, `material`, `unresolved`, `missing`, `stale` or null | the verdict on deleting `removes`, for a record with its own removal candidate: a real `removes` that is not the record's own deletion (a rewrite record; a record with no rewrite; a deletion whose `removes` differs from `before`). Null when there is no real `removes`, or when the record is a deletion of exactly `removes`, whose verdict is `claimShift`. Set by the precedence under Verification files with `removalHash` in place of `candidateHash` |
| `removalNote` | string or null | the verifier's note on the removal |
| `claimShift` | `none`, `material`, `unresolved`, `missing`, `stale` | `none` when nothing was nominated; otherwise set from `verification/claims-<page>.json` by the precedence under Verification files: `stale` when the page has moved on or the verdict was made against another page or candidate, `missing` when no valid verdict exists, else the verdict. A stale or missing verdict holds the record; it never discards it |
| `claimShiftNote` | string or null | the verifier's quoted shift and reason; shown in the Decide section of `plan.md` |
| `introducedCheck` | `none`, `supported`, `held` | `none` when `introduced` is empty; `supported` when every item is `supported` with a page anchor whose quote the build finds in that page; `held` otherwise, so an `unsupported` item, a source that is not a page anchor and an anchor that does not resolve all hold the record |
| `cluster` | `C-<KEY>-<seq>` | the cluster the record joined; `KEY` as for `id` |
| `checks` | array of strings | validation failures (`severity-range`, `cites-missing`, `cites-not-found`, `loss-denylist`, `removes-missing`, `question-missing`, `inventory-missing`, `inventory-unquoted`, `introduced-missing`, `introduced-invalid`, `changes-missing`) |

### Anchor ladder

`build-triage.sh` resolves each record's anchor against its page in this order and records the rung: the reviewer's `line` when that line contains the quote, its stripped form or its 30-character prefix (`reviewer`); the quote found in the page (`exact`); the quote with quotes and backticks stripped (`stripped`); the longest double-quoted span inside the quote (`span`); the first 30 characters (`prefix`); a reviewer `line` with no match anywhere (`line`); otherwise `none`. When the reviewer's `line` and a search hit disagree, the search wins and the rung is `conflict`. A quote found more than once resolves to the first hit and sets `applicable: multiple` if it is also the `before`. A `before` that spans several lines resolves line by line and is `unique` only when every line resolves once, in order.

## Clusters (`triage.json`)

`triage.json` is `{"params": {...}, "clusters": [cluster, ...], "summary": {...}}`.

`summary.stale` counts the records the apply step will not be able to place: `spanAbsent` where the rewrite's `before` does not occur in the page, `spanAmbiguous` where it occurs more than once, and `anchorUnresolved` where no rung located the quote. These are anchor diagnostics: whether a page changed after the review read it is decided by its hash against `sourceHashes`, and the build names the pages whose hash differs. A `spanAbsent` count above a twentieth of the records on a page whose hash matches means the reviewer misquoted, and the build says so, because grading a record whose span has gone spends judgment on an edit that can only skip.

| Field | Meaning |
| --- | --- |
| `id` | `C-<KEY>-<seq>`, with `KEY` as for a record `id` |
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
| `intent` | the run's intent, from the manifest |
| `claimShift` | the worst across all members: `stale` > `missing` > `material` > `unresolved` > `none` |
| `layoutOnly` | of the chosen record |
| `introducedCheck` | the worst across all members: `held` > `supported` > `none` |
| `bucket` | `fix`, `propose`, `author`, `discard` |
| `reason` | the partition rule that placed it (`tangent`, `removal`, `author`, `restructure`, `dispersion`, `inference`, `grows`, `preference`, `verified`, `layout`, `no-rewrite`, `fallback`, `gate-fail`, `unresolved`, `stale`, `unverified`, `claim-shift`, `introduced`, `presentation`, or a validation check name) |
| `rank` | position within the bucket |
| `needs` | `reconcile`, `verify`, `verify-claims`, `bearing`, `none` |

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
8. `basis` `rule`, `source` or `set` with a rewrite that is applicable and passes the gate: `fix` (reason `verified`). A `split` or `list` record with `layoutOnly` true, `claimShift` `none`, `applicable` unique and the whole changed page passing the gate: `fix` (reason `layout`). Without a rewrite: `propose` (reason `no-rewrite`). Anything else: `propose` (reason `fallback`).

Before the rules, in this order: a record with `checks` non-empty is `discard` (reason is the first check); a record whose `gate` is `fail` is `propose` with reason `gate-fail`; a cluster whose `claimShift` is `stale`, `missing`, `material` or `unresolved` is `propose`, with reason `stale` for `stale`, `unverified` for `missing` and `claim-shift` for `material` or `unresolved`; a cluster whose `introducedCheck` is `held` is `propose` with reason `introduced`; a cluster of kind `presentation` is `author` with reason `presentation`; a record with `anchorResolved` `none` and no `before` is `propose` with reason `unresolved`. The rules run on the cluster's lead record (the chosen rewrite, else the first member) with the cluster's severity. Records that are pure twins (same normalised `after` as the chosen one) are members, never separate items. With `absolutesBlocking` on, kind `absolute` at S3 is treated as blocking for the essential section.

The rules are implemented once, in `tools/editorial-triage/triage-lib.jq`, which `build-triage.sh` loads through `lib/triage.jq`. The bucket is the axis the calibration sample draws across; the closing move itself comes from the grader. The plan enforces the Apply prohibition below on its own, because a label or a grade can select C or W regardless of bucket.

Removals never reach `fix` under these rules.

### Rank

Within a bucket: severity ascending (S1 first), then `reach.pages + reach.reviewers` descending, then basis strength, then `delta` ascending. The essential section takes clusters up to `essentialSeverityMax` (default S2; S3 absolutes join when `absolutesBlocking` is on), ordered by severity, then `author`, `propose`, `fix`, each in rank order, capped at `essentialCap` with one overflow line.

### `needs`

`reconcile` when any member kind is `contradiction` or the cluster has `related` links; `bearing` when bucket is `author` or the cluster's bearing is `tangential`; `verify` when bucket is `fix`; `verify-claims` when any member's `claimDiff` nominated a change and its `claimShift` is not `none`; else `none`. A cluster may carry more than one, joined with `+`.


## Verification files (`verification/`)

Written by the `CLAIM_VERIFIER` worker after the first build, one file per page whose current hash equals its `sourceHashes` entry and that has records with a nomination; the build reads the files on every build and sets `claimShift` and `claimShiftNote`. A worker never verifies against a page that has moved on: its records are `stale` until the review is re-run.

`claims-<page>.json` is `{page, sourceHash, verifiedBy, items: [{record, cluster, candidateHash, claimShift, note, shifts: [{element, before, after, judgment}], removal: {removalHash, claimShift, note, shifts}}]}`. An item has a rewrite part (`candidateHash`, `claimShift`, `note`, `shifts`), required when the record's `claimDiff.nominated` is true, and a removal part (`removal`), required when the record has its own removal candidate (`removalShift` not null); a missing required part leaves that candidate `missing`, and one part never clears the other. The verifier copies each candidate's identity (`candidateHash`, `removal.removalHash`) from the record it judged. `judgment` per element is `none` (no claim a reader could act on changes), `material` (a claim is added, removed, weakened or strengthened; for a deletion, a claim no surviving passage holds is lost, whether or not the record names the loss) or `unresolved` (the source admits more than one reading and the candidate picks one). The item's `claimShift` is the worst judgment, `material` > `unresolved` > `none`. `note` is one sentence, required when the verdict is not `none` (it names every element that is not `none`) and for every deletion (for a `none` deletion it cites the passage where the claim survives, or says the deleted text carries no usable claim); optional for a `none` rewrite. `cluster` is informational.

`shifts[].element` names one required element. For a rewrite (`after` non-empty): `added:<class>:<term>` and `removed:<class>:<term>` for each entry of the record's `claimDiff.added` and `claimDiff.removed`, and `sentence:<n>` for the n-th (zero-based) entry of `claimDiff.missingSentence`, with `before` the sentence. For a deletion (`after` empty): `sentence:<n>` for each non-blank sentence of `before` (split at `.`, `!`, `?`, `:` and `;`), computed from `before` and never from `claimDiff`, so a deletion with no listed element, or one made of digits, still has a sentence to judge. For a removal part: `sentence:<n>` for each non-blank sentence of `removes`, judged as a deletion, with a deletion's note rule. The item's elements are exactly the required set, each once: an element the record does not have, or one named twice, rejects the item. A nominated record with no required element (a blank `before`) is never verified.

The build checks each file and item and fails closed:

| Check | On failure |
| --- | --- |
| the file parses as an object | file ignored and reported; nominated records on the page stay `missing` |
| `sourceHash` equals `manifest.sourceHashes[page]` for the filename's page | file ignored and reported; nominated records on the page are `stale` |
| `page` equals the filename's page; `verifiedBy` is a non-empty string; `items` is an array | file ignored and reported; nominated records on the page stay `missing` |
| an item's `record` exists in `findings.json` on that page | item ignored and reported |
| the same `record` appears once in the file | both items ignored and reported; the record stays `missing` |
| `claimShift` and every `judgment` are `none`, `material` or `unresolved` | item ignored and reported; record stays `missing` |
| `shifts` is non-empty and its elements are exactly the record's required elements, each once | item ignored and reported; record stays `missing` |
| the item's `claimShift` equals the worst of its judgments | item ignored and reported; record stays `missing` |
| `note` is a non-empty string when the verdict is not `none` or the record is a deletion | item ignored and reported; record stays `missing` |
| the rewrite part's `candidateHash` equals the record's, and the removal part's `removalHash` equals the record's (each checked after its part is valid) | that candidate `stale` |

Precedence for a nominated record: the current page hash differs from `sourceHashes` → `stale`, and the page's file is not read; else the file is ignored for a wrong `sourceHash` → `stale`; else the file is ignored for any other reason, or there is no file, no item or an ignored item → `missing`; else the candidate's identity differs → `stale`; else the part's `claimShift`, with the note. The same precedence gives `removalShift` and `removalNote` from the removal part. A build with no `verification/` directory leaves every nominated rewrite and every own removal `missing`.

## Calibration files (`calibration/`)

Written by `grade-triage.sh` and the `GRADER` worker while the rubric in `grading-rubric.md` is being calibrated against the user's labels.

| File | Written by | Holds |
| --- | --- | --- |
| `round-<n>.json` | `sample` | `{round, seed, size, items[{n, cluster, category, page, line, severity, kind, basis, action, bearing, removes, point, defect, before, after, delta, question, owner, cites, members}]}`; clusters drawn without replacement across rounds, evenly over the `<bucket>/<reason>` categories |
| `round-<n>.md` | `sample` | the cards the user reads, one per item: point, defect, the text, and the closing moves the record supports with the default marked |
| `labels.json` | `label` | `{labels: {<cluster>: {round, n, move, side, note}}}`; move in R, C, W, K, O, I, T (remove, correct, reword, keep one side, record as open with an owner, ignore for now, tell me what to do); side A or B for K; a T carries its instruction as the note |
| `grades/<name>.json` | `GRADER` | `{gradedBy, mode: blind or seen, round, items[{cluster, move, side, span, confidence, heuristic, why}]}`; the grader never predicts T. `span` is optional and only for `R`: the whole sentence, bullet or paragraph to delete, verbatim from the page. The plan applies an `R` only on the record's own removal candidate, the one span with a verdict, so a `span` that differs from that candidate holds the entry; a grader who thinks the record names the wrong unit says so in `why`. A cluster graded in more than one file takes the later file by name, so a revision file named `revised-<page>.json` overrides the first pass |
| `agree-round-<n>.json` | `agree` | move agreement for the round, per category, a confusion table over the moves, side agreement for K, disagreements with both sides' reasons |
| `score.json` | `score` | `run: {mode, intent}` copied from `manifest.json`, so two scores compare only within one intent; then counts by move, `closedWithoutUser` (the share of grades predicting R, C or W among graded clusters: a process measure that consults neither the plan's eligibility nor applied edits), load (K, O, T), share ignored, coverage, overall and per page; `agreement` where labels exist, else null |

## Closing files (`closing/`)

Written by `grade-triage.sh plan` and `grade-triage.sh apply` once the moves are settled. The plan is the whole run in one file: one closing move per cluster, with the text that move needs.

| File | Written by | Holds |
| --- | --- | --- |
| `plan.json` | `plan` | `{run, clusters, counts, closedWithoutUser, leftToUser, decided, ignored, sources, retains, entries[], problems[]}`; `sources` counts the entries by `label`, `grade`, `held` and `presentation` |
| `plan.md` | `plan` | the same plan to read: Apply, Decide, Decided, Presentation, Open, Retained, Ignored, Problems, and a Spot check when `--sample` asked for one |
| `spot-check.json` | `plan --sample <n>` | `{seed, requested, size, of, items[{n, cluster, record, page, line, move, before, after, note}]}`, drawn from the apply entries with the hash `sample` uses; `note` is the verifier's note on a `material` removal |
| `applied.json` | `apply` | `{run, dryRun, moves, selected, pages[], entries[], trusted, summary}` |

One plan entry per cluster: `{cluster, record, page, path, line, move, side, before, after, span, sides, cites, defect, note, source, confidence, intent, action, claimShift, claimShiftNote, removalShift, removalNote, introducedCheck, layoutOnly, candidateHash, removalHash, inventory}`. `record` names the entry's *edit record*: the cluster's chosen record, or, for a `C` or `W` whose chosen record has no rewrite, the first member with one, because a lead record proposing a deletion carries an empty `after` and would otherwise hide a usable reword on a sibling. The plan renders that record's `changes`, `introduced` and verdict notes and copies its verdict fields into the entry. The move comes from `labels.json`, else from the later `grades/*.json` by name; a label wins over a grade and carries no confidence.

A cluster whose `kinds` holds `presentation`, or any of whose members is a `presentation` record, is `O` with `source` `presentation` before any label or grade is read, with the question, owner and `inventory` of the presentation member; it is never an Apply entry.

A page-editing move applies only on a verdict about the exact edit it makes:

- `R`: the edit record's removal candidate is its `removes` when that is a real span, else its deletion (`before` with an empty `after`); the entry's `span` is that candidate unchanged, and `removalHash` its identity (`removalHash`, or the aliased `candidateHash` for a deletion with no own span). The verdict is `removalShift`, or the rewrite's `claimShift` when the removal is the rewrite. The move applies on `none`, or on `material` with a note (Q10, the note shown beside the line); `missing`, `unresolved` and `stale` hold it, and a label or grade `span` that is not the candidate has no verdict and is held.
- `C` or `W`: `before`, `after` and `candidateHash` come from the edit record; the move applies when its `claimShift` is `none` and `introducedCheck` is not `held`. When `after` spans lines it applies only when the record is `layoutOnly` with `gate` `pass`, or has an explicit `claimDiff.nominated` of `false` with `gate` `pass`, or is nominated and verified `none` (Q11).

Anything else a label or grade asked to apply becomes `T` with `source` `held` and a note naming the move, its source and the state that stops it, so it appears under Decide. `K` fills `side` with the surviving side, `sides` with both statements and `span` with the one that goes. `O` fills `note` with the open point and its owner. `T` fills `note` with the user's instruction. `I` fills nothing further. A cluster with no move (`ungraded`), a page-editing move on a cluster with no page file (`no page file`, the reason a set-wide cluster takes) and a `C` or `W` whose record carries no rewrite (`no rewrite`) go to `problems` with that reason, before the verdict is read.

`apply` refuses, under every flag, a run whose `mode` is `review`: such a run ends with findings, retains and questions, no page is edited, and the review is re-run in `revise` mode to apply. Otherwise `apply` takes the plan's `R`, `C` and `W` entries and edits them into the page files `manifest.json` names, page by page in descending line order. Before any page is written, under every flag, each entry is re-checked against the run and the page as they stand now, in this order: the cluster exists and neither its `kinds` nor its members show `presentation` (`skipped-held`); the edit record is still a member and still proposes the entry's edit, for a `C` or `W` its `before`, `after` and `candidateHash`, for an `R` its removal candidate's span and hash (`skipped-changed`, naming the field); the verdict still licenses the move as above (`skipped-unverified` for `missing`, `skipped-stale` for `stale`, `skipped-held` for the rest); the page's current hash equals `sourceHashes[page]` or the trusted hash below (`skipped-stale`). Only then is the phrase re-resolved in the page and applied when it occurs exactly once (`skipped-absent`, `skipped-multiple`), as a whole unit for an `R` (`skipped-fragment`), and not already applied (`skipped-applied`). After the re-check, an `R` still going to apply on a `material` verdict makes `--no-spot-check` a refusal that names the entry: the user reads the note in the spot check first. Per entry, `status` is `applied`, one of the skips, or `gate-fail`, which means the edit was made and the page then failed the prose gate. `summary` holds `selected`, `applied` (every edit made, `gate-fail` included), `skipped`, `gateFail` and `byStatus`.

`trusted` maps a page to `{sourceHash, hashAfter}` for every page apply wrote on a real run: `sourceHash` is the manifest's entry the page was checked against and `hashAfter` the SHA-256 of the file as written, read back after the move into place. A dry run, a skipped entry and an unchanged page record nothing. A trusted hash is kept and used only while its `sourceHash` equals the manifest's current entry for the page, so a fresh review never inherits the hash. Re-applying an applied plan applies nothing and leaves every page byte-identical.
