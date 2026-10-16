---
name: editorial
description: Editorial pass on human-facing technical documentation in the workspace editorial voice - architecture documents, solution overviews, design docs, explanations, how-to guides, reference pages, READMEs, ADRs, Confluence pages, PR descriptions, commit bodies and Jira tickets. Invoke only when the user asks for an editorial pass, by name or with /editorial; drafting and revising before that point follow language.md without this skill, its cold reader or its hooks. Establishes the reader brief and structure, drills from surface text to meaning, and applies a cold-reader review and mechanical style gate. Not for code comments or ordinary conversational replies.
hooks:
  PostToolUse:
    - matcher: Write|Edit|MultiEdit
      hooks:
        - type: command
          command: bash "$CLAUDE_PROJECT_DIR/.claude/tools/editorial/hook-check-written.sh" --record
          timeout: 10
  Stop:
    - hooks:
        - type: command
          command: bash "$CLAUDE_PROJECT_DIR/.claude/tools/editorial/hook-stop.sh"
          timeout: 30
---

The aim is technical writing that is concise, precise and clear. Clarity comes from simple language, never from simplifying the content. A paragraph is finished when adding more would not improve its point and taking anything away would remove useful meaning. The document reads as if one author wrote it as a coherent whole. The rules are [language.md](../../best-practices/writing/language.md)'s, starting with "Just Enough".

Use one of 2 paths:

- **New writing** - establish the brief and outline, draft, then review the result.
- **Existing prose** - establish the reader, then start with the review path.

## Sources of truth

Read only the guidance needed for the current path:

- Always read [language.md](../../best-practices/writing/language.md). It owns the workspace voice, grammar, terminology, formatting and compression tests.
- Always read [snapshot-authoring.md](../../best-practices/writing/snapshot-authoring.md) when editing an existing document. It explains how to incorporate changes without leaving revision residue.
- Read [ubiquitous-language.md](../../best-practices/writing/ubiquitous-language.md) when the document uses workspace terms or an abbreviation may be a registered name.
- Read [document-types.md](references/document-types.md) when choosing or checking a document's mode or fixed format.
- Read [voice-examples.md](references/voice-examples.md) before drafting a full technical document or when prose sounds compressed or mechanical.
- Read [clarify-examples.md](references/clarify-examples.md) once, when starting a task that edits existing prose under `clarify`.
- Read [review-brief.md](references/review-brief.md) only when running a cold-reader pass or the whole-document review workflow.

Other files should point to these authorities rather than copy their rules.

## Modes and intents

Every run names an output mode and an intent. The modes: `review` returns findings, the retains and the questions for the author, and changes no page; `revise` returns revised text with a change list and, after the closing plan's spot check, applies the batch. The intents: `clarify` makes the text clear through simple language and keeps every claim; it explains and rewrites, splits, lists and reorders, and may still remove noise as a whole unit. `distil` removes noise as whole units, and each paragraph ends no longer than its source. Under both intents a dense sentence is unpacked with explain and rewrite before anything is cut. The growth rules for each are [language.md](../../best-practices/writing/language.md), "Just Enough". A request worded "validate" or "check" is restated as a readability task and its accuracy questions are routed to a separate process; the run still checks that its own edits preserve meaning. The whole-document review workflow runs only on the user's explicit request; its arguments are `docs` or `sections`, `frame`, `mode`, `intent`, and optionally `documentMode` and `notes`.

**Bash call hygiene** - one command per Bash call; paths in the literal `~/trade-imports-arch-workspace/...` form. Full rules: [agent-skills.md](../../best-practices/skills/agent-skills.md).

## House voice

Write as a knowledgeable colleague speaking directly and precisely to another colleague. The tone is conversational, brisk but not terse, serious without becoming pompous, and confident only where the evidence supports confidence.

Lead with the point. Name actors and mechanisms. Prefer concrete facts to judgments about those facts. Let the reader see what happens, why it happens and what follows from that behaviour. Preserve natural cadence rather than forcing every sentence into the same short pattern.

Do not invent missing meaning, rationale or evidence. A named gap is better than a fluent guess.

## Writing path

For substantial documents, complete the brief and outline before drafting. Fixed-format artefacts follow their owning guidance.

