# Enforcement - making rules deterministic in Claude Code

Skill content, CLAUDE.md and rules files are advisory context: the model weighs them and can deviate, as the em-dash that reached a PR body on 13 Aug 2026 proved despite the pr skill pointing at the editorial style guide. Hooks and scripts are deterministic: they always run. The working principle for this estate: **every mechanical rule needs a deterministic check on the path to the artefact**; prose in a SKILL.md documents the gate, it is never the gate.

## Hook events and their powers

| Event | Fires | Power |
| --- | --- | --- |
| `PreToolUse` | before a tool call | can deny it. Estate idiom (see `hooks/guard-bash.sh`): print `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":...}}` and exit 0, with the reason naming the sanctioned alternative |
| `PostToolUse` | after a tool call completes | cannot undo it; exit 2 + stderr injects the message as corrective feedback the model must address next turn |
| `Stop` | when the model tries to end its turn | exit 2 + stderr blocks the turn from ending, with the reason telling the model what to fix; `stop_hook_active` in the input JSON marks repeat blocks |
| `UserPromptSubmit`, `SessionStart`, `PreCompact`, `SubagentStop`, ... | prompt/session lifecycle | context injection and gating at those points |

All hooks receive JSON on stdin (`session_id`, `hook_event_name`, and for tool events `tool_name` / `tool_input`). Unit-test a hook by piping synthetic JSON: `jq -n '{...}' | bash <hook>.sh`.

## Scoping hooks to a skill

SKILL.md frontmatter accepts a `hooks:` key with the same shape as `settings.json` hooks. These register when the skill is invoked and last for the skill's lifetime - the sanctioned way to enforce a skill's own contract without a global hook. Both this estate's uses live in the pr and editorial skills (write-time prose gate, editorial Stop gate), calling scripts in `.claude/tools/editorial/`.

## Where enforcement code lives

| Location | Wired from | Who edits |
| --- | --- | --- |
| `.claude/hooks/` | `settings.json` (global, every session) | the owner only - `guard-edits.sh` blocks agent edits to both |
| `.claude/tools/<domain>/` | skill frontmatter hooks, skill steps, other scripts | agents; covered by the blanket `Bash(~/trade-imports-arch-workspace/.claude/tools/:*)` allowlist |
| `.githooks/` | `core.hooksPath` (set by `make link`) | agents; runs for every git user regardless of AI tooling |

Scripts under `tools/` are the agent-agnostic layer: colleagues on other AI tools get the same refusals (`create-pr.sh` exit 2) even though frontmatter hooks are Claude Code specific.

## Estate idioms for gate scripts

- Exit vocabulary: 0 pass, 1 usage or environment error, 2 policy violation (`create-pr.sh`, `check-prose.sh`).
- Refusals name the offending line, the governing doc and the remedy - the model self-corrects in one retry instead of stalling.
- Mask data before matching: blank fenced code blocks and backtick spans (and, in bash guards, quoted spans) so exemplar text in docs that teach a rule never trips its gate.
- Target choke points (PR creation, turn end, commit) rather than every file operation.

## References

- Hooks reference: https://code.claude.com/docs/en/hooks
- Hooks guide and patterns: https://code.claude.com/docs/en/hooks-guide
- Skills (frontmatter incl. `hooks:`): https://code.claude.com/docs/en/skills
- The `.claude/` directory: https://code.claude.com/docs/en/claude-directory
- The worked example: the editorial gate layers in [`../../skills/editorial/SKILL.md`](../../skills/editorial/SKILL.md) (step 10) and `.claude/tools/editorial/`
