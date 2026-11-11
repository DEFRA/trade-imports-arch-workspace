# Editorial Estate Inventory

Inventory taken on 4 November 2026 on branch `authoring-voice` (HEAD 4961f2e plus the untracked files in `git status`). Paths are relative to `~/trade-imports-arch-workspace/` unless stated. Line numbers are the file's own. The inventory records facts only.

## 1. Functions

### 1.1 Skill `editorial` (`.claude/skills/editorial/`)

| Function | Implementing files | Entry point |
| --- | --- | --- |
| Writing path: brief, outline, draft and self-review | `SKILL.md` lines 65 to 87 | Skill "Writing path" steps 1 to 3 |
| Review path: reader frame, meaning recovery, language tests, set self-check, waste and structure | `SKILL.md` lines 89 to 149 | Skill "Review path" steps 1 to 5 |
| Modes (`review`, `revise`) and intents (`clarify`, `distil`) | `SKILL.md` lines 51 to 53 | Named by every run |
| Cold-reader review: one fresh-context reviewer, or the session itself for a small artefact, applying the cold-editor role | `references/review-brief.md` ("Cold editor", line 122) | Review path step 6, first paragraph (`SKILL.md:153`) |
| Layered review, set-up: hash pages, run names check against the profile, build the work packet with layer cards, create the review folder, `--since` and `--settled` re-review scoping | `tools/editorial/start-layered-review.sh`, which calls `read-profile.sh`, `check-names.sh`, `build-review-packet.sh` and `tools/editorial-triage/build-triage.sh --hash-pages` | `SKILL.md:157`, script |
| Review packet: one file holding the brief, the layer cards, language.md, ubiquitous-language.md, snapshot-authoring.md, document-types.md, the triage schema's "Reviewer-set fields" section, explain-and-rewrite.md, the profile digest and the line-numbered pages | `tools/editorial/build-review-packet.sh` (sources listed at lines 51 to 55) | Called by `start-layered-review.sh:152`, or by hand |
| Layered review, passes: one loader agent reads the packet and forks a paragraph, page and set pass per page, each writing `drill-*`, `structural-*` and `editor-*` JSON | `references/LAYERED_LOADER.md`, `references/layer-cards.md` | `SKILL.md:158`, Agent spawn (`general-purpose`, `model: opus`) |
| Layered review, assembly: validate every pass's findings against the contract and build the version 3 review result | `tools/editorial/assemble-review.sh` (hashes pages through `build-triage.sh --hash-pages` when `--hashes` is absent) | `SKILL.md:159`, script |
| Explain and rewrite: explain, compare, rewrite, check the deviation, fresh-reader judgement | `references/explain-and-rewrite.md` | Skill "Explain and Rewrite" (`SKILL.md:175`) |
| Claim nominator on one edit: words added, removed, missing sentences, `nominated`, `layoutOnly` | `tools/editorial/claim-diff.sh`, using `tools/editorial-triage/lib/claim-elements.jq` | Script, cited in `SKILL.md:203` |
| Prose style gate: punctuation, language.md word table FAIL and WARN rows, profile word table, `--terms` table, `docs` scope exemption, FAQ voice, heading case, trailing `it`, `N/A`, generic `portal`, compression family; `--stdin --label`, `--print-fail-lines` | `tools/editorial/check-prose.sh` (456 lines), reading the "Words to avoid or examine" table of `best-practices/writing/language.md` (line 154, 39 rows) | `SKILL.md:163` to 173, script; also every caller in section 2 |
| Write-time check: gate the text a Write or Edit introduced, excusing FAIL lines already in git HEAD, scoped by the authoring-voice rule, `--outside-scope` for the complement, `--record` to log touched paths | `tools/editorial/hook-check-written.sh`, sourcing `tools/editorial/rule-scope.sh` | PostToolUse hook: `settings.json:113` (global, `--scope ... --record`), `skills/editorial/SKILL.md:9` (`--outside-scope --record`), `skills/pr/SKILL.md:11` (`--outside-scope`) |
| Turn-end block: re-gate every recorded path at Stop and exit 2 while a FAIL line absent from git HEAD remains | `tools/editorial/hook-stop.sh`, reading `${TMPDIR}/claude-editorial-<session>.paths` | Stop hook in `skills/editorial/SKILL.md:11` to 15 only (no Stop entry in `settings.json`) |
| Write-time scope: parse a rule's `paths`, `gate-paths` and `gate-exclude` globs and decide whether a file is gated | `tools/editorial/rule-scope.sh` | Sourced by `hook-check-written.sh:40`, called by `tools/workspace/lint-skills.sh:161` |
| Editorial profile reader: `editorial-profile.md` to JSON (reader, defaults, context pages, run notes, preferred names) | `tools/editorial/read-profile.sh` | Called by `check-names.sh:35`, `build-review-packet.sh:65`, `start-layered-review.sh:72`, `start-editorial-help.sh:63` |
| Preferred-names check and rename (`--fix`) | `tools/editorial/check-names.sh` | Called by `start-layered-review.sh:74` and `start-editorial-help.sh:68`, script |
| Word-table tiering: count candidate rows over tracked pages and propose FAIL, WARN or Guidance | `tools/editorial/tier-candidates.sh` | Script, cited by `language.md:158` and the editorial-help skill (`SKILL.md:75`) |
| Prose-gate golden suite (46 expected cases, including `claim-diff`, `rule-scope`, `read-profile`, `check-names`, `tier-candidates`) | `tools/editorial/tests/run-golden.sh`, `tests/fixtures/`, `tests/expected/` | `Makefile:69`, `.githooks/pre-commit:59` |

