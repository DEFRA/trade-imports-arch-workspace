# Step 4: References to the Deleted Estate

This list records every reference the search of 10 November 2026 found to the files, tool domains, skills and names that step 4 deletes, with the action planned for each. The search ran `command grep -rn` over the workspace root with a trailing slash, for `editorial`, `check-prose`, `language.md`, `authoring-voice`, `design-consistency`, `snapshot-authoring`, `ubiquitous-language`, `commit-msg` and `hook-check-written`, and separately over the three child repositories. Hits inside the files the step deletes are not listed, because the files go whole.

## The Deletion Set

313 tracked files go. Each path is deleted whole, so no hit inside the path is listed.

| Path | Reason |
| --- | --- |
| `.claude/skills/editorial/`, `.claude/skills/editorial-triage/`, `.claude/skills/editorial-help/`, `.claude/skills/design-consistency/` | the skills the authoring skill replaces |
| `.claude/tools/editorial/`, `.claude/tools/editorial-triage/`, `.claude/tools/editorial-help/`, `.claude/tools/editorial-metrics/`, `.claude/tools/design-consistency/` | the tool domains of those skills, with their tests and goldens |
| `.claude/best-practices/writing/language.md`, `.claude/best-practices/writing/snapshot-authoring.md`, `.claude/best-practices/writing/ubiquitous-language.md` | the content moved into `writing.md` and the preserved word table |
| `.claude/rules/authoring-voice.md` | the drafting digest, whose one home is now `writing.md` |
| `.githooks/commit-msg` | runs only the prose gate |
| `.claude/workflows/editorial-triage.js` | the saved workflow the editorial-triage skill launched |
| `.claude/workareas/editorial-efficiency/` | the cost measurement and redesign of the editorial review, which exist only for the editorial skill |
| `.claude/workareas/skills-audit/editorial.md`, `.claude/workareas/skills-audit/editorial-triage.md` | audit plans for deleted skills |
| `.claude/workareas/skill-creator/editorial-help/`, `.claude/workareas/skill-creator/editorial-triage/`, `.claude/workareas/skill-creator/design-consistency/` | scaffold decisions for deleted skills |

## Hooks and Scripts

| Hit | Planned action |
| --- | --- |
| `.githooks/pre-commit:3` the header names the style check | reword the header |
| `.githooks/pre-commit:50` the golden trigger lists `editorial`, `editorial-triage` and `editorial-metrics` | drop the three domains from the pattern |
| `.githooks/pre-commit:59-71` the prose-gate, triage and metrics golden suites | delete the three blocks |
| `.githooks/pre-commit:76-93` the editorial style gate on staged markdown | delete the block, and the `MD_STAGED` variable the block alone reads |
| `.claude/tools/pr/create-pr.sh:10-12` the header describes the prose gate | reword the header to the attribution guard alone |
| `.claude/tools/pr/create-pr.sh:60-68` the prose gate call | delete the block and keep the attribution guard |
| `.claude/tools/workspace/guard-bash-tests.sh:85` an allow case invokes `check-prose.sh` | point the case at a tool script that survives |
| `.claude/tools/workspace/lint-skills.sh:25-28` the header describes checks 5 and 5b | delete the lines |
| `.claude/tools/workspace/lint-skills.sh:161, 202-222` check 4b reads `rule-scope.sh` | delete check 4b and keep check 4 |
| `.claude/tools/workspace/lint-skills.sh:225-253` check 5 reads the authoring-voice rule against three deleted documents | delete check 5 |
| `.claude/tools/workspace/lint-skills.sh:255-274` check 5b reads the write-time hook's scope | delete check 5b |
| `.claude/tools/workspace/check-deps.sh` | no hit |
| `Makefile:69-71` the three golden suites in `make check` | delete the lines |
| `.claude/hooks/realpath-file-tools.sh:11` a comment names `analysis/authoring-voice/`, the hook's development folder | no change, because the path is not a deleted file; noted for Ben in the owner steps |
| `.claude/settings.json:30-31` `Skill(editorial)` and `Skill(editorial-triage)` | owner step |
| `.claude/settings.json:113` the `PostToolUse` entry running `hook-check-written.sh` | owner step |
| `.claude/settings.local.json:30-31, 35` the two skill allows and a `Write` allow on the editorial-triage workarea | owner step |
| `.gitignore:28-32, 37` the run-state folders of the editorial, editorial-triage and design-consistency skills, and `editorial-research/` | delete the lines; the folders on disk stay untracked for Ben to remove |

