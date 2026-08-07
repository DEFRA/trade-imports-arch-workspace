# mermaid-check skill — audit and improvement plan

> CURRENCY NOTE (7 Aug 2026): the robustness gaps described in the
> TL;DR, §6 and §9 (temp litter, missing traps, block-name collision,
> environment-failure-as-FAIL, the A12 instance) have all since been
> fixed; those sections are a dated snapshot. Resolved questions were
> deleted per Step A4.

Audited 2026-08-07 against `.claude/best-practices/skills/patterns.md`
(9-pattern checklist), `anti-patterns.md`, and `agent-skills.md`.

Inventory: `SKILL.md` (189 lines), `decisions.md` sidecar,
`references/` and `assets/` both empty, two helpers under
`.claude/tools/mermaid-check/` (`start-mermaid-check.sh`,
`render-mermaid.sh`). No `metadata.workspace-deps` frontmatter.

## TL;DR

The skill is structurally sound: correct no-state prose shape, a real
dispatcher (not a wrapper), clean LLM-typed Bash, blanket allowlist
coverage, and a dependency chain the workspace docs themselves cite as
the canonical soft probe. The biggest gap is in helper robustness:
when `npx` is present but the mermaid-cli fetch fails, an environment
failure is reported as per-diagram `FAIL` lines — a machine problem
masquerading as N broken diagrams — and both scripts leak temp files
(orphaned `mktemp` siblings, no `trap` cleanup). Smaller: two
rot-prone prose claims (the "allowlist entries added when this skill
was scaffolded" line, and the "Both therefore agree on which renderer
runs" parity claim, which is mechanically untrue in two of three
rungs) plus a modest trim diff.

## Findings by pattern

### 1. State as canonical JSON

Correct: the skill produces no durable state at all. Rendering happens
in temp directories, the report is ephemeral stdout, and no workarea
is written. Prose/no-state is the natural fit for a verify-and-report
gate; nothing downstream queries per-diagram results (the one consumer,
`confluence-publish`, reads the summary in-session). No JSON sidecar,
no `render-X.sh`, so no A2/A6 exposure.

- `SKILL.md:10-12` — "Nothing is written to your documents: rendering
  happens in a temp directory and source files are never modified."
- `decisions.md:12-13` — CREATE interview recorded `prose`.

### 2. Scripts call other scripts

Present and correctly sized. `start-mermaid-check.sh` is not a 1-2-step
setup wrapper (the "overkill" trap) — it is the substantive sweep
engine: file collection with prune rules
(`start-mermaid-check.sh:29-40`), fenced-block extraction
(`:69-91`), per-diagram dispatch to `render-mermaid.sh` (`:61,88`),
and a gate-usable exit code (`:105-106`).

- `MODE: VERIFY` is the first stdout line (`start-mermaid-check.sh:49`),
  per convention. It is the only mode — no FRESH/REFRESH branching, so
  A4 is avoided rather than committed. Harmless as-is.
- The helper split (sweep vs single-render) is documented as a boundary
  in both script headers (`start-mermaid-check.sh:2-4`,
  `render-mermaid.sh:2-5`) and mirrored in the SKILL.md cheat-sheet
  (`SKILL.md:177-181`). Good.

### 3. Pre-baked context

N/A — no fan-out workers, and nothing on the hot path is read more
than once per run. Correct absence; adding a pre-bake here would be A7.

### 4. Bash call hygiene

Clean. Both LLM-typed Bash blocks are single commands on literal
`~/trade-imports-arch-workspace/...` paths:

- `SKILL.md:70-72` — dispatcher invocation. No chain, no `$VAR`.
- `SKILL.md:113-115` — `render-mermaid.sh --text '...' --label '...'`.
  Multi-line single-quoted argument, still one command; explicitly
  designed so a drafted diagram can be checked with no pipe and no
  caller-side temp file (`SKILL.md:122-124`), which is hygiene-aware
  tool design, not just hygiene-compliant prose.

No `&&`/`;`/`|`, no `cd ... &&`, no `find -exec`, no `/Users/` forms,
no `python3 -c` anywhere in SKILL.md. Inline mentions of
`npm run build:mmd` / `npm run validate:c4` (`SKILL.md:19,39-40,154`)
are descriptive references, not typed commands — not violations,
though an agent copying `npm run build:mmd` verbatim would need the
`npm --prefix` form; the confluence-publish skill owns that path.

### 5. Hygiene block placement

