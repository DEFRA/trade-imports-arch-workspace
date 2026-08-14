#!/usr/bin/env bash
# Golden-file tests for check-prose.sh.
# Invoke with bash (no execute bit required):
#   bash ~/trade-imports-arch-workspace/.claude/tools/editorial/tests/run-golden.sh [--bless]
#
# Each fixtures/<case>.md file runs through the REAL check-prose.sh;
# normalized stderr+stdout plus exit code diff against expected/<case>.txt.
# Fixture files legitimately contain the banned bytes - they are excluded
# from the pre-commit staged-markdown gate. The gate is resolved via
# $HOME/trade-imports-arch-workspace so the pre-commit temp-HOME seam
# tests the STAGED script. --bless rewrites expected files.

set -u

REAL_WS="$HOME/trade-imports-arch-workspace"
TESTS_DIR="$REAL_WS/.claude/tools/editorial/tests"
GATE="$REAL_WS/.claude/tools/editorial/check-prose.sh"
BLESS=false
[[ "${1:-}" == "--bless" ]] && BLESS=true

say() { echo "golden-prose: $1"; }

FAIL=0
COUNT=0

record() {  # $1 case name, $2 captured output, $3 exit code
    local case=$1 out=$2 rc=$3
    COUNT=$((COUNT+1))
    local TMP actual expected
    TMP=$(mktemp -d)
    actual="$TMP/actual.txt"
    {
        printf '%s\n' "$out" | sed "s|$REAL_WS|WS|g"
        printf 'exit-code: %s\n' "$rc"
    } > "$actual"
    expected="$TESTS_DIR/expected/$case.txt"
    if $BLESS; then
        mkdir -p "$TESTS_DIR/expected"
        cp "$actual" "$expected"
        say "blessed $case"
    elif [[ ! -f "$expected" ]]; then
        say "FAIL $case - no expected file (run --bless once, review, commit)"
        FAIL=1
    elif ! diff "$expected" "$actual" > "$TMP/diff.out" 2>&1; then
        say "FAIL $case"
        sed 's/^/  /' "$TMP/diff.out"
        FAIL=1
    else
        say "ok $case"
    fi
    rm -rf "$TMP"
}

for f in "$TESTS_DIR"/fixtures/*.md; do
    [[ -f "$f" ]] || continue
    out=$(bash "$GATE" "$f" 2>&1); rc=$?
    record "$(basename "$f" .md)" "$out" "$rc"
done

EMDASH=$(printf '\342\200\224')
out=$(printf 'Bad %s title\n' "$EMDASH" | bash "$GATE" --stdin --label title 2>&1); rc=$?
record "stdin-title-viol" "$out" "$rc"

out=$(printf 'feat: A clean title\n' | bash "$GATE" --stdin --label title 2>&1); rc=$?
record "stdin-title-clean" "$out" "$rc"

out=$(bash "$GATE" "$TESTS_DIR/fixtures/does-not-exist.md" 2>&1); rc=$?
record "missing-file" "$out" "$rc"

if [[ "$COUNT" -eq 0 ]]; then
    say "FAIL - no fixtures found under $TESTS_DIR/fixtures/"
    exit 1
fi
[[ "$FAIL" -eq 1 ]] && exit 1
say "ok - $COUNT case(s)"
exit 0
