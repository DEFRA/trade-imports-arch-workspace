#!/usr/bin/env bash
# start-editorial-help.sh - the facts editorial-help needs before it
# recommends a tool: what the pages are, whether their document set has an
# editorial profile, whether the names and prose checks pass, and which
# earlier reviews and triages cover them. Reads only; changes nothing.
#
# Usage: start-editorial-help.sh [<page.md>...]
#
# With no pages, prints MODE: NO-PAGES and the profile-free facts only.
# With pages, prints MODE: PAGES, then one line per fact:
#   pages: <n>, words: <n>
#   page: <name> <words> words; prose FAIL lines <n>
#   profile: <path> | none
#   names: clean | <n> replaced names | no Preferred Names table | no profile
#   review: <run id> <date> <k> of <n> pages; result <yes|no>
#   triage: <workarea> <date> <k> of <n> pages; plan <yes|no>
# A page matches an earlier run by its full path, so runs on copies of the
# pages (experiments) do not count.
# Exit: 0 facts printed, 1 a named page does not exist.

set -uo pipefail
C="$HOME/trade-imports-arch-workspace/.claude"
[[ "${1:-}" == "-h" || "${1:-}" == "--help" ]] && { awk 'NR == 1 { next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "$0"; exit 0; }

PAGES=()
for p in "$@"; do
  f="${p/#\~/$HOME}"
  [[ -f "$f" ]] || { echo "start-editorial-help: no page at $p; give the markdown pages to work on, or none for general help" >&2; exit 1; }
  PAGES+=("$(cd "$(dirname "$f")" && pwd)/$(basename "$f")")
done

if [[ ${#PAGES[@]} -eq 0 ]]; then
  echo "MODE: NO-PAGES"
  exit 0
fi
echo "MODE: PAGES"

PATHS_JSON=$(printf '%s\n' "${PAGES[@]}" | jq -R . | jq -s .)
WORDS=0
for f in "${PAGES[@]}"; do
  w=$(wc -w < "$f" | tr -d ' ')
  WORDS=$((WORDS + w))
done
echo "pages: ${#PAGES[@]}, words: $WORDS"
for f in "${PAGES[@]}"; do
  fails=$(bash "$C/tools/editorial/check-prose.sh" --print-fail-lines "$f" 2>/dev/null | grep -c . || true)
  echo "page: $(basename "$f") $(wc -w < "$f" | tr -d ' ') words; prose FAIL lines $fails"
done

# The nearest profile above the first page, the same search check-prose.sh makes.
d=$(cd "$(dirname "${PAGES[0]}")" && pwd)
PROFILE=""
while :; do
  [[ -f "$d/editorial-profile.md" ]] && { PROFILE="$d/editorial-profile.md"; break; }
  [[ -e "$d/.git" || "$d" == / ]] && break
  d=$(dirname "$d")
done
if [[ -z "$PROFILE" ]]; then
  echo "profile: none"
  echo "names: no profile"
else
  echo "profile: ${PROFILE/#$HOME/~}"
  if ! PJ=$(bash "$C/tools/editorial/read-profile.sh" "$PROFILE" 2>&1); then
    echo "names: the profile does not read: $PJ"
  elif [[ $(jq '.names | length' <<< "$PJ") -eq 0 ]]; then
    echo "names: no Preferred Names table"
  else
    hits=$(bash "$C/tools/editorial/check-names.sh" --profile "$PROFILE" "${PAGES[@]}" 2>/dev/null | grep -c ':[0-9]*: ' || true)
    if [[ "$hits" -eq 0 ]]; then echo "names: clean"; else echo "names: $hits replaced names"; fi
  fi
fi

# Earlier layered reviews of these very files: each packet names the source
# path of every page it reviewed.
for run in "$C"/workareas/editorial/layered/*/; do
  [[ -f "$run/review-packet.md" ]] || continue
  k=$(grep -A1 '^===== Document ' "$run/review-packet.md" | grep -o '(source: [^;]*' | sed -e 's/^(source: //' -e "s|^~|$HOME|" \
      | jq -R . | jq -s --argjson want "$PATHS_JSON" '[.[] | select(. as $p | $want | index($p))] | length')
  [[ "$k" -gt 0 ]] || continue
  result=no; [[ -f "$run/review-result.json" ]] && result=yes
  echo "review: $(basename "$run") $(date -r "$run/review-packet.md" +%Y-%m-%d) $k of ${#PAGES[@]} pages; result $result"
done

# Earlier triages of these very files: each manifest names the path it read.
for wa in "$C"/workareas/editorial-triage/*/; do
  [[ -f "$wa/manifest.json" ]] || continue
  k=$(jq --argjson want "$PATHS_JSON" '[.pages[]? | select(.path as $p | $want | index($p))] | length' "$wa/manifest.json" 2>/dev/null || echo 0)
  [[ "$k" -gt 0 ]] || continue
  plan=no; [[ -f "$wa/closing/plan.json" ]] && plan=yes
  echo "triage: $(basename "$wa") $(date -r "$wa/manifest.json" +%Y-%m-%d) $k of ${#PAGES[@]} pages; plan $plan"
done
exit 0
