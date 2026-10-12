# grade-apply-whitespace: the real Apply path (label, plan, apply) exercising
# seven removal cases on one page, each verified none so
# none needs a spot check. Exercises join_removed's indent-from-the-original-line
# repair end to end, not just apply_page in isolation: paragraph head (no
# indent), a four-space indented continuation, a tab-indented continuation, a
# two-space indented list item, a middle-sentence removal (indent empty on both
# sides of the fix so old and new code agree), a whole-line removal (empty
# result either way) and a whole indented body (only the fix drops the leftover
# indent). The page and every removal span come from run-golden's own fixture
# files, not from the held-out evaluation corpus. Byte-exact output is checked
# by the harness's own pages/ diff against expected/grade-apply-whitespace/pages/.
GT="$HELPER_DIR/grade-triage.sh"
PAGE="$WORK/pages/20-whitespace.md"

for c in C-20-001 C-20-002 C-20-003 C-20-004 C-20-005 C-20-006 C-20-007; do
    bash "$GT" label --dir "$WORK" --cluster "$c" --move R > /dev/null || echo "label $c failed"
done

bash "$GT" plan --dir "$WORK" > /dev/null
echo "plan exit-code: $?"
jq -r '.entries | length' "$WORK/closing/plan.json" | xargs -I{} echo "plan entries: {}"

bash "$GT" apply --dir "$WORK" --no-spot-check 2>&1 | grep -v 'not in a git repository'
echo "apply exit-code: ${PIPESTATUS[0]}"

echo "--- applied.json summary ---"
jq -r '.summary | "selected \(.selected) applied \(.applied) skipped \(.skipped) gateFail \(.gateFail)"' "$WORK/closing/applied.json"
jq -r '.entries[] | "\(.cluster) \(.status)"' "$WORK/closing/applied.json"

echo "--- a second apply run applies nothing (idempotent) ---"
HASH_BEFORE=$(openssl dgst -sha256 "$PAGE" | awk '{print $NF}')
bash "$GT" apply --dir "$WORK" --no-spot-check 2>&1 | grep -v 'not in a git repository'
echo "apply exit-code: ${PIPESTATUS[0]}"
HASH_AFTER=$(openssl dgst -sha256 "$PAGE" | awk '{print $NF}')
echo "page byte-identical: $([[ "$HASH_BEFORE" == "$HASH_AFTER" ]] && echo yes || echo no)"

echo "--- the prose gate on the page as apply left it ---"
bash "$HELPER_DIR/../editorial/check-prose.sh" "$PAGE"
echo "check-prose exit-code: $?"
