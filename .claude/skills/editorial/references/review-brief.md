# Review brief

This document is the single instruction set for the reviewers used by the `editorial-review` workflow. The spawn prompt supplies the reader frame, the output mode (`review` or `revise`), the review intent (`distil` or `clarify`), the document mode, the run notes and the scratch file for the gate. Apply that frame to every finding.

## Before reviewing

Read these sources, then read every document under review in full before examining the assigned unit:

1. `~/trade-imports-arch-workspace/.claude/best-practices/writing/language.md`
2. `~/trade-imports-arch-workspace/.claude/best-practices/writing/ubiquitous-language.md`
3. `~/trade-imports-arch-workspace/.claude/best-practices/writing/snapshot-authoring.md`
4. `~/trade-imports-arch-workspace/.claude/skills/editorial/references/document-types.md`
5. `~/trade-imports-arch-workspace/.claude/skills/editorial-triage/assets/editorial-triage-schema.md`, section "Reviewer-set fields": the values every field takes and the severity range per kind

## Rules for every reviewer

- Return findings and the selected retains defined under "The retain record". Do not edit files.
- Close, do not open. A finding names the change that resolves the defect; a question on its own is not a finding. When the passage's point depends on a fact the set does not hold, the finding carries the question and its owner, and still names the span that goes while the question stays open. The one finding that names no span and no rewrite is `presentation`: its `removes` is `none: presentation`, and its inventory is the whole of what it carries.
- Try removal first, always, and removal means a whole unit. Every finding names `removes`: the smallest whole sentence, bullet, table row, paragraph or complete parenthetical aside whose deletion resolves the defect, or `none:` with the reason that unit has to stay. Never name a fragment inside a sentence that survives: cutting a span mid-sentence leaves a bare noun, a stranded subject or a broken line. When the sentence has to stay, the finding carries `before` and `after` rewording that sentence so the defective part is gone. Under `clarify`, a rewrite that grows the text is allowed in 2 cases: the passage promises a missing part and the set supplies that part, or the reader has to rearrange the shorter text to find who acts and what the relation is. Both cases carry `loss`, which says what the addition makes clear.
- Write every reword with explain and rewrite, steps 1 to 3 (`~/trade-imports-arch-workspace/.claude/skills/editorial/references/explain-and-rewrite.md`). Explain the sentence's meaning in plain words, compare the explanation with the claims the source holds, and write `after` from the supported part. Repeat on each sentence of `after` that still fails `language.md`, "Sentences and paragraphs". A part of the meaning you cannot explain without a guess is a question for the author, not a rewrite.
- Removing a whole unit and compressing a unit that stays are different moves. Removal is always available. Compression is never a closing move, so where the defect is compression the reword names the actor and the relation, and under `clarify` may run longer only as the second of the two cases above, with `loss`.
- The review intent binds every rewrite; the policy is `language.md`, "Just Enough". Under `distil`, each paragraph ends no longer than its source. A reword that unpacks a sentence may grow that sentence only when `delete` findings in the same paragraph remove at least as many words. A defect whose only repair would grow the paragraph is reported with its unit in `removes` and no rewrite, so the triage puts the repair to the user. Under `clarify`, a claim you cannot recover from the text is a question (basis `author`) and never a rewrite, and noise may still go as a whole unit through a `delete` finding, so an intentional removal is always a finding of its own and a rewrite never drops a claim silently.
- Provenance. With a non-empty `after`, `introduced` lists one entry per name, path, value, number or example in `after` that is in neither `before` nor the page. An entry is `supported` only with a page anchor, `<page filename> "<verbatim quote>"`, that the build finds on that page; otherwise the entry is `unsupported`. An empty array says there is none, and is required.
- The change record. When `after` differs from `before` in more than one sentence, or the action is `split` or `list`, `changes` records the edit: one entry for a pure split or list conversion, else one per sentence changed, quoting both wordings, with `revised` empty for a removal.
- Report a finding only when the change would make the text easier for the named reader to understand or verify. Do not rewrite for preference or synonym choice.
- Correctness against the world is out of scope. Do not check an RFC section, a vendor's documented behaviour or a platform fact; a separate process does that. Report a contradiction only between the set's own statements, as two sides.
- A judgement standing in for a fact ("cheap", "easy", "safe", "simple", "straightforward") is a defect. The closing move removes the judgement; a qualification is never the move.
- A mechanism the design has not decided is not described. Where the text describes one, the finding cuts the detail and keeps only the statement that the design must handle the consideration.
- Pointers and cross-references go by default. A finding about a pointer proposes removal, not repair, unless the reader could not find the reason behind a rule without the pointer. A one-line fact may be restated in the pointer's place.
- The document's own tallies (how many families, rows, updates or decisions) are removed, not corrected.
- A missing explanation is first a suspect claim. Before asking for the explanation, ask whether the passage should make the claim at all. A second justification for a decision the passage already justifies goes.
- Reviewers are not co-authors. Do not compose a mechanism, reason or fact the pages do not state. When a proposal supplies one anyway, set `guess` to true; the triage never applies a guess.
- Treat tokens in the ubiquitous-language register as proper nouns. Do not expand them unless the run notes ask for the recorded expansion. Never guess an expansion.
- Honour the run notes. Recently agreed text still needs a genuine defect before it becomes a finding.
- Report one defect once, under the most specific kind.
- Treat revision narrative, resolution logs, version histories and dated annotations as `residue`. System or domain history may stay when it explains the current design.
- Do not flag banned wording or punctuation when it appears only as an exemplar inside inline code, fenced code, blockquotes or URLs. Review those examples for accuracy and usefulness when they are in scope. Ordinary quotation marks do not suppress the gate. YAML frontmatter is configuration rather than body prose.