Files the `editorial` skill loads:

| File | Lines | Loaded when |
| --- | --- | --- |
| `skills/editorial/SKILL.md` | 205 | Skill invocation |
| `skills/editorial/references/review-brief.md` | 148 | Cold-reader pass; packet for the layered review |
| `skills/editorial/references/layer-cards.md` | 69 | Packet for the layered review |
| `skills/editorial/references/LAYERED_LOADER.md` | 28 | Loader subagent |
| `skills/editorial/references/document-types.md` | 54 | Choosing a document mode; packet |
| `skills/editorial/references/voice-examples.md` | 113 | Before drafting a full document |
| `skills/editorial/references/clarify-examples.md` | 152 | Once, for a `clarify` edit of existing prose |
| `skills/editorial/references/explain-and-rewrite.md` | 24 | Explain and rewrite; packet |
| `best-practices/writing/language.md` (outside the estate) | 283 | Always; packet |
| `best-practices/writing/snapshot-authoring.md` (outside) | 32 | Editing an existing document; packet |
| `best-practices/writing/ubiquitous-language.md` (outside) | 41 | Workspace terms; packet |
| `skills/editorial-triage/assets/editorial-triage-schema.md`, "Reviewer-set fields" only | 225 (whole file) | Packet |
| `best-practices/skills/agent-skills.md` (outside, cited by every estate skill) | 142 | Bash call hygiene |

### 1.2 Skill `editorial-triage` (`.claude/skills/editorial-triage/`)

