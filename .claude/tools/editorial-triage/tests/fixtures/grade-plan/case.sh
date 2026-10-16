#!/usr/bin/env bash
# grade-plan: planning and applying the closing moves on one self-contained
# workarea of two pages, twelve clusters, in five sections. The review-mode and
# held sections run on pristine copies of the workarea, taken before anything
# else runs, under variants/.
#
# The workarea. Labels close five clusters (C-02-001 C, C-02-002 R, C-02-005
# K:B, C-03-003 T, C-03-006 C); the grader files close six more, with
# round-2.json re-grading C-03-004 from W to I (later file by name wins) and
# C-02-001 graded R where Ben's label C overrides it. C-03-005 has neither a
# label nor a grade. Three clusters cannot close as they stand: C-03-005
# ungraded, C-03-006 a C whose record carries no rewrite, C-xx-001 an R on a
# set-wide cluster with no page file. Every apply entry carries a verdict on
# its own edit: the two corrections and the reword are verified none, the
# bullet and the repeated phrase are removals verified none, and the
# return-URL clause is a removal verified material with the verifier's note,
# so its Apply line carries the note (Q10).
#
# apply-without-plan: a workarea with no plan names the subcommand that
# writes one.
#
# plan: the plan alone, then with spot checks; plan only reads the pages
# through the manifest. The sampled plan is kept as closing/sampled-plan.md,
# since the apply section re-plans without a sample.
#
# apply: the plan applied to the fixture's own page files. Six entries are
# selected. Three apply: C-02-001 corrects the citation; C-02-002 removes a
# whole bullet and the line it leaves empty inside a list goes with it;
# C-03-001 rewords a verb on 03, whose line 7 still carries the same banned
# word, so the page fails the gate and the entry is recorded gate-fail. Three
# skip: C-02-003 names a phrase the page holds twice, C-02-004 a phrase the
# page no longer holds, C-02-006 a fragment of a sentence that survives.
# C-02-006 carries a material removal verdict (Q10), but a fragment never
# applies, so it never makes --no-spot-check a refusal here; grade-apply-v3
# has the deletion that does. K, O, T and I are never applied. A page apply
# wrote is trusted on the next run through the hash recorded in applied.json;
# a dry run records none.
#
# review-mode: the same run with mode review. The plan and its spot check are
# written as in any run, identical to the sampled plan, and apply refuses
# under every flag, naming the mode: a review-mode run ends with findings,
# retains and questions. No apply record is written and every page is
# byte-identical.
#
# held: the Apply prohibition. Four edit records lose the verdict their move
# needs: F-02-001 (Ben's label C) is nominated with no verdict yet
# (claimShift missing) while its cluster still says none, because the plan
# reads the record, and its one change, the whole edit, is rendered under the
# held line since nothing else shows the edit; F-02-004 (labelled R here) has
# a real removes with a non-empty after and no removal state at all
# (removalShift null), which is no verdict, not the rewrite's; F-02-006
# (graded R) has a removal nobody verified (removalShift missing); F-03-001
# (graded W) is stale. None of the four may reach Apply, whatever the label or
# grade said: each is planned as a T with source held and appears under
# Decide with the state that holds it. The other apply entries are unchanged,
# and the apply step, which takes R, C and W only, never sees them. Its
# labels, plan and spot check are kept under the held- prefix.
set -u
page_hash() { openssl dgst -sha256 "$1" | awk '{print $NF}'; }

