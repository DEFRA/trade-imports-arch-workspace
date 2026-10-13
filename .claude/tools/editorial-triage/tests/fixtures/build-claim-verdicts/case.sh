#!/usr/bin/env bash
# build-claim-verdicts: the build reads verification/claims-<page>.json and
# fails closed. Six builds over the build-claim-diff workarea with page 12
# extended by a repeated sentence (a deletion whose claim survives), an
# ambiguous "It" (unresolved) and a one-word paragraph (a deletion the
# nominator flags with no listed element). 1: no files, the S02 result.
# 2: a valid file for page 12. 3: the same file with a wrong sourceHash on
# the unchanged page. 4: a file of bad items plus one valid item and one
# clean record omitted. 5: page 13, already stale, with a file that is not
# read. 6: an unparseable file. 7: verifiedBy that is not a string. 8: a
# wrong sourceHash together with a blank verifiedBy (stale wins). 9: items
# that is not an array. 10: a verified deletion whose span is changed to
# another sentence while its old item is kept. 11: a verified rewrite whose
# source is swapped for a sentence with the same nomination elements. 12: a
# verifier retry: the file with F-12-012's removal part missing, then the
# complete file again; the second write accepts both parts and every other
# item stands. No nominated record reaches none except through a valid,
# complete, matching verdict with the note the contract requires, and a
# verdict is bound to the exact edit it judged.
set -u

OUT="$WORK/out"
page_hash() { openssl dgst -sha256 "$1" | awk '{print $NF}'; }
sed "s|@@WORK@@|$WORK|g; s|@@HASH_CLAIMS@@|$(page_hash "$WORK/pages/12-claims.md")|" "$WORK/review.template.json" > "$WORK/review.json"
HASH12=$(page_hash "$WORK/pages/12-claims.md")

build() {  # $1 label
  echo "=== build $1 ==="
  bash "$HELPER_DIR/build-triage.sh" --from-run "$WORK/review.json" --dir "$OUT" --commit testcommit | grep -E 'verification|claims:|buckets|spawn'
  jq -r --slurpfile t "$OUT/triage.json" '($t[0].clusters | map({(.id): "\(.bucket)/\(.reason)"}) | add) as $b
    | .records[] | select(.claimDiff.nominated == true)
    | "\(.id) \(.kind)/\(.action) claimShift=\(.claimShift) removal=\(.removalShift // "-") \($b[.cluster]) note=\(.claimShiftNote // "-")"' "$OUT/findings.json"
  jq -r --arg b "$1" '"\($b): none=\([.records[] | select(.claimDiff.nominated == true and .claimShift == "none") | .id] | join(",") | if . == "" then "(no record)" else . end)"' "$OUT/findings.json" >> "$WORK/none.txt"
}
ch() { jq -r --arg id "$1" '.records[] | select(.id == $id) | .candidateHash' "$OUT/findings.json"; }
rh() { jq -r --arg id "$1" '.records[] | select(.id == $id) | .removalHash' "$OUT/findings.json"; }

build 1-no-files

