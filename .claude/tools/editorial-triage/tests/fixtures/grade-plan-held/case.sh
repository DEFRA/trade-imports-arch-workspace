#!/usr/bin/env bash
# grade-plan-held: the Apply prohibition. On the grade-plan workarea, four edit records
# lose the verdict their move needs: F-02-001 (Ben's label C) is nominated with no verdict
# yet (claimShift missing) while its cluster still says none, because the plan reads the
# record, and its one change, the whole edit, is rendered under the held line since
# nothing else shows the edit; F-02-004 (labelled R here) has a real removes with a
# non-empty after and no removal state at all (removalShift null), which is no verdict,
# not the rewrite's; F-02-006 (graded R) has a removal nobody verified (removalShift
# missing); F-03-001 (graded W) is stale. None of the four may reach Apply, whatever the
# label or grade said: each is planned as a T with source held and appears under Decide
# with the state that holds it. The other apply entries are unchanged, and the apply step,
# which takes R, C and W only, never sees them.
set -u

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
