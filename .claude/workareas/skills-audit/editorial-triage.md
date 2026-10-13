# editorial-triage skill - audit and improvement plan

Re-audited 11 September 2026 against the post-deletion skill. Both trees are still untracked (`git status` reports `??` on `.claude/skills/editorial-triage/` and `.claude/tools/editorial-triage/`), so every line reference is to the working copy and the deleted files have no git history to recover.

Surface audited: `SKILL.md` (156 lines), `assets/grading-rubric.md` (76), `assets/editorial-triage-schema.md` (194), `references/GRADER.md` (84), `references/LEGACY_CLASSIFIER.md` (73), `decisions.md` (56); tools `build-triage.sh` (320), `grade-triage.sh` (517), `triage-lib.jq` (52), `lib/grade.jq` (794), `lib/triage.jq` (170), `lib/normalize-legacy.jq` (126), `lib/normalize-v2.jq` (73), and the seven-case golden suite.

Checks run for this audit: golden suite 7 of 7 pass; `lint-skills.sh` clean at zero warnings; `check-deps.sh` lists editorial-triage among the six skills declaring none; `check-prose.sh` returns zero FAIL lines across the SKILL.md, both assets, both personas and `decisions.md`. The heuristic warning was exercised against a temp copy of the plan fixture with an injected `H-20` and an injected null, and behaved as described below.

## TL;DR

Four of the five landed changes close their gap; the fifth, the spot-check gate, is undone in the common case by sharing `--force` with the dirty-tree refusal, and the skill's own Step 7 tells the agent to pass that flag. The deletion itself was clean at the file level and left three kinds of dangling: state nothing reads any more (`index.json`, and the cluster fields `needs`, `rank`, `held`, `guess`, `conflict`, `alternatives`), stale header prose naming `render` and `decide` in two live files, and the tracked `decisions.json` that still lists the deleted worker and helpers and would regenerate the wrong `decisions.md`. The rubric half of the H-20 fix did not land: the warning now fires, but the rubric still jumps from H-19 to H-21 with no note, so a reader cannot tell the gap is deliberate. Everything else the previous pass praised still holds.

## Verdict on the five landed changes

### 1. The legacy bucket path is deleted - closes the gap, with dangling

The files are gone and the fixtures went with them: no `render-triage.sh`, no `decide-triage.sh`, no `PAGE_JUDGE.md`, no `decide` / `judged` / `gate-fail` fixture or expected directory, no `--validate` flag in `build-triage.sh`'s argument loop or usage header. `triage-lib.jq` is 52 lines holding `partition` and its three helpers, and its header now describes the buckets correctly as the live sampling axis. The suite is seven cases and passes. `A14` is satisfied on the deletion itself.

What the deletion left behind is in §1 and §10 below. The two items that matter:

- **`held` lost its only consumer and keeps its promise.** `build-triage.sh:288-289` still reads `held.json`, `lib/triage.jq:112` still tags each cluster, and `assets/editorial-triage-schema.md:17` still says held items are "already parked with the user; tagged, never re-asked". Nothing enforces that now: `grep` for `held` across `lib/grade.jq` returns nothing, so `sample` redraws held clusters and `plan` plans them. Two live runs hold a `held.json` (`workareas/editorial-triage/ins-auth-2026-09-09/` and `-go2/`), so this is not hypothetical state. Either wire the exclusion into `sample` and `plan`, or delete `held` and say the parking mechanism went with the report.
- **`rank` survived the move but has no reader.** The ranking logic was inlined into `lib/triage.jq:142-149` when `rank_key` and `rerank` went, so `rank` is still computed and written; `grep` for `rank` across `lib/grade.jq` returns nothing. The schema's `### Rank` section (158-160) documents an "essential section" that no code builds.

### 2. The spot check as a hard gate - the gate holds until `--force` waives the guard

`grade-triage.sh:424-435` refuses apply unless `closing/spot-check.json` exists and is not older than `closing/plan.json`, runs before the working-tree check, and names `plan --dir <run> --sample 10` as the remedy. The golden case covers the staleness branch (`fixtures/grade-apply/case.sh:33-38`). Structurally this satisfies `A12`.

