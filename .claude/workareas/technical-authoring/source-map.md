# Authoring: Source Map

This map traces each requirement of `design.md` to the existing text that already meets the requirement. It points at material and rewrites none. Line ranges refer to the files as they stood on 4 November 2026.

## Source Key

| Key | File |
| --- | --- |
| LG | `.claude/best-practices/writing/language.md` |
| SA | `.claude/best-practices/writing/snapshot-authoring.md` |
| UL | `.claude/best-practices/writing/ubiquitous-language.md` |
| AV | `.claude/rules/authoring-voice.md` |
| ES | `.claude/skills/editorial/SKILL.md` |
| DT | `.claude/skills/editorial/references/document-types.md` |
| RB | `.claude/skills/editorial/references/review-brief.md` |
| ER | `.claude/skills/editorial/references/explain-and-rewrite.md` |
| LC | `.claude/skills/editorial/references/layer-cards.md` |
| VE | `.claude/skills/editorial/references/voice-examples.md` |
| CE | `.claude/skills/editorial/references/clarify-examples.md` |
| GR | `.claude/skills/editorial-triage/assets/grading-rubric.md` |
| TS | `.claude/skills/editorial-triage/SKILL.md` |
| EG | `.claude/skills/editorial-help/references/editorial-guide.md` |
| EH | `.claude/skills/editorial-help/SKILL.md` |
| CM | `.claude/best-practices/git/commits.md` |
| PR | `.claude/best-practices/git/pull-requests.md` |
| PS | `.claude/skills/pr/SKILL.md` |
| JS | `.claude/skills/jira/SKILL.md` |
| EP | `trade-imports-documentation/docs/.../INS Auth/editorial-profile.md` |
| DC | `.claude/workareas/technical-authoring/decisions.md` |

The editorial-triage schema, GRADER.md, CLAIM_VERIFIER.md, LAYERED_LOADER.md and the two skill `decisions.md` files were read and hold no writing or editing rule beyond the finding contract, so none appears below.

## Requirement List

### SKILL.md

- S-01 SKILL.md: the routing between the three paths, writing a document, line editing a document, writing a short artefact.
- S-02 SKILL.md: the stages of each path, seven, five and three.
- S-03 SKILL.md: the restatement test, applied per paragraph so each paragraph keeps only the sentences its point needs.
- S-04 SKILL.md: explain and rewrite, so no sentence makes the reader reconstruct its meaning.
- S-05 SKILL.md: the question form, one question for each point the plan leaves open.
- S-06 SKILL.md: on a line edit, every question reaches the author at once, in one batch.
- S-07 SKILL.md: the closing-pass checklist, sections read as one document with their joins, no repetition, and the page answers each plan question and supports the governing thought.
- S-08 SKILL.md: the hand-over report, holding the document, the word count before and after, and the questions still open.
- S-09 SKILL.md: a large output ends with a map by intent.
- S-10 SKILL.md: the form of a pull request body.
- S-11 SKILL.md: the form of a ticket.
- S-12 SKILL.md: the form of a commit message.
- S-13 SKILL.md: the reading steps, always `writing.md` and the plan, `line-editing.md` only when line editing, `plan-template.md` when the author writes a plan, never `words.md`.
- S-14 SKILL.md: drafting starts only after `hedy plan check` passes, and stops on any missing part.
- S-15 SKILL.md: the drafting step, each section makes its point from its own items only, in the form the plan chose, each paragraph opening on its claim.
- S-16 SKILL.md: authoring writes only from the plan, sends an unsupported point to the author as a question, and neither checks facts nor plans.
- S-17 SKILL.md: the step for resolving each Change hit with the repair the hit carries.
- S-18 SKILL.md: a line edit first learns the page's purpose, questions and section points from the short plan.
- S-19 SKILL.md: a line edit finds each paragraph and sentence defect before changing anything.
- S-20 SKILL.md: a line edit is returned as a diff.

### writing.md

