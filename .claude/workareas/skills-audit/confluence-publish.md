# confluence-publish skill — audit and improvement plan

Audited: 2026-08-06. Sources read: `SKILL.md` (181 lines), `decisions.md`,
`tools/confluence-publish/start-confluence-publish.sh` (192 lines),
`.claude/settings.json`, `check-deps.sh` output.

## TL;DR

The skill is well-shaped: prose state, a real dispatcher with a strict
`MODE:` contract, no speculative fan-out/walker/pre-bake machinery, and a
pattern-9 retrofit that is mostly exemplary. The biggest gap is that the
declared `npm` dependency has **no dispatcher pre-flight** (`command -v
npm`) — a missing npm surfaces as a raw `exec` failure in `--publish`
mode, exactly the shape pattern 9 forbids. Smaller items: the diagram
gate is presence-only (a stale PNG publishes silently), emitted
`BUILD_CMD` lines fall outside the allowlist so builds always prompt
(while `PUBLISH_CMD` was deliberately engineered not to), and a malformed
config JSON can break the "first stdout line is MODE" contract. Prose is
tight; the only trim candidates are two workspace-wide boilerplate blocks.

## Findings by pattern

### 1. State as canonical JSON

Prose is the right call and is recorded as such. The skill produces no
persistent state at all — the dispatcher emits ephemeral FACT lines the
session consumes, and the artifact is the completion report the user
reads once. Nothing queries anything; no JSON sidecar, no render helper,
no workarea. Correct shape, no A2.

- `decisions.md:10-13` — state shape recorded as prose at CREATE time.
- `SKILL.md:162-172` — completion output is a short narrative block.
- No `workareas/confluence-publish/` path exists or is referenced. Fine.

### 2. Scripts call other scripts

Present and earns its keep — the pre-flight collapses ~8 deterministic
checks (repo presence, tooling presence, npm-install, path resolution,
credentials, API reachability, publishPaths membership, space mapping,
diagram inventory) into one call. Not overkill.

- `SKILL.md:85-87` — single Step 0 entry command.
- `start-confluence-publish.sh:41-46` — `blocked()` prints `MODE: BLOCKED`
  first; `:169` prints `MODE: PUBLISHING`; `:179` prints `MODE: READY`.
  The MODE-first contract holds on every designed path.
