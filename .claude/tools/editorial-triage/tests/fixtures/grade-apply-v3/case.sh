#!/usr/bin/env bash
# grade-apply-v3: plan and apply on a version 3 workarea the build made from
# this fixture's own pages and review: the build-claim-verdicts records, with
# the presentation finding quoting its whole sentence, the "since" reword
# carrying no removal of its own, and one rewrite record whose removes is a
# whole sentence and whose after is non-empty (F-12-014). Each variant runs on
# its own untouched copy of the pages and the run, so the state tested is the
# state claimed.
# 1. Full plan: every verdict in place, every cluster labelled. Held entries
#    (material, unresolved, stale, held introduction) never reach Apply; the
#    presentation cluster labelled R is O; the material deletion applies on R
#    with the verifier's note (Q10); the layout split, the verified rewords,
#    the none deletions and the verified removal of F-12-014 apply. The Q10
#    entry makes --no-spot-check a refusal; a dry run writes nothing; the real
#    run writes the page, passes the gate and records the hash of the file as
#    written; a second run applies nothing and leaves the page byte-identical.
# 2. Removal unverified: F-12-014's item has no removal part, so the rewrite
#    is none and the removal missing; the R is held. A rewrite verdict is never
#    borrowed for the removal.
# 3. Verdict withdrawn: the verification file is deleted and the run rebuilt
#    on the unchanged page after the plan was written; apply reads the current
#    findings, reports skipped-unverified, writes nothing and does not refuse
#    on the old plan's stored verdict.
# 4. Candidate changed: the record's after is edited in the review and the run
#    rebuilt; the entry skips as changed before any verdict is read.
# 5. Page changed: the page is edited elsewhere after the plan; both runs skip
#    as stale, the page is untouched and no hash is trusted.
# 6. Presentation added later: a deletion of the callback sentence, verified
#    none, is an Apply entry; the presentation member appended at the same
#    anchor puts presentation on the cluster's kinds, and apply skips the same
#    record as held.
# 7. Verdict moved after the plan: a removal planned on none and re-verified
#    material, and one planned on material and re-verified none, both skip as
#    changed, because the spot check showed the other verdict; the refusal of
#    --no-spot-check reads the current verdicts, so it neither fires on the
#    plan's stale material nor stays silent on a new one.
# 8. Removal state absent: a real removes with a non-empty after and no
#    removalShift at all has no verdict; apply skips it as unverified and the
#    plan holds it, whatever the rewrite's verdict says.
set -u

page_hash() { openssl dgst -sha256 "$1" | awk '{print $NF}'; }
GT="$HELPER_DIR/grade-triage.sh"
V=""; OUT=""; PAGE=""