| Function | Implementing files | Entry point |
| --- | --- | --- |
| Run naming: review result, commit label, run slug | `SKILL.md` lines 60 to 62 | Step 1 |
| Triage workflow: build, verify, rebuild with one retry, grade, score, plan; never applies | `.claude/workflows/editorial-triage.js` (123 lines; runner agents on `sonnet`, effort `low`) | Steps 2 to 6, Workflow `editorial-triage` |
| Build: normalise a version 3 review result, resolve anchors, gate rewrites with `check-prose.sh`, nominate claim changes, apply verifier verdicts, cluster, partition, rank; `--hash-pages` | `tools/editorial-triage/build-triage.sh` (605), `lib/normalize-v2.jq` (82), `lib/claim-elements.jq` (107), `lib/triage.jq` (194), `triage-lib.jq` (62) | Step 2, script |
| Claim verification: one verifier per named page judges every nominated rewrite and removal | `references/CLAIM_VERIFIER.md` | Step 3, Agent spawn, or workflow phase Verify |
| Grading: one grader per page plus one for set-wide clusters, predicting one closing move per cluster | `references/GRADER.md`, `assets/grading-rubric.md` | Step 4, Agent spawn, or workflow phase Grade |
| Score: share of R, C, W grades, load and ignored share | `tools/editorial-triage/grade-triage.sh score`, `lib/grade.jq` (1,043) | Step 5 |
| Closing plan and spot check: `closing/plan.md`, `plan.json`, `spot-check.json` | `grade-triage.sh plan` | Step 6 |
| Apply: write R, C, W entries to the pages after re-checking each, refuse review mode, gate each changed page | `grade-triage.sh apply` (writes outside the workarea) | Step 7 |
| Present remaining Decide, Presentation, Open, Ignored and Problems sections | `SKILL.md` lines 129 to 131 | Step 8 |
| Calibration: sample rounds, label the user's moves, measure grader agreement, add rubric heuristics | `grade-triage.sh sample`, `render`, `label`, `agree`; `assets/grading-rubric.md` | Skill "Calibrate" section |
| Triage golden suite (9 cases) | `tools/editorial-triage/tests/run-golden.sh`, fixtures, expected | `Makefile:70`, `.githooks/pre-commit:63` |

Files the `editorial-triage` skill loads:

| File | Lines | Loaded by |
| --- | --- | --- |
| `skills/editorial-triage/SKILL.md` | 183 | Skill invocation |
| `skills/editorial-triage/references/GRADER.md` | 86 | Grader subagent |
| `skills/editorial-triage/references/CLAIM_VERIFIER.md` | 91 | Verifier subagent |
| `skills/editorial-triage/assets/grading-rubric.md` | 103 | Grader; Calibrate step 5 edits it |
| `skills/editorial-triage/assets/editorial-triage-schema.md` | 225 | Grader, verifier, build contract |
| `skills/editorial-triage/decisions.md` | 56 | Not loaded at run time (skill-creator record) |

### 1.3 Skill `editorial-help` (`.claude/skills/editorial-help/`)

| Function | Implementing files | Entry point |
| --- | --- | --- |
| Page facts before a recommendation: words, prose FAIL lines per page, profile, names check, earlier reviews and triages | `tools/editorial-help/start-editorial-help.sh` (calls `check-prose.sh --print-fail-lines`, `read-profile.sh`, `check-names.sh`) | Step 0, script |
| Goal question, recommendation with command, cost and next step, brief drafting for an editorial pass | `SKILL.md` lines 30 to 77, `references/editorial-guide.md` | Steps 1 and 2 |
| Customisation routing: workspace rules, document-set profile, one run | `references/editorial-guide.md` ("Customising the Tools", line 74) | Step 2 |
| Start the chosen tool on the user's go; create and check a profile | `SKILL.md` lines 79 to 81, `read-profile.sh` | Step 3 |

`disable-model-invocation: true` (`SKILL.md:4`): the skill runs only as `/editorial-help`.

| File | Lines | Loaded by |
| --- | --- | --- |
| `skills/editorial-help/SKILL.md` | 99 | Skill invocation |
| `skills/editorial-help/references/editorial-guide.md` | 126 | Step 0; also readable without Claude Code (`AGENTS.md:94`) |
| `skills/editorial-help/decisions.md` | 55 | Not loaded at run time |

### 1.4 Tool domain `editorial-metrics` (`.claude/tools/editorial-metrics/`, no skill)

