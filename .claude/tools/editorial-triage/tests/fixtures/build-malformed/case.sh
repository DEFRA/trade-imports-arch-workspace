#!/usr/bin/env bash
# A build that fails part way must say so and must not replace the files of an
# earlier good build. The claim-diff review builds once; a second build into
# the same workarea reads a review whose first finding is a bare string, which
# the normalise step cannot read. The build exits 2 naming the step, and the
# earlier findings, triage and manifest files are still there, unchanged.
set -u

OUT="$WORK/out"
page_hash() { openssl dgst -sha256 "$1" | awk '{print $NF}'; }
sed "s|@@WORK@@|$WORK|g; s|@@HASH_CLAIMS@@|$(page_hash "$WORK/pages/12-claims.md")|" "$WORK/review.template.json" > "$WORK/review.json"

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
