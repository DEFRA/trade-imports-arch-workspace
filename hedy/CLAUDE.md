# The `hedy` CLI

`hedy` is the workspace's command-line tool for Jira, Confluence and the workspace estate. Skills and agents call it under the `Bash(hedy:*)` allowlist entry, typed as the bare name `hedy`, never as a path. Each command takes `--json` and then prints one envelope line that the caller parses.

## Rule Files

- `.claude/rules/hedy-code.md` holds the source rules and loads for files under `hedy/src/`.
- `.claude/rules/hedy-tests.md` holds the test rules and loads for `*.test.js` files under `hedy/`.
- `.claude/rules/hedy-clients.md` holds the client rules and loads for files under `hedy/src/clients/`.
- `hedy/DECISIONS.md` records each design decision and its reason.

## Integrations

- Remote services are reached through in-process clients. The Jira and Confluence clients use the global `fetch`. `hedy` never shells out to `curl`, `jq` or the bash tools under `.claude/tools/`.
- Local tools, `git` and `npm`, are reached by shelling out.
- `hedy` has no GitHub commands, client or token. GitHub work uses `gh`, and pull requests go through `.claude/tools/pr/create-pr.sh`, which refuses attribution content.

## Credentials

- Both Atlassian clients read `JIRA_USER`, `JIRA_TOKEN` and `JIRA_BASE_URL`. Confluence sits at `${JIRA_BASE_URL}/wiki` with the same token.
- The docs repo's publisher reads `CONFLUENCE_USERNAME` and `CONFLUENCE_API_TOKEN`. `hedy` sets them in the child process environment from `JIRA_USER` and `JIRA_TOKEN`.
- The environment wins. A command reads the root `.env` after validating its options and fills only the variables the environment lacks, through Node's `util.parseEnv`, the parser behind `process.loadEnvFile`, and expands `$NAME` and `${NAME}` references, which direnv also expands, from the file's own values only. A reference never reads the process environment. A single-quoted value stays literal, and `\$` is a literal `$`. A variable set to the empty string counts as set.
- `hedy` never prints a credential value. The `auth` command reports only each account's display name or each service's error.

## Source Layout

All paths are under `hedy/src/`.

- `cli.js` is the bin entry. It only parses `process.argv`.
- `program.js` exports `buildProgram()`, which sets the global options `--json` and `--workspace`, sets `exitOverride()`, and routes commander's own errors through the exit map in one catch.
- `commands/<name>.js` holds one command.
- `commands/auth.js` probes Jira and Confluence together with one set of credentials and reports each service's failure.
- `errors.js` holds `HedyError` and the error codes: `USAGE`, `UNKNOWN`, `AUTH`, `NOT_FOUND`, `RATE_LIMIT`, `NETWORK` and `PARSE`.
- `env-file.js` fills the environment from the root `.env`, setting only the variables the environment lacks.
- `clients/atlassian.js` holds `credentialsFromEnv`, the only reader of the three credential variables, and `createAtlassianHttp`, which sends the Basic header, stops a request after `timeoutMs`, and maps every remote outcome to an error code.
- `clients/jira.js` and `clients/confluence.js` hold the Jira and Confluence clients. Each client holds only its endpoints and the projections it returns.
- `exit-codes.js` is the exit map: 0 for success, 1 for an error, 2 for a usage error.
- `envelope.js` builds the JSON envelope: `ok`, `schema_version`, `hedy_version`, `result`, `errors`, and `metadata.ranAt` on success only.
- `run-action.js` writes a command's result: one JSON line on stdout with `--json`, text otherwise, notes on stderr, and the exit code from the map. An `AggregateError` reports several errors at once, one envelope entry or stderr line per error, with the lowest exit code among them.
- `workspace-root.js` resolves the workspace from `--workspace`, then `HEDY_WORKSPACE`, then `~/trade-imports-arch-workspace`. It never walks up from the current folder.
- `test-support/cli.js` spawns the entry and returns stdout, stderr, the exit code and the parsed envelope.
- `test-support/http.js` sets up nock for a test file: real connections are refused, and interceptors are removed after each test. It also holds the test credentials, the credentials environment, the Basic header builder, the failure table the client tests share, and a loopback server that never answers for timeout tests.
- `test-support/io.js` captures what a command or `runAction` writes to stdout and stderr and the exit codes it sets.
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
