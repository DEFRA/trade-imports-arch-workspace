# `hedy` Design Decisions

This file records the design decisions behind `hedy` and the reason for each. It states the design as it stands. When a decision changes, its entry is rewritten in place. `hedy` is modelled on `tim`, the CLI in DEFRA's `trade-imports-workspace`, and several reasons below name a `tim` defect that `hedy` avoids. The research behind these decisions is not in the repository, so this file is the committed record.

## Scope and Runtime

**Name.** The CLI is called `hedy`, after Hedy Lamarr. No other command of that name is expected on PATH.

**Claude Code only.** The rails rely on Claude Code loading `.claude/rules/` by path and reading a nested `CLAUDE.md` on demand. The CLI itself stays usable by any agent, because every command prints a JSON envelope with `--json`.

**Unattended use.** Every command runs without prompts and takes its input from flags and files, so an agent can call the CLI with no person present. A write still needs a confirmed plan id, which a person can review before the agent confirms the plan.

**Baseline.** `hedy` is plain ESM JavaScript on Node 24, with npm and neostandard, as DEFRA's Node and JavaScript standards require. Node 24 is already needed to publish the docs. Doc comments go only on exported APIs where they state a contract.

**Runtime dependencies.** commander parses the command line and zod validates options, and nothing else ships at runtime. Everything else uses Node built-ins. `execa` is a dev dependency for tests, and runtime code shells out through `node:child_process`.

**Pins and lockfile.** Every dependency is pinned exactly, and `hedy/.npmrc` follows the DEFRA standard with `save-exact`, `ignore-scripts` and `min-release-age`. The lockfile is committed, as the standard requires.

## Location and Install

**Folder.** The CLI lives at `hedy/` in the workspace root, not under `.claude/`, and has no nested `.claude/` folder. The edit guard blocks agent writes to any `.claude/hooks/` folder and any `.claude/settings.json`, and a session started inside `hedy/` would lose the workspace skills. The rails are therefore root-scoped: `hedy/CLAUDE.md`, the CLI rule files in `.claude/rules/`, and hooks in `.claude/hooks/`.

**Install.** `make link` runs `npm link` from the checkout's real path, because the Bash guard denies `npm --prefix` across the canonical symlink. Agents type the bare name `hedy` under the `Bash(hedy:*)` allowlist entry.

**Push guard.** A workspace hook denies force pushes and any push to `main`, and names the branch form to use. Unattended runs make an unreviewed push to `main` possible, and the hook removes that path.

## Output Contract

**One envelope.** With `--json`, every command prints one JSON line on stdout with the keys `ok`, `schema_version`, `hedy_version`, `result` and `errors`, plus `metadata.ranAt` on success only. Notes go to stderr. One module builds the envelope and one module writes every command's output, because `tim` spells its envelope by hand in many files and they drift apart.

**One exit map.** Exit 0 means success, 1 an error, and 2 a usage error. commander's own parse errors go through the same map through `exitOverride()`. Without it, commander exits 1 on an unknown option, and a usage error looks like a failure.

**Closed error codes.** The codes are `USAGE`, `UNKNOWN`, `AUTH`, `NOT_FOUND`, `RATE_LIMIT`, `NETWORK` and `PARSE`, and a new code is added with the command that raises the code. The Atlassian HTTP helper maps every remote outcome at one boundary. A failed connection is `NETWORK`, 401 and 403 are `AUTH`, 404 is `NOT_FOUND`, 429 is `RATE_LIMIT`, 400 and any other 4xx is `USAGE` with the service's reasons, 5xx is `NETWORK`, and a body that is not JSON is `PARSE`. A 4xx status is a fault in the request, so retry advice would mislead the caller. A request with no full answer within 30 seconds is `NETWORK`, because a host that accepts the connection and never answers would otherwise hang `auth` and every skill pre-flight. Confluence answers 200 with the anonymous user for credentials it treats as unauthenticated, so the Confluence client reports that answer as `AUTH` instead of a success. A missing or empty credential variable is `AUTH`, the base URL included, because the fix is the same `.env` line. In `tim`, 10 codes fall outside its set, a missing base URL is a usage error, and an auth failure exits 1, 2 or 3 depending on which path raised the failure.

**Several errors at once.** An action that fails for several reasons throws an `AggregateError` of `HedyError` values. The envelope lists each error in `errors`, and text mode writes one line per error. The exit code is the lowest among the errors' exit codes. `auth` uses this to report a failure from Jira and a failure from Confluence in one run.

**Validation first.** zod validates every option before any side effect, so a usage error never leaves a half-done write behind.

## Workspace Root

**Resolution.** `hedy` takes the root from `--workspace`, then `HEDY_WORKSPACE`, then the canonical path `~/trade-imports-arch-workspace`. It never walks up from the current folder, because the workspace path contract forbids runtime root discovery. Both overrides exist for tests and for machines without the canonical symlink.

