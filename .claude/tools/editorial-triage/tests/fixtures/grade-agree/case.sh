# grade-agree: round 1 of the plan fixture labelled by hand, graded by two files (round-1b.json re-grades C-02-004 and adds C-03-002).
bash "$HELPER_DIR/grade-triage.sh" sample --dir "$WORK" --round 1 --size 6 --seed 7
echo "exit-code: $?"
bash "$HELPER_DIR/grade-triage.sh" label --dir "$WORK" --round 1 \
    --labels "1 K:B the record is the home of the lifetime; 2 C; 3 R the sentence is off the point; 4 W; 5 I the cite is missing, park it; 6 T say which page holds the cookie rule"
echo "exit-code: $?"
# 1. agreement on round 1: one side disagreement on K, one move disagreement, the later grader file winning on C-02-004
bash "$HELPER_DIR/grade-triage.sh" agree --dir "$WORK" --round 1
echo "exit-code: $?"
# 2. round 2 has neither labels nor grades: nothing to compare
bash "$HELPER_DIR/grade-triage.sh" sample --dir "$WORK" --round 2 --size 6 --seed 7
echo "exit-code: $?"
bash "$HELPER_DIR/grade-triage.sh" agree --dir "$WORK" --round 2
echo "exit-code: $?"
