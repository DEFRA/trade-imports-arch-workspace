# Workspace paths - relative to the workspace root

The workspace has no fixed location. Every path is written relative to the workspace root, the folder that holds `.claude/` and the `Makefile`, so a checkout works wherever it is cloned. `trade-imports-documentation/`, `delivery-info-arch-tooling/` and `trade-imports-schemas/` are children of the root. The workspace references them downward by relative path, and they never reference the workspace upward, which keeps them self-contained and CI-safe.

Start sessions at the workspace root. `.claude/settings.json` returns the Bash tool to the root after every command, so a `cd` moves neither later Bash calls nor the file tools. Never reach the checkout through a symlink, because Claude Code then loads no path-scoped rule and Edit refuses the file.

## Path typing (who writes which form)

| Context | Form |
| --- | --- |
| LLM-typed Bash, file tool paths, skill prose, rules, docs | relative to the root: `.claude/tools/...`, `hedy/...`, `trade-imports-documentation/...` |
| A command inside a child repo | `git -C <child>`, `npm --prefix <child>`, or `(cd <child>; <command>)` in one Bash call |
| Script bodies (`.claude/tools/**`) | the root from the script's own location: `ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd -P)"` |
| Hook bodies and hook wiring (`.claude/hooks/**`, `settings.json`) | `$CLAUDE_PROJECT_DIR` |
| A command a dispatcher prints for the agent to run verbatim | relative to the root, so it matches the allowlist |
| A remedy a script or `hedy` names in an error message | the resolved absolute root, because the reader may be in any folder |
| Child-to-child references | relative (e.g. `file:../delivery-info-arch-tooling`) |

Never, anywhere: a `~/...` or `/Users/<user>/...` path to the workspace, or a bespoke env var (`$WORKSPACE`) in typed commands. The rationale and the Bash call hygiene table: `.claude/best-practices/skills/agent-skills.md`, sections "Workspace root resolution" and "Bash call hygiene".

## Verifying a machine

```
hedy workspace check
```

Each failed check names its next step, including a current folder reached through a symlink, a home-folder link to the checkout and a local allow rule that names the checkout by an absolute path.