- W-01 writing.md, tone: the purpose, a reader can act on the text.
- W-02 writing.md, tone: the register, formal, explanatory and deliberate, with no enthusiasm, idiom, humour or chat.
- W-03 writing.md, tone: the attitude to claims, facts, mechanisms and consequences, with the comparison carrying the judgement.
- W-04 writing.md, tone: the relation to the reader, software runs and people decide, and no reader is addressed as `you`.
- W-05 writing.md, paragraphs: one job per paragraph.
- W-06 writing.md, paragraphs: the first sentence states the claim the rest supports.
- W-07 writing.md, paragraphs: the order from claim to mechanism to consequence.
- W-08 writing.md, paragraphs: the joins between paragraphs.
- W-09 writing.md, sentences: the actor as subject and the action as verb.
- W-10 writing.md, sentences: known information before new.
- W-11 writing.md, sentences: the condition before the action.
- W-12 writing.md, sentences: one claim per sentence.
- W-13 writing.md, sentences: the requirement words.
- W-14 writing.md, sentences: the tense.
- W-15 writing.md, document types: the person, mode and tense of a how-to, a reference page, an explanation and a decision record.
- W-16 writing.md, document types: the team's other document shapes.
- W-17 writing.md, forms: when a list, a table or a diagram serves the reader better than prose.
- W-18 writing.md, forms: the prose beside a table or diagram states consequences and limits, never the content again.
- W-19 writing.md: before-and-after pairs in each of the five sections.

### line-editing.md

- L-01 line-editing.md, tests: compression.
- L-02 line-editing.md, tests: framing that carries a judgement.
- L-03 line-editing.md, tests: unclear reference.
- L-04 line-editing.md, tests: noise.
- L-05 line-editing.md, repairs: remove whole units.
- L-06 line-editing.md, repairs: never condense what stays.
- L-07 line-editing.md, repairs: every addition gives its reason.
- L-08 line-editing.md, repairs: a guess becomes a question.
- L-09 line-editing.md, rights: the author's supplied wording is final.
- L-10 line-editing.md, rights: the author's cuts stay cut.
- L-11 line-editing.md, rights: the author's headings stand.
- L-12 line-editing.md: before-and-after pairs.
- L-13 line-editing.md: a line edit improves how each point is said and changes no claim.

### plan-template.md

- P-01 plan-template.md: the purpose.
- P-02 plan-template.md: the reader.
- P-03 plan-template.md: the questions the page must answer.
- P-04 plan-template.md: what the reader must know or do after reading.
- P-05 plan-template.md: the governing thought.
- P-06 plan-template.md: the sections, with their order, the point of each in one sentence, and the form of each.
- P-07 plan-template.md: the material, the items each section needs at the level of detail the section needs.
- P-08 plan-template.md: the open items with the author's answers.
- P-09 plan-template.md: the short form for a line edit, the page's purpose, questions and section points.
- P-10 plan-template.md: the short form for a short artefact, a purpose and its points.
- P-11 plan-template.md: one worked plan.
- P-12 plan-template.md: the document type, which the arrows call the plan's document type.

### words.md

- D-01 words.md: the word table, each banned form with its repair.
- D-02 words.md: the term list, each wrong term with its repair.
- D-03 words.md: the punctuation rules, each with its repair.
- D-04 words.md: each rule marked Fix or Change.

### hedy Commands and Triggers

- H-01 hedy plan check: reads a plan, reports each missing part, such as a section with no point, and blocks drafting, with `--json`.
- H-02 hedy prose check: applies the Fix rules, with `--fix`.
- H-03 hedy prose check: reports each Change hit with its text, rule and repair.
- H-04 hedy prose check: reports only the hits the change introduced.
- H-05 hedy prose check: reports the word counts before and after.
- H-06 hedy prose check: reads text on `--stdin` as well as files.
- H-07 hedy prose check: runs at the five triggers, the write hook, the turn-end hook, pre-commit, the commit message and `create-pr.sh`.
- H-08 the house-standard rule: loads by path, names `writing.md`, and holds the paths list that scopes the write hook.
- H-09 hedy prose check: reads `words.md` as its data, so no model loads the table.
- H-10 the git hooks reach colleagues in any AI tool once `make` installs hedy and Vale.

