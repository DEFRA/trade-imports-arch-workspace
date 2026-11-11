# Authoring: Decisions and Requirements

This record holds the decisions Ben made on 4 Nov 2026 for the authoring skill, the preferences the skill must retain from the editorial estate, and the requirements for its checks. `design.md` holds the design. A decision here is settled and is not put to Ben again.

## Product Goal

In Ben's words, the product is "an assistant in creating a better process for curation of analysis, and planning of documents, and more consistent application of the team's 'what good looks like'". It serves the team's architects and engineers, for new documents and for edits of existing ones. It makes no promise about the author's time.

The product is two related skills, built in order. The authoring MVP comes first and writes from a plan the author agrees. document-planning, which curates the analysis into that plan, comes afterwards.

The benchmark is the british-technical-writing skill, given the same raw sources:

| Goal Part | Measure |
| --- | --- |
| Planning of documents | The author agrees the plan before any drafting |
| What good looks like, mechanically | No check hits at commit |
| What good looks like, as read | Ben, reading blind, judges the document clearer than the benchmark's and judges that it delivers the required information |
| Edited, not rewritten | The author accepts the edits and queries |
| Curation of analysis | Measured when document-planning exists |

The skill ships only when Ben judges its output ten times better than the benchmark's. Otherwise the skill is deleted like the estate.

Guardrails: the skill stays within a size budget, hedy holds all code, and every signal drives an action.

Non-goals: grading or scoring documents, producing review findings, checking a document's correctness against the world, and choosing the material for the author.

Every part of the design and every step of the plan moves one of the measures or holds a guardrail. A part that does neither is out of scope.

## Decisions