mkdir -p "$OUT/verification"
item() {  # record cluster candidateHash claimShift note shiftsJson
  jq -n -c --arg r "$1" --arg c "$2" --arg h "$3" --arg s "$4" --arg n "$5" --argjson sh "$6" \
    '{record: $r, cluster: $c, candidateHash: $h, claimShift: $s, note: $n, shifts: $sh}'
}
file12() {  # $1 sourceHash, items on stdin (one per line)
  jq -s --arg h "$1" '{page: "12-claims.md", sourceHash: $h, verifiedBy: "CLAIM_VERIFIER v1", items: .}'
}
{
  item F-12-002 C-12-001 "$(ch F-12-002)" material "The rule weakens: must refuse in the source, should refuse in the candidate (removed:modal:must, added:modal:should)." \
    '[{"element":"removed:modal:must","before":"must","after":null,"judgment":"material"},{"element":"added:modal:should","before":null,"after":"should","judgment":"material"}]'
  item F-12-003 C-12-004 "$(ch F-12-003)" material "The timestamp rule is stated only in the deleted sentence (line 7), so the claim is lost; the record names the loss as a repetition it is not (sentence:0)." \
    '[{"element":"sentence:0","before":"A consumer must reject a stale timestamp.","after":null,"judgment":"material"}]'
  item F-12-004 C-12-005 "$(ch F-12-004)" material "The candidate states a cause the page does not, that the routing service never reads the cookie content (added:negation:never, added:connective:because, added content)." \
    '[{"element":"added:connective:because","before":null,"after":"because","judgment":"material"},{"element":"added:negation:never","before":null,"after":"never","judgment":"material"},{"element":"added:content:reads","before":null,"after":"reads","judgment":"none"},{"element":"added:content:cookie'"'"'s","before":null,"after":"cookie'"'"'s","judgment":"none"},{"element":"added:content:content","before":null,"after":"content","judgment":"none"},{"element":"removed:quantifier:all","before":"all","after":null,"judgment":"none"}]'
  item F-12-007 C-12-007 "0000000000000000000000000000000000000000000000000000000000000000" none "No claim changes: key and signing key name the same thing on this page." \
    '[{"element":"added:content:signing","before":null,"after":"signing","judgment":"none"}]'
  item F-12-008 C-12-008 "$(ch F-12-008)" none "Both claims survive at line 3: The front door signs the cookie. The journey reads the cookie and must refuse a cookie whose signature fails." \
    '[{"element":"sentence:0","before":"The front door signs the cookie and the journey reads the cookie, as the first section states.","after":null,"judgment":"none"}]'
  item F-12-009 C-12-009 "$(ch F-12-009)" unresolved "The source It can be the verdict or the journey; the candidate writes the verdict in (added:content:verdict)." \
    '[{"element":"added:content:verdict","before":null,"after":"verdict","judgment":"unresolved"}]'
  item F-12-010 C-12-010 "$(ch F-12-010)" none "The one-word paragraph carries no claim (sentence:0)." \
    '[{"element":"sentence:0","before":"Done.","after":null,"judgment":"none"}]'
  item F-12-011 C-12-011 "$(ch F-12-011)" none "A bare status code carries no claim (sentence:0)." \
    '[{"element":"sentence:0","before":"404.","after":null,"judgment":"none"}]'
  item F-12-012 C-12-012 "$(ch F-12-012)" none "Since to because states the same cause (removed:connective:since, added:connective:because)." \
    '[{"element":"removed:connective:since","before":"since","after":null,"judgment":"none"},{"element":"added:connective:because","before":null,"after":"because","judgment":"none"}]' \
    | jq -c --arg h "$(rh F-12-012)" '.removal = {removalHash: $h, claimShift: "material", note: "Deleting the sentence loses the only statement of why sessions end (sentence:0).", shifts: [{element: "sentence:0", before: "Sessions end since the clocks lapse.", after: null, judgment: "material"}]}'
  item F-12-013 C-12-013 "$(ch F-12-013)" none "Checks to validates names the same act (removed:content:checks, added:content:validates)." \
    '[{"element":"removed:content:checks","before":"checks","after":null,"judgment":"none"},{"element":"added:content:validates","before":null,"after":"validates","judgment":"none"}]'
} > "$WORK/items12.jsonl"
file12 "$HASH12" < "$WORK/items12.jsonl" > "$OUT/verification/claims-12-claims.md.json"
build 2-valid-file

file12 "1111111111111111111111111111111111111111111111111111111111111111" < "$WORK/items12.jsonl" > "$OUT/verification/claims-12-claims.md.json"
build 3-wrong-file-hash