### 1. Establish the brief

- **Document form.** Choose the dominant mode or fixed-format artefact in [document-types.md](references/document-types.md). Preserve an existing document's established structure unless the user asks to change that structure.
- **Audience.** Name the reader's role and context, what they already know, which concepts need introduction, and what they must understand or do after reading.
- **Allowed terminology.** Check the ubiquitous-language register when the document uses workspace terms. Add only terms the named audience verifiably knows. Introduce or replace everything else.
- **Scope sentence.** Write one sentence stating what the document covers and who it is for. Use it to test the opening, and include its substance early unless the fixed format supplies the opening.
- **Missing inputs.** Ask one focused question only when the document, audience or intended outcome cannot be derived safely from the request and available context.

### 2. Build the outline

- Open with the information the reader needs first. That information is usually the document's scope or the fixed format's required opening.
- Give each section a heading that names its topic as a noun phrase in title case, never a question or a half-question; the rule is in [language.md](../../best-practices/writing/language.md), "Headings, lists and tables".
- Put each fact in one place. Link or point to that place instead of restating the fact.
- Choose prose, steps, bullets and tables using the structure rules in [document-types.md](references/document-types.md).
- Include what the reader needs and remove what the reader already knows.

### 3. Draft and self-review

Draft to the brief, outline and house voice. Use [voice-examples.md](references/voice-examples.md) as patterns, not as text to imitate mechanically. Then follow the review path on the draft.

## Review path

### 1. Frame the reader

Write down the reader frame before judging the text:

- role and context
- concepts already known
- concepts needing introduction
- action or decision the document supports

Never assume the reader saw the branch, conversation, source notes or intermediate analysis.

### 2. Recover the intended meaning

For each section, paragraph and sentence, ask:

1. What is this trying to say?
2. Why does the reader need this information?
3. Has compression hidden an actor, mechanism, condition or consequence?
4. Can this point be stated in simpler language without losing meaning?

Unpack before cutting, with [explain and rewrite](references/explain-and-rewrite.md). Several plain statements are better than one dense statement, so keep unpacking until every sentence passes [language.md](../../best-practices/writing/language.md), "Sentences and paragraphs". Later, remove whole units the reader does not need; do not compress the surviving explanation back into shorthand.

Stop where further explanation would require a guess. Name the missing information instead. If the author clearly holds an omitted rationale, ask for it rather than supplying a plausible one.

When a conclusion rests on phrases such as "by construction" or "holds structurally", state the mechanism that makes each part true and then state the consequence.

### 3. Apply the language tests

Use [language.md](../../best-practices/writing/language.md) to check:

- actor and action clarity
- established information before new information
- explicit cause, sequence and dependency
- stable subjects and unambiguous references
- nominalisations, noun stacks and other reader-pays compression
- jargon, metaphors, vague claims and internal labels
- sentence cadence and paragraph progression
- formatting and terminology conventions

A reader should be able to read each sentence aloud once and restate it accurately. Rewrite only when the result becomes easier for the named reader to understand or verify.

### 4. Check the set against itself

