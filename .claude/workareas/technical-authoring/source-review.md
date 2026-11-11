# Source Review of the Authoring Skill

I re-read `SKILL.md`, `planning.md`, `plan-template.md`, `line-editing.md` and `writing.md` against the product goal and its measures in `decisions.md`. A caution first: what each source "would say" comes from my knowledge of the works, not from re-reading them. You've told me before that my references are often wrong, so treat the source attributions as leads to check, not citations.

## Explain and Rewrite

I agree it's sound, but the lineage is closer to writing practice than to 5 Whys:

- **Flower (1979), "writer-based" and "reader-based" prose.** Turning shorthand into what you'd say to someone who asked what you meant is her core move.
- **Williams's diagnose, analyse, rewrite.** Find who acts and what they do, then make the actor the subject and the action the verb.
- **Lanham's Paramedic Method.** It does the same unpacking at sentence level.

5 Whys drills down through causes, and the skill only resembles it in the repeat at step 3. What makes the procedure safe for a model is step 2. A model's explanation is fluent and adds claims the source never made, and checking the explanation against the source's claims catches those. 5 Whys has no such guard.

## Source by Source

| Source | Would Recognise | Would Ask "Why?" |
| --- | --- | --- |
| Flower and Hayes 1981 | The reader and purpose settled first. A plan that drafting may reopen. | Their central finding is that planning, drafting and revising interleave. The skill puts a hard wall between planning and drafting, so the drafting agent can't revise a goal, only report back and be replaced. Also, "writers solve the problems they define for themselves", yet the author picks from options the AI has already defined, with the AI's choice first. |
| Minto | The opening as situation and complication, the governing thought, points that raise questions, one category per level, and each paragraph starting with its claim. | The plan has an `Opening` field, but the drafting brief never tells the agent to write the introduction from that field. That was my miss in step 2b. |
| STOP (1965) | The storyboard: one point, one image and a set length per section, reviewed before any prose. A close match. | In STOP every module pairs its point with a figure. `planning.md` says "propose fewer images rather than more". STOP's storyboard was also reviewed by a team, not by the author alone. |
| Hayakawa | The detail rule naming a highest and a lowest rung, with one concrete instance per section. | The restatement test works against this. Someone restating a paragraph keeps the abstract claim and drops the example, so the test removes the lowest rung the plan asked for. |
| Horn | Form chosen by the type of information, and chunked paragraphs with one job each. | Little to object to. |
| Redish | The reader comes first, and the purpose is what the reader can do afterwards. | The plan's questions are derived from the AI's points, not from what real readers ask. Her method starts from the readers' questions and tests with real readers. Here the only reader is you, by design. |
| Scardamalia and Bereiter | The "consequence if false" check as a prompt that makes the writer work the content over, and turning a content dump ("a complete overview") into a reader outcome. | Their prompts make the writer do the transforming. In `planning.md` I wrote that the AI states each point's consequence if false. The planning-dialogue design had the author state the consequence. I moved that thinking from the author to the AI without flagging the change. |
| Kellogg 1988 | Outline before drafting, and the gate on a complete plan. | As I recall it, his gains came from the outline, not from polishing the draft. He'd ask whether the four revision passes during drafting earn their cost. |
| STORM (2024) | Outline-first drafting, and each section written from its own references. | STORM builds its outline from questions asked from several reader perspectives. The planning conversation has one perspective, the editor's. |
| Williams, Gopen and Swan | Actor and verb, known before new, condition first. | Gopen and Swan's "stress position" (the important new information goes at the end of the sentence) is missing from `writing.md`. A small gap. |
| Lanham | Unpacking noun stacks and compressed wording. | The skill allows the risky move and forbids the safe one. Deleting a whole sentence (restatement test, noise list) can lose a claim. Tightening a sentence that stays keeps the claims, yet "never condense what stays" forbids the tightening. Lanham's practice is the reverse. |
| Diátaxis | Document types and material for another job kept out of the main flow. | A purpose of "state the duties", ending in a table of duties inside an explanation, mixes explanation and reference. The planning conversation doesn't check this. |
| Shi et al. 2023, context-rot study | A fresh drafting agent with the material kept out. | Keeping the material out trades distraction for starvation. One-line items in the plan are all the agent has, so the plan's level of detail becomes the limit on quality. Nothing checks that each item carries enough to write from. |
| Graham and Perin 2007 | Specific product goals (the purpose as a reader action), planning before writing, studying models (the before-and-after pairs), and writing with someone else. | `design.md` cites them for the restatement test. Their summarising finding is about learning from texts, not editing by deletion. |
| Rude and Eaton | Author's rights, batched questions to the author, and leaving acceptable text alone. | "A removal needs no reason" (`line-editing.md`). Editors explain their substantive changes, and an unexplained deletion is the hardest edit for an author to accept. That works against your measure "edited, not rewritten". They'd also expect the editor to flag two statements on the page that contradict each other. That is editing, not fact checking, and the closing pass doesn't check for contradictions. |
| Van Buren and Buehler | Levels of edit agreed up front with the author. | Little to object to. |
| Sommers 1980 | Finding a defect at the level it sits, and planning before wording. | Her sharpest finding: student writers revise by deleting and swapping words, while experienced writers revise by adding and reordering to rework the argument. Almost every revision move in this skill is a deletion: the restatement test, the noise list, word counts before and after, additions needing a reason. That is the student's model. |

## Patterns That Matter Against Your Measures

1. **Revision is nearly all deletion** (Sommers, Lanham, Hayakawa). This risks your "delivers the required information" measure. The restatement test is the worst case, because it strips the qualifications and concrete instances that `writing.md` requires.
2. **The author selects instead of defining** (Flower and Hayes, Scardamalia and Bereiter). The author picks from options with the recommended one first, so "the author agrees the plan" partly measures anchoring.
3. **No real reader's questions** (Redish, STORM). The plan's questions come from the AI's points. A question written from each named reader's side would test the points instead of echoing them.
4. **The drafting brief under-uses the plan** (Minto, Shi). Nothing tells the agent to write the introduction from `Opening`, and nothing checks that the items are dense enough to write from.
5. **One claim of mine is unsupported.** "The conversation usually reaches an agreed storyboard in four exchanges" rests on one roleplay and one replay. I wrote "usually" without evidence.

## Decisions, With My Defaults

1. **Restatement test:** replace it with reverse outlining. State each paragraph's point, then name each sentence's job against it: claim, mechanism, evidence, condition, consequence or join. Only a sentence with no job is a candidate for removal. Default: replace.
2. **Removals on a line edit:** give each removal a one-line reason in the hand-over, as additions already have. Default: yes.
3. **Opening in the drafting brief:** the agent writes the introduction from `Opening` and `Governing thought`. Default: yes. This fixes my miss.
4. **Consequence if false:** go back to the author stating each consequence, at least for points that rest on weak sources, or keep the AI stating the consequences. Default: the author states it for weak-source points only.
5. **Reader questions:** in the play-back, write two or three questions from each named reader's side and compare them with the derived questions. Default: yes, as a fifth check.
6. **Contradiction check:** add "two statements on the page contradict each other" to the closing pass. Default: yes.
7. **Housekeeping:** remove "usually … in four exchanges" from `planning.md`, and fix the Graham and Perin citation at line 75 of `design.md`. Default: yes.

I haven't changed anything. If you want these, I'd make them as one change set across `SKILL.md`, `planning.md` and `line-editing.md`, and give you the word counts before and after.
