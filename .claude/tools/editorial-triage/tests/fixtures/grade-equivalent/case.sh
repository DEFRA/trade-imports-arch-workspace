# grade-equivalent: moves that produce the same text count as agreement. Seven clusters in seven categories,
# so the round order is author/author, fix/verified, propose/grows, propose/tangent, propose/removal,
# propose/dispersion, propose/no-rewrite:
# 1 C-03-001 (contradiction, no rewrite: an R of the card's text is K:B)
# 2 C-02-002 (a citation correction: a real C versus R disagreement)
# 3 C-04-001 (contradiction whose removes span is the quote with its bullet marker "- " and full stop: R is K:B)
# 4 C-03-003 (rewrite equal to the removal where the span starts with a joining comma and the after keeps
#   the trailing semicolon: the card offers R alone and a C counts as R)
# 5 C-02-001 (the rewrite is the removal: the card offers R alone and a C counts as R)
# 6 C-02-003 (a list item removed and the conjunction repaired, "A, B and C" to "A and B": a C counts as R)
# 7 C-03-002 (contradiction whose removes span is side B: R is K:A)
bash "$HELPER_DIR/grade-triage.sh" sample --dir "$WORK" --round 1 --size 7 --seed 7
echo "exit-code: $?"
bash "$HELPER_DIR/grade-triage.sh" label --dir "$WORK" --round 1 \
    --labels "1 K:B the routing page is the home of the lifetime; 2 C; 3 K:B keep the scoping sentence, drop the Open questions bullet; 4 C same result as the removal; 5 C the clause goes and the sentence reads the same; 6 C the list reads the same without the item; 7 R the twelve-hour sentence goes"
echo "exit-code: $?"
# six equivalent pairs, one real disagreement on card 2
bash "$HELPER_DIR/grade-triage.sh" agree --dir "$WORK" --round 1
echo "exit-code: $?"
bash "$HELPER_DIR/grade-triage.sh" score --dir "$WORK"
echo "exit-code: $?"