N/A — `references/` is empty and the skill spawns no workers. The
hygiene pointer sits in `SKILL.md:20-22` as a one-line pointer to
`agent-skills.md`, not a re-inlined block — correct. The subagent
story is handled without a worker persona: any agent calls
`render-mermaid.sh --text` directly (`SKILL.md:108-126`), which is a
leaner shape than a `references/` worker would be.

### 6. Idempotent + atomic helpers

No state files are mutated, so atomic-write and `processed_at` markers
are N/A; re-running is naturally idempotent. The `[[ -s "$block" ]]`
at `start-mermaid-check.sh:85` is a skip-empty-extraction guard, not a
completion gate over state — not the brittle pattern the checklist
targets. However, four robustness gaps in the helpers:

- **Environment failure reported as diagram failure** —
  `render-mermaid.sh:78-88`: the no-`npx` rung degrades gracefully
  with a remedy-naming ERROR (`:81-84`), but if `npx` exists and the
  `@mermaid-js/mermaid-cli` fetch fails (offline machine, registry
  outage), the non-zero rc falls through to the `FAIL <label>` branch
  (`:97-102`) with a grep-derived npm error as the "reason". A sweep
  then prints one `FAIL` per diagram — indistinguishable from N parse
  errors. Fix: detect the npx/fetch failure distinctly and emit a
  single `ERROR:` line naming the remedy, exiting without a
  per-diagram verdict.
- **Orphaned mktemp siblings** — `render-mermaid.sh:44`
  (`tmp_src=$(mktemp -t ...).mmd`) and `:71`
  (`tmp_out=$(mktemp -t ...).svg`): `mktemp` creates the extensionless
  file, the script uses the `.mmd`/`.svg` sibling, and cleanup
  (`:105-106`) removes only the siblings. Two zero-byte temp files leak
  per invocation.
- **No `trap` cleanup** — `start-mermaid-check.sh:96` (`rm -rf
  "$workdir"`) and the `rm -f` block in `render-mermaid.sh:105-107`
  only run on normal exit; an interrupt or a killed hung `mmdc` leaves
  the temp tree behind. Add `trap ... EXIT`.
- **Temp-name collision** — `start-mermaid-check.sh:77`:
  `tr '/.' '__'` maps `a/b.md` and `a_b.md` to the same `safe` name;
  same-index blocks from colliding files overwrite each other inside
  one run. Unlikely in practice; cheap to fix (append a counter or use
  `mktemp` per block).

### 7. Walker UX

N/A — failures are fixed by the agent in the Verify loop
(`SKILL.md:89-96`), not triaged one-at-a-time by the user. No
`WALKER.md`, correctly; a walker here would be A1. The completion
output contract (`SKILL.md:157-171`), including the "never report a
pass count without the scan count" guard (`:103-105`), is the right
UX for a gate.

### 8. Allowlist coverage

Covered by the blanket entry — `settings.json:28`:
`Bash(~/trade-imports-arch-workspace/.claude/tools/:*)`. No per-skill
`tools/mermaid-check/` pair exists, and none is needed. No hard gap.

One prose inaccuracy rides on this: `SKILL.md:124-126` claims "Both
scripts are covered by the allowlist entries added when this skill was
scaffolded" — no mermaid-check-specific entries exist in the live
settings.json; coverage comes from the blanket entry. Historically
framed and now false in mechanism (true in effect). Trim under
pattern 10.

### 9. Dependencies

No `metadata.workspace-deps`, and that is correct per doctrine:
`agent-skills.md` ("Dependencies frontmatter") cites this exact chain
as the canonical soft probe — "mermaid-check trying the tooling's
mmdc, then npx". Verified:

- Probe rungs `render-mermaid.sh:59-65` are `[[ -x ]]` checks on
  `delivery-info-arch-tooling` and `trade-imports-documentation`
  node_modules with fallthrough — soft, correctly undeclared.
- Last rung degrades gracefully in the no-`npx` case with a
  remedy-naming error (`render-mermaid.sh:81-84`) — satisfies the
  "last rung must not die raw" rule. The npx-present-but-fetch-fails
  case does die raw into the FAIL vocabulary (see pattern 6, first
  bullet) — the graceful-degrade guarantee currently covers only one
  of the two failure shapes of that rung.
- `check-deps.sh` run 2026-08-07: clean — "1 skill(s) declare
  dependencies, all resolve (5 declare none)"; mermaid-check correctly
  among the none-declarers. No stale tokens (none declared, both
  helpers invoked from SKILL.md).
- No `## Dependencies` body section and no requirement named in the
  description — both correct for a non-declaring skill.

