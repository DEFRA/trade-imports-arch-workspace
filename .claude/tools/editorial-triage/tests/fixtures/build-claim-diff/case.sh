#!/usr/bin/env bash
# The build, over the two pages of this fixture, in four sections.
#
# hash-pages: --hash-pages prints the pages' SHA-256 keyed by filename and
# exits without a workarea. Cases: two pages, one through a path with a space;
# the tracked fixture page through its tilde path, as one shell word; no path;
# a missing path; a directory; an unreadable file; two paths sharing a
# filename. The work directory's entries are the same after every call. The
# section runs first, so no build has written a workarea yet.
#
# claim-diff: a version 3 review over two pages. The build nominates every
# rewrite and deletion for claim verification and holds it, passes a
# layout-only split to fix, holds an unsupported introduction, sends a
# presentation finding to the author with its inventory, discards a rewrite
# with no provenance and an inventory that misquotes the page, and marks every
# record on a page whose hash moved on as stale. A result without sourceHashes
# does not build.
#
# malformed: a build that fails part way must say so and must not replace the
# files of an earlier good build. A second build into the same workarea reads
# a review whose first finding is a bare string, which the normalise step
# cannot read. The build exits 2 naming the step, and the earlier findings,
# triage and manifest files are still there, unchanged.
#
# carriers: every finding carrier of a version 3 result (drill findings,
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
# action) then fail the same comparison, naming the record and the field. The
# section reads review-carriers.template.json and works in carriers/.
set -u

page_hash() { openssl dgst -sha256 "$1" | awk '{print $NF}'; }

# ================================================================ hash-pages
echo "##### hash-pages"
mkdir -p "$WORK/space dir"
cp "$WORK/pages/13-stale.md" "$WORK/space dir/13-stale.md"
BEFORE=$(ls -1A "$WORK" | sort)

run() {  # $1 label, then the paths
  echo "--- $1 ---"; shift
  bash "$HELPER_DIR/build-triage.sh" --hash-pages "$@"
  echo "exit $?"
}

run "two pages, one through a path with a space" "$WORK/pages/12-claims.md" "$WORK/space dir/13-stale.md"
echo "expected 12-claims.md $(page_hash "$WORK/pages/12-claims.md")"
echo "expected 13-stale.md $(page_hash "$WORK/space dir/13-stale.md")"

run "the tracked fixture page through its tilde path" '~/trade-imports-arch-workspace/.claude/tools/editorial-triage/tests/fixtures/build-claim-diff/pages/12-claims.md'
echo "expected 12-claims.md $(page_hash "$HELPER_DIR/tests/fixtures/build-claim-diff/pages/12-claims.md")"

run "no path"
run "a missing path" "$WORK/pages/nope.md"
run "a directory" "$WORK/pages"

cp "$WORK/pages/12-claims.md" "$WORK/unreadable.md"
chmod 000 "$WORK/unreadable.md"
run "an unreadable file" "$WORK/unreadable.md"
chmod 644 "$WORK/unreadable.md"
rm -f "$WORK/unreadable.md"

run "two paths sharing a filename" "$WORK/pages/13-stale.md" "$WORK/space dir/13-stale.md"

echo "--- work directory ---"
echo "out present: $([[ -e "$WORK/out" ]] && echo yes || echo no)"
AFTER=$(ls -1A "$WORK" | sort)
if [[ "$BEFORE" == "$AFTER" ]]; then echo "entries unchanged"; else echo "ENTRIES CHANGED"; diff <(printf '%s\n' "$BEFORE") <(printf '%s\n' "$AFTER"); fi

# ================================================================ claim-diff
echo "##### claim-diff"
OUT="$WORK/out"
sed "s|@@WORK@@|$WORK|g; s|@@HASH_CLAIMS@@|$(page_hash "$WORK/pages/12-claims.md")|" "$WORK/review.template.json" > "$WORK/review.json"

bash "$HELPER_DIR/build-triage.sh" --from-run "$WORK/review.json" --dir "$OUT" --commit testcommit

echo "--- run fields ---"
jq -r '"mode \(.mode), intent \(.intent), builder \(.builder)", "sourceHashes \(.sourceHashes | keys | join(", "))", "manifest keys \(keys | join(", "))"' "$OUT/manifest.json"

