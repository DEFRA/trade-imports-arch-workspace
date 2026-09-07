Walk the user through the 9 shape questions for a new workspace skill, record each answer atomically into `decisions.json`, then invoke `scaffold-skill.sh` to materialise the scaffold.

Parent-loaded - you inherit the SKILL.md's path conventions and hygiene rules. No fan-out, no Task spawn.

## Inputs

The parent dispatcher (`start-skill-creator.sh`) has already:

- Parsed `<name>` from the trigger phrase.
- Created `workareas/skill-creator/<name>/decisions.json` with `name`, `started_at`, and an empty `answers` object.
- Printed the path on `MODE: CREATE` line 2.

Your job: fill in `answers.*` via `interview-add-answer.sh`, one question at a time.

## Read first

If not already in context:

- `~/trade-imports-arch-workspace/.claude/best-practices/skills/patterns.md` - the 9-pattern checklist (used to phrase each question).
- `~/trade-imports-arch-workspace/.claude/best-practices/skills/anti-patterns.md` - to call out mismatches as the user answers.
- `~/trade-imports-arch-workspace/.claude/skills/skill-creator/assets/interview-schema.md` - the JSON shape `interview-add-answer.sh` writes into.

## Workflow

Ask each question on its own turn. Each answer informs the next. After every answer, call:

```bash
~/trade-imports-arch-workspace/.claude/tools/skill-creator/interview-add-answer.sh \
    --run-id <name> --field <field> --value '<value-json>'
```

The helper writes atomically (`jq ... > tmp; mv tmp file`).

### Q1 - Purpose

> In one sentence: what does this skill do, and for whom?

Free-form. Save as `answers.purpose` (string).

### Q2 - Dependencies

Before shaping the skill, check whether its purpose overlaps functionality that already exists in a workspace child project, and surface any tools it will need beyond the workspace baseline (bash, curl, jq, git - see `agent-skills.md` → "Dependencies frontmatter").

Probe EVERY Makefile child project (one Bash call each - sub-second, ABSENT-safe; "plausibly relevant" judgment is the failure mode the probe exists to remove):

```bash
~/trade-imports-arch-workspace/.claude/tools/skill-creator/list-project-features.sh \
    --project delivery-info-arch-tooling
```

If a probe reports `STATUS: ABSENT`, tell the user and assess overlap from what you know.

Compare the FACT lines against the Q1 purpose. If nothing overlaps and no beyond-baseline tools are needed, save `resolution: "none"` and move on. If something overlaps, share the design-center context first - skills are portable, self-contained bundles by design; the upstream spec's stance is that most skills need no environment requirements at all - then ask, in the workspace's preference order:

> This overlaps `<feature>` in `<project>`. Three options: **port** - copy the logic into a local `.claude/tools/<name>/` script (self-contained, works on every machine); **build** - build fresh locally (when the overlap is superficial); **depend** - invoke `<project>` at runtime (the skill then becomes unusable on machines without that project and couples to its release cycle). Which one - and if depend, what makes local impractical?

