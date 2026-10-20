#!/usr/bin/env bash
# check-names: the preferred-names check on one page that holds every case the
# check promises: a lower-case, a sentence-initial, a title-case and an
# all-capitals hit; a plural; a name already preferred, which the lookbehind
# leaves alone; a hit inside inline code, inside a fenced block and on an HTML
# comment line, which stay; and a hit in a heading, which --fix reports
# because the anchor changes. Then the check mode's exit, the fixed page, a
# clean re-check, and a register with no names array. Every file lives under
# WORK, which this case removes on exit.
set -u
trap 'rm -rf "$WORK"' EXIT

C="$HELPER_DIR/check-names.sh"
norm() { sed "s|$WORK|WORK|g"; }

cat > "$WORK/names.json" <<'JSON'
{"names": [
  {"preferred": "session assertion", "plural": "session assertions", "replaced": ["\\bsnapshot(s?)\\b"]},
  {"preferred": "sealed cookie value", "plural": "sealed cookie values", "replaced": ["(?<!sealed )\\bcookie value(s?)\\b", "\\bsealed value(s?)\\b"]}
]}
JSON

cat > "$WORK/page.md" <<'PAGE'
# The Sealed Value

The frontend reads the sealed value and asks for a snapshot.
Sealed values expire. The Sealed Value travels in a header.
A SNAPSHOT is short-lived, and two snapshots are never shared.
The sealed cookie value is already right, and so is the cookie value's owner.
Inline code stays: `sealed value` and `snapshot`.
<!-- provenance: sealed value -->

```
sealed value inside a fence
```
PAGE

echo "--- check mode ---"
bash "$C" --names "$WORK/names.json" "$WORK/page.md" 2>&1 | norm
echo "exit ${PIPESTATUS[0]}"

echo "--- fix mode ---"
bash "$C" --fix --names "$WORK/names.json" "$WORK/page.md" 2>&1 | norm
echo "exit ${PIPESTATUS[0]}"

echo "--- the fixed page ---"
cat "$WORK/page.md"

echo "--- re-check ---"
bash "$C" --names "$WORK/names.json" "$WORK/page.md" 2>&1 | norm
echo "exit ${PIPESTATUS[0]}"

echo "--- a register with no names array ---"
printf '{"replaced": []}\n' > "$WORK/bad.json"
bash "$C" --names "$WORK/bad.json" "$WORK/page.md" 2>&1 | norm
echo "exit ${PIPESTATUS[0]}"
