# confluence-read skill — audit and improvement plan

> CURRENCY NOTE (7 Aug 2026): the hygiene-pointer link finding (§4/ TL;DR) is VOID — canon now blesses relative markdown links (`agent-skills.md` → "Markdown links are the one exception"); do not apply it. The SCRIPT_DIR/dead-variable half of the shared-tools observation was fixed. Resolved questions were deleted per Step A4.

Audited 2026-08-07 against `~/trade-imports-arch-workspace/.claude/best-practices/skills/patterns.md` (9-pattern checklist + prose companion) and `anti-patterns.md`.

Skill surface read: `SKILL.md` (87 lines), `decisions.md`; no `references/` or `assets/` directories exist. Owning tool domain: `~/trade-imports-arch-workspace/.claude/tools/confluence/` (shared hand-tool domain — `auth.sh`, `page.sh`, `html_to_md.js` on the skill's path; `create-page.sh`, `update-page.sh`, `sync-docs.sh`, `clean-docs.sh`, `README.md` in the same domain but outside it).

## TL;DR

This is one of the cleanest skills in the workspace: a minimal read-only wrapper whose shape choices (no state, no dispatcher, no fan-out, no walker) are each correct and recorded in `decisions.md`. The only in-scope finding is cosmetic — the hygiene-pointer link in `SKILL.md:13` uses a relative `../../` path where the workspace path convention prescribes the `~`-anchored absolute form. A second, out-of-hot-path observation: three scripts in the shared `tools/confluence/` domain use `SCRIPT_DIR=$(dirname BASH_SOURCE)` runtime discovery, which the workspace-paths rule forbids in script bodies — but none of those scripts are invoked by this skill. Prose is tight; no trim diff is warranted beyond two optional micro-collapses.

## Findings by pattern

### 1. State as canonical JSON

Correct as prose/ephemeral. The skill produces no persistent state at all — the fetched page and the analysis live in the session, and nothing downstream queries them. There is no `workareas/confluence-read/` and none is needed; no JSON sidecar, no render helper.

- `decisions.md:19-20` records the choice (prose, patterns.md §1).
- Completion output (`SKILL.md:68-75`) is transient session text, not an artifact — nothing to promote to JSON. No A2.

### 2. Scripts call other scripts

Correctly absent. Setup is exactly two deterministic commands — auth pre-flight (`SKILL.md:40`) then fetch (`SKILL.md:49`) — which is under the 3+ threshold where a dispatcher earns its keep; patterns.md §2 explicitly calls a dispatcher for 1-2 steps overkill.

- `decisions.md:24` records dispatcher: false.
- The auth step is skippable when already verified this session (`SKILL.md:37`), so the common re-invocation cost is one command.

### 3. Pre-baked context

N/A — there is no fan-out and the page is fetched once and read once in the same session. Inlining the fetch in the consuming step is exactly what A7's correction prescribes; the skill already does it. `decisions.md:29` records the choice.

### 4. Bash call hygiene

The two LLM-typed Bash blocks are clean: one command per call, literal `~/trade-imports-arch-workspace/...` form, no chains, no `$VAR`, no `/Users/` literals, no `python3 -c`.

- `SKILL.md:40` — `.../tools/confluence/auth.sh` — clean.
- `SKILL.md:49` — `.../tools/confluence/page.sh "<url-or-id>" md` — clean.

One path-convention violation (markdown link, not a command — no permission-prompt risk, but the convention in `agent-skills.md` → "Path conventions" covers cross-workspace references in SKILL.md):

| Location | Violation | Corrected form |
| --- | --- | --- |
| `SKILL.md:13` | `[agent-skills.md](../../best-practices/skills/agent-skills.md)` — relative form for a cross-workspace reference | `~/trade-imports-arch-workspace/.claude/best-practices/skills/agent-skills.md` |

Script-body observation (path-typing contract in `rules/workspace-paths.md`: script bodies hardcode `$HOME/trade-imports-arch-workspace/...`; runtime discovery is banned "never, anywhere"):

- `page.sh:80` — compliant: hardcodes `$HOME/trade-imports-arch-workspace/.claude/tools/confluence/html_to_md.js`.
- `sync-docs.sh:22` + `sync-docs.sh:112` — uses `SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"` to locate the same `html_to_md.js` sibling — inconsistent with `page.sh` and against the contract's letter.
- `clean-docs.sh:14,25` — same `SCRIPT_DIR` pattern to exec `sync-docs.sh`.
- `update-page.sh:28` — defines `SCRIPT_DIR` and never uses it (dead variable).

None of these three scripts are on confluence-read's path (`SKILL.md:79-87` cheat-sheet scopes the skill to `auth.sh`, `page.sh`, `html_to_md.js`), so this is a shared-domain cleanup, not a skill defect — see Open question 1.

### 5. Hygiene block placement

N/A — no `references/` directory and no fan-out workers (`decisions.md:33-35`). The parent-loaded `SKILL.md` itself carries the one-line hygiene pointer (`SKILL.md:11-13`), pointing rather than inlining — correct placement, modulo the link-form nit in pattern 4.

### 6. Idempotent + atomic helpers

N/A for atomicity on the skill's path — `auth.sh` and `page.sh` are read-only fetch-and-print; nothing mutates state, and re-runs are naturally idempotent. Error gates check JSON fields, not file presence:

- `page.sh:64` — `jq -e '.statusCode'` API-error gate. Good shape.
- `auth.sh:23` — `jq -e '.type'` auth verification. Good shape.

Minor helper-quality nits (cosmetic, no behavioural risk):

- `page.sh:38-41` and `page.sh:54-57` duplicate the `JIRA_TOKEN` presence check.
- `page.sh:13` / `auth.sh:5` use bare `set -e` while the domain's write-side scripts use `set -euo pipefail` — inconsistent strictness within the domain.

(Shared-domain, off-path: `sync-docs.sh:202` writes page files with a direct `>` redirect, not the tmp+mv atomic shape — relevant only if a sync-oriented skill ever formalises around it.)

### 7. Walker UX

N/A — the output is a single analysis narrative, not an N-item triage list. No `WALKER.md` exists and none should (`decisions.md:39-41`). No A1.

### 8. Allowlist coverage

Covered. `.claude/settings.json:28` carries the blanket prefix entry `Bash(~/trade-imports-arch-workspace/.claude/tools/:*)`, which patterns.md §8 names as the live shape covering every tools/ domain — including `tools/confluence/`. No per-skill pair needed; no gap.

### 9. Dependencies

Clean. No `metadata.workspace-deps` declared (`SKILL.md:1-4` frontmatter has no `metadata:` block), and nothing requires one:

- Invocations are baseline only (bash, curl, jq) plus `node` — which is a textbook soft probe: `page.sh:78` gates on `command -v node` and the last rung degrades gracefully to the raw HTML body with a notice (`page.sh:82-83`), documented in `SKILL.md:32-33`. Per `agent-skills.md` → "Dependencies frontmatter", soft probes are correctly left undeclared.
- Credentials (`JIRA_USER`/`JIRA_TOKEN`/`JIRA_BASE_URL`, `SKILL.md:29-31`) are auth, not dependencies, and are pre-flighted by Step 1's `auth.sh` — the prescribed channel.
- No child-project paths, `npm --prefix`, or `node_modules/@defra/` anywhere in the skill. The `trade-imports-documentation` mention (`SKILL.md:26-27`) is a routing NOT-for clause, not an invocation.
- `check-deps.sh` run 2026-08-07: "ok — 1 skill(s) declare dependencies, all resolve (5 declare none)" — confluence-read correctly among the non-declaring five.
- No declared tokens, so no stale tokens and no missing `## Dependencies` section or dispatcher pre-flight to require.

### 10. Prose hygiene (trim diff)

The prose is tight — 87 lines, no historical residue, no stale script references, no forward-looking notes. No trim diff is required. Two optional micro-collapses if the user wants maximum economy (both defensible to keep as-is):

- `SKILL.md:17-21` — the three-row "When to use" table exists to encode one routing difference ("fetch" stops after Step 2). Could collapse to a single sentence under Step 2 ("If the ask was a bare fetch, stop here and present the page."), deleting the table. Rationale: patterns.md "over-defensive bullets making the same point" — the trigger list already lives in the description.
- `SKILL.md:23-27` — the NOT-for paragraph restates the description's NOT-for clause nearly verbatim. Body-level restatement is common across workspace skills and arguably deliberate (description = trigger layer, body = execution layer), so this is flagged only for consistency review, not as a defect.

`decisions.md` is the CREATE interview record — durable audit trail per `agent-skills.md` → "Runtime workareas" — and is not residue; keep.

## Open questions

1. Should a future confluence-sync skill claim ownership of `sync-docs.sh`/`clean-docs.sh`?
2. Do the two optional prose micro-collapses (When-to-use table, NOT-for restatement) meet the user's bar for a trim pass, given the body-restates-description pattern may be a deliberate workspace convention?

## Anti-pattern citations

No catalogue entry (A1-A11) is triggered:

- A1 (walker on single artifact) — avoided; no walker exists.
- A2 (JSON where prose fits) — avoided; no JSON sidecar.
- A3 (multi-helper toolchain) — avoided; zero mutation helpers.
- A4 (FRESH/REFRESH dispatcher) — avoided; no dispatcher.
- A5 (fan-out for judgment work) — avoided; analysis stays in the parent session.
- A6 (render helper) — avoided; none exists.
- A7 (pre-bake read-once context) — avoided; fetch is inlined in the consuming step.
- A8 (hardcoded command chains) — none in prose or scripts' emitted commands.
- A9 (custom subagent_type) — N/A; no workers.
- A10 (env vars in LLM-typed Bash) — none; both typed commands use the literal `~` form.
- A11 (dispatcher-emitted commands off-allowlist) — N/A; no dispatcher, and both typed commands match the blanket tools entry.

### Proposed new catalogue entry

**A13. Runtime path discovery in tools scripts.** (renumbered from A12 — mermaid-check's plan claimed that slot first; the catalogue ends at A11 today) Symptom: a `tools/<domain>/` script derives its location via `SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"` to reach a sibling script or asset (`sync-docs.sh:22`, `clean-docs.sh:14`; `update-page.sh:28` carries it unused). Why it's wrong: `rules/workspace-paths.md` bans runtime root-discovery in script bodies "never, anywhere" — the contract is a hardcoded `$HOME/trade-imports-arch-workspace/...` literal (the form `page.sh:80` already uses for the same sibling), and discovery reintroduces the move-between-depths failure mode the contract exists to kill, while splitting the domain into two path idioms. Correction: replace `$SCRIPT_DIR/...` with the literal `$HOME/trade-imports-arch-workspace/.claude/tools/<domain>/...` form; delete unused `SCRIPT_DIR` definitions. Caveat for the catalogue entry: sibling discovery is less failure-prone than the root walk-ups the rule's rationale describes, so the entry should cite consistency with the contract (one idiom per domain) as the primary driver.
