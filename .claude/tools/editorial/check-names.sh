#!/usr/bin/env bash
# check-names.sh - the preferred-names check: flag every name a document
# set's profile replaces, and with --fix rename it in place. Deterministic:
# the profile's Preferred Names table decides, no judgement.
#
# Usage: check-names.sh --profile <editorial-profile.md> [--fix] <page.md>...
#
# The profile lives beside the pages it governs; read-profile.sh describes
# its Preferred Names table:
#   | Preferred | Plural | Replaced |
#   | session assertion | session assertions | `snapshot`, `snapshots` |
# Matching ignores case. A replaced form inside the preferred name ("cookie
# value" in "sealed cookie value") is never flagged.
# Fenced code, inline code and HTML comment lines are skipped: a name there is
# an exemplar or build metadata. --fix keeps the found name's capitals ("Sealed
# Value" becomes "Sealed Cookie Value") and its plural, and reports every
# heading it renames, because a renamed heading changes the heading's anchor.
#
# Prints one line per hit: check-names: <page>:<line>: "<found>" -> "<preferred>".
# Exit: 0 no hit (or every hit fixed), 1 hits found, 2 usage or a bad profile.

set -uo pipefail
PROFILE="" FIX=0
PAGES=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile) PROFILE="${2:?--profile needs a path}"; shift 2 ;;
    --fix) FIX=1; shift ;;
    -h|--help) awk 'NR == 1 { next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "$0"; exit 0 ;;
    -*) echo "check-names: unknown flag $1 (see --help)" >&2; exit 2 ;;
    *) PAGES+=("$1"); shift ;;
  esac
done
[[ -n "$PROFILE" ]] || { echo "check-names: give --profile <editorial-profile.md>" >&2; exit 2; }
REG=$(bash "$HOME/trade-imports-arch-workspace/.claude/tools/editorial/read-profile.sh" "$PROFILE") || exit 2
jq -e '.names | length > 0' <<< "$REG" > /dev/null \
  || { P="${PROFILE/#\~/$HOME}"; echo "check-names: ${P/#$HOME/~} has no Preferred Names table" >&2; exit 2; }
NAMES=$(mktemp "${TMPDIR:-/tmp}/check-names.XXXXXX") || exit 2
trap 'rm -f "$NAMES"' EXIT
printf '%s\n' "$REG" > "$NAMES"
[[ ${#PAGES[@]} -ge 1 ]] || { echo "check-names: give the pages to check" >&2; exit 2; }

# Shared jq: which lines are prose, how a name is recased, and how a line is renamed outside code.
LIB='
def prose_flags: [foreach .[] as $l ({fence: false};
    if ($l | test("^\\s*(```|~~~)")) then {fence: (.fence | not), skip: true}
    else {fence: .fence, skip: (.fence or ($l | test("^\\s*<!--")))} end; .skip | not)];
def cap: (.[0:1] | ascii_upcase) + .[1:];
def recase($found; $pref):
  if ($found | test("^[^a-z]*[A-Z][^a-z]*$")) then $pref | ascii_upcase
  elif ($found | split(" ") | length > 1 and all(.[]; test("^[A-Z]"))) then $pref | split(" ") | map(cap) | join(" ")
  elif ($found | test("^[A-Z]")) then $pref | cap
  else $pref end;
def form($n; $found): if ($found | test("s$"; "i")) then ($n.plural // ($n.preferred + "s")) else $n.preferred end;
def rename_outside_code($names):
  split("`") | to_entries | map(if .key % 2 == 1 then .value
    else reduce $names[] as $n (.value; reduce $n.replaced[] as $p (.; gsub("(?<m>" + $p + ")"; recase(.m; form($n; .m)); "i"))) end)
  | join("`");
'

HITS=0
HIT_PAGES=0
for page in "${PAGES[@]}"; do
  f="${page/#\~/$HOME}"
  [[ -f "$f" ]] || { echo "check-names: no page at $page" >&2; exit 2; }
  name=$(basename "$f")
  OUT=$(jq -R -s -r --slurpfile reg "$NAMES" --arg page "$name" "$LIB"'
    split("\n") as $lines | ($lines | prose_flags) as $ok | $reg[0].names as $names
    | range(0; $lines | length) as $i | select($ok[$i])
    | ($lines[$i] | split("`") | to_entries | map(select(.key % 2 == 0) | .value) | join(" ")) as $text
    | $names[] as $n | $n.replaced[] as $p
    | ($text | [match("(?<m>" + $p + ")"; "gi") | .captures[0].string])[]
    | "check-names: \($page):\($i + 1): \"\(.)\" -> \"\(recase(.; form($n; .)))\""' "$f")
  [[ -z "$OUT" ]] && continue
  n=$(printf '%s\n' "$OUT" | wc -l | tr -d ' ')
  HITS=$((HITS + n))
  HIT_PAGES=$((HIT_PAGES + 1))
  printf '%s\n' "$OUT"
  if [[ $FIX -eq 1 ]]; then
    jq -R -s -j --slurpfile reg "$NAMES" "$LIB"'
      split("\n") as $lines | ($lines | prose_flags) as $ok | $reg[0].names as $names
      | [range(0; $lines | length) as $i | if $ok[$i] then ($lines[$i] | rename_outside_code($names)) else $lines[$i] end]
      | join("\n")' "$f" > "$f.names-tmp" && mv "$f.names-tmp" "$f"
    printf '%s\n' "$OUT" | grep -E ':[0-9]+: ' | while IFS= read -r l; do
      ln=$(printf '%s' "$l" | sed -E 's/^check-names: [^:]+:([0-9]+):.*/\1/')
      sed -n "${ln}p" "$f" | grep -qE '^#{1,6} ' && echo "check-names: $name:$ln: heading renamed; links to its old anchor need the new one"
    done
  fi
done

if [[ $HITS -eq 0 ]]; then echo "check-names: ${#PAGES[@]} page$([[ ${#PAGES[@]} -eq 1 ]] || echo s), no replaced name"; exit 0; fi
if [[ $FIX -eq 1 ]]; then echo "check-names: renamed $HITS names across $HIT_PAGES of ${#PAGES[@]} page$([[ ${#PAGES[@]} -eq 1 ]] || echo s); review the diff"; exit 0; fi
echo "check-names: $HITS replaced names across $HIT_PAGES of ${#PAGES[@]} page$([[ ${#PAGES[@]} -eq 1 ]] || echo s); rename them, or run with --fix"
exit 1
