# grade-score: every cluster of the plan fixture graded (calibration/grades/all.json), round 1 labelled, then the run scored.
bash "$HELPER_DIR/grade-triage.sh" sample --dir "$WORK" --round 1 --size 6 --seed 7
echo "exit-code: $?"
bash "$HELPER_DIR/grade-triage.sh" label --dir "$WORK" --round 1 \
    --labels "1 K:B the record is the home of the lifetime; 2 C; 3 R the sentence is off the point; 4 W; 5 I the cite is missing, park it; 6 T say which page holds the cookie rule"
echo "exit-code: $?"
bash "$HELPER_DIR/grade-triage.sh" score --dir "$WORK"
echo "exit-code: $?"