variant() {  # $1 name: a fresh copy of the pages and a run built against them
    V="$WORK/$1"; OUT="$V/out"; PAGE="$V/pages/12-claims.md"
    mkdir -p "$V"
    cp -R "$WORK/pages" "$V/pages"
    sed "s|@@WORK@@|$V|g; s|@@HASH_CLAIMS@@|$(page_hash "$PAGE")|" "$WORK/review.template.json" > "$V/review.json"
    echo; echo "=== variant $1 ==="
    build
}
build() {
    bash "$HELPER_DIR/build-triage.sh" --from-run "$V/review.json" --dir "$OUT" --commit testcommit > "$V/build.log" 2>&1 || { echo "build failed:"; cat "$V/build.log"; }
}
ch() { jq -r --arg id "$1" '.records[] | select(.id == $id) | .candidateHash' "$OUT/findings.json"; }
rh() { jq -r --arg id "$1" '.records[] | select(.id == $id) | .removalHash' "$OUT/findings.json"; }
item() {  # record cluster candidateHash claimShift note shiftsJson
    jq -n -c --arg r "$1" --arg c "$2" --arg h "$3" --arg s "$4" --arg n "$5" --argjson sh "$6" \
        '{record: $r, cluster: $c, candidateHash: $h, claimShift: $s, note: (if $n == "" then null else $n end), shifts: $sh}'
}
# The verdicts of the build-claim-verdicts golden, plus F-12-014's rewrite; $1 says
# whether F-12-014's removal part is present; $2, when given, is the judgment of
# F-12-008's deletion and F-12-014's removal (none or material).
items() {
    local j="${2:-none}" n8 n14
    if [[ "$j" == material ]]; then
        n8="The sentence is the only place the page says the first section states the rule (sentence:0)."
        n14="Deleting the sentence loses the only statement that the journey reads the cache (sentence:0)."
    else
        n8="Both claims survive at line 3: The front door signs the cookie. The journey reads the cookie and must refuse a cookie whose signature fails (sentence:0)."
        n14="The sentence restates line 17, where the verdict reaches the journey at the next request (sentence:0)."
    fi
    item F-12-002 C-12-001 "$(ch F-12-002)" material "The rule weakens: must refuse in the source, should refuse in the candidate (removed:modal:must, added:modal:should)." \
        '[{"element":"removed:modal:must","before":"must","after":null,"judgment":"material"},{"element":"added:modal:should","before":null,"after":"should","judgment":"material"}]'
    item F-12-003 C-12-004 "$(ch F-12-003)" material "The timestamp rule is stated only in the deleted sentence, so the claim is lost (sentence:0)." \
        '[{"element":"sentence:0","before":"A consumer must reject a stale timestamp.","after":null,"judgment":"material"}]'
    item F-12-004 C-12-005 "$(ch F-12-004)" material "The candidate states a cause the page does not, that the routing service never reads the cookie content (added:negation:never, added:connective:because)." \
        '[{"element":"added:connective:because","before":null,"after":"because","judgment":"material"},{"element":"added:negation:never","before":null,"after":"never","judgment":"material"},{"element":"added:content:reads","before":null,"after":"reads","judgment":"none"},{"element":"added:content:cookie'"'"'s","before":null,"after":"cookie'"'"'s","judgment":"none"},{"element":"added:content:content","before":null,"after":"content","judgment":"none"},{"element":"removed:quantifier:all","before":"all","after":null,"judgment":"none"}]'
    item F-12-007 C-12-007 "$(ch F-12-007)" none "No claim changes: key and signing key name the same thing on this page." \
        '[{"element":"added:content:signing","before":null,"after":"signing","judgment":"none"}]'
    item F-12-008 C-12-008 "$(ch F-12-008)" "$j" "$n8" \
        "[{\"element\":\"sentence:0\",\"before\":\"The front door signs the cookie and the journey reads the cookie, as the first section states.\",\"after\":null,\"judgment\":\"$j\"}]"
    item F-12-009 C-12-009 "$(ch F-12-009)" unresolved "The source It can be the verdict or the journey; the candidate writes the verdict in (added:content:verdict)." \
        '[{"element":"added:content:verdict","before":null,"after":"verdict","judgment":"unresolved"}]'
    item F-12-010 C-12-010 "$(ch F-12-010)" none "The one-word paragraph carries no claim (sentence:0)." \
        '[{"element":"sentence:0","before":"Done.","after":null,"judgment":"none"}]'
    item F-12-011 C-12-011 "$(ch F-12-011)" none "A bare status code carries no claim (sentence:0)." \
        '[{"element":"sentence:0","before":"404.","after":null,"judgment":"none"}]'
    item F-12-012 C-12-012 "$(ch F-12-012)" none "" \
        '[{"element":"removed:connective:since","before":"since","after":null,"judgment":"none"},{"element":"added:connective:because","before":null,"after":"because","judgment":"none"}]'
    item F-12-013 C-12-013 "$(ch F-12-013)" none "" \
        '[{"element":"removed:content:checks","before":"checks","after":null,"judgment":"none"},{"element":"added:content:validates","before":null,"after":"validates","judgment":"none"}]'
    item F-12-014 C-12-014 "$(ch F-12-014)" none "The cache lifetime is the session page's statement, which the record cites; the page loses no claim of its own (removed:number:one, removed:content:holds, removed:content:verdict, removed:content:minute, sentence:0)." \
        '[{"element":"removed:number:one","before":"one","after":null,"judgment":"none"},{"element":"removed:content:holds","before":"holds","after":null,"judgment":"none"},{"element":"removed:content:verdict","before":"verdict","after":null,"judgment":"none"},{"element":"removed:content:minute","before":"minute","after":null,"judgment":"none"},{"element":"sentence:0","before":"The cache holds the verdict for one minute and the journey reads the cache.","after":"The journey reads the cache.","judgment":"none"}]' \
        | if [[ "$1" == with-removal ]]; then
            jq -c --arg h "$(rh F-12-014)" --arg j "$j" --arg n "$n14" '.removal = {removalHash: $h, claimShift: $j, note: $n, shifts: [{element: "sentence:0", before: "The cache holds the verdict for one minute and the journey reads the cache.", after: null, judgment: $j}]}'
          else cat; fi
}
verify() {  # $1 with-removal | without-removal, $2 none | material: writes the verification file and rebuilds
    mkdir -p "$OUT/verification"
    items "$1" "${2:-none}" | jq -s --arg h "$(page_hash "$PAGE")" '{page: "12-claims.md", sourceHash: $h, verifiedBy: "CLAIM_VERIFIER v1", items: .}' \
        > "$OUT/verification/claims-12-claims.md.json"
    build
}
label() {  # cluster move [note]
    bash "$GT" label --dir "$OUT" --cluster "$1" --move "$2" ${3:+--note "$3"} > /dev/null 2>&1 || echo "label $1 $2 failed"
}
plan() { bash "$GT" plan --dir "$OUT" "$@"; echo "exit-code: $?"; }
apply() { bash "$GT" apply --dir "$OUT" "$@" 2>&1 | grep -v 'not in a git repository'; echo "exit-code: ${PIPESTATUS[0]}"; }
has() { grep -qF -- "$1" "$PAGE" && echo "page has: $1" || echo "page lacks: $1"; }
applied_json() { [[ -f "$OUT/closing/applied.json" ]] && echo "applied.json: present" || echo "applied.json: absent"; }