**Roster last.** The roster file and the workspace verbs that read it arrive in the final increment, because no skill calls them. The roster is read inside those verbs and never at import, because in `tim` a missing manifest read at import crashes every command with a raw stack trace.

## Integrations

**Library-first.** Jira and Confluence are reached through in-process clients over the global `fetch`. The bash tools pass the token on the `curl` command line, where the process list shows it, and the in-process clients remove that exposure. Both clients share one HTTP helper, so the status map is written once, where `tim` repeats the map in each client.

**Local tools.** `git` and `npm` are run as child processes, because they are local programs with no service behind them.

**No GitHub wrapper.** `gh` already does the GitHub work. `create-pr.sh` is a gate around `gh` that refuses attribution content, not a client, and it stays bash.

**Credentials.** The environment wins. A command reads the root `.env` after validating its options and fills only the variables the environment lacks. The file is parsed with Node's `util.parseEnv`, the parser behind `process.loadEnvFile`, which accepts `export KEY=value` lines. The loader then expands `$NAME` and `${NAME}` references, which direnv also expands, to the file's own value for that name, itself expanded, else the empty string. A reference never reads the process environment, so a `.env` cannot pull an unrelated secret into a request. A value in single quotes stays literal, and `\$` is a literal `$`. The workspace `.env` defines the Atlassian token once and refers to the token from the names each tool reads. A variable set to the empty string counts as set. No command prints a credential value, and `auth` reports only each account's display name or each service's error. The publisher's `CONFLUENCE_USERNAME` and `CONFLUENCE_API_TOKEN` are set in its child environment from `JIRA_USER` and `JIRA_TOKEN`, so no new variables are needed.

## Write Contract

**Dry run first.** A write without `--confirm` sends nothing and returns the plan with a `planId`, a hash of the plan's content. `--confirm <planId>` runs only a plan whose hash still matches, so the agent runs exactly what was reviewed.

**Stale plans refused.** A write that replaces a remote value hashes the current remote value into the plan id. A change on the server between the dry run and the confirm then makes the confirm fail instead of overwriting the change.

**Receipt at creation.** The receipt file is written the moment the issue exists, before attachments or links. In `tim` the receipt comes last, so a failed link leaves an issue with no receipt and a retry creates a duplicate.

**Read back.** Every write reads the remote value back and reports `unchanged` when it already holds the requested value, so a confirmed retry does nothing. Each write has a test for the retry.

## Tests

**Tools.** Tests use vitest with explicit imports, nock at the network boundary, and real temp folders. nock is a dev dependency because it intercepts the global `fetch` inside the test process, which is the network boundary the test rules name. A timeout test uses a loopback server that never answers instead of a delayed nock reply, because aborting a request that nock holds raises an uncaught error inside Node's bundled undici.

**In-process and spawned tests.** Network behaviour is tested in-process through exported `run*` functions, because nock cannot reach a child process. The envelope and exit codes are tested by spawning the entry.

**Coverage.** `npm test` runs with coverage at 80% on lines, functions, branches and statements, and only the entry file is excluded. Local runs, the pre-commit hook and CI therefore enforce the same gate. `tim` sets the threshold but its CI never runs coverage.

**Hooks.** Hooks scoped to `hedy/` refuse a new source file without a sibling test and a spy assertion without an override comment. Lint and tests run in the pre-commit hook. A guard against unrequested `npm install` is left out until an unattended run adds a package nobody asked for.

## Porting the Bash Tools

**Cutover.** Each bash tool is deleted in the increment that adds its command, and the same change updates every caller, hook, search and name match. No tool runs in both forms, so parity is proven by tests once instead of claimed for as long as both exist. The allowlist entries in `settings.local.json` are an owner step inside each cutover.

**Test-driven porting.** Each port starts with behaviour tests written from the bash tool's behaviour, its golden tests and its callers. The tests cover the key behaviours and invariants as for a pure function, and table tests are welcome. The tests carry the intention, and the golden tests check byte-for-byte parity. Where no golden tests exist, fixtures are committed against the bash version first. An intended change of behaviour is its own commit with a reviewed re-bless and an entry in this file.

**Order.** Clients and `auth` come first, then reads, writes and publish, then the estate ports as the editorial skills need them. The roster comes last.

**Not built.** No interactive menu, no `--verbose` option and no logging library. No command for a service this workspace does not use. A command is added only with the skill that calls the command.

## Open Tensions

**Claude Code only and other agents.** `AGENTS.md` says colleagues use Cursor, Codex and other tools. The CLI works for them through `--json`, but the rails and hooks act only in Claude Code.

**Lockfile.** The root `.gitignore` ignores `package-lock.json` at any depth, and DEFRA's standard requires the lockfile committed. A negation line keeps `hedy/package-lock.json` tracked. Any other lockfile added under the root is still ignored.

**Research outside the repository.** The research behind these decisions sits in a gitignored analysis folder. This file is the only committed record, so it changes in the same commit as the decision.