| Function | Implementing files | Entry point |
| --- | --- | --- |
| Transcript extraction: per-response and per-tool-call records from session and workflow transcripts | `extract-run.sh` (114), `lib/extract.jq` (71), `lib/classify.jq` (78), `lib/phases.jq` (37) | Script |
| Summary tables: cost by role and model, file and page visits, context composition, phase timeline | `summarise.sh` (70), `lib/summarise.jq` (134), `rates.json` (49) | Script |
| Prediction against the process model | `predict.sh` (74), `lib/predict.jq` (53) | Script |
| Scenario repricing | `scenario.sh` (31), `lib/scenario.jq` (84) | Script |
| Run metrics and arm comparison with noise band and fix recall | `run-metrics.sh` (45), `lib/run-metrics.jq` (85), `compare-runs.sh` (88) | Script |
| Reference document sizes | `refs-inventory.sh` (31) | Script |
| Draft density: gate hits per 1,000 words by rule (runs `check-prose.sh`) | `draft-density.sh` (139) | Script |
| Metrics golden suite (2 cases: `counting-rules`, `draft-density`) | `tests/run-golden.sh`, fixtures, expected | `Makefile:71`, `.githooks/pre-commit:67` |

### 1.5 Skill `design-consistency` (listed separately, fate undecided)

| Function | Implementing files | Entry point |
| --- | --- | --- |
| Run set-up: hash pages, write manifest, list pages to extract (`MODE: EXTRACT` or `MODE: CHECK`) | `tools/design-consistency/start-design-consistency.sh` (70) | Step 0 |
| Fact extraction: one extractor per page writes structured facts | `skills/design-consistency/references/FACT_EXTRACTOR.md` (38) | Step 1, Agent spawn |
| Register build: merge facts into `register.json` and `register.tsv` sorted by actor then object | `tools/design-consistency/build-register.sh` (48) | Step 2 |
| Contradiction check over the register only | `skills/design-consistency/references/CONSISTENCY_CHECKER.md` (40) | Step 3, Agent spawn |
| Question rendering: `questions.md`, most severe first, flagging entries that cite fewer than two facts | `tools/design-consistency/render-design-consistency.sh` (48) | Step 4, then `/decide` |

| File | Lines | Loaded by |
| --- | --- | --- |
| `skills/design-consistency/SKILL.md` | 99 | Skill invocation |
| `skills/design-consistency/references/FACT_EXTRACTOR.md` | 38 | Extractor subagent |
| `skills/design-consistency/references/CONSISTENCY_CHECKER.md` | 40 | Checker subagent |
| `skills/design-consistency/assets/design-consistency-schema.md` | 39 | State contract |
| `skills/design-consistency/decisions.md` | 57 | Not loaded at run time |

No golden suite covers design-consistency. Its tools call no other estate script.

### 1.6 Dependencies Between Estate Parts

| From | To | Location |
| --- | --- | --- |
| `editorial/claim-diff.sh` | `editorial-triage/lib/claim-elements.jq` | `claim-diff.sh:22` |
| `editorial/assemble-review.sh` | `editorial-triage/build-triage.sh --hash-pages` | `assemble-review.sh:57` |
| `editorial/start-layered-review.sh` | `editorial-triage/build-triage.sh --hash-pages` | `start-layered-review.sh:115` |
| `editorial/build-review-packet.sh` | `skills/editorial-triage/assets/editorial-triage-schema.md` | `build-review-packet.sh:52` |
| `editorial-triage/build-triage.sh`, `grade-triage.sh` | `editorial/check-prose.sh` | `build-triage.sh:32`, `grade-triage.sh:101` |
| `GRADER.md`, `CLAIM_VERIFIER.md` | `editorial/check-prose.sh` on their own notes | `GRADER.md:54`, `CLAIM_VERIFIER.md:45` |
| `editorial-help/start-editorial-help.sh` | `check-prose.sh`, `read-profile.sh`, `check-names.sh` | lines 46, 63, 68 |
| `editorial-metrics/draft-density.sh` | `editorial/check-prose.sh` | `draft-density.sh:34` |
| `editorial/tests/fixtures/rule-scope/case.sh` | `tools/workspace/lint-skills.sh` | `case.sh:59` |
| `skills/editorial/SKILL.md` | `design-consistency`, `editorial-triage` skills | lines 35, 161 |