# ---------------------------------------------------------------- 1
variant 1-full-plan
verify with-removal
label C-12-001 C; label C-12-002 I; label C-12-003 W; label C-12-004 R; label C-12-005 W; label C-12-006 R
label C-12-007 W; label C-12-008 R; label C-12-009 W; label C-12-010 R; label C-12-011 R; label C-12-012 W
label C-12-013 W; label C-12-014 R; label C-13-001 W; label C-13-002 I
plan --sample 20 --seed 42
mkdir -p "$WORK/closing"
cp "$OUT/closing/plan.md" "$WORK/closing/1-plan.md"
echo "--- presentation cluster carries no page edit ---"
jq -r '[.entries[] | select(.cluster == "C-12-006")] | map("\(.cluster) \(.move) source=\(.source)") | join("; ")' "$OUT/closing/plan.json"
echo "--- --no-spot-check is refused while the Q10 entry applies ---"
apply --no-spot-check
applied_json
echo "--- a dry run writes nothing ---"
apply --dry-run
applied_json
HASH_BEFORE=$(page_hash "$PAGE")
echo "--- the real run ---"
apply --force
has "is live. The routing service"
has "The session service answers whether a session is live."
has "The routing service forwards the answer to the journey, which records the outcome."
has "A consumer must reject a stale timestamp."
has "The front door signs the cookie and the journey reads the cookie, as the first section states."
has "Done."
has "404."
has "Sessions end because the clocks lapse."
has "The browser calls the server when the user signs in and the service validates the request."
has "The cache holds the verdict for one minute"
has "When the front door receives the callback, the front door checks the state value"
echo "page changed: $([[ "$(page_hash "$PAGE")" != "$HASH_BEFORE" ]] && echo yes || echo no)"
jq -r '.trusted | to_entries[] | "trusted \(.key): sourceHash \(.value.sourceHash[0:12]) hashAfter \(.value.hashAfter[0:12])"' "$OUT/closing/applied.json"
echo "trusted hash equals the file: $([[ "$(jq -r '.trusted["12-claims.md"].hashAfter' "$OUT/closing/applied.json")" == "$(page_hash "$PAGE")" ]] && echo yes || echo no)"
HASH_AFTER=$(page_hash "$PAGE")
echo "--- a second run applies nothing ---"
apply --force
echo "page byte-identical: $([[ "$(page_hash "$PAGE")" == "$HASH_AFTER" ]] && echo yes || echo no)"
echo "trusted hash unchanged: $([[ "$(jq -r '.trusted["12-claims.md"].hashAfter' "$OUT/closing/applied.json")" == "$HASH_AFTER" ]] && echo yes || echo no)"
cp "$PAGE" "$WORK/closing/1-12-claims.md"

