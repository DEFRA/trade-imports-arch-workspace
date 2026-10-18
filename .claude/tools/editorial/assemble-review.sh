#!/usr/bin/env bash
# assemble-review.sh - build the version 3 review result the triage reads from
# review files written outside the review workflow (forked passes write JSON
# files, and nothing checks them against a schema): drill-*.json, structural-*.json
# and editor-*.json in one directory. Validates every finding's required fields
# and values against the workflow's schema first and refuses, naming each
# failing record, before anything is written.
#
# Usage: assemble-review.sh --dir <review files dir> --mode <review|revise>
#          --intent <distil|clarify> --out <result.json> <doc.md>...
#
# drill-<key>.json   {"unit": "<page filename>", "findings": [...], "retains": [...]}
# structural-*.json  {"findings": [...], "redundancies": [{fact, home, occurrences}]}
# editor-*.json      {"pages": [...], "order": [...], "patterns": [...]}
# The docs are hashed now, so the result must be assembled before any page is
# edited. Exit: 0 written, 1 usage or missing input, 2 invalid findings.

set -uo pipefail
C="$HOME/trade-imports-arch-workspace/.claude"
DIR="" MODE="" INTENT="" OUT=""
DOCS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir) DIR="${2:?}"; shift 2 ;;
    --mode) MODE="${2:?}"; shift 2 ;;
    --intent) INTENT="${2:?}"; shift 2 ;;
    --out) OUT="${2:?}"; shift 2 ;;
    -h|--help) sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) echo "assemble-review: unknown flag $1 (see --help)" >&2; exit 1 ;;
    *) DOCS+=("$1"); shift ;;
  esac
done
DIR="${DIR/#\~/$HOME}"; OUT="${OUT/#\~/$HOME}"
[[ -d "$DIR" ]] || { echo "assemble-review: no review directory at ${DIR:-<none>}; give --dir" >&2; exit 1; }
[[ "$MODE" == review || "$MODE" == revise ]] || { echo "assemble-review: --mode must be review or revise" >&2; exit 1; }
[[ "$INTENT" == distil || "$INTENT" == clarify ]] || { echo "assemble-review: --intent must be distil or clarify" >&2; exit 1; }
[[ -n "$OUT" ]] || { echo "assemble-review: give --out <result.json>" >&2; exit 1; }
[[ ${#DOCS[@]} -ge 1 ]] || { echo "assemble-review: give the documents under review" >&2; exit 1; }
shopt -s nullglob
FILES=("$DIR"/drill-*.json "$DIR"/structural-*.json "$DIR"/editor-*.json)
[[ ${#FILES[@]} -ge 1 ]] || { echo "assemble-review: no drill-, structural- or editor- files in ${DIR/#$HOME/~}" >&2; exit 1; }
for f in "${FILES[@]}"; do
  jq -e . "$f" > /dev/null 2>&1 || { echo "assemble-review: $(basename "$f") is not valid JSON; re-run that pass" >&2; exit 1; }
done

HASHES=$(bash "$C/tools/editorial-triage/build-triage.sh" --hash-pages "${DOCS[@]/#\~/$HOME}") || { echo "assemble-review: hashing the documents failed" >&2; exit 1; }
PATHS=$(for d in "${DOCS[@]}"; do p="${d/#$HOME/~}"; printf '%s\t%s\n' "$(basename "$d")" "$p"; done | jq -R -s 'split("\n") | map(select(. != "") | split("\t") | {(.[0]): .[1]}) | add')

ALL=$(for f in "${FILES[@]}"; do jq -c --arg k "$(basename "$f" | sed 's/-.*//')" --arg f "$(basename "$f")" '{kind: $k, file: $f, d: .}' "$f"; done | jq -s -c .)

# Every finding, wherever it sits, with where it came from.
BAD=$(jq -r --argjson pages "$HASHES" '
  def findings: if .kind == "drill" then (.d.findings // [])[]
                elif .kind == "structural" then ((.d.findings // [])[], ((.d.redundancies // [])[] | (.occurrences // [])[]))
                else (((.d.pages // [])[] | (.findings // [])[]), (.d.order // [])[], ((.d.patterns // [])[] | .finding)) end;
  def problems: [
    (["page","quote","kind","severity","defect","point","bearing","removes","action","basis","guess"][] as $k | select(has($k) | not) | "missing \($k)"),
    (select((.kind // "") | IN("fact","citation","contradiction","absolute","omission","ambiguity","term","reference","repetition","compression","flow","residue","presentation") | not) | "kind \(.kind)"),
    (select((.severity // "") | IN("S1","S2","S3","S4","S5") | not) | "severity \(.severity)"),
    (select((.bearing // "") | IN("central","supporting","tangential") | not) | "bearing \(.bearing)"),
    (select((.action // "") | IN("delete","shorten","correct","reconcile","rewrite","rename","split","list","move","restructure","expand","point","qualify","own","ask") | not) | "action \(.action)"),
    (select((.basis // "") | IN("rule","source","set","inference","author") | not) | "basis \(.basis)"),
    (select((.guess | type) != "boolean") | "guess not boolean"),
    (select(has("status") and ((.status // "") | IN("broken","circular","unlocated") | not)) | "status \(.status)"),
    (select((.page // "") as $p | $pages | has($p) | not) | "page \(.page) not under review")];
  .[] | .file as $f | findings | select(. != null) | problems as $p | select($p | length > 0)
  | "\($f): \(.page // "?") line \(.line // "?") \"\((.quote // "")[0:40])\": \($p | join(", "))"' <<< "$ALL")
if [[ -n "$BAD" ]]; then
  echo "assemble-review: invalid findings, nothing written; fix or re-run those passes:" >&2
  printf '%s\n' "$BAD" | head -20 >&2
  exit 2
fi

UNITLESS=$(jq -r --argjson paths "$PATHS" '[.[] | select(.kind == "drill") | .d.unit // "" | select(. as $u | $paths | has($u) | not)] | join(" ")' <<< "$ALL")
[[ -z "$UNITLESS" ]] || { echo "assemble-review: drill files name units that are not documents under review: ${UNITLESS:-<empty unit>}" >&2; exit 2; }

mkdir -p "$(dirname "$OUT")"
jq -n --argjson all "$ALL" --argjson hashes "$HASHES" --argjson paths "$PATHS" --arg mode "$MODE" --arg intent "$INTENT" '
  {version: 3, mode: $mode, intent: $intent, sourceHashes: $hashes,
   units: [$all[] | select(.kind == "drill") | .d | {unit, path: $paths[.unit], findings: (.findings // []), retains: (.retains // [])}],
   structural: {findings: ([$all[] | select(.kind == "structural") | .d.findings // []] | add // []),
                redundancies: ([$all[] | select(.kind == "structural") | .d.redundancies // []] | add // []),
                pages: ([$all[] | select(.kind == "structural")] | length)},
   editorPass: {pages: ([$all[] | select(.kind == "editor") | .d.pages // []] | add // []),
                order: ([$all[] | select(.kind == "editor") | .d.order // []] | add // []),
                patterns: ([$all[] | select(.kind == "editor") | .d.patterns // []] | add // [])}}' > "$OUT.tmp" && mv "$OUT.tmp" "$OUT"
jq -r --arg o "${OUT/#$HOME/~}" '"assemble-review: \($o): \(.units | length) units, \([.units[].findings[]] | length) drill findings, \(.structural.findings | length) structural, \(.editorPass.pages | length) editor pages; \(.sourceHashes | length) pages hashed"' "$OUT"