Push back on `depend` once, concretely: name what a port would cost versus what the coupling costs. A good depend justification names actively-maintained logic a port would fork (e.g. the tooling's Confluence ADF pipeline); a thin transform is usually better ported. If the user still chooses depend, that is their call - capture the why verbatim. Awareness, not a gate.

Save as `answers.dependencies` (full object in one call - shape in `assets/interview-schema.md`):

```bash
~/trade-imports-arch-workspace/.claude/tools/skill-creator/interview-add-answer.sh \
    --run-id <name> --field dependencies \
    --value '{"resolution":"depend","declared":["delivery-info-arch-tooling","npm"],"justification":"<why>"}'
```

`declared` lists project names and non-baseline tools; extend it during the helpers question as helper needs emerge. A depend answer implies the dispatcher pre-flights each declared dependency (pattern 9) - note that now; it informs Q4.

### Q3 - State shape

Show the user pattern 1 from `patterns.md` (one paragraph). Ask:

> Does the skill produce a list of N items the user filters / mutates / triages (JSON), or a single narrative artifact the user reads end-to-end (prose)?

Save as `answers.state_shape` (`"json"` or `"prose"`).

If `json`: warn the user that JSON state implies helper scripts (pattern 6) and probably a render helper.

If `prose`: warn the user that prose state means NO walker (pattern 7) and NO render helper (anti-pattern A6).

### Q4 - Dispatcher

> At session start, does the LLM need to run multiple sequential deterministic commands (3+ steps: clone repos, fetch ticket, create workarea, write metadata)?

Save as `answers.dispatcher` (boolean).

If yes: the scaffold will create `start-<name>.sh`. If no, the scaffold won't.

If Q2 declared any dependencies (tools included - not just a `depend` resolution), recommend yes: the pre-flight (pattern 9) needs a home in `start-<name>.sh`. Without a dispatcher the scaffold still proceeds, but audit pattern 9 will flag the missing pre-flight until one exists.

### Q5 - Pre-baked context

> Will fan-out workers (or the parent session) read the same context multiple times (per-repo best-practices bundles, PR diffs, CHANGELOG sections)?

Save as `answers.prebake` (boolean).

If yes but the user can't name a multi-read use case: flag anti-pattern A7 and ask again.

### Q6 - Worker fan-out

> Does the skill fan out work across N independent units (files, packages, versions, items) that each need their own context?

Save as `answers.fanout.enabled` (boolean). If yes, also ask:

> What persona name(s) for the workers? (UPPER_CASE, descriptive - e.g. `FILE_REVIEWER`, `PACKAGE_PLANNER`).

Save as `answers.fanout.workers` (list of strings).

### Q7 - Walker

> Does the skill produce a list of N decisions the user makes one at a time (review findings, upgrade packages)?

Save as `answers.walker` (boolean).

Refuse `walker=true` if `state_shape=prose` (anti-pattern A1) - `interview-add-answer.sh` enforces this. Show the user the entry from `anti-patterns.md` and ask Q3 again if needed.

### Q8 - Helpers

> Which `tools/<name>/` helper scripts does the skill own? List the names (one per line, no `.sh` suffix). At minimum, `start-<name>` if Q4 was yes.

Save as `answers.helpers` (list of strings). An empty list is valid when the skill only reuses scripts from an existing `tools/<other-domain>/` (e.g. the `confluence/` hand tools) - never list another domain's scripts here: a same-domain collision is refused outright (pre-pass, before any write), and another domain's script name would just become a misleading TODO stub in this skill's own tools directory.

The scaffold generates exactly what this list names - nothing is inferred from earlier answers. Prompt for: `render-<name>` if Q3 was `json`, `prepare-<name>` if Q5 was yes, and the ported helper(s) if Q2 resolved to `port`.

As helpers land, apply the script guidance: don't assume tools are installed - any beyond-baseline command a helper needs is added to `answers.dependencies.declared`; and helpers should solve, not defer - fail with a specific remedy, never a raw error.

For each helper, optionally ask for a one-line purpose (captured in `decisions.md` later; not validated).

### Q9 - Triggers

> What trigger phrases activate this skill? (One per line.)

Save as `answers.triggers.phrases` (list).

Then ask:

> How do these triggers disambiguate from Claude Code's built-in `/init` and from neighbouring workspace skills?

Save as `answers.triggers.disambiguation` (string). Required - `scaffold-skill.sh` refuses to run if this is empty.

Also sweep the other direction: grep existing skills' NOT-for clauses for territory the new skill now owns, and fix any that would misroute (e.g. a clause pointing reads at a write skill because the read skill didn't exist yet).

## After all 9 answered

Show the user a recap:

```bash
~/trade-imports-arch-workspace/.claude/tools/skill-creator/render-interview.sh \
    --run-id <name>
```

Ask:

> Recap above. Anything to change before scaffolding?

If yes, re-run `interview-add-answer.sh` for the changed field(s).

If no, scaffold:

```bash
~/trade-imports-arch-workspace/.claude/tools/skill-creator/scaffold-skill.sh \
    --run-id <name>
```

`scaffold-skill.sh` writes:

- `.claude/skills/<name>/SKILL.md` (from the template, with TODO markers; includes `metadata.workspace-deps` frontmatter and a `## Dependencies` body section whenever Q2 declared any tokens or resolved to `depend`).
- `.claude/skills/<name>/references/<WORKER>.md` per Q6 worker.
- `.claude/skills/<name>/assets/<name>-schema.md` if Q3 was `json`.
- `tools/<name>/<helper>.sh` per Q8 entry.
- `.claude/settings.json` allowlist entries when not already covered by the blanket `tools/` entry (atomic jq mutation).
- `.claude/skills/<name>/decisions.md` sidecar (rendered from `decisions.json`).

## Completion output

Print to the user:

```
Skill scaffolded: <name>

Paths:
  .claude/skills/<name>/SKILL.md
  .claude/skills/<name>/references/<WORKER>.md   (if fan-out)
  .claude/skills/<name>/assets/<name>-schema.md   (if JSON state)
  tools/<name>/<helper>.sh                          (one per Q8 entry)

Allowlist coverage confirmed (blanket tools/ entry) or entries appended.
Decisions sidecar: .claude/skills/<name>/decisions.md

Open the SKILL.md and replace the TODO markers with the actual
prose. The scaffold provides structure; you provide content.
```
