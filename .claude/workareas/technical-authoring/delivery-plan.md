# Authoring: Delivery Plan

This plan delivers the authoring MVP that `design.md` describes. `decisions.md` holds the settled decisions, `retention.md` says which existing material goes where, and `source-map.md` gives the line references.

## Rules for Every Step

- **New files only, until the cutover.** The new skill is built beside the old estate. No existing file is edited before step 4, so the old system keeps working and a failed trial is undone by deleting the new files.
- **The old files are frozen.** Nobody edits `language.md`, the authoring-voice rule or the editorial skills during the build, because an edit there would not reach the new files.
- **New files are written new.** Each file takes the passages `source-map.md` names and writes the gaps new. No old file is copied whole, because a copy carries the residue the analysis found: gate notes, calibration narrative and links into the editorial skill.
- **Workers commit nothing.** The orchestrating session verifies each step against its definition of done, then commits.

## Steps

| Step | State | Delivers |
| --- | --- | --- |
| 1. Source map | done | `source-map.md` and `retention.md` |
| 2. The skill's files | done | `writing.md`, `line-editing.md`, `plan-template.md` and `SKILL.md` |
| 2b. The planning workflow | done, verified against the definition of done, and `design.md` updated to match | `references/planning.md` holding the planning conversation, `plan-template.md` with the five fields the roleplay needed, and `SKILL.md` routing a new page or deck to planning and handing the drafting to a fresh agent |
| 3. The trial | done, 10 November 2026. Round one: the skill won on structure and diagrams, and prose was close to identical whichever writer drafted. Round two, with the walking skeleton: Ben judged the skill's INS Event Design page a big improvement and banked the work. The other test cases and the line edit were not run, so the line-edit path is untested | three test cases, each read blind by Ben: the INS Event Design page from `analysis/ins-events/plan.md`, a deck from the JSON-LD explainer analysis, and a page from a further analysis folder, each against british-technical-writing given the same material, plus a line edit of one existing page |
| 4. The cutover | done, 10 November 2026, in four commits ending at `2eb4eb8`. The estate is deleted and the prose gate goes with no replacement (decision 24). The hedy checks are deferred. `step-4-references.md` holds every reference found and its resolution, `step-4-owner-steps.md` records the hook and settings changes Ben applied by script, and `gate-data/` holds the word table and the golden cases for a later check | the deletion of the skills, tools, documents, rule and commit-message hook, the prose gate removed from pre-commit and `create-pr.sh`, every caller repointed at the authoring skill or `writing.md`, and the authoring skill stating that the closing pass is the check |
| 5. History rewrite | done, merged on 11 November 2026 through PR #9 | three commits: the estate removed, hedy introduced, the authoring skill added, which Ben force-pushes |
| 6. `hedy prose check` | round 1 built and round 2 reported on branch `hedy-prose-check`, 11 November 2026. Ben acted on round 2 (decision 28). The check runs in the `commit-msg` hook and `create-pr.sh`, and no hook checks the files (decision 29). Round 3 drops the contact clause and aside stacking and adds `only` to the words to examine (decision 30). The other round 3 patterns are the next decision | the rounds in `hedy-prose-check-plan.md`: round 1 checks files and stdin against the word tables of `language.md` and five literal patterns, round 2 reports the counts over the estate, and round 3 runs only if round 2 changes what Ben does |

## Step 2: The Skill's Files

| File | Location | Budget |
| --- | --- | --- |
| `writing.md` | `.claude/best-practices/writing/writing.md` | 3,500 words |
| `line-editing.md` | `.claude/skills/authoring/references/line-editing.md` | 2,000 words |
| `plan-template.md` | `.claude/skills/authoring/assets/plan-template.md` | 800 words |
| `SKILL.md` | `.claude/skills/authoring/SKILL.md` | 200 lines |

Definition of done:

1. Each file holds every item its row of "The Files" and its bullet in "The Read List" of `design.md` name, item by item against the requirement list in `source-map.md`.
2. Each item comes from the source `source-map.md` recommends, or is written new where the map records a gap. Nothing comes from the british-technical-writing skill.
3. No file carries residue: no gate notes, calibration narrative, finding codes, heuristic codes, decision numbers, or links into the editorial skills.
4. Each file is within its budget.
5. `check-prose.sh` reports no FAIL and no WARN line on any of the four files, because every word-table row becomes a Change rule at the cutover.
6. `lint-skills.sh` passes with the new skill in place.
7. No existing file is changed. The allowlist entries the skill needs in `.claude/settings.json` are listed for Ben, not written.