1. The authoring skill replaces the editorial estate: the editorial, editorial-triage, editorial-help and design-consistency skills, the editorial, editorial-triage, editorial-help, editorial-metrics and design-consistency tools, and `check-prose.sh`. All of the estate's code is deleted. Keeping any of the code would be loss aversion.
2. Only text is retained: prompts, guidance, word lists, replacements, the voice and the examples. The retained text is listed under "Retained Preferences".
3. Earlier evaluations asked which version was better, never whether either was good. The skill is judged first by its deterministic checks, which must pass, then by a human reader, because only a human reader can judge whether the writing is clearer and delivers the required information. No model acts as a cold reader. Ben is the only human reader.
4. The material and the structure decide a document's quality before drafting starts, so the plan comes before any drafting.
5. The human chooses the material and agrees the plan, and the skill assembles the document. Until document-planning exists, the author writes the plan from the plan template.
6. Planning is a workflow inside the `authoring` skill, not a skill of its own. The planning workflow reads the material the author points at, holds the planning conversation and writes the plan: a clear purpose, the document's structure, and the level of detail to take from the material. Drafting goes to a fresh agent that receives only the plan and `writing.md`, which is what keeps the material out of the drafting. The planning conversation serves pages and slide decks. Short artefacts keep the short plan. Planning becomes a skill of its own only when something other than authoring needs the planning workflow.
7. Authoring is about authoring. Fact checking and the synthesis of analysis are separate processes, and neither skill takes on either role.
8. The levels of edit are structural, line and mechanical, after Van Buren and Buehler and after Rude and Eaton, named as working editors name them. A structural edit is document-planning's work, a line edit is authoring's, and a mechanical edit is hedy's.
9. Vale is an approved dependency, called through hedy.
10. hedy holds all code and deterministic behaviour.
11. "Explain and review" and "explain and rewrite" name the same procedure, held in the skill's `SKILL.md`.
12. Every signal from a check leads to an action. The checks have two actions, Fix and Change, with no warnings, no exception records and no document score.
13. Vague and subjective words are Change. An imprecise rule is narrowed or deleted.
14. The inventory-opener rule is deleted. The plan settles each opening instead.
15. The per-rule actions under "Check Requirements" are accepted without a measurement trial.
16. The product makes no promise about the author's time.
17. Colleagues who use other AI tools are in scope at commit. Any agent reads the skill as a procedure. The checks reach them through the git hooks, which need hedy and Vale installed by `make`. The write-time and turn-end checks stay Claude Code only.
18. The british-technical-writing skill stays unchanged as the benchmark, and none of its content is mined into the authoring skill. Its content is already folded into the retained voice, so nothing is lost. Ben generates or edits versions of a document with each skill independently and compares them.
19. The work stays on the `authoring-voice` branch. At the end, the history is rewritten into three commits: the editorial estate removed, hedy introduced, and the authoring skill added. Ben force-pushes the rewritten branch to the pull request.
20. The trial writes documents from plans agreed in a planning conversation, drawn from the material the author points at, and line edits one existing page.
21. Round one of the trial, on the INS Event Design page, settled the skill's value on 10 November 2026. The skill beat british-technical-writing on structure and on images that illustrate the big ideas. Once both wrote from the same plan, the prose was close to identical, so the writer makes little difference and the planning step is where the skill earns its place. The skill is kept, because it serves editing as well as authoring.
22. Planning uses a walking skeleton: plain-label headings, each section's point and two to four delivery lines, agreed with the author before any material is selected. Each delivery line then needs material behind it, so a gap reaches the author during planning, not after drafting. Round two of the trial starts the planning cycle again from a clean start, on a new set of comparison documents.
23. Round two, on the INS Event Design page, closed the trial on 10 November 2026. Ben judged the skill's page a big improvement, and banked the work without running the other test cases. The line-edit path is therefore untested on a real page. The comparison measured the planning and the writing together. Both writers followed the house voice, so the pages differed in plan, structure and images, not in voice. The skill's page also had the orchestrating session as a second reader. Most of the corrections were content that both pages needed, and planning had not caught them before drafting.
24. The cutover deletes the estate and its prose gate with no replacement, decided on 10 November 2026. `hedy prose check` and `hedy plan check` are deferred, and Ben decides later whether to build them. The old `check-prose.sh` is not moved or kept. Its word table and its 41 golden cases are preserved as data in `workareas/technical-authoring/gate-data/`, so a later check can take them as its rows and acceptance tests. Until then the plan is read against `plan-template.md` and the closing pass in the authoring skill is the prose check.
25. The planning workflow stays as it is. A proposed check, putting each statement about what a party outside the author's control does or must do to the author, was declined.
26. The banned words, phrases and sentence shapes are part of the authoring skill, as `references/language.md`, decided on 11 November 2026. Decision 24 preserved the word table and the golden cases as data that nothing read, and the editorial and writing skills had been consolidated so that the language could be enforced in one place. `language.md` holds the 39 rows of the old table as banned words and words to examine, with their repairs and without tiers, one new row for `earned` and its forms, and the sentence shapes the old gate checked, each as a rule with its repair. The skill reads the file with `writing.md` before drafting, editing or writing a short artefact, `writing.md` points at the file, and the closing pass applies every row by reading. A later `hedy prose check` parses this file directly, as the old gate parsed the table, so no derived file exists, and the copy in `gate-data/word-table.md` is deleted because one file is easier to maintain than two. The golden cases stay as the check's acceptance tests.
27. `hedy prose check` is built in rounds with a stop rule, decided on 11 November 2026, and the plan is `hedy-prose-check-plan.md` in this workarea. Round 1 builds the check over files and standard input: the two word tables, the old gate's masking and matching, and five literal sentence shapes. Round 2 runs the check over this repository, the docs repository and the last 50 commit messages, and reports the number of findings for each row and each shape. Round 3, the old gate's eight regular-expression shapes, runs only if round 2 changes what Ben does. The work stops at the first round whose findings Ben does not act on. Ben answered the plan's two questions before round 1 started. A banned word or a sentence shape fails the run: the envelope holds `ok: false` and one `PROSE` error that names the counts, the exit code is 1, and `result` still holds every finding, the words to examine included. The parser reads two fixed phrases in a Term cell, "documents for people only" and "in lower case", so the `you` row applies only to documents for people and the `portal` row matches only lower case. No row of `language.md` changes, and one sentence in its preface names the two phrases.

