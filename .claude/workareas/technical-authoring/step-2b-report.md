# Step 2b Report: The Planning Workflow

Step 2b created `references/planning.md` and revised `assets/plan-template.md` and `SKILL.md` in `.claude/skills/authoring/`. Nothing is committed. Every point in items 1 to 4 of the definition of done is met, and the points to review are under "Points for Review".

## Item 1: The Planning Conversation in `planning.md`

| Point | Heading Where Met |
| --- | --- |
| Reading the material before asking anything | Reading the Material |
| The three opening questions: the reader and the reader's next action, the things that matter most as a paragraph, the depth of the page | Opening Questions. The same section forbids asking for one sentence or a short list of points |
| Play-back of the reader, purpose and opening, with the main sentence as two or three options with previews | Play-Back of the Reader, Purpose and Opening. The main sentence maps to the `Governing thought` field |
| Points and their questions, derived by the editor and never asked of the author | Points and Their Questions |
| Check: `one kind of thing per level` | The Four Checks, item 1, named "One category per level" |
| Check: gaps in both directions | The Four Checks, item 2 |
| Check: terms introduced before use | The Four Checks, item 3 |
| Check: each point's consequence if false | The Four Checks, item 4 |
| Open items put to the author | Open Items |
| Storyboard: heading to the heading rules in `writing.md`, opening point, form, image with what the image shows and why, length | Storyboard |
| Detail rule naming the highest and lowest rung, and what the document leaves out | Detail Rule and Exclusions |
| The author's agreement, then the plan written beside the material and checked | Agreement and the Written Plan |
| A plan that drafting may reopen | Reopening the Plan |
| A slide deck: one section per slide, one point per slide | Slide Decks |
| Decisions as question-tool prompts with a preview sentence per option, recommendation first | the opening section, second paragraph |

## Item 2: Limits of the Role

`planning.md`, "Limits of the Role": planning reads and organises the material, and does not check facts, produce new findings from the data, write the document's prose or draw images. The section also says that a preview sentence is never draft text, and that a gap or contradiction in the material becomes an open item.

## Item 3: `plan-template.md`

| Point | Location |
| --- | --- |
| Opening in the full form | Full Form, `Opening` |
| Detail rule in the full form | Full Form, `Detail`, and the layout rule naming the highest rung, the lowest rung and the test to descend |
| The exclusions in the full form | Full Form, `Excludes` |
| An image for each section | Full Form, section `Image` |
| A length for each section | Full Form, section `Words` |
| Purpose as what the reader can do after reading | Full Form and Line-Edit Form, `Purpose` |
| Questions derived from the points | Layout Rules, the question rule, and the `Q1` placeholder in the full form |
| Completeness rules cover the new fields | Layout Rules: the full-plan completeness rule names `Point`, `Form`, `Image`, `Words` and `Answers`, `none` counts as a value in `Image` and `Excludes`, and the line-edit rule exempts image and length |
| Worked plan uses every field and stays invented | Worked Full Plan: every full-form field, one section with an image and three with `Image: none`, each with `Words` |
| Parseable layout, line-edit and short-artefact forms keep working | Layout Rules keep their syntax, Line-Edit Form changed only in the `Purpose` wording, Short-Artefact Form unchanged |

The template's second sentence now names the planning conversation in `planning.md`, and an author may still write a plan by hand.

## Item 4: `SKILL.md`

| Point | Heading Where Met |
| --- | --- |
| A new page or deck goes to the planning workflow | Routing, first row, and Planning a Document |
| The drafting goes to a fresh agent that receives the plan and `writing.md`, and no material | Writing a Document, stage 2, The Drafting Brief's opening, and the paragraph closing Read List |
| The drafting agent draws each image as a Mermaid diagram checked with the mermaid-check skill | The Drafting Brief, stage 2 |
| The short plan stays for short artefacts | Writing a Short Artefact, unchanged |
| `planning.md` in the read list | Read List, second bullet |
| Planning triggers in the description | front matter: "plan a page", "plan a deck", "help me plan this document" |

The instruction to give the author the template and wait, and the sentence "Never write the plan's content yourself", are removed. The rule that drafting writes only from the plan stays in the opening paragraph and in stage 2 of Writing a Document. The structural-edit route now goes through Planning a Document.

## Sizes Against Budget

| File | Size | Budget |
| --- | --- | --- |
| `references/planning.md` | 1,751 words | 1,800 words |
| `assets/plan-template.md` | 1,083 words | 1,100 words |
| `SKILL.md` | 147 lines | 200 lines |
| `SKILL.md` description | 964 characters | 1,024 characters |

