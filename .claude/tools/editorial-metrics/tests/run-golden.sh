#!/usr/bin/env bash
# Golden-file tests for the editorial-metrics tools.
# Invoke with bash (no execute bit required):
#   bash ~/trade-imports-arch-workspace/.claude/tools/editorial-metrics/tests/run-golden.sh [--bless]
#
# Each fixtures/<case>/ directory holds a synthetic projects/ tree of
# transcripts, any inputs the case needs, and a case.sh that runs the REAL
# tools against $WORK, a temp copy of the fixture, with $TOOL_DIR pointing at
# the tools. The case's combined stdout+stderr (the temp path normalised to
# WORK) and the files it writes under out/ diff against expected/<case>/.
# The tools resolve via $HOME/trade-imports-arch-workspace, so the
# pre-commit temp-HOME seam tests the STAGED scripts. --bless rewrites the
# expected directories.

set -u

REAL_WS="$HOME/trade-imports-arch-workspace"
TOOL_DIR="$REAL_WS/.claude/tools/editorial-metrics"
TESTS_DIR="$TOOL_DIR/tests"
BLESS=false
[[ "${1:-}" == "--bless" ]] && BLESS=true

say() { echo "golden-metrics: $1"; }

FAIL=0
COUNT=0
for case_dir in "$TESTS_DIR"/fixtures/*/; do
    case_dir=${case_dir%/}
    [[ -f "$case_dir/case.sh" ]] || continue
    case=$(basename "$case_dir")
    COUNT=$((COUNT+1))
    WORK=$(mktemp -d)
    ACTUAL=$(mktemp -d)
    cp -R "$case_dir"/. "$WORK"/
    out=$(TOOL_DIR="$TOOL_DIR" WORK="$WORK" bash "$WORK/case.sh" 2>&1)
    rc=$?
    printf '%s\n' "$out" | sed "s|$WORK|WORK|g" > "$ACTUAL/stdout.txt"
    if [[ -d "$WORK/out" ]]; then
        mkdir -p "$ACTUAL/out"
        for f in "$WORK"/out/*; do
            [[ -f "$f" ]] && sed "s|$WORK|WORK|g" "$f" > "$ACTUAL/out/$(basename "$f")"
        done
    fi
    expected="$TESTS_DIR/expected/$case"
    if [[ "$rc" -ne 0 ]]; then
        say "FAIL $case - exit $rc"
        printf '%s\n' "$out" | tail -n 5 | sed 's/^/  /'
        FAIL=1
    elif $BLESS; then
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
