# Authoring Design: Minimal Proposal

## Approach

Most open points already have an answer in `decisions.md` or `retention.md`, which the design states where the build will read the answer. The rest take the smallest rule that works: one part list per plan form, one question batch on both paths, one word count per file and one flag on the prose check. A point the MVP works without is deferred with the event that reopens the point. The prose check's behaviours stay in `decisions.md`, which the design cites, so no rule gets a second home.

## Resolutions

### Design Questions

| Item | Resolution | Reason |
| --- | --- | --- |
| 1. Purpose and reader | The document part holds the reader, the purpose, the questions and the governing thought. The purpose is what the reader must know or do after reading, so two names become one part. | One part, one test. |
| 2. Document type | A plan part at the Document level. | Stage 2 and the arrows depend on the type. |
| 3, 5, 11 and 14 | No question. The design already places sentence patterns in `checks.md`. `decisions.md` settles headings: wording stands, hedy fixes title case, authoring rewords FAQ voice. `retention.md` keeps explain-and-rewrite steps 1 to 3 and 6, and drops the rule's digest. | The answers exist. |
| 4. Term list | One team-wide list in `checks.md` with three kinds of row: a replaced name with its preferred name (Fix), a term to avoid with its repair (Change), and a registered proper noun that passes the word rules, such as `CDP Portal`. | `decisions.md` keeps one list, and a register in a checker serves as exemption. |
| 6. Intent and growth limit | Neither. Every addition gives its reason, and the hand-over shows the counts. | `retention.md` drops clarify and distil. |
| 7. Question form | The point the plan leaves open, two to four options each with a preview sentence, and the recommendation first. Both paths send one batch, and the draft holds a bracketed placeholder meanwhile. | The fields match the prompts Ben already uses. |
| 8. Seam checks | Part of the closing pass, as `retention.md` places them. The line-edit path also runs the closing pass. | A removal strands joins and pronouns, and a line edit removes. |
| 9. Map by intent | Required when the hand-over names more than one file. | A file count needs no judgement. |
| 10. Restatement test on a line edit | Applies on both paths. A dropped sentence is noise and goes as a whole unit, unless the author supplied the sentence. | One definition of noise. |
| 12 and 18. Plan check on short forms | `plan-template.md` gives each form its part list, and a plan names its form in its first line. `hedy plan check` tests the full and line-edit forms. The artefact path runs no plan check in the MVP, and the model asks for a missing purpose or point. | A file check for a two-line plan costs more than the defect. Reopen when an artefact ships without a purpose. |
| 13. Word counts | One count per file over the masked text. Before is the HEAD version, or zero for a new file. | HEAD is already the baseline for introduced hits. |
| 15. Turn-end hook scope | Every Claude Code session, on files in the rule's paths. | A skill-active flag adds state for no gain. |
| 16. Document-type pairs | One paragraph of a type, in the wrong person, mode or tense and then the right one. | A whole document is too large for a pair. |
| 17. Short plan for a line edit | The author writes the short plan. | Decision 5. A reverse outline is document-planning's work. |
| 19. Jira wiki markup | Not part of the form. `SKILL.md` holds why, what and constraints, and the jira skill owns the markup. | Markup is the delivery tool's concern. |

### Conflicts

| Item | Resolution | Reason |
| --- | --- | --- |
| The twelve conflicts not listed below | The design, or the side the map recommends, stands. | The losing side belongs to the deleted estate or contradicts decision 7, decision 12 or the Left Out list. |
| DC:121 against CE:84-94, DC:123 against GR:57 | No conflict, and settled by question 5. CE:94 goes with L-13. | none |
| LG:34 against design.md:106 | The design changes: the order from claim to mechanism to consequence applies to an explanatory paragraph. | A reference or how-to paragraph has no mechanism to explain. |
| DC:80 against JS:39-40 | The ticket form bars the how. | See Owner Decision 2. |
| PR:24 and CM:16 cite the editorial skill | Repointed to authoring in the delivery plan, with no design change. | A citation edit outside the five files. |

### Unplaced Rows

| Item | Resolution | Reason |
| --- | --- | --- |
| Every other "add" row for `writing.md` or `line-editing.md` | A named place in the Read List below. | `retention.md` places every one. |
| ES:137-139 | No new home. "Every addition gives its reason" covers a boundary added against a false inference. | An existing rule covers the case. |
| GR:86 and RB:25 | One repair: a change is made only where the reader gains, and the edit stops when a pass finds nothing new. | The two rows state one threshold. |
| RB:37, DC:125 | The exemption goes in `line-editing.md`. The upkeep rule goes in `design.md`. | `retention.md` places both. |
| DC:161, DC:165-167, DC:178 | `checks.md` gains an allowed-forms column. The design cites "Check Requirements" in `decisions.md` for the behaviours and the acceptance tests. | A restatement makes two homes for one specification. |
| DC:171 | `hedy prose check --all` reports every hit on the page. | `decisions.md` requires the mode, and the design has no way to ask for the mode. |
| DC:130, EP:25-32 and every drop row | Not placed. | `retention.md` and the map leave them out. |

