#!/usr/bin/env bash
# hook-stop.sh - Stop hook: block turn-end while an editorial artefact carries
# FAIL lines the session introduced.
#
# Wired from the editorial skill's frontmatter. Reads the Stop hook JSON on
# stdin, loads the session's recorded artefact paths (written by
# hook-check-written.sh --record), and re-runs check-prose.sh on each file
# that still exists. Introduction-only: the gate polices what the session
# wrote, not what the corpus already said. Each failing file's FAIL lines
# are compared against a baseline computed from its git HEAD version
# (check-prose.sh --print-fail-lines on both); only FAIL lines absent from
# the baseline block the turn (exit 2 + stderr reason). An untracked or
# newly added file has an empty baseline - every FAIL line in it is the
# session's. Always blocks on introduced violations - the escape hatch is
# the user's interrupt, not a model decision. stop_hook_active only
# annotates repeat blocks. No state file means nothing was written this
# session: exit 0.

set -uo pipefail

GATE="$HOME/trade-imports-arch-workspace/.claude/tools/editorial/check-prose.sh"

INPUT=$(cat)
SESSION=$(printf '%s' "$INPUT" | jq -r '.session_id // "nosession"')
ACTIVE=$(printf '%s' "$INPUT" | jq -r '.stop_hook_active // false')
STATE="${TMPDIR:-/tmp}/claude-editorial-${SESSION}.paths"

[ -f "$STATE" ] || exit 0

# FAIL lines in the file's git HEAD version. Empty (and exit 0) for files
# that are untracked, newly added, or outside a repo. git resolves the
# repo from the file's own directory, so symlinked path prefixes are safe.
baseline_fail_lines() {  # $1 file on disk
  local dir rel
  dir=$(dirname "$1")
  rel=$(git -C "$dir" ls-files --full-name --error-unmatch -- "$(basename "$1")" 2>/dev/null) || return 0
  git -C "$dir" show "HEAD:$rel" 2>/dev/null \
    | bash "$GATE" --stdin --label baseline --print-fail-lines 2>/dev/null
  return 0
}

BAD=0
REPORT=""
while IFS= read -r f; do
  [ -f "$f" ] || continue
  CURRENT=$(bash "$GATE" --print-fail-lines "$f" 2>/dev/null)
  [ -n "$CURRENT" ] || continue
  BASELINE=$(baseline_fail_lines "$f")
  if [ -n "$BASELINE" ]; then
    NEW=$(printf '%s\n' "$CURRENT" | grep -vxF -f <(printf '%s\n' "$BASELINE") || true)
  else
    NEW=$CURRENT
  fi
  [ -n "$NEW" ] || continue
  BAD=1
  REPORT="${REPORT}hook-stop: $f - FAIL line(s) introduced this session (pre-existing violations do not block):"$'\n'
  while IFS= read -r l; do
    REPORT="${REPORT}  $l"$'\n'
  done <<< "$NEW"
done < "$STATE"

[ "$BAD" -eq 0 ] && exit 0

{
  [ "$ACTIVE" = "true" ] && echo "hook-stop: editorial close-out STILL failing after a previous block."
  printf '%s' "$REPORT"
  echo "hook-stop: the turn cannot end while a touched file carries editorial FAIL lines this session introduced. Fix the lines above (run check-prose.sh on the file for the governing rule per line; WARNs are judgment calls), then finish. Rules: ~/trade-imports-arch-workspace/.claude/skills/editorial/SKILL.md (Style guide)."
} >&2
exit 2
