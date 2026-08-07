# jira skill — audit and improvement plan

> CURRENCY NOTE (7 Aug 2026): the auth pre-flight now warns on a
> missing `JIRA_PROJECT_KEY` and `fetch.sh` validates `-m` before the
> dry-run preview — TL;DR/§6/§9 claims about those gaps are a dated
> snapshot. Resolved questions were deleted per Step A4.

Audited 2026-08-07 against
`~/trade-imports-arch-workspace/.claude/best-practices/skills/patterns.md`
(9-pattern checklist + prose-hygiene companion). Skill surface: `SKILL.md`
(105 lines), `decisions.md` sidecar, three scripts in
`~/trade-imports-arch-workspace/.claude/tools/jira/` (`fetch.sh`,
`create-ticket.sh`, `auth.sh`). No `references/`, no `assets/`.

## TL;DR

No hard pattern gaps: the skill is a correctly-shaped thin-procedure skill —
prose state, no dispatcher, no fan-out, no walker, baseline-only
dependencies, allowlist covered by the blanket tools entry. What remains is
polish: a body/description inconsistency in the Confluence hand-off
(SKILL.md:38 omits `confluence-read`), a stale-template `decisions.md`
sidecar (old question numbering, no Dependencies section, dead `docs/...`
path spelling), an auth pre-flight that never checks `JIRA_PROJECT_KEY`
even though creation requires it, and two small script robustness nits in
`fetch.sh`.

## Findings by pattern

### 1. State as canonical JSON

Prose/no-state is the right call and is what the skill does. `fetch.sh`
emits a JSON array on stdout that the session reasons over in-flight —
nothing is persisted to a workarea, nothing queries it later, so there is
no canonical-state question to answer. The creation flow's only artifact is
a single-shot draft description file, which patterns.md §6 explicitly names
as the case where state ceremony is over-engineering. No JSON sidecar, no
`render-*.sh` — nothing to flag.

- `SKILL.md:58-60` — output contract is ephemeral stdout JSON, summarised
  for the user.
- `SKILL.md:70-71` — draft description written once via the Write tool.
- `decisions.md:12` records `prose` — matches reality.

### 2. Scripts call other scripts

No dispatcher, correctly. Each mode is a single deterministic call
(`fetch.sh ...`) or one Write + one call (`create-ticket.sh`); there is no
3+-step setup sequence to collapse. Per patterns.md §2's pattern-fit trap a
dispatcher here would be overkill. `decisions.md:17` records the deliberate
`false`.

### 3. Pre-baked context

N/A — no fan-out workers and nothing is fetched more than once per flow, so
there is nothing to pre-bake. Correct absence; no A7 exposure.

### 4. Bash call hygiene

Clean. All four LLM-typed Bash blocks are single commands on literal
`~/trade-imports-arch-workspace/...` paths:

| Location | Command | Verdict |
|---|---|---|
| `SKILL.md:24-26` | `auth.sh` | clean |
| `SKILL.md:44-46` | `fetch.sh KEY KEY` | clean |
| `SKILL.md:48-50` | `fetch.sh '<JQL>'` (single quoted arg) | clean |
| `SKILL.md:75-77` | `create-ticket.sh -t ... -D /tmp/jira-draft.md "..."` | clean |

No `&&`/`;`/`|` chains, no `cd`, no `find -exec`, no `$VAR`, no resolved
`/Users/` paths, no `python3 -c`. Adjacent (not a Bash-hygiene violation,
since it is the Write tool): `SKILL.md:70-71` directs the draft to
`/tmp/jira-draft.md`, outside the workspace — the Write prompts every run,
and `.claude/rules/dot-claude-layout.md` routes skill-run state to
`workareas/<skill>/`. Counter-consideration: workareas are tracked, and a
transient ticket draft in the git audit trail may be unwanted. Raised as
open question 1 rather than a finding.

### 5. Hygiene block placement

N/A — no `references/` directory and no fan-out workers, so there is no
worker persona needing the pointer. `SKILL.md:13-15` carries the correct
one-line pointer to `agent-skills.md` (points, does not re-inline the rule
table).

### 6. Idempotent + atomic helpers

No helper mutates workspace state, so the atomic `jq > tmp; mv` shape and
`processed_at` markers are N/A. `fetch.sh` writes only to a `mktemp -d`
scratch dir removed by an EXIT trap (`fetch.sh:123-124`);
`create-ticket.sh` mutates remote JIRA only. No coverage gates exist, so
the `jq -e` vs `[[ -s file ]]` distinction doesn't arise. Script-quality
nits found while reading (polish, not pattern violations):

- `fetch.sh:129-131` + `fetch.sh:159-175` — with `-m 0` (or any MAX < 1)
  the pagination loop exits before writing any page file, so the unmatched
  glob `"$PAGES"/issues.*.json` reaches `jq` as a literal filename and the
  script dies with jq's "Could not open file" instead of a clean "nothing
  fetched" message (or an argument-validation error).
- `fetch.sh:39` uses `set -eu`; `create-ticket.sh:21` and `auth.sh:5` use
  `set -e` only. Both guard their variables manually so nothing is unsafe —
  cosmetic inconsistency.
- `create-ticket.sh:230-252` — the `-a` assignment runs after creation
  succeeds and downgrades failure to a warning. Reasonable two-phase remote
  behaviour, and it is reported; no change needed.

### 7. Walker UX

N/A — no N-item triage. A fetch can return N issues, but the user consumes
a summary (`SKILL.md:60`), not per-item decisions. No `WALKER.md` exists,
so no A1 exposure. `decisions.md:33` records the deliberate `false`.

### 8. Allowlist coverage

