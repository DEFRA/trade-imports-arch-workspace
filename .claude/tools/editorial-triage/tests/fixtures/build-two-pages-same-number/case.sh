#!/usr/bin/env bash
# Two pages whose filenames share a leading number, and a third whose filename
# holds a space. The build keys the same-numbered pages apart (record ids,
# cluster ids, anchors), and a page anchor names its page by filename and
# resolves on that page alone: a cite or a supported introduction whose quote
# sits only on the same-numbered sibling is not found, an anchor that does not
# parse is not found, and a filename with a space parses. Records: an alpha
# deletion citing beta correctly (found); a beta deletion citing beta for a
# sentence only alpha holds (cites-not-found, discarded); a beta rename whose
# introduction names alpha correctly (supported); an alpha rewrite whose
# introduction names alpha for a sentence only beta holds (held); on the
# spaced page, a rename whose cite and introduction both name the spaced page
# correctly (found, supported); a deletion whose cite has no quoted anchor
# (cites-not-found); a rename with one cite found and one absent, and an
# introduction naming the spaced page for an absent quote (cites-not-found,
# held). Build 1 has no verdicts, so every rewrite sits in propose/unverified
# and the assertion is introducedCheck on the record and the cluster. Build 2
# supplies a none verdict for the alpha and beta rewrites, so the held
# introduction reaches its own partition reason and the supported one does not.
set -u

OUT="$WORK/out"
page_hash() { openssl dgst -sha256 "$1" | awk '{print $NF}'; }
sed "s|@@WORK@@|$WORK|g; s|@@HASH_ALPHA@@|$(page_hash "$WORK/pages/09-alpha.md")|; s|@@HASH_BETA@@|$(page_hash "$WORK/pages/09-beta.md")|; s|@@HASH_SPACED@@|$(page_hash "$WORK/pages/10 spaced.md")|" "$WORK/review.template.json" > "$WORK/review.json"

build() {  # $1 label
  echo "=== build $1 ==="
  bash "$HELPER_DIR/build-triage.sh" --from-run "$WORK/review.json" --dir "$OUT" --commit testcommit | grep -E 'records|claims:|buckets|verification|spawn'
  echo "--- records: anchor form, checks, introducedCheck, claimShift, bucket ---"
  jq -r --slurpfile t "$OUT/triage.json" '($t[0].clusters | map({(.id): "\(.bucket)/\(.reason) introducedCheck=\(.introducedCheck)"}) | add) as $b
    | .records[]
    | "\(.id) \(.kind)/\(.action) cite=\((.cites // [])[0] | split(" \"")[0]) checks=\(.checks | join(",")) introducedCheck=\(.introducedCheck) claimShift=\(.claimShift) cluster \(.cluster): \($b[.cluster])"' "$OUT/findings.json"
}

build 1-no-verdicts

echo "--- page keys ---"
jq -r '.pages[] | "\(.page)  no=\(.no)  key=\(.key)"' "$OUT/manifest.json"

echo "--- record ids ---"
jq -r '.records | [.[].id] as $i
       | "total \($i | length), distinct \($i | unique | length)",
         "prefixes \([.[].id | split("-")[1]] | unique | sort | join(", "))"' "$OUT/findings.json"

echo "--- cluster ids ---"
jq -r '.clusters | "total \(length), distinct \([.[].id] | unique | length)",
       "prefixes \([.[].id | split("-")[1]] | unique | sort | join(", "))"' "$OUT/triage.json"

echo "--- each record sits in a cluster on its own page ---"
jq -r --slurpfile t "$OUT/triage.json" '
  ($t[0].clusters | map({(.id): .page}) | add) as $cp
  | .records
  | map(select(.cluster != null and $cp[.cluster] != .page))
  | "records clustered onto another page: \(length)"' "$OUT/findings.json"

echo "--- a cite resolves on the named page alone ---"
jq -r '.records | "cites-not-found checks: \([.[] | select((.checks // []) | index("cites-not-found"))] | map(.id) | join(","))"' "$OUT/findings.json"
jq -r '.summary.byReason | "clusters discarded as cites-not-found: \(.["cites-not-found"] // 0)"' "$OUT/triage.json"

# Build 2: a none verdict for each rewrite, its elements read from the
# nomination so the item matches the record's required set exactly.
mkdir -p "$OUT/verification"
verdict_file() {  # $1 page, $2 record id
  jq -c --arg id "$2" --arg pg "$1" --arg h "$(page_hash "$WORK/pages/$1")" '
    .records[] | select(.id == $id)
    | {page: $pg, sourceHash: $h, verifiedBy: "CLAIM_VERIFIER v1",
       items: [{record: .id, cluster: .cluster, candidateHash: .candidateHash, claimShift: "none",
                note: "No claim changes: the rewrite adds a name the set already holds.",
                shifts: ([.claimDiff.added[] | {element: ("added:" + .class + ":" + .term), before: null, after: .term, judgment: "none"}]
                       + [.claimDiff.removed[] | {element: ("removed:" + .class + ":" + .term), before: .term, after: null, judgment: "none"}]
                       + [.claimDiff.missingSentence | to_entries[] | {element: ("sentence:" + (.key | tostring)), before: .value, after: null, judgment: "none"}])}]}' "$OUT/findings.json"
}
verdict_file 09-alpha.md F-09a-002 > "$OUT/verification/claims-09-alpha.md.json"
verdict_file 09-beta.md F-09b-002 > "$OUT/verification/claims-09-beta.md.json"

build 2-verified-rewrites

echo "--- the held introduction reaches its own reason; the supported one is neither held nor unverified ---"
jq -r '.clusters[] | select(.members | index("F-09a-002")) | "F-09a-002 cluster: \(.bucket)/\(.reason)"' "$OUT/triage.json"
jq -r '.clusters[] | select(.members | index("F-09b-002")) | "F-09b-002 cluster: \(.bucket)/\(.reason) (not introduced: \(.reason != "introduced"); not unverified: \(.reason != "unverified"))"' "$OUT/triage.json"

echo "--- run fields ---"
jq -r '"mode \(.mode), intent \(.intent), sourceHashes \(.sourceHashes | keys | join(", "))"' "$OUT/manifest.json"
