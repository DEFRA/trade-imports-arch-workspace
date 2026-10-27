---
paths:
  - "cli/**/*.test.js"
---

# `hedy` Test Rules

These rules apply to every test file under `cli/`. Hooks under `.claude/hooks/` enforce 2 of them: `cli-require-sibling-test.sh` refuses a new source file without its test, and `cli-forbid-spy-assertions.sh` refuses a spy assertion.

## Assertions

- Assert behaviour through inputs and outputs: the return value, the thrown `HedyError` and its code, the parsed envelope, the exit code, the files written.
- No spy assertions: `toHaveBeenCalled`, `toHaveBeenCalledWith` and `toHaveBeenCalledTimes`. The exception is a call that is itself the external side effect. Then put `// allow-spy-assertion: <why>` in the block and assert on the captured payload, not on the spy record. The spy hook honours that comment.
- A test title states what its assertions prove.
- A test must fail without the change it covers.
- Test the key behaviours and invariants first, as for a pure function. Use `it.each` tables for a family of rules.
- Fix a flaky assertion. Never delete or loosen it, and never add a test only to raise coverage.

## Boundaries and Data

- Import `describe`, `it`, `expect` and any other helper from `vitest` explicitly. No globals.
- Mock only at the network boundary, with nock. Never `vi.mock()` a module under `cli/src/`.
- Use real temp folders from `fs.mkdtemp` under `os.tmpdir()` and remove them after the test. Never mock `fs`.
- Fixtures are captured data from the real service or tool, with credentials and personal data removed. They live in a `__fixtures__/` folder beside the test.
- Set-up used by more than one test goes in `cli/src/test-support/`. Promoting a helper deletes the local copies.

## In-Process and Spawned Tests

- Test a command's behaviour in-process, by calling its exported `run*` function under nock. Every path that reaches the network is tested this way, because nock patches the test process and cannot reach a child process.
- Test the envelope, the exit codes and argument parsing by spawning the entry through `cli/src/test-support/cli.js`. A spawned test never reaches the network.

## Sibling Tests

- Every new `cli/src/**/*.js` file arrives in the same diff as its sibling `<name>.test.js`, and the test is written first.
- The sibling hook allows `*.test.js` files, anything under `test-support/` or `__fixtures__/`, and a rewrite of a file that already exists.

## Coverage

- `npm test` runs with coverage and fails below 80% on lines, functions, branches or statements.
- Only the entry file `cli/src/cli.js` is excluded, because spawned tests run it in a child process that v8 coverage cannot see. Add no other exclusion.
