#!/usr/bin/env bash
# Golden-file tests for grade-triage.sh.
# Invoke with bash (no execute bit required):
#   bash ~/trade-imports-arch-workspace/.claude/tools/editorial-triage/tests/run-golden.sh [--bless]
#
# Each fixtures/<case>/ directory is a complete workarea (triage.json,
# findings.json, manifest.json and, when the case needs them, calibration/
# grades and the pages themselves) plus a case.sh that runs the REAL helpers
# against $WORK, a temp copy of the fixture, with $HELPER_DIR pointing at the
# helpers. A fixture may hold a `base` file naming another case whose files
# are copied first, so a case extends a sibling without duplicating its JSON.
# Combined stdout+stderr (the temp path normalised to WORK, the workspace path
# to WS) and the files the helpers write (the JSON and markdown at the top of
# calibration/, plus closing/ and pages/) diff against expected/<case>/. The
# helpers resolve via $HOME/trade-imports-arch-workspace so the pre-commit
# temp-HOME seam tests the STAGED scripts. --bless rewrites the expected
# directories.

set -u

REAL_WS="$HOME/trade-imports-arch-workspace"
HELPER_DIR="$REAL_WS/.claude/tools/editorial-triage"
TESTS_DIR="$HELPER_DIR/tests"
BLESS=false
[[ "${1:-}" == "--bless" ]] && BLESS=true

say() { echo "golden-triage: $1"; }

FAIL=0
COUNT=0
PRODUCED=""

stage_fixture() {  # $1 case dir, $2 work dir - copies the base (if any) then the case
    local base
    if [[ -f "$1/base" ]]; then
        base=$(tr -d '[:space:]' < "$1/base")
        if [[ ! -d "$TESTS_DIR/fixtures/$base" ]]; then
            say "FAIL $(basename "$1") - base fixture '$base' not found under $TESTS_DIR/fixtures/"
            return 1
        fi
        stage_fixture "$TESTS_DIR/fixtures/$base" "$2" || return 1
        rm -f "$2/case.sh" "$2/base"
    fi
    cp -R "$1"/. "$2"/
}

normalise() { sed "s|$WORK|WORK|g; s|$REAL_WS|WS|g"; }

for case_dir in "$TESTS_DIR"/fixtures/*/; do
    case_dir=${case_dir%/}
    [[ -f "$case_dir/case.sh" ]] || continue
    case=$(basename "$case_dir")
    COUNT=$((COUNT+1))
    WORK=$(mktemp -d)
    ACTUAL=$(mktemp -d)
    if ! stage_fixture "$case_dir" "$WORK"; then
        FAIL=1
        rm -rf "$WORK" "$ACTUAL"
        continue
    fi
    out=$(HELPER_DIR="$HELPER_DIR" WORK="$WORK" bash "$WORK/case.sh" 2>&1)
    printf '%s\n' "$out" | normalise > "$ACTUAL/stdout.txt"
    for f in $PRODUCED; do
        [[ -f "$WORK/$f" ]] && normalise < "$WORK/$f" > "$ACTUAL/$f"
    done
    # grade-triage.sh writes its state under calibration/ (rounds, labels, agreement, score);
    # the grader files a fixture stages under calibration/grades/ are inputs and stay out.
    for f in "$WORK"/calibration/*.json "$WORK"/calibration/*.md; do
        [[ -f "$f" ]] || continue
        mkdir -p "$ACTUAL/calibration"
        normalise < "$f" > "$ACTUAL/calibration/$(basename "$f")"
    done
    # closing/ is the plan and the apply record; pages/ is the fixture's own copy of
    # the page files, so a case that applies edits asserts the text it leaves behind
    # and a case that does not asserts the pages are untouched.
    for d in closing pages; do
        for f in "$WORK/$d"/*; do
            [[ -f "$f" ]] || continue
            mkdir -p "$ACTUAL/$d"
            normalise < "$f" > "$ACTUAL/$d/$(basename "$f")"
        done
    done
    expected="$TESTS_DIR/expected/$case"
    if $BLESS; then
        rm -rf "$expected"
        mkdir -p "$expected"
        cp -R "$ACTUAL"/. "$expected"/
        say "blessed $case"
    elif [[ ! -d "$expected" ]]; then
        say "FAIL $case - no expected directory (run --bless once, review, commit)"
        FAIL=1
    elif ! diff -r "$expected" "$ACTUAL" > "$ACTUAL.diff" 2>&1; then
        say "FAIL $case"
        sed "s|$ACTUAL|actual|g; s|$expected|expected|g; s/^/  /" "$ACTUAL.diff"
        FAIL=1
    else
        say "ok $case"
    fi
    rm -rf "$WORK" "$ACTUAL" "$ACTUAL.diff"
done

if [[ "$COUNT" -eq 0 ]]; then
    say "FAIL - no fixtures found under $TESTS_DIR/fixtures/ (each case is a directory with a case.sh)"
    exit 1
fi
[[ "$FAIL" -eq 1 ]] && exit 1
say "ok - $COUNT case(s)"
exit 0