### 1.7 Estate Inputs Held Outside the Estate

| File | Read by |
| --- | --- |
| `best-practices/writing/language.md`, "Words to avoid or examine" table (line 154) | `check-prose.sh` (`TERMS_DOC`, line 68), `tier-candidates.sh` format |
| `rules/authoring-voice.md` frontmatter `paths` and `gate-exclude` (lines 1 to 11) | `rule-scope.sh`, through `hook-check-written.sh --scope` |
| Each document set's `editorial-profile.md`: `trade-imports-documentation/docs/systems/EUDP/Architecture and Development/INS - Imports Notification Service/INS Auth/editorial-profile.md`, the same path in `trade-imports-documentation-events/`, and the hedy fixture `hedy/src/commands/confluence/__fixtures__/docs-repo/docs/systems/HEDY/Guide/editorial-profile.md` | `read-profile.sh`, `check-names.sh`, `check-prose.sh` (nearest profile's word table) |

## 2. Callers Outside the Estate

Searched with `rg` over the workspace root, the child repo `trade-imports-documentation/` and `hedy/`, for the skill names, script names, `editorial-profile`, "style gate", "prose gate" and "write-time check". `rg` respects `.gitignore`, so gitignored run state is out of the search except where named.

### 2.1 Harness Wiring and Git Hooks

| File:line | Referencing text |
| --- | --- |
| `.claude/settings.json:30` | `"Skill(editorial)"` permission |
| `.claude/settings.json:31` | `"Skill(editorial-triage)"` permission |
| `.claude/settings.json:108` to 116 | PostToolUse `Write|Edit|MultiEdit` runs `hook-check-written.sh --scope .../authoring-voice.md --record` |
| `.claude/settings.local.json:30`, `:31` | `Skill(editorial)`, `Skill(editorial-triage)` permissions |
| `.claude/settings.local.json:35` | Write permission on `.claude/workareas/editorial-triage/**` |
| `.claude/skills/pr/SKILL.md:7` to 12 | Skill-scoped PostToolUse hook runs `hook-check-written.sh --scope ... --outside-scope` |
| `.githooks/pre-commit:2` to 3 | Header: "gate all staged markdown through the editorial style check" |
| `.githooks/pre-commit:13` to 14 | Excludes `.claude/tools/*/tests/` from the staged-markdown gate |
| `.githooks/pre-commit:50` | Golden suites run when staged paths touch `tools/(…|editorial|editorial-triage|editorial-metrics|…)/` |
| `.githooks/pre-commit:59` to 70 | Runs the prose-gate, triage and editorial-metrics golden suites |
| `.githooks/pre-commit:74` to 93 | Runs the staged `check-prose.sh` on every staged markdown file |
| `.githooks/commit-msg:2` to 16 | Runs `check-prose.sh --stdin --label "commit message"` on the message |
| `Makefile:69` to 71 | `check` target runs the three estate golden suites |
| `.gitignore:28` to 32 | Ignores `.claude/workareas/editorial-triage/`, `editorial/`, `design-consistency/` |
| `.gitignore:36` to 37 | Ignores `editorial-research/` |

### 2.2 Workspace and PR Tools