Covered. The blanket entry
`Bash(~/trade-imports-arch-workspace/.claude/tools/:*)` at
`.claude/settings.json:28` prefixes all three `tools/jira/` scripts — the
live-settings shape patterns.md §8 accepts. No per-skill pair needed; no
gap.

### 9. Dependencies

Clean by absence, verified:

- **Invoked:** bash, curl, jq only (plus standard POSIX utilities — `awk`
  in the help extractor `fetch.sh:49`, `grep`, `mktemp`, `cat` — inside
  script bodies, within the assumed bash environment). No child-project
  paths, no `npm --prefix`, no `node_modules/@defra/`, no beyond-baseline
  tool.
- **Declared:** nothing — correct, so no `## Dependencies` body section,
  description requirement, or dispatcher pre-flight applies, and no stale
  tokens exist.
- **check-deps.sh:** run 2026-08-07 —
  `deps-check: ok — 1 skill(s) declare dependencies, all resolve (5 declare none)`;
  jira is among the five declaring none.
- **Credentials:** correctly modelled as auth, not deps
  (`agent-skills.md` → "Credentials are not dependencies"): `auth.sh`
  exists and `check-auth.sh` auto-discovers it via its `tools/*/auth.sh`
  glob (`check-auth.sh:15`).

One polish gap in the credential story: `SKILL.md:20-22` names
`JIRA_PROJECT_KEY` as required for creation and `SKILL.md:23` routes any
unset-variable failure to the pre-flight — but `auth.sh` checks only
`JIRA_USER`/`JIRA_TOKEN`/`JIRA_BASE_URL`, never `JIRA_PROJECT_KEY`. A
machine can pass the pre-flight and still fail creation
(`create-ticket.sh:184` catches it with a clean `:?` message, so the
failure is named — but the doctor the skill points at cannot diagnose it).
Suggest `auth.sh` additionally report `JIRA_PROJECT_KEY` presence, marked
as creation-only (see open question 2 for failure vs warning semantics).

### 10. Prose hygiene (trim diff)

The prose is tight — 105 lines, scaffold-conformant ("When to use" table
and "Scripts cheat-sheet" are the scaffold-template shapes, not
duplication; the intro's "owns no logic, only the procedure" is a single
load-bearing phrase). Three micro-items, one of which is a correctness fix
rather than a trim:

| File:lines | Change | Rationale |
|---|---|---|
| `SKILL.md:38` | Replace "NOT for Confluence pages - use the `confluence-publish` skill." with "NOT for Confluence pages - reads are `confluence-read`, publishing is `confluence-publish`." | Body contradicts the description (`SKILL.md:3`), which correctly splits reads/publishing across two skills. As written, the body routes a Confluence *read* to the publish skill. |
| `SKILL.md:36-37` | Collapse "those tools were deliberately not retained; extend `tools/jira/` before promising them" to "no such tools exist - extend `tools/jira/` before promising them" | "deliberately not retained" is historical/migration residue (patterns.md §10 category 1); the commit log owns that rationale. The actionable half survives. |
| `decisions.md:13` (also `:18,:23,:29,:34`) | Respell `docs/best-practices/skills/patterns.md` as `patterns.md §N` (the form lines 18-34 already use) or the full `~/trade-imports-arch-workspace/.claude/best-practices/...` path | No `docs/` directory exists at the workspace root — stale spelling (patterns.md §10 category "stale references"). |

Sidecar drift (structural, beyond a line trim): `decisions.md` follows the
pre-dependencies interview template — 8 sections with State shape at §2 —
while `scaffold-template.md:140-192` now specifies 9 sections with
`## 2. Dependencies` (Resolution/Declared/Why) second and everything after
renumbered. jira's dependency resolution ("none — baseline curl+jq,
logic ported into tools/jira/") is exactly the kind of decision the sidecar
exists to record and is currently absent. Proposed: add the Dependencies
section and renumber to match the current template ("do not delete
entries" is honoured — nothing is removed).

## Open questions

1. Draft location for creation: keep `/tmp/jira-draft.md` (ephemeral, but
   the Write tool prompts every run since `/tmp` is outside the workspace)
   or move to `~/trade-imports-arch-workspace/.claude/workareas/jira/draft.md`
   per `dot-claude-layout.md` ("state written by skill runs")? The catch:
   workareas are tracked, so drafts would enter git history — is that
   audit-trail signal or noise?
3. The dead `docs/best-practices/...` spelling survives in the three
   pre-dependencies `decisions.md` sidecars (jira, mermaid-check,
   confluence-publish) — AUDITOR.md's own instances were fixed this
   branch. Fix only jira's sidecar in this pass, or sweep all three
   as one change?
4. Is regenerating `decisions.md` to the current 9-question template in
   scope for the implementation pass, or is sidecar-template migration a
   skill-creator concern to handle across all pre-dependencies skills at
   once?

## Anti-pattern citations

No findings map to catalogue entries `A1`-`A11` — the skill's deliberate
absences (no walker, no JSON sidecar, no dispatcher, no fan-out, no
pre-bake, no env vars in typed commands) are exactly the shapes those
entries police, and each absence checks out above (§1, §2, §3, §5, §7 of
this plan).

**Proposed new entry — sidecar drift after template evolution.**
Discovered here rather than in the catalogue: a `decisions.md` written by
an older CREATE interview silently diverges from the current
`scaffold-template.md` question set (jira's lacks the Dependencies
section), so future audits/refactors read an incomplete decision record
while believing it mirrors the interview. Symptom: sidecar headings do not
match `scaffold-template.md`'s sidecar section. Correction: audits diff
the sidecar's section list against the current template and backfill
missing sections (never deleting existing entries). Worth adding to
`anti-patterns.md` only if a second pre-dependencies sidecar shows the
same drift — otherwise it is a one-off migration chore.
