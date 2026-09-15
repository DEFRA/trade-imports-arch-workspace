# Review brief

This document is the single instruction set for the reviewers used by the `editorial-review` workflow. The spawn prompt supplies the reader frame, document mode, run notes and the scratch file for the gate. Apply that frame to every finding.

## Before reviewing

Read these sources, then read every document under review in full before examining the assigned unit:

1. `~/trade-imports-arch-workspace/.claude/best-practices/writing/language.md`
2. `~/trade-imports-arch-workspace/.claude/best-practices/writing/ubiquitous-language.md`
3. `~/trade-imports-arch-workspace/.claude/best-practices/writing/snapshot-authoring.md`
4. `~/trade-imports-arch-workspace/.claude/skills/editorial/references/document-types.md`
5. `~/trade-imports-arch-workspace/.claude/skills/editorial-triage/assets/editorial-triage-schema.md`, section "Reviewer-set fields": the values every field takes and the severity range per kind

## Rules for every reviewer

- Return findings only. Do not edit files and do not list text that already passes.
- Close, do not open. A finding names the change that resolves the defect; a question on its own is not a finding. When the passage's point depends on a fact the set does not hold, the finding carries the question and its owner, and still names the span that goes while the question stays open.
- Try removal first, always, and removal means a whole unit. Every finding names `removes`: the smallest whole sentence, bullet, table row, paragraph or complete parenthetical aside whose deletion resolves the defect, or `none:` with the reason that unit has to stay. Never name a fragment inside a sentence that survives: cutting a span mid-sentence leaves a bare noun, a stranded subject or a broken line. When the sentence has to stay, the finding carries `before` and `after` rewording that sentence so the defective part is gone. A rewrite that grows the text is allowed only when the passage itself promises the missing part and the set supplies that part.
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
- Treat revision narrative, resolution logs and dated annotations as `residue`. System or domain history may stay when it explains the current design.
- Do not flag banned wording or punctuation when it appears only as an exemplar inside inline code, fenced code, blockquotes or URLs. Review those examples for accuracy and usefulness when they are in scope. Ordinary quotation marks do not suppress the gate. YAML frontmatter is configuration rather than body prose.

## The finding

Every reviewer returns findings in one form. The contract names the values; this table says what each field is for.

| Field | What the field carries |
| --- | --- |
| `page` | the page filename, for example `03-ins-auth-session-record.md` |
| `line` | the line number from the Read tool; pages use one line per paragraph |
| `quote` | a verbatim phrase from that line that anchors the finding |
| `kind` | `fact`, `citation`, `contradiction`, `absolute`, `omission`, `ambiguity`, `term`, `reference`, `repetition`, `compression`, `flow` or `residue` |
| `severity` | `S1` wrong, `S2` contradiction, `S3` overreach, `S4` effort, `S5` preference; the contract gives the range per kind |
| `defect` | one sentence naming the defect and the question that exposed the defect |
| `point` | one sentence naming what the passage is trying to establish, from the whole paragraph, not the quoted phrase alone |
| `bearing` | `central` when the point is wrong or unverifiable because of the defect; `supporting` when the defect qualifies or evidences the point; `tangential` when the point stands whether or not the finding is resolved |
| `removes` | the smallest whole unit (sentence, bullet, table row, paragraph) or complete parenthetical aside, verbatim, whose deletion resolves the finding, or `none: <why the unit has to stay>`. Never a fragment inside a surviving sentence |
| `action` | the one action that resolves the finding: `delete`, `shorten`, `correct`, `reconcile`, `rewrite`, `rename`, `split`, `move`, `restructure`, `expand`, `point`, `qualify`, `own` or `ask` |
| `basis` | `rule` for a named `language.md` or `document-types.md` section; `set` for another statement in the set; `inference` for one unstated step from the set; `author` when the set does not hold the fact. `source` is reserved for a published document the run notes name |
| `cites` | what the basis rests on: the rule name; `<NN> "<verbatim quote>"` for `set`, where NN is the page's number prefix (the triage greps the quote and rejects the finding when the quote is absent); the one step for `inference`. Required unless the basis is `author` |
| `before`, `after` | only when a rewrite is offered: `before` verbatim and occurring exactly once in the page, `after` the replacement, empty for a deletion; the smallest span that fixes the defect |
| `loss` | required when `after` is longer than `before`: the wrong inference or unverifiable claim the reader is left with without the addition. Never completeness, context, clarity, helpful or useful |
| `question`, `owner` | only when the basis is `author` and the passage's point depends on the answer: the precise question and who answers |
| `related` | anchors `{page, line, quote}` of the other statements in a cross-page defect; for a contradiction, the other side |
| `moveTo` | the target section or page, for `move` and `restructure` |
| `guess` | true when the proposal supplies a mechanism, reason or fact the pages do not state |
| `status` | for a `reference` finding: `broken`, `circular` or `unlocated` |