## Step 2b: The Planning Workflow

| File | Location | Change | Budget |
| --- | --- | --- | --- |
| `planning.md` | `.claude/skills/authoring/references/planning.md` | new | 1,800 words |
| `plan-template.md` | `.claude/skills/authoring/assets/plan-template.md` | revised | 1,100 words |
| `SKILL.md` | `.claude/skills/authoring/SKILL.md` | revised | 200 lines |

The sources are `planning-dialogue.md`, including "Lessons From the Roleplay", decisions 6 and 7 in `decisions.md`, and `analysis/ins-events/plan.md` as the worked evidence of a plan the conversation produced.

Definition of done:

1. `planning.md` holds the planning conversation:
   - reading the material the author points at before asking anything
   - the three opening questions: the reader and what the reader does afterwards, what matters most as a paragraph, and how deep the page goes
   - the play-back of the reader, purpose and opening, with the main sentence offered as two or three options with previews
   - the points and the questions they raise, derived by the editor and never asked of the author
   - the four checks: one kind of thing per level, gaps in both directions, terms introduced before use, and each point's consequence if false
   - open items put to the author
   - the storyboard: per section, a heading written to the heading rules in `writing.md`, the opening point, the form, the image with what the image shows and why, and the length
   - the detail rule naming the highest and lowest rung, and what the document leaves out
   - the author's agreement, then the plan written beside the material and checked
   - a plan that drafting may reopen
   - how a slide deck differs: one section per slide, one point per slide
2. `planning.md` states the limits of the role: planning reads and organises the material, and does not check facts, produce new findings from the data, write prose or draw images.
3. `plan-template.md` holds the opening, the detail rule and what is left out in the full form, an image and a length for each section, the purpose as what the reader can do after reading, and questions derived from the points. Its completeness rules cover the new fields, and its worked plan uses every field and stays invented.
4. `SKILL.md` sends a new page or deck to the planning workflow, gives the drafting to a fresh agent that receives only the plan and `writing.md`, has the drafting agent draw each image from the plan as a Mermaid diagram checked with the mermaid-check skill, keeps the short plan for short artefacts, adds `planning.md` to the read list, and adds planning triggers to the description.
5. Each file is within its budget and carries no residue, and `check-prose.sh` reports no FAIL and no WARN line on any of the three files.
6. `lint-skills.sh` passes.
7. `writing.md`, `line-editing.md` and every file outside the skill are unchanged.

## Step 3: The Trial

- The trial drafts are written outside the authoring-voice rule's paths, so each arm sees only its own guidance while the old rule still loads.
- Each plan comes from the planning workflow with Ben, and the result reports that the comparison measures the planning and the writing together.
- The INS Event Design plan already exists at `analysis/ins-events/plan.md`, from the roleplay of 5 November 2026.

## Step 4: The Cutover Deletes

- The editorial, editorial-triage, editorial-help and design-consistency skills, and their tools, tests and hooks.
- `tools/editorial-metrics/`, which the decision of 4 November 2026 names among the code to delete.
- `language.md`, the authoring-voice rule, `snapshot-authoring.md` and `ubiquitous-language.md`, whose content has moved into the new files.

The same change repoints the callers, which other skills own: the pr skill, `create-pr.sh`, `commits.md`, `pull-requests.md`, the jira skill's ticket section, the mermaid-check skill, `.githooks/pre-commit`, `.githooks/commit-msg`, `AGENTS.md`, `CLAUDE.md`, the README, hedy's rule files and `lint-skills.sh`. The write-time hook in `settings.json` is drafted for Ben. Step 4 starts with a full search of the estate for every reference to the deleted files, because this list came from a partial search.

Done on 10 November 2026. The full search found the callers above and more: the confluence-publish and decide skills, `enforcement.md`, `anti-patterns.md`, `dot-claude-layout.md`, `hedy/CLAUDE.md`, the saved workflow `workflows/editorial-triage.js`, the `editorial-efficiency` workarea, the audit and scaffold records of the deleted skills, and the `.gitignore` entries for their run state. `step-4-references.md` lists each hit with its resolution. The prose gate went with no replacement, so the authoring skill now states that the closing pass is the check. The word table and the 41 golden cases of the gate are preserved in `gate-data/` for a later hedy check.