## Forward Map

### SKILL.md Map

| Item | Locations (path:lines) | Fit | Recommended Source | Note |
| --- | --- | --- | --- | --- |
| S-01 | ES:20-33, EH:32-41 | partial | ES:20-33 | ES routes existing prose to review and triage, and has no short-artefact path of its own |
| S-02 | ES:65-87, ES:89-173 | partial | ES:65-87 | brief, outline and draft exist, but plan check, questions and closing pass are not stages anywhere |
| S-03 | LG:109-115, AV:39, LG:37, ES:173, RB:90, LC:29, GR:49 | full | LG:109-115 | the authority the others cite. ES:173 states a different test, see Conflicts |
| S-04 | ER:1-24, ES:175-177, RB:20, LG:93 | partial | ER:7-11 and ER:20 | steps 1 to 3 and 6 fit. Step 4 is code and step 5 is a fresh-context reader |
| S-05 | DC:129, LG:135, ES:75, ES:113, RB:18, RB:59, GR:15 | partial | DC:129 | DC gives the prompt form, LG:135 the placeholder and gap note. Nothing defines the fields |
| S-06 | EH:66, TS:111, DC:129 | partial | EH:66 | EH puts several questions in one call. No source states the one-sitting rule |
| S-07 | LG:117-127, ES:179-185, LC:45, LC:52 | partial | LG:117-127 | five seam checks exist. No source checks the page against the plan's questions |
| S-08 | ES:187-196, DC:131 | partial | ES:187-196 | ES reports net growth and a question count, not the counts before and after |
| S-09 | DC:81 | partial | DC:81 | stated only in decisions.md, with no threshold or format |
| S-10 | PR:18-30, PS:44-47, DT:49-51 | partial | PR:18-30 | PR:24 points drafters at the editorial skill, which the estate removal deletes |
| S-11 | JS:32-43, DC:80 | partial | JS:32-43 with DC:80 | JS asks for proposed work, DC forbids the how, see Conflicts |
| S-12 | CM:5-16, DC:132 | full | CM:5-16 | CM:16 cites the editorial skill, which the estate removal deletes |
| S-13 | ES:37-49, AV:16, AV:22-26 | partial | ES:37-49 | the list differs: snapshot, register, voice and clarify examples are read today |
| S-14 | ES:67 | partial | ES:67 | ES requires a brief and outline before drafting, with no check that stops the draft |
| S-15 | ES:85-87, ES:77-83, LG:9, AV:30 | partial | ES:85-87 | no source limits a section to its own items |
| S-16 | LG:135, ES:63, ES:113, RB:32, GR:37, GR:38, ES:136, VE:49 | full | LG:135 and GR:38 | LG:135 bars invention, GR:38 puts fact checking out of scope |
| S-17 | ES:163-171, PS:46, AV:53 | conflicting | ES:171 | ES and AV keep a WARN tier the author judges, which the Change rules abolish |
| S-18 | ES:91-100, ES:104-111, RB:76, LC:13 | partial | ES:91-100 | ES frames the reader and recovers meaning, with no short plan as input |
| S-19 | GR:90, RB:105, LC:13 | partial | GR:90 | GR:90 opens on `Diagnose the reader's problem first` |
| S-20 | ER:5, ES:183, TS:6 | full | ER:5 | ER:5 states the claim rule, TS:6 the uncommitted diff |

### writing.md Map