## The finding

Every reviewer returns findings in one form. The contract names the values; this table says what each field is for.

| Field | Content |
| --- | --- |
| `page` | the page filename, for example `03-ins-auth-session-record.md` |
| `line` | the line number from the Read tool, or null when unknown; pages use one line per paragraph |
| `quote` | a verbatim phrase from that line that anchors the finding |
| `kind` | `fact`, `citation`, `contradiction`, `absolute`, `omission`, `ambiguity`, `term`, `reference`, `repetition`, `compression`, `flow`, `residue` or `presentation` |
| `severity` | `S1` wrong, `S2` contradiction, `S3` overreach, `S4` effort, `S5` preference; the contract gives the range per kind |
| `defect` | one sentence naming the defect and the question that exposed the defect |
| `point` | one sentence naming what the passage is trying to establish, from the whole paragraph, not the quoted phrase alone |
| `bearing` | `central` when the point is wrong or unverifiable because of the defect; `supporting` when the defect qualifies or evidences the point; `tangential` when the point stands whether or not the finding is resolved |
| `removes` | the smallest whole unit (sentence, bullet, table row, paragraph) or complete parenthetical aside, verbatim, whose deletion resolves the finding, or `none: <why the unit has to stay>`. Never a fragment inside a surviving sentence |
| `action` | the one action that resolves the finding: `delete`, `shorten`, `correct`, `reconcile`, `rewrite`, `rename`, `split`, `list`, `move`, `restructure`, `expand`, `point`, `qualify`, `own` or `ask` |
| `basis` | `rule` for a named `language.md` or `document-types.md` section; `set` for another statement in the set; `inference` for one unstated step from the set; `author` when the set does not hold the fact. `source` is reserved for a published document the run notes name |
| `cites` | what the basis rests on: the rule name; `<page filename> "<verbatim quote>"` for `set`, the filename as the run lists the page (the triage looks for the quote on that page alone and rejects the finding when the quote is absent from it); the one step for `inference`. Required unless the basis is `author` |
| `before`, `after` | only when a rewrite is offered: `before` verbatim and occurring exactly once in the page, `after` the replacement, empty for a deletion; the smallest span that fixes the defect. A `split` or `list` finding names the whole paragraph as `before` and gives the page-ready replacement, with real blank lines or list markers, as `after`, with `removes` `none: layout` |
| `loss` | required when `after` is longer than `before`, in one of 2 forms: the wrong inference or unverifiable claim the reader is left with without the addition; or what the reader has to do without the addition, such as rearrange the sentence to find the actor and the relation. Never the bare words completeness, context, clarity, helpful or useful |
| `question`, `owner` | only when the basis is `author` and the passage's point depends on the answer: the precise question and who answers |
| `related` | anchors `{page, line, quote}` of the other statements in a cross-page defect; for a contradiction, the other side |
| `moveTo` | the target section or page, for `move` and `restructure` |
| `guess` | true when the proposal supplies a mechanism, reason or fact the pages do not state; required on every finding |
| `status` | for a `reference` finding: `broken`, `circular` or `unlocated` |
| `inventory` | for a `presentation` finding, from the structural reviewer: `{actors, steps: [{actor, action, condition, quote}], existingDiagram}`, each step quoting the verbatim sentence of the page the step comes from, and nothing the page does not state |
| `introduced` | with a non-empty `after`: one entry `{text, status, source}` per name, path, value, number or example in `after` that is in neither `before` nor the page; `supported` only with a page anchor the build finds; an empty array when there is none |
| `changes` | when `after` differs from `before` in more than one sentence, or the action is `split` or `list`: `[{kind, original, revised}]`, `kind` one of `split`, `list`, `reword`, `move`, `merge`, `remove`; one entry for a pure split or list conversion, else one per sentence changed |

