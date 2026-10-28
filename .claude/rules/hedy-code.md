---
paths:
  - "hedy/src/**"
---

# `hedy` Source Rules

These rules apply to every file under `hedy/src/`, tests included. A breach is a defect to fix in the same change. "Pre-existing" and "a nearby file does it" are not reasons to keep one.

## Commands and Output

- One command per file under `hedy/src/commands/`, exporting `register(program)`.
- zod validates every option before any side effect. No network call, file write or child process runs before validation passes.
- Every command's output goes through `run-action.js`. No command writes to stdout, builds an envelope or chooses an exit code itself.
- stdout carries output only. Notes, progress and warnings go to stderr.
- Exit codes come only from `exit-codes.js`.
- Error codes come only from `errors.js` and form a closed set. A new code is added in the same change as the command that raises the code.
- Only the entry file `cli.js` calls `process.exit()`.
- An error message names the next step the caller can take.

## Modules and Dependencies

- Named exports only.
- Use Node 24 built-ins before a package: the global `fetch`, `node:child_process`, `node:fs/promises`, `node:crypto`.
- Runtime code shells out through `node:child_process`. `execa` is a dev dependency for tests only.
- The commands use commander and zod. The menu under `hedy/src/menu/` uses react, ink and `@inkjs/ui`, and only the menu imports them, so a command never loads them.
- Add no dependency, runtime or dev, without a line in `hedy/DECISIONS.md` giving the reason.

## Comments

- Write code that needs no comment. If a name or an extracted function can say it, rename or extract instead.
- A comment describes only the lines directly below the comment. The comment never describes callers, other modules, a library or a test, and gives no counts.
- Rationale goes in `hedy/DECISIONS.md`, never in code.
- A comment that explains a name means the name is wrong. Rename, then delete the comment in the same change.
- Delete a stale comment. Do not reword a stale comment.
- A marker that a tool reads, such as an `eslint-disable` line, is not a comment to delete.
- Doc comments go only on exported APIs, and only where they state a contract the name and signature do not.

## Ids and History

- No ticket keys, decision codes or session words in code, comments or test titles.
- No history: no before and after narration, no "renamed from", no `REMOVED_*` constants. Code states how things are now, and git holds how they were.

## Names

- A name predicts what the code returns and what it changes. Read the body, then check the name told you both.
- A name's value word covers every value the code can return. `issueTitleOf` that can return a key is wrong; `issueLabelOf`, the title else the key, is right.
- No suffix names a missing value or an expected error: not `…OrNull`, `…OrUndefined` or `…OrNotFound`.
- Rename only when the name mispredicts.
- Name a parameter or local for what it holds at that point, such as `validatedKey` after validation.
- No metaphors in names.
- No positional boolean flags. Pass an options object: `fetchIssue(key, { withComments: true })`.
- One concept has one name across flags, envelope keys, variables and test titles. A rename covers the concept's whole vocabulary.

## Structure

- Each rule lives in one function.
- Extend the mechanism that exists. Do not add a second mechanism beside the first.
- A pipeline whose callbacks branch or take several steps gets named helpers, so the top function reads as a few named steps.
- Build only what this change makes reachable.
- A literal used by one function lives in that function. Module scope is for values the module shares and for module set-up.
- Every file you touch meets these rules in full.

## Errors and Notes

- A branch that changes the outcome, such as a refusal, a retry or a fallback, reports once: in the envelope's `errors`, or as a stderr note naming the key, id or path involved.
- No request or response bodies in notes.
- No empty catch. `.catch(() => undefined)` hides the failure it swallows. A catch handles the case it names or rethrows.
