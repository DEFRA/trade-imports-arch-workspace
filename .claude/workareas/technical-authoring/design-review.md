# Design Review: Document Planning and Authoring

Findings are ranked most consequential first. Quotations are from design.md.

## Findings That Would Fail the Goal

### 1. Traceability Without a Check

The design's main advantage over the benchmark, that every claim traces to the plan, has no check.

- Evidence: "Every claim in the document therefore traces to the plan" rests on an instruction, "authoring never reaches past the plan". hedy never checks document against plan, and "a reviewer that reads the document against the plan" is deferred.
- Consequence: the model fills gaps from training or earlier context undetected, and the author finds unsupported claims by reading, the cost the plan was meant to remove.
- Fix: plan items carry identifiers, authoring records the identifiers each paragraph uses, and hedy checks that every paragraph cites its own section's items and every item is used. Fidelity stays unproven, but invention and omission become visible.

### 2. No Curation Step for a Messy Corpus

Selection assumes a corpus the model can read and trust, which is the problem the owner named.

- Evidence: "The author names the corpus", and "triage of a large corpus before selection" is deferred.
- Consequence: with superseded drafts, conflicting notes and more text than fits in context, document-planning selects from whatever it happened to read, and the plan looks curated without being curated.
- Fix: planning's first output is a source list, each source marked current, superseded or out of scope, agreed with the purpose. Later triage deepens this step.

### 3. A Source Check That Fails on Paraphrase

- Evidence: "hedy confirms that each selected item appears in its source."
- Consequence: a selected item is normally a summary. A literal match fails every summary and a fuzzy match passes misreadings.
- Fix: each item carries a short quoted span and its location. hedy checks the span, and the author sees the model's reading beside the quotation.

### 4. Diagnosis Owned by the Wrong Element

- Evidence: "authoring diagnoses the document and reports each defect with its owner", but the reader and purpose belong to document-planning.
- Consequence: the expression skill judges whether a document serves a reader it does not know. Two elements claim one decision.
- Fix: improving starts with document-planning reconstructing the plan from the document, a reverse outline whose gaps are the planning defects. The same step handles drift: compared with the stored plan, the reverse outline shows the drift, and the author chooses which version is current.

### 5. No Owner for Factual Error

- Evidence: the level table has no row for whether a claim is true. Improving uses "the document as the corpus", and the edit "changes nothing the document claims".
- Consequence: on a page someone else wrote, wrong or outdated claims are rearranged and polished, never corrected.
- Fix: name the author as owner of accuracy, let the author add sources when replanning, and have the diagnosis list doubtful claims as questions.

## Findings That Would Improve It

### 6. Checkpoint Cost on Short Artefacts

- Evidence: "One process serves every size of document", with two agreements in planning.
- Consequence: two checkpoints for a three-point PR body make the pair slower than the benchmark on the commonest artefact, and authors bypass the pair.
- Fix: present a short artefact's whole plan for one agreement. For a PR, the corpus is the diff and the commits.

### 7. No Home for the Author's Answers

- Evidence: the plan holds "Open items" and authoring "asks only what the plan leaves open", but no step records the answer.
- Consequence: answers vanish in chat, the plan stops being "the one record", and the next document asks again.
- Fix: authoring writes every answer into the plan before drafting from the answer.

### 8. No Owner for the Joins Between Sections

- Evidence: "authoring drafts one section at a time".
- Consequence: repetition across sections, terms defined twice or never, and missing transitions.
- Fix: one closing authoring pass over the whole draft, limited to joins, repetition and the first use of terms.

### 9. Unclear Owners for Form and the Style Sheet

- Evidence: table, list or diagram falls between "the order of the sections" and "how each point is said". No element writes the style sheet.
- Consequence: both skills decide whether a point becomes a table, and new terms enter unrecorded.
- Fix: the plan records each section's form where the form is not prose, and document-planning proposes style sheet entries for the author to agree.

### 10. Misleading Names for the Edit Levels

- Evidence: "a comprehensive edit is document-planning's work, a copy edit is authoring's".
- Consequence: editors call paragraph and sentence work a line edit, and copy editing is hedy's consistency work. The wrong name hides where authoring must beat the benchmark.
- Fix: structural edit, line edit and mechanical edit.

## Verdict

Yes, once findings 1 to 5 change it, because those five make its central claims true: traceability, curation, and improvement of pages someone else wrote. No element can be removed without loss, and the plan as the single interface is the right core. The one-owner idea holds for content and expression but breaks at accuracy, section form and the joins between sections, and each break needs a named owner, not a new element. A documentation lead would add the reverse outline first, since that step settles diagnosis, drift and existing pages. The blind comparison must include corpus-to-document cases: on a pure sentence rewrite, authoring is the benchmark plus a style sheet and cannot be far better.
