#!/usr/bin/env bash
# build-carriers: every finding carrier of a version 3 result (drill findings,
# structural findings, redundancy occurrences, editor page findings, order,
# patterns) and both retain carriers reach findings.json and retains.json
# with their reviewer-set content intact: replacement text, related anchors,
# inventory, introductions, changes, retain reasons. The comparison is the
# projection the S05 live run uses, written without the production
# normaliser: the expected side applies the three transport normalisations
# itself (related anchors reduced to {page, line, quote} and made unique, an
# unknown page mapped to set, quote line breaks flattened). The redundancy
# occurrence already names its home in related, so the appended home is a
# duplicate the normaliser removes, and the projection passes on that input.
# Two mutated copies of the result (a changed replacement, a changed inventory
# action) then fail the same comparison, naming the record and the field.
set -u

OUT="$WORK/out"
page_hash() { openssl dgst -sha256 "$1" | awk '{print $NF}'; }
sed "s|@@WORK@@|$WORK|g; s|@@HASH_CLAIMS@@|$(page_hash "$WORK/pages/12-claims.md")|; s|@@HASH_STALE@@|$(page_hash "$WORK/pages/13-stale.md")|" "$WORK/review.template.json" > "$WORK/review.json"

bash "$HELPER_DIR/build-triage.sh" --from-run "$WORK/review.json" --dir "$OUT" --commit testcommit | grep -E 'records|wrote'

echo "--- records ---"
jq -c '.records[] | {id, reviewer, page, line, quote, kind, before, after, related, inventory, introduced, changes, fact, pattern}' "$OUT/findings.json"
echo "--- retains ---"
jq -c '.retains[] | {page, line, quote, reason, reviewer}' "$OUT/retains.json"

# The live run's projection reads a run record ({result: ...}); the review
# result is wrapped the same way so the jq text is the same.
project() {  # $1 a run record
  jq -c --argjson pages "$(jq -c '.result.sourceHashes | keys' "$1")" '
    def anchor: {page: .page, line: (.line // null), quote: (.quote // null)};
    def norm: . as $r
              | .related = (($r.related // []) | map(select(type == "object")) | map(anchor) | unique)
              | .page = (if ($pages | any(. == $r.page)) then $r.page else "set" end)
              | .quote = (($r.quote // "") | gsub("[\n\r]+"; " "));
    ([.result.units[] as $u | $u.findings[] | .page = ($u.path | split("/") | last)]
     + [.result.structural.findings[]]
     + [.result.structural.redundancies[] as $r | $r.occurrences[] | .related = ((.related // []) + [$r.home])]
     + [.result.editorPass.pages[] as $p | $p.findings[] | .page = (.page // $p.page)]
     + [.result.editorPass.order[]]
     + [.result.editorPass.patterns[] as $pt | $pt.finding | .related = ((.related // []) + ($pt.instances // []))])
    | map(norm | {page, quote, kind, before, after, related, inventory, introduced, changes})
    | sort_by(.page, .quote, .kind, tojson)' "$1"
}
project_retains() {  # $1 a run record
  jq -c '[.result.units[] as $u | $u.retains[] | {page: ($u.path | split("/") | last), line: (.line // null), quote, reason}]
         + [.result.editorPass.pages[] as $p | $p.retains[] | {page: $p.page, line: (.line // null), quote, reason}]
         | sort_by(.page, .quote)' "$1"
}
compare() {  # $1 label, $2 expected file, $3 actual file
  local diffs
  diffs=$(jq -n -c --slurpfile e "$2" --slurpfile a "$3" '
    [range(0; ([($e[0] | length), ($a[0] | length)] | max))]
    | map(. as $i | ($e[0][$i] // {}) as $x | ($a[0][$i] // {}) as $y
          | select($x != $y)
          | {quote: ($x.quote // $y.quote), fields: [($x + $y) | keys[] | select($x[.] != $y[.])]})')
  if [[ "$diffs" == "[]" ]]; then echo "$1: true"; else echo "$1: false $diffs"; fi
}

jq '{result: .}' "$WORK/review.json" > "$WORK/record.json"
project "$WORK/record.json" > "$WORK/expected.json"
jq -c '.records | map({page, quote, kind, before, after, related, inventory, introduced, changes}) | sort_by(.page, .quote, .kind, tojson)' "$OUT/findings.json" > "$WORK/actual.json"
echo "--- preservation ---"
echo "records expected $(jq 'length' "$WORK/expected.json"), built $(jq 'length' "$WORK/actual.json")"
compare "preserved" "$WORK/expected.json" "$WORK/actual.json"
project_retains "$WORK/record.json" > "$WORK/expected-retains.json"
jq -c '.retains | map({page, line, quote, reason}) | sort_by(.page, .quote)' "$OUT/retains.json" > "$WORK/actual-retains.json"
echo "retains expected $(jq 'length' "$WORK/expected-retains.json"), built $(jq 'length' "$WORK/actual-retains.json")"
compare "retains preserved" "$WORK/expected-retains.json" "$WORK/actual-retains.json"

echo "--- the comparison detects a changed replacement ---"
jq '.result.units[0].findings[0].after = "Every consumer holds the current key version, refreshed hourly."' "$WORK/record.json" > "$WORK/record-after.json"
project "$WORK/record-after.json" > "$WORK/expected-after.json"
compare "preserved" "$WORK/expected-after.json" "$WORK/actual.json"

echo "--- the comparison detects a changed inventory action ---"
jq '.result.structural.findings[0].inventory.steps[0].action = "discards the state value"' "$WORK/record.json" > "$WORK/record-inventory.json"
project "$WORK/record-inventory.json" > "$WORK/expected-inventory.json"
compare "preserved" "$WORK/expected-inventory.json" "$WORK/actual.json"
