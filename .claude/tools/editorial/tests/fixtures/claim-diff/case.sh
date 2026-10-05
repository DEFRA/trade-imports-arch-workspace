#!/usr/bin/env bash
# claim-diff: the wrapper on the four frozen nominator pairs from the
# calibration corpus (Codex's INS07, INS15 and INS18, the three catches with
# their named evidence; Codex's INS11, a list conversion that changes
# punctuation, the negative), its execution failures (no arguments, a
# missing --after, an unreadable before file, no library, a library jq
# cannot compile), a multi-line before with an empty after, which shows
# every line is read and the deletion nominated, and a pair differing only in
# a trailing newline, which the wrapper passes through unnormalised so the
# library reports the layout difference. Every temporary file lives
# under WORK, which this case removes on exit whether it passes or fails;
# every generated path in the output is normalised to a stable label.
set -u
trap 'rm -rf "$WORK"' EXIT

W="$HELPER_DIR/claim-diff.sh"
PAIRS="$HELPER_DIR/tests/fixtures/claim-diff/pairs.json"
norm() { sed "s|$WORK|WORK|g"; }
run() {  # $1 label, then the wrapper's arguments
  local label=$1; shift
  echo "--- $label ---"
  bash "$W" "$@" 2>&1 | norm
  echo "exit ${PIPESTATUS[0]}"
}
out() { bash "$W" --before "$WORK/pairs/$1.before" --after "$WORK/pairs/$1.after"; }

mkdir -p "$WORK/pairs"
for id in INS07 INS15 INS18 INS11; do
  jq -j --arg id "$id" '.[] | select(.id == $id) | .before' "$PAIRS" > "$WORK/pairs/$id.before"
  jq -j --arg id "$id" '.[] | select(.id == $id) | .after' "$PAIRS" > "$WORK/pairs/$id.after"
  run "$id" --before "$WORK/pairs/$id.before" --after "$WORK/pairs/$id.after"
done

echo "--- named evidence ---"
out INS07 | jq -e '.nominated and (.missingSentence[0] | startswith("How journeys validate those internal requests is a decision rather than a gap")) and any(.removed[]; .term == "decision")' > /dev/null
echo "INS07 missing decision sentence and removed decision: $?"
out INS15 | jq -e '.nominated and any(.added[]; .class == "modal" and .term == "can")' > /dev/null
echo "INS15 added modal can: $?"
out INS18 | jq -e '.nominated and any(.missingSentence[]; startswith("Two cases are kept apart from a refusal")) and any(.removed[]; .class == "connective" and .term == "then")' > /dev/null
echo "INS18 missing non-refusal sentence and removed then: $?"
out INS11 | jq -e '(.nominated | not) and (.layoutOnly | not)' > /dev/null
echo "INS11 unnominated and not layout-only: $?"

echo "--- execution failures ---"
run "no arguments"
run "missing --after" --before "$WORK/pairs/INS07.before"
run "unreadable before" --before "$WORK/pairs/nope.before" --after "$WORK/pairs/INS07.after"

mkdir -p "$WORK/home-empty"
echo "--- no library (HOME with no workspace) ---"
HOME="$WORK/home-empty" bash "$W" --before "$WORK/pairs/INS07.before" --after "$WORK/pairs/INS07.after" 2>&1 | norm
echo "exit ${PIPESTATUS[0]}"

BROKEN="$WORK/home-broken/trade-imports-arch-workspace/.claude/tools/editorial-triage/lib"
mkdir -p "$BROKEN"
printf 'def claim_diff($b; $a): {;\n' > "$BROKEN/claim-elements.jq"
echo "--- a library jq cannot compile (jq's own compile message elided; only the wrapper's diagnostic kept) ---"
HOME="$WORK/home-broken" bash "$W" --before "$WORK/pairs/INS07.before" --after "$WORK/pairs/INS07.after" 2>&1 | norm | grep -E '^claim-diff:'
echo "exit ${PIPESTATUS[0]}"

printf 'The first sentence holds a claim.\nThe second sentence holds another claim.\n' > "$WORK/multi.before"
: > "$WORK/multi.after"
run "multi-line before, empty after" --before "$WORK/multi.before" --after "$WORK/multi.after"

# The trailing newline is part of the text. Two files whose only difference is
# that newline nominate nothing and are layout-only, which is the library's
# own verdict on an unequal pair with equal flattened text; the wrapper passes
# the bytes through and does not normalise them away.
printf 'The gateway retries failed requests.\n' > "$WORK/newline.before"
printf 'The gateway retries failed requests.' > "$WORK/newline.after"
run "trailing newline only" --before "$WORK/newline.before" --after "$WORK/newline.after"
bash "$W" --before "$WORK/newline.before" --after "$WORK/newline.after" \
  | jq -e '(.nominated | not) and .layoutOnly and .added == [] and .removed == [] and .missingSentence == []' > /dev/null
echo "trailing newline unnominated and layout-only: $?"