| Item | Locations (path:lines) | Fit | Recommended Source | Note |
| --- | --- | --- | --- | --- |
| W-01 | LG:7, AV:20 | full | LG:7 | AV:20 is a digest of LG:7 |
| W-02 | LG:7, AV:20, ES:59, CE:102-128 | full | LG:7 | CE:120-122 holds Ben's own words on the standard |
| W-03 | LG:7, LG:11-12, LG:18-22, LG:129-137, ES:59, ES:115, VE:53-67 | full | LG:7 and LG:129-137 | attribution, absolutes and timebound words sit in LG:129-137 and belong here |
| W-04 | LG:15-16, AV:20, DT:7 | full | LG:15-16 | LG:15 also carries the agent-instruction exemption |
| W-05 | LG:35 | full | LG:35 | LG:35 adds the split-at-the-seam repair |
| W-06 | LG:9, LG:29, AV:30, LC:45 | partial | LG:9 | sources say lead with the point, none says the first sentence states the paragraph's claim |
| W-07 | LG:34, AV:32 | full | LG:34 | LG:34 limits the order to explanatory paragraphs, design.md states no limit |
| W-08 | LG:30, LG:99, LG:123, ES:184 | partial | LG:30 | joins appear as repair cautions, never as a drafting rule |
| W-09 | LG:39-48, LG:58-66, LG:72-79, AV:31, AV:35-36, VE:23-35 | full | LG:72-79 and LG:39-48 | LG:48 keeps the passive where the actor is unknown |
| W-10 | LG:30, AV:30 | full | LG:30 | none |
| W-11 | LG:36, AV:30, GR:56, VE:83-95 | full | LG:36 | LG:36 keeps `if`, `only if`, `unless` and `after` distinct |
| W-12 | LG:87, LG:26, LG:28, LG:78, AV:32, VE:7-21 | full | LG:87 and LG:26 | LG:28 asks for varied sentence length, which VE:69-81 shows |
| W-13 | LG:255-265, AV:33 | full | LG:255-265 | none |
| W-14 | LG:33, AV:34, DT:5-10 | full | LG:33 | LG:33 adds the conditional for an unbuilt option |
| W-15 | DT:5-19, DT:54, SA:30, DC:79 | partial | DT:5-19 | how-to, reference and explanation are full. No source gives a decision record's person, mode or tense |
| W-16 | DT:33-43 | full | DT:33-43 | design document, API reference, README, release notes, messages, warnings |
| W-17 | DT:21-29, AV:43, LG:239, VE:97-113, CE:11-36 | full | DT:21-29 | AV:43 is a digest of DT:21-29 |
| W-18 | DT:29, AV:43, LG:124 | partial | DT:29 | sources cover the prose beside a diagram, none covers the prose beside a table |
| W-19 | VE:7-113, AV:45-49, CE:102-128, LG:20 | partial | VE:7-113 | pairs cover sentences, attitude, a how-to and a table. None covers paragraphs or a decision record |

### line-editing.md Map

| Item | Locations (path:lines) | Fit | Recommended Source | Note |
| --- | --- | --- | --- | --- |
| L-01 | RB:132-148, LG:68-70, LG:66, LC:19, LC:31 | full | RB:132-148 | drop the inventory opener at RB:147, which decision 14 deletes |
| L-02 | LG:18-22, GR:25, GR:52, LC:27, RB:101, CE:102-128 | full | LG:18-22 | GR:52 adds the repair, the supported consequence or removal |
| L-03 | LG:50-56, GR:53, RB:142-143, CE:132-152 | full | LG:50-56 | LG:56 turns an unsettled antecedent into a question |
| L-04 | LG:101-107, LG:95, GR:26, GR:28, GR:42, GR:45, RB:29-31, RB:36, SA:9-16 | full | LG:101-107 | GR:26, undecided mechanisms, is content and may belong to the plan |
| L-05 | LG:97-99, GR:43, GR:48, RB:19 | full | LG:97-99 | GR:43 adds the complete parenthetical aside as a whole unit |
| L-06 | LG:97, LG:115, GR:48, RB:21, LC:29 | full | LG:115 | LG:115 states the reason, the editor becomes the author of new wording |
| L-07 | LG:91, RB:19, RB:58, GR:19 | conflicting | LG:91 | RB:19 allows growth in only two cases, LG:91 allows any addition with its reason |
| L-08 | LG:135, ER:10-11, GR:37, RB:32, ES:113, LG:36, LG:56 | full | LG:135 | ER:10-11 holds the procedure that finds the guess |
| L-09 | DC:121, CE:84-94 | conflicting | DC:121 | CE:94 says a suggestion from the reader is not automatically meaning-preserving |
| L-10 | DC:122 | partial | DC:122 | stated only in decisions.md |
| L-11 | DC:123, ES:71, LC:43, GR:57, DC:142 | conflicting | DC:123 | GR:57 always rewords an FAQ heading and DC:142 retitles every heading |
| L-12 | CE:1-152, RB:136-148, LG:20 | partial | CE:1-152 | CE holds verdicts on real passages, RB holds one-line pairs for each pattern |
| L-13 | ER:5, LG:87, GR:13, CE:62-98 | full | ER:5 | CE:62-98 shows a reading improvement that changed the claim |

