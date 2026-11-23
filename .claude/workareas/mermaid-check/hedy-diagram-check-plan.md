# Mermaid Check in hedy: Plan

hedy gains `hedy diagram check`, which proves that each Mermaid diagram parses before an author publishes the diagram or the sequence renderer draws the diagram. The command replaces the two bash scripts behind the mermaid-check skill, `render-mermaid.sh` and `start-mermaid-check.sh`, and the skill calls hedy instead. The sequence renderer, `hedy diagram sequence`, reads Mermaid files, so the renderer must refuse a file that Mermaid itself rejects.

| Reader's Intent | Section |
| --- | --- |
| Learn why the port is worth doing | Reasons |
| Learn what the command does | Capabilities |
| Learn where the Mermaid parser runs | Parser |
| Learn how the work is tested and written | Testing, Code Standards |
| Learn the order of the work | Order of Work |
| Answer the open points | Decisions |

## Reasons

Four facts, gathered on 23 November 2026, make the case for the port.

1. **The renderer can draw a diagram that Mermaid rejects.** The renderer reads its own subset of Mermaid's syntax and does not ask Mermaid. A sweep of the estate found 5 diagrams that Mermaid refuses, one of them on a published page (`TRACES integration challenges analysis.md`, the diagram at line 482). Four of the five break because a message label holds a semicolon, which Mermaid reads as the end of a statement. The renderer reads such a label without complaint. A Mermaid file that the renderer accepts must also render in Mermaid, because the `.mmd` file stays the source of truth.
2. **The bash check starts a browser for every diagram.** `render-mermaid.sh` runs `mmdc`, which starts headless Chromium. The check took 6.8 seconds for 15 diagrams. Mermaid's own parser runs in Node without a browser: loading the parser takes 3.3 seconds once, and the 278 diagrams in the estate then parsed in 1.3 seconds.
3. **The bash check tells a broken diagram from a broken machine by searching error text.** `render-mermaid.sh:117-125` matches words such as `parse error on line` and `failed to launch` in the output of `mmdc`. A new wording in a Mermaid or Puppeteer release moves a machine fault into the diagram failures, or the reverse, and no test notices.
4. **Tooling that needs tests belongs in hedy.** The two scripts parse a format, gate a skill's verdict and have no tests. `hedy/DECISIONS.md` (Scope) places such tooling in hedy, and the cutover rule deletes the bash in the same change that adds the command.

## Users

- **An AI agent** that writes or edits a diagram, and checks the diagram before handing the page over. The authoring skill's drafting agents check every diagram they draw.
- **The sequence renderer**, which checks a source before drawing the source.
- **The person** who reviews a page and wants to know that every diagram on the page renders on Confluence and GitHub Pages.

## Capabilities

Each capability opens with the behaviour, then gives the detail, what the bash check does today, and the examples that become the acceptance tests.

### Check a Mermaid File

Given a `.mmd` file, `hedy diagram check <file>` reports whether Mermaid parses the file, and for a file that fails, gives Mermaid's message and the line of the file that broke.

- The result names the diagram type Mermaid found, such as `sequence` or `flowchart-v2`.
- A failing diagram exits 1, as `hedy prose check` does for a failing page.

**Today.** `render-mermaid.sh --file` gives the same verdict through `mmdc`, with Mermaid's message trimmed to its first line.

**Examples.**

- Given a sequence diagram whose label holds a semicolon, when the check runs, then the check fails, names the line of the label and quotes Mermaid's message.
- Given a valid flowchart, when the check runs, then the check passes and reports the type `flowchart-v2`.

### Check the Diagrams on a Page

Given a Markdown page, the command checks every fenced `mermaid` block on the page, and gives each failure as the line in the page, not the line inside the block.

- The page line is the fence line plus Mermaid's line, worked out by the command.
- A page without a Mermaid block reports that no diagram was found, so "no diagrams" never reads as "all diagrams pass".

**Today.** `start-mermaid-check.sh` reports the fence line, and the skill tells the agent to add Mermaid's line by hand (`SKILL.md`, Verify step 2).

**Examples.**

- Given a page whose second block breaks on the block's line 3, with the fence on line 40, when the check runs, then the failure names line 43 of the page.
- Given a page without Mermaid blocks, when the check runs, then the result says 0 diagrams in 1 file.