# ---------------------------------------------------------------- 2
variant 2-removal-unverified
verify without-removal
jq -r '.records[] | select(.id == "F-12-014") | "F-12-014 claimShift=\(.claimShift) removalShift=\(.removalShift)"' "$OUT/findings.json"
label C-12-014 R
plan
jq -r '.entries[] | select(.cluster == "C-12-014") | "\(.cluster) \(.move) source=\(.source): \(.note)"' "$OUT/closing/plan.json"
has "The cache holds the verdict for one minute"

# ---------------------------------------------------------------- 3
variant 3-verdict-withdrawn
verify with-removal
label C-12-012 W; label C-12-004 R
plan --sample 5 --seed 42
rm "$OUT/verification/claims-12-claims.md.json"
build
HASH_BEFORE=$(page_hash "$PAGE")
apply --force --no-spot-check
echo "page unchanged: $([[ "$(page_hash "$PAGE")" == "$HASH_BEFORE" ]] && echo yes || echo no)"
jq -c '.trusted' "$OUT/closing/applied.json"

# ---------------------------------------------------------------- 4
variant 4-candidate-changed
verify with-removal
label C-12-012 W
plan --sample 5 --seed 42
jq '.units[0].findings |= map(if .before == "Sessions end since the clocks lapse." then .after = "Sessions end because clocks lapse." else . end)' "$V/review.json" > "$V/review.json.tmp" && mv "$V/review.json.tmp" "$V/review.json"
build
apply --force --no-spot-check
has "Sessions end since the clocks lapse."

# ---------------------------------------------------------------- 5
variant 5-page-changed
verify with-removal
label C-12-012 W
plan --sample 5 --seed 42
printf '\nA closing note.\n' >> "$PAGE"
HASH_BEFORE=$(page_hash "$PAGE")
apply --force --no-spot-check
apply --force --no-spot-check
echo "page unchanged: $([[ "$(page_hash "$PAGE")" == "$HASH_BEFORE" ]] && echo yes || echo no)"
has "Sessions end since the clocks lapse."
jq -c '.trusted' "$OUT/closing/applied.json"

# ---------------------------------------------------------------- 6
variant 6-presentation-added-later
CALLBACK="When the front door receives the callback, the front door checks the state value, then loads the stored return path, then issues the cookie, and then redirects the browser to the return path."
# the presentation finding becomes a deletion of the same sentence, at the same index
jq --arg s "$CALLBACK" '.units[0].findings |= map(if .kind == "presentation" then
      {page: "12-claims.md", line: 11, quote: $s, kind: "residue", severity: "S4",
       defect: "The callback sequence belongs to the sign-in page, which states it step by step.",
       point: "The paragraph establishes what the front door does at the callback.", bearing: "supporting",
       removes: $s, action: "delete", basis: "set", cites: ["12-claims.md \"The front door signs the cookie\""],
       before: $s, after: "", loss: "the callback sequence", guess: false}
      else . end)' "$V/review.json" > "$V/review.json.tmp" && mv "$V/review.json.tmp" "$V/review.json"