**Parity claim drift** — `SKILL.md:183-186` says `render-mermaid.sh`
resolves `mmdc` "the same way" as
`delivery-info-arch-tooling/lib/diagrams/convert-mmd.js` and "Both
therefore agree on which renderer runs". Checked against
`convert-mmd.js:11-25`: rung 1 matches; rung 2 differs (shell
hardcodes `trade-imports-documentation/node_modules/.bin`, JS uses
`process.cwd()/node_modules/.bin` — they coincide only when the JS
runs from the docs project, which is the normal case); rung 3 differs
(`npx --yes @mermaid-js/mermaid-cli mmdc` vs bare `npx mmdc`). The
claim is directionally true and mechanically false, and nothing keeps
the two in sync. Soften the sentence (pattern 10) rather than chase
literal parity.

### 10. Prose hygiene (trim diff)

The SKILL.md is close to tight; the trims are small and targeted.
Proposed diff (NOT applied):

| File:lines | Action | Rationale |
|---|---|---|
| `SKILL.md:124-126` | Replace "Both scripts are covered by the allowlist entries added when this skill was scaffolded, so a subagent..." with "Both scripts are covered by the workspace tools allowlist, so a subagent can call them without a permission prompt." | Historical residue; factually stale (coverage is the blanket entry, per pattern 8). |
| `SKILL.md:62-66` | Delete the paragraph "The mechanical rules in the third row are borrowed deliberately..." | Verbose rationale; the table row at `:53` already carries the point in its parenthetical ("mechanical rules from the editorial style guide"). |
| `SKILL.md:37-41` | Collapse to one sentence keeping the LikeC4 command names; drop the wording/acronym sentence (already in the description, the ownership table, and `:60-61`). | Same NOT-for stated three times in one file plus the frontmatter. |
| `SKILL.md:184-186` | Replace "...the same way ... does: the library's node_modules/.bin, then the documentation project's, then npx as a fallback. Both therefore agree on which renderer runs." with "...following the same preference order as `convert-mmd.js` (`findMmdc()`): tooling install first, docs install, then npx." | Parity claim is mechanically untrue in rungs 2-3 (pattern 9 finding); the softened form states intent without asserting sync that nothing enforces. |
| `decisions.md:13` | `docs/best-practices/skills/patterns.md` → `.claude/best-practices/skills/patterns.md` | Stale path shape; the sidecar cites a location that does not exist. Cosmetic (sidecar is not agent-loaded). |

Considered and kept:

- `SKILL.md:187-189` (never pipe `mmdc`) duplicates
  `render-mermaid.sh:92-94`, but it is an anti-pattern guardrail —
  patterns.md's "don't cut" list — and the SKILL.md copy is the
  LLM-facing layer.
- `SKILL.md:6-12` intro rhetoric ("worse than no diagram") — two
  sentences of "why"; borderline, but it earns its place by motivating
  the unprompted-verify rule at `:33-34`. Optional trim at the user's
  discretion.
- Empty `references/` and `assets/` directories — local scaffolding
  residue, invisible to git (empty dirs are untracked). No action.

## Open questions

3. **Trim aggressiveness** — apply the optional intro trim
   (`SKILL.md:6-12`) and the `:37-41` collapse, or only the two
   factually-stale corrections (`:124-126`, `:184-186`)?

## Anti-pattern citations

No catalogue entry (A1-A11) is committed by this skill. Notable
avoidances, for the record: A1/A2 (no walker, no JSON sidecar for the
ephemeral report), A4 (single mode, no FRESH/REFRESH), A7 (no
speculative pre-bake), A9 (no custom subagent type — the `--text`
entry point replaces a worker persona), A10 (all literal `~` paths),
A11 (both emitted-command surfaces are covered by the blanket
allowlist entry).

### Proposed new entry

The pattern-6/9 finding does not fit an existing entry; proposed for
the catalogue:

**A12. Environment failure reported in the domain vocabulary**

*Symptom:* a helper's dependency fallback chain degrades gracefully
when the tool is absent at probe time, but a runtime failure of the
last rung (fetch fails, binary present-but-broken) falls through to
the per-item verdict path — a sweep reports `FAIL` for every item,
indistinguishable from N genuine content failures.

*Why it's wrong:* the graceful-degrade rule (pattern 9) exists so a
machine-setup problem names its remedy once; leaking it into the
domain report costs the user a false debugging session per item.

*Correction:* separate the vocabularies — content verdicts get
`PASS`/`FAIL`, environment problems get one `ERROR:` line naming the
remedy, and the run stops rather than iterating. Documented instance:
`render-mermaid.sh` handles missing-`npx` correctly but reports a
failed mermaid-cli fetch as a per-diagram `FAIL`.