### plan-template.md Map

| Item | Locations (path:lines) | Fit | Recommended Source | Note |
| --- | --- | --- | --- | --- |
| P-01 | ES:69-75, ES:74, EG:60 | partial | ES:74 | the scope sentence is the nearest form of a purpose |
| P-02 | ES:93-98, ES:72, EG:60, AV:24, EP:9-11 | full | ES:93-98 | EP:9-11 is a real reader frame to reuse as the example |
| P-03 | none | none | none | LG:237 mentions a list of the questions a page answers, only as an FAQ-voice example |
| P-04 | ES:72, ES:98, EG:60, AV:24 | full | ES:72 | none |
| P-05 | LC:52, RB:127 | partial | LC:52 | the carried-away sentence is a reader's after-the-fact test, not a planned thought |
| P-06 | ES:77-83, DT:21-27, DC:78 | partial | ES:77-83 with DC:78 | DC:78 supplies the one agreed sentence per section |
| P-07 | ES:83, EG:66 | partial | ES:83 | EG:66 lists facts the edit must keep, not items per section |
| P-08 | LG:135, RB:59 | partial | LG:135 | LG:135 lists gaps after the text, not as plan entries with answers |
| P-09 | EG:58-66, EH:54-64, EP:9-32 | partial | EG:58-66 | the brief's mode and intent inputs belong to the removed estate |
| P-10 | PR:24, EG:65 | partial | PR:24 | no source writes a short artefact's purpose and points down |
| P-11 | none | none | none | EP:1-40 is a worked profile, not a worked plan |
| P-12 | ES:71, AV:25, EG:65 | full | ES:71 | design.md is unclear whether the type is a plan part, see Design Questions |

### words.md Map

| Item | Locations (path:lines) | Fit | Recommended Source | Note |
| --- | --- | --- | --- | --- |
| D-01 | LG:154-208, DC:149, DC:150, DC:161, DC:169 | full | LG:160-200 | the forms and repairs exist. Tiers and the unchecked list at LG:202 need deciding |
| D-02 | LG:241-253, LG:267, LG:148, EP:34-40, UL:12-41 | partial | LG:243-251 | LG has a workspace prefer-and-avoid table, EP the set-level format, UL names that pass |
| D-03 | LG:210-221, DC:140, DC:148, DC:151, DC:157-159 | full | LG:210-221 | LG:217 leaves contractions unchecked |
| D-04 | DC:136-159, LG:156, EG:18 | conflicting | DC:136-159 | LG:156 and EG:18 keep FAIL, WARN and guidance tiers |

### hedy Map

| Item | Locations (path:lines) | Fit | Recommended Source | Note |
| --- | --- | --- | --- | --- |
| H-01 | none | none | none | no text defines a complete plan or its check |
| H-02 | DC:136-142, EG:51 | full | DC:136-142 | EG:51 is the current names fix, the model for the renamed-heading report |
| H-03 | DC:144-159, DC:170, LG:156 | full | DC:144-159 and DC:170 | several Change rules are sentence shapes, not words, see Design Questions |
| H-04 | DC:171, EG:30, EG:31, EG:123 | conflicting | DC:171 | EG:31 says pre-commit checks the whole staged file with no baseline |
| H-05 | DC:131, ES:193 | partial | DC:131 | no source says which text the counts measure |
| H-06 | ES:169 | full | ES:169 | ES:169 adds that empty input proves nothing |
| H-07 | DC:172-177, EG:26-34 | full | DC:172-177 | EG:26-34 describes today's checks and their scope |
| H-08 | AV:1-16, EG:22-24, EG:84-85 | partial | AV:1-12 | AV also carries a drafting digest, a second home for `writing.md` content |
| H-09 | LG:156, DC:168, EG:104 | full | LG:156 | LG:156 says the script reads the table on every run |
| H-10 | EG:36, EG:124 | partial | none | no source covers Vale or `make` installing the checks, EG:124 says docs-repo commits run none |

