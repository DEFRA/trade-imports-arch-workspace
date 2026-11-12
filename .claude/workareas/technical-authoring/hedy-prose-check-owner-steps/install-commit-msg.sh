#!/usr/bin/env bash
# Owner step: installs the commit-msg hook that runs hedy prose check on
# every commit message. Run from the root of the checkout the hook is for:
#   bash .claude/workareas/technical-authoring/hedy-prose-check-owner-steps/install-commit-msg.sh
# The script copies the finished hook beside this script into .githooks/,
# makes the hook executable and stages the hook. Commit the hook afterwards.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
ROOT="$(git rev-parse --show-toplevel)"

cp "$HERE/commit-msg" "$ROOT/.githooks/commit-msg"
chmod +x "$ROOT/.githooks/commit-msg"
git -C "$ROOT" add .githooks/commit-msg
echo "install-commit-msg: .githooks/commit-msg installed and staged in $ROOT"
