#!/usr/bin/env bash
# read-profile.sh - read a document set's editorial profile into JSON, so
# every editorial script takes the set's settings from one parser.
#
# Usage: read-profile.sh <editorial-profile.md>
#
# The profile is a markdown file beside the pages it governs, written for
# people to read and edit. Every section is optional:
#
#   ## Reader                one or more paragraphs: the reader frame
#   ## Defaults              table | Setting | Value |: Mode (review|revise),
#                            Intent (clarify|distil), Document mode
#   ## Context Pages         list of links or paths, relative to the profile
#   ## Run Notes             list of notes every reviewer receives
#   ## Preferred Names       table | Preferred | Plural | Replaced |: each
#                            replaced form in backticks; a trailing * matches
#                            any ending. A replaced form inside the preferred
#                            name ("cookie value" in "sealed cookie value") is
#                            never flagged.
#   ## Words to avoid or examine
#                            the same table as language.md; check-prose.sh
#                            reads it, this script does not
#
# Prints {profile, dir, reader, defaults, contextPages, runNotes, names}, where
# each name carries preferred, plural, forms and the Oniguruma patterns
# (replaced) that check-names.sh matches case-insensitively.
# Exit: 0 read, 2 usage or a profile the rules above refuse.

set -uo pipefail

[[ "${1:-}" == "-h" || "${1:-}" == "--help" ]] && { awk 'NR == 1 { next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "$0"; exit 0; }
PROFILE="${1:-}"
PROFILE="${PROFILE/#\~/$HOME}"
SHOWN="${PROFILE/#$HOME/~}"
[[ -f "$PROFILE" ]] || { echo "read-profile: no profile at ${SHOWN:-<none>}; give the path to editorial-profile.md" >&2; exit 2; }
DIR=$(cd "$(dirname "$PROFILE")" && pwd)

# One tab-separated record per item: kind, then its fields.
RECORDS=$(awk -F'|' '
  function trim(s) { gsub(/^[ \t]+|[ \t]+$/, "", s); return s }
  function ticks(s,   out, t) {
    out = ""
    while (match(s, /`[^`]+`/)) { t = substr(s, RSTART + 1, RLENGTH - 2); s = substr(s, RSTART + RLENGTH); out = out (out == "" ? "" : "\037") t }
    return out
  }
  /^```/ { fence = !fence; next }
  fence { next }
  /^## / { sec = tolower(trim(substr($0, 4))); item = 0; next }
  /^# / { sec = ""; next }
  sec == "reader" && trim($0) != "" { print "READER\t" trim($0); next }
  sec == "defaults" && /^\|/ {
    k = tolower(trim($2)); v = trim($3)
    if (k == "setting" || k ~ /^-+$/ || k == "") next
    print "DEFAULT\t" k "\t" v; next
  }
  (sec == "context pages" || sec == "run notes") && /^[ \t]*[-*] / {
    t = $0; sub(/^[ \t]*[-*] /, "", t)
    print (sec == "run notes" ? "NOTE\t" : "CONTEXT\t") trim(t); next
  }
  sec == "run notes" && /^[ \t]+[^ \t]/ { print "NOTEMORE\t" trim($0); next }
  sec == "preferred names" && /^\|/ {
    p = trim($2); if (tolower(p) == "preferred" || p ~ /^-+$/ || p == "") next
    print "NAME\t" p "\t" trim($3) "\t" ticks($4); next
  }
' "$PROFILE")

OUT=$(printf '%s\n' "$RECORDS" | jq -R -s --arg profile "$SHOWN" --arg dir "$DIR" '
  def body: if endswith("*") then .[:-1] + "[A-Za-z0-9-]*" else . end | gsub(" "; "\\s+");
  # A form found inside the preferred name or its plural is guarded on both
  # sides by the rest of that name, so the preferred name itself never matches.
  def guarded($names):
    . as $f
    | if endswith("*") then "\\b" + body + "\\b"
      else ([$names[] | ascii_downcase | select(contains($f | ascii_downcase) and . != ($f | ascii_downcase))
             | index($f | ascii_downcase) as $i | {before: .[:$i], after: .[$i + ($f | length):]}]) as $g
      | ([$g[] | select(.before != "") | "(?<!" + .before + ")"] | unique | join(""))
        + "\\b" + body + "\\b"
        + ([$g[] | select(.after != "") | "(?!" + .after + ")"] | unique | join(""))
      end;
  [split("\n")[] | select(length > 0) | split("\t")] as $r
  | {
      profile: $profile,
      dir: $dir,
      reader: ([$r[] | select(.[0] == "READER") | .[1]] | join(" ")),
      defaults: ([$r[] | select(.[0] == "DEFAULT") | {key: (.[1] | gsub(" (?<c>[a-z])"; .c | ascii_upcase)), value: .[2]}] | from_entries),
      contextPages: [$r[] | select(.[0] == "CONTEXT") | .[1]
        | (capture("\\]\\((?<p>[^)]+)\\)").p // capture("`(?<p>[^`]+)`").p // .)
        | if startswith("/") then . else $dir + "/" + . end],
      runNotes: (reduce ($r[] | select(.[0] == "NOTE" or .[0] == "NOTEMORE")) as $x ([];
        if $x[0] == "NOTE" then . + [$x[1]] else .[:-1] + [(.[-1] // "") + " " + $x[1]] end)),
      names: [$r[] | select(.[0] == "NAME")
        | {preferred: .[1], plural: (if .[2] == "" then .[1] + "s" else .[2] end), forms: ((.[3] // "") | split("\u001f") | map(select(length > 0)))}
        | . as $n | .replaced = [$n.forms[] | guarded([$n.preferred, $n.plural])]]
    }')

# Refusals: the rules the header states.
ERR=$(jq -r '
  (.defaults.mode // "review" | select(test("^(review|revise)$") | not) | "Defaults: Mode is review or revise, not \(.)"),
  (.defaults.intent // "clarify" | select(test("^(clarify|distil)$") | not) | "Defaults: Intent is clarify or distil, not \(.)"),
  (.names[] | select(.forms | length == 0) | "Preferred Names: \(.preferred) has no replaced form in backticks"),
  (.names[] | .preferred, .plural | select(test("^[A-Za-z0-9][A-Za-z0-9 '"'"'-]*$") | not) | "Preferred Names: \"\(.)\" may hold only letters, digits, spaces, hyphens and apostrophes"),
  (.names[].forms[] | select(test("^[A-Za-z0-9][A-Za-z0-9 '"'"'-]*\\*?$") | not) | "Preferred Names: form \"\(.)\" may hold only letters, digits, spaces, hyphens, apostrophes and a trailing *")
' <<< "$OUT")
for p in $(jq -r '.contextPages[] | @base64' <<< "$OUT"); do
  f=$(printf '%s' "$p" | base64 -d)
  [[ -f "$f" ]] || ERR="${ERR:+$ERR
}Context Pages: no page at ${f/#$HOME/~}"
done
if [[ -n "$ERR" ]]; then
  while IFS= read -r line; do echo "read-profile: $SHOWN: $line" >&2; done <<< "$ERR"
  exit 2
fi

printf '%s\n' "$OUT"
