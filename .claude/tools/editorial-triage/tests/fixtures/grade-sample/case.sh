# grade-sample: cumulative targets over three rounds of the plan fixture, a refused
# re-sample, and a score with no grader file.
# author/author is capped at 1 so round 1 spends its whole target; the other
# categories keep the defaults in lib/grade.jq.
# 1. round 1, eight items, one from each category the fixture holds
bash "$HELPER_DIR/grade-triage.sh" sample --dir "$WORK" --round 1 --size 8 --seed 7 --targets '{"author/author": 1}'
echo "exit-code: $?"
# 2. round 2: author/author is exhausted by round 1 and skipped although its other
#    cluster remains; the categories with target left give five, so the round of six
#    stops short rather than drawing outside the targets
bash "$HELPER_DIR/grade-triage.sh" sample --dir "$WORK" --round 2 --size 6 --seed 7 --targets '{"author/author": 1}'
echo "exit-code: $?"
# 3. round 1 again without --force: refused, the files stand
bash "$HELPER_DIR/grade-triage.sh" sample --dir "$WORK" --round 1 --size 8 --seed 7 --targets '{"author/author": 1}'
echo "exit-code: $?"
# 4. round 3: every category is either out of clusters or out of target, so nothing can be drawn
bash "$HELPER_DIR/grade-triage.sh" sample --dir "$WORK" --round 3 --size 6 --seed 7 --targets '{"author/author": 1}'
echo "exit-code: $?"
# 5. score with no grader file: nothing to measure, and the message names what to run
rm -rf "$WORK/calibration/grades"
bash "$HELPER_DIR/grade-triage.sh" score --dir "$WORK"
echo "exit-code: $?"
