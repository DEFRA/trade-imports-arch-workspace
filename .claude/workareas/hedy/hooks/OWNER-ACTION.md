# Owner Action Required: Placement and Wiring of the `hedy` Test Hooks

**Agents cannot do this step. `guard-edits.sh` blocks agent edits under `.claude/hooks/` and to `.claude/settings.json` by design.**

The 2 drafts in this folder enforce the hook-backed rules in `.claude/rules/hedy-tests.md`:

- `hedy-require-sibling-test.sh` refuses a Write that creates a new `.js` file under `hedy/src/` before its sibling `.test.js` exists. Test files, `test-support/`, `__fixtures__/` and rewrites of existing files pass.
- `hedy-forbid-spy-assertions.sh` refuses an Edit or Write to a `.test.js` file under `hedy/` whose new text holds `toHaveBeenCalled`, `toHaveBeenCalledWith` or `toHaveBeenCalledTimes`, unless the text also holds `// allow-spy-assertion: <why>`.

Both were checked by piping hook JSON through them under the system bash 3.2. Each denial prints the workspace's `hookSpecificOutput` JSON and names the allowed form.

## Step 1: Draft Copies

```
cp ~/trade-imports-arch-workspace/.claude/workareas/hedy/hooks/hedy-require-sibling-test.sh ~/trade-imports-arch-workspace/.claude/hooks/
cp ~/trade-imports-arch-workspace/.claude/workareas/hedy/hooks/hedy-forbid-spy-assertions.sh ~/trade-imports-arch-workspace/.claude/hooks/
```

## Step 2: Entries in `.claude/settings.json`

Add these 2 entries to the `hooks.PreToolUse` array, after the existing `Edit|Write|MultiEdit|NotebookEdit` entry:

```json
{
  "matcher": "Write",
  "hooks": [
    {
      "type": "command",
      "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/hedy-require-sibling-test.sh\"",
      "timeout": 10
    }
  ]
},
{
  "matcher": "Edit|Write",
  "hooks": [
    {
      "type": "command",
      "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/hedy-forbid-spy-assertions.sh\"",
      "timeout": 10
    }
  ]
}
```

## Step 3: Live Checks

Start a new Claude Code session from the workspace root so the settings reload, then ask the agent for each of these 2 writes. Each must be refused with a reason naming the allowed form, and neither file may exist afterwards.

```
Write hedy/src/hook-probe.js containing: export const probe = 1
Write hedy/src/hook-probe.test.js containing: expect(fn).toHaveBeenCalled()
```

The first denial names `hedy/src/hook-probe.test.js` as the test to write first. The second names the allowed assertion forms and the override comment.

## Step 4: Clean-Up

Delete the 2 drafts, this note and the empty folder once both checks pass:

```
rm ~/trade-imports-arch-workspace/.claude/workareas/hedy/hooks/hedy-require-sibling-test.sh
rm ~/trade-imports-arch-workspace/.claude/workareas/hedy/hooks/hedy-forbid-spy-assertions.sh
rm ~/trade-imports-arch-workspace/.claude/workareas/hedy/hooks/OWNER-ACTION.md
rmdir ~/trade-imports-arch-workspace/.claude/workareas/hedy/hooks
```
