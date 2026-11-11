---
name: authoring
description: 'Plan a new technical page or slide deck with the author from the material the author points at, then hand the drafting to a fresh agent that writes only from the agreed plan; line edit an existing page against a line-edit plan; or write a short artefact (a pull request body, a ticket or a commit message), all to the house writing standard. Puts every open point to the author as a question in one batch, and hands over the word counts and open questions. Triggers: "/authoring", "plan a page", "plan a deck", "help me plan this document", "write this page from the plan", "draft the document from my plan", "line edit this page", "write the pull request body", "write the ticket", "write the commit message". NOT for choosing the material, fact checking, synthesising analysis, review findings or scores, creating the pull request, commit or Jira issue itself (pr, commit, jira), or Mermaid syntax (mermaid-check). Distinct from /init, which scaffolds CLAUDE.md.'
---

# Authoring
authoring plans a new page or slide deck with the author, hands the drafting to a fresh agent that writes from the agreed plan, line edits a page that has a plan, and writes short artefacts, applying the team's standard the same way every time. The plan is the only source of content for drafting. A point the plan does not support goes to the author as a question and is never filled by you or the drafting agent. authoring does not check facts or synthesise analysis: the author chooses the material and owns every judgement about content, including whether a claim is true.

**Bash call hygiene:** one command per Bash call, and paths relative to the workspace root, such as `.claude/tools/...`. Full rules: [agent-skills.md](../../best-practices/skills/agent-skills.md).

## Routing

| Request | Path |
| --- | --- |
| A new page or slide deck with no agreed plan | Planning a Document, then Writing a Document |
| A new document with a full plan the author agrees | Writing a Document |
| An existing page whose wording needs improving | Line Editing a Document |
| A pull request body, a ticket or a commit message | Writing a Short Artefact |

An existing page that needs sections added, removed or reordered needs a structural edit, which is planning: the page and its material go through Planning a Document, and the page then follows the writing path. A plan the author wrote by hand from [plan-template.md](assets/plan-template.md) goes to Writing a Document once the plan passes its check.

## Read List

- Always read [writing.md](../../best-practices/writing/writing.md) in full before writing a word.
- Always read [language.md](references/language.md) with `writing.md`: the words, phrases and sentence shapes ruled out, each with its repair.
- Read [planning.md](references/planning.md) when planning a page or deck, before reading the material.
- Always read the plan before drafting or editing: its form, reader, purpose, document type, opening, governing thought, detail rule, exclusions, questions, sections with their delivery lines, and open items.
- Read [line-editing.md](references/line-editing.md) only when line editing, after reading the page and its plan.
- Read [plan-template.md](assets/plan-template.md) when a plan is written or proposed, and when checking a plan.

The material stays with the planning conversation. The drafting agent reads the plan, `writing.md`, `language.md` and the drafting sections of this file, and holds no analysis corpus, no neighbouring page and no summary of the conversation.

## Checks

- The plan is checked by reading the plan against [plan-template.md](assets/plan-template.md) before drafting or editing. Drafting or editing stops on any missing part, which goes to the author.
- No script checks a draft. The prose gate was removed on 10 November 2026, its word table and sentence shapes live in `language.md`, and whether hedy gains a prose check that reads that file is a later decision.
- The closing pass is the check. Every rule in `writing.md` and every row in `language.md`, such as the banned words, headings in title case and FAQ voice, is applied by reading.

## Planning a Document

Follow [planning.md](references/planning.md). The planning conversation reads the material the author points at, agrees the plan with the author through question prompts with previews, and writes the plan beside the material. Planning ends when the author agrees the plan and the plan passes its check. A slide deck follows the same conversation, with one section per slide and one point per slide.

## Writing a Document

1. **Start.** Read the plan against `plan-template.md`, and draft only from a complete plan, as the template's completeness rules define. On any missing part, stop.
2. **Hand the drafting to a fresh agent.** Start the drafting agent with the Agent tool and give the agent a name with the tool's `name` parameter, so that stage 3 can send the author's answers to that agent. The brief gives five paths: the plan, `writing.md`, `language.md`, this `SKILL.md` and the path for the draft. The brief tells the agent to read the plan, `writing.md` and `language.md` in full, to read only "The Drafting Brief" and the sections that brief names from `SKILL.md`, and to read no other file except through the mermaid-check skill. The brief carries no material, no summary of the planning conversation and no fact of your own, because drafting writes only from the plan.
3. **Questions.** The agent returns the draft with its open points. Put every open point to the author in one batch, in the question form, and record each answer in the plan's Open Items. Send the answers to the named agent with SendMessage, so the agent replaces each placeholder from the plan and runs the closing pass again. An answer that changes a section's point reopens the plan: return to Planning a Document, then start a fresh drafting agent from the changed plan.
4. **Hand over.** Write the hand-over report from the word count and open points the agent returns.