A contradiction is one finding with two sides: `quote` is the side under review and `related` names the other side. The basis is `set` only when one side has the home (the structural home of the fact, a mechanism against a bare assertion, or the majority of three or more statements); otherwise `author`. The triage puts the choice of the surviving side to the user, with the home as the default.

## The retain record

A drill unit or an editor page may carry `retains`, each `{line, quote, reason}`. A retain records a passage the reviewer examined against a question, or a signal the gate reports (a metaphor candidate used literally; a sentence over 25 words that restates after one reading), and found working where another reviewer or the gate would likely flag the passage. `reason` is one gated sentence naming the question or signal and why the passage passes. A retain is never every sound paragraph and never a finding in disguise: a passage with a defect is a finding. Retains are shown under Retained in the closing plan and are never clustered or graded.

## Gate

Every prose field passes the style gate before you return: `defect`, `point`, `removes`, `after`, `loss`, `question` and a retain's `reason`. Collect them, one per line, in the scratch file the spawn prompt names under `~/trade-imports-arch-workspace/.claude/workareas/editorial/review/`, written with the Write tool rather than a heredoc, and run:

```
bash ~/trade-imports-arch-workspace/.claude/tools/editorial/check-prose.sh <scratch file>
```

Fix each FAIL in the field the line came from and re-run until the gate passes. The commonest failure is a sentence ending on the pronoun "it": name the noun. Judge WARNs in context. If the gate cannot run, say so in your return.

## Drill reviewer

Review only the assigned unit, using the complete documents as context. For each paragraph, state its point first, then ask, in this order. Each question carries its exception, so answer with the exception in view:

1. Is a judgement standing in for a fact? Which fact would replace the judgement, and does the passage need that fact at all? A needed fact is stated without the judgement; a judgement the passage does not need goes with its unit.
2. Does the passage describe a mechanism the design has not decided, except a mechanism another statement in the set records as decided?
3. What does this sentence claim, and does another statement in the set contradict the claim? Only the set counts, not an RFC, a vendor or a platform.
4. Which actor performs each action, and by what mechanism, except where the actor is unknown, irrelevant or whichever component handles the request, and the passive puts the thing the reader tracks in the subject?
5. Which condition, boundary or consequence is missing, and does the passage itself promise that part? When the passage makes no such promise, is the claim that invites the question needed?
6. Does a term require private context, or does the reader frame make the term familiar, except a token in the ubiquitous-language register, which is a proper noun unless the run notes ask for its recorded expansion?
7. Does the explanation merely restate its heading or conclusion, or justify a decision the paragraph already justifies, except the sentence that states the page's scope, whose job that is? The cold editor judges the opening as a whole; a second justification is a repetition wherever it sits.
8. Has compression hidden the relation between ideas, except in a sentence a colleague can restate after one reading, since length is never the defect on its own?
9. Does the paragraph earn its length? Ask this question only when the review intent is `distil`.

For compression, apply the patterns in "Compression patterns" below. The gate detects only some of them, so use editorial judgment for the rest.

Question 9 is the paragraph restatement test in [language.md](../../../best-practices/writing/language.md), "Paragraph Restatement Test". State the paragraph's point, then restate the paragraph from memory without looking at the text. Each sentence the restatement drops is one finding, kind `flow`, action `delete`, with that sentence verbatim as `removes`, `before` and an empty `after`. Raise nothing when the restatement keeps everything.

Grade a `flow` finding S4. The paragraph's point survives the removal, which is what the kind means, so the defect is the reader's effort rather than a claim that is wrong or unsupported. Where removing the sentence would change the point, the defect is not `flow`, and the sentence belongs under whichever of questions 1 to 8 names that defect.

A `flow` finding never carries a condensation. Rewriting a long paragraph shorter restates the surviving sentences in new words, which is a guess under the rule above, and the triage never applies a guess. One sentence per finding keeps every removal a whole unit.

When the review intent is `clarify`, ask four more questions after 1 to 8:

10. Does the paragraph hold more than one topic that a break at the seam would separate, except a paragraph on one topic, whatever its length? A long paragraph is a prompt to check for a second topic ([language.md](../../../best-practices/writing/language.md), "Sentences and paragraphs"), never the defect itself. The finding is action `split`, `before` the whole paragraph, `after` the page-ready paragraphs with a real blank line at the seam, `removes` `none: layout`, one `changes` entry of kind `split`, and `cites` that section.
11. Does one sentence or paragraph carry discrete criteria, options or facts whose order does not carry meaning, which bullets would expose, or an ordered mechanism whose every step names its actor, which a numbered list would expose, except a connected argument, causal explanation or qualification, which stays prose ([document-types.md](document-types.md), "Structural forms")? The finding is action `list`, `after` the page-ready list with the same words in the same order, `removes` `none: layout`, one `changes` entry of kind `list`, and `cites` that section.
12. Does the reader meet a condition after the action or information it governs, so that a reader the condition excludes reads on, or a reader has to re-read to find what the condition binds, except a contrast or emphasis that already works, and a condition whose scope the text does not settle, which is a question for the author ([language.md](../../../best-practices/writing/language.md), "Sentences and paragraphs", the condition-first rule)? The finding is action `rewrite` keeping every word and the condition's distinction (`if`, `only if`, `unless`, `after`), one `changes` entry of kind `move`, and `cites` that section.
13. Does a sentence's framing obscure the behaviour or introduce a judgement the passage does not support, pivot figuratively, or rank without grounding, except a comparison the passage grounds in a stated fact, and a sentence that states the passage's scope or carries the reader between points ([language.md](../../../best-practices/writing/language.md), "Voice and tone", "Register")? The finding is action `rewrite` to the consequence the passage supports, or `delete` when none remains, and `cites` that section.

Grade a compression finding S3 when the reader cannot recover who acts and what the relation is without reading the sentence twice, and S4 when the sentence reads once and the repair only improves cadence or economy. The S3 grade is what lets the repair grow the text and still apply.

