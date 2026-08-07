---
name: mermaid-check
description: 'Authors and verifies Mermaid diagrams in Markdown files and standalone .mmd files, rendering each with mermaid-cli to confirm it parses before a doc ships. Use when adding a diagram to a document, or when checking that existing diagrams still render. Triggers: "check mermaid", "validate diagrams", "verify mermaid renders", "add a diagram". Owns Mermaid syntax, diagram-type fit and render correctness only. NOT for label wording, jargon or acronym-on-first-use, which belong to `editorial`. NOT for LikeC4 `.c4` models, which have their own `npm run validate:c4` and `npm run build:diagrams`. NOT for Claude Code CLAUDE.md scaffolding, which is the built-in /init.'
---

A diagram that does not render is worse than no diagram: it ships as a
broken image or an empty block, and nobody notices until a reader
opens the page. This skill closes that gap. It renders every Mermaid
diagram in the files you name, reports which fail and where, and helps
you author new ones that parse first time. Nothing is written to your
documents: rendering happens in a temp directory and source files are
never modified.

Diagrams here live in two places. Nearly all are fenced ```` ```mermaid ````
blocks inside Markdown under `analysis/` and
`trade-imports-documentation/docs/`. A minority are standalone `.mmd`
files under `trade-imports-documentation/architecture/`, which the
documentation pipeline converts to SVG via `npm run build:mmd`.

**Bash call hygiene** - one command per Bash call; paths in the literal
`~/trade-imports-arch-workspace/...` form. Full rules:
[`agent-skills.md`](../../best-practices/skills/agent-skills.md).

## When to use

| Trigger | What to follow |
|---------|----------------|
| "check mermaid" | Step 0, then Verify |
| "validate diagrams" | Step 0, then Verify |
| "verify mermaid renders" | Step 0, then Verify |
| "add a diagram" | Author, then Step 0 to confirm it renders |

Also run Verify unprompted before publishing any document you have
added or edited a diagram in.

NOT for label wording, acronym introduction, or jargon in diagram
text - that is `editorial`, and the handoff is described below. NOT
for LikeC4 `.c4` architecture models, which are validated by
`npm run validate:c4` and exported by `npm run build:diagrams` in
`trade-imports-documentation`. NOT for whether a diagram should exist
at all, which is an editorial judgement about the document.

## Working with `editorial`

The two skills split on a clean line: **`mermaid-check` owns whether
the diagram parses and whether the diagram type fits; `editorial` owns
the words inside it.**

| Concern | Owner |
|---|---|
| Does it render | `mermaid-check` |
| Right diagram type for what is being shown | `mermaid-check` |
| Backticked identifiers, no em-dashes in labels | `mermaid-check` (mechanical rules from the editorial style guide) |
| Label wording, jargon, acronym on first use | `editorial` |
| Whether the diagram earns its place in the document | `editorial` |

In practice: when `editorial` is reviewing a document that contains
diagrams, run Verify as part of the pass and report render failures
alongside the prose findings. When this skill authors a diagram whose
labels introduce a term the document has not used before, say so and
hand that to `editorial` rather than settling the wording here.

The mechanical rules in the third row are borrowed deliberately, not
duplicated: they are the subset of the editorial style guide that can
be checked without reading the surrounding prose. Everything requiring
document context stays with `editorial`.

## Step 0: Start

```bash
~/trade-imports-arch-workspace/.claude/tools/mermaid-check/start-mermaid-check.sh <path>
```

`<path>` is a file or a directory, and more than one may be given. A
directory is walked recursively, skipping `node_modules`, `build`,
`generated` and dotted directories.

First stdout line is `MODE: VERIFY`. Then one line per diagram, then a
summary. Exit code is 0 when every diagram rendered and 1 when any
failed, so the script is usable as a gate.

## Verify

Read the report. Each line is `PASS` or `FAIL` followed by a label:
`<file>:<line>` for a Markdown block, where `<line>` is the line the
```` ```mermaid ```` fence opens on, or just `<file>` for a standalone
`.mmd`.