{
  item F-99-001 C-99-001 "$(ch F-12-002)" none "unknown record" '[{"element":"sentence:0","before":"x","after":null,"judgment":"none"}]'
  item F-12-002 C-12-001 "$(ch F-12-002)" none "duplicate one" '[{"element":"removed:modal:must","before":"must","after":null,"judgment":"none"},{"element":"added:modal:should","before":null,"after":"should","judgment":"none"}]'
  item F-12-002 C-12-001 "$(ch F-12-002)" none "duplicate two" '[{"element":"removed:modal:must","before":"must","after":null,"judgment":"none"},{"element":"added:modal:should","before":null,"after":"should","judgment":"none"}]'
  item F-12-007 C-12-007 "$(ch F-12-007)" none "aggregate says none while an element says material" '[{"element":"added:content:signing","before":null,"after":"signing","judgment":"material"}]'
  item F-12-009 C-12-009 "$(ch F-12-009)" none "missing the required element" '[{"element":"sentence:0","before":"x","after":null,"judgment":"none"}]'
  item F-12-003 C-12-004 "$(ch F-12-003)" none "bad judgment value" '[{"element":"sentence:0","before":"A consumer must reject a stale timestamp.","after":null,"judgment":"fine"}]'
  item F-12-010 C-12-010 "$(ch F-12-010)" none "empty shifts on a nominated deletion" '[]'
  item F-12-005 C-12-002 "$(ch F-12-005)" material "" '[{"element":"added:quantifier:each","before":null,"after":"each","judgment":"material"}]'
  item F-12-008 C-12-008 "$(ch F-12-008)" none "Both claims survive at line 3: The front door signs the cookie. The journey reads the cookie." '[{"element":"sentence:0","before":"The front door signs the cookie and the journey reads the cookie, as the first section states.","after":null,"judgment":"none"}]'
  item F-12-004 C-12-005 "$(ch F-12-004)" none "extra element" '[{"element":"added:connective:because","before":null,"after":"because","judgment":"none"},{"element":"added:negation:never","before":null,"after":"never","judgment":"none"},{"element":"added:content:reads","before":null,"after":"reads","judgment":"none"},{"element":"added:content:cookie'"'"'s","before":null,"after":"cookie'"'"'s","judgment":"none"},{"element":"added:content:content","before":null,"after":"content","judgment":"none"},{"element":"removed:quantifier:all","before":"all","after":null,"judgment":"none"},{"element":"sentence:0","before":"x","after":null,"judgment":"none"}]'
  item F-12-011 C-12-011 "$(ch F-12-011)" none "invented sentence index on a numeric deletion" '[{"element":"sentence:1","before":"404.","after":null,"judgment":"none"}]'
  item F-12-002 C-12-001 "$(ch F-12-002)" none "a third F-12-002, so the duplicate rule sees three" '[{"element":"removed:modal:must","before":"must","after":null,"judgment":"none"},{"element":"added:modal:should","before":null,"after":"should","judgment":"none"}]'
  item F-12-012 C-12-012 "$(ch F-12-012)" none "rewrite part only; the removal part is absent" '[{"element":"removed:connective:since","before":"since","after":null,"judgment":"none"},{"element":"added:connective:because","before":null,"after":"because","judgment":"none"}]'
} | file12 "$HASH12" > "$OUT/verification/claims-12-claims.md.json"
build 4-bad-items

rm -f "$OUT/verification/claims-12-claims.md.json"
jq -n --arg h "$(page_hash "$WORK/pages/13-stale.md")" '{page: "13-stale.md", sourceHash: $h, verifiedBy: "CLAIM_VERIFIER v1",
  items: [{record: "F-13-001", cluster: "C-13-001", candidateHash: "x", claimShift: "none", note: "n", shifts: [{element: "added:content:event", before: null, after: "event", judgment: "none"}]}]}' \
  > "$OUT/verification/claims-13-stale.md.json"
build 5-stale-page

rm -f "$OUT/verification/claims-13-stale.md.json"
printf '{"page": "12-claims.md", "sourceHash": "%s", "verifiedBy": "CLAIM_VERIFIER v1", "items": [' "$HASH12" > "$OUT/verification/claims-12-claims.md.json"
build 6-unparseable-file