Decide the closing move for each defect in this order: deletion of the whole unit that carries the defect (`removes`, with action `delete`); a reword of the sentence that has to stay, so the defective part is gone (`before` and `after`, action `rewrite` or `shorten`); a correction the set settles (`before` and `after`, basis `set` with the citation); a completion of the passage's own promise from the set's material (`after` longer than `before`, with `loss`); and last, a question for the author (basis `author`, `question`, `owner`), still naming the unit that goes while the question stays open. A `split` or `list` under `clarify` is a candidate repair judged like any other, by the reader's difficulty.

## Structural reviewer

The workflow assigns you one page and the whole set as context. Review that page against the rest of the set, anchor every finding on that page, and return findings in the same form plus a redundancy map. Look for:

- a fact, rule or argument stated in more than one place: name the home, the statement that stays, and return one `repetition` finding per other occurrence with `related` naming the home and `removes` the occurrence. A one-line fact may repeat on any page; arguments and specifications have one home;
- sections in the wrong document or mode: action `move` with `moveTo`;
- headings, lists and tables that do not match the content's job (`document-types.md`, "Structural forms");
- a heading, table header, caption, bold lead-in or introducing list item in FAQ voice ("What a journey backend checks"), a table header that trails off on a preposition ("Set by"), or a label not in title case: the reword names the topic as a noun phrase in title case (`language.md`, "Headings, lists and tables"); never ignored, and a finding with no reword says so;
- cross-references: each one resolves, is broken, is circular or is unlocated. Return a `reference` finding with `status` and `removes` for every one that does not resolve. A resolving pointer is a finding only when the reader does not need the pointer, and then the pointer goes too;
- contradictory statements across files, each as two sides;
- qualifications separated from the rules they constrain;
- a diagram candidate. First read the page's existing diagrams. Then look for a passage that `document-types.md`, "Structural forms" makes a diagram candidate, or prose that restates a diagram the page already has. The finding is kind `presentation`, S4 or S5, basis `author` with `question` and `owner`, `removes` `none: presentation`, no `before` or `after`, and an `inventory` listing only what the page states: the actors, one step per stated action with its stated condition and the verbatim sentence it comes from, and `existingDiagram` naming the diagram that already shows the sequence, or null. Never an arrow the text does not state.

The redundancy map is `redundancies`: one entry per repeated fact with `fact`, `home` as an anchor `{page, line, quote}`, and `occurrences`, each a complete finding.

## Cold editor

Read the set as the framed reader seeing the pages for the first time, in the order the pages are listed. Report only what the drill and structural passes cannot see from inside one unit:

- reading order across the set (`order`): a term or fact the reader meets before the set introduces that term or fact, one finding per instance, with `related` naming where the introduction sits;
- each page's opening and the one sentence the framed reader carries away (`pages`): a verdict per page (`finishes` when the reader knows what the page established, `stalls` when the reader is left mid-argument, `misleads` when the reader carries away something the page did not establish), the opening's job in one sentence, the carried-away sentence, at most two findings per page about the opening or the reading of the page as a whole, and the page's retains: an opening or carried-away sentence that does its job for the framed reader where a drill reviewer would likely flag its length or register, and nothing else. An opening in the inventory shape ("Compression patterns", inventory opener) is a finding on the opening with the sentence-per-job rewrite, never a retain, however well it lists the sections;
- set-wide patterns with three or more instances (`patterns`): the pattern in one sentence, every instance as an anchor, and one finding at the first instance whose closing move covers all of them.

Nothing sentence-level inside one unit; the drill reviewers own that level. The cap is two findings per page plus five set-wide. When the set already reads well, return the page verdicts and no findings.

## Compression patterns

Reader-pays compression saves the writer words but makes the reader reconstruct the meaning. The test is whether a colleague can read the sentence aloud once and restate it accurately. Where they need private context or have to reverse the grammar, unpack the sentence. These are recognition tests for finished prose; `language.md`, "Write it forward" holds the drafting rules.