## Check Results

- `check-prose.sh` on the three files: no output, so no FAIL and no WARN line.
- `lint-skills.sh`: ok, estate lint clean, with no warnings.
- Residue search for editorial skill links, gate notes, calibration, decision numbers and finding or heuristic codes found none. The one path into the editorial estate is the `check-prose.sh` fallback in "Checks", which step 2 wrote and the cutover replaces with `hedy prose check`.
- `writing.md` and `line-editing.md` were not edited: both files were last written at 10:30 and 10:26 on 5 November 2026, before this step started. No file outside the skill was edited besides this report.

## Points for Review

1. **The check name.** The definition of done says `one kind of thing per level`, and the gate WARNs on `kind of`. `planning.md` names the check "One category per level", with the same meaning.
2. **No `Frame` field.** `planning-dialogue.md` proposed a `Frame` field. Item 3 does not list `Frame`, and the plan from the live conversation did without one, so the template does not carry the field. The one-category check and the storyboard carry the parts every section shares.
3. **No total `Words` field.** The plan in `analysis/ins-events/plan.md` carries a top-level `Words: about 1,800`. The template carries `Words` per section only, because the sum gives the total. A top-level field is a one-line addition if Ben wants the field.
4. **The drafting agent reads named sections of `SKILL.md`.** The brief gives four paths: the plan, `writing.md`, `SKILL.md` and the path for the draft. The agent reads the plan and `writing.md` in full, reads only "The Drafting Brief" and the six sections that brief names from `SKILL.md`, and reads no other file except through the mermaid-check skill. `SKILL.md` holds procedure, not material, so the rule's purpose holds: no source material and no summary of the planning conversation reach the drafting. The first version copied those sections into the brief verbatim, and the review rejected the copies because the copies drift whenever the sections change.
5. **The mermaid-check skill is an exception.** The drafting agent loads the mermaid-check skill to check each diagram, and the brief names that skill as the one procedure the agent loads beyond the files the brief names.
6. **Answers go back to the named agent.** Stage 2 starts the drafting agent with a name through the Agent tool's `name` parameter. After the author answers, the session records the answers in the plan and sends the answers to that agent with SendMessage, so the agent fills the placeholders without the material. An answer that changes a section's point reopens the plan and starts a fresh agent.
7. **`hedy plan check` does not parse the new fields yet.** Until step 4, the plan is checked by reading the plan against the template's completeness rules, as "Checks" in `SKILL.md` already says.

## Change Set From the Source Review

Ben approved six changes from `source-review.md`, applied as one set:

1. **The reverse outline replaces the restatement test.** `SKILL.md` renames the section to "The Reverse Outline": state the paragraph's point, name each sentence's job against the point, and treat a sentence with no job as a removal candidate. The rule against rewriting a paragraph shorter stays. The drafting brief's section list, its paragraph-check stage, Line Editing stages 2 and 3, the closing pass's last line, and paragraph test 8 and the repair rule "Send a claim to the author" in `line-editing.md` name the new test.
2. **Each removal on a line edit carries a reason.** In `line-editing.md`, the repair rule "Give every change its reason" replaces "A removal needs no reason" with a one-line reason in the hand-over report: the job the unit lacked, or the noise the unit carried. The hand-over report in `SKILL.md` lists additions and removals with their reasons, and Line Editing stage 5 says the same.
3. **The introduction comes from the plan.** The drafting brief's first stage writes the introduction from `Opening` and `Governing thought`: the situation, then the complication, then the governing thought.
4. **The author states the consequence if false for a weakly sourced point.** Check 4 in `planning.md` names the source of each point. For a point on a proposed or draft record, or on no record, the author states the consequence, and the point stays an open item until the author answers. For a well-sourced point, the editor states the consequence for the author to confirm.
5. **The closing pass checks for contradictions.** Item 9 in `SKILL.md` sends two statements that cannot both hold to the author as one question quoting both, and the drafting agent never chooses one.
6. **The four-exchange claim is removed** from the opening of `planning.md`.

| File | Before | After | Budget |
| --- | --- | --- | --- |
| `SKILL.md` | 148 lines, 2,538 words | 149 lines, 2,602 words | 200 lines |
| `references/planning.md` | 1,753 words | 1,757 words | 1,800 words |
| `references/line-editing.md` | 1,974 words | 1,993 words | 2,000 words |

`check-prose.sh` reports no FAIL and no WARN line on the three files, and `lint-skills.sh` passes with no warnings. A search of the skill finds no remaining mention of the restatement test, the four exchanges or "needs no reason". `line-editing.md` sits 7 words under its budget, so the next addition there needs a matching cut.

