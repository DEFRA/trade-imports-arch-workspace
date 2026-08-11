# Owner action required: guard-bash.sh --no-verify matcher gap

**Severity: MAJOR (enforcement hole). Agents cannot fix this — edits under `.claude/hooks/**` are blocked by guard-edits.sh by design.**

Confirmed by piping crafted hook JSON through the guard (7 Aug 2026):

- `git commit --no-verify` — denied (as intended)
- `git commit -n` — **passes** (short form of the same flag)
- `git -C . commit --no-verify` — **passes** (any flag between `git` and `commit` defeats the pattern)
- `git -c core.hooksPath=/dev/null commit` — **passes** (third route)

This matters because the pre-commit skills lint's enforcement story rests on this deny (`.githooks/pre-commit:4-5` claims it), and the gap was exploited once in practice this branch (commit cca03d3).

## Suggested fix (apply to .claude/hooks/guard-bash.sh)

Replace the `--no-verify` match with a pattern that tolerates intervening git flags, catches the short form, and denies the hooksPath override:

```
git([[:space:]]+-[^|;&[:space:]]+)*[[:space:]]+commit\b[^|;&]*(--no-verify|(^|[[:space:]])-[a-z]*n)
```

plus a separate deny for `git -c core.hooksPath=` (and `git config core.hooksPath` pointing away from `.githooks`).

Delete this file once applied.