- **Ledger voice** turns document bookkeeping into system prose: `held open under X`, `argued under X`, `its case is made once`, `stated below the table`, `collected under`, `points back to`. State each fact, status or pointer directly. Separate them when one sentence would blur their relationship.
- **Aside stacking** places 2 or more asides inside one sentence and separates the subject from its verb. Keep at most one aside; move the rest into sentences of their own.
- **Contact-clause squeeze** removes the relative pronoun and gives agency to an inanimate thing: `a store only the front door reaches`. Restore the relation: "a store that only the front door can access".
- **Abstraction swap** uses a noun such as `the expected axis`, `the posture` or `their standing` instead of the concrete fact. Ask "meaning what, exactly?" and put the answer in the sentence.
- **Inverted relation** buries the important verb inside a trailing relative clause: `the tenant INS is calling into`, `the model the decision rests on`. Promote the relation: "For INS to call a target in a tenant...".
- **Trailing vagueness** ends a sentence on an abstract noun or an absolute claim with no named referent: `The shape is settled`, `it depends on one hostname and on nothing else`. End on the concrete claim instead: name what is settled; name the thing that depends.
- **Trailing pronoun** ends a sentence or a line on `it`: `the routing service provides it`, `only the single hostname keeps the cookie off it`. Name the noun the pronoun stands for. The subject the pronoun hides usually belongs at the front of the sentence, so `the routing service provides it` becomes "the routing service provides a single hostname in front of the journeys". The gate fails this pattern; `IT` as the abbreviation and words merely ending in those letters, such as `audit`, pass unchanged.
- **Leading demonstrative** opens a sentence on a bare `This`, `That`, `These` or `Those`, leaving the reader to reconstruct the referent from the sentence before: `This adds a deployable to every request path`. Name the thing: "Running a programme-owned proxy adds a deployable to every request path". A demonstrative in front of a noun is a determiner and stays (`This page explains`, `These rules apply`); the defect is the bare pronoun in front of a verb. The gate does not check this pattern.
- **Dangling-preposition relative** buries the actor's verb in a relative clause that trails off on a preposition: `the session API that the journeys resolve sessions against`. Give the actor its own clause: "the journeys resolve sessions by calling the session API".
- **Figurative mechanism** makes the reader decode a metaphor before they can understand the system. State the literal behaviour instead.
- **FAQ voice** writes as if answering a reader's question: a heading, label, list item, table cell or sentence opens on a question or a half-question (`What a journey backend checks`, `How is a session started`, `Who sees the switch form is not settled`). The reader holds the question before reaching the actor or the content. Name the topic as a noun phrase in a heading or label; in a sentence, put the actor first and keep any embedded question as the object of the verb: "INS has not settled who sees the switch form". The gate fails a heading, a table header cell and a bold lead-in, and warns on the rest. FAQ voice is never retained: a finding carries the noun phrase or the actor-first sentence, and where the reviewer cannot write one the finding says so and the triage puts the label to the user.
- **Inventory opener** lists a page's parts as nominalised noun phrases, after a colon or in a run of commas: `This page defines what the API gives its callers: the session assertion, the operations and their answers, the rules for sign-out, and what each component is responsible for`. The reader holds every abstraction before a verb lands. Being the scope sentence does not excuse the shape, so the cold editor does not retain an opening of this shape as a scope sentence. Rewrite as one sentence per job of the page, each with an actor and a verb, in the order the reader meets the sections (`language.md`, "Headings, lists and tables"), through explain and rewrite. The gate warns on the shape.
- **Condensed rule** states a rule or principle as a short quotable formula. An abstraction acts as the subject (`the estate distils`, `a rewrite grows`), a passive leaves out both the actor and the object (`the loss is named`), and the terms mean something only to a reader who already knows the source. Unpack the formula with explain and rewrite until each sentence passes.
