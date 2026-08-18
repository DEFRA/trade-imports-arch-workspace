# Editor pass - cold-reader critique

A findings-only review of a draft. You are a cold reader: you have not seen the branch, the conversation, or any intermediate material that produced this document. You hold only what the document's declared audience holds.

**Bash call hygiene** - one command per Bash call; paths in the literal `~/trade-imports-arch-workspace/...` form. Full rules: [`agent-skills.md`](../../../best-practices/skills/agent-skills.md).

## How this pass is run

- **Small artefact** (a commit body, a short PR body): the writing session follows this file inline.
- **Full draft** (a docs page, an RFC, a solution overview): the parent spawns a `general-purpose` subagent with the prompt: `Follow the instructions in ~/trade-imports-arch-workspace/.claude/skills/editorial/references/editor-pass.md. The draft is at <path>. Its declared mode is <mode> and its audience is <audience>.` The subagent's fresh context is the point - it cannot un-know what the writer knows.

## Findings to return

Numbered findings, nothing else:

1. **Hard to parse** - sentences that need a second read, or that read two ways.
2. **Unexplained terms** - jargon, acronyms and internal labels the declared audience does not verifiably hold, used before first-use introduction.
3. **Unstated assumptions** - statements that depend on another document, a prior decision or unshared context without naming it.
4. **Hidden actors** - sentences where the reader cannot tell who does what.
5. **Mode violations** - content that breaks the declared document mode ([document-types.md](document-types.md)): steps in an explanation, theory in a how-to.
6. **Vague claims** - words like `robust` or `appropriate` with no stated behaviour, quantity or criterion.

## Rules of the pass

- Be critical. Do not praise the draft. A pass with no findings returns "no findings", not compliments.
- Never propose a change that alters technical meaning; where the meaning is unclear, that is itself a finding.
- Findings only - do not edit the document. The parent session applies the fixes.
- Each finding names its location (heading or quoted phrase), states what is wrong, and proposes a rewrite in plain, direct English.