**The gap it does not close.** `--force` skips the spot-check gate and the dirty-tree refusal together (`grade-triage.sh:431`, `434`, `450`). `SKILL.md:98` tells the agent to add `--force` "when the user has said the working tree's uncommitted edits under the pages are theirs", and a dirty docs tree is the expected case, not the exception: `SKILL.md:58` has the agent pass `--commit <label>` precisely because the reviewers read uncommitted edits. So on the ordinary run the skill instructs the agent to pass the flag that turns the new gate off, and nothing in the prose says that is what the flag does. Fix: give the spot-check gate its own override (`--no-spot-check`), leave `--force` to the working tree, and have the refusal message name the narrower flag. The previous pass's open question 3 asked exactly whether `--force` was the right escape hatch; this is the answer, and it is no.

Two smaller points on the same gate:

- **The freshness test is mtime, not identity.** `spot_check` (`lib/grade.jq:639-646`) writes `{seed, requested, size, of, items}` with no fingerprint of the plan it was drawn from, so the gate rests on `[[ ! "$plan" -nt "$spot" ]]`. In the normal flow `plan` writes plan.json then spot-check.json, so the ordering holds. It does not survive a workarea copied with `cp -R`, which sets both mtimes to copy time in directory order. A `planHash` on both files would be a two-line change and would make the refusal message able to say which plan the spot check belongs to.
- **No golden case covers the missing-spot-check branch.** `case.sh:9` runs apply on a workarea with no `closing/` at all, so it dies on the missing plan first; from `case.sh:11` onward a spot check always exists. Add a case that plans without `--sample` from a clean workarea and then applies.

The residual that no gate can close is worth stating once: the artifact proves a sample was drawn, not that the user read the sample. That limit is inherent to the pattern and is not a defect.

### 3. The warning before writing outside a repository - partial

`grade-triage.sh:455-457` prints the warning when `in_repo` is false and the run is not a dry run. Two reasons this is weaker than it reads:

- **The warning cannot be acted on.** It is printed inside the same command that then writes the pages, so by the time anyone reads "take a copy first if you need one" the copy is no longer possible. The previous pass proposed a refusal with `--force`; a warning changes what the user is told, not what happens. If the softening was deliberate, say so in the schema; if not, this is the one place in the skill where an irreversible edit proceeds on its own authority.
- **`in_repo` is still decided by the first directory only** (`grade-triage.sh:444`). When the pages span two directories and the first is in a repository, the loop at 446-449 runs `git -C "$d" status` on the second, the failure is swallowed by `2>/dev/null`, and the empty string reads as a clean tree. The second tree then gets neither the dirty check nor the warning. Test each entry of `top_dirs` for `--is-inside-work-tree` and treat a mixed set as not-in-repo.
- **No golden coverage.** `fixtures/grade-apply/case.sh:14` runs `git init` before any apply reaches the check, so the warning branch and the "no diff to show" line at `grade-triage.sh:494` are never exercised.

### 4. The heuristic-citation warning - closes the code half, not the rubric half

`grade-triage.sh:194-208` collects every distinct `heuristic` from the staged grades and greps the rubric for `**<id> `; unknown ids produce a warning naming the rubric path. Verified on a temp copy of the plan fixture: injecting `H-20` produced `grade-triage: warning: grades cite H-20 that the rubric does not define`. It fires from `sample`, `render`, `agree`, `score` and `plan`, warns rather than refuses, and the rationale is written into the code. This is the `A13` correction and it works.

Three things left:

- **The rubric still has no H-20 and no note that it went.** `assets/grading-rubric.md` runs H-01 to H-19 (line 41), a blank line, then H-21 (43) and H-22 (44). `anti-patterns.md:109` records H-20 as "a deleted rule" that the warning caught twenty citations of, so the catalogue knows something the rubric does not. One line in the rubric at the gap ("H-20 was withdrawn in favour of H-21") costs nothing and stops the next reader assuming a typo.
- **A grade citing nothing passes silently.** The same probe with `heuristic: null` produced no warning. `grades_index` (`lib/grade.jq:346-358`) validates cluster, span type, move and side, never the presence of a citation, while `GRADER.md:16` says "Every grade cites a heuristic id from this file". An absent citation is the same defect as an unknown one.
- **The message does not separate multiple ids.** The loop appends `'%s '` per unknown id, so two unknowns render as `grades cite H-20 H-23 that the rubric does not define`. Join with a comma.

### 5. The three anti-pattern entries - land correctly

`A12`, `A13` and `A14` are in `anti-patterns.md:95-117` in the catalogue's three-part shape, each with a "Documented instance" clause naming this skill. `A12`'s instance line describes the gate as implemented (no older than the plan) rather than as proposed (a hash), so the catalogue is accurate. No change needed.

## Findings by pattern

### 1. State as canonical JSON

Still correctly JSON-canonical: N clusters that helpers filter, sample, score and mutate, with markdown views regenerated by the helpers (`SKILL.md:54`). No `A2`, no `A6`. Four findings, three of them widened by the deletion.

- **`index.json` still has zero readers.** Written at `build-triage.sh:295-297`, named at `SKILL.md:54` and `assets/editorial-triage-schema.md:16`, read by nothing in `lib/`, `triage-lib.jq` or `grade-triage.sh`. The file was already dead before the deletion, and the deletion removed the last argument for keeping the file. This is `A7` past its stated form: context read zero times. Delete the file, its build step and both mentions.
- **Six cluster fields now have no reader.** `needs` (`lib/triage.jq:83-88`), `rank` (142-149), `held` (112), `guess`, `conflict` and `alternatives` (`make_cluster`, 104-116) are computed, written to `triage.json` and documented at `assets/editorial-triage-schema.md:123-135`, and `grep` finds no consumer in `lib/grade.jq`. `questions` is the one that survived (read at `lib/grade.jq:228`). A JSON state file may legitimately carry descriptive fields for a human reading it with `jq`, so this is a decision rather than an automatic deletion: keep the ones a reader of `triage.json` uses and say so in the schema, drop the rest. `held` is not in that category, because the contract makes a promise about it (see the verdict above).
- **Four parameters do nothing.** `essentialCap` and `absolutesBlocking` are in the defaults at `lib/triage.jq:121` and documented at `assets/editorial-triage-schema.md:141` and `152`, and nothing reads either; they belonged to the report's essential section. `neutralWords` and `neutralRatio` are documented as parameters but the band calculation is hard-coded at `build-triage.sh:240`, so they never worked. Going the other way, `growSeverityMax` is documented with a default of 3 and used at `triage-lib.jq:39`, but is absent from the defaults object, so `params` in `triage.json` never records the value. `essentialSeverityMax` (schema line 160) exists nowhere in code.
- **One jq module still sits outside `lib/`.** `triage-lib.jq` is at the tools root while the other four modules are in `lib/`, so `build-triage.sh:290` passes `-L` pointing at the tools directory while `$LIB` points at `lib/`. The previous pass proposed moving it to `lib/partition.jq` once it held only the partition rules, which is now the case. The move is three lines: the file, the `-L`, and `lib/triage.jq:13`.

### 2. Scripts call other scripts

§2 - clean. No dispatcher, and none warranted: Step 2 is one build command and the legacy branch is announced deterministically at `build-triage.sh:316-318`. The SKILL.md wording that asks the agent to infer that branch instead of reading it is in §10.

### 3. Pre-baked context

§3 - clean. `findings.json` and `triage.json` are written once and read by every `GRADER` in the Step 4 fan-out, which is the read-more-than-once condition. No `A7` here.

### 4. Bash call hygiene

No violations in LLM-typed prose: a mechanical scan of the SKILL.md, both personas and both assets for `&&`, `python3`, `find -exec` and `$VAR` returns nothing, and every path is in the `~/trade-imports-arch-workspace/...` form. One finding, unchanged from the previous pass, at the script boundary.