## The Authoring Skill

| Hit | Planned action |
| --- | --- |
| `.claude/skills/authoring/SKILL.md:37` the interim rule runs the write hook and `check-prose.sh` | rewrite "Checks", the mechanical check step of "The Drafting Brief", "Resolving Change Hits" and the "Checks" line of the hand-over report, so no mechanical prose check exists today and the closing pass is the check |

## Skills That Called the Estate

| Hit | Planned action |
| --- | --- |
| `.claude/skills/pr/SKILL.md:6-12` a skill-scoped hook runs `hook-check-written.sh` | delete the `hooks` block |
| `.claude/skills/pr/SKILL.md:45` drafting holds the editorial skill's voice and brief | point at the authoring skill's short-artefact path |
| `.claude/skills/pr/SKILL.md:46` gate the draft with `check-prose.sh` | delete the step |
| `.claude/skills/pr/SKILL.md:57` the refusal names language-guide violations | keep the attribution refusal only |
| `.claude/skills/pr/SKILL.md:75` the cheat-sheet row says the script refuses style violations | keep the attribution refusal only |
| `.claude/skills/pr/SKILL.md:76` the cheat-sheet row for `check-prose.sh` | delete the row |
| `.claude/skills/jira/SKILL.md:34` ticket content follows the editorial skill and the language guide | point at the authoring skill's ticket form and `writing.md` |
| `.claude/skills/jira/SKILL.md:36-41` the content rules, with a proposed-work section at line 40 | drop the proposed-work section, so the form states why, what and constraints and never how |
| `.claude/skills/mermaid-check/SKILL.md:3, 26` NOT-for clauses route wording to `editorial` | route to `authoring` |
| `.claude/skills/mermaid-check/SKILL.md:28-42` the "Working with editorial" section and its table cite the language guide | rewrite for `authoring` and `writing.md` |
| `.claude/skills/mermaid-check/SKILL.md:106` the completion output hands wording to editorial | hand to authoring |
| `.claude/skills/mermaid-check/decisions.md:48` the disambiguation names editorial | name authoring |
| `.claude/skills/confluence-publish/SKILL.md:3, 20` NOT-for clauses route content quality to `editorial` | route to `authoring` |
| `.claude/skills/confluence-publish/decisions.md:46` the disambiguation names editorial | name authoring |
| `.claude/skills/decide/SKILL.md:3, 20` NOT-for clauses route review findings to `editorial-triage` | drop the clause, because no skill closes review findings now |
| `.claude/skills/decide/decisions.md:55` the disambiguation names editorial-triage | drop the clause |
| `.claude/skills/british-technical-writing/SKILL.md:121, 246, 325, 358` the word `editorial` in its ordinary sense | no change, under decision 4 |

## Documents

