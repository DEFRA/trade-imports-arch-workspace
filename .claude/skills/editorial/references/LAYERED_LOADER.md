Load a layered editorial review once and fork one copy of yourself per review pass, so every pass inherits the material from the prompt cache instead of reading it again. Writes nothing itself; each fork writes its own review files. Do not review anything and do not edit any page.

**Bash call hygiene** - one command per Bash call. Full rule table: `~/trade-imports-arch-workspace/.claude/best-practices/skills/agent-skills.md` → "Bash call hygiene".

## Inputs

The spawn prompt gives:

- **Reader frame**, **output mode**, **review intent**, **document mode** and **run notes**: the lens every pass applies. Any of them the prompt leaves out comes from the packet's "Document set profile" section, when the packet has one.
- **Packet:** the work packet, which holds the brief's shared sections, the layer cards, any layer 0 pointers, every source the brief names, the documents under review and any context pages, with line numbers.
- **Review folder:** where the forks write their files.
- **Pages:** each page under review with a short key, such as `02a` for `02a-ins-auth-session-service-design.md`, and the lines its paragraph pass reviews: `all`, a list of line numbers (a re-review of what changed since an earlier run), or `none`.

## Workflow

1. Read the whole packet with the Read tool (`allow_large` if offered, else consecutive ranges). Open no other file.
2. In ONE message, start three forks per page with the Agent tool (two when the page's lines are `none`: no paragraph pass), `subagent_type` `fork` and no `name` (a fork cannot take one), so all of them run in parallel. Describe each fork as `Paragraph pass <key>`, `Page pass <key>` or `Set pass <key>`. Every fork applies only its own card from the packet, reports only the kinds that card owns, applies the reader frame, mode, intent, document mode and run notes, copies quotes verbatim from the packet's numbered copies, does not search the pages, writes its JSON with the Write tool into the review folder, checks each file with `jq . <file>`, and replies with one line:
   - **Paragraph pass** (Paragraph Card) for the page, on the page's lines (when they are a list, only the paragraphs on those lines, with the rest of the page as context): writes `drill-<key>.json` as `{"unit": "<page filename>", "findings": [...], "retains": [...]}`.
   - **Page pass** (Page Card) for the page: writes `structural-<key>.json` as `{"findings": [...], "redundancies": []}` and `editor-<key>.json` as `{"pages": [{"page", "verdict", "opening", "carriedAway", "findings": [...], "retains": [...]}], "order": [], "patterns": []}`.
   - **Set pass** (Set Card) assigned to the page, with the whole set and the context pages as context, every finding anchored on the page: writes `structural-set<key>.json` as `{"findings": [...], "redundancies": [{"fact", "home": {page, line, quote}, "occurrences": [FINDING]}]}` and `editor-set<key>.json` as `{"pages": [], "order": [FINDING], "patterns": [{"pattern", "instances": [{page, line, quote}], "finding": FINDING}]}`.

   Every FINDING carries the reviewer-set fields in the packet's contract section: `page` (the filename), `quote` (verbatim), `line`, `kind`, `severity`, `defect`, `point`, `bearing`, `removes`, `action`, `basis`, `guess`, and when they apply `cites`, `before`, `after`, `loss`, `question`, `owner`, `related`, `introduced`, `changes`. A retain is `{line, quote, reason}`.
   In a re-review (the packet holds "Changes since the last review"), tell every fork that it reports only findings that touch its page's changed lines or that a removed or rewritten paragraph caused, and that it raises no finding the packet lists as settled.
3. Wait for every fork's line, then check that every file parses with `jq . <file>`, one call per file.

## Return value

One line: `loader: forks <n>; files ok <n> of <expected>`, then one line per fork that failed or wrote no file.
