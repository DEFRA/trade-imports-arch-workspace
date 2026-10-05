#!/usr/bin/env bash
# build-hash-pages: --hash-pages prints the pages' SHA-256 keyed by filename
# and exits without a workarea. Cases: two pages, one through a path with a
# space; the tracked fixture page through its tilde path, as one shell word;
# no path; a missing path; a directory; an unreadable file; two paths sharing
# a filename. The work directory's entries are the same after every call.
set -u
page_hash() { openssl dgst -sha256 "$1" | awk '{print $NF}'; }

mkdir -p "$WORK/space dir"
cp "$WORK/pages/13-stale.md" "$WORK/space dir/13-stale.md"
BEFORE=$(ls -1A "$WORK" | sort)

run() {  # $1 label, then the paths
  echo "--- $1 ---"; shift
  bash "$HELPER_DIR/build-triage.sh" --hash-pages "$@"
  echo "exit $?"
}

run "two pages, one through a path with a space" "$WORK/pages/12-claims.md" "$WORK/space dir/13-stale.md"
echo "expected 12-claims.md $(page_hash "$WORK/pages/12-claims.md")"
echo "expected 13-stale.md $(page_hash "$WORK/space dir/13-stale.md")"

run "the tracked fixture page through its tilde path" '~/trade-imports-arch-workspace/.claude/tools/editorial-triage/tests/fixtures/build-claim-diff/pages/12-claims.md'
echo "expected 12-claims.md $(page_hash "$HELPER_DIR/tests/fixtures/build-claim-diff/pages/12-claims.md")"

run "no path"
run "a missing path" "$WORK/pages/nope.md"
run "a directory" "$WORK/pages"

cp "$WORK/pages/12-claims.md" "$WORK/unreadable.md"
chmod 000 "$WORK/unreadable.md"
run "an unreadable file" "$WORK/unreadable.md"
chmod 644 "$WORK/unreadable.md"
rm -f "$WORK/unreadable.md"

run "two paths sharing a filename" "$WORK/pages/13-stale.md" "$WORK/space dir/13-stale.md"

echo "--- work directory ---"
echo "out present: $([[ -e "$WORK/out" ]] && echo yes || echo no)"
AFTER=$(ls -1A "$WORK" | sort)
if [[ "$BEFORE" == "$AFTER" ]]; then echo "entries unchanged"; else echo "ENTRIES CHANGED"; diff <(printf '%s\n' "$BEFORE") <(printf '%s\n' "$AFTER"); fi
