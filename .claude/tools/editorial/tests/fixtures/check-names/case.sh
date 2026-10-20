#!/usr/bin/env bash
# check-names: the preferred-names check on one page that holds every case the
# check promises: a lower-case, a sentence-initial, a title-case and an
# all-capitals hit; a plural; a name already preferred, which the guard
# leaves alone; a hit inside inline code, inside a fenced block and on an HTML
# comment line, which stay; and a hit in a heading, which --fix reports
# because the anchor changes. Then the check mode's exit, the fixed page, a
# clean re-check, a profile with no Preferred Names table, and one with a
# form that is not plain words. Every file lives under WORK, which this case
# removes on exit.
set -u
trap 'rm -rf "$WORK"' EXIT

C="$HELPER_DIR/check-names.sh"
norm() { sed "s|$WORK|WORK|g"; }

cat > "$WORK/editorial-profile.md" <<'PROFILE'
# Editorial Profile: Fixture

## Preferred Names

| Preferred | Plural | Replaced |
| --- | --- | --- |
| session assertion | session assertions | `snapshot`, `snapshots` |
| sealed cookie value | sealed cookie values | `cookie value`, `cookie values`, `sealed value`, `sealed values` |
PROFILE

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
bash "$C" --profile "$WORK/editorial-profile.md" "$WORK/page.md" 2>&1 | norm
echo "exit ${PIPESTATUS[0]}"

echo "--- fix mode ---"
bash "$C" --fix --profile "$WORK/editorial-profile.md" "$WORK/page.md" 2>&1 | norm
echo "exit ${PIPESTATUS[0]}"

echo "--- the fixed page ---"
cat "$WORK/page.md"

echo "--- re-check ---"
bash "$C" --profile "$WORK/editorial-profile.md" "$WORK/page.md" 2>&1 | norm
echo "exit ${PIPESTATUS[0]}"

echo "--- a profile with no Preferred Names table ---"
printf '# Editorial Profile: Empty\n\n## Reader\n\nAn engineer.\n' > "$WORK/empty.md"
bash "$C" --profile "$WORK/empty.md" "$WORK/page.md" 2>&1 | norm
echo "exit ${PIPESTATUS[0]}"

echo "--- a form that is not plain words ---"
printf '## Preferred Names\n\n| Preferred | Plural | Replaced |\n| --- | --- | --- |\n| token | tokens | `tok(en)?` |\n' > "$WORK/bad.md"
bash "$C" --profile "$WORK/bad.md" "$WORK/page.md" 2>&1 | norm
echo "exit ${PIPESTATUS[0]}"