### Check a Folder

Given a folder, the command checks every `.mmd` file and every Markdown page beneath the folder, and leaves out `node_modules`, `build`, `generated` and every folder whose name starts with a dot.

**Today.** `start-mermaid-check.sh` walks the same folders with the same exclusions.

**Example.** Given a folder holding two pages and one `.mmd` file, when the check runs, then the result counts the diagrams in the three files and lists each failure.

### Check a Diagram Held in Context

Given a diagram on standard input with `--stdin --label <name>`, the command checks the diagram without a file, as `hedy prose check` reads text.

**Today.** `render-mermaid.sh --text '<diagram>'` writes a temporary file and checks the file.

**Example.** Given a drafted diagram on standard input labelled `draft: sign-in`, when the check runs, then the result names `draft: sign-in` with the verdict.

### Tell a Broken Machine from a Broken Diagram

Given a machine where the Mermaid parser cannot load, the command stops with one `SETUP` error that names the step to fix the machine, and does not report any diagram as failed.

**Today.** The bash check searches the error text of `mmdc` for words that suggest a machine fault, and aborts the sweep with exit 2 when it finds them.

**Example.** Given a checkout where `delivery-info-arch-tooling` has no installed packages, when the check runs, then the command exits 1 with a `SETUP` error naming `make install`, and the result does not list a diagram.

### Refuse to Draw a Source Mermaid Rejects

Given a source that Mermaid rejects, `hedy diagram sequence` refuses to draw the source, with Mermaid's message and the line, before the renderer's own reading of the file.

**Today.** The renderer reads its own subset and draws a label that holds a semicolon.

**Example.** Given a sequence source with a semicolon in a message label, when `hedy diagram sequence` runs, then the command exits 1 with Mermaid's message and leaves any earlier drawing untouched.

### Later: Refuse to Publish a Broken Diagram

Given a page with a diagram Mermaid rejects, `hedy confluence publish` refuses the page in its pre-flight, before anything reaches Confluence. Today a broken diagram reaches Confluence as a broken image, and the confluence-publish skill hands the page to mermaid-check after a refused build. This capability waits for decision 2.

## Out of Scope

- Rendering a diagram to SVG or PNG. The docs repo's `npm run build:mmd` renders, and the check proves that a diagram parses.
- The words inside a diagram, which belong to the authoring skill.
- LikeC4 models, which `npm run validate:c4` checks.
- A diagram that parses but draws badly, such as the overlapping titles of nested subgraphs that `SKILL.md` describes. Parsing cannot see layout.

## Parser

The command needs Mermaid's parser, and the parser needs a browser's document model for most diagram types. Of the 278 diagrams in the estate, 167 parsed in plain Node: 166 sequence diagrams and one ER diagram. 106 diagrams stopped with `DOMPurify.addHook is not a function`, because Mermaid's label sanitiser looks for a browser window. Most of the 106 are flowcharts and state diagrams, and 5 are sequence diagrams. The remaining 5 diagrams failed with true parse errors, and `mmdc` failed the same 5 at the same lines. No document model library, such as `jsdom`, `linkedom` or `happy-dom`, is installed anywhere in the estate.

Three places can run the parser:

| Place | Effect |
| --- | --- |
| A parse script in `delivery-info-arch-tooling`, which hedy runs as a child process | The tooling already holds Mermaid 11.17.2 and `mmdc`, and gains a document model library. hedy keeps commander and zod as its runtime dependencies, and wraps the tooling as `confluence publish` wraps the publisher. Colleagues who use the tooling can call the same script. |
| Mermaid and a document model library inside hedy | hedy gains Mermaid's dependency tree, which includes d3, cytoscape and katex, against the rule that hedy's commands use commander and zod at run time. |
| `mmdc` run by hedy, as the bash check runs it | No new dependency, but the browser start for every diagram and the search of error text both stay. |

The recommendation is the first place, because the tooling owns Mermaid in this estate and hedy's dependency rule stays intact. The first step of the work proves that a document model library gives Mermaid's parser the same verdicts as `mmdc` on all 278 diagrams.

## Testing

