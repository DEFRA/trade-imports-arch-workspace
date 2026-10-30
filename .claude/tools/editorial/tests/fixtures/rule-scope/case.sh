#!/usr/bin/env bash
# rule-scope: the scope library, the write-time hook and the lint's rule
# checks on a fake workspace. The fake is a checkout reached through a
# HOME-level symlink, as on a real machine, with the scripts copied into
# their canonical places and run with HOME=WORK. It holds a rule with the
# real frontmatter shape (seven paths globs and one gate-exclude glob), a
# small language.md, a tracked root README.md, a tracked AGENTS.md holding
# one FAIL line in HEAD, a .gitignore holding .claude/workareas/ and
# drafts/, a nested clone trade-imports-documentation-events/ with its own
# repository, a trade-imports-documentation/ clone whose astro/ folder no
# glob names, and an analysis/ repository without an ignore file. The hook
# runs on synthetic Write and MultiEdit JSON for each place, with --scope,
# with --outside-scope, without either, and with a missing or empty rule;
# --record keeps only the gated paths. The lint runs on the clean fake,
# then on rules and settings that break checks 4, 5 and 5b. Every
# temporary file lives under WORK, which this case removes on exit; every
# path under WORK is normalised to a stable label.
set -u
trap 'rm -rf "$WORK"' EXIT

# A pre-commit hook exports the outer repository's git variables. Unset
# them, so the fake repositories, the hook's baseline and check-ignore
# read their own index and never the commit in progress.
unset GIT_DIR GIT_INDEX_FILE GIT_WORK_TREE GIT_PREFIX GIT_OBJECT_DIRECTORY GIT_ALTERNATE_OBJECT_DIRECTORIES

FIX="$HELPER_DIR/tests/fixtures/rule-scope"
REALWORK=$(cd "$WORK" && pwd -P)
norm() { sed -e "s|$REALWORK|WORK|g" -e "s|$WORK|WORK|g"; }
gitc() { git -C "$1" -c user.name=t -c user.email=t@t -c commit.gpgsign=false -c core.hooksPath=/dev/null "${@:2}"; }
repo() { mkdir -p "$1"; git -C "$1" init -q > /dev/null 2>&1; }

CO="$WORK/checkout"
W="$WORK/trade-imports-arch-workspace"
mkdir -p "$CO"
ln -s "$CO" "$W"

mkdir -p "$CO/.claude/tools/editorial" "$CO/.claude/tools/workspace" \
  "$CO/.claude/best-practices/writing" "$CO/.claude/rules" \
  "$CO/.claude/workareas/editorial" "$CO/hedy" "$CO/sub" "$CO/drafts" "$WORK/outside" "$WORK/state"
cp "$HELPER_DIR/check-prose.sh" "$HELPER_DIR/hook-check-written.sh" "$HELPER_DIR/rule-scope.sh" "$CO/.claude/tools/editorial/"
cp "$HELPER_DIR/../workspace/lint-skills.sh" "$CO/.claude/tools/workspace/"
cp "$FIX/language.md" "$CO/.claude/best-practices/writing/language.md"
cp "$FIX/authoring-voice.md" "$CO/.claude/rules/authoring-voice.md"
printf 'CHILDREN := trade-imports-documentation\n' > "$CO/Makefile"
printf '.claude/workareas/\ndrafts/\nanalysis/\ntrade-imports-documentation*/\n' > "$CO/.gitignore"
printf '# Fake Workspace\n\nA clean line.\n' > "$CO/README.md"
printf '# Agents\n\nWe leverage the cache.\n' > "$CO/AGENTS.md"
repo "$CO"
gitc "$CO" add -A
gitc "$CO" commit -q -m fixture

repo "$CO/trade-imports-documentation-events/docs/systems/EUDP"
repo "$CO/trade-imports-documentation/astro"
repo "$CO/analysis"

RULE="$W/.claude/rules/authoring-voice.md"
HOOK="$W/.claude/tools/editorial/hook-check-written.sh"
LIB="$W/.claude/tools/editorial/rule-scope.sh"
LINT="$W/.claude/tools/workspace/lint-skills.sh"
EVENTS="$W/trade-imports-documentation-events/docs/systems/EUDP/probe.md"
CONTENT=$'We leverage the cache.\nThe portal opens.\nThe flow is seamless.\n'

scope() {  # $1 label, then rule-scope.sh's arguments
  local label=$1; shift
  echo "--- rule-scope: $label ---"
  HOME="$WORK" bash "$LIB" "$@" 2>&1 | norm
  echo "exit ${PIPESTATUS[0]}"
}
hook() {  # $1 label, $2 file path, then the hook's arguments
  local label=$1 fp=$2; shift 2
  echo "--- hook: $label ---"
  jq -n --arg fp "$fp" --arg c "$CONTENT" '{session_id:"probe",tool_name:"Write",tool_input:{file_path:$fp,content:$c}}' 2>/dev/null \
    | HOME="$WORK" TMPDIR="$WORK/state" bash "$HOOK" "$@" 2>&1 | norm
  echo "exit ${PIPESTATUS[1]}"
}
lint() {  # $1 label
  echo "--- lint: $1 ---"
  HOME="$WORK" bash "$LINT" 2>&1 | norm
  echo "exit ${PIPESTATUS[0]}"
}

scope "list all" --rule "$RULE" --list all
scope "list gate-exclude" --rule "$RULE" --list gate-exclude
for g in "README.md" ".claude/**/*.md" "analysis/**" "trade-imports-documentation*/docs/**/*.md" "hedy/?.md"; do
  scope "ere $g" --ere "$g"