| File:line | Referencing text |
| --- | --- |
| `.claude/tools/pr/create-pr.sh:10`, `:12` | Header: refuses "editorial language-guide violations" through `check-prose.sh` |
| `.claude/tools/pr/create-pr.sh:60` to 68 | `PROSE_GATE=.../check-prose.sh`, gates title and body, exit 2 |
| `.claude/tools/workspace/lint-skills.sh:16` to 28 | Header: rule checks 4, 4b, 5, 5b name `rule-scope.sh`, `document-types.md`, `voice-examples.md`, `hook-check-written.sh` |
| `.claude/tools/workspace/lint-skills.sh:161` | `SCOPE_LIB=.../tools/editorial/rule-scope.sh` |
| `.claude/tools/workspace/lint-skills.sh:210` | FAIL when lint and `rule-scope.sh` read different globs |
| `.claude/tools/workspace/lint-skills.sh:232` to 240 | Check 5: quoted headings in `authoring-voice.md` must exist in `language.md`, `skills/editorial/references/document-types.md` or `voice-examples.md` |
| `.claude/tools/workspace/lint-skills.sh:262` to 273 | Check 5b: settings.json `hook-check-written.sh` must carry `--scope` naming an existing rule |
| `.claude/tools/workspace/guard-bash-tests.sh:85` | Allow case: `bash ~/.../tools/editorial/check-prose.sh ...` |

No hit in `.claude/hooks/`, `.claude/tools/skill-creator/` or `.claude/skills/skill-creator/`.

### 2.3 Rules

| File:line | Referencing text |
| --- | --- |
| `.claude/rules/authoring-voice.md:1` to 11 | Frontmatter `paths` and `gate-exclude`, the write-time check's scope |
| `.claude/rules/authoring-voice.md:16` | "where the write-time check runs, and `gate-exclude` keeps the check away" |
| `.claude/rules/authoring-voice.md:24` | "A document set's `editorial-profile.md` holds that reader" |
| `.claude/rules/authoring-voice.md:25` | "Pick the document mode in document-types.md" |
| `.claude/rules/authoring-voice.md:53` | "the gate's job: the write-time check reports the FAIL lines" |
| `.claude/rules/dot-claude-layout.md:13` | Task state example "(editorial reviews, sync output)" |
| `.claude/rules/dot-claude-layout.md:14` | "The `authoring-voice.md` list is also the write-time check's scope" |

### 2.4 Best Practices

| File:line | Referencing text |
| --- | --- |
| `best-practices/writing/language.md:1` | Title "Workspace language and editorial style" |
| `best-practices/writing/language.md:3` | "The Gate notes show which rules `check-prose.sh` enforces" |
| `best-practices/writing/language.md:14`, `:124`, `:235` | Links to `skills/editorial/references/document-types.md` |
| `best-practices/writing/language.md:15` | "the gate exempts files under `.claude/`" |
| `best-practices/writing/language.md:81` | Link to `skills/editorial/references/review-brief.md`, "Compression patterns" |
| `best-practices/writing/language.md:83` | "The metaphor candidates the gate warns on" |
| `best-practices/writing/language.md:87` | "The editorial process aims for" |
| `best-practices/writing/language.md:93` | Paths to `explain-and-rewrite.md` and `review-brief.md` |
| `best-practices/writing/language.md:127` | "The editorial skill's procedure says how a seam problem is handled" |
| `best-practices/writing/language.md:154` to 213 | "Words to avoid or examine" table with a Gate column, read by `check-prose.sh` |
| `best-practices/writing/language.md:156`, `:158` | `check-prose.sh` reads the table; `tier-candidates.sh` counts a new row first |
| `best-practices/writing/language.md` (22, 33, 56, 64, 107, 127, 137, 149, 150, 215 to 221, 237, 239, 271) | "Gate:" notes stating each rule's gate tier |
| `best-practices/writing/ubiquitous-language.md:3` | "The editorial skill, language guide and reviewer instructions" |
| `best-practices/claude-code/enforcement.md:3` | Pr skill pointing at the editorial language guide (13 Aug 2026 incident) |
| `best-practices/claude-code/enforcement.md:18` | Editorial Stop gate as skill-scoped hook; global `hook-check-written.sh --scope`; pr and editorial `--outside-scope` |
| `best-practices/claude-code/enforcement.md:22` | `rule-scope.sh` parses the authoring-voice list |
| `best-practices/claude-code/enforcement.md:36` | Exit-code convention citing `check-prose.sh` |
| `best-practices/claude-code/enforcement.md:39` | Write-time and Stop hooks baseline against git HEAD with `check-prose.sh --print-fail-lines` |
| `best-practices/claude-code/enforcement.md:48` | Worked example: the editorial gate layers in `skills/editorial/SKILL.md` and `tools/editorial/` |
| `best-practices/skills/anti-patterns.md:101` | Documented instance: editorial-triage `apply` refuses until `plan --sample` |
| `best-practices/skills/anti-patterns.md:109` | Documented instance: editorial-triage warns on an unknown heuristic id |
| `best-practices/git/commits.md:16` | "Follow the [editorial skill](../../skills/editorial/SKILL.md)" |
| `best-practices/git/pull-requests.md:24` | "the [editorial skill](../../skills/editorial/SKILL.md) Writing path" |
| `best-practices/git/pull-requests.md:26` | "The prose gate refuses the headings `What` and `Why`" |