## Readability Fixes From the Trial

The trial's first blind read found the benchmark page's language easier, and found four causes in the authoring page: a clear noun repeated where a pronoun would serve, an opening in the editor's paraphrase, concrete names dropped, and heavy `of` phrases. Ben approved three fixes:

1. **Pronouns and possessives in `writing.md`.** "Pronouns" now makes a pronoun the default wherever the reader recovers its referent at once, because a repeated clear noun makes the prose heavy. The rules that repeat the noun where a pronoun could point at two things, and that no sentence ends on `it`, stay. The broader default replaces the narrower sentence that kept a pronoun whose referent is the one thing the previous clause named. "Write it forward" gains one sentence preferring a possessive to an `of` phrase. The Sentences pairs gain a gateway passage that names the gateway three times, rewritten with a pronoun.
2. **The author's words in the play-back, in `planning.md`.** The opening keeps the author's phrasing. The first main-sentence option is the author's own words lightly joined into one sentence, and the editor's distillation is an alternative, never a replacement. The author's key phrases go into the plan as items of the sections they serve, with `[source: the author, <date>]`, because `plan-template.md` has no field for phrases and stayed unchanged.
3. **Names on the lowest rung, in `planning.md`.** The lowest rung carries the names a reader meets in the system, such as event types, envelope fields and component names, written as the system writes them. A configuration value appears only where the value changes the reader's conclusion, and leaving out configuration never means leaving out names.

To make room in `planning.md`, seven passages of my own wording were tightened or removed, and no rule was dropped. The removed sentence restated what the full form of the plan fixes.

| File | Before | After | Budget |
| --- | --- | --- | --- |
| `writing.md` | 3,486 words | 3,595 words | 3,700 words |
| `references/planning.md` | 1,757 words | 1,793 words | 1,800 words |

`check-prose.sh` reports no FAIL and no WARN line on both files, and `lint-skills.sh` passes with no warnings.

Points for review:

- The third Sentences pair in `writing.md` has an "After" passage that names "the consumer" three times where a pronoun would be clear in two places. That passage now runs against the new pronoun default. The pair was left as written because the change set named one addition only.
- The question form puts the recommended option first, so the author's own words now arrive labelled "(Recommended)" by default. The editor recommends the distillation only by putting the distillation first, which the new rule forbids.
- `planning.md` sits 7 words under its budget.

## Walking Skeleton

Ben read the trial drafts and found the prose of the authoring skill and the benchmark almost identical once both wrote from the same plan. The skill's advantage was structure and diagrams, so the change invests in planning. Five changes:

1. **`planning.md`, "Walking Skeleton".** The section replaces "Storyboard". The skeleton is shown as the page's outline, headings in reading order, never as a table. Each section holds a plain noun heading, a one-sentence point, two to four delivery lines, a form, an image and a length. A new section, "Material Selection", says the author agrees the skeleton before any material is selected, that the material is then selected against each delivery line, and that a delivery line with no material becomes an open item before drafting, with the trial's late gaps as the reason. The check stage and the slide-deck section now name the skeleton.
2. **`planning.md`, "Agreement and the Written Plan".** Every plan field is written in plain sentences, one claim each, because plan wording flows into the page, with the trial's unreadable opening as the reason. The plan is written once every delivery line has its material or an open item.
3. **`plan-template.md`.** Each full-form section gains `Delivers:` with numbered lines `- D1: <what the reader comes away with>`, two to four per section. Each item carries `[delivers: D<n>]` before its source. The completeness rule requires `Delivers` and an item for every delivery line, which replaces the old "at least one item" test. The worked plan gives each section two delivery lines, each with an item, and its `Opening` is now two plain sentences.
4. **`SKILL.md`, The Drafting Brief, stage 1.** Each section is written to its delivery lines, roughly one paragraph for each line. The read list names the delivery lines among the plan's parts.
5. **`writing.md`, "Headings and labels".** A heading is the shortest plain noun label for the topic, such as "Consumer Contract", "INS Domain Boundaries" or "Limitations", with no articles, no -ing forms and no qualifiers such as "Known".

| File | Before | After | Budget |
| --- | --- | --- | --- |
| `references/planning.md` | 1,793 words | 1,967 words | 2,000 words |
| `assets/plan-template.md` | 1,083 words | 1,249 words | 1,250 words |
| `SKILL.md` | 149 lines, 2,602 words | 149 lines, 2,619 words | 200 lines |
| `writing.md` | 3,593 words | 3,625 words | 3,700 words |

