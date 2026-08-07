# editorial skill — audit and improvement plan

> CURRENCY NOTE (7 Aug 2026): cca03d3 inserted the hygiene-pointer
> block near the top of SKILL.md, shifting line references in this
> plan by about +4 (the file is now ~202 lines). No finding is
> invalidated; adjust cited lines when implementing.

Audited: `~/trade-imports-arch-workspace/.claude/skills/editorial/SKILL.md`
(199 lines; the skill's entire surface — no `references/`, no `assets/`,
no `tools/editorial/`, no workarea state).

## TL;DR

The skill's shape is clean: it is deliberately stateless and
prose-driven, and every infrastructure pattern (dispatcher, JSON state,
pre-bake, walker, helpers) is correctly absent rather than missing. The
biggest gap is prose hygiene inside its own worked examples: the
structural rules are stated verbatim in two places (process step 8 and
the style guide), worked example D renders the same unpacking twice, and
two exemplars carry defects (a mismatched lead-in in example A, a
backtick error in example C's "corrected" text) — notable because
exemplar text in an editorial skill is exactly what gets imitated. One
minor hygiene advisory: the mechanical metaphor sweep is typed as a Bash
`grep -niE` where the LLM-native Grep tool is the checklist-preferred
form (mitigated: `Bash(grep:*)` is allowlisted, so it never prompts).

## Findings by pattern

### 1. State as canonical JSON

Correct as-is — prose/in-place is the natural fit. The skill's artifact
is the user's own document, edited in place; there is no run state at
all, and nothing downstream queries anything.

- No `workareas/editorial/` exists (`~/trade-imports-arch-workspace/.claude/workareas/`
  holds only `skill-creator/` and `skills-audit/`), and the skill never
  writes one — consistent with a review/edit skill.
- The output is a narrative the user reads end-to-end (`SKILL.md:129-133`
  routes results as direct edits plus a summary), matching the
  prose-canonical criterion in `patterns.md` §1. No `A2` — there is no
  JSON sidecar and no render helper to mis-apply.

### 2. Scripts call other scripts

N/A — there are zero deterministic setup steps. Every step in the
process (`SKILL.md:14-127`) is judgment work on the target document; a
`start-editorial.sh` dispatcher would be the overkill trap named in
`patterns.md` §2. Correctly absent.

### 3. Pre-baked context

N/A — no fan-out and no repeated fetches. The only external read is the
target document itself, read once by the parent session. Nothing to
bake; no missing pre-bake and no `A7`.

### 4. Bash call hygiene

The skill types exactly one Bash command, and it is chain-free — no
`&&` / `;`, no `cd`, no `find -exec`, no `$VAR`, no resolved `/Users/`
paths anywhere in the file. One advisory-level finding:

| Location | Violation | Corrected form |
| --- | --- | --- |
| `SKILL.md:194` (invoked again by reference at `SKILL.md:89`) | `grep -niE '\b(prices?|priced|...)\b|hangs? on' <file>` — a `grep -n` file sweep typed as Bash; the hygiene table routes file inspection/search to LLM-native tools (`agent-skills.md` → "Bash call hygiene", `patterns.md` §4 "No `awk` / `sed -n` / `grep -n` to inspect files") | Express the sweep tool-neutrally: "search the draft case-insensitively for the pattern `\b(prices?|priced|rides?|bites?|spends?|spent|buys?|kills?|collapses?|leaks?|lands?|forecloses?)\b|hangs? on` (Claude Code: the Grep tool; other agents: `grep -niE`)" |

Severity is low and arguably compliant: the `|` characters sit inside a
quoted regex (not a shell pipe), `Bash(grep:*)` is allowlisted
(`settings.json:21`) so the command never prompts even on drafts outside
the workspace, and the intent — a mechanical regex sweep, not reading
file content in lieu of Read — is the legitimate use grep exists for.
The letter of the checklist catches the `-n` form; the fix is a wording
change, not a behaviour change. See open question 1 before changing it:
the workspace explicitly supports non-Claude agents, for whom the shell
command is the only runnable form.

### 5. Hygiene pointer inside worker personas

N/A — there is no `references/` directory and no fan-out. The whole
skill is parent-loaded prose; per `patterns.md` §5 even the pointer is
optional here. Nothing to flag.

### 6. Idempotent + atomic helpers

N/A — no `tools/editorial/` directory, no helpers, no state files to
mutate, no coverage gates. Correctly absent (the skill has no contract
a helper would enforce — the `A3` correction's "or none" case).

### 7. Walker UX

No walker, and rightly so. A review pass can surface N findings, but
the skill's output behaviour (`SKILL.md:129-133`) applies tightening
edits directly and describes restructures before editing — the user
approves in natural language rather than triaging a findings list. No
`WALKER.md` exists, so no `A1`. If the skill ever grows a
"findings-only, don't edit" review mode producing a triage list, revisit
this pattern; today it does not.

### 8. Allowlist coverage

No gap. The skill introduces no `tools/editorial/` scripts, so per-skill
coverage is moot; the blanket entry
`Bash(~/trade-imports-arch-workspace/.claude/tools/:*)`
(`settings.json:28`) exists regardless, and the one typed command is
covered by `Bash(grep:*)` (`settings.json:21`). Nothing to add.

### 9. Dependencies

Clean. No `metadata.workspace-deps` frontmatter is declared
(`SKILL.md:1-4`), and nothing needs declaring:

- No child-project paths, `npm --prefix`, `node_modules/@defra/`, or
  tooling bin names appear anywhere in the file.
- The only invoked tool is `grep` (`SKILL.md:194`), which ships with
  every bash environment — declaring it would be the boilerplate
  `agent-skills.md` "Dependencies frontmatter" warns against (baseline
  is assumed, never declared; grep is baseline-adjacent in the same
  sense as the shell itself).
- `check-deps.sh` was not run: the AUDITOR criteria gate it on a
  declared `metadata.workspace-deps`, which is absent. No `##
  Dependencies` body section is required, the description correctly
  names no requirement, and there are no stale tokens.

### 10. Prose hygiene (trim diff)

The process/style-guide content itself is tight and worth keeping — the
worked examples are guardrail material per `patterns.md` ("don't cut"
list). The residue is duplication and exemplar defects. Proposed trim
diff for `SKILL.md` (no in-place edits made):

| Lines | Action | Rationale |
| --- | --- | --- |
| 8-12 | Delete the `## Contents` section | Three bullets restating the structure of a 199-line file; fails the skill's own decoration test (`SKILL.md:108-116` — "would removing this confuse the reader?"). |
| 22, 24 | Add the missing full stop to the `SKILL.md:22` bullet; cut "Assume your audience is a cold reader." from `SKILL.md:24` | The step already opens with "Decide who is reading this cold" (`SKILL.md:17`); line 24's second sentence restates it. Keep line 22 — visibility of intermediate material is a distinct point. |
| 38 | Reword the lead-in of worked example A's bullet: drop "*Why is this a question?*" | Example A drills a *statement*, not a question; the lead-in is carried over from example B's shape and contradicts the example it introduces. Also strip the trailing whitespace. |
| 51-56 | Mark example C's before/after texts explicitly (e.g. "Before:" / "After:" labels or blockquotes) | The flawed "before" text is formatted as body prose; a cold reader can take `SKILL.md:51` as skill instruction rather than example material under critique. |
| 56 | Fix the backtick span: "`Authorization: Bearer header`" → "`Authorization: Bearer` header" | The backticks swallow the word "header". This is the *corrected* exemplar in a style-guide skill; defects here get imitated. |
| 62-70 | Collapse worked example D to one rendering of the unpacking: keep the clause-by-clause bullets (64-65) and the consequence sentence (67); delete 68-70 | Lines 68-70 restate the same mechanisms nearly verbatim as merged replacement text. `patterns.md` §10: "Repeated examples — pick one canonical location." (Direction — analysis vs replacement — is open question 3.) Line 70 also lacks a closing full stop. |
| 118-123 vs 150-159 | Collapse step 8 to a pointer at the style guide's "Lists and enumerations" and "Section headings" sections (or vice versa — open question 2) | "Related items with the same shape → table", "Short unrelated items → bullets", "Don't comma-cram", and "headings name what's below concretely" each appear verbatim twice. Two canonical statements of the same mechanical rules will drift. |
| 195 | Drop the date from "Observed failures and their replacements (4 Aug 2026)" | Historical/log residue (`patterns.md` §10 — commit log owns the when). Keep all four failure→replacement pairs: they are anti-pattern guardrails on the "don't cut" list. |
| 49-50, 68-69, 73-74 | Collapse double blank lines | Cosmetic. |

Not proposed for trimming: worked examples A-E as a set (each
demonstrates a distinct behaviour — drilling, question-drilling,
jargon+ambiguity, compression-unpacking, false-open-question
dissolution), the metaphor hard-avoid list, and the observed-failure
replacements.

## Open questions

1. Should the metaphor sweep (`SKILL.md:194`) stay a shell `grep -niE`
   (runnable by the non-Claude agents this workspace explicitly
   supports; already allowlisted, never prompts) or be rephrased around
   the LLM-native Grep tool with the shell form as the fallback for
   other agents? The dual-phrasing corrected form above assumes "both";
   confirm.
2. Which location is canonical for the duplicated structural rules —
   process step 8 (`SKILL.md:118-123`) or the style guide
   (`SKILL.md:150-159`)? The style guide bills itself as "mechanical
   rules, apply without thinking", which argues for it as the canonical
   home with step 8 reduced to a pointer; but step 8 is where the rules
   are encountered during a review pass.
3. In worked example D's collapse, keep the clause-by-clause analysis
   (shows *how* to unpack) or the merged replacement text (shows the
   *finished* form)? The trim above keeps the analysis; the opposite
   call is defensible.
4. Worked example C's first finding ("what is a FIC?") is
   jargon-on-first-use — step 3's territory — while its second ("what is
   the same?") is step 2 ambiguity. Move C under step 3, split it, or
   leave it (the current placement is not wrong, just mixed)?
5. Is the `## Contents` section (`SKILL.md:8-12`) wanted as skim
   navigation despite being decoration by the skill's own standard? The
   trim assumes not; it is a taste call.

## Anti-pattern citations

No catalogue entry (`A1`-`A11`) is violated. Notably the skill
*correctly avoids* the traps its shape invites: no walker over review
findings (`A1`), no JSON sidecar for a prose artifact (`A2`), no helper
toolchain for stateless work (`A3`), no render helper (`A6`), no
dispatcher mode-branching (`A4`). The pattern-4 advisory
(`SKILL.md:194`) is a letter-of-the-checklist wording issue, not an
`A10` (no env vars) nor an `A8` (no chain).

### Proposed new entry

**AN+1. Exemplar text that fails the skill's own rules** (borderline —
prose category rather than shape; propose for the catalogue only if the
trap recurs in other skills).

- **Symptom:** a skill teaching mechanical rules carries worked-example
  or "corrected" text that itself breaks those rules — here, a backtick
  span swallowing a word in the corrected exemplar (`SKILL.md:56`) and a
  lead-in question mismatched to its own example (`SKILL.md:38`).
- **Why it's wrong:** exemplars are the highest-trust prose in a skill;
  agents imitate them verbatim, so a defect in an exemplar propagates
  into every document the skill touches.
- **Correction:** lint exemplar/corrected text against the skill's own
  mechanical rules as part of authoring; in audits, check exemplars
  first, not last.