## The Drafting Brief

You draft one document from its plan. Read the plan, `writing.md` and `language.md` in full. From `SKILL.md`, read only this section and the sections listed here: "Checks", "The Reverse Outline", "Explain and Rewrite", "The Question Form", "The Closing Pass" and "Resolving a Standard Breach". Read no other file except through the mermaid-check skill. Write the draft to the path the brief gives.

1. **Draft each section.** Write the introduction from the plan's `Opening` and `Governing thought`: the situation, then the complication, then the governing thought. Each section makes its point from its own items and nothing else, in the form the plan chose, at the plan's detail rule, and leaving out what `Excludes` names. Write each section to its delivery lines, roughly one paragraph for each line. Each paragraph opens on the claim the rest of the paragraph supports. Write to the tone of voice, the plan's document type and the plan's forms in `writing.md`. Where the items do not support a point, put a bracketed placeholder in the draft and add the point to the questions. Never invent a fact.
2. **Draw each image.** Draw each image the plan describes as a Mermaid diagram, from the section's items and the image's stated purpose, and check each diagram with the mermaid-check skill. That skill is the one procedure you load beyond the files this brief names.
3. **Check each paragraph.** Run the reverse outline on every paragraph, and explain and rewrite on every sentence a reader would have to reconstruct.
4. **Closing pass.** Run the closing-pass checklist on the whole document.
5. **Read against the standard.** Read the whole draft once against the word, heading and punctuation rules in `writing.md` and every row in `language.md`, and reword each sentence that breaks one.
6. **Return.** Return the draft's path, its word count and every open point in the question form. Ask the author nothing, because the session that started you puts the questions.

## Line Editing a Document

1. **Read.** Read the page, then propose a line-edit plan in the line-edit form from the page itself, adding no point the page lacks. Edit only after the author agrees the plan and the plan reads complete against `plan-template.md`. Read `writing.md` and `language.md`, then `line-editing.md`.
2. **Find defects.** Run the tests in `line-editing.md` and the reverse outline on every paragraph and sentence. List each defect before you change anything.
3. **Edit.** Change only paragraphs with a found defect, using the repair rules in `line-editing.md` and explain and rewrite. Improve how each point is said and change no claim. A sentence with no job that carries a claim goes to the author as a question. Stop when a pass finds nothing new. Edit the file in place and commit nothing, so the author reads the line edit as a diff.
4. **Questions.** Put every question to the author in one batch, in the question form. Record each answer in the plan's Open Items, then replace the placeholder with the answer.
5. **Closing pass and hand over.** Run the closing pass on the whole page, then read the whole page once against the word, heading and punctuation rules in `writing.md` and every row in `language.md`, and reword each sentence that breaks one. Write the hand-over report, which lists each addition and each removal with its reason.

## Writing a Short Artefact

1. **Start.** Settle the artefact's purpose and points in the short-artefact form. When the purpose or a point is missing, ask the author. No file check runs.
2. **Draft.** Write the content of the artefact's type, as "Artefact Content" sets out below.
3. **Check.** The artefact meets the same standard as a page: read the artefact against `writing.md` and `language.md` and reword each sentence that breaks a rule or holds a listed word. `create-pr.sh` refuses only AI attribution.

## The Reverse Outline

State the paragraph's point in one sentence. Then name each sentence's job against that point: claim, mechanism, evidence, condition, consequence or join. A sentence with no job is a removal candidate. When drafting, remove the whole sentence. When line editing, remove a sentence with no job that carries no claim, and send a sentence with no job that carries a claim to the author as a question. Never rewrite the paragraph shorter, because a condensation makes you the author of wording the page never had. Sentence length on its own is never the defect.

## Explain and Rewrite

Use this procedure on a sentence a reader would have to reconstruct, on a compression defect, and when the author asks for a rewrite. The procedure never changes a claim.

