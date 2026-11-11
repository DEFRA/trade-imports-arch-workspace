# The `hedy` CLI

`hedy` is the workspace's command-line tool for Jira, Confluence and the workspace estate. Skills and agents call it under the `Bash(hedy:*)` allowlist entry, typed as the bare name `hedy`, never as a path. Each command takes `--json` and then prints one envelope line that the caller parses.

## Rule Files

- `.claude/rules/hedy-code.md` holds the source rules and loads for files under `hedy/src/`.
- `.claude/rules/hedy-tests.md` holds the test rules and loads for `*.test.js` files under `hedy/`.
- `.claude/rules/hedy-clients.md` holds the client rules and loads for files under `hedy/src/clients/`.
- `.claude/rules/hedy-menu.md` holds the menu rules and loads for files under `hedy/src/menu/`.
- `hedy/DECISIONS.md` records each design decision and its reason.

## Integrations

- Remote services are reached through in-process clients. The Jira and Confluence clients use the global `fetch`. `hedy` never shells out to `curl`, `jq` or the bash tools under `.claude/tools/`.
- Local tools, `git` and `npm`, are reached through `local-tool.js`, the one place `hedy` shells out through `node:child_process`.
- `hedy` has no GitHub commands, client or token. GitHub work uses `gh`, and pull requests go through `.claude/tools/pr/create-pr.sh`, which refuses attribution content.

## Credentials

- Both Atlassian clients read `JIRA_USER`, `JIRA_TOKEN` and `JIRA_BASE_URL`. Confluence sits at `${JIRA_BASE_URL}/wiki` with the same token.
- The docs repo's publisher reads `CONFLUENCE_USERNAME`, `CONFLUENCE_API_TOKEN` and `CONFLUENCE_URL`. `hedy` sets them in the child process environment from `JIRA_USER`, `JIRA_TOKEN` and `JIRA_BASE_URL`.
- `credentials.js` is the one place a command gets the three values. A command calls it after validating its options. It loads the root `.env`, then reads the three values.
- The environment wins. The root `.env` fills only the variables the environment lacks, through Node's `util.parseEnv`, the parser behind `process.loadEnvFile`, and expands `$NAME` and `${NAME}` references, which direnv also expands, from the file's own values only. A reference never reads the process environment. A single-quoted value stays literal, and `\$` is a literal `$`. A variable set to the empty string counts as set.
- `hedy` never prints a credential value. The `auth` command reports only each account's display name or each service's error.
- The file readers refuse a secrets file by its real path, so a symbolic link cannot route around the rule. The set is the Bash guard's, applied to the file name: a name that ends in `.env` or holds `.env.`, a file named `.npmrc`, `.netrc`, `credentials` or `secrets`, a name starting `credentials.` or `secrets.`, and any file under a `.aws` or `.ssh` folder.

## Source Layout

All paths are under `hedy/src/`.

