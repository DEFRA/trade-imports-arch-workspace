#!/usr/bin/env bash
# A version 3 review over two pages. The build nominates every rewrite and
# deletion for claim verification and holds it, passes a layout-only split
# to fix, holds an unsupported introduction, sends a presentation finding to
# the author with its inventory, discards a rewrite with no provenance and an
# inventory that misquotes the page, and marks every record on a page whose
# hash moved on as stale. A result without sourceHashes does not build.
set -u

OUT="$WORK/out"
page_hash() { openssl dgst -sha256 "$1" | awk '{print $NF}'; }
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
