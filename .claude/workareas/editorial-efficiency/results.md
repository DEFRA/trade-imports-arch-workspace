# Editorial Efficiency Experiments: Results and Prioritised Changes

Results of the experiments in `plan.md`, run on 15 Oct 2026 against frozen copies of the INS Auth session pages (commit `5fc8cd2`). Every figure comes from `register.json`, which holds each experiment's configuration, runs, metrics and verdict. Costs are first-party API prices for the worker agents; the orchestrating session is measured apart, because this analysis session drove the runs. Quality is judged against two identical baseline runs per corpus, whose differences set the noise band, and against the blind comparison pack for Ben.

## Headline

The package of adopted changes (Opus reviewers, a work packet, one loader that forks each review pass, triage as a workflow) runs on three pages for about $6.50 against $12.02 for the current process, inside the noise band of two identical baseline runs but leaning towards fewer fixes. Two package runs merged into one triage cost $10.98 and fix more than one current run (35 against 37 and 26), agreeing with the baselines more than the baselines agree with each other. On one page, the fork-based review cut review cost by 80%.

## Noise Band

Two identical runs of the current process per corpus set what counts as a result.

| Measure | One page (B0a, B0b) | Three pages (B0c, B0d) |
| --- | --- | --- |
| Worker cost | $9.88, $10.90 | $13.17, $10.87 |
| Fixes (remove, correct or reword) | 15, 20 | 37, 27 |
| Edits applied | 14, 18 | 37, 26 |
| Rewrites the verifier judged meaning-changing | 15 of 46, 17 of 52 | 22 of 72, 36 of 72 |
| Share of one run's fixes the other also makes | 0.80 | 0.62 |

1. The review is far from deterministic. Two identical runs on three pages agree on 62% of their fixes: any single run misses about 4 in 10 of the fixes an identical second run makes.
2. A second Opus triage of the same review agrees with the first on 96% of claim verdicts and 83% of closing moves.
3. Review time varies widely on its own: 28 and 106 minutes for the two identical one-page runs.

## Changes to Adopt, in Priority Order

| Priority | Change | Effect, measured | Quality, against the noise band |
| --- | --- | --- | --- |
| 1 | Load once, fork per pass (X4): one loader agent reads a work packet once and forks one pass per drill unit, the structural pass and the cold editor | one page: review cost -80%, run cost -62%, review time 5 minutes; every fork read about 100k tokens from cache on its first turn | recall 0.75 (floor 0.80), applied, rewrite safety and H-29 ignores within noise |
| 2 | Triage as a workflow script (X9): build, verify, rebuild, grade, score, plan and apply run in one workflow with cheap script runners | 2 main-session turns in place of about 20; on 14 Oct the main session spent $11.40 on the verify and grade phases alone | closing moves within the Opus noise band |
| 3 | Work packets (X2): one file per run holding the brief, its sources and the numbered documents; no gate step or quote greps in the reviewers | review time 5 minutes against 28 to 106; turns -51%; cost -14%; prerequisite for X4 | recall 0.74; applied within noise |
| 4 | Opus reviewers (X1): commit the reviewer-model pin | Fable review costs 4.4 times as much, mostly cache rewrites from turns over 5 minutes | recall 0.76 with Fable, so the pin loses nothing |
| 5 | Delta review mode for rule changes (X11): reviewers check only the changed rules, one per page | a third of a full run's cost on three pages | 10 fixes under the rule against the full review's 3; not a substitute for a full review |

X12, reviewing a single page as one whole-page unit through the existing `sections` argument, halves a single-page run's cost with no code, but applies 31% fewer fixes. It is the fallback only if X4 is not built, because forks make extra units nearly free.

## Combined Package

| Measure | Baselines B0c, B0d | P1: package | P2: package with the gate step |
| --- | --- | --- | --- |
| Worker cost | $12.02 average | $6.25 (-48%) | $6.44 (-46%) |
| Review cost | $7.46 | $2.49 (-67%) | $2.87 (-62%) |
| Turns | 181 | 110 (-39%) | 118 (-35%) |
| Generation time | 53 minutes | 37 minutes (-30%) | 34 minutes (-35%) |
| Recall of the baselines' fixes | 0.62 between them | 0.58 | 0.51 |
| Edits applied | 31.5 +/- 11 | 28 | 23 |
| Meaning-changing rewrites | 29 +/- 14 | 35 | 27 |

1. P1 delivers the savings of its parts with every quality measure inside the noise band.
2. Keeping the brief's gate step in the forks (P2) costs $0.38 more and changes nothing beyond noise. The gate checks prose style, not claim safety, and the build gates every rewrite anyway, so the forks can skip the gate.

A repeat of P1 (P3) and a merged triage of both runs (P13) test one package run against two:

| Measure | Baselines B0c, B0d | One package run: P1, P3 | Two package runs merged: P13 |
| --- | --- | --- | --- |
| Cost | $12.02 average | $6.25, $6.90 | $10.98 (reviews $2.49 and $2.91, triage $5.58) |
| Edits applied | 37, 26 | 28, 21 | 35 |
| Recall of the baselines' fixes | 0.62 between them | 0.58, 0.49 | 0.66 |
| Fixes neither baseline made | not applicable | 11, 8 | 13 |
| Rewrites to verify, meaning-changing | 72, 22 and 36 | 68 and 70, 35 and 46 | 138, 68 |

3. One package run sits inside the noise band but leans lower than one current run: 24.5 applied edits on average against 31.5, and recall 0.54 against 0.62.
4. Two package runs merged cost slightly less than one current run and fix more. The two runs shared 76 duplicate findings, which the build clustered.
5. The merged triage verifies twice the rewrites, half of them meaning-changing: the adopted X7 repair at write time is the change that should cut that load.

## For Ben's Judgement

X7, the claim check with repair at write time, makes rewrites far safer on one page (H-29 ignores -79%, meaning-changing rewrites -75%) and costs 11% less, but reviewers turn risky rewrites into questions, so 31% fewer edits apply and the fixes differ from the baseline (recall 0.44 against a 0.80 floor). Whether its fixes are better is a quality call: X7 is one of the versions in the blind pack.

## Not Adopted, with the Evidence

| Experiment | Result |
| --- | --- |
| X3 one reviewer per page doing the drill and structural roles, with a set digest | duplicates -73%; against the three-page noise band no quality loss is shown, but the cost saving (-19%) is within noise and far below the package's: superseded |
| X5 grade obvious ignores before verifying | only 5% to 17% of verification candidates could be skipped; most ignores are caused by the verdict itself |
| X6 one closer per page verifying and grading | saves about $0.23 a page, and claim verdicts fall below the noise floor (85% to 89% against 96%) |
| X8 Sonnet or Haiku verifiers and graders | Sonnet saves only 15% (more turns, same cache-read price) and verifies outside the noise band; Haiku clears 4 rewrites both Opus runs judged unsafe |
| X10 brief stops asking for kinds the rubric ignores | narrowed: two-thirds of ignores are failed rewrites, not unwanted findings; only design questions are ignored on their face |

## Quality Findings Beyond Efficiency

1. Every run leaves defects. The cold reader after triage raised 2 to 5 findings on every run, and the same Entra ID omission on 02b in every one-page run.
2. A serious defect can stay on the page. On the three pages, the full review raised an S2 contradiction (journey frontends reading the session cookie, against the foundations rule that only the routing service reads the cookie) in 5 clusters; triage put 2 to Ben as keep-one-side decisions and ignored 3, so nothing was applied and the cold reader raised it again. The package P1 raised it in 10 clusters and ignored 9 of them, 3 because their rewrites failed verification.
3. Applied edits can introduce defects. In X1 the edits deleted two table rows and kept the sentence introducing the table, which the cold reader caught.
4. A third to a half of reviewer rewrites change a claim and are dropped under H-29, in every configuration except the delta review and X7.
5. Because two identical runs share only 62% of their fixes, two package runs merged into one triage fix more than one current run at slightly lower cost (Combined Package, items 3 to 5).

## Caveats

1. One corpus. The one-page corpus has two baselines; the three-page corpus has two baselines, and its noise band is wide.
2. One run per arm. Arms close to a floor (X2, X4, X12) need a second run before the number is final.
3. Costs are API-equivalent; the allowance's own weighting is not published.
4. The spot check was automated, and keep-one-side and tell-me answers were not made by hand.
5. B0c was triaged by hand from this session; B0d, P1 and P2 through the triage workflow, which X9 showed gives the same moves within noise.
6. Recall matches fixes by page and anchor line or a shared quote; the match is loose, so recall slightly favours an arm with fewer fixes.

## Blind Pack

`blind-pack/C1/A` to `G` hold the seven one-page runs and `blind-pack/C3/A` to `F` the six three-page runs: each version's closing plan (`plan.md`) and a word diff of its applied edits against the frozen original (`applied.diff`). The letter-to-run key is in `blind-pack-key/`; open it only after judging. For each version, record whether the edits leave the page better for the reader, and whether any edit damages the page.

## Decisions for Ben

1. Commit the Opus reviewer pin (X1). Default: yes.
2. Build the package as production changes: work packets (X2), the fork-based review (X4) without the gate step in the forks, and the triage workflow (X9). Default: yes, in that order.
3. Add the delta review as a mode for rule changes (X11). Default: yes.
4. Judge X7 and the package from the blind pack. Default: no X7 change until judged.
5. Take the surviving S2 contradiction to the rubric: a cross-page contradiction the set settles should not end as an ignore. Default: a rubric change proposal for Ben to review.
6. Two package runs against one current run: tested on 16 Oct (P13); two merged runs fix more at slightly lower cost. Default for a full review: two package runs merged, one run when cost matters more than completeness.
