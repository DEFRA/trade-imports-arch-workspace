# Authoring: Practitioner Proposal

This proposal resolves the open points of `design.md` for a design page, a line edit of a colleague's page, and a pull request body.

## Approach

`retention.md` and `decisions.md` already answer most of the 19 questions, so the design needs to state each answer where a model will look. The rest sit where a model goes wrong: a section with no material invites invention, a line edit with no stop condition invites churn, and an unstated reason for an addition invites padding. Each resolution makes one of those failures visible to `hedy plan check` or to the author in the hand-over. No file, stage, finding or score is added.

## Resolutions

| Item | Resolution | Reason |
| --- | --- | --- |
| Q1 purpose and reader | The reader and the purpose are separate plan parts. The purpose is what the reader must know or do after reading. | `hedy plan check` tests parts by name. |
| Q2 document type | A plan part at the Document level. | The draft cannot choose person, mode and tense without the type. |
| Q3 sentence patterns | No question: `checks.md`, earlier `words.md`, holds the patterns. | design.md already says so. |
| Q4 term list | One team-wide list in `checks.md` with three kinds of row: prefer-and-avoid terms, preferred names, and proper nouns that pass unexpanded. | retention.md places all three there. |
| Q5 headings | The wording stands. hedy fixes title case and reports each renamed heading, and authoring rewords FAQ voice. | The report protects links into a colleague's page. |
| Q6 intent and growth | No intent. The hand-over lists each addition with its reason. | A model believes its own additions justified. A written reason lets the author judge. |
| Q7 question form | A question names the plan point, the gap, the options with a recommended default, and the draft's placeholder. Every path asks in one batch. | Fixed fields stop vague questions. |
| Q8 seam checks | Part of the closing pass, and run after a line edit. | A removal strands pronouns and transitions too. |
| Q9 large output | A map by intent when the output changes more than one file. | A file count needs no judgement. |
| Q10 restatement on a line edit | The test runs. A dropped sentence with no claim is removed whole, and one with a claim becomes a question. | Only the author may cut a claim. |
| Q11 explain and rewrite | Steps 1 to 3 and 6 survive. The author's reading of the diff is the claim check. | design.md must name the actor who checks claims. |
| Q12 plan parts | Each form lists its parts. The check also fails a section with no items and a question no section answers. | A section with no items is where a model invents material. |
| Q13 word counts | Prose words with code and front matter masked, for the page and each section. Before is HEAD, zero for a new file. | Per-section counts show where an edit grew. |
| Q14 rule digest | No digest: the rule names `writing.md` and holds the paths list. | retention.md settles the point. |
| Q15 turn-end scope | Owner decision 3. | The hook reaches sessions that never invoke the skill. |
| Q16 document-type pairs | One passage in the wrong mode, then the right mode. | A whole document breaks the size budget. |
| Q17 drafting the short plan | Owner decision 1. | The answer bears on the constraint that authoring does not plan. |
| Q18 plan check on short forms | Runs on every path, with `--stdin` for a short form given in chat. | The artefact path otherwise has no gate. |
| Q19 Jira markup | The ticket form holds content in markdown, and the jira skill owns the markup. | Checking wiki markup raises false hits. |
| AV:26, AV:18-53, ER:12-20, ES:75 | The design stands. | Each breaks a settled constraint: plan-only context, one home for the standard, no cold reader, a question per open point. |
| LG:34 against design.md:106 | The design changes: the claim, mechanism and consequence order applies to explanatory paragraphs. | A procedure step has no mechanism. |
| DC:168 against design.md:164 | No conflict. | One team-wide list now, one per set later. |
| DC:80 against JS:39-40 | Owner decision 2. | The jira skill lies outside the five files. |
| ES:137-139 boundary | In `writing.md`, tone. The boundary comes from the plan or becomes a question, and on a line edit is always a question. | A boundary is a claim. |
| GR:86, RB:25 stop condition | In `line-editing.md`. A paragraph with no defect stays unchanged, and editing ends when a pass finds nothing new. | Otherwise a model rewrites every paragraph. |
| DC:130, EP:25-32 and the map's drop rows | Dropped, as retention.md records. | Each is grading, planning or fact checking. |

## Design Changes

### The Files Table

- `SKILL.md`, after "explain and rewrite", add: "steps 1 to 3 and 6, with the author's reading of the diff as the claim check".
- `line-editing.md` data: "the tests that recognise defects in finished prose, the repair rules, the thresholds for any change, and the author's rights, with before-and-after pairs".
- `plan-template.md` data: "the parts of the full plan, the line-edit form and the artefact form, in the fixed shape `hedy plan check` parses, and one worked plan".
- `checks.md`, append: "Each row lists the legitimate uses it allows. The term list holds prefer-and-avoid terms, preferred names and registered proper nouns."
- `hedy plan check` data: "the parts each form must hold, a section with no items, and a question no section answers".

