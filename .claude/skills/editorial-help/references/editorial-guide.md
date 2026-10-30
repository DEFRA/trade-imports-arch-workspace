# Editorial Tools Guide

The editorial estate writes, reviews, corrects and checks technical documents in one voice. The voice is one document, `best-practices/writing/language.md`. A rule loads a digest of that document into every session that touches prose, scripts apply its mechanical part for free, and model-driven tools do the reading at a cost. This guide says how the voice is maintained, how it reaches a writer, which checks run where, which tool fits a situation, what each run costs, and which file to change to customise each tool. It works without Claude Code: every command below runs from a shell or from any agent.

## The Three Modes

| Mode | Steps | Mechanism | Cost |
| --- | --- | --- | --- |
| Authoring | A writer drafts in the voice. The rule `rules/authoring-voice.md` is in context as a drafting procedure, `language.md` is read in full before a whole document, and the write-time check feeds back the FAIL lines each write introduces. No skill is invoked. | the rule, `language.md`, the write-time check | free |
| Reviewing | A finished draft is read cold. `/editorial` runs the review path on one page or a short artefact, and the layered review reads a document set page by page and as a set. Findings, retains and questions for the author come back. | the `editorial` skill and `start-layered-review.sh` | session tokens for one page, about $2.80 for a 3-page set |
| Triage | Review findings are closed: each is graded to one move, the batch is spot-checked with the author, and the removals, corrections and rewordings are applied as a diff. | the `editorial-triage` skill | about $2 for 1 page and $4 for 3 pages |

The design-consistency check sits beside the three modes: it finds statements across pages that cannot all hold, and never edits a page.

## Voice Maintenance

- `language.md` is the single canonical document. It holds the register (formal, explanatory and deliberate), the judgement rules no script can check, the word table and the shape rules `check-prose.sh` implements. The rule digest and the review tools cite its sections, so a rule changes in one place.
- A word enters the table only after a dry run. `tier-candidates.sh <table> --threshold 40 <root>...` counts a candidate table's rows over every tracked markdown file under each root and tiers them: no hits and no literal use is FAIL, a literal use or up to 40 hits is WARN, and more than that is guidance, listed in `language.md` and not checked. The Gate cell may read `FAIL`, `WARN`, `FAIL docs` or `WARN docs`, and a `docs` row is skipped for instructions written for an AI agent (files under `.claude/` and the `CLAUDE.md` and `AGENTS.md` files), because those may address the agent as "you".
- The rule is a digest, never a second authority. Every section name it quotes must be a heading in `language.md`, `document-types.md` or `voice-examples.md`, which `lint-skills.sh` checks at commit, and its body stays between 40 and 60 lines.
- A rule that holds only for one document set goes in that set's `editorial-profile.md`, never in `language.md`.

## Voice Loading

The frontmatter of `rules/authoring-voice.md` lists the folders the voice applies to. Claude Code loads the rule on the first Read, Write or Edit of a file matching that list, once per session. The matching uses the real checkout path, so the owner-wired hook `hooks/realpath-file-tools.sh` rewrites a path typed through the `~/trade-imports-arch-workspace` symlink before a file tool runs. A subagent receives the rule the same way, and a brief for a subagent that drafts prose still names the rule, so the voice is in context before its first write. Any agent outside Claude Code reads the rule and `language.md` before drafting. A brand-new file's first draft is written before the voice arrives unless a page was read first, which is why the rule's first step is to read the set's profile and one neighbouring page.

## The Deterministic Checks

| Check | Runs on | Scope | On a FAIL |
| --- | --- | --- | --- |
| Write-time check, `hook-check-written.sh --scope` | every Write or Edit in a Claude Code session, wired in `settings.json` | files matching the rule's `paths` list, outside its `gate-exclude` list, tracked in their own repository; the editorial and pr skills run the same script with `--outside-scope` for drafts elsewhere | the FAIL lines the write introduced come back as feedback; nothing is blocked. In an editorial session the Stop hook blocks the turn while such a line remains |
| Pre-commit, `.githooks/pre-commit` | every commit in the workspace repository | every staged markdown file, whole, with no baseline | the commit is refused until the lines are fixed |
| Commit-message gate | every commit message in the workspace repository | the message | the commit is refused |
| `create-pr.sh` | every pull request created through the pr skill | the title and body | the request is refused |
| `check-prose.sh <file>...` by hand | on demand | any file | the lines and their rules are printed |

