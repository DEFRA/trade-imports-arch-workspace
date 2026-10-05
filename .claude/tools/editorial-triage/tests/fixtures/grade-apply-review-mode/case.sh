#!/usr/bin/env bash
# grade-apply-review-mode: the grade-plan fixture's run with mode review. The
# plan and its spot check are written as in any run, and apply refuses under
# every flag, naming the mode: a review-mode run ends with findings, retains
# and questions. No apply record is written and every page is byte-identical.
set -u
page_hash() { openssl dgst -sha256 "$1" | awk '{print $NF}'; }

echo "--- page hashes before ---"
for p in "$WORK"/pages/*.md; do echo "$(basename "$p") $(page_hash "$p")"; done

bash "$HELPER_DIR/grade-triage.sh" plan --dir "$WORK" --sample 3 --seed 42
echo "exit-code: $?"
echo "spot check present: $([[ -f "$WORK/closing/spot-check.json" ]] && echo yes || echo no)"

# the pages sit in a git working tree with changes of their own, as in grade-apply
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