| Location | Problem | Corrected form |
| --- | --- | --- |
| `build-triage.sh:63`, `91`, `319` | `DIR` and `REVIEW_DIR` are expanded at lines 49 and 90, then interpolated into messages, so the agent is handed a resolved `/Users/...` path. Verified: a build against a `~`-typed review directory printed `no review/*.json under /Users/benoit/...`. Typing that back trips `guard-bash.sh`. | Port the `show()` helper from `grade-triage.sh:91` (`TILDE='~'; show() { printf '%s' "${1/#$HOME/$TILDE}"; }`) and wrap every path in a `say` or `die` message, as `grade-triage.sh` does throughout. Also `$GATE` at line 51. |

### 5. Hygiene pointer inside worker personas

§5 - clean. `GRADER.md:3` and `LEGACY_CLASSIFIER.md:3` each carry the one-line pointer to `agent-skills.md`, neither re-inlines the rule table, and the two extra sentences each adds are per-skill instructions rather than duplicated canon.

### 6. Idempotent + atomic helpers

Atomicity is right everywhere: `grade-triage.sh:211-214`, `build-triage.sh:53-57`, the round and plan markdown writes and the page writes in apply all use tmp-then-`mv`. Coverage gates check JSON fields rather than file presence (`grade-triage.sh:130`, `151-153`, `429-430`), which is the §6 requirement. Findings beyond the five verdicts above:

- **Apply still has no applied marker.** `closing/applied.json` is written (`grade-triage.sh:498`) and read by nothing. Nothing records `appliedAt` on the plan and nothing refuses a second apply of the same plan. A re-run is mostly harmless because the phrases have gone and every entry reports `skipped-absent`, but a reword whose `after` still contains its `before` re-fires. This was the previous pass's "one smaller gap" and it did not land. The `planHash` proposed for the spot-check gate would carry this too.
- **`atomic_json` can leave a stray `.tmp`.** `grade-triage.sh:212` runs `jq '.' > "$1.tmp" || die`, so a jq failure dies with the partial `.tmp` next to the real state file. Cosmetic; write into `$TMP` and `mv` from there, as apply does.

### 7. Walker UX

§7 - clean. The N-item batch is `grade-triage.sh label --labels "2 R; 3 R cut the mechanism, keep the requirement; 10 O"` (`SKILL.md:121-125`): one markdown block of cards, one batch string back, one helper call. No `WALKER.md` and none needed; the deletion removed a second, never-run walker rather than the pattern. No `A1`.

### 8. Allowlist coverage

§8 - clean. The blanket entry `Bash(~/trade-imports-arch-workspace/.claude/tools/:*)` at `.claude/settings.json:28` covers every script in `tools/editorial-triage/`. No per-skill pair needed.

### 9. Dependencies

§9 - clean. No `metadata.workspace-deps` and none required. `check-deps.sh` counts editorial-triage among the six skills declaring none; `lint-skills.sh` passes with zero warnings, so its undeclared-invocation sweep found nothing. The scripts invoke bash, jq, git, `grep`, `find`, `sort`, `tr` and `mktemp` only. The one cross-domain call, `.claude/tools/editorial/check-prose.sh`, is estate payload rather than a child project, and both callers guard it with a `[[ -f ]]` test naming the remedy (`build-triage.sh:51`, `grade-triage.sh:402`).

The soft spot the previous pass raised is unchanged: `SKILL.md:104` sends the agent to read another repository's CLAUDE.md mid-step. See open question 2.

### 10. Prose hygiene (trim diff)

The mechanical gate is clean: zero FAIL lines across all six skill files, and the WARN lines are the context-sensitive word "shape" in technical use plus two metaphor candidates, all keep cases. So this is not a style trim; it is drift the deletion left and two items carried over. None applied.

**Stale prose naming deleted scripts**