For each `FAIL`:

1. Open the file at the reported fence line and read the block.
2. **Translate the parser's line number.** It counts from the start of
   the extracted block, not the file. Source line is roughly the fence
   line plus the reported line. A `FAIL` at `notes.md:12` reporting
   "Parse error on line 2" means look around line 14.
3. Fix the syntax and re-run Step 0 on that file alone.

Common causes, in rough order of frequency: an arrow form that does
not exist for that diagram type (`->>>`), a missing diagram-type
keyword on the first line, an unquoted label containing a colon or
bracket, and `end` missing from an `alt`, `loop` or `subgraph`.

Report to the user which diagrams failed and what you changed. Do not
report a pass count without saying how many files were scanned; "no
diagrams found" and "all diagrams pass" look identical otherwise.

## Checking a single block, including from another agent

Any agent with Bash can validate a diagram it is holding in context,
without writing it into the repository first:

```bash
~/trade-imports-arch-workspace/.claude/tools/mermaid-check/render-mermaid.sh --text 'sequenceDiagram
    Browser->>FrontDoor: GET /notifications
    FrontDoor-->>Browser: 200' --label 'draft: login sequence'
```

Exit 0 means it parses, exit 1 prints the parser message. Nothing is
written and the temp source is removed. `--label` is free text and
only affects the report line, so use it to say which diagram this is.

This is the entry point for subagents and for any skill that drafts a
diagram as part of a larger task. It needs no pipe and no temp file of
the caller's own, so it stays within Bash call hygiene. Both scripts
are covered by the allowlist entries added when this skill was
scaffolded, so a subagent can call them without a permission prompt.

Use `--file` instead when the diagram is already on disk, and
`start-mermaid-check.sh` when sweeping whole files or directories.

## Author

When adding a diagram:

1. **Pick the type from what is being shown**, not from habit. Ordered
   interaction between parties over time is `sequenceDiagram`. Choice
   and branching is `flowchart`. Lifecycle of one entity is
   `stateDiagram-v2`. Structure and relationships is `erDiagram` or
   `classDiagram`. If a flowchart is being used to show a
   request/response exchange, a sequence diagram is almost always
   clearer.
2. **Name participants as they appear in the code or the estate**, so
   a reader can grep for them. Prefer the real service name over a
   role description.
3. **Apply the mechanical rules**: backticks are not rendered inside
   Mermaid labels, so write identifiers plainly and keep them exact.
   No em-dashes. Introduce nothing in a label the document has not
   introduced in prose.
4. **Render before moving on** via Step 0 on the file. A diagram that
   has not been rendered is not finished.

For a diagram destined for the documentation pipeline rather than a
single document, write it as a `.mmd` file under
`trade-imports-documentation/architecture/` so `npm run build:mmd`
picks it up.

## Completion output

```
mermaid-check complete for <path>.

<N> diagram(s) in <M> file(s): <P> passed, <F> failed.

Failures:
  <file>:<line>  <what was wrong, what was changed>

Next: <re-run after fixes, or hand label wording to editorial>.
```

When nothing failed, say so in one line and give the counts. When
nothing was found, say that explicitly rather than reporting success.

## Scripts cheat-sheet

All under `~/trade-imports-arch-workspace/.claude/tools/mermaid-check/`:

| Script | Purpose |
|---|---|
| `start-mermaid-check.sh` | Sweep paths, extract fenced blocks from Markdown, render every diagram, report pass/fail with source line |
| `render-mermaid.sh` | Render one diagram, from `--file` on disk or `--text` held in context; exit 0 if it parses, 1 with the parser message if not |

`render-mermaid.sh` resolves `mmdc` the same way
`delivery-info-arch-tooling/lib/diagrams/convert-mmd.js` does: the
library's `node_modules/.bin`, then the documentation project's, then
`npx` as a fallback. Both therefore agree on which renderer runs.

Never pipe an `mmdc` invocation through another command to check
whether it succeeded. The pipe's exit code masks the failure and every
diagram appears to pass.
