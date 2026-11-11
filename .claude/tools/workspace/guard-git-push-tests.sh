#!/bin/bash
# Runs every case against the push guard and prints ok or FAIL per case.
# Invoke with bash; $1 names the guard to test, the live hook by default:
#   bash ~/trade-imports-arch-workspace/.claude/tools/workspace/guard-git-push-tests.sh
#   bash ~/trade-imports-arch-workspace/.claude/tools/workspace/guard-git-push-tests.sh <draft guard>
# The guard reads the command text only, so no case touches a repository.
# Exit 1 when any case fails.
set -u
WS="$HOME/trade-imports-arch-workspace"
GUARD=${1:-$WS/.claude/hooks/guard-git-push.sh}
FAILS=0

run() {
  local expected=$1 cwd=$2 cmd=$3 out actual mark
  out=$(jq -n --arg c "$cmd" --arg d "$cwd" '{tool_name:"Bash",tool_input:{command:$c},cwd:$d}' | bash "$GUARD")
  if [ -n "$out" ]; then actual=deny; else actual=allow; fi
  if [ "$expected" = "$actual" ]; then mark=ok; else mark=FAIL; FAILS=$((FAILS+1)); fi
  printf '%-4s want %-5s got %-5s %s\n' "$mark" "$expected" "$actual" "$cmd"
  if [ -n "$out" ]; then
    printf '       %s\n' "$(printf '%s' "$out" | jq -r '.hookSpecificOutput.permissionDecisionReason' | cut -c1-110)"
  fi
}

echo "== destinations =="
run deny  /tmp  'git push origin main'
run deny  /tmp  'git push origin HEAD:main'
run deny  /tmp  'git push origin HEAD:refs/heads/main'
run deny  /tmp  'git push origin HEAD'
run deny  /tmp  'git push origin'
run deny  /tmp  'git push'
run deny  /tmp  'git -C ~/trade-imports-arch-workspace push origin main'
run deny  /tmp  'cd /tmp; git push origin main'
run allow /tmp  'git push origin HEAD:feature'
run allow /tmp  'git push -u origin feature'
run allow /tmp  'git push origin feature'
run allow /tmp  'git push -n origin HEAD:feature'

echo "== force and every branch =="
run deny  /tmp  'git push --force origin feature'
run deny  /tmp  'git push -f origin feature'
run deny  /tmp  'git push origin +feature'
run deny  /tmp  'git push --force-with-lease origin feature'
run deny  /tmp  'git push --all origin'
run deny  /tmp  'git push --mirror origin'

echo "== pre-push gate =="
run deny  /tmp  'git push --no-verify origin HEAD:feature'
run deny  /tmp  'git push --no-veri origin HEAD:feature'

echo "== hidden pushes =="
run deny  /tmp  'git -c alias.x=push x origin HEAD:main'
run deny  /tmp  'git config alias.x push'
run deny  /tmp  'git config set alias.x push'
run deny  /tmp  "GIT_CONFIG_PARAMETERS=\"'alias.x=push'\" git x origin HEAD:feature"
run deny  /tmp  'GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=alias.x GIT_CONFIG_VALUE_0=push git x origin HEAD:feature'
run deny  /tmp  'git --config-env=alias.x=VAR x origin HEAD:feature'
run deny  /tmp  'git -c include.path=/tmp/x status'
run deny  /tmp  'echo $(git push origin HEAD:main)'
run deny  /tmp  'echo `git push origin HEAD:main`'
run deny  /tmp  'git $(echo push) origin HEAD:main'
run deny  /tmp  'git pu"sh" origin HEAD:main'
run deny  /tmp  'bash -c "git push origin HEAD:main"'
run deny  /tmp  'env git push origin HEAD:main'
run deny  /tmp  '(git push origin HEAD:main)'

echo "== plain commands =="
run allow /tmp  'git status'
run allow /tmp  'git log --oneline'
run allow /tmp  'git config --get alias.x'
run allow /tmp  'git config alias.x'
run allow /tmp  'git -c color.ui=never log --oneline'
run allow /tmp  'git commit -m "push the branch"'
run allow /tmp  'echo push'

echo "fails: $FAILS"
[ "$FAILS" -eq 0 ]
