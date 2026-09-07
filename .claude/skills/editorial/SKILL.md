---
name: editorial
description: Writing, revising and reviewing human-facing technical documentation in the workspace editorial voice. Use for architecture documents, solution overviews, design docs, explanations, how-to guides, reference pages, READMEs, ADRs, Confluence pages, PR descriptions, commit bodies and Jira tickets. Also use when a coding, modelling or analysis task produces substantial documentation or explanatory prose. Establishes the reader brief and structure, drills from surface text to meaning, and applies a cold-reader review and mechanical style gate. Not for code comments or ordinary conversational replies.
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
- Read [review-brief.md](references/review-brief.md) only when running a cold-reader pass or the whole-document review workflow.

Other files should point to these authorities rather than copy their rules.

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

- Open with the information the reader needs first. This is usually the document's scope or the fixed format's required opening.
- Use concrete headings that answer the reader's questions.
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
4. Can this point be stated more simply without losing meaning?

Unpack before cutting. Several plain statements are better than one dense statement. Later, remove whole units the reader does not need; do not compress the surviving explanation back into shorthand.

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

### 4. Verify the content

- Check every internal link and cross-reference.
- Do not cite gitignored files, local-only data or sources the reader cannot access. State the supporting fact inline when the source cannot be shared.
- Name any external document or prior decision on which a claim depends.
- Before calling something an open question, search the available sources. Lead with what is already known and narrow what remains.
- Reject circular reasons. Trace a decision to the use case, source data or constraint rather than to the authority making the decision.
- When a correct statement invites a likely false inference, add the boundary explicitly: state what does not happen.

### 5. Remove waste and fix the structure

Ask what the reader loses if each sentence, paragraph or section disappears. Remove units whose loss changes nothing.

Give repeated facts one home. Merge sections when their overlap causes repetition. Keep connective prose that carries the reader between points; shorter but harder to follow is not an improvement.

Apply the structural rules in [document-types.md](references/document-types.md). Do not turn prose into bullets merely to shorten the passage.

### 6. Run the cold-reader and mechanical checks

For a small artefact, apply the cold-editor role in [review-brief.md](references/review-brief.md) yourself. For a full draft, give that role to a fresh-context reviewer. The reviewer returns findings only and never edits the document. Apply accepted findings in the writing session.

For a full document or document set, run the saved `editorial-review` workflow only when the user asks to "run the editorial-review workflow" on a path. It uses [review-brief.md](references/review-brief.md) for drill, structural and cold-editor passes. The workflow reviews without editing. After applying accepted findings, run one final cold-reader check on the revised result.

Run the style gate on every document touched:

```
bash ~/trade-imports-arch-workspace/.claude/tools/editorial/check-prose.sh <file>
```

For prose held only in text, use `--stdin --label <name>` and supply the text through standard input. Empty input proves nothing.

Fix every FAIL. Judge every WARN against [language.md](../../best-practices/writing/language.md): literal technical uses may stay; vague or figurative uses must become the specific behaviour, condition or mechanism. The work is not finished until the gate passes.

## Applying edits

- When editing living documentation, rewrite it as a current snapshot and remove dated corrections or revision commentary. For change records and decision records, preserve the lifecycle described in [snapshot-authoring.md](../../best-practices/writing/snapshot-authoring.md).
- Describe a non-trivial restructure before making the change.
- Apply ordinary cuts, wording repairs and terminology fixes directly.
- Review connective prose introduced by a restructure; it has not passed through the earlier review.
- Re-read the result using the reader frame after substantive changes.

## Scripts

| Script | Purpose |
| --- | --- |
| `~/trade-imports-arch-workspace/.claude/tools/editorial/check-prose.sh` | Check deterministic failures and judgment warnings; supports `--stdin --label`, `--print-fail-lines` and `--help` |
| `~/trade-imports-arch-workspace/.claude/tools/editorial/hook-check-written.sh` | Check each write while the skill is active and record touched files |
| `~/trade-imports-arch-workspace/.claude/tools/editorial/hook-stop.sh` | Prevent the session from ending while a touched file contains a newly introduced failure |
