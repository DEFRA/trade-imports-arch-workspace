#!/usr/bin/env bash
# workflow-order: the editorial-review workflow, run outside the harness by a
# node stub with canned agents, hashes every page before any reader (the
# single-document scope read included), builds one page set, quotes the
# snapshot command so a real shell prints the paths unchanged, refuses a
# missing or unknown mode or intent and a mixed docs/sections input before any
# agent call, and refuses a short, malformed or conflicting snapshot before
# the scope read and the wave. Exit 77 only when node is absent: an error
# inside the stub is an ordinary failure.
set -u
command -v node > /dev/null 2>&1 || { echo "node not found: the workflow stub needs node"; exit 77; }
WORKFLOW="$HELPER_DIR/../../workflows/editorial-review.js" node "$WORK/stub.mjs"
