#!/usr/bin/env bash
# draft-density: the density tool on a short page with a known word count
# of 42. The page holds two FAIL term hits of different rows, one WARN term
# hit, one spaced hyphen and one semicolon. Its terms come from the
# editorial-profile.md beside it, so the case does not move when
# language.md's table changes. Front matter, the CONFLUENCE_ONLY comment
# lines, the table and the fence add no words. A second page of 17 words
# holds two forms of one row and one term twice on a single line: each
# distinct term counts once on that line. Then the failure cases: a
# missing file and no arguments.
set -u

T="$TOOL_DIR/draft-density.sh"
run() {  # $1 label, then the tool's arguments
  local label=$1; shift
  echo "--- $label ---"
  bash "$T" "$@" 2>&1
  echo "exit $?"
}

run "the fixture page" "$WORK/page.md"
run "several terms on one line" "$WORK/page-multi.md"
run "a missing file" "$WORK/nope.md"
run "no arguments"
exit 0