echo "--- retains ---"
jq -r '.retains[] | "\(.page) L\(.line) \(.reviewer): \(.quote)"' "$OUT/retains.json"

echo "--- records ---"
jq -r '.records[] | "\(.id) \(.kind)/\(.action) applicable=\(.applicable) gate=\(.gate) layoutOnly=\(.layoutOnly) claimShift=\(.claimShift) introducedCheck=\(.introducedCheck) checks=\(.checks | join(","))"' "$OUT/findings.json"

echo "--- nominations ---"
jq -r '.records[] | select(.claimDiff != null) | "\(.id) nominated=\(.claimDiff.nominated) added=\(.claimDiff.added | map(.class + ":" + .term) | join(" ")) removed=\(.claimDiff.removed | map(.class + ":" + .term) | join(" ")) missing=\(.claimDiff.missingSentence | length)"' "$OUT/findings.json"

echo "--- hashes ---"
jq -r '.records[] | "\(.id) sourceHash=\(.sourceHash[0:8]) candidateHash=\(if .candidateHash == null then "null" else .candidateHash[0:8] end)"' "$OUT/findings.json"

echo "--- clusters ---"
jq -r '.clusters[] | "\(.id) \(.bucket)/\(.reason) intent=\(.intent) claimShift=\(.claimShift) layoutOnly=\(.layoutOnly) introducedCheck=\(.introducedCheck) needs=\(.needs) members=\(.members | join(","))"' "$OUT/triage.json"

echo "--- summary ---"
jq -c '.summary | {byBucket, byReason, claims, stale}' "$OUT/triage.json"

echo "--- a result without sourceHashes does not build ---"
jq 'del(.sourceHashes)' "$WORK/review.json" > "$WORK/review-nohash.json"
bash "$HELPER_DIR/build-triage.sh" --from-run "$WORK/review-nohash.json" --dir "$WORK/out2" --commit testcommit
echo "exit $?"

echo "--- a finding without its kind does not build ---"
jq 'del(.units[0].findings[1].kind)' "$WORK/review.json" > "$WORK/review-nokind.json"
bash "$HELPER_DIR/build-triage.sh" --from-run "$WORK/review-nokind.json" --dir "$WORK/out3" --commit testcommit
echo "exit $?"

echo "--- the same review as a findings directory ---"
mkdir -p "$WORK/dir/review"
jq '{mode, intent, sourceHashes}' "$WORK/review.json" > "$WORK/dir/review/run.json"
jq '.units[0] | {reviewer: ("drill:" + (.path | split("/") | last)), page: (.path | split("/") | last), path, items: .findings, retains}' "$WORK/review.json" > "$WORK/dir/review/12-claims.md.json"
jq '.units[1] | {reviewer: ("drill:" + (.path | split("/") | last)), page: (.path | split("/") | last), path, items: .findings}' "$WORK/review.json" > "$WORK/dir/review/13-stale.md.json"
bash "$HELPER_DIR/build-triage.sh" --from-review "$WORK/dir" --dir "$WORK/out4" --commit testcommit | grep -E 'records|claims|buckets|wrote'
jq -r '"mode \(.mode), intent \(.intent), source \(.source.kind)"' "$WORK/out4/manifest.json"
jq -r '"retains \(.retains | length)"' "$WORK/out4/retains.json"

echo "--- the same directory under a path with a space ---"
mkdir -p "$WORK/review dir"
cp -R "$WORK/dir/review" "$WORK/review dir/"
bash "$HELPER_DIR/build-triage.sh" --from-review "$WORK/review dir" --dir "$WORK/out 5" --commit testcommit > "$WORK/out5.log" 2>&1
echo "exit $?"
grep -c -E 'jq: error|Could not open' "$WORK/out5.log" || true
grep -E 'records|wrote' "$WORK/out5.log"

