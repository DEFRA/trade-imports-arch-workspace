#!/usr/bin/env bash
# Golden-file tests for check-deps.sh.
# Invoke with bash from the workspace root (no execute bit required):
#   bash .claude/tools/workspace/tests/run-golden.sh [--bless]
#
# Each fixtures/<case>/ directory IS a fake workspace fragment
# (.claude/skills/*/SKILL.md, Makefile, child dirs holding a .keep).
# The runner copies it to a temp folder, copies the REAL check-deps.sh
# into the copy's .claude/tools/workspace/, and runs it there. The doctor
# takes its root from its own location, so it checks the copy. stdout,
# with the copy's path written as ROOT, and the exit code are diffed
# against expected/<case>.txt. --bless rewrites expected files.

set -u

TESTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
DOCTOR="$TESTS_DIR/../check-deps.sh"
BLESS=false
[[ "${1:-}" == "--bless" ]] && BLESS=true

say() { echo "golden-deps: $1"; }

FAIL=0
COUNT=0
for fixture in "$TESTS_DIR"/fixtures/*/; do
    [[ -d "$fixture" ]] || continue
    case=$(basename "$fixture")
    COUNT=$((COUNT+1))

    TMP=$(cd "$(mktemp -d)" && pwd -P)
    FAKE="$TMP/workspace"
    mkdir -p "$FAKE/.claude/tools/workspace"
    cp -R "$fixture/." "$FAKE/"
    cp "$DOCTOR" "$FAKE/.claude/tools/workspace/"

    out=$(bash "$FAKE/.claude/tools/workspace/check-deps.sh" 2>&1)
    rc=$?

    actual="$TMP/actual.txt"
    {
        printf '%s\n' "$out" | sed "s|$FAKE|ROOT|g"
        printf 'exit-code: %s\n' "$rc"
    } > "$actual"

    expected="$TESTS_DIR/expected/$case.txt"
    if $BLESS; then
        mkdir -p "$TESTS_DIR/expected"
        cp "$actual" "$expected"
        say "blessed $case"
    elif [[ ! -f "$expected" ]]; then
        say "FAIL $case — no expected file (run --bless once, review, commit)"
        FAIL=1
    elif ! diff "$expected" "$actual" > "$TMP/diff.out" 2>&1; then
        say "FAIL $case"
        sed 's/^/  /' "$TMP/diff.out"
        FAIL=1
    else
        say "ok $case"
    fi
    rm -rf "$TMP"
done

if [[ "$COUNT" -eq 0 ]]; then
    say "FAIL — no fixtures found under $TESTS_DIR/fixtures/"
    exit 1
fi
[[ "$FAIL" -eq 1 ]] && exit 1
say "ok — $COUNT case(s)"
exit 0
