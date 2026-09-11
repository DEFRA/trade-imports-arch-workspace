# grade-label: the labels grammar on round 1 of the plan fixture (same seed as grade-sample).
bash "$HELPER_DIR/grade-triage.sh" sample --dir "$WORK" --round 1 --size 6 --seed 7
echo "exit-code: $?"
# 1. three entries with ; separators: a K with side B, a lower-case move, notes on two
bash "$HELPER_DIR/grade-triage.sh" label --dir "$WORK" --round 1 \
    --labels "1 K:B the record is the home of the lifetime; 2 c; 3 R the sentence is off the point"
echo "exit-code: $?"
# 2. the rest of the round, newline-separated, with a T that lacks its note: the whole string is refused
bash "$HELPER_DIR/grade-triage.sh" label --dir "$WORK" --round 1 \
    --labels "$(printf '4 W\n5 I the cite is missing, park it\n6 T')"
echo "exit-code: $?"
# 3. the same string with the note: recorded
bash "$HELPER_DIR/grade-triage.sh" label --dir "$WORK" --round 1 \
    --labels "$(printf '4 W\n5 I the cite is missing, park it\n6 T say which page holds the cookie rule')"
echo "exit-code: $?"
# 4. a re-label of card 1: overwrites and is reported
bash "$HELPER_DIR/grade-triage.sh" label --dir "$WORK" --round 1 --labels "1 O second look: record which lifetime is current as open"
echo "exit-code: $?"
# 5. an unknown move: the whole string is refused, card 2 stays as it was
bash "$HELPER_DIR/grade-triage.sh" label --dir "$WORK" --round 1 --labels "2 W; 3 Z"
echo "exit-code: $?"
# 6. a side on a move other than K, and a side that is not A or B
bash "$HELPER_DIR/grade-triage.sh" label --dir "$WORK" --round 1 --labels "2 C:A; 1 K:C"
echo "exit-code: $?"
# 7. a card outside the round
bash "$HELPER_DIR/grade-triage.sh" label --dir "$WORK" --round 1 --labels "7 R"
echo "exit-code: $?"
# 8. a duplicate card and a malformed entry, both named
bash "$HELPER_DIR/grade-triage.sh" label --dir "$WORK" --round 1 --labels "5 I; 5 R; 6"
echo "exit-code: $?"
# 9. a round that was never sampled
bash "$HELPER_DIR/grade-triage.sh" label --dir "$WORK" --round 3 --labels "1 R"
echo "exit-code: $?"