1. **Explain.** Write the sentence's meaning in plain words, as if the reader had asked what you meant. Mark every part of the explanation that the source does not establish, because an explanation is generated text and can add claims the source never made.
2. **Compare.** List the claims the source holds: every quantity, condition, modal, exception and relation. A part of the explanation outside that list is dropped or goes to the author as a question. Nothing in the list may go.
3. **Rewrite.** Write the candidate from the supported part of the explanation, in simple language and the house voice. Check each sentence against the sentence rules in `writing.md`, and explain and rewrite each sentence that still fails. Stop where a further explanation would need a guess, and put that part to the author.
4. **Decide.** Keep the candidate only when the candidate keeps every claim and the reader gains. Otherwise keep the source, which is a normal outcome. A failed attempt never widens the edit to the paragraph or the page.

## The Question Form

Each open point becomes one question: a point the plan leaves open, a point the items do not support, a guess, a dropped claim, a reference or condition scope the text does not settle. Each question carries:

1. The open point in one or two sentences, with its place in the draft.
2. Two to four options, each with a preview sentence showing how the draft reads under that option.
3. The recommendation first, labelled "(Recommended)", or a statement that the evidence favours no option.

While a question is open, the draft carries a bracketed placeholder at the point, such as `[open: retention period for event IDs]`. Collect every question and put the questions to the author in one batch at the questions stage, never one at a time while drafting. The question tool takes a few questions per call, so send the calls one after another with no other work between them.

## The Closing Pass

Read the whole document as one text, then check each item:

1. The page answers each of the plan's questions, and the sections support the governing thought.
2. The opening states the page's point.
3. Each section joins to the section before, with no repetition between sections.
4. Every pronoun still resolves after any removal.
5. No removed unit stranded a transition.
6. A fact repeated on the page has one home.
7. A table or diagram and the prose beside the table or diagram keep distinct jobs.
8. The page reads in one voice.
9. No two statements on the page contradict each other. Two statements that cannot both hold go to the author as one question quoting both statements, and the drafting agent never resolves the pair by choosing one.

Repair each failure as one local edit, then run the reverse outline on the changed paragraph.

## Resolving a Standard Breach

When reading finds a word, heading, punctuation mark or pattern that `writing.md` or `language.md` rules out, reword the sentence that holds the breach with the repair the rule or the row gives. Never delete a fragment to clear a breach. Read again until a pass finds nothing new. A breach in an author's heading is reworded too, and every renamed heading goes in the hand-over report.

## The Hand-Over Report

Count the words of each file before your first edit, or zero for a new file, and again at the end. `wc -w` gives both counts.

```
authoring complete: <writing | line edit | short artefact>.

Files: <path>: <words before> to <words after> words
Renamed headings: <old> to <new>, or none
Additions and removals: <each added or removed unit with its reason>, on a line edit
Open questions: <each question still open>, or none
Checks: plan read against the template <pass>, closing pass against writing.md and language.md <pass>
Nothing committed.
```

When the report names more than one file, end with a map by intent: one line per task, in the form "To <task>, read <file>, <part>".

## Artefact Content

**Pull request body.** A reviewer reads the body without having seen the branch or the conversation. The title follows the commit subject rules below. The body has three sections under these headings:

- **Change:** the change made, led by the outcome.
- **Reason:** the problem or need, with a link to the ticket when one exists.
- **Verification:** the commands run and their results, including any failure or skipped step.

The pr skill creates the pull request through `create-pr.sh` with `--body-file`.

**Ticket.** A team reads the ticket to do the work. The summary is specific and under 80 characters. The description states why the work is needed, what outcome it must reach with its scope and acceptance criteria as observable outcomes, and the constraints, and never how to do the work. Exact identifiers and interface labels stay as written. Draft the ticket in markdown for the author to approve, and the jira skill writes the ticket in Jira wiki markup.

**Commit message.** The history reads the message. The subject reads `<type>(<scope>): <Imperative summary>`, with a conventional type such as `feat`, `fix`, `docs` or `refactor`, at most 50 characters, capitalised, in the imperative and with no full stop. A body is added only when the subject cannot carry the meaning. The body explains why and leaves the what to the diff, wrapped at 72 columns.

No pull request body, ticket or commit message carries AI attribution or emojis.
