---
name: mermaid-check
description: 'Authors and verifies Mermaid diagrams in Markdown files and standalone .mmd files, checking each with hedy diagram check, which parses it with the Mermaid the docs pipeline renders with, before a doc ships; and draws a sequence diagram as an SVG in the house style through hedy diagram sequence. Use when adding a diagram to a document, or when checking that existing diagrams still parse. Triggers: "check mermaid", "validate diagrams", "verify mermaid renders", "add a diagram", "draw a sequence diagram". Owns Mermaid syntax, diagram-type fit and parse correctness only. NOT for label wording, jargon or acronym-on-first-use, which belong to `authoring`. NOT for LikeC4 `.c4` models, which have their own `npm run validate:c4` and `npm run build:diagrams`. NOT for Claude Code CLAUDE.md scaffolding, which is the built-in /init.'
model: sonnet
metadata:
  workspace-soft-deps: delivery-info-arch-tooling rsvg-convert
---

A diagram that does not parse is worse than no diagram: it ships as a broken image or an empty block, and nobody notices until a reader opens the page. This skill closes that gap. It checks every Mermaid diagram in the files you name, reports which fail and on which line, and helps you author new ones that parse first time. Nothing is written to your documents.

Diagrams here live in two places. Nearly all are fenced ` ```mermaid ` blocks inside Markdown under `analysis/` and `trade-imports-documentation/docs/`. A minority are standalone `.mmd` files under `trade-imports-documentation/architecture/`, which the documentation pipeline converts to SVG via `npm run build:mmd`.

**Bash call hygiene** - one command per Bash call; paths relative to the workspace root, such as `.claude/tools/...`. Full rules: [`agent-skills.md`](../../best-practices/skills/agent-skills.md).

## Usage

| Trigger                  | Steps                                     |
| ------------------------ | ----------------------------------------- |
| "check mermaid"          | Step 0, then Verify                       |
| "validate diagrams"      | Step 0, then Verify                       |
| "verify mermaid renders" | Step 0, then Verify                       |
| "add a diagram"          | Author, then Step 0 to confirm it parses  |
| "draw a sequence diagram" | Author, Step 0, then Draw in the House Style |

Also run Verify unprompted before publishing any document you have added or edited a diagram in. Every step that writes or changes a diagram runs Step 0 on the diagram straight after writing it: a diagram that has not been checked is not finished.

NOT for label wording, acronym introduction, or jargon in diagram text - that is `authoring`, and the handoff is described below. NOT for LikeC4 `.c4` architecture models, which are validated by `npm run validate:c4` and exported by `npm run build:diagrams` in `trade-imports-documentation`. NOT for whether a diagram should exist at all, which the document's plan decides.

## Working with `authoring`

The two skills split on a clean line: **`mermaid-check` owns whether the diagram parses and whether the diagram type fits. `authoring` owns the words inside the diagram.**

| Concern | Owner |
| --- | --- |
| Does it parse | `mermaid-check` |
| Right diagram type for what is being shown | `mermaid-check` |
| Exact identifiers, no em-dashes in labels | `mermaid-check` (the punctuation and heading rules in [writing.md](../../best-practices/writing/writing.md)) |
| Label wording, jargon, acronym on first use | `authoring` |
| Whether the document needs the diagram | `authoring` |

In practice: when the authoring skill's drafting agent draws a diagram, the agent checks the diagram here through the single-diagram entry point below. When this skill authors a diagram whose labels introduce a term the document has not used before, say so and hand that to `authoring` rather than settling the wording here.

The mechanical rules in the third row are the subset of `writing.md` that can be checked without reading the surrounding prose. Everything requiring document context stays with `authoring`.

## Step 0: Check

```bash
hedy diagram check <path> --json
```

`<path>` is a `.mmd` file, a Markdown page or a folder, and more than one may be given. A folder is walked recursively, leaving out `node_modules`, `build`, `generated` and folders whose names start with a dot. `hedy diagram check --help` lists every form.

Each diagram is parsed by the Mermaid that `delivery-info-arch-tooling` installs, the version the docs pipeline renders with. Exit 0 means every diagram parses. Exit 1 means a diagram does not parse, with one `PARSE` error, or that Mermaid is not installed, with one `SETUP` error naming `make install`: a `SETUP` error is a machine problem and never a diagram verdict. Exit 2 is a usage error. Usable as a gate.

## Verify

Read the envelope's `result`: `files` is the number of files read, and `diagrams` holds one verdict per diagram. A verdict's `label` is `<file>:<line>` for a Markdown block, where `<line>` is the line the ` ```mermaid ` fence opens on, or just `<file>` for a standalone `.mmd`. A passing verdict gives the `type` Mermaid found.

For each verdict with `ok` false:

1. Open the file at `line`, which is the line of the file Mermaid names, already worked out from the fence line. `message` is Mermaid's full message.
2. Fix the syntax and run Step 0 on that file again.

Common causes, in rough order of frequency: a semicolon inside a message label, which Mermaid reads as the end of a statement; an arrow form that does not exist for that diagram type (`->>>`); a missing diagram-type keyword on the first line; an unquoted label containing a colon or bracket; and `end` missing from an `alt`, `loop` or `subgraph`.

Report to the user which diagrams failed and what you changed. Do not report a pass count without saying how many files were read; "no diagrams found" and "all diagrams pass" look identical otherwise, and the command's text mode says "No Mermaid diagrams found" for that case.

## Checking a single diagram, including from another agent

Any agent with Bash can check a diagram it is holding in context, without writing it into the repository first:

```bash
hedy diagram check --json --stdin --label 'draft: login sequence' <<'EOF'
sequenceDiagram
    Browser->>FrontDoor: GET /notifications
    FrontDoor-->>Browser: 200
EOF
```

The diagram is one diagram, and its lines count from its first line. `--label` names the diagram in the result, so use it to say which diagram this is. The heredoc is one command, so the call stays within Bash call hygiene.

This is the entry point for subagents and for any skill that drafts a diagram as part of a larger task. Use a path instead when the diagram is already on disk.

## Author

When adding a diagram:

1. **Pick the type from what is being shown**, not from habit. Ordered interaction between parties over time is `sequenceDiagram`. Choice and branching is `flowchart`. Lifecycle of one entity is `stateDiagram-v2`. Structure and relationships is `erDiagram` or `classDiagram`. If a flowchart is being used to show a request/response exchange, a sequence diagram is almost always clearer.
2. **Name participants as they appear in the code or the estate**, so a reader can grep for them. Prefer the real service name over a role description.
3. **Apply the mechanical rules**: backticks are not rendered inside Mermaid labels, so write identifiers plainly and keep them exact. No em-dashes, and no semicolons inside a label. Introduce nothing in a label the document has not introduced in prose.
4. **Keep a subgraph's title to one line (under ~24 characters) when it nests other subgraphs.** Mermaid caps subgraph titles at a hardcoded 200px and wraps longer ones; the wrapped second line is painted over by nested subgraph boxes (upstream bug - `flowchart.wrappingWidth` is not passed to cluster titles). The estate render config's `subGraphTitleMargin` clears one-line titles only. Put the detail in a node label or the surrounding prose instead. Parsing cannot see this fault, so read the rendered page.
5. **Check before moving on** via Step 0 on the file. A diagram that has not been checked is not finished.

For a diagram destined for the documentation pipeline rather than a single document, write it as a `.mmd` file under `trade-imports-documentation/architecture/` so `npm run build:mmd` picks it up.

## Draw in the House Style

A sequence diagram for a page can be drawn as an SVG in the house style, from the same `.mmd` file that Mermaid renders. The drawing fits notes to their text, sets request lines in monospace, shows each service's repository name beneath its title, and draws a zone band behind the participants of each `box` block.

1. Write the source as a standalone `.mmd` file. Group the participants of each network zone in a `box` block, such as `box Public zone`, then the `participant` lines, then `end`.
2. Run Step 0 on the file straight after writing it, and fix every line the check names.
3. Draw the SVG into the page's `diagrams/` folder:

   ```bash
   hedy diagram sequence <source.mmd> <output.svg> --json
   ```

4. Read the envelope. On success, `result` gives the size and the number of steps. On failure, each `PARSE` error names the line and the change to make: fix every line it names, run Step 0 again, then run the command again. The command also asks Mermaid first and refuses a source Mermaid rejects. `hedy diagram sequence --help` lists the constructs the command draws.
5. Look at the drawing before placing it on the page: `rsvg-convert -w 1400 -o <file>.png <file>.svg`, then read the PNG.

A failed run leaves any earlier SVG at the output path untouched.

## Completion output

```
mermaid-check complete for <path>.

<N> diagram(s) in <M> file(s): <P> passed, <F> failed.

Failures:
  <file>:<line>  <what was wrong, what was changed>

Next: <re-run after fixes, or hand label wording to authoring>.
```

When nothing failed, say so in one line and give the counts. When nothing was found, say that explicitly rather than reporting success.

## Commands cheat-sheet

| Command | Purpose |
| --- | --- |
| `hedy diagram check <path>... --json` | Check `.mmd` files, the mermaid blocks of Markdown pages, and folders of both; one verdict per diagram, with the line of the file for each failure |
| `hedy diagram check --stdin --label <name> --json` | Check one diagram held in context, read from stdin |
| `hedy diagram sequence <source.mmd> <output.svg> --json` | Draw a sequence diagram as an SVG in the house style, after checking the source with Mermaid |