`language.md` is excluded from nothing: a change to the guide passes the same checks as any page. The docs repository's own commit hooks run no prose check, so a page written from a workspace session is checked at write time and a page committed elsewhere is checked by hand.

## Choosing a Tool

| Situation | Tool | Start | Cost | Next |
| --- | --- | --- | --- | --- |
| Any prose to draft | the authoring voice | nothing: the rule loads with the first file read or written; for a whole document, read `language.md` in full first | free | fix the FAIL lines the write-time check reports, then `/editorial` when the draft is ready for review |
| A document to write under a guided pass | `editorial`, writing path | `/editorial` with the reader and the document's purpose | session tokens, not measured | the review path, then a whole-document review |
| One page or a short artefact to tidy (a PR body, a ticket, a README) | `editorial`, review path | `/editorial` with mode `revise` and intent `clarify` or `distil` | session tokens, not measured | read the diff the session leaves |
| A document set to review in full | names check, then the layered review | `start-layered-review.sh --run-id <set>-<date> --profile <editorial-profile.md> <page>...`, then the loader the editorial skill starts | about $2.80 for 3 pages of 4,000 words | triage the findings |
| Review findings to close | `editorial-triage` | "triage the review" | about $2 for 1 page and $4 for 3 pages, to the spot check | spot check, apply, then re-review the changes |
| Edits applied since a review | the layered review, changes only | the start command with `--since <earlier run id> --settled <its triage workarea>` | about $2.20 for 3 pages | triage the new findings |
| Pages that may contradict each other | `design-consistency` | "check design consistency" on the pages | about $6.50 for 4 pages, three quarters of it fact extraction; an unchanged page reuses its facts | `/decide` on the contradictions |
| Banned words, punctuation, heading case, FAQ voice | the prose check | `check-prose.sh <file>...` | free | fix every FAIL line; judge each WARN |
| A word the writer keeps producing | the tiering tool | `tier-candidates.sh <candidates.md> --threshold 40 <root>...` | free | add the row to `language.md` at the tier the count gives |
| Old names for one concept | the names check | `check-names.sh --profile <editorial-profile.md> [--fix] <page>...` | free | read the diff `--fix` leaves |
| Open questions waiting on the author | `/decide` | `/decide` | session tokens, not measured | the answers land in the work's records |

The scripts live in `~/trade-imports-arch-workspace/.claude/tools/editorial/`. Costs are at API prices, measured on the INS Auth session pages between 15 and 20 October 2026; on a subscription they come out of the usage limit instead.

### Starting an Editorial Pass

An editorial pass needs a short brief; without one the session has to guess the reader, and the reader decides the structure. Give seven inputs:

1. **Reader:** who reads the document and what they must know or do after reading.
2. **Tone:** the house voice by default, formal, explanatory and deliberate; a plain register only for readers outside the specialism.
3. **Mode:** `revise` to change the text, `review` for findings only.
4. **Intent:** `clarify` for clarity, structure, tone or sentences, keeping every claim; `distil` to cut noise.
5. **Form:** the document's kind or fixed format, such as a PR body with Change, Reason and Verification.
6. **Restructuring:** allowed or not.
7. **Keep:** the facts the edit must not lose, such as numbers, results and commands.

A document set's profile supplies the reader, mode and intent, so a run on that set needs only the rest. `/editorial-help` drafts the whole brief from a sentence about what is wrong, and asks about the audience, the tone and the scope of the edit with a default for each.

### Order of a Full Pass

A full pass on a document set runs in this order: the names check, the layered review, triage, apply, then a re-review of the changes. The design-consistency check is separate: run it when design statements change, not after every edit.

## Customising the Tools

Every change belongs at one of three levels. A rule that holds for any document belongs to the workspace; a rule that holds only for one document set belongs in that set's profile; anything for a single run is said when the run starts.

### Workspace Rules

