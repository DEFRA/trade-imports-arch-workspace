# grade-plan: every closing move on one self-contained workarea of two pages, twelve clusters.
# Labels close five clusters (C-02-001 C, C-02-002 R, C-02-005 K:B, C-03-003 T, C-03-006 C);
# the grader files close six more, with round-2.json re-grading C-03-004 from W to I (later
# file by name wins) and C-02-001 graded R where Ben's label C overrides it. C-03-005 has
# neither a label nor a grade. Three clusters cannot close as they stand: C-03-005 ungraded,
# C-03-006 a C whose record carries no rewrite, C-xx-001 an R on a set-wide cluster with no
# page file. The pages are not touched: plan only reads them through the manifest.
# 1. the plan alone, no spot check
bash "$HELPER_DIR/grade-triage.sh" plan --dir "$WORK"
echo "exit-code: $?"
# 2. a spot check of two entries: the draw follows the seed
bash "$HELPER_DIR/grade-triage.sh" plan --dir "$WORK" --sample 2 --seed 7
echo "exit-code: $?"
# 3. --round belongs to the calibration subcommands, not to plan
bash "$HELPER_DIR/grade-triage.sh" plan --dir "$WORK" --round 1
echo "exit-code: $?"
# 4. a sample size that is not a whole number from 1
bash "$HELPER_DIR/grade-triage.sh" plan --dir "$WORK" --sample 0
echo "exit-code: $?"
# 5. the state the expected files carry: three entries drawn with the default seed
bash "$HELPER_DIR/grade-triage.sh" plan --dir "$WORK" --sample 3 --seed 42
echo "exit-code: $?"
