# grade-apply: the plan of the grade-plan fixture applied to that fixture's own page files.
# Six entries are selected. Four apply: C-02-001 corrects the citation; C-02-002 removes a
# whole bullet and the line it leaves empty inside a list goes with it; C-02-006 removes a
# clause and the space before the full stop is closed up; C-03-001 rewords a verb on 03,
# whose line 7 still carries the same banned word, so the page fails the gate and the entry
# is recorded gate-fail. Two skip: C-02-003 names a phrase the page holds twice, C-02-004 a
# phrase the page no longer holds. K, O, T and I are never applied.
# 1. a workarea with no plan names the subcommand that writes one
bash "$HELPER_DIR/grade-triage.sh" apply --dir "$WORK"
echo "exit-code: $?"
bash "$HELPER_DIR/grade-triage.sh" plan --dir "$WORK" --sample 3 --seed 42
echo "exit-code: $?"
# the pages sit in a git working tree with changes of their own (nothing is committed here)
git -C "$WORK" init -q > /dev/null 2>&1
# 2. a dry run reports what would change and is not refused by the dirty working tree
bash "$HELPER_DIR/grade-triage.sh" apply --dir "$WORK" --dry-run
echo "exit-code: $?"
# 3. --moves narrows the selection to the corrections
bash "$HELPER_DIR/grade-triage.sh" apply --dir "$WORK" --dry-run --moves C
echo "exit-code: $?"
# 4. a real run over a dirty working tree is refused, and names the remedy
bash "$HELPER_DIR/grade-triage.sh" apply --dir "$WORK"
echo "exit-code: $?"
# 5. --force applies; the gate FAIL on 03 makes the exit code 2
bash "$HELPER_DIR/grade-triage.sh" apply --dir "$WORK" --force
echo "exit-code: $?"
# 6. nothing is left to apply: every phrase has either gone or was skipped before
bash "$HELPER_DIR/grade-triage.sh" apply --dir "$WORK" --dry-run
echo "exit-code: $?"
# 7. the moves that belong to the user are never applied
bash "$HELPER_DIR/grade-triage.sh" apply --dir "$WORK" --moves K
echo "exit-code: $?"
# 8. re-planning without --sample leaves the spot check older than the plan, and
#    a real run is refused until a fresh one is drawn and reviewed
bash "$HELPER_DIR/grade-triage.sh" plan --dir "$WORK"
echo "exit-code: $?"
bash "$HELPER_DIR/grade-triage.sh" apply --dir "$WORK"
echo "exit-code: $?"
# 9. --force covers the dirty working tree and nothing else: the spot check still
#    refuses, so the flag the ordinary run carries cannot turn off the review gate
bash "$HELPER_DIR/grade-triage.sh" apply --dir "$WORK" --force
echo "exit-code: $?"
# 10. --no-spot-check is the gate's own override, and takes --force with it here
bash "$HELPER_DIR/grade-triage.sh" apply --dir "$WORK" --force --no-spot-check
echo "exit-code: $?"