`check-prose.sh` reports no FAIL and no WARN line on the four files, and `lint-skills.sh` passes with no warnings. To fit the template's budget, the worked plan's purpose, detail rule, image and two layout rules were tightened, and no rule was dropped.

Points for review:

- **The skill's own headings break the new heading rule.** "Limits of the Role", "Reading the Material", "The Four Checks", "Reopening the Plan" and the `SKILL.md` sections the drafting brief cites, such as "The Drafting Brief" and "The Closing Pass", carry articles or -ing forms. They were left, because a rename changes the section names the brief cites and was outside the change.
- **"Limitations" sits close to the generic-word ban.** The same paragraph of `writing.md` bans a generic heading such as "Overview".

The review kept the skill's headings and "Limitations" as they are, and returned three points, now fixed:

- **Delivery lines are noun phrases.** The examples in `planning.md` read "the meaning of a fat event", "the events that stay inside INS" and "the frequency of lifecycle events", and the same bullet states that a delivery line is never a question or half-question, because plan wording flows into the page. The template's layout rule says the same, and the worked plan's eight delivery lines are rewritten as noun phrases, such as "the broker's redelivery timeout" and "the failure that needs an operator".
- **A slide has exactly one delivery line.** "Slide Decks" in `planning.md` and the template's layout rule both say that a slide has one delivery line, its point, and that the two-to-four rule applies to page sections only.
- **No trial history.** Both sentences that cited the trial are gone. Material Selection gives the reason as the cost of a redraft, and the written-plan rule gives the reason as a badly joined field becoming an unreadable sentence.

To stay within budget, the delivery-line bullet, the slide-deck opening, the template's `Words` and `Detail` rules, the line-edit introduction and the worked plan's image line were tightened. No rule was dropped.

| File | Before the Fixes | After the Fixes | Budget |
| --- | --- | --- | --- |
| `references/planning.md` | 1,967 words | 1,987 words | 2,000 words |
| `assets/plan-template.md` | 1,249 words | 1,249 words | 1,250 words |

`check-prose.sh` reports no FAIL and no WARN line on both files, and `lint-skills.sh` passes with no warnings. A search of the skill finds no mention of the trial and no delivery line opening on a question word.

## Opening Questions Through the Question Tool

Ben expected the opening questions as a conversation, one question per page, not as one open message. "Opening Questions" in `planning.md` now asks the three questions with the question tool, one per page. Each page offers two or three suggested answers drawn from the material, each with a preview sentence, and the author can answer in their own words through Other. The question on what matters most says in its text that the author can write their own paragraph in Other, with as many things as there are. The rule against asking for one sentence or a short list of points stays.

The opening paragraph and "Play-Back of the Reader, Purpose and Opening" agree with the change, since both use the question tool. One line in the play-back was out of step with the walking skeleton and is now fixed: the author's key phrases go into the plan as items ending on `[delivers: D<n>] [source: the author, <date>]`, as the template's item rule requires.

| File | Before | After | Budget |
| --- | --- | --- | --- |
| `references/planning.md` | 1,987 words | 1,999 words | 2,000 words |

To make room, seven passages of my own wording were tightened, and no rule was dropped. `check-prose.sh` reports no FAIL and no WARN line, and `lint-skills.sh` passes with no warnings.

Points for review:

- **Suggested answers can displace the author's words.** The play-back offers the author's own words as the first main-sentence option, and the editor distils the points from the author's paragraph. When the author picks a suggested answer instead of writing in Other, the "author's own words" are the editor's suggestion, and the paragraph to distil from does not exist. A suggested answer for the question on what matters most could be withheld, so that page offers only Other, or the suggestions could be labelled as drawn from the material so the play-back treats them as the editor's.
- **`planning.md` sits 1 word under its budget**, so the next addition needs a matching cut or a budget change.

The review chose the second fix. The suggestions stay on every page, and "Play-Back of the Reader, Purpose and Opening" now separates the two kinds of answer:

- A suggested answer the author chose counts as the editor's wording, and only text the author wrote in Other counts as the author's own words.
- The first main-sentence option is the author's own words only when the author wrote some. Otherwise every option is the editor's, and the play-back says so.
- When the author chose a suggestion for what matters most, the editor derives the points from that suggestion and the material, and asks in the play-back whether anything is missing.
- For consistency, the opening keeps the author's phrasing only where the author wrote some, and the key phrases recorded in the plan are the ones the author wrote.

| File | Before | After | Budget |
| --- | --- | --- | --- |
| `references/planning.md` | 1,999 words | 2,073 words | 2,100 words |

`check-prose.sh` reports no FAIL and no WARN line, and `lint-skills.sh` passes with no warnings.
