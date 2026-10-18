# Editorial Efficiency: Implementation Plan

The banked state of the editorial efficiency work at 16 Oct 2026: what the experiments found, what Ben decided, and the staged build that follows. Start here to resume. The evidence is in `results.md` and `register.json` beside this file; the experiment plan is `plan.md`; the prototype code the build promotes is in `prototypes/`.

## Status

1. The experiments are complete: 12 experiments and 3 confirmation runs on frozen copies of the INS Auth session pages, measured with the tools in `.claude/tools/editorial-metrics/`.
2. Ben took seven decisions on 16 Oct (below). The Opus reviewer pin is committed; nothing else is built.
3. The redesign track (below) is in scope: layered review and a separate design-consistency skill. Its tests R1 and R2 are done; stage 2 waits for the redesign.
4. Ben took eleven redesign decisions later on 16 Oct (Redesign Decisions, below).
5. Done on 16 Oct: the redesign spec (`redesign-spec.md`); R2r, the facts-track repeat (stable at 88 to 96%); R3, the layered review (not passed as set up: repetition recall fell to 0.36 under a single capped set pass, while meaning-changing rewrites fell 59%); stage 3 built and tested (S3: 87% of P1's moves exactly, inside the Opus band), with ignored S1 and S2 contradictions now listed under Problems; the blind pack rebuilt with R3 and a scoring sheet. Not committed.
6. R3b (one set pass per page) passed: recall 0.62, equal to two baseline runs' agreement, 20 new fixes, 39 applied edits, $6.40. Ben ruled on the 13 S1 and S2 design contradictions; the rulings are in `analysis/ins-authnz/session-pages-restructure.md`, session log of 16 October.
7. Decision 7 taken on 16 Oct: the layered review is stage 2's target, confirmed by the blind pack scores. Stage 2 therefore forks a paragraph, page and set pass per page instead of drill units, structural reviewers and the cold editor, and the facts track becomes the `design-consistency` skill.
8. The facts track is built as the `design-consistency` skill (16 Oct): per-page extraction cached by page hash, a register script, a checker limited to the register, and questions for `/decide`. Smoke-tested on R2r's facts and contradictions; no live run yet.
9. Ben judged quality on 16 Oct by picking the best version of 12 passages where today's review (B0c) and the layered review (R3b) differ, blind (`experiments/pick/result.json`): R3b 5, B0c 4, 2 ties, 1 where both edits were worse than the original. No quality loss from the layered review; decision 16 stands. The diff-based blind packs are retired: Ben could not use them.
10. Ben judged X7 the same way on 17 Oct (`experiments/pick/x7-result.json`): baseline 4, X7 2, 6 ties on 12 passages of 02b. Decision 18 drops X7 from stage 1, revising decision 5; rewrite safety comes from the layered review.
11. Limit of both judgements, from Ben on 17 Oct: the picks were relative, so "no real difference" mixed "the same" with "I like neither", and a large improvement counted the same as a trivial one. They show the cheaper reviews give broadly the same output for less; they do not show the review getting better at its goal, the quality of the writing. No measure of progress toward that goal exists yet.
12. Stage 1 built and measured on 17 Oct (S1r, one page): `tools/editorial/build-review-packet.sh` (with `--context` pages), `tools/editorial/assemble-review.sh`, no gate step in the brief or the reviewer prompts. Recall 0.84 against the 0.80 floor, cost -12%, turns -44%, tool calls -59%.
13. Next: stage 2, the layered review as forks per page (one loader, a paragraph, page and set pass per page), with the assembler validating the forks' files.

## Decisions

| Decision | Choice |
| --- | --- |
| 1 Reviewer model | Commit the Opus pin in `editorial-review.js` (done) |
| 2 The package | Build in stages: work packets, then the loader and fork review, then the triage workflow; measure after each stage; keep the old workflow as a fallback until the new review has run twice |
| 3 Style gate inside reviewers | Drop it; the build and apply keep gating |
| 4 Rules-only review | Add as a mode; full review stays the default |
| 5 Claim check and repair at write time (X7) | Revised on 17 Oct by decision 18: dropped after Ben's blind judgement found its edits no better than the baseline's |
| 6 Cross-page contradictions | No rubric change; the plan lists every ignored S2 contradiction in Problems for Ben to rule on |
| 7 Two runs against one | Tested: two package runs merged into one triage fix more than one current run (35 edits against 37 and 26) at slightly lower cost ($10.98 against $12.02) |

## Build Stages

| Stage | Change | Files | Prototype | Done when |
| --- | --- | --- | --- | --- |
| 1 | Work packet builder; reviewer instructions without the gate step and quote greps; review-result assembler with schema validation (X7 dropped by decision 18) | new `tools/editorial/build-review-packet.sh` and `tools/editorial/assemble-review.sh`; `skills/editorial/references/review-brief.md` | `prototypes/build-review-packet.sh`, `prototypes/merge-reviews.sh` | a one-page run measured against B0a and B0b with `compare-runs.sh` |
| 2 | Loader and fork review: the editorial skill spawns a loader that reads the packet once and forks the drill units, the structural pass per page and the cold editor | `skills/editorial/SKILL.md` step 6; `workflows/editorial-review.js` kept as the fallback | the X4 and P1 loader prompts in `register.json` and the run transcripts | two runs within the noise band of the baselines |
| 3 | Triage workflow; the plan's Problems section lists ignored S2 contradictions | new `workflows/editorial-triage.js`; `skills/editorial-triage/SKILL.md` steps 2 to 7; `tools/editorial-triage/grade-triage.sh` plan | `prototypes/editorial-triage-exp.js` | the same closing moves within the Opus noise band; main session down to launch and read |
| 4 | Rules-only review mode | `skills/editorial/SKILL.md`; a delta packet builder | the X11 delta packet recipe in `register.json` | a rules-only run after the next rule change |
| 5 | Proposed, not decided: two package runs merged as the default full review | `skills/editorial/SKILL.md` | `prototypes/merge-reviews.sh` | Ben's call after stage 2 |

## Redesign Track

Opened on 16 Oct, with new skills, separated skills and refactoring for recombination in scope. The proposal splits the review by the scope each check needs: layer 0 scripts (mechanical checks), layer 1 paragraph (prose), layer 2 page (structure), layer 3 set (cohesion), and a separate design-consistency track built on a fact register, which outputs questions for Ben and never rewrites. The banked stages 1 and 3 carry over; stage 2's reviewer roles wait for the redesign.

| Test | Result |
| --- | --- |
| R1 layer 0 reach (offline) | mechanical detectors catch 11% of findings (13% of fixes) on pages that already pass the gate, with precision 0.67 to 1.00; design-consistency findings are 26% of all findings and only 14% become fixes |
| R3b layered, set pass per page | recall 0.62 at $6.40; repetition 16 of 25; 20 new fixes; 39 applied; H-29 ignores -47% |
| R3 layered review | recall 0.47 at $6.52; repetition 9 of 25 under one capped set pass; meaning-changing rewrites -59%, H-29 ignores -55%, ignore rate 0.40, 15 new fixes |
| R2r facts repeat | 23 of 26; with R2, 26 of 26; the table and column fields gained nothing and made the check 33% dearer |
| R2 facts track | from a 898-fact register, one checker found 25 of the 26 contradictions every run raised together (all 16 robust ones, and the cookie contradiction as S1) for $6.40; a single review run finds 6 to 13 of the 26 |

The R2 contradictions are in `r2-contradictions.json`; three of them are new and need Ben's judgement.

### Redesign Decisions

Taken on 16 Oct through `/decide`; the full record is `redesign.decisions` in `register.json`.

| Decision | Choice |
| --- | --- |
| 1 Redesign spec | Write it now, alongside R3 |
| 2 R3 layered review | Run now on C3: paragraph, page and set passes plus the facts track, measured against B0c and B0d |
| 3 Banked stages | Build stages 1 and 3, in the order of decision 11 |
| 4 Design-consistency track | A separate skill on the fact register; it outputs questions and never rewrites |
| 5 The 18 R2 contradictions | Each goes to Ben through `/decide`, with both quotes and the ways to settle it |
| 6 Layer 0 | Pointers plus a preferred-names register |
| 7 Default full review | Decided after R3 |
| 8 Blind pack | Judged before the stages that change judgement are built |
| 9 Uncommitted work | Committed in two commits, not pushed |
| 10 R2 repeat | Once, with the extractor recording each fact's table and column |
| 11 Build against judge | Stage 3 now, since it changes no judgement; the blind judgement next; stage 1 after the judgement (which then dropped X7, decision 18) |

## Constraints of the Fork Design

1. A fork cannot be named and cannot fork again, so the loader starts every pass itself.
2. A fork runs on its parent's model.
3. Forks must start within the 5-minute cache window of the loader's last turn.
4. The harness does not check fork output against a schema, so the assembler validates every result before the build.
5. Workflow scripts cannot host forks, so the forked review runs as an agent the editorial skill spawns.
6. A fork transcript replays its parent's messages; `extract-run.sh` counts each response once.

## Evidence

| Evidence | Location |
| --- | --- |
| Results and prioritised changes | `results.md` |
| Every run: configuration, metrics, verdict | `register.json` |
| Baseline data set and process map | `analysis/editorial-efficiency/` (gitignored, on Ben's machine) |
| Run data, extracts, blind pack | `analysis/editorial-efficiency/experiments/` (gitignored) |
| Measurement tools | `.claude/tools/editorial-metrics/` |

## Open for Ben

1. Judge the blind pack in `analysis/editorial-efficiency/experiments/blind-pack/`, key in `blind-pack-key/`, opened after judging. Stage 1 waits for this.
2. Rule on each of the 18 R2 contradictions, put through `/decide`.
3. After R3: the default full review, including whether two merged package runs become it (stage 5).
