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
# tests the STAGED script. fixtures/claim-diff/case.sh exercises the
# claim-diff.sh wrapper the same way, recorded as the case "claim-diff".
# --bless rewrites expected files.

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

out=$(printf 'A seamless launch %s done.\nA clean line stays out.\nSign in to the portal.\n' "$EMDASH" \
    | bash "$GATE" --stdin --label plines --print-fail-lines 2>&1); rc=$?
record "stdin-print-fail-lines" "$out" "$rc"

out=$(bash "$GATE" "$TESTS_DIR/fixtures/does-not-exist.md" 2>&1); rc=$?
record "missing-file" "$out" "$rc"

# A document set's own terms table, read on top of language.md: a trailing
# * wildcard, a multi-word phrase across spaces, a Guidance row unchecked.
TERMS_DIR="$TESTS_DIR/fixtures/terms-table"
out=$(bash "$GATE" --terms "$TERMS_DIR/terms.md" "$TERMS_DIR/page.md" 2>&1); rc=$?
record "terms-table" "$out" "$rc"

out=$(bash "$GATE" --terms "$TERMS_DIR/bad-terms.md" "$TERMS_DIR/page.md" 2>&1); rc=$?
record "terms-bad-form" "$out" "$rc"

out=$(bash "$GATE" --terms "$TERMS_DIR/no-table.md" "$TERMS_DIR/page.md" 2>&1); rc=$?
record "terms-no-table" "$out" "$rc"

# A docs-scoped row applies to human-facing documents only and is skipped
# for an agent-instruction path. The cases run inside the fixture folder,
# so the page path is relative and the labels name no real file: a page
# under .claude/ would itself count as an agent-instruction file.
SCOPE_DIR="$TESTS_DIR/fixtures/scope-docs"
out=$(cd "$SCOPE_DIR" && bash "$GATE" --terms terms.md page.md 2>&1); rc=$?
record "scope-docs-file" "$out" "$rc"

out=$(cd "$SCOPE_DIR" && bash "$GATE" --stdin --label .claude/skills/x/SKILL.md --terms terms.md < page.md 2>&1); rc=$?
record "scope-docs-agent-skill" "$out" "$rc"

out=$(cd "$SCOPE_DIR" && bash "$GATE" --stdin --label hedy/CLAUDE.md --terms terms.md < page.md 2>&1); rc=$?
record "scope-docs-agent-claude-md" "$out" "$rc"

out=$(cd "$SCOPE_DIR" && bash "$GATE" --stdin --label docs/page.md --terms terms.md < page.md 2>&1); rc=$?
record "scope-docs-page" "$out" "$rc"

out=$(cd "$SCOPE_DIR" && bash "$GATE" --terms bad-scope.md page.md 2>&1); rc=$?
record "scope-bad-token" "$out" "$rc"

# The nearest editorial-profile.md above a page adds its table with no
# flag, for a file and for --stdin whose label names the file.
DISC="$TESTS_DIR/fixtures/profile-discovery/pages/page.md"
out=$(bash "$GATE" "$DISC" 2>&1); rc=$?
record "profile-discovery" "$out" "$rc"

out=$(bash "$GATE" --stdin --label "$DISC" --print-fail-lines < "$DISC" 2>&1); rc=$?
record "profile-discovery-stdin" "$out" "$rc"

# The claim-diff wrapper, through its own case: the case owns and removes the
# work directory it is given; the runner removes it again as a second line.
WORK=$(mktemp -d)
out=$(HELPER_DIR="$REAL_WS/.claude/tools/editorial" WORK="$WORK" bash "$TESTS_DIR/fixtures/claim-diff/case.sh" 2>&1); rc=$?
rm -rf "$WORK"
record "claim-diff" "$out" "$rc"

# The preferred-names check, the same way.
WORK=$(mktemp -d)
out=$(HELPER_DIR="$REAL_WS/.claude/tools/editorial" WORK="$WORK" bash "$TESTS_DIR/fixtures/check-names/case.sh" 2>&1); rc=$?
rm -rf "$WORK"
record "check-names" "$out" "$rc"

# The editorial profile reader, the same way.
WORK=$(mktemp -d)
out=$(HELPER_DIR="$REAL_WS/.claude/tools/editorial" WORK="$WORK" bash "$TESTS_DIR/fixtures/read-profile/case.sh" 2>&1); rc=$?
rm -rf "$WORK"
record "read-profile" "$out" "$rc"

# The candidate-row tiering tool, the same way.
WORK=$(mktemp -d)
out=$(HELPER_DIR="$REAL_WS/.claude/tools/editorial" WORK="$WORK" bash "$TESTS_DIR/fixtures/tier-candidates/case.sh" 2>&1); rc=$?
rm -rf "$WORK"
record "tier-candidates" "$out" "$rc"

if [[ "$COUNT" -eq 0 ]]; then
    say "FAIL - no fixtures found under $TESTS_DIR/fixtures/"
    exit 1
fi
[[ "$FAIL" -eq 1 ]] && exit 1
say "ok - $COUNT case(s)"
exit 0
