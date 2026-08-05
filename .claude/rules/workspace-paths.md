# Workspace paths - the canonical root contract

The canonical workspace root is `~/trade-imports-arch-workspace`. On a machine
where the checkout lives elsewhere, set it up once:

```
ln -s <your-checkout> ~/trade-imports-arch-workspace
```

`trade-imports-documentation/` and `delivery-info-arch-tooling/` are children
of the root. The workspace references them downward by canonical path; they
never reference the workspace upward (keeps them self-contained and CI-safe).

## Path typing (who writes which form)

| Context | Form |
|---|---|
| LLM-typed Bash, skill prose, rules, docs | literal `~/trade-imports-arch-workspace/...` |
| Script bodies (`.claude/tools/**`, `.claude/hooks/**`) | literal `$HOME/trade-imports-arch-workspace/...` |
| Commands a script emits for the agent to run | `~` form (matches the allowlist verbatim) |
| Hook wiring in `settings.json` | `$CLAUDE_PROJECT_DIR` (harness-provided) |
| Child-to-child references | relative (e.g. `file:../delivery-info-arch-tooling`) |

Never, anywhere: resolved `/Users/<user>/...` paths, bespoke env vars
(`$WORKSPACE`) in typed commands, or runtime root-discovery
(`$(dirname "$0")`, `git rev-parse --show-toplevel`) in scripts.

Full rationale, the matcher quirks behind these rules, and the Bash call
hygiene table: `~/trade-imports-arch-workspace/.claude/best-practices/skills/agent-skills.md`
(sections "Workspace root resolution" and "Bash call hygiene"). Enforcement
is `.claude/hooks/guard-bash.sh` (denies `/Users/` literals with the fix in
the reason) and `.claude/hooks/guard-edits.sh` (guardrail self-protection).

## Verifying a machine

```
bash ~/trade-imports-arch-workspace/.claude/tools/workspace/check-workspace.sh
```

Reports whether the canonical root resolves and both children are present.
