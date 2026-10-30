#!/usr/bin/env bash
# tier-candidates: the tiering tool over a two-page corpus committed to a
# throwaway git repository. Page one holds a phrase once in prose and again
# in a code span and a fence, which must not count. Page two holds a word
# three times, once capitalised. A skipped folder holds every candidate and
# is left out through --skip. The candidate table carries a zero-hit hype
# row, a one-hit row, a three-hit row over the threshold of 2, a zero-hit
# row with a literal note and a row whose form the gate refuses. Then the
# failure cases: no arguments, a missing candidates file, a table with no
# rows, and a root outside any repository. Every temporary file lives under
# WORK, which this case removes on exit; every path under WORK is
# normalised to a stable label.
set -u
trap 'rm -rf "$WORK"' EXIT

# A pre-commit hook exports the outer repository's git variables. Unset
# them, so the throwaway repository and the tool's ls-files read their own
# index and never the commit in progress.
unset GIT_DIR GIT_INDEX_FILE GIT_WORK_TREE GIT_PREFIX GIT_OBJECT_DIRECTORY GIT_ALTERNATE_OBJECT_DIRECTORIES

T="$HELPER_DIR/tier-candidates.sh"
FIX="$HELPER_DIR/tests/fixtures/tier-candidates"
norm() { sed "s|$WORK|WORK|g"; }
run() {  # $1 label, then the tool's arguments
  local label=$1; shift
  echo "--- $label ---"
  bash "$T" "$@" 2>&1 | norm
  echo "exit ${PIPESTATUS[0]}"
}

R="$WORK/repo"
mkdir -p "$R" "$WORK/plain"
cp -R "$FIX/corpus/." "$R/"
git -C "$R" init -q > /dev/null 2>&1
git -C "$R" add -A
git -C "$R" -c user.name=t -c user.email=t@t -c commit.gpgsign=false -c core.hooksPath=/dev/null commit -q -m fixture

run "tiered, threshold 2" "$FIX/candidates.md" --threshold 2 --skip skipped/ "$R"

echo "--- execution failures ---"
run "no arguments"
run "missing candidates file" "$WORK/nope.md" "$R"
run "a table with no rows" "$FIX/no-table.md" "$R"
run "a root outside any repository" "$FIX/candidates.md" "$WORK/plain"