The tests state the behaviours above, and follow the method of `hedy diagram sequence`.

- **Reading pages.** A table of short Markdown snippets states the blocks each snippet must give, with each block's fence line. The table covers a page without blocks, two blocks, an indented fence, a fence that never closes and a block inside a list.
- **Line translation.** A table of fence lines and Mermaid messages states the page line each message must give.
- **The parser boundary.** The parse script runs as a child process, so the tests run a fake parse script through the real spawn, as the publish tests run a fake publisher. The fake returns recorded verdicts, so the tests do not depend on Mermaid's version.
- **Parity with the bash check.** No golden output exists for the bash scripts, so the bash verdicts are captured first: for a fixture set of passing and failing diagrams of every type in use, the bash check's verdict for each diagram is recorded. The hedy command must give the same verdict for every diagram, and the line it names must match the line the bash check implies.
- **The real parser.** One test runs the real parse script against the fixture set when the tooling is installed. The test proves that the fake and the real script agree.
- **The command.** Spawned runs prove the result, the exit codes, `--stdin`, and the `SETUP` error on a checkout without the tooling's packages.

Fixtures are public, because the workspace repository is public: the docs repo's diagrams are public already, and the failing diagrams are written for the tests.

## Code Standards

- **Functional core, thin shell.** Pure functions find the blocks, translate lines and build the result. The shell reads files, walks folders and runs the parse script. No module holds shared state that changes.
- **Small functions, checked by the linter.** `hedy/eslint.config.js` gains the `complexity` rule at a limit of 6 and `max-lines-per-function` at 30 lines, for source files under `hedy/src/commands/diagram/`. The code of `hedy diagram sequence` passes both limits already. Test files stay outside the limits, because a `describe` block holds many tests.
- **Test, implement, refactor.** One behaviour per cycle: a test that fails on its assertion, the code that passes the test, then a refactor before the next behaviour. A refactor is proved by the fixtures, compared exactly.

The rest of hedy breaks the limits in 14 functions for complexity and 6 functions for length. The worst are `clients/jira.js:8` at a complexity of 16 and `menu/jira/use-jira-feature.js:39` at 177 lines. Bringing them under the limits is separate work.

## Order of Work

1. **Prove the parser.** A spike in `delivery-info-arch-tooling` gives Mermaid's parser a document model and parses the 278 diagrams of the estate. The pass mark is the same verdict as `mmdc` for every diagram. If a diagram type fails the mark, that type falls back to `mmdc`, and the plan records the type. The spike comes first because every later step depends on the parser's place.
2. **Add the lint limits** for `hedy/src/commands/diagram/`, so every later step is written under them.
3. **Capture the bash verdicts** on the fixture set, before any hedy code exists.
4. **Check a Mermaid file**, with the `SETUP` error for a broken machine and the machine-readable result.
5. **Check pages and folders**, with the page line worked out by the command.
6. **Check a diagram held in context** through `--stdin`.
7. **Make the renderer check first**, so `hedy diagram sequence` refuses a source Mermaid rejects.
8. **Cut over.** The mermaid-check skill calls `hedy diagram check`. The authoring and confluence-publish skills, `AGENTS.md` and the skills' records drop the bash scripts, and the two scripts are deleted in the same change. The allowlist entry for `.claude/tools/mermaid-check/` is an owner step for Ben.
9. **Later:** the publish pre-flight refuses a page with a broken diagram, when decision 2 says so.

Steps 1 to 8 make one pull request to hedy and one to `delivery-info-arch-tooling`. The tooling pull request merges first, because hedy runs its script.

## Decisions

1. **Parser place.** Should the parser run as a script in `delivery-info-arch-tooling`, which hedy wraps? The recommendation is yes. The tooling repository is shared with colleagues, so the change there goes through that repository's review.
2. **Publishing.** Should `hedy confluence publish` refuse a page whose diagram Mermaid rejects? The recommendation is yes, after the cutover, because a broken diagram reaches Confluence today as a broken image.
3. **The five broken diagrams.** Should the four drafts in `analysis/ins-authnz/one-shot/candidate-3.md` and the diagram on the published TRACES page be fixed? The plan does not depend on the answer, and the published page is the one a reader sees.