### Writing a Document

- Stage 4: "nothing the plan leaves open is guessed: each open point holds a placeholder, and every question reaches the author in one batch".
- Stage 5: "the page answers each plan question in the section the plan names, each claim traces to a plan item or an author's answer, no point is made twice, and the seam checks pass".
- Stage 7: "the author sees the document, the word counts for the page and each section, each addition with its reason, each placeholder with its question, each renamed heading, and a map by intent when more than one file changed".

### Line Editing a Document

- Stage 3: "the edit changes only paragraphs with a found defect, improves how each point is said, changes no claim, and leaves the author's wording, cuts and headings standing. A dropped sentence that carries a claim goes to the author as a question. Each removal leaves the seams reading." Add the restatement test and the seam checks to Reads or Runs.

### Writing a Short Artefact

- Stage 1 Reads or Runs: add `hedy plan check --stdin`.

### Content, Expression and Mechanics

- Document row: "the reader, the document type, the purpose, meaning what the reader must know or do after reading, the questions the page must answer, and the governing thought".
- Section row: "the order of the sections, the point and form of each, and the questions each answers".

### The Read List

Add to the `writing.md` sections:

- **Tone of voice:** natural prose over compressed idiom, a standard pattern as plain framing with the system-specific part named, the worst case with each assumption's consequence if false, the release design on slides and explainers, and the boundary on a correct statement that invites a false inference.
- **Paragraphs:** the claim, mechanism and consequence order limited to explanatory paragraphs, a rule beside its qualification, no rule restated at its instances, and a paragraph finished when nothing improves or can go.
- **Sentences:** a stable subject, cause words that name the relation, varied length, terms on first use, one name for one thing, no working codes, and capitalisation, numbers, dates and inclusive terms.
- **Document types:** a document is a snapshot, never a changelog, and a decision record states requirements, not design.
- **Forms:** concrete noun-phrase headings, bold lead-ins over heading depth, at most two links and no pointer sentences, numbered diagram notes under the image, code font and fences, and hard wrapping only in commit messages.

Replace the middle of the `line-editing.md` bullet: "It holds the tests: compression, framing that carries a judgement, unclear reference, noise, a missing explanation as a suspect claim, and an asserted undecided choice, which raises a question. It holds the repairs: remove whole units, never condense what stays, split at the seam, keep a list's words, keep every word of a moved condition, give every addition its reason, and turn a guess into a question. It holds the thresholds: change only where the reader gains, leave a paragraph with no defect unchanged, stop when a pass finds nothing new, and exempt code and quotations."

### The Scripts and Triggers

- `hedy plan check` output: "each missing part for the declared form, each section with no items and each question no section answers, which block drafting, and each unanswered open item, which does not block".
- `hedy prose check` output, append: "Code, quotations, URLs and front matter are masked, the semicolon and spaced-hyphen exemptions and the `docs` scope apply, and `--all` makes every hit on the page the work list of a mechanical edit. The 34 prose-gate cases and the names case are the acceptance tests."
- Closing sentence: "The git hooks reach colleagues in any AI tool once `make` installs hedy and Vale and wires the hooks, and `make check` reports a missing Vale."

### Upkeep

New section after "File Locations": "A rule in `writing.md`, `line-editing.md` or `checks.md` stays general and never encodes one document set."

## Owner Decisions

1. **The short form for a line edit or an artefact.** Recommendation: authoring proposes the short form from the page or the branch's commits, adding no point the source lacks, and edits only after the author agrees the form. No author writes a plan for a pull request body, and without agreement the model edits against its own reading of the page.
2. **The ticket form against the jira skill.** Recommendation: the jira skill drops its proposed-work section, so one ticket form exists.
3. **The turn-end hook scope.** Recommendation: every session, on files in the paths list, blocking only on introduced hits. The rule applies with or without the skill, and pre-commit blocks the same hit later at higher cost.

## Effect

Each model failure gains a check point. `hedy plan check` and the closing-pass trace catch gap filling and an ignored plan. Per-section counts, listed reasons and the stop condition catch growth. The author gives up some ease: the plan takes a fixed, parseable shape, and a line edit returns more questions, because only the author cuts a claim. `writing.md` grows by the retained rules, so the size budget is measured when the file is written. Outside the five files, `pull-requests.md`, `commits.md` and the pr skill must point to authoring instead of the editorial skill. The five-file shape holds, because every change is a row or a sentence in an existing file.