file12 "$HASH12" < "$WORK/items12.jsonl" | jq '.verifiedBy = true' > "$OUT/verification/claims-12-claims.md.json"
build 7-verifiedBy-not-a-string

file12 "1111111111111111111111111111111111111111111111111111111111111111" < "$WORK/items12.jsonl" | jq '.verifiedBy = ""' > "$OUT/verification/claims-12-claims.md.json"
build 8-wrong-hash-and-blank-verifiedBy

file12 "$HASH12" < "$WORK/items12.jsonl" | jq '.items = "x"' > "$OUT/verification/claims-12-claims.md.json"
build 9-items-not-an-array

# 10: the valid file back; F-12-008 (verified none) is changed in the review to
# delete the timestamp sentence instead, on the unchanged page; the old item stays
file12 "$HASH12" < "$WORK/items12.jsonl" > "$OUT/verification/claims-12-claims.md.json"
cp "$WORK/review.json" "$WORK/review.orig.json"
jq '.units[0].findings |= map(if .quote == "as the first section states" then .line = 7 | .quote = "A consumer must reject a stale timestamp" | .before = "A consumer must reject a stale timestamp." | .removes = "A consumer must reject a stale timestamp." else . end)' "$WORK/review.orig.json" > "$WORK/review.json"
build 10-deletion-span-changed-old-item-kept
echo "page hash unchanged: $([[ "$(page_hash "$WORK/pages/12-claims.md")" == "$HASH12" ]] && echo yes || echo no)"
jq -r '.records[] | select(.id == "F-12-008") | "F-12-008 before=\(.before[0:40]) after=\(.after | tojson) elements=\([.claimDiff.added[], .claimDiff.removed[] | .term] | join(",")) missing=\(.claimDiff.missingSentence | length)"' "$OUT/findings.json"

# 11: the same for a rewrite: F-12-013 moved to the sentence that swaps the actors,
# same replacement, same nomination elements; the old verdict must not carry over
cp "$WORK/review.orig.json" "$WORK/review.json"
build 11a-rewrite-verified
jq -r '.records[] | select(.id == "F-12-013") | "F-12-013 elements=\([.claimDiff.added[], .claimDiff.removed[] | .class + ":" + .term] | join(",")) candidateHash=\(.candidateHash[0:12])"' "$OUT/findings.json"
jq '.units[0].findings |= map(if .quote == "The browser calls the server when the user signs in" then .line = 27 | .quote = "The server calls the browser when the user signs in" | .before = "The server calls the browser when the user signs in and the service checks the request." else . end)' "$WORK/review.orig.json" > "$WORK/review.json"
build 11b-rewrite-source-swapped-old-item-kept
echo "page hash unchanged: $([[ "$(page_hash "$WORK/pages/12-claims.md")" == "$HASH12" ]] && echo yes || echo no)"
jq -r '.records[] | select(.id == "F-12-013") | "F-12-013 applicable=\(.applicable) elements=\([.claimDiff.added[], .claimDiff.removed[] | .class + ":" + .term] | join(",")) candidateHash=\(.candidateHash[0:12])"' "$OUT/findings.json"
cp "$WORK/review.orig.json" "$WORK/review.json"

# 12: a retry. The verifier writes the complete page file every time; a file
# that carries only the rewrite part of F-12-012 leaves its removal missing, and
# the complete file written next accepts both parts without losing any other item.
jq -c 'if .record == "F-12-012" then del(.removal) else . end' "$WORK/items12.jsonl" | file12 "$HASH12" > "$OUT/verification/claims-12-claims.md.json"
build 12a-retry-removal-part-missing
file12 "$HASH12" < "$WORK/items12.jsonl" > "$OUT/verification/claims-12-claims.md.json"
build 12b-retry-complete-file

echo "=== nominated records at none, per build ==="
cat "$WORK/none.txt"