echo "--- layout-only rejects a nesting change and a lost word boundary ---"
jq -n -L "$HELPER_DIR/lib" -c 'include "claim-elements";
  { paragraphBreak: layout_only("A one. B two."; "A one.\n\nB two."),
    listConversion: layout_only("A one. B two."; "- A one.\n- B two."),
    nestedMadeFlat: layout_only("- A one.\n  - B two."; "- A one.\n- B two."),
    flatMadeNested: layout_only("- A one.\n- B two."; "- A one.\n  - B two."),
    wordsJoined: layout_only("holds no key."; "holds nokey."),
    stopDropped: layout_only("A one. B two."; "A one.\n\nB two") }'

# ================================================================ malformed
echo "##### malformed"
bash "$HELPER_DIR/build-triage.sh" --from-run "$WORK/review.json" --dir "$OUT" --commit testcommit > /dev/null
echo "good build exit $?"
before=$(cat "$OUT/findings.json" "$OUT/triage.json" "$OUT/manifest.json" | openssl dgst -sha256 | awk '{print $NF}')

jq '.units[0].findings[0] = "not a finding"' "$WORK/review.json" > "$WORK/review-malformed.json"
bash "$HELPER_DIR/build-triage.sh" --from-run "$WORK/review-malformed.json" --dir "$OUT" --commit testcommit 2>&1 \
  | grep -v '^jq: error'
echo "malformed build exit ${PIPESTATUS[0]}"

after=$(cat "$OUT/findings.json" "$OUT/triage.json" "$OUT/manifest.json" | openssl dgst -sha256 | awk '{print $NF}')
echo "earlier files unchanged: $([[ "$before" == "$after" ]] && echo yes || echo no)"
echo "records in findings.json: $(jq '.records | length' "$OUT/findings.json")"
leftovers=$(find "$OUT" -name '*.tmp.*' | wc -l | tr -d ' ')
echo "temp files left: $leftovers"

# ================================================================ carriers
echo "##### carriers"
C="$WORK/carriers"
mkdir -p "$C"
sed "s|@@WORK@@|$WORK|g; s|@@HASH_CLAIMS@@|$(page_hash "$WORK/pages/12-claims.md")|; s|@@HASH_STALE@@|$(page_hash "$WORK/pages/13-stale.md")|" "$WORK/review-carriers.template.json" > "$C/review.json"

bash "$HELPER_DIR/build-triage.sh" --from-run "$C/review.json" --dir "$C/out" --commit testcommit | grep -E 'records|wrote'

echo "--- records ---"
jq -c '.records[] | {id, reviewer, page, line, quote, kind, before, after, related, inventory, introduced, changes, fact, pattern}' "$C/out/findings.json"
echo "--- retains ---"
jq -c '.retains[] | {page, line, quote, reason, reviewer}' "$C/out/retains.json"

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

jq '{result: .}' "$C/review.json" > "$C/record.json"
project "$C/record.json" > "$C/expected.json"
jq -c '.records | map({page, quote, kind, before, after, related, inventory, introduced, changes}) | sort_by(.page, .quote, .kind, tojson)' "$C/out/findings.json" > "$C/actual.json"
echo "--- preservation ---"
echo "records expected $(jq 'length' "$C/expected.json"), built $(jq 'length' "$C/actual.json")"
compare "preserved" "$C/expected.json" "$C/actual.json"
project_retains "$C/record.json" > "$C/expected-retains.json"
jq -c '.retains | map({page, line, quote, reason}) | sort_by(.page, .quote)' "$C/out/retains.json" > "$C/actual-retains.json"
echo "retains expected $(jq 'length' "$C/expected-retains.json"), built $(jq 'length' "$C/actual-retains.json")"
compare "retains preserved" "$C/expected-retains.json" "$C/actual-retains.json"

echo "--- the comparison detects a changed replacement ---"
jq '.result.units[0].findings[0].after = "Every consumer holds the current key version, refreshed hourly."' "$C/record.json" > "$C/record-after.json"
project "$C/record-after.json" > "$C/expected-after.json"
compare "preserved" "$C/expected-after.json" "$C/actual.json"

echo "--- the comparison detects a changed inventory action ---"
jq '.result.structural.findings[0].inventory.steps[0].action = "discards the state value"' "$C/record.json" > "$C/record-inventory.json"
project "$C/record-inventory.json" > "$C/expected-inventory.json"
compare "preserved" "$C/expected-inventory.json" "$C/actual.json"