| File | Line | Change |
| --- | --- | --- |
| `grade-triage.sh` | 3 | The Boundary line ends "build, render and decide own the rest of the workarea". Only build does. |
| `lib/triage.jq` | 10-11 | "The partition rules live once, in ../triage-lib.jq (shared with render and decide); this module imports them so build, render and decide agree." Rewrite for build alone, and update the path if the module moves to `lib/partition.jq`. |
| `.claude/workareas/skill-creator/editorial-triage/decisions.json` | 19, 23, 26-27 | Lists `PAGE_JUDGE` as a worker, `walker: true`, and `render-triage` / `decide-triage` as helpers, and line 7 still carries the superseded purpose ending "Never edits the documents." This is the tracked source `render-interview.sh` renders `decisions.md` from, so the hand-rewritten sidecar and its source now disagree and a re-render would resurrect the deleted names. |
| `AGENTS.md` | 94 | The enforcement map says "Golden tests (3 suites)". There are four: `Makefile:57-60` and `.githooks/pre-commit:36-52` both run the editorial-triage suite. |

**`SKILL.md`**

| Lines | Change | Why |
| --- | --- | --- |
| 54 | Drop `index.json` from the State list | zero readers |
| 66 | Rewrite "The buckets are the legacy partition and only stratify the calibration sample" to say the buckets stratify the calibration sample and label the cards | the buckets are the live sampling axis; `triage-lib.jq:1-9` and the schema at 154 already say so, and this line is now the only place "legacy" means anything other than pre-v2 input |
| 66 | Replace "if the build reports a legacy result (buckets all `unclassified`)" with "if the build prints the legacy-result line" | the script prints that line in plain words at `build-triage.sh:317`; inferring it from bucket counts is a weaker test |
| 90 or 95 | Say that apply refuses without a spot check drawn against the current plan | the gate is new and the prose never mentions it |
| 98 | Split the `--force` sentence once the flag is split, and name the spot-check override separately | as written, the flag the step recommends disables the gate the previous step built |
| 95-104 | Name `skipped-fragment` alongside absent and repeated in the dry-run sentence | the third skip reason is real (`lib/grade.jq:723`) and undocumented |
| 156 | Add `render` to the `grade-triage.sh` cheat-sheet row, and to Calibrate step 2 | the subcommand exists (`grade-triage.sh:273-286`), is the natural move after a rubric change invalidates cards mid-labelling, and appears nowhere in the SKILL.md |

**`assets/editorial-triage-schema.md`**

| Lines | Change | Why |
| --- | --- | --- |
| 16 | Delete the `index.json` row | zero readers |
| 17, 131 | Either wire the `held` exclusion or delete both rows | the contract promises "never re-asked" and nothing enforces it |
| 123-135 | Mark or remove the cluster fields with no consumer | `needs`, `rank`, `held`, `guess`, `conflict`, `alternatives` |
| 141, 152, 160 | Remove `essentialCap`, `absolutesBlocking`, `essentialSeverityMax`, `neutralWords` and `neutralRatio`; add `growSeverityMax` to the defaults object in `lib/triage.jq:121` | four parameters do nothing and one that works is not recorded |
| 158-160, 162-164 | Delete the `### Rank` and `### needs` sections if their fields go | they document an essential section no code builds |
| 188 | Add the `planHash` if it lands, and say apply refuses on a stale or missing spot check | the contract describes the file but not the gate it feeds |
| 193 | Add `skipped-fragment` to the documented `status` enum, document the `dropped` field (`lib/grade.jq:772`) and the orphan entry for a page the manifest does not name (`lib/grade.jq:753-754`) | the code emits all three; the contract omits all three |

**`assets/grading-rubric.md`**

| Lines | Change | Why |
| --- | --- | --- |
| 41-43 | Record H-20's retirement in one line at the gap | `anti-patterns.md:109` records it as deleted; the rubric records nothing |
| 41, 44 | Drop "on 11 September 2026" from H-19 and H-22, keep the round and item ids | the item ids are the evidence; the workspace treats documents as snapshots rather than changelogs |