## Gaps

| Item | Recommendation | Reason |
| --- | --- | --- |
| P-03 | write new | the closing pass and stage 5 depend on the plan's questions, and no source holds them |
| P-11 | write new | a worked plan is the author's only model until document-planning exists |
| H-01 | write new | stage 1 blocks on the check, and no rule defines a complete plan |
| P-05, partial | write new | the carried-away sentence tests a finished page, the governing thought has to exist before drafting |
| S-07, partial | write new | the check of the page against each plan question has no source |
| W-06, partial | write new | the paragraph-opening rule is the third level of progressive disclosure and has no statement |
| W-15, partial | write new for the decision record | the type is named in design.md and no source gives its person, mode and tense |
| W-18, partial | write new for tables | the design extends the diagram rule to tables |
| W-19, partial | write new for paragraphs and decision records | every section needs a pair and two have none |
| H-10, partial | write new | the colleague route at commit rests on an install step no text describes |

## Conflicts

| Side A | Side B | Difference | Recommended |
| --- | --- | --- | --- |
| LG:111-115 | ES:173 | LG removes each sentence the restatement drops, ES changes the paragraph wherever the restatement differs | LG:111-115, the authority the others cite |
| LG:91 | RB:19 | LG allows any addition that states its reason, RB allows growth in two named cases only | LG:91, which matches the design's wording |
| DC:129 | TS:10, GR:15, GR:32 | DC puts decisions to Ben as question prompts, the triage puts no question in chat | DC:129, which stage 4 needs |
| DC:80 | JS:39-40 | DC bars the how from a ticket, JS asks for a proposed-work section | DC:80 |
| DC:121 | CE:84-94 | no real conflict: CE:94 says a reader's suggested wording can change the claim, which is about suggestions, not the author's wording | both stand, and CE:94 belongs with L-13 |
| DC:123 | GR:57, LC:43, DC:142 | DC lets the author's headings stand, GR and LC always reword an FAQ heading, DC:142 retitles headings | none, see Design Questions |
| DC:171 | EG:31, EG:123 | DC blocks only on introduced hits, EG says pre-commit checks the whole file | DC:171 |
| DC:144-149 | LG:156, ES:171, AV:53 | DC makes every row a Change rule, LG, ES and AV keep a WARN tier the author judges | DC:144-149, under decision 12 |
| DC:168, DC:94 | design.md:164 | DC adds the nearest style sheet's terms, the design defers a term list per document set | none, see Design Questions |
| AV:26 | design.md:54 | AV reads a neighbouring page before drafting, the design keeps only the plan and the guide in context | design.md:54 |
| AV:18-53, EG:19 | design.md:141 | AV keeps a 40 to 60 line drafting digest, the design's rule only names `writing.md` | design.md:141, one home for the standard |
| LG:217 | AV:53 | LG leaves contractions unchecked, AV lists the negative contraction as a habit the gate catches | LG:217, which matches the check list |
| LG:105, DC:76 | ES:81 | LG and DC remove pointers by default, ES links or points to a fact's home | LG:105 |
| ER:12-20 | design.md:169 | ER steps 4 and 5 run the claim nominator and a fresh-context reader, the design leaves out any model cold reader | design.md:169, keep steps 1 to 3 and 6 |
| LG:34 | design.md:106 | LG limits claim to mechanism to consequence to explanatory paragraphs, the design states the order without the limit | LG:34, keep the limit |
| ES:75 | design.md:56 | ES asks one question only when the input cannot be derived, the design asks for each open point | design.md:56 |

## Unplaced

