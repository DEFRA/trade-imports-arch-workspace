# Review brief

This is the single instruction set for the reviewers used by the `editorial-review` workflow. The spawn prompt supplies the reader frame, document mode and run notes. Apply that frame to every finding.

## Before reviewing

Read these sources, then read every document under review in full before examining the assigned unit:

1. `~/trade-imports-arch-workspace/.claude/best-practices/writing/language.md`
2. `~/trade-imports-arch-workspace/.claude/best-practices/writing/ubiquitous-language.md`
3. `~/trade-imports-arch-workspace/.claude/best-practices/writing/snapshot-authoring.md`
4. `~/trade-imports-arch-workspace/.claude/skills/editorial/references/document-types.md`

## Rules for every reviewer

- Return findings only. Do not edit files and do not list text that already passes.
- Report a finding only when the change would make the text easier for the named reader to understand or verify. Do not rewrite for preference or synonym choice.
- Preserve technical meaning. If the source does not establish the meaning or rationale, ask the author a precise question instead of inventing a rewrite.
- Treat tokens in the ubiquitous-language register as proper nouns. Do not expand them unless the run notes ask for the recorded expansion. Never guess an expansion.
- Honour the run notes. Recently agreed text still needs a genuine defect before it becomes a finding.
- Report one defect once, under the most specific category.
- Treat revision narrative, resolution logs and dated annotations as `residue`. System or domain history may stay when it explains the current design.
- Do not flag banned wording or punctuation when it appears only as an exemplar inside inline code, fenced code, blockquotes or URLs. Review those examples for accuracy and usefulness when they are in scope. Ordinary quotation marks do not suppress the gate. YAML frontmatter is configuration rather than body prose.

Gate the complete text of every proposed rewrite before returning it:

```
bash ~/trade-imports-arch-workspace/.claude/tools/editorial/check-prose.sh --stdin --label <unit> <<'EOF'
<all proposed rewrites>
EOF
```

The heredoc is required. Fix each FAIL before returning. Judge WARNs in context. If the gate cannot run, state that limitation.

## Drill reviewer

Review only the assigned unit, using the complete documents as context. Ask:

1. What does this sentence claim?
2. Which actor performs each action, and by what mechanism?
3. Which condition, boundary or consequence is missing?
4. Can the reader verify the claim from the named evidence?
5. Does a term require private context, or does the reader frame make it familiar?
6. Does the explanation merely restate its heading or conclusion?
7. Has compression hidden the relation between ideas?

For compression, apply the tests in `language.md`: ledger voice, aside stacking, contact-clause squeeze, abstraction swap, inverted relation, trailing vagueness, the dangling-preposition relative and figurative mechanism. The gate detects only some of these patterns, so use editorial judgment for the rest.

Each finding contains a quoted location, a category, one sentence naming the defect and the question that exposed it, and either a proposed rewrite or a question for the author. Use one of these categories: `drill`, `jargon`, `verifiability`, `circularity`, `boundary`, `repetition`, `compression`, `flow` or `residue`.

## Structural reviewer

Review the whole document set for:

- duplicated rules or facts, distinguishing repetition from a legitimate rule-plus-example;
- sections in the wrong document or mode;
- headings, lists and tables that do not match the content's job;
- broken or misleading cross-references;
- inconsistent terminology or contradictory statements across files;
- qualifications separated from the rules they constrain.

Return a redundancy map, structure proposals, cross-reference results and structural findings. For each true duplication, name the single authoritative home and what the other occurrences should become.

## Cold editor

Read the result as an informed colleague seeing it for the first time. Return numbered findings only. Each finding must quote the location and give the replacement text or structural move.

Check for:

- a weak or delayed opening;
- sections whose purpose or connection is unclear;
- mixed document modes;
- abrupt paragraph transitions or monotonous sentence patterns;
- ambiguous pronouns, including an `it` whose referent the reader must recover;
- hidden actors and passive constructions that obscure responsibility;
- sentences that end on an abstract noun or an absolute claim with no named referent, such as `the shape is settled` or `and on nothing else`;
- undefined audience-dependent terms;
- claims without evidence, conditions or observable consequences;
- noun stacks, nominalisations and reader-pays compression;
- repeated conclusions, throat-clearing, revision residue and decorative closing summaries;
- broken references or inconsistent names;
- missing boundaries that let readers infer more than the text establishes.

If the draft already meets these tests, return no findings.
