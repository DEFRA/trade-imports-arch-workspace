#!/usr/bin/env bash
# check-names.sh - the preferred-names check: flag every name a document
# set's register replaces, and with --fix rename it in place. Deterministic:
# the register's patterns decide, no judgement.
#
# Usage: check-names.sh --names <preferred-names.json> [--fix] <page.md>...
#
# The register lives beside the pages it governs:
#   {"names": [{"preferred": "session assertion", "plural": "session assertions",
#               "replaced": ["\\bsnapshot(s?)\\b"]}]}
# Patterns are Oniguruma regular expressions (jq's), matched case-insensitively.
# Fenced code, inline code and HTML comment lines are skipped: a name there is
# an exemplar or build metadata. --fix keeps the found name's capitals ("Sealed
# Value" becomes "Sealed Cookie Value") and its plural, and reports every
# heading it renames, because a renamed heading changes the heading's anchor.
#
# Prints one line per hit: check-names: <page>:<line>: "<found>" -> "<preferred>".
# Exit: 0 no hit (or every hit fixed), 1 hits found, 2 usage or a bad register.

set -uo pipefail
NAMES="" FIX=0
PAGES=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --names) NAMES="${2:?--names needs a path}"; shift 2 ;;
    --fix) FIX=1; shift ;;
    -h|--help) sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) echo "check-names: unknown flag $1 (see --help)" >&2; exit 2 ;;
    *) PAGES+=("$1"); shift ;;
  esac
done
NAMES="${NAMES/#\~/$HOME}"
[[ -f "$NAMES" ]] || { SHOWN="${NAMES:-<none>}"; echo "check-names: no register at ${SHOWN/#$HOME/~}; give --names <preferred-names.json>" >&2; exit 2; }
jq -e '(.names | type) == "array" and all(.names[]; (.preferred | type) == "string" and (.replaced | type) == "array")' "$NAMES" > /dev/null 2>&1 \
  || { echo "check-names: ${NAMES/#$HOME/~} is not a register: it needs names[], each with preferred and replaced[]" >&2; exit 2; }
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
if [[ $FIX -eq 1 ]]; then echo "check-names: renamed $HITS names across ${#PAGES[@]} page$([[ ${#PAGES[@]} -eq 1 ]] || echo s); review the diff"; exit 0; fi
echo "check-names: $HITS replaced names across ${#PAGES[@]} page$([[ ${#PAGES[@]} -eq 1 ]] || echo s); rename them, or run with --fix"
exit 1