**`decisions.md`** - one residual. Line 56 still ends "it never edits the documents", which apply does; the previous pass flagged the same sentence in section 1, and the rewrite moved the sentence to section 9 rather than dropping the claim. Sections 1, 6, 7 and 8 are now accurate.

**`GRADER.md`** - unchanged from the previous pass: the persona never mentions `render`, so a grader asked to re-grade after a card-shape change has no way to know the cards can be redrawn. Low priority; the parent runs `render`, not the worker.

## Open questions

Carried forward, with what the previous pass's six resolved to.

1. **Does the H-20 retirement change the 9 September baseline?** `anti-patterns.md:109` settles what happened (the rule was deleted, twenty grades cite it). What is still undecided is whether the `ins-auth-2026-09-09-go2` grades that cite it were graded against a rule that no longer holds, and so whether that run's score stands as the baseline every later change is measured against. Running `score` on that run now will print the warning; the decision is whether to re-grade the affected pages first.
2. **Should Step 7 name the docs repo's validation command outright?** Unchanged from the previous pass. Naming it makes the common case one command and breaks the skill's independence from any particular page set; leaving it as a pointer costs the agent a detour into another repository's CLAUDE.md. A third option: have `manifest.json` record a `validate` command at build time when the pages' repository declares one.
3. **Split `--force`, or document the overload?** The narrower flag (`--no-spot-check`) reads more honestly in a transcript and stops the dirty-tree instruction at `SKILL.md:98` from disabling the gate. The cost is a third flag on apply. Recommendation: split.
4. **Is the no-repository case a warning or a refusal?** The implementation chose a warning printed immediately before the writes, which the user cannot act on. If that was a deliberate call rather than a partial implementation, the reasoning belongs in the schema next to the apply contract.
5. **Which of the six unread cluster fields are contract and which are debris?** `held` needs a decision either way, because the schema makes a promise about that field. The other five are cheap to keep and cost only a line of contract each.

Resolved since the previous pass, and not carried forward: whether any in-flight work depended on the bucket report (the deletion shipped; two 9 September runs hold an orphan `triage.md`, which is gitignored task state and harmless); whether the deletion should land before or after the first commit (it landed before, both trees are still untracked); and whether to rename the pre-v2 adapter (the deletion removed the other meaning of "legacy", so `LEGACY_CLASSIFIER` and `normalize-legacy.jq` are now unambiguous, provided `SKILL.md:66` stops calling the buckets legacy).

## Anti-pattern citations

| Finding | Entry |
| --- | --- |
| `index.json` written and read by nothing; six cluster fields and four parameters with no consumer | `A7`, past its stated form. The entry covers context read exactly once; this is context read zero times. One clause in `A7`'s symptom line would cover the zero-reader case. |
| `--force` disabling the spot-check gate on the run the skill itself recommends it for | `A12` in its second form: the gate exists on the deterministic side, and the skill's own step turns it off. Proposed as an addition to `A12` rather than a new entry (see below). |
| A grade with no heuristic at all passing validation | `A13`, partially closed. The entry's correction says to validate the citation; validating only the ids that are present leaves the absent ones unchecked. No catalogue change needed, because the entry already covers the absent citation. |
| Deleted path still named in two live file headers and in the tracked `decisions.json` | `A14`'s aftermath rather than `A14` itself. Worth one clause in `A14`'s correction: after deleting a path, sweep the headers of the files that survive and the scaffold record that regenerates the sidecar. |

Nothing here matches `A1`, `A2`, `A3`, `A4`, `A5`, `A6`, `A8`, `A9`, `A10` or `A11`.

### Proposed catalogue changes

No new entries. Two amendments to existing ones:

**`A12`** - add to the symptom: "or the mutating step's gate shares an override flag with an unrelated guard, and the skill's own steps instruct the agent to pass that flag in the ordinary case." Add to the correction: "give the gate its own override, so a transcript shows which guard was waived."

**`A14`** - add to the correction: "then sweep what survives: the header comments of files that named the deleted path, the scaffold record the sidecar is rendered from, and any state field whose only consumer went with the deleted path."
