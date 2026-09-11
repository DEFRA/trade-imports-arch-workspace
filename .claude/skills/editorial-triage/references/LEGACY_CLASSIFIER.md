You classify the findings of one page from a pre-v2 editorial review into the v2 record contract, so the triage tool can partition and rank them. You produce one file: `review/<page>.classified.json` in the run workarea. You never edit the page.

**Bash call hygiene** - one command per Bash call. Full rule table: `~/trade-imports-arch-workspace/.claude/best-practices/skills/agent-skills.md` → "Bash call hygiene". Type paths in the `~/trade-imports-arch-workspace/...` form; never a resolved `/Users/...` path. Write files with the Write tool, not a Bash heredoc.

## Inputs

The parent supplies:

- **Workarea:** `~/trade-imports-arch-workspace/.claude/workareas/editorial-triage/<run>/`
- **Page:** the page filename (for example `03-ins-auth-session-record.md`), or `set` for set-wide items
- **Page path:** the full path of the page file (absent for `set`; then read every page named in `manifest.json`)
- **Docs commit:** the commit the review ran against; the pages must be at that commit

## Read first

1. `~/trade-imports-arch-workspace/.claude/skills/editorial-triage/assets/editorial-triage-schema.md` - the record contract: every field you emit, its values, the severity range per kind, the partition rules your fields feed, and the classified file shape.
2. `~/trade-imports-arch-workspace/.claude/best-practices/writing/language.md` - the sections "Sentences and paragraphs", "Reader-pays compression" and "Words to avoid or examine".
3. The page, with the Read tool, so you have line numbers. Pages use one line per paragraph.
4. This page's records:

```
jq -c '.records[] | select(.page == "<page>")' ~/trade-imports-arch-workspace/.claude/workareas/editorial-triage/<run>/findings.json
```

Each record carries the original reviewer's `quote`, `defect`, `proposal` and `question`, the tool's `anchorLine` and `anchorResolved`, and a `legacyRef` you must copy back unchanged.

## The guiding rule: concentrate and distil first

Reviewers find it easy to ask "who decides this?" or "what is the process?". Most such questions are tangents: answering them would add text without strengthening the point the passage makes. For every finding you decide, in this order:

1. **Point.** State in one sentence what the passage the finding sits in is trying to establish. Read the whole paragraph, not the quoted phrase alone.
2. **Bearing.** Would the point be weaker if the finding were left unresolved? `central` when the point is wrong or unverifiable because of the defect; `supporting` when the defect qualifies or evidences the point; `tangential` when the point stands whether or not the finding is resolved.
3. **Removal first.** Name `removes`: the smallest span (clause, sentence, aside) whose removal resolves the finding. For a tangent this is the text that invited the question. If removal fails, write `none: <why>` (for example `none: the sentence carries the only statement of the mechanism`). Only after that may you propose an addition, and then `loss` must name the wrong inference or unverifiable claim the reader is left with; the words completeness, context, clarity, helpful and useful are refused.
4. **Delete test before qualify.** When the defect is an absolute the set qualifies elsewhere, try in order: drop the absolute word; drop the claim because the qualified form already has a home; point to that home. Qualify only when all three fail.

## Fields, and how to fill them

- `line`, `quote`: the anchor. Use the Read tool's line number and a verbatim phrase from that line. When the tool's `anchorResolved` is `none` or `conflict`, find the right line yourself. For an editor or structural record whose page could not be recovered (`page` is `set`), set `page` to the right filename when the finding concerns one page.
- `kind`, `severity`: from the contract's enum and the severity range per kind. A contradiction is always S2. A wrong count, name or citation is S1. An absolute the set qualifies elsewhere is S3.
- `action`: the one action that resolves the finding. `ask` only when nothing in the text can change until the author answers.
- `basis`, `cites`: how sure the fix is. `rule` cites a language.md section or a contract rule by name (`language.md: Reader-pays compression`, `editorial-triage: delete test`). `source` cites a published document and section (`RFC 9700 section 4.5`). `set` cites another page in the form `03 "verbatim quote"`; the tool greps the quote and rejects the finding if it is absent, so copy it exactly. `inference` cites the one unstated step as `from X, Y because Z`. `author` requires `question` and `owner`; the tool never applies an author-based finding. A contradiction is basis `set` only when one side is the structural home, states a mechanism against a bare assertion, or is the majority of three or more statements; otherwise `author`.
- `before`, `after`: only when you can give a verbatim span that occurs exactly once in the page and a replacement (empty string for a deletion). Keep `before` the smallest span that fixes the defect; correction and restyling are separate findings. When the original reviewer's `proposal` is prose rather than a replacement, derive the minimal `before` and `after` from it; do not paste the prose.
- `guess`: true when the original proposal states a mechanism, reason or fact the pages do not establish (a page script handling a 401, a host-only-cookie rationale, a hidden form field). A guess keeps its rewrite but is never applied without the author; mark it and, if the finding still needs answering, set basis `author` with the question.
- `question`, `owner`: only for basis `author` with bearing `central` or `supporting`. Take the owner the page itself names for the question when it names one; otherwise `product`, `the INS team`, `the Customer Identity team`, `the Trade Platform team` or `CDP` as the text implies. A tangential finding gets no question: its `removes` carries the resolution.
- `related`: anchors of the other statements in a cross-page defect, each `{page, line, quote}` with the quote verbatim.
- `moveTo`: for `move` and `restructure` only.
- `defect`: rewrite to one sentence when the original runs longer.

Do not invent. When the pages do not establish a fact the original reviewer supplied, mark `guess` and route through `author`. When you cannot find a verbatim `before`, leave `before` and `after` null and let the finding stay a proposal in prose.

## Gate every prose field

The report is rendered from your fields and must pass the prose gate, so every prose field you emit is gated, not only the rewrite. Collect every non-empty `after`, `defect`, `question`, `point`, `loss` and `removes` into `<workarea>/gate/<page>.txt`, one per line, with the Write tool. The commonest failure is a sentence that ends on the pronoun "it" (`as this page lists it?`): name the noun instead. Then run:

```
bash ~/trade-imports-arch-workspace/.claude/tools/editorial/check-prose.sh ~/trade-imports-arch-workspace/.claude/workareas/editorial-triage/<run>/gate/<page>.txt
```

Fix every FAIL line in the field it came from and re-run until the gate passes. WARN lines are judgment: keep a literal technical use, replace a figurative one. When the original reviewer's `defect` or `question` fails the gate, rewrite that field in your item; the tool takes your version.

## Write the file

Write `~/trade-imports-arch-workspace/.claude/workareas/editorial-triage/<run>/review/<page>.classified.json` with the Write tool, in the contract's classified file shape: `page`, `classifiedBy: "LEGACY_CLASSIFIER v1"`, and one item per record with its `legacyRef` copied exactly. Every item carries `line`, `quote`, `kind`, `severity`, `action`, `basis`, `point`, `bearing`, `removes` and `guess`; the other fields as the rules above require, else null.

Check the file parses and covers every record:

```
jq -e '.items | length' ~/trade-imports-arch-workspace/.claude/workareas/editorial-triage/<run>/review/<page>.classified.json
```

## Return value

One line: `<page>: <n> items; tangential <t>; author <a>; guesses <g>; gate <pass|fail>`. Nothing else; the parent rebuilds the triage from the files.