| Location | Rule | Design File | Recommendation |
| --- | --- | --- | --- |
| DC:63 | a standard pattern is plain framing with the system-specific part named and no scattered citations | writing.md, tone | add, a retained preference with no item |
| DC:64 | the worst case is written, with each assumption's consequence if false | writing.md, tone | add, a retained preference with no item |
| DC:65 | slides and explainers show the release design, not current gaps | writing.md, document types | add, a retained preference with no item |
| DC:66, LG:147 | reader-facing prose carries no working codes or internal labels | writing.md, sentences | add, LG:147 already states the rule |
| SA:1-32 | a document is a snapshot, with no dated annotations or version history | writing.md, document types | add, a retained preference with no item |
| DC:76, LG:105, LG:278-283 | at most two links, no pointer sentences, links resolve, no gitignored citations | writing.md, forms | add, L-04 covers removing pointers but not the drafting limit |
| DC:77 | diagram notes are numbered in the markdown under the image | writing.md, forms | add, a retained preference with no item |
| LG:233-239 | concrete noun-phrase headings, bold lead-in over heading depth, structure in proportion | writing.md, forms | add, the Forms section names no heading rule |
| DT:27 | a rule stays beside its qualification | writing.md, paragraphs | add, a drafting rule with no item |
| LG:139-152, UL:5-10 | first-use expansion, registered proper nouns, no invented expansion, one name for one thing | writing.md, sentences | add, D-02 holds only the term repairs |
| LG:269-276 | capitalisation, numbers, dates, times and inclusive terms | writing.md, sentences | add, most of the section needs judgement |
| LG:223-231 | code font, JSON fences and naming a schema `$def` with its property | writing.md, forms | add, no item covers code in prose |
| LG:31-32, LG:28 | a stable subject, cause words that name the relation, varied sentence length | writing.md, sentences | add, the Read List's sentence rules omit them |
| LG:87-89 | the definition of just enough, a paragraph is finished when nothing improves or can go | writing.md, paragraphs | add, the aim the repair rules serve |
| ES:137-139 | add the boundary when a correct statement invites a false inference | writing.md, tone | add, the search before an open question and circular reasons belong to planning |
| GR:50-51, LG:35 | a paragraph splits at the seam, and a list keeps the same words | line-editing.md, repairs | add, retained heuristics H-25 and H-26 |
| GR:56 | a moved condition keeps every word and its scope | line-editing.md, repairs | add, retained heuristic H-31 |
| GR:31 | an undecided choice is not asserted | line-editing.md, tests | add as a test that raises a question, since the author owns the choice |
| GR:39 | an incomplete promise is completed from the set | line-editing.md, repairs | drop, completion adds a claim and a line edit changes none |
| GR:30 | a claim the set contradicts is cut | none | drop, contradiction belongs to the author and to fact checking |
| DC:124 | a rule plus its edge-case handling is no contradiction | none | drop, authoring checks no contradictions |
| GR:58 | an inventory opener is reworded to a sentence per job | none | drop, decision 14 deletes the rule |
| GR:86 | a change that alters no reader outcome is churn, and a pass stops when it finds no new difficulty | line-editing.md, repairs | add, the stop condition for a line edit |
| RB:25 | report a change only when the reader gains, never for preference or synonym | line-editing.md, repairs | add, the threshold for any edit |
| RB:37, DC:119 | code and quoted examples are exempt from wording rules | line-editing.md and hedy prose check | add, the check masks them and the editor needs the same rule |
| LC:56-69 | repetition across pages, reading order, one concept under two names | none | drop for the MVP, a set-level structural edit belongs to document-planning |
| LC:50, DT:29 | a passage that describes a sequence is a diagram candidate | none | drop for the MVP, design.md:164 defers diagram planning |
| ES:182 | describe a non-trivial restructure before making it | none | drop, a structural edit belongs to planning |
| DC:125, EG:20 | rules stay general and never encode one document set | none | add to design.md as an upkeep rule for `writing.md` and `words.md` |
| DC:130 | quality is judged by a blind pick of up to three versions | SKILL.md, question form | add as the form of a wording choice, or drop if no such choice reaches the author |
| DC:132, RB:46 | hard wrapping only in commit messages, one line per paragraph elsewhere | writing.md, forms | add, a file-format rule with no item |
| DC:161 | each row's legitimate uses become allowed forms | words.md | add, the table needs a column for them |
| DC:165-167 | masking, the semicolon and spaced-hyphen exemptions, the `docs` scope | hedy prose check | add, the design names none of the check's behaviours |
| DC:171 | a mechanical edit treats every hit on the page as its work list | hedy prose check | add, design.md:97 gives the mechanical edit to hedy without the mode |
| DC:178 | the 34 prose-gate cases and the names case become acceptance tests | hedy prose check | add, a build requirement with no item |
| EP:25-32 | run notes, such as accepted values and names that need no expansion | none | see Design Questions, the design defers per-set data |
| DC:62 | natural prose is preferred over compressed idiom | writing.md, sentences | add, a retained preference the first pass missed |
| GR:27 | a missing explanation is first a suspect claim, so the claim may go rather than grow | line-editing.md, repairs | add, retained heuristic H-03 the first pass missed |
| GR:29 | a rule with a home elsewhere is not restated where an instance occurs | writing.md, paragraphs | add, retained heuristic H-05 the first pass missed |
| GR:32 | a design or ownership question is not an editorial matter | none | drop, decision 7 already keeps planning and fact checking out of authoring |