| Change | File | Takes effect |
| --- | --- | --- |
| Ban or flag a word or phrase in every document | run `tier-candidates.sh` over the tracked pages first, then add a row to `best-practices/writing/language.md`, "Words to avoid or examine", with the forms in backticks, a repair and the tier the count gives (`FAIL`, `WARN`, or the same with `docs` for human documents only) | the next prose check, in every hook and commit that runs it |
| A writing rule | `best-practices/writing/language.md`, the section the rule belongs to; the rule digest cites that section by its heading, so a renamed heading changes the digest too | writers and reviewers read the rule; only a rule the prose check implements is enforced |
| The folders the voice loads into and the write-time check covers | `rules/authoring-voice.md`, frontmatter: one quoted glob per line under `paths`, and under `gate-exclude` the folders the check skips | the next session for the voice; the next write for the check |
| The drafting procedure itself | `rules/authoring-voice.md`, body: 40 to 60 lines, every quoted section name a heading in `language.md`, `document-types.md` or `voice-examples.md` | the next session |
| A term never to flag or expand | `best-practices/writing/ubiquitous-language.md`, the register | every review |
| The checks each review pass makes | `skills/editorial/references/layer-cards.md` (paragraph, page and set passes) and `review-brief.md` (finding kinds and fields) | the next review |
| The rules for closing a finding | `skills/editorial-triage/assets/grading-rubric.md`, or the triage skill's Calibrate mode, which rebuilds the rubric from the author's own closing decisions | the next triage |
| The definitions of a fact and a contradiction | `skills/design-consistency/references/FACT_EXTRACTOR.md` and `CONSISTENCY_CHECKER.md` | the next consistency check |

All paths are under `~/trade-imports-arch-workspace/.claude/`. Workspace files are versioned, so a change goes through a commit, and `lint-skills.sh` refuses a rule frontmatter whose shape Claude Code could misread.

### Document Set Profile

A document set keeps its own settings in `editorial-profile.md` beside its pages. Every section is optional:

| Section | Holds | Consumer |
| --- | --- | --- |
| Reader | the reader frame: who reads the set and what they already know | the review packet, and the authoring rule's first step |
| Defaults | mode, intent and document mode | the review packet |
| Context Pages | pages the reviewers read but do not review | the layered review |
| Run Notes | notes every reviewer receives, such as terms or values already accepted | the review packet |
| Preferred Names | the preferred name, its plural and the replaced forms in backticks | the names check, which the review runs first |
| Words to avoid or examine | the same table as `language.md`, for this set only, the `docs` scope included | the prose check, for every page in or below the profile's folder |

The format is in the header of `tools/editorial/read-profile.sh`, and `trade-imports-documentation/.../INS Auth/editorial-profile.md` is a full example. A profile is not documentation, so exclude it from publishing: the docs site config lists `!**/editorial-profile.md`, and each Confluence publish entry that globs the folder needs `"exclude": ["editorial-profile.md"]`.

### One Run

When a run starts, say anything that applies only to that run: a different reader, mode or intent, or an extra run note. The run's own instructions win over the profile, and the profile wins over nothing.

## Worked Examples

- **Stop a phrase in every document.** Put the phrase in a candidate table and run `tier-candidates.sh` over the docs pages and the workspace. Add the row to the "Words to avoid or examine" table in `language.md` at the tier the count gives. The next prose check fails or warns on the phrase and prints the row's repair with the words that matched.
- **Stop a phrase in one document set.** Add the same row to a "Words to avoid or examine" table in that set's `editorial-profile.md`. Only pages in or below the profile's folder are checked against the row.
- **Bring a new folder of prose under the voice.** Add one quoted glob under `paths` in `rules/authoring-voice.md`. The voice loads there from the next session, and the write-time check covers its tracked files from the next write. To keep the check out while the voice stays, add the folder under `gate-exclude` as well.
- **Rename a term across a document set.** Add a Preferred Names row to the profile, then run `check-names.sh --profile <profile> --fix` on the pages and on any Mermaid sources, and read the diff. The check reads text files; a hand-drawn SVG needs its own edit.
- **Scan many documents for banned terms.** Run `check-prose.sh` over the files, for example with `find <folder> -name '*.md' -exec bash ~/trade-imports-arch-workspace/.claude/tools/editorial/check-prose.sh {} +`. The check costs nothing and changes nothing.
- **Find contradictions across a design.** Run `design-consistency` on the pages that are meant to agree, not on every document. Each contradiction comes back as a question with both quotes; the tool never edits a page.

## Limits

- The write-time check reports and cannot block, and it excuses FAIL lines already present at the file's committed version. The pre-commit checks the whole staged file, so a page that held a banned word before the row existed blocks its next commit until the word is reworded: the cost of a new FAIL row is paid as each file is next touched.
- A commit in another repository, such as the docs repository, runs no prose check: run the check by hand before committing there.
- The names check and the prose check read markdown and other text files, not images.
- The costs above come from a handful of runs on one document set. A longer page or a larger set costs more, roughly in proportion to the words read.