## Retained Preferences

Each item survives into the new skill, stated once, without finding schemas, severity grades, move codes or invented rule names.

### Tone of Voice

- `authoring-voice.md`: the register, the steps before the first word, the drafting steps, the two exemplars and the known habits.
- `language.md`: "Voice and tone", "Register", "Evidence and attribution", "Just Enough" and "Technical usage".
- `voice-examples.md`: the seven before-and-after pairs.
- Preferences held only in agent memory, to be written into the shared text:
  - Natural prose is preferred over compressed idiom.
  - A standard pattern is introduced as plain framing, with the system-specific part named and no scattered citations.
  - The worst case is written, not the typical case, with each assumption's consequence if the assumption is false.
  - Slides and explainers show the release design, not current gaps.
  - Reader-facing prose carries no working codes such as A-01.

### Structure

- `language.md`: "Sentences and paragraphs", "The whole document" and "Headings, lists and tables". The "Paragraph Restatement Test" is replaced by a reverse outline that names each sentence's job, decided on 5 November 2026, because a summary drops the conditions and concrete instances the writing guide requires. The aim stays: length earns its place, and padding goes.
- `document-types.md`: the structural forms, the document shapes and the fixed-format artefacts.
- `authoring-voice.md`: "Structure as a Choice".
- `snapshot-authoring.md`: a document is a snapshot, not a changelog.
- `layer-cards.md`: the paragraph, page and set questions, without the output schemas, as checklists for line and structural editing.
- Preferences held only in agent memory:
  - A page holds at most two links and no pointer sentences.
  - Diagram notes are numbered in the markdown under the image, never drawn inside the image.
  - Each section or slide has one agreed sentence before drafting.
  - An ADR states requirements, not design.
  - A ticket states why, what and constraints, never how.
  - A large output ends with a map by intent.

### Explain and Rewrite

- `explain-and-rewrite.md`: the steps and the modes.
- `clarify-examples.md`: the five calibrated verdicts.
- The review brief's "Compression patterns", minus the inventory opener.
- `language.md`: "Reader-pays compression", "Write it forward", "Actors and voice", "References and pronouns" and "Verbs and noun stacks".

### Words, Replacements and Names

- `language.md`: the "Words to avoid or examine" table with its repairs and docs scope, "Punctuation and formatting", "Terms and abbreviations", "Capitalisation, numbers, dates and inclusion" and British spelling.
- `ubiquitous-language.md`: the register of proper nouns.
- The INS Auth `editorial-profile.md`: the reader, run notes and preferred names become the style-sheet format.

### Editing Judgements

- The heuristics in `grading-rubric.md`, without moves or verdicts:
  - Judgements are removed, not qualified (H-01).
  - Undecided mechanisms are not described (H-02).
  - A missing explanation is first a suspect claim (H-03).
  - Pointers are removed by default (H-04).
  - Rules are not restated at their instances (H-05).
  - An undecided choice is not asserted (H-07).
  - A guess is never applied (H-13).
  - The document's own tallies are removed (H-18).
  - A whole unit is removed or the sentence is reworded, and no fragment is cut (H-19).
  - Sentences that narrate the document are removed (H-21).
  - A passage is shortened only by removing whole units (H-23).
  - A paragraph is split at the seam, and a list keeps the same words (H-25, H-26).
  - Framing is restated as the consequence the passage supports (H-27).
  - An unclear reference takes the name the source establishes, or becomes a query (H-28).
  - A condition moves before what the condition governs, keeping every word (H-31).
  - FAQ voice is always reworded (H-32).