done
scope "path in the nested clone" --rule "$RULE" --path "$EVENTS"
scope "path of the root README" --rule "$RULE" --path "$W/README.md"
scope "path of the root README through the real checkout" --rule "$RULE" --path "$CO/README.md"
scope "path of a README below the root" --rule "$RULE" --path "$W/sub/README.md"
scope "path in a skill folder" --rule "$RULE" --path "$W/.claude/skills/x/SKILL.md"
scope "path under hedy" --rule "$RULE" --path "$W/hedy/notes.md"
scope "path in a gitignored workarea" --rule "$RULE" --path "$W/.claude/workareas/editorial/draft.md"
scope "path in a workarea folder not yet created" --rule "$RULE" --path "$W/.claude/workareas/new/draft.md"
scope "path under analysis" --rule "$RULE" --path "$W/analysis/scratch.md"
scope "path in the astro folder" --rule "$RULE" --path "$W/trade-imports-documentation/astro/README.md"
scope "path outside the workspace" --rule "$RULE" --path "$WORK/outside/probe.md"
scope "a missing rule" --rule "$WORK/nope.md" --path "$EVENTS"
scope "no arguments"

hook "nested clone page" "$EVENTS" --scope "$RULE"
hook "nested clone page, outside-scope" "$EVENTS" --scope "$RULE" --outside-scope
hook "gitignored workarea" "$W/.claude/workareas/editorial/draft.md" --scope "$RULE"
hook "analysis draft" "$W/analysis/scratch.md" --scope "$RULE"
hook "analysis draft, outside-scope" "$W/analysis/scratch.md" --scope "$RULE" --outside-scope
hook "astro page" "$W/trade-imports-documentation/astro/README.md" --scope "$RULE"
hook "outside file" "$WORK/outside/probe.md" --scope "$RULE"
hook "outside file, outside-scope" "$WORK/outside/probe.md" --scope "$RULE" --outside-scope
hook "outside file, no scope" "$WORK/outside/probe.md"
hook "text file under hedy" "$W/hedy/notes.txt" --scope "$RULE"
hook "text file under hedy, outside-scope" "$W/hedy/notes.txt" --scope "$RULE" --outside-scope
hook "root README, nothing excused" "$W/README.md" --scope "$RULE"
hook "root AGENTS.md, the HEAD line excused" "$W/AGENTS.md" --scope "$RULE"

echo "--- hook: MultiEdit on the nested clone page ---"
jq -n --arg fp "$EVENTS" '{session_id:"probe",tool_name:"MultiEdit",tool_input:{file_path:$fp,edits:[{old_string:"a",new_string:"We leverage the cache."},{old_string:"b",new_string:"The portal opens."}]}}' \
  | HOME="$WORK" TMPDIR="$WORK/state" bash "$HOOK" --scope "$RULE" 2>&1 | norm
echo "exit ${PIPESTATUS[1]}"

printf -- '---\ngate-exclude:\n  - "analysis/**"\n---\n' > "$WORK/no-paths.md"
hook "a missing rule" "$EVENTS" --scope "$WORK/nope.md"
hook "a rule with no paths" "$EVENTS" --scope "$WORK/no-paths.md"
hook "outside-scope without scope" "$EVENTS" --outside-scope

hook "record a gated page" "$EVENTS" --scope "$RULE" --record
hook "record a skipped analysis draft" "$W/analysis/scratch.md" --scope "$RULE" --record
hook "record a skipped outside file" "$WORK/outside/probe.md" --scope "$RULE" --record
echo "--- state file ---"
norm < "$WORK/state/claude-editorial-probe.paths"

lint "the clean fake"
cp "$FIX/bad-flow.md" "$CO/.claude/rules/flow.md"
lint "a rule in flow style"
rm "$CO/.claude/rules/flow.md"
cp "$FIX/bad-shape.md" "$CO/.claude/rules/shape.md"
lint "a badly shaped rule"
rm "$CO/.claude/rules/shape.md"
printf 'The rule also cites ("Just Enuf").\n' >> "$CO/.claude/rules/authoring-voice.md"
lint "a citation that is no heading"
cp "$FIX/authoring-voice.md" "$CO/.claude/rules/authoring-voice.md"
jq -n '{hooks:{PostToolUse:[{matcher:"Write|Edit|MultiEdit",hooks:[{type:"command",command:"bash \"$CLAUDE_PROJECT_DIR/.claude/tools/editorial/hook-check-written.sh\" --record"}]}]}}' > "$CO/.claude/settings.json"
lint "settings wire the hook without scope"
jq -n '{hooks:{PostToolUse:[{matcher:"Write|Edit|MultiEdit",hooks:[{type:"command",command:"bash \"$CLAUDE_PROJECT_DIR/.claude/tools/editorial/hook-check-written.sh\" --scope \"$CLAUDE_PROJECT_DIR/.claude/rules/missing.md\" --record"}]}]}}' > "$CO/.claude/settings.json"
lint "settings name a missing scope rule"
jq -n '{hooks:{PostToolUse:[{matcher:"Write|Edit|MultiEdit",hooks:[{type:"command",command:"bash \"$CLAUDE_PROJECT_DIR/.claude/tools/editorial/hook-check-written.sh\" --scope \"$CLAUDE_PROJECT_DIR/.claude/rules/authoring-voice.md\" --record"}]}]}}' > "$CO/.claude/settings.json"
lint "settings name the scope rule"