### 2.5 Other Skills

| File:line | Referencing text |
| --- | --- |
| `skills/pr/SKILL.md:45` | "hold the [editorial skill](../editorial/SKILL.md)'s house voice" |
| `skills/pr/SKILL.md:46` | Run `check-prose.sh <body-file>` on the draft |
| `skills/pr/SKILL.md:57` | Script refuses "violations from the editorial language guide" |
| `skills/pr/SKILL.md:75`, `:76` | Scripts table: create-pr refuses editorial style violations; `check-prose.sh` row |
| `skills/jira/SKILL.md:34` | "follow the [editorial skill](../editorial/SKILL.md) and its language guide" |
| `skills/mermaid-check/SKILL.md:3`, `:26` | NOT-for routing to `editorial` |
| `skills/mermaid-check/SKILL.md:28` to 42 | Section "Working with `editorial`" and ownership table |
| `skills/mermaid-check/SKILL.md:106` | Completion: "hand label wording to editorial" |
| `skills/mermaid-check/decisions.md:48` | Label wording belongs to editorial |
| `skills/confluence-publish/SKILL.md:3`, `:20` | NOT-for routing: "content quality (editorial)" |
| `skills/confluence-publish/decisions.md:46` | "Distinct from editorial" |
| `skills/decide/SKILL.md:3`, `:20` | NOT-for routing to `editorial-triage` |
| `skills/decide/decisions.md:55` | Distinct from editorial-triage |
| `skills/british-technical-writing/SKILL.md:121`, `:246`, `:325`, `:358` | The word "editorial" in its ordinary sense only; no estate reference |

### 2.6 Root Documents

| File:line | Referencing text |
| --- | --- |
| `AGENTS.md:93` | Tools table row `editorial/`: every script by name |
| `AGENTS.md:94` | Row `editorial-help/`: `start-editorial-help.sh`, `editorial-guide.md` |
| `AGENTS.md:95` | Row `editorial-triage/`: `build-triage.sh`, `grade-triage.sh` |
| `AGENTS.md:96` | Row `design-consistency/`: its three scripts |
| `AGENTS.md:97` | Row `editorial-metrics/`: its scripts |
| `AGENTS.md:114` | Enforcement map: "Golden tests (5 suites)" including prose-gate, editorial-triage, editorial-metrics |
| `AGENTS.md:118` | Enforcement map row `check-prose.sh` (editorial style gate) |
| `AGENTS.md:119` | Enforcement map row write-time check `hook-check-written.sh --scope` and the editorial Stop hook |
| `AGENTS.md:141` to 147 | "Invoke the editorial skill ... only when the user asks for an editorial pass" |
| `CLAUDE.md:15` | `authoring-voice.md` list "is also the write-time check's scope" |
| `README.md:42` | `best-practices/` description: "editorial writing (`writing/`)" |

### 2.7 hedy

