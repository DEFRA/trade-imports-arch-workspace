# The `hedy` CLI

`hedy` is the workspace's command-line tool for Jira, Confluence and the workspace estate. Skills and agents call it under the `Bash(hedy:*)` allowlist entry, typed as the bare name `hedy`, never as a path. Each command takes `--json` and then prints one envelope line that the caller parses.

## Rule Files

- `.claude/rules/hedy-code.md` holds the source rules and loads for files under `hedy/src/`.
- `.claude/rules/hedy-tests.md` holds the test rules and loads for `*.test.js` files under `hedy/`.
- `hedy/DECISIONS.md` records each design decision and its reason.

## Integrations

- Remote services are reached through in-process clients. The Jira and Confluence clients use the global `fetch`. `hedy` never shells out to `curl`, `jq` or the bash tools under `.claude/tools/`.
- Local tools, `git` and `npm`, are reached by shelling out.
- `hedy` has no GitHub commands, client or token. GitHub work uses `gh`, and pull requests go through `.claude/tools/pr/create-pr.sh`, which refuses attribution content.

## Credentials

- Both Atlassian clients read `JIRA_USER`, `JIRA_TOKEN` and `JIRA_BASE_URL`. Confluence sits at `${JIRA_BASE_URL}/wiki` with the same token.
- The docs repo's publisher reads `CONFLUENCE_USERNAME` and `CONFLUENCE_API_TOKEN`. `hedy` sets them in the child process environment from `JIRA_USER` and `JIRA_TOKEN`.
- The environment wins. For any variable it lacks, `hedy` loads the root `.env` through Node's `process.loadEnvFile`.
- `hedy` never prints a credential value. The `auth` command reports variable names and HTTP status only.

## Source Layout

All paths are under `hedy/src/`.

- `cli.js` is the bin entry. It only parses `process.argv`.
- `program.js` exports `buildProgram()`, which sets the global options `--json` and `--workspace`, sets `exitOverride()`, and routes commander's own errors through the exit map in one catch.
- `commands/<name>.js` holds one command.
- `errors.js` holds `HedyError` and the error codes, today `USAGE` and `UNKNOWN`.
- `exit-codes.js` is the exit map: 0 for success, 1 for an error, 2 for a usage error.
- `envelope.js` builds the JSON envelope: `ok`, `schema_version`, `hedy_version`, `result`, `errors`, and `metadata.ranAt` on success only.
- `run-action.js` writes a command's result: one JSON line on stdout with `--json`, text otherwise, notes on stderr, and the exit code from the map.
- `workspace-root.js` resolves the workspace from `--workspace`, then `HEDY_WORKSPACE`, then `~/trade-imports-arch-workspace`. It never walks up from the current folder.
- `test-support/cli.js` spawns the entry and returns stdout, stderr, the exit code and the parsed envelope.
- `__fixtures__/` folders beside the tests hold captured data.

## npm

Run npm against the checkout's real path and type plain `npm`. Where the shell wraps `npm` in a function, that function routes installs through Socket Firewall, and `command npm` would skip the check. The Bash guard denies `npm --prefix` across the canonical symlink and for install-like commands on any workspace path, so install from inside the folder.

```
(cd <real checkout path>/hedy; npm ci)
npm --prefix <real checkout path>/hedy run lint
npm --prefix <real checkout path>/hedy test
```

## User-Facing Text

Help text, error messages and text output follow `.claude/best-practices/writing/language.md`.