## Design Questions

1. The Read List names a purpose among the plan's parts, while the Document level names the reader, the questions, what the reader must know or do, and the governing thought. design.md does not say whether purpose is a separate part, nor whether the reader is a plan part at all.
2. The arrows speak of "the plan's document type", but neither the Read List nor the level table lists a document type among the plan's parts.
3. `hedy prose check` holds "the word-level Fix and Change rules from `words.md`". FAQ voice, the contact clause, a sentence ending on `it` and a table header ending on a preposition are sentence shapes, not word-table rows. design.md does not say where those rules live.
4. design.md does not say whether the term list holds the workspace's prefer-and-avoid terms, the proper-noun register, a document set's preferred names, or all three, given that it defers a term list per document set.
5. The author's headings stand, yet the Fix rule retitles headings and the Change rule blocks FAQ voice. design.md does not say which wins on a line edit.
6. design.md does not say whether a line edit still carries an intent such as clarify or distil, or any growth limit beyond "every addition gives its reason".
7. The question form has no stated fields, such as the point, the options and a default. Stage 4 of writing a document does not say whether questions are batched, as stage 4 of line editing does.
8. The closing pass names two checks. design.md does not say whether the five seam checks of the current guide, such as pronouns that still resolve and transitions a removal stranded, are part of the checklist.
9. design.md does not say what size makes an output large enough to need a map by intent.
10. The restatement test is a writing stage. The line-editing stages name explain and rewrite but not the restatement test, so design.md leaves open whether a dropped sentence counts as noise on a line edit.
11. Explain and rewrite is named without its steps. The current procedure ends with a claim-diff script and a fresh-context reader. design.md does not say which steps survive.
12. design.md gives one missing part, a section with no point, as the plan check's example. It does not list the parts the short forms must hold, so the check's rule for a short artefact is open.
13. design.md does not say what the word counts measure: the page, the changed sections or each paragraph, and what "before" means for a new draft.
14. The house-standard rule replaces `authoring-voice.md`. design.md does not say whether the rule keeps any drafting digest or only names `writing.md`.
15. The turn-end hook blocks "while an introduced Change hit remains". design.md does not say whether the hook runs in every session or only while the skill is active.
16. Every section of `writing.md` carries before-and-after pairs. design.md does not say what a pair looks like for the document-types section, where the unit is a whole document.
17. The line edit reads "the author's short plan". design.md does not say whether authoring may draft that short plan for the author to agree, or must wait for the author to write the plan.
18. The short-artefact path lists no plan check. design.md does not say whether `hedy plan check` runs on a short form.
19. The ticket form does not say whether the Jira wiki markup the ticket skill requires is part of the form `SKILL.md` holds.