- The review brief's "Rules for every reviewer": revision narrative is residue, and code and quoted examples are exempt.
- Preferences held only in agent memory:
  - The author's supplied wording is final copy.
  - The author's cuts are deliberate and are never restored.
  - The author's headings keep their wording, and the checks still apply: title case is fixed automatically, and a heading in FAQ voice is reworded.
  - Rules stay general, never specific to one document set.

### Working With Ben

- Decisions are put as question prompts with previews, stating what is kept or changed.
- Quality is judged by a blind pick of the best of up to three versions.
- Every edit reports its word count before and after.
- Hard wrapping is for commit messages only.

## Check Requirements

### Fix Rules

The check rewrites the text:

- Curly quotes become straight quotes.
- Replaced names become the term list's preferred names. The check keeps capitals and plurals, and reports each renamed heading, because the heading's anchor changes.
- Headings become title case. Every word is capitalised except `a`, `an`, `the`, `and`, `but`, `or`, `nor`, `for`, `of`, `in`, `on`, `at`, `to`, `by`, `as`, `via`, `vs`, `with`, `from`, `into` and `per` after the first word. The term list's lowercase product names are left unchanged.

### Change Rules

The check blocks until the text changes:

- Em dashes and spaced en dashes.
- Every row of the "Words to avoid or examine" table, including the vague and subjective words.
- Lowercase generic `portal`, where the proper noun `CDP Portal` passes.
- `N/A` in any case.
- A sentence or line ending on the pronoun `it`, where the abbreviation `IT` passes.
- FAQ voice in a heading, a table header cell or a bold lead-in: an opening on `what`, `how`, `which`, `when`, `where`, `why`, `who`, `whom`, `whose` or `whether`, or a heading ending on a question mark.
- FAQ voice opening a sentence, list item or cell: `What`, `How`, `Which`, `Why`, `Whether` or `Who`. The words `When` and `Where` pass, because they open conditions.
- A table header ending on a preposition, such as `Set by`.
- The contact clause, such as `only the front door reaches`.
- Three or more spaced hyphens used as asides in one sentence.
- A spaced hyphen used as a sentence break.
- A semicolon in body text.

No exception records exist, so a false hit can only be cleared by rewording correct text. Every rule is narrowed before release. Each legitimate use a word-table row names, such as `a meeting agenda`, `a numeric counter`, `an input focus` or `a release promotion`, becomes an allowed form, or the row is split or deleted. Each narrowed rule is proven to pass its own allowed forms.

### Behaviours

- Fenced code, inline code including double-backtick spans, blockquotes, URLs and front matter are masked, and line numbers are preserved.
- Table rows, list items and HTML entities are exempt from the semicolon rule. Table rows, front matter and list markers are exempt from the spaced-hyphen rule.
- Rows marked `docs` skip agent-instruction files: any path under `.claude/`, plus `CLAUDE.md` and `AGENTS.md`.
- One team-wide term list in `checks.md` holds the preferred names and terms. A term list for each document set waits until two sets need different names for the same thing.
- The word table is validated. A form holds only letters, digits, spaces, hyphens, apostrophes and a trailing `*`, and never a regular expression.
- Each hit names the matched text, the repair and the source rule.
- Writes and commits block only on hits the change introduced, compared with git HEAD. A mechanical edit treats every hit on the page as the edit's work list.
- The checks run at five points:
  - every Write or Edit in the authoring-voice rule's paths
  - turn end, which blocks while a hit the session introduced remains
  - pre-commit, on staged markdown
  - commit-msg
  - `create-pr.sh`, on the pull request title and body.
- The 34 prose-gate test cases under `tools/editorial/tests/` and the names-check case become acceptance tests before the old code is deleted.

## Open Decisions

None. The question of what the proof compares closed with decision 23: the trial compared corpus to finished document, so the result measured the plan and the skill together.