cp "$V/review.json" "$V/review.orig.json"
build
mkdir -p "$OUT/verification"
item F-12-006 C-12-006 "$(ch F-12-006)" none "The sign-in page states the four steps; the paragraph repeats them (sentence:0)." \
    "[{\"element\":\"sentence:0\",\"before\":$(jq -n --arg s "$CALLBACK" '$s'),\"after\":null,\"judgment\":\"none\"}]" \
    | jq -s --arg h "$(page_hash "$PAGE")" '{page: "12-claims.md", sourceHash: $h, verifiedBy: "CLAIM_VERIFIER v1", items: .}' \
    > "$OUT/verification/claims-12-claims.md.json"
build
label C-12-006 R
plan --sample 5 --seed 42
jq -r '.entries[] | select(.cluster == "C-12-006") | "\(.cluster) \(.move) record=\(.record) source=\(.source)"' "$OUT/closing/plan.json"
# the presentation member joins the same anchor
jq '.units[0].findings += [{page: "12-claims.md", line: 11, quote: "When the front door receives the callback, the front door checks the state value, then loads the stored return path, then issues the cookie, and then redirects the browser to the return path.", kind: "presentation", severity: "S4",
      defect: "Four conditioned steps between the front door and the browser are stated as one sentence, which a reader would follow more easily as a sequence diagram.",
      point: "The paragraph establishes what the front door does at the callback.", bearing: "supporting", removes: "none: presentation", action: "ask", basis: "author",
      question: "Should the callback steps be drawn as a sequence diagram (front door, browser)?", owner: "author",
      inventory: {actors: ["front door", "browser"], steps: [{actor: "front door", action: "checks the state value", condition: "when the front door receives the callback", quote: "the front door checks the state value"}, {actor: "front door", action: "loads the stored return path", condition: null, quote: "then loads the stored return path"}, {actor: "front door", action: "issues the cookie", condition: null, quote: "then issues the cookie"}, {actor: "front door", action: "redirects the browser to the return path", condition: null, quote: "then redirects the browser to the return path"}], existingDiagram: null},
      guess: false}]' "$V/review.orig.json" > "$V/review.json"
build
jq -r '.clusters[] | select(.members | index("F-12-006")) | "\(.id) members=\(.members | join(",")) kinds=\(.kinds | join(","))"' "$OUT/triage.json"
apply --force --no-spot-check
has "$CALLBACK"

# ---------------------------------------------------------------- 7
variant 7-verdict-moved-after-plan
verify with-removal none
label C-12-008 R; label C-12-014 R
plan --sample 5 --seed 42
echo "--- planned: both removals none ---"
jq -r '.entries[] | select(.move == "R") | "\(.cluster) removalShift=\(.removalShift)"' "$OUT/closing/plan.json"
verify with-removal material
echo "--- now material: --no-spot-check is not refused, because nothing applies; both skip as changed ---"
apply --force --no-spot-check
has "The cache holds the verdict for one minute"
has "as the first section states."
echo "--- re-planned on material, then re-verified none: the same in the other direction ---"
plan --sample 5 --seed 42
verify with-removal none
apply --force --no-spot-check
has "The cache holds the verdict for one minute"
echo "--- re-planned on none: applies without a refusal ---"
plan --sample 5 --seed 42
apply --force --no-spot-check
has "The cache holds the verdict for one minute"

# ---------------------------------------------------------------- 8
variant 8-removal-state-absent
verify with-removal
label C-12-014 R
plan --sample 5 --seed 42
jq '.records |= map(if .id == "F-12-014" then .removalShift = null | .removalNote = null else . end)' "$OUT/findings.json" > "$OUT/findings.json.tmp" && mv "$OUT/findings.json.tmp" "$OUT/findings.json"
jq -r '.records[] | select(.id == "F-12-014") | "F-12-014 claimShift=\(.claimShift) removalShift=\(.removalShift)"' "$OUT/findings.json"
apply --force --no-spot-check
has "The cache holds the verdict for one minute"
plan
jq -r '.entries[] | select(.cluster == "C-12-014") | "\(.cluster) \(.move) source=\(.source): \(.note)"' "$OUT/closing/plan.json"
