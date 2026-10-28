---
paths:
  - "hedy/src/menu/**"
---

# `hedy` Menu Rules

These rules apply to every file under `hedy/src/menu/`, tests included, on top of the source and test rules. A breach is a defect to fix in the same change.

## Language

- Every string a person reads follows `.claude/best-practices/writing/language.md`.
- A screen addresses the person as "you" and states the action in plain words.
- An error names the next step the person can take.

## Screens

- A screen is pure given its props. A screen makes no network call, reads or writes no file and starts no process.
- One screen per file.
- The shared screens live under `menu/common/`. A command group reuses them and never forks a copy.
- Build every element with `createElement` from `react`, over Ink's `Box`, `Text` and `useInput` and the `@inkjs/ui` widgets. `hedy` has no JSX transform.
- A frame fits a terminal. The shared result and confirm screens cut long text to the rows that fit at the terminal's width, through `previewOf` from `menu/text-preview.js`, and their note names the command that prints the whole text, which the hook passes as `wholeText`.

## Hooks

- One `use-<group>-feature.js` per command group holds every side effect of the group.
- A hook calls a command's exported `run*` function and never a client.
- A hook takes its boundary functions as parameters with real defaults, so a test passes a fake without `vi.mock`.
- A hook catches every error and passes the error to `showErrors` from `menu/transitions.js`, which turns the error into the list `toHedyErrors` gives and shows the error screen; `showLoading` from the same module shows the loading screen with its message.
- The confirm for a write defaults to cancel, so a stray Enter sends nothing.

## Leaving Ink for a Long Run

- A command that streams output calls `detach()` before the run starts.
- The hook calls the `settle` function that `detach()` returns with the exit code when the run ends.
- No frame renders over a child's output.

## Tests

- Render a screen or a hook's routes in-process under ink-testing-library.
- Drive keys through `stdin.write`, with a short pause between keys, and assert on `lastFrame()` under `vi.waitFor`.
- Inject a function that records its arguments in a plain array and returns a fixture result. Assert on that array, never on a spy.
- No menu test reaches the network. The commands' own tests keep nock.