| File:line | Referencing text |
| --- | --- |
| `hedy/DECISIONS.md:107` | "the estate ports as the editorial skills need them" |
| `hedy/src/commands/confluence/publish.test.js:158` | Test case: a glob entry excludes `editorial-profile.md` |
| `hedy/src/commands/confluence/docs-repo.test.js:160` | Test case: exclusion by file name `editorial-profile.md` |
| `hedy/src/commands/confluence/__fixtures__/docs-repo/scripts/confluence/confluence-config.json:23` | `"exclude": ["editorial-profile.md"]` |
| `hedy/src/commands/confluence/__fixtures__/docs-repo/docs/systems/HEDY/Guide/editorial-profile.md` | Fixture profile file |

### 2.8 Child Repository `trade-imports-documentation`

| File:line | Referencing text |
| --- | --- |
| `astro/src/content.config.ts:13` | `'!**/editorial-profile.md'` excluded from the site |
| `scripts/confluence/confluence-config.json:233` | `"exclude": ["editorial-profile.md"]` |
| `docs/systems/EUDP/Architecture and Development/INS - Imports Notification Service/INS Auth/editorial-profile.md` | The one live profile, consumed by the profile, names and gate scripts |

### 2.9 Tracked Workareas

| Path | Hits | Nature |
| --- | --- | --- |
| `.claude/workareas/editorial-efficiency/` (21 files, 2,884 lines) | many | Experiment records and prototypes for the estate: `plan.md`, `implementation-plan.md`, `redesign-spec.md`, `results.md`, `register.json`, `r2-contradictions.json`, `prototypes/` (`build-review-packet.sh`, `build-layer-packet.sh`, `editorial-review-exp.js`, `editorial-triage-exp.js`, `layer-cards.md`, `layer0-detectors.py` and others) |
| `.claude/workareas/skills-audit/editorial.md` | 12 | Audit plan of the editorial skill |
| `.claude/workareas/skills-audit/editorial-triage.md` | 16 | Audit plan of the editorial-triage skill |
| `.claude/workareas/skills-audit/mermaid-check.md` | 1 | Mentions editorial |
| `.claude/workareas/skill-creator/editorial-help/decisions.json` | 10 | Scaffold record |
| `.claude/workareas/skill-creator/editorial-triage/decisions.json` | 5 | Scaffold record |
| `.claude/workareas/skill-creator/design-consistency/decisions.json` | 6 | Scaffold record |
| `.claude/workareas/skill-creator/mermaid-check/decisions.json`, `confluence-publish/decisions.json`, `decide/decisions.json` | 1 each | Routing mentions |
| `.claude/workareas/technical-authoring/decisions.md` (untracked) | 9 | The replacement design itself |

## 3. Sizes

| Directory | Files | Lines | Of which tests (files, lines) |
| --- | --- | --- | --- |
| `.claude/skills/editorial/` | 8 | 793 | none |
| `.claude/skills/editorial-triage/` | 6 | 744 | none |
| `.claude/skills/editorial-help/` | 3 | 280 | none |
| `.claude/tools/editorial/` | 109 | 3,116 | 98, 1,482 |
| `.claude/tools/editorial-triage/` | 101 | 13,697 | 94, 10,980 |
| `.claude/tools/editorial-help/` | 1 | 92 | none |
| `.claude/tools/editorial-metrics/` | 45 | 2,207 | 29, 1,024 |
| `.claude/workflows/editorial-triage.js` | 1 | 123 | none |
| `.claude/agents/` | 0 | 0 | The folder is empty |
| Total excluding design-consistency | 274 | 21,052 | 221, 13,486 |
| `.claude/skills/design-consistency/` | 5 | 273 | none |
| `.claude/tools/design-consistency/` | 3 | 166 | none |
| Total including design-consistency | 282 | 21,491 | 221, 13,486 |
| `.claude/workareas/editorial-efficiency/` (tracked, estate-adjacent) | 21 | 2,884 | not counted above |

The hook scripts `hook-check-written.sh` (131 lines), `hook-stop.sh` (76) and `rule-scope.sh` (171) are inside `.claude/tools/editorial/` and are counted in its row.
