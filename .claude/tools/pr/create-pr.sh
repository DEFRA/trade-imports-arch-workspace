#!/usr/bin/env bash
# create-pr.sh — create or edit a GitHub pull request with a no-attribution guard.
#
# Usage:
#   bash create-pr.sh --title <title> --body-file <path> [--base main] [--head <branch>] [--repo <owner/name>] [--dry-run]
#   bash create-pr.sh --edit <number> --body-file <path> [--title <title>] [--repo <owner/name>] [--dry-run]
#   bash create-pr.sh --help
#
# Refuses (exit 2) any title or body containing AI attribution (the rule in
# best-practices/git/pull-requests.md), naming the offending line, and any
# title or body that fails hedy prose check, printing the findings. --dry-run
# prints the gh command it would run instead of running it. Requires gh
# (authenticated) and this checkout's hedy install. The body must be passed
# as a file, never inline.

set -euo pipefail

ATTRIBUTION_PATTERN='Generated with|Co-Authored-By|Claude Code|Signed-off-by|🤖'

usage() {
  sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'
}

fail() {
  printf 'create-pr: %s\n' "$1" >&2
  exit "${2:-1}"
}

TITLE="" BODY_FILE="" BASE="main" HEAD="" REPO="" EDIT="" DRY_RUN=0

while [ $# -gt 0 ]; do
  case "$1" in
    --title)     TITLE=${2:?--title needs a value};      shift 2 ;;
    --body-file) BODY_FILE=${2:?--body-file needs a value}; shift 2 ;;
    --base)      BASE=${2:?--base needs a value};        shift 2 ;;
    --head)      HEAD=${2:?--head needs a value};        shift 2 ;;
    --repo)      REPO=${2:?--repo needs a value};        shift 2 ;;
    --edit)      EDIT=${2:?--edit needs a PR number};    shift 2 ;;
    --dry-run)   DRY_RUN=1;                              shift ;;
    --help|-h)   usage; exit 0 ;;
    *)           fail "unknown argument '$1' (see --help)" ;;
  esac
done

command -v gh >/dev/null 2>&1 || fail "gh not found — install the GitHub CLI or fall back to plain git push and ask a human to open the PR"

[ -n "$BODY_FILE" ] || fail "--body-file is required (inline bodies are not accepted)"
[ -f "$BODY_FILE" ] || fail "body file not found: $BODY_FILE"

# The guard: no AI attribution in the title or anywhere in the body.
if [ -n "$TITLE" ] && printf '%s' "$TITLE" | grep -Eq "$ATTRIBUTION_PATTERN"; then
  fail "title contains AI attribution ('$TITLE') — forbidden by best-practices/git/pull-requests.md; remove it and re-run" 2
fi
OFFENDING=$(grep -En "$ATTRIBUTION_PATTERN" "$BODY_FILE" || true)
if [ -n "$OFFENDING" ]; then
  fail "body contains AI attribution — forbidden by best-practices/git/pull-requests.md; remove these line(s) from $BODY_FILE and re-run:
$OFFENDING" 2
fi

# The prose check: the title and body hold no banned word and no pattern
# from language.md. Each is read on stdin under a label, so a body file
# kept under .claude/ is still checked as a document for people. The check
# runs this checkout's hedy, because the hedy on PATH may be linked to
# another checkout.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd -P)"
HEDY_ENTRY="$ROOT/hedy/src/cli.js"
[ -d "$ROOT/hedy/node_modules" ] || fail "hedy is not installed in $ROOT — run make -C $ROOT install, then re-run"
if [ -n "$TITLE" ] && ! FINDINGS=$(printf '%s\n' "$TITLE" | node "$HEDY_ENTRY" prose check --stdin --label "pull request title" 2>&1); then
  fail "title fails hedy prose check — reword each banned and pattern finding, then re-run:
$FINDINGS" 2
fi
if ! FINDINGS=$(node "$HEDY_ENTRY" prose check --stdin --label "pull request body" < "$BODY_FILE" 2>&1); then
  fail "body fails hedy prose check — reword each banned and pattern finding in $BODY_FILE, then re-run:
$FINDINGS" 2
fi

if [ -n "$EDIT" ]; then
  set -- pr edit "$EDIT" --body-file "$BODY_FILE"
  [ -n "$TITLE" ] && set -- "$@" --title "$TITLE"
else
  [ -n "$TITLE" ] || fail "--title is required when creating"
  set -- pr create --title "$TITLE" --body-file "$BODY_FILE" --base "$BASE"
  [ -n "$HEAD" ] && set -- "$@" --head "$HEAD"
fi
[ -n "$REPO" ] && set -- "$@" --repo "$REPO"

if [ "$DRY_RUN" -eq 1 ]; then
  printf 'create-pr: dry run — would execute: gh'
  printf ' %q' "$@"
  printf '\n'
  exit 0
fi

exec gh "$@"