| Hit | Planned action |
| --- | --- |
| `AGENTS.md:93-97` five tool-domain rows | delete the rows |
| `AGENTS.md:114` five golden suites | two suites, scaffold and doctor |
| `AGENTS.md:118-119` the prose gate and the write-time check rows | delete the rows |
| `AGENTS.md:135-146` the authoring voice and the editorial skill's invocation rule | rewrite to name `writing.md` and the authoring skill |
| `CLAUDE.md:13` the rules sentence names `authoring-voice.md` | drop the clause |
| `README.md:35` the rules row describes `authoring-voice.md` and the write-time check | drop the sentence |
| `README.md:42` "editorial writing (`writing/`)" | "the house writing standard (`writing/`)" |
| `.claude/best-practices/git/commits.md:16` tone follows the editorial skill and the language guide | point at the authoring skill's commit message form and `writing.md` |
| `.claude/best-practices/git/pull-requests.md:24, 26` the editorial skill's Writing path and the prose gate's FAQ-voice refusal | point at the authoring skill and state the heading rule from `writing.md` |
| `.claude/best-practices/claude-code/enforcement.md:3` the 13 August 2026 em dash despite the editorial language guide | keep the event and drop the name |
| `.claude/best-practices/claude-code/enforcement.md:18` the editorial Stop gate and the write-time check as the estate's skill-scoped and global uses | rewrite to describe the mechanism without a current instance |
| `.claude/best-practices/claude-code/enforcement.md:22` the authoring-voice rule's list as the write-time scope | keep the finding on rule loading and the realpath hook, and drop the scope statement |
| `.claude/best-practices/claude-code/enforcement.md:36` `check-prose.sh` as an exit-vocabulary example | `create-pr.sh` alone |
| `.claude/best-practices/claude-code/enforcement.md:39` the write-time hook and the Stop hook as the baseline example | keep the idiom and drop the instance |
| `.claude/best-practices/claude-code/enforcement.md:48` the worked example links the editorial skill and `language.md` | replace with the attribution guard in `create-pr.sh` and `guard-bash.sh` |
| `.claude/best-practices/skills/anti-patterns.md:101, 109` documented instances from editorial-triage | delete the two instance sentences |
| `.claude/rules/dot-claude-layout.md:13` "editorial reviews" as an example of task state | drop the example |
| `.claude/rules/dot-claude-layout.md:14` the authoring-voice list as the write-time scope | delete the sentence |
| `.claude/rules/hedy-menu.md:12` strings follow `language.md` | `writing.md` |
| `hedy/CLAUDE.md:76` help text follows `language.md` | `writing.md` |
| `hedy/DECISIONS.md:107` the port order ends with "the estate ports as the editorial skills need them" | drop the clause, because no port is planned |
| `hedy/src/commands/confluence/__fixtures__/docs-repo/scripts/confluence/confluence-config.json:23`, `docs-repo.test.js:160`, `publish.test.js:158` | no change, because `editorial-profile.md` is a file name in the docs repository's publish config, not the estate |

## Records

| Hit | Planned action |
| --- | --- |
| `.claude/workareas/realpath-hook/handoff.md:25` names `authoring-voice.md` among the rules that failed to load | name the rules generically, keeping the evidence |
| `.claude/workareas/skills-audit/mermaid-check.md:83` quotes "the editorial style guide" | "the writing guide" |
| `.claude/workareas/skill-creator/confluence-publish/decisions.json:25`, `decide/decisions.json:30`, `mermaid-check/decisions.json:27` scaffold disambiguations name editorial or editorial-triage | the same edits as the three skills' `decisions.md` |
| `.claude/workareas/technical-authoring/*` | no change, because the folder records the work and the definition of done excludes the folder |

## Child Repositories

Nothing in a child repository changes.

| Hit | Note |
| --- | --- |
| `trade-imports-documentation/docs/.../INS Auth/editorial-profile.md` | the INS Auth document set's profile for the deleted tools. The reader frame became the worked reader in `plan-template.md`. The file stays until the docs repository decides on the file |
| `trade-imports-documentation/scripts/confluence/confluence-config.json:233` | excludes `editorial-profile.md` from publishing, which still applies while the file exists |
| `trade-imports-documentation/astro/src/content.config.ts:13` | excludes `editorial-profile.md` from the site, the same |
| `trade-imports-documentation/docs/.../ins-auth-analysis.md:84` | the word in its ordinary sense inside quoted guidance |
| `delivery-info-arch-tooling/`, `trade-imports-schemas/` | no hit |