The Gaps need no design change: each is content written later, except H-01, which questions 12 and 18 answer.

## Design Changes

### The Files

Amend the "Data It Holds" column:

- `SKILL.md`: the restatement test "for both paths", explain and rewrite "in steps 1 to 3 and 6", the question form "and its batch rule", the closing-pass checklist "with the seam checks", the hand-over report "with a map by intent when the hand-over names more than one file", and the "content" forms of the three artefacts.
- `line-editing.md`: add "the threshold and stop condition for any change, and the exemption for code and quotations".
- `plan-template.md`: "the parts of a plan in three forms, full, line edit and short artefact, each with its part list, and one worked plan".
- `checks.md`: each check carries "its action, its repair and its allowed forms", and the term list holds "preferred names, terms to avoid and registered proper nouns".
- `hedy plan check`: "the part list of the form the plan names, for the full and line-edit forms".

### Writing a Document

Stage 4 requirement: "nothing the plan leaves open is guessed, and every question reaches the author in one batch".

### Line Editing a Document

Stage 2 "Reads or Runs": "`line-editing.md`, the restatement test in `SKILL.md`".

Replace stage 5 with: "5. Closing pass, mechanical check and hand over | as stages 5 to 7 of writing a document, with the check over the whole page | A removal strands joins, and the line edit brings the page to the standard | as above, with `hedy prose check --all`".

### Writing a Short Artefact

Stage 1 "Reads or Runs" adds: "the model asks for a missing purpose or point".

### Content, Expression and Mechanics

Document row: "the reader, the purpose, meaning what the reader must know or do after reading, the document type, the questions the page must answer, and the governing thought".

### The Read List

Replace the five section bullets of `writing.md`:

- **Tone of voice:** as now, plus natural prose over compressed idiom, a standard pattern introduced as plain framing with the system-specific part named, and the worst case written with each assumption's consequence if the assumption is false.
- **Paragraphs:** one job, a first sentence that states the claim, the order from claim to mechanism to consequence in an explanatory paragraph, the joins, a rule kept beside its qualification, no restatement of a rule that has a home elsewhere, and the definition of a finished paragraph.
- **Sentences:** as now, plus a stable subject, cause words that name the relation, varied sentence length, expansion on first use with one name for one thing, no working codes in reader-facing prose, and capitalisation, numbers, dates and inclusive terms.
- **Document types:** as now, plus a decision record states requirements, not design, a document is a snapshot, not a changelog, and slides and explainers show the release design.
- **Forms:** as now, plus headings as concrete noun phrases, bold lead-ins over deeper headings, structure in proportion, at most two links and no pointer sentences, links that resolve, diagram notes numbered under the image, code font and fences, and one line per paragraph outside commit messages.

Replace the plan bullet's list with: "the form, the reader, the purpose, the document type, the questions, the governing thought, the sections with their points, forms and material, and the open items with the author's answers".

Add to the `line-editing.md` bullet: "The tests include a missing explanation, a suspect claim, and an undecided choice, which raises a question. The repairs include the split at the seam, a moved condition that keeps every word, and a change only where the reader gains. Code and quotations are exempt. Headings keep their wording, and the checks still apply."

Add after the list: "Rules in `writing.md` and `checks.md` stay general. A rule that serves one document set is a note in that set's plan."

### The Scripts and Triggers

- `hedy plan check`: input "a plan in the full or line-edit form", output unchanged.
- `hedy prose check`: input adds `--all`, which reports every hit on the page. Counts are per file over the masked text, with HEAD as before. Add "The check behaves as 'Check Requirements' in `decisions.md` specifies."
- The turn-end hook: input "the files in scope the session changed, in every Claude Code session".
- The house-standard rule: output adds "and carries no drafting digest".

### Later

Add: "A plan check for the short-artefact form waits until an artefact ships without a purpose."

## Owner Decisions

1. **The line edit as the page's mechanical edit.** With `--all`, a line edit clears every hit on the page, including old ones the author left. Without the flag, an edited page keeps its old hits, and stage 6's requirement that no banned form remains is false for line edits. Recommendation: run `--all` on the line-edit path.
2. **The jira skill's proposed-work section.** The ticket form forbids the how, and the jira skill asks for proposed work. Recommendation: remove that section when authoring ships, as an edit outside the five files.

## Effect

The design closes every open point with no new file, one plan field, one table column and one flag, and each rule keeps one home. It gives up a per-paragraph growth signal, a plan check for short artefacts, term lists for each document set, and authoring drafting the short plan. The last loss costs the most: every line edit needs a short plan from the author, and the thin slice tests only the writing path, so line-edit friction stays unmeasured until a real line edit runs. The five files, the two commands and the triggers hold.