- `cli.js` is the bin entry. It only parses `process.argv`.
- `program.js` exports `buildProgram()`, which sets the global options `--json`, `--workspace` and `--no-ui`, sets `exitOverride()`, and routes commander's own errors through the exit map in one catch. `runProgram` opens the menu from the no-command error path when stdout and stdin are terminals and neither `--json` nor `--no-ui` is given, and otherwise reports the usage error.
- `commands/<name>.js` holds one command. `commands/<group>/index.js` holds a group, and the group's subcommands sit beside it, one per file.
- `commands/auth.js` probes Jira and Confluence together with one set of credentials and reports each service's failure.
- `commands/jira/` holds `ticket`, which prints one issue, `search`, which lists the issues a JQL query matches, `create`, which raises an issue from a manifest after a dry run, and `describe`, which replaces an issue's description from a file after a dry run. `manifest.js` holds the `hedy-ticket/1` schema and loader. `plan.js` holds the create fields, the warnings, the plan id that both writes use, the check of a confirmed plan id, the description reader and the text that a dry run and a confirmed write print, with `rowValueText`, which turns a row value into text, and `writeOutcomeRows`, the rows of a confirmed write. `ticket.js`, `create.js` and `describe.js` export `ticketRows`, `createPlanRows` and `describePlanRows`, the rows each text mode prints. `files.js` holds the text-file and JSON readers the manifest, description and receipt share. `issue-key.js` holds the issue-key rule.
- `commands/confluence/` holds `page`, which prints one page by id, URL or share link, and `publish`, which checks one docs page, runs the docs repo's publisher, reads its log and reads the page back. `page.js` exports `pageRows`, and `publish.js` exports `renderPublish`. `runPublish` takes a required `confirm` function, called once after the pre-flight, and resolves to `cancelled` with nothing sent unless `confirm` resolves true. `docs-repo.js` holds the docs repo and install checks, the page path forms, the publish config reader, the publishPaths membership and the space rule. `page-title.js` holds the title the publisher gives a page. `page-assets.js` holds the inventory of a page's diagram exports and images and the builds they need. `publisher-log.js` holds the reader of the publisher's log.
- `menu/launch.js` holds `launchMenu`, which mounts the main menu with the launcher's streams, gives the hooks `detach()`, and resolves to the exit code.
- `menu/ink-control.js` holds `mount`, `unmount` and `getCurrent` for the one Ink instance.
- `menu/main-menu.js` is the router over each group's routes.
- `menu/screens.js` holds the screen ids.
- `menu/text-preview.js` holds `previewOf`, which cuts a text to the lines that fit a row budget at the terminal's width and counts the lines hidden, and `moreLinesNote`, the note that names the command printing the whole text.
- `menu/transitions.js` holds `createTransitions`, which gives the hooks `showLoading` and `showErrors` over the router's setters.
- `menu/common/` holds the six shared screens: menu, input, loading, error, result and confirm.
- `menu/auth/`, `menu/jira/` and `menu/confluence/` each hold one `use-<group>-feature.js`, which holds the group's side effects and calls the commands' `run*` functions.
- `html-to-markdown.js` holds `markdownFromHtml`, which turns a Confluence page body into markdown.
- `errors.js` holds `HedyError` and the error codes: `USAGE`, `UNKNOWN`, `AUTH`, `NOT_FOUND`, `RATE_LIMIT`, `NETWORK` and `PARSE`.
- `env-file.js` fills the environment from the root `.env`, setting only the variables the environment lacks.
- `credentials.js` holds `loadCredentials`, which fills the environment from the root `.env` and returns the three Atlassian credentials.
- `clients/atlassian.js` holds `credentialsFromEnv`, the only reader of the three credential variables, and `createAtlassianHttp`, which sends GET, POST and PUT requests with the Basic header, stops a request after `timeoutMs`, and maps every remote outcome to an error code.
- `clients/jira.js` and `clients/confluence.js` hold the Jira and Confluence clients. Each client holds only its endpoints and the projections it returns.
- `local-tool.js` holds `runLocalTool`, which runs a local program with the whole environment the caller gives, collects stdout and stderr, resolves on any exit, and stops the program with SIGTERM, then SIGKILL, after a timeout.
- `exit-codes.js` is the exit map: 0 for success, 1 for an error, 2 for a usage error.
- `envelope.js` builds the JSON envelope: `ok`, `schema_version`, `hedy_version`, `result`, `errors`, and `metadata.ranAt` on success only.
- `run-action.js` writes a command's result: one JSON line on stdout with `--json`, text otherwise, notes on stderr, and the exit code from the map. An `AggregateError` reports several errors at once, one envelope entry or stderr line per error, with the lowest exit code among them.
- `workspace-root.js` resolves the workspace from `--workspace`, then `HEDY_WORKSPACE`, then `~/trade-imports-arch-workspace`. It never walks up from the current folder.
- `test-support/cli.js` spawns the entry and returns stdout, stderr, the exit code and the parsed envelope.
- `test-support/http.js` sets up nock for a test file: real connections are refused, and interceptors are removed after each test. It also holds the test credentials, the credentials environment, the Basic header builder, the failure table the client tests share, a reader for JSON fixtures, a loopback server that never answers for timeout tests, and `startAnsweringServer`, a loopback server for spawned tests that answers with the status and JSON body the test gives and records each request's URL and Authorization header.
- `test-support/io.js` captures what a command or `runAction` writes to stdout and stderr and the exit codes it sets.
- `test-support/menu-streams.js` gives fake terminal streams for the launcher and gate tests.
- `test-support/menu-harness.js` holds `FeatureHarness`, which renders one hook's routes for a test.
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