- Check every internal link and cross-reference.
- Do not cite gitignored files, local-only data or sources the reader cannot access. State the supporting fact inline when the source cannot be shared.
- A claim about the world (an RFC section, a vendor's behaviour, a platform fact) is out of scope for the review; a separate process fact-checks. Flag only a contradiction between the document set's own statements.
- Before calling something an open question, search the available sources. Lead with what is already known and narrow what remains.
- Reject circular reasons. Trace a decision to the use case, source data or constraint rather than to the authority making the decision.
- When a correct statement invites a likely false inference, add the boundary explicitly: state what does not happen.

### 5. Remove waste and fix the structure

Apply [language.md](../../best-practices/writing/language.md), "Just Enough". That section is the only home for the removal rules.

Give repeated facts one home. Merge sections when their overlap causes repetition.

Apply the structural rules in [document-types.md](references/document-types.md). Do not turn prose into bullets merely to shorten the passage.

Under `clarify` the session may split a paragraph at a seam, put a condition before what it governs, list a collection whose order carries no meaning, restate a framing sentence as its supported consequence, or name a thing a pronoun stands for, each as [language.md](../../best-practices/writing/language.md) defines it, and none grows outside the review brief's two cases.

### 6. Run the cold-reader and mechanical checks

For a small artefact, apply the cold-editor role in [review-brief.md](references/review-brief.md) yourself. For a full draft, give that role to a fresh-context reviewer. The reviewer returns findings only and never edits the document. Apply accepted findings in the writing session.

For a full document or document set, run the saved `editorial-review` workflow only when the user asks to "run the editorial-review workflow" on a path, with the arguments "Modes and intents" names. Under `distil` the drill reviewer's paragraph restatement test raises one removal per sentence a restatement of the paragraph drops; under `clarify` the drill reviewer asks the clarify questions. The workflow uses [review-brief.md](references/review-brief.md) for drill, structural and cold-editor passes and reviews without editing. Triage its findings with the `editorial-triage` skill (`~/trade-imports-arch-workspace/.claude/skills/editorial-triage/SKILL.md`), which grades every finding into one closing move against the calibrated rubric and writes the closing plan. In revise mode, apply the remove, correct and reword batch after the plan's spot check, put the keep-one-side and tell-me items to the user, send the open lines to the register, then run one final cold-reader check on the revised result. In review mode the plan is the deliverable and no page changes.

Run the style gate on every document touched:

```
bash ~/trade-imports-arch-workspace/.claude/tools/editorial/check-prose.sh <file>
```

For prose held only in text, use `--stdin --label <name>` and supply the text through standard input. Empty input proves nothing.

Fix every FAIL. Judge every WARN against [language.md](../../best-practices/writing/language.md): literal technical uses may stay; vague or figurative uses must become the specific behaviour, condition or mechanism.

The gate is the floor, not the finish. After the gate passes, read each paragraph once and say that paragraph back without looking at the text. Where your restatement differs from the paragraph, the paragraph is wrong and the paragraph changes. The work is finished when the restatements match.

## Explain and Rewrite

When a heuristic or a judge flags a sentence the reader cannot restate after one reading, when a reviewer writes a reword, or when the user asks for a rewrite, use [explain and rewrite](references/explain-and-rewrite.md): explain, compare, rewrite, check the deviation, and let a fresh reader judge preservation and benefit. It runs under both intents. An explicit rewrite request selects it; it never changes a claim, and a retained source is a normal outcome.

## Applying edits

- When editing living documentation, rewrite it as a current snapshot and remove dated corrections or revision commentary. For change records and decision records, preserve the lifecycle described in [snapshot-authoring.md](../../best-practices/writing/snapshot-authoring.md).
- Describe a non-trivial restructure before making the change.
- Apply ordinary cuts, wording repairs and terminology fixes directly in revise mode; in review mode the candidate is returned as a finding and no page changes.
- Review connective prose introduced by a restructure; it has not passed through the earlier review.
- Re-read the result using the reader frame after substantive changes, as [language.md](../../best-practices/writing/language.md), "The whole document" says. A seam problem is one local edit with its own change line, never a reopening of an applied entry.

## Completion output

```
editorial complete: mode <review|revise>, intent <distil|clarify>.

Pages touched: <list>.
Revise: removed <n> units (each naming any information the reader no longer gets), reworded <n> sentences (change lines in the record), net growth <n> words; changed-page gate <pass|FAIL>.
Review: candidates and findings returned <n>; gate on their prose <pass|FAIL>; no page changed.
Questions for the author <n>; retains recorded <n>. Nothing committed.
```

## Scripts

| Script | Purpose |
| --- | --- |
| `~/trade-imports-arch-workspace/.claude/tools/editorial/check-prose.sh` | Check deterministic failures and judgment warnings; supports `--stdin --label`, `--print-fail-lines` and `--help` |
| `~/trade-imports-arch-workspace/.claude/tools/editorial/claim-diff.sh` | The claim nominator on one edit (`--before <file> --after <file>`): the deviation check in explain and rewrite, a signal and not a verdict |
| `~/trade-imports-arch-workspace/.claude/tools/editorial/hook-check-written.sh` | Check each write while the skill is active and record touched files |
| `~/trade-imports-arch-workspace/.claude/tools/editorial/hook-stop.sh` | Prevent the session from ending while a touched file contains a newly introduced failure |