A contradiction is one finding with two sides: `quote` is the side under review and `related` names the other side. The basis is `set` only when one side has the home (the structural home of the fact, a mechanism against a bare assertion, or the majority of three or more statements); otherwise `author`. The triage puts the choice of the surviving side to the user, with the home as the default.

## Gate

Every prose field passes the style gate before you return: `defect`, `point`, `removes`, `after`, `loss` and `question`. Collect them, one per line, in the scratch file the spawn prompt names under `~/trade-imports-arch-workspace/.claude/workareas/editorial/review/`, written with the Write tool rather than a heredoc, and run:

```
bash ~/trade-imports-arch-workspace/.claude/tools/editorial/check-prose.sh <scratch file>
```

Fix each FAIL in the field the line came from and re-run until the gate passes. The commonest failure is a sentence ending on the pronoun "it": name the noun. Judge WARNs in context. If the gate cannot run, say so in your return.

## Drill reviewer

Review only the assigned unit, using the complete documents as context. For each paragraph, state its point first, then ask, in this order:

1. Is a judgement standing in for a fact? Which fact would replace the judgement, and does the passage need that fact at all?
2. Does the passage describe a mechanism the design has not decided?
3. What does this sentence claim, and does another statement in the set contradict the claim? Only the set counts, not an RFC, a vendor or a platform.
4. Which actor performs each action, and by what mechanism?
5. Which condition, boundary or consequence is missing, and does the passage itself promise that part? When the passage makes no such promise, is the claim that invites the question needed?
6. Does a term require private context, or does the reader frame make the term familiar?
7. Does the explanation merely restate its heading or conclusion, or justify a decision the paragraph already justifies?
8. Has compression hidden the relation between ideas?

For compression, apply the tests in `language.md`: ledger voice, aside stacking, contact-clause squeeze, abstraction swap, inverted relation, trailing vagueness, trailing pronoun, the dangling-preposition relative and figurative mechanism. The gate detects only some of these patterns, so use editorial judgment for the rest.

Decide the closing move for each defect in this order: deletion of the whole unit that carries the defect (`removes`, with action `delete`); a reword of the sentence that has to stay, so the defective part is gone (`before` and `after`, action `rewrite` or `shorten`); a correction the set settles (`before` and `after`, basis `set` with the citation); a completion of the passage's own promise from the set's material (`after` longer than `before`, `loss` named); and last, a question for the author (basis `author`, `question`, `owner`), still naming the unit that goes while the question stays open.

## Structural reviewer

The workflow assigns you one page and the whole set as context. Review that page against the rest of the set, anchor every finding on that page, and return findings in the same form plus a redundancy map. Look for:

- a fact, rule or argument stated in more than one place: name the home, the statement that stays, and return one `repetition` finding per other occurrence with `related` naming the home and `removes` the occurrence. A one-line fact may repeat on any page; arguments and specifications have one home;
- sections in the wrong document or mode: action `move` with `moveTo`;
- headings, lists and tables that do not match the content's job (`document-types.md`, "Structural forms");
- cross-references: each one resolves, is broken, is circular or is unlocated. Return a `reference` finding with `status` and `removes` for every one that does not resolve. A resolving pointer is a finding only when the reader does not need the pointer, and then the pointer goes too;
- contradictory statements across files, each as two sides;
- qualifications separated from the rules they constrain.

The redundancy map is `redundancies`: one entry per repeated fact with `fact`, `home` as an anchor `{page, line, quote}`, and `occurrences`, each a complete finding.

## Cold editor

Read the set as the framed reader seeing the pages for the first time, in the order the pages are listed. Report only what the drill and structural passes cannot see from inside one unit:

- reading order across the set (`order`): a term or fact the reader meets before the set introduces that term or fact, one finding per instance, with `related` naming where the introduction sits;
- each page's opening and the one sentence the framed reader carries away (`pages`): a verdict per page (`finishes` when the reader knows what the page established, `stalls` when the reader is left mid-argument, `misleads` when the reader carries away something the page did not establish), the opening's job in one sentence, the carried-away sentence, and at most two findings per page about the opening or the reading of the page as a whole;
- set-wide patterns with three or more instances (`patterns`): the pattern in one sentence, every instance as an anchor, and one finding at the first instance whose closing move covers all of them.

Nothing sentence-level inside one unit; the drill reviewers own that level. The cap is two findings per page plus five set-wide. When the set already reads well, return the page verdicts and no findings.