- **Robustness nit:** on a malformed `confluence-config.json`, `jq` at
  `start-confluence-publish.sh:126` fails under `set -e` and the script
  dies on jq's stderr with **no MODE line at all**, breaking the branch
  contract. And the jq inside the process substitution at `:113` fails
  silently, leaving `MEMBER=no` and a *misleading* BLOCKED reason ("page
  is not listed in publishPaths") when the real problem is bad JSON. Fix:
  validate the config once up front (`jq empty "$CONFIG" || blocked
  "config is not valid JSON: $CONFIG"`) right after the `-f` check at
  `:104`.

### 3. Pre-baked context

N/A — there is no fan-out and nothing is read more than once per run.
The one deliberate re-fetch (`--publish` re-runs the full pre-flight,
`SKILL.md:133-136`, `start-confluence-publish.sh:164-176`) is a
freshness guard ("a stale READY cannot publish"), not a missing
pre-bake. No A7 exposure.

### 4. Bash call hygiene

Clean. Walked every fenced command and emitted-command template:

- `SKILL.md:86` and `SKILL.md:131` — single commands, literal `~` form,
  no chains, no `$VAR`, no resolved `/Users/` paths.
- `SKILL.md:115-116` — explicitly instructs "one Bash call per command"
  for the BUILD_CMD lines. Models the rule.
- Emitted commands are hygiene-compliant by construction:
  `start-confluence-publish.sh:186-191` emit `npm --prefix <~-path> run
  ...` (no `cd &&`), `:192` emits the ~-spelled self-path.
- The blocked-reason at `:166-167` spells the two builds joined by the
  word "and", not `&&` — deliberately avoids A8.
- Pipes/`sed`/`grep` inside the script body (`:113`, `:130-132`) are
  script-internal, not LLM-typed — out of scope for this pattern.

No violations to correct.

### 5. Hygiene block placement

N/A — there is no `references/` directory and no fan-out worker; the
parent session follows `SKILL.md` directly. The SKILL.md itself carries
the one-line pointer to the canonical rule table (`SKILL.md:52-54`),
which is the right weight (points, doesn't inline).

### 6. Idempotent + atomic helpers

The helper mutates no state files, so atomic-write and `jq -e` gate
criteria are largely N/A; re-running Step 0 is genuinely idempotent
(`SKILL.md:121`). Two findings on the gates it does have:

- **Presence-only diagram gate (flag):** `start-confluence-publish.sh:138`
  and `:146` gate on `[[ -f generated/diagrams/$ID.png ]]`. Presence here
  is checking the real artifact the publisher attaches — not a brittle
  proxy for workflow state — so the shape is defensible. But `png=present`
  does not mean *current*: a PNG older than its `.mmd`/`.c4` source (or a
  zero-byte export from an interrupted build) passes the gate and a stale
  diagram publishes silently. This is the inverse of the
  `processed_at`-vs-`updated_at` check the pattern asks for. A
  mtime comparison (source newer than PNG → `png=STALE`, fold into
  `BUILD_NEEDED`) would close it; see open question 2 for the trade-off.
- **Malformed-config failure mode** — see pattern 2; it doubles as the
  one place a gate can report the wrong reason.

No `add/mark/set` helper sprawl — one script, two modes, with the
rationale recorded (`decisions.md:39-46`). No A3.

### 7. Walker UX

N/A — single-page publish producing a single report; no N-item triage
list. No `WALKER.md` exists, so no A1.

### 8. Allowlist coverage

Covered by the blanket entry.

- `.claude/settings.json:28` —
  `"Bash(~/trade-imports-arch-workspace/.claude/tools/:*)"` covers
  `tools/confluence-publish/start-confluence-publish.sh` in both modes,
  including the emitted `PUBLISH_CMD` (which was deliberately routed
  through the tools dir for exactly this reason, `decisions.md:44-46`).
  No hard gap.
- **Asymmetry (observation, not a hard gap):** the emitted `BUILD_CMD`
  lines (`start-confluence-publish.sh:186-191`) are bare
  `npm --prefix ... run build:*` — outside every allowlist prefix, so
  Step 2 always permission-prompts. The skill went to documented lengths
  to make publish prompt-free but left builds prompting. Either add a
  `--build` pass-through mode to the dispatcher (emitted as a ~-spelled
  tools-dir command, same trick as `PUBLISH_CMD`) or record that the
  build prompt is deliberate (builds are slow and estate-wide, a prompt
  is a reasonable speed bump). See open question 1.

### 9. Dependencies

Declared: `delivery-info-arch-tooling trade-imports-documentation npm`
(`SKILL.md:5`). Verification against the audit criteria:

- **check-deps.sh: clean.** Run output: `deps-check: confluence-publish
  -> delivery-info-arch-tooling trade-imports-documentation npm` … `all
  resolve`.
- **`## Dependencies` body section: present and good**
  (`SKILL.md:22-41`) — states rationale, which features are used, and
  the depend-over-port justification (the actively-maintained-pipeline
  shape patterns.md §9 names as the good justification).
- **Description names the requirement: mostly.** `SKILL.md:3` names both
  child repos ("from trade-imports-documentation … delivery-info-arch-
  tooling scripts"). `npm` appears only inside the NOT-for clause, not as
  a requirement. Marginal — a two-word addition would satisfy the
  at-a-glance criterion fully.
- **Dispatcher pre-flight per token: GAP for `npm`.**
  `trade-imports-documentation` — dir check with remedy,
  `start-confluence-publish.sh:54`. `delivery-info-arch-tooling` — dir
  check `:57-58` plus the npm-install link check `:59`, both with
  remedies. `npm` — **no `command -v npm` check anywhere in the
  script**. In default mode the script never invokes npm so the gap is
  latent, but `--publish` ends in `exec npm run publish:confluence`
  (`:175`): on a machine without npm this is a raw `npm: command not
  found` after `MODE: PUBLISHING` has already printed — precisely the
  "raw downstream error" pattern 9 forbids for a declared token. Fix:
  add `command -v npm >/dev/null || blocked "npm not found on PATH
  (install Node 22+ - see trade-imports-documentation README)"` next to
  the repo checks at `:54-59`.
- **Stale tokens: none.** All three declared tokens are genuinely
  invoked (doc-repo paths throughout; tooling via the node_modules link
  `:59` and the pipeline itself; npm at `:175` and in emitted
  BUILD_CMDs).
- The Step 1 hand-off to the `mermaid-check` skill (`SKILL.md:102-111`)
  is a cross-skill invocation, not a dependency token — correctly
  undeclared.

### 10. Prose hygiene (trim diff)

The prose is close to tight — steps are load-bearing, Step 4's
log-line decode table is exactly the anti-pattern-guardrail content the
checklist says not to cut. Three trim candidates, all
duplicated-workspace-content or repeated-example category:

| File | Lines | Action | Rationale |
|---|---|---|---|
| `SKILL.md` | 16-20 ("**Workspace layout.**" paragraph) | Delete; fold the one load-bearing clause ("the dispatcher emits every downstream command in the `~`-spelled canonical form so it matches the allowlist verbatim") into the Step 0 section | Canonical-root prose is workspace-wide content owned by `agent-skills.md` → "Workspace root resolution"; per-skill copies drift |
| `SKILL.md` | 43-51 ("## Path conventions" body, keeping 52-54) | Collapse to the existing one-line hygiene pointer (52-54) plus a single "Path conventions: `agent-skills.md`" reference | Verbatim restatement of `agent-skills.md` → "Path conventions"; the pointer is the pattern, the copy is the residue |
| `SKILL.md` | 174-181 ("## Scripts cheat-sheet") | Optional collapse to one row or delete | Two rows describing one script's two modes, both already described at Step 0 (`:92-100`), Step 3 (`:133-140`) and in the script header; repeated-example category |

Not trimmed: `decisions.md:66-71` is dated retrofit history, but
`decisions.md` is the CREATE-mode decisions log whose own header says
"do not delete entries" — historical by design, out of trim scope.

## Open questions

1. **Build prompts:** should `BUILD_CMD` route through the dispatcher
   (e.g. `start-confluence-publish.sh --build <page>`) so builds match
   the allowlist like `PUBLISH_CMD` does — or is the permission prompt a
   deliberate speed bump before the slow, estate-wide `build:diagrams`?
   Adding a third mode also grows the single script; the A3 line is
   worth watching.
2. **Staleness detection:** should the diagram gate compare PNG mtime
   against its `.mmd`/`.c4` source and report `png=STALE`? The
   counter-argument: neither build has a single-file mode
   (`SKILL.md:119`), so staleness detection would trigger full rebuilds
   often — the user may prefer presence-only plus manual judgment.
3. **Trim timing:** land the pattern-10 trims with the npm pre-flight
   fix, or batch them into a workspace-wide trim pass across skills
   (the same lines 16-20 / 43-51 boilerplate shape likely exists in
   sibling skills)?
4. Should `npm` (Node 22+) be named in the `description` as a
   requirement, or is the body `## Dependencies` section sufficient
   given both repos are already named at-a-glance?

## Anti-pattern citations

No entry in the current A1-A10 catalogue is triggered:

- **A1** (walker on single artifact) — no walker exists; N/A.
- **A2** (JSON where prose fits) — prose canonical, no sidecar; clean.
- **A3** (multi-helper sprawl) — one script, two modes, rationale
  recorded; clean, though open question 1's `--build` mode would need
  the same one-script justification.
- **A4** (FRESH/REFRESH dual modes) — no mode branching on prior state;
  the `--publish` re-pre-flight is a freshness guard, not a REFRESH
  branch; clean.
- **A5/A9** (fan-out shapes) — no fan-out; N/A.
- **A6/A7** (render helper / pre-bake) — neither exists; clean.
- **A8** (hardcoded chains) — actively avoided at
  `start-confluence-publish.sh:166-167` ("and", not `&&`); clean.
- **A10** (env vars in typed commands) — all typed commands use literal
  `~` form; clean.

**Proposed new catalogue entry** (for user review — the instance here
may be deliberate, see open question 1):

> ## A11. Dispatcher-emitted commands outside the allowlist
>
> **Symptom:** a dispatcher carefully emits ~-spelled FACT commands so
> they match the allowlist verbatim, but some emitted lines (e.g. bare
> `npm --prefix ... run ...`) start with a prefix no allowlist entry
> covers — so the "run verbatim, no prompt" contract silently holds for
> some emitted commands and not others.
>
> **Why it's wrong:** the whole point of emitting resolved commands is a
> prompt-free verbatim run; a partially-covered emission set trains the
> agent to expect no prompt and the user to rubber-stamp the ones that
> appear.
>
> **Correction:** route every emitted command through an allowlisted
> prefix (a tools-dir pass-through mode), or document in the skill that
> the uncovered command prompts by design.
