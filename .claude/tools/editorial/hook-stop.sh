#!/usr/bin/env bash
# hook-stop.sh - Stop hook: block turn-end while an editorial artefact still fails.
#
# Wired from the editorial skill's frontmatter. Reads the Stop hook JSON on
# stdin, loads the session's recorded artefact paths (written by
# hook-check-written.sh --record), re-runs check-prose.sh on each file that
# still exists, and blocks the turn (exit 2 + stderr reason) while any hard
# violation remains. Always blocks - the escape hatch is the user's
# interrupt, not a model decision. stop_hook_active only annotates repeat
# blocks. No state file means nothing was written this session: exit 0.

set -uo pipefail

GATE="$HOME/trade-imports-arch-workspace/.claude/tools/editorial/check-prose.sh"

INPUT=$(cat)
SESSION=$(printf '%s' "$INPUT" | jq -r '.session_id // "nosession"')
ACTIVE=$(printf '%s' "$INPUT" | jq -r '.stop_hook_active // false')
STATE="${TMPDIR:-/tmp}/claude-editorial-${SESSION}.paths"

[ -f "$STATE" ] || exit 0

BAD=0
REPORT=""
while IFS= read -r f; do
  [ -f "$f" ] || continue
  OUT=$(bash "$GATE" "$f" 2>&1)
  if [ $? -eq 2 ]; then
    BAD=1
    REPORT="$REPORT$OUT"$'\n'
  fi
done < "$STATE"

[ "$BAD" -eq 0 ] && exit 0

{
  [ "$ACTIVE" = "true" ] && echo "hook-stop: editorial close-out STILL failing after a previous block."
  printf '%s' "$REPORT"
  echo "hook-stop: the turn cannot end while a touched file fails the editorial style gate. Fix the FAIL lines above (WARNs are judgment calls), then finish. Rules: ~/trade-imports-arch-workspace/.claude/skills/editorial/SKILL.md (Style guide)."
} >&2
exit 2
