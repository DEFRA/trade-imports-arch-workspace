# Editorial Efficiency Experiments: Plan

Each efficiency idea from `../structural-options.md` and `../efficiency-options.md` becomes a data-driven experiment with a hypothesis, a setup, a run and a result. Ideas that change no judgement are adopted directly and measured afterwards. Ideas that change what an agent sees, decides or runs on are tested against a measured baseline first. Ben judges at the end whether the editorial process is still good enough, from the quality data each run outputs and a blind comparison pack.

## Ideas, by Expected Impact

The expected impact comes from the 14 Oct measurements and the scenario model (`../scenarios.json`). Experiments confirm or overturn these figures.

| Id | Idea | Expected impact | Changes judgement | Route |
| --- | --- | --- | --- | --- |
| I1 | Delta review for changed heuristics | up to 84% for that purpose | yes | experiment X11 |
| I2 | Load once, fork one pass per agent | about 60% per page | yes | experiment X4 |
| I3 | Reviewers on Opus 5.5 instead of Fable | 45%; cache-expiry rewrites gone | yes | experiment X1 |
| I4 | Ignore before verifying | about half the verification work | yes | experiment X5 |
| I5 | One reviewer per page (structural folded into drill, with a set digest) | 17% plus 31% fewer records downstream | yes | experiment X3 |
| I6 | Work packets for every worker | 6 to 12 orientation turns down to 1 per worker | yes, through what the worker sees | experiment X2 |
| I7 | Mechanical tails moved to scripts | 3 to 5 turns per worker | no | adopt with X2, measured there |
| I8 | Verifier and grader as one closer per page | one wave instead of two | yes | experiment X6 |
| I9 | Claim check with repair at write time | fixes survive triage instead of 61 drops | yes | experiment X7 |
| I10 | Verifiers and graders on Sonnet 5.5 or Haiku 5.5 | 13% to 22% | yes | experiment X8 |
| I11 | Triage orchestrated by a workflow script | 65 main-session turns down to 2 or 3 | no | experiment X9, mechanical check only |
| I12 | Review brief stops asking for kinds the rubric ignores | fewer findings at every stage | yes | experiment X10 |
| I13 | Main session does not read the pages | 3% | no | adopt directly |
| I14 | Run the saved review workflow with arguments, not a copy | $5 and one skill load per run | no | adopt directly |
| I15 | Foundations page named for the structural pass only | 2% | yes, small | fold into X3 |
| I16 | Graders gate their notes once, in a script | 2% | no | adopt with X2 |

## Measurement Foundation (Phase 0)

No experiment runs until these exist.

1. Frozen corpus. A copy of the pages at one commit under `experiments/corpus/<commit>/`: corpus C1 is one page (02b, about 5k tokens), corpus C3 is three pages (02a, 02b, 02c), so the experiments that depend on the set size (digest, one reviewer per page, forks) see more than one page. Every run reviews the copy, and triage applies edits only to the copy.
2. Run metrics tool. `run-metrics.sh <extract dir> <triage workarea>` in `.claude/tools/editorial-metrics/` writes one `metrics.json` per run with the metrics below, so every run is measured the same way.
3. Comparison tool. `compare-runs.sh <baseline> <arm>...` prints each metric for each arm, its difference from the baseline and whether the difference lies outside the noise band.
4. Results register. `experiments/register.json` holds one entry per experiment: idea, hypothesis, configuration, runs, metrics, verdict. The comparison tool appends to the register, never a person by hand.
5. A/A baseline. The current process runs twice on C1 and once on C3, with the configuration written down. The two C1 runs give the noise band for every metric: a later difference smaller than the gap between the two baseline runs is not a result.

## Metrics Each Run Outputs

| Group | Metric | Source |
| --- | --- | --- |
| Cost | API-equivalent cost, total and per page; cost by token type; cost by stage | `roles.csv` |
| Effort | agents spawned; turns per agent by role; tool calls; orientation turns (turns before the first page read) | `agents.csv`, `calls.jsonl` |
| Speed | wall time per stage; generation minutes; turns over 5 minutes | `timeline.csv`, `turns.csv` |
| Waste | cache rewrites by cause; page reads per page; gate runs and failures; main-session orchestration turns | `cache-misses.csv`, `page-visits.csv`, `calls.jsonl` |
| Output volume | records, clusters, duplicate clusters (more than one reviewer role) | `findings.json`, `triage.json` |
| Closing quality | moves by type; ignore rate; H-29 ignores; verifier verdicts (none, material, unresolved); edits applied and skipped; prose-gate failures after apply | `calibration/grades/`, `closing/plan.json`, `closing/applied.json` |
| Agreement with the baseline | recall: share of the baseline's applied fixes (R, C, W) that the arm also closes on the same span; extra fixes the arm applies that the baseline did not | match by page and anchor line, then quote |

## Experiment Template

Every experiment record holds:

1. Hypothesis: one sentence that names the metric and the expected direction and size, for example "cost per page falls by at least 30% with recall of the baseline's fixes within the noise band".
2. Setup: the configuration change, the corpus, the model per role and the files that implement the variant. Variants live beside the production files (a workflow variant, a skill reference variant) and never replace them during the experiment.
3. Run: the command sequence, the run ids, the session ids.
4. Result: the `compare-runs.sh` table, the verdict (adopt, reject, inconclusive) and the reason.

## Experiments

| Id | Hypothesis | Setup | Primary metrics | Corpus |
| --- | --- | --- | --- | --- |
| X1 | Opus reviewers cost at least 40% less than Fable reviewers, with no cache-expiry rewrites, and recall within noise | the review workflow with reviewers on Fable against Opus; everything else on Opus | cost of the review wave; cache rewrites; recall; records | C1 |
| X2 | Work packets and script-run tails cut worker turns by at least half and orientation turns to 1, with recall within noise | a packet script, the review and triage roles reading one packet and returning structured output; quote checks and gating run in `build-triage.sh` | turns per agent; orientation turns; cost; recall | C1 |
| X3 | One reviewer per page with a set digest removes duplicate clusters and cuts the review wave cost by at least 25%, with recall within noise | drill and structural roles merged; a digest script; the foundations page for the merged reviewer only by digest | duplicate clusters; records; cost; recall | C3 |
| X4 | A loader with one fork per pass reads the set once: each fork's first turn reads at least 90% of its context from cache, and cost per page falls by at least 40% | a lean loader agent and forks for review, claim check and grade on one page; X2 packets reused | first-turn cache read share; cost per page; recall | C1, then C3 |
| X5 | Grading the obviously ignorable clusters first cuts verification candidates by at least 30% with no change in the moves of the clusters that are verified | build pre-grades the rubric's face-value ignores before the verifier spawn | verifier candidates; verify cost; moves | C1 |
| X6 | One closer per page costs less than a verifier and a grader and gives the same moves | merged verify-and-grade role reading one packet | cost of the triage workers; moves agreement with the baseline grades | C1 |
| X7 | Reviewers that run the claim check and repair before returning cut H-29 ignores by at least half and raise applied fixes | `claim-diff.sh` and a repair step in the reviewer's procedure | H-29 ignores; applied edits; verifier verdicts; recall | C1 |
| X8 | Sonnet 5.5 (then Haiku 5.5) verifiers and graders agree with Opus on at least 90% of moves at a lower cost | the same review result triaged three times, once per model | moves agreement; verdict agreement; cost | C1 |
| X9 | Triage as a workflow script leaves the outputs unchanged and cuts main-session turns to 3 or fewer per stage | a triage workflow calling build, the worker fan-out, score and plan | main-session turns and cost; identical plan structure | C1 |
| X10 | A brief that stops asking for the kinds the rubric nearly always ignores cuts records by at least 25% with the same applied fixes | the review brief edited in a variant copy | records; ignore rate; applied fixes; recall | C1 |
| X11 | A delta review of only the changed heuristics finds at least 80% of the baseline's fixes that cite those heuristics at under 25% of the cost | a review mode that loads the changed heuristics and one page per reviewer, run against a heuristics change already made | recall on the targeted heuristics; cost | C3 |

## Order of Work

1. Phase 0: the corpus, the two tools, the register and the A/A baseline.
2. Adopt directly: I13 (main session does not read the pages) and I14 (the saved workflow with arguments). Measure them in the baseline runs, since they change no judgement.
3. X1 first: the model choice sets the configuration every later experiment runs on.
4. X2 next: packets make X4 and X6 possible and cheaper to build.
5. Then X3, X4, X5, X6 and X7, highest expected impact first, each on the configuration the previous adopted results leave.
6. X8, X9 and X10 run once the closing stage has its final shape.
7. X11 runs when a heuristics change is next made, since it needs a real change to test against.
8. Each adopted result is folded into the production skills and workflow as its own change, then the next experiment runs on top.

## Final Quality Judgement

1. A confirmation run of the adopted package on C3, against the baseline on C3.
2. A blind pack for Ben: for each run, the closing plan (`plan.md`) and the applied diff on the corpus copy, labelled A and B with the mapping held back until Ben has judged.
3. The metrics summary from the register: cost, time and every quality proxy, baseline against package.
4. Ben's verdict: adopt the package, adopt part of it, or keep the current process.

## Budget and Allowance

1. A C1 run of the current process costs about $10 to $15 on Opus, by the 13 Oct single-page runs repriced; a C3 run about three times that.
2. Phase 0 is about four runs; each experiment one or two runs; the confirmation two runs. About 30 runs in total.
3. At most two runs per working session, so no run reaches the usage limit that stopped the 14 Oct run for 18 hours.

## Decisions for Ben

1. Baseline model: the current process with every role on Opus 5.5 (default), so the structural experiments are measured apart from the model; X1 tests Fable against Opus.
2. Corpus pages: 02b for C1 and 02a, 02b and 02c for C3 (default), at the current main commit.
3. Experiment variants live on a branch named by Ben, with the production skills unchanged until an experiment is adopted.
