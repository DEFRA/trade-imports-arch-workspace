#!/usr/bin/env bash
# read-profile: one profile with every section, read to JSON: a reader frame
# over two lines, the defaults, a context page as a link, a run note wrapped
# onto a second line, and preferred names with a wildcard form and a form the
# preferred name contains. Then the refusals: a mode outside review and
# revise, and a context page that does not exist. Every file lives under
# WORK, which this case removes on exit.
set -u
trap 'rm -rf "$WORK"' EXIT

R="$HELPER_DIR/read-profile.sh"
norm() { sed -e "s|$WORK|WORK|g" -e "s|$(cd "$WORK" && pwd -P)|WORK|g"; }

printf '# Context Page\n' > "$WORK/context.md"
cat > "$WORK/editorial-profile.md" <<'PROFILE'
# Editorial Profile: Fixture

The settings the editorial tools read.

## Reader

An engineer who builds the service
and an architect who reviews it.

## Defaults

| Setting | Value |
| --- | --- |
| Mode | revise |
| Intent | distil |
| Document mode | reference |

## Context Pages

- [context.md](context.md)

## Run Notes

- Times use the 24-hour form.
- The working values have their home
  in the Constants table.

## Preferred Names

| Preferred | Plural | Replaced |
| --- | --- | --- |
| sealed cookie value | sealed cookie values | `cookie value`, `sealed val*` |
PROFILE

echo "--- the profile as JSON ---"
bash "$R" "$WORK/editorial-profile.md" 2>&1 | norm
echo "exit ${PIPESTATUS[0]}"

echo "--- a bad mode and a missing context page ---"
printf '## Defaults\n\n| Setting | Value |\n| --- | --- |\n| Mode | rewrite |\n\n## Context Pages\n\n- missing.md\n' > "$WORK/bad.md"
bash "$R" "$WORK/bad.md" 2>&1 | norm
echo "exit ${PIPESTATUS[0]}"
