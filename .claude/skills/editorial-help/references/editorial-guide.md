# Editorial Tools Guide

The editorial tools review, correct and check technical documents in the workspace voice. Scripts do the mechanical checks for free; model-driven tools do the reading, at a cost. This guide says which tool fits a situation, what each run costs, and which file to change to customise each tool. It works without Claude Code: every command below runs from a shell or from any agent.

## Choosing a Tool

| Situation | Tool | Start | Cost | Next |
| --- | --- | --- | --- | --- |
| A document still to be written | `editorial`, writing path | `/editorial` with the reader and the document's purpose | session tokens, not measured | the review path, then a whole-document review |
| One page or a short artefact to tidy (a PR body, a ticket, a README) | `editorial`, review path | `/editorial` with mode `revise` and intent `clarify` or `distil` | session tokens, not measured | read the diff the session leaves |
| A document set to review in full | names check, then the layered review | `start-layered-review.sh --run-id <set>-<date> --profile <editorial-profile.md> <page>...`, then the loader the editorial skill starts | about $2.80 for 3 pages of 4,000 words | triage the findings |
| Review findings to close | `editorial-triage` | "triage the review" | about $2 for 1 page and $4 for 3 pages, to the spot check | spot check, apply, then re-review the changes |
| Edits applied since a review | the layered review, changes only | the start command with `--since <earlier run id> --settled <its triage workarea>` | about $2.20 for 3 pages | triage the new findings |
| Pages that may contradict each other | `design-consistency` | "check design consistency" on the pages | about $6.50 for 4 pages, three quarters of it fact extraction; an unchanged page reuses its facts | `/decide` on the contradictions |
| Banned words, punctuation, heading case, FAQ voice | the prose check | `check-prose.sh <file>...` | free | fix every FAIL line; judge each WARN |
| Old names for one concept | the names check | `check-names.sh --profile <editorial-profile.md> [--fix] <page>...` | free | read the diff `--fix` leaves |
| Open questions waiting on the author | `/decide` | `/decide` | session tokens, not measured | the answers land in the work's records |

The scripts live in `~/trade-imports-arch-workspace/.claude/tools/editorial/`. Costs are at API prices, measured on the INS Auth session pages between 15 and 20 October 2026; on a subscription they come out of the usage limit instead.

A full pass on a document set runs in this order: the names check, the layered review, triage, apply, then a re-review of the changes. The design-consistency check is separate: run it when design statements change, not after every edit.

## Customising the Tools

Every change belongs at one of three levels. A rule that holds for any document belongs to the workspace; a rule that holds only for one document set belongs in that set's profile; anything for a single run is said when the run starts.

### Workspace Rules

| Change | File | Takes effect |
| --- | --- | --- |
| Ban or flag a word or phrase in every document | `best-practices/writing/language.md`, "Words to avoid or examine": add a row with the forms in backticks, a repair and FAIL or WARN | the next prose check, in every hook and commit that runs it |
| A writing rule | `best-practices/writing/language.md`, the section the rule belongs to | writers and reviewers read the rule; only a rule the prose check implements is enforced |
| A term never to flag or expand | `best-practices/writing/ubiquitous-language.md`, the register | every review |
| The checks each review pass makes | `skills/editorial/references/layer-cards.md` (paragraph, page and set passes) and `review-brief.md` (finding kinds and fields) | the next review |
| The rules for closing a finding | `skills/editorial-triage/assets/grading-rubric.md`, or the triage skill's Calibrate mode, which rebuilds the rubric from your own closing decisions | the next triage |
| The definitions of a fact and a contradiction | `skills/design-consistency/references/FACT_EXTRACTOR.md` and `CONSISTENCY_CHECKER.md` | the next consistency check |

All paths are under `~/trade-imports-arch-workspace/.claude/`. Workspace files are versioned, so a change goes through a commit.

### Document Set Profile

A document set keeps its own settings in `editorial-profile.md` beside its pages. Every section is optional:

| Section | Holds | Consumer |
| --- | --- | --- |
| Reader | the reader frame: who reads the set and what they already know | the review packet |
| Defaults | mode, intent and document mode | the review packet |
| Context Pages | pages the reviewers read but do not review | the layered review |
| Run Notes | notes every reviewer receives, such as terms or values already accepted | the review packet |
| Preferred Names | the preferred name, its plural and the replaced forms in backticks | the names check, which the review runs first |
| Words to avoid or examine | the same table as `language.md`, for this set only | the prose check, for every page in or below the profile's folder |

The format is in the header of `tools/editorial/read-profile.sh`, and `trade-imports-documentation/.../INS Auth/editorial-profile.md` is a full example. A profile is not documentation, so exclude it from publishing: the docs site config lists `!**/editorial-profile.md`, and each Confluence publish entry that globs the folder needs `"exclude": ["editorial-profile.md"]`.

### One Run

When a run starts, say anything that applies only to that run: a different reader, mode or intent, or an extra run note. The run's own instructions win over the profile, and the profile wins over nothing.

## Worked Examples

- **Stop a phrase in every document.** Add a row to the "Words to avoid or examine" table in `language.md`, with Gate FAIL. The next prose check fails on the phrase and prints the row's repair.
- **Stop a phrase in one document set.** Add the same row to a "Words to avoid or examine" table in that set's `editorial-profile.md`. Only pages in or below the profile's folder are checked against the row.
- **Rename a term across a document set.** Add a Preferred Names row to the profile, then run `check-names.sh --profile <profile> --fix` on the pages and on any Mermaid sources, and read the diff. The check reads text files; a hand-drawn SVG needs its own edit.
- **Scan many documents for banned terms.** Run `check-prose.sh` over the files, for example with `find <folder> -name '*.md' -exec bash ~/trade-imports-arch-workspace/.claude/tools/editorial/check-prose.sh {} +`. The check costs nothing and changes nothing.
- **Find contradictions across a design.** Run `design-consistency` on the pages that are meant to agree, not on every document. Each contradiction comes back as a question with both quotes; the tool never edits a page.

## Limits

- The prose check runs by itself only inside the editorial and pr skills and on commits in the workspace repository. A commit in another repository, such as the docs repository, runs no prose check: run the check yourself before committing.
- The names check and the prose check read markdown and other text files, not images.
- The costs above come from a handful of runs on one document set. A longer page or a larger set costs more, roughly in proportion to the words read.