VARIANTS="$WORK/variants"
pristine() {  # $1 name: a copy of the workarea as the fixture staged it
    mkdir -p "$VARIANTS/$1"
    for e in "$WORK"/*; do
        [[ "$e" == "$VARIANTS" ]] && continue
        cp -R "$e" "$VARIANTS/$1/"
    done
}
pristine review-mode
pristine held
pristine ignored-contradiction

# ================================================================ apply-without-plan
echo "##### apply-without-plan"
bash "$HELPER_DIR/grade-triage.sh" apply --dir "$WORK"
echo "exit-code: $?"

# ================================================================ plan
echo "##### plan"
# 1. the plan alone, no spot check
bash "$HELPER_DIR/grade-triage.sh" plan --dir "$WORK"
echo "exit-code: $?"
# 2. a spot check of two entries: the draw follows the seed
bash "$HELPER_DIR/grade-triage.sh" plan --dir "$WORK" --sample 2 --seed 7
echo "exit-code: $?"
# 3. --round belongs to the calibration subcommands, not to plan
bash "$HELPER_DIR/grade-triage.sh" plan --dir "$WORK" --round 1
echo "exit-code: $?"
# 4. a sample size that is not a whole number from 1
bash "$HELPER_DIR/grade-triage.sh" plan --dir "$WORK" --sample 0
echo "exit-code: $?"
# 5. three entries drawn with the default seed: the plan the apply section uses
bash "$HELPER_DIR/grade-triage.sh" plan --dir "$WORK" --sample 3 --seed 42
echo "exit-code: $?"
cp "$WORK/closing/plan.md" "$WORK/closing/sampled-plan.md"
mkdir -p "$WORK/sampled"
cp "$WORK/closing/plan.json" "$WORK/closing/plan.md" "$WORK/closing/spot-check.json" "$WORK/sampled/"

# ================================================================ apply
echo "##### apply"
# the pages sit in a git working tree with changes of their own (nothing is committed here)
git -C "$WORK" init -q > /dev/null 2>&1
# 2. a dry run reports what would change and is not refused by the dirty working tree
bash "$HELPER_DIR/grade-triage.sh" apply --dir "$WORK" --dry-run
echo "exit-code: $?"
# 3. --moves narrows the selection to the corrections
bash "$HELPER_DIR/grade-triage.sh" apply --dir "$WORK" --dry-run --moves C
echo "exit-code: $?"
# 4. a real run over a dirty working tree is refused, and names the remedy
bash "$HELPER_DIR/grade-triage.sh" apply --dir "$WORK"
echo "exit-code: $?"
# 5. --force applies; the gate FAIL on 03 makes the exit code 2; the two written pages
#    are recorded with their hashes as written
bash "$HELPER_DIR/grade-triage.sh" apply --dir "$WORK" --force
echo "exit-code: $?"
echo "--- trusted hashes equal the files as written ---"
jq -r '.trusted | to_entries[] | "\(.key) \(.value.hashAfter)"' "$WORK/closing/applied.json" | while read -r p h; do
    [[ "$(openssl dgst -sha256 "$WORK/pages/$p" | awk '{print $NF}')" == "$h" ]] && echo "$p: trusted hash matches" || echo "$p: TRUSTED HASH DIFFERS"
done
# 6. nothing is left to apply: the written pages are trusted, every phrase has either gone
#    or was skipped before
bash "$HELPER_DIR/grade-triage.sh" apply --dir "$WORK" --dry-run
echo "exit-code: $?"
# 7. the moves that belong to the user are never applied
bash "$HELPER_DIR/grade-triage.sh" apply --dir "$WORK" --moves K
echo "exit-code: $?"
# 8. re-planning without --sample leaves the spot check older than the plan, and
#    a real run is refused until a fresh one is drawn and reviewed
bash "$HELPER_DIR/grade-triage.sh" plan --dir "$WORK"
echo "exit-code: $?"
bash "$HELPER_DIR/grade-triage.sh" apply --dir "$WORK"
echo "exit-code: $?"
# 9. --force covers the dirty working tree and nothing else: the spot check still
#    refuses, so the flag the ordinary run carries cannot turn off the review gate
bash "$HELPER_DIR/grade-triage.sh" apply --dir "$WORK" --force
echo "exit-code: $?"
# 10. --no-spot-check is the gate's own override, and takes --force with it here
bash "$HELPER_DIR/grade-triage.sh" apply --dir "$WORK" --force --no-spot-check
echo "exit-code: $?"

# ================================================================ review-mode
echo "##### review-mode"
(
    WORK="$VARIANTS/review-mode"
    jq '.mode = "review"' "$WORK/manifest.json" > "$WORK/manifest.json.tmp" && mv "$WORK/manifest.json.tmp" "$WORK/manifest.json"

    echo "--- page hashes before ---"
    for p in "$WORK"/pages/*.md; do echo "$(basename "$p") $(page_hash "$p")"; done

    bash "$HELPER_DIR/grade-triage.sh" plan --dir "$WORK" --sample 3 --seed 42
    echo "exit-code: $?"
    echo "spot check present: $([[ -f "$WORK/closing/spot-check.json" ]] && echo yes || echo no)"

    # the pages sit in a git working tree with changes of their own, as in the apply section
    git -C "$WORK" init -q > /dev/null 2>&1

    echo "--- apply --dry-run ---"
    bash "$HELPER_DIR/grade-triage.sh" apply --dir "$WORK" --dry-run
    echo "exit-code: $?"
    echo "--- apply --force --no-spot-check ---"
    bash "$HELPER_DIR/grade-triage.sh" apply --dir "$WORK" --force --no-spot-check
    echo "exit-code: $?"
    echo "--- apply ---"
    bash "$HELPER_DIR/grade-triage.sh" apply --dir "$WORK"
    echo "exit-code: $?"

    echo "applied.json absent: $([[ -f "$WORK/closing/applied.json" ]] && echo no || echo yes)"
    echo "--- page hashes after ---"
    for p in "$WORK"/pages/*.md; do echo "$(basename "$p") $(page_hash "$p")"; done
)
echo "--- the review-mode plan is the sampled plan ---"
for f in plan.json plan.md spot-check.json; do
    echo "$f identical: $(cmp -s "$VARIANTS/review-mode/closing/$f" "$WORK/sampled/$f" && echo yes || echo no)"
done

# ================================================================ held
echo "##### held"
(
    WORK="$VARIANTS/held"
    jq '.records |= map(
          if .id == "F-02-001" then .claimShift = "missing" | .changes = [{kind: "reword", original: .before, revised: .after}]
          elif .id == "F-02-004" then .removalShift = null | .removalNote = null
          elif .id == "F-02-006" then .removalShift = "missing" | .removalNote = null
          elif .id == "F-03-001" then .claimShift = "stale"
          else . end)' "$WORK/findings.json" > "$WORK/findings.json.tmp" && mv "$WORK/findings.json.tmp" "$WORK/findings.json"
    bash "$HELPER_DIR/grade-triage.sh" label --dir "$WORK" --cluster C-02-004 --move R

    bash "$HELPER_DIR/grade-triage.sh" plan --dir "$WORK" --sample 3 --seed 42
    echo "exit-code: $?"

    echo "--- held entries ---"
    jq -r '.entries[] | select(.source == "held") | "\(.cluster) \(.move) \(.note)"' "$WORK/closing/plan.json"
    echo "--- the held line renders the edit it holds ---"
    grep -A1 -F 'C-02-001 02-sample-routing.md:7 T held' "$WORK/closing/plan.md"
    echo "--- the cluster of a held record still says none ---"
    jq -r '.clusters[] | select(.id == "C-02-001") | "\(.id) claimShift=\(.claimShift)"' "$WORK/triage.json"
    echo "--- apply entries ---"
    jq -r '[.entries[] | select(.move == "R" or .move == "C" or .move == "W") | .cluster] | join(", ")' "$WORK/closing/plan.json"
    echo "--- counts ---"
    jq -c '{counts, closedWithoutUser, leftToUser, decided, sources}' "$WORK/closing/plan.json"

    echo "--- a dry run applies none of the held clusters ---"
    git -C "$WORK" init -q > /dev/null 2>&1
    bash "$HELPER_DIR/grade-triage.sh" apply --dir "$WORK" --dry-run
    echo "exit-code: $?"
)
cp "$VARIANTS/held/calibration/labels.json" "$WORK/calibration/held-labels.json"
for f in plan.json plan.md spot-check.json; do cp "$VARIANTS/held/closing/$f" "$WORK/closing/held-$f"; done

# ================================================================ ignored-contradiction
echo "##### ignored-contradiction"
(
    WORK="$VARIANTS/ignored-contradiction"
    # C-03-004 (graded I by round 2) becomes an S2 contradiction, and C-02-003
    # (graded R) a second one that is not ignored. The ignored one stays I and is
    # also listed under Problems; the other is planned as before.
    jq '.clusters |= map(if .id == "C-03-004" or .id == "C-02-003" then .kinds = ["contradiction"] | .severity = "S2" else . end)' \
        "$WORK/triage.json" > "$WORK/triage.json.tmp" && mv "$WORK/triage.json.tmp" "$WORK/triage.json"
    bash "$HELPER_DIR/grade-triage.sh" plan --dir "$WORK"
    echo "exit-code: $?"
    echo "--- problems ---"
    jq -r '.problems[] | "\(.cluster) \(.move // "-") \(.reason): \(.note // "")"' "$WORK/closing/plan.json"
    echo "--- the ignored contradiction is still an I entry ---"
    jq -r '.entries[] | select(.cluster == "C-03-004" or .cluster == "C-02-003") | "\(.cluster) \(.move)"' "$WORK/closing/plan.json"
)
cp "$VARIANTS/ignored-contradiction/closing/plan.md" "$WORK/closing/ignored-contradiction-plan.md"
