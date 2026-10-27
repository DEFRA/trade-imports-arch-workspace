#!/bin/bash
# Runs every case against the guard given as $1 and prints ok or FAIL per case.
# Invoke with bash:
#   bash ~/trade-imports-arch-workspace/.claude/workareas/hedy/hooks/guard-bash-tests.sh ~/trade-imports-arch-workspace/.claude/hooks/guard-bash.sh
# The dirty-tree cases create and remove an untracked probe file under hedy/src.
set -u
GUARD=$1
WS="$HOME/trade-imports-arch-workspace"
HEDY="$WS/hedy"
PROBE="$HEDY/src/zz-guard-probe.js"
OUTSIDE="/tmp/hedy-guard-probe.sh"
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

echo "== dirty hedy tree =="
touch "$PROBE"
run deny  /tmp  'hedy hello'
run deny  /tmp  'JIRA_TOKEN=x hedy auth --json'
run deny  /tmp  'echo a; hedy hello'
run deny  /tmp  'false || hedy hello'
run deny  /tmp  'echo x | hedy hello'
run deny  /tmp  'echo $(hedy hello)'
run deny  /tmp  'timeout 30 hedy auth'
run deny  /tmp  'npx hedy auth'
run deny  /tmp  'env hedy auth'
run deny  /tmp  'xargs -I{} hedy auth'
run deny  /tmp  'node ~/trade-imports-arch-workspace/hedy/src/cli.js hello'
run deny  "$HEDY" 'node src/cli.js hello'
run deny  "$HEDY" './src/cli.js hello'
run deny  /tmp  '~/trade-imports-arch-workspace/hedy/src/zz-guard-probe.js'
run deny  /tmp  'bash ~/trade-imports-arch-workspace/hedy/src/zz-guard-probe.js'
run allow "$HEDY" 'npm test'
run allow "$HEDY" 'npm run lint'
run allow "$HEDY" 'npx vitest run src/cli.test.js'
run allow /tmp  'git -C ~/trade-imports-arch-workspace status -- hedy'
run allow /tmp  'ls ~/trade-imports-arch-workspace/hedy/src'
run allow /tmp  'grep -rn whoami ~/trade-imports-arch-workspace/hedy/src'
rm -f "$PROBE"

echo "== clean hedy tree =="
run allow /tmp  'hedy hello'
run allow /tmp  'JIRA_TOKEN=x hedy auth --json'
run allow /tmp  'npx hedy auth'
run allow /tmp  'node ~/trade-imports-arch-workspace/hedy/src/cli.js hello'
run allow "$HEDY" './src/cli.js hello'

echo "== secret reads =="
run deny  /tmp  'grep foo ~/trade-imports-arch-workspace/.env -n'
run deny  /tmp  'grep -n foo ~/trade-imports-arch-workspace/.env'
run deny  /tmp  'jq . ~/trade-imports-arch-workspace/.env'
run deny  /tmp  'cat x | awk 1 ~/trade-imports-arch-workspace/.env'
run deny  /tmp  'echo $(grep token ~/trade-imports-arch-workspace/.env)'
run deny  /tmp  'rg KEY ~/.aws/credentials'
run allow /tmp  'grep -n foo ~/trade-imports-arch-workspace/README.md'
run allow /tmp  'grep -rn auth ~/trade-imports-arch-workspace/.claude/tools'

echo "== chmod =="
run deny  /tmp  'chmod +x x.sh'
run deny  /tmp  'sudo chmod 755 x.sh'
run deny  /tmp  'find . -name "*.sh" -exec chmod +x {} \;'
run deny  /tmp  'ls | xargs chmod +x'
run allow /tmp  'echo chmod'

echo "== executables by path and by launcher =="
printf '#!/bin/bash\necho probe\n' > "$OUTSIDE"
run allow /tmp  '~/trade-imports-arch-workspace/.claude/tools/workspace/check-auth.sh'
run allow /tmp  'bash ~/trade-imports-arch-workspace/.claude/tools/workspace/check-auth.sh'
run deny  /tmp  "$OUTSIDE"
run deny  /tmp  "bash $OUTSIDE"
run allow /tmp  'bash -c "echo hi"'
run allow /tmp  'node -e "console.log(1)"'
run allow /tmp  'python3 -m json.tool'
run allow /tmp  'bash ~/trade-imports-arch-workspace/.claude/tools/editorial/check-prose.sh ~/trade-imports-arch-workspace/analysis/x.md'
rm -f "$OUTSIDE"

echo "== commits =="
run deny  "$WS" 'git commit -m "x" --no-verify'
run deny  "$WS" 'git commit --no-verify -m "x"'
run allow "$WS" 'git commit -m "x"'

echo "== redirects =="
run deny  /tmp  'ls /Users/benoit/projects'
run deny  /tmp  'npm --prefix ~/trade-imports-arch-workspace/hedy ci'
run deny  /tmp  'npm --prefix ~/projects/defra/trade-imports-arch-workspace/hedy install nock'
run allow /tmp  'npm --prefix ~/projects/defra/trade-imports-arch-workspace/hedy test'
run deny  /tmp  'cd x && ls'
run allow /tmp  "awk 'NR>1 && NR<3' f"
run allow /tmp  'jq "select(.a && .b)" f.json'

echo "== plain commands =="
run allow /tmp  'git status'
run allow /tmp  'ls -la'
run allow /tmp  ''

echo "fails: $FAILS"
[ "$FAILS" -eq 0 ]
