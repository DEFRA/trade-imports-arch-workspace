# Prose Gate Golden Cases

These are the 41 cases of the deleted `check-prose.sh` golden suite, blessed on 10 November 2026. The gate read the word table that is now the authoring skill's `references/language.md`, which a later `hedy prose check` reads as its data, with these cases as its acceptance tests. The expected outputs name the old gate tiers, FAIL and WARN, which map to the file's banned rows and examine rows. In an expected file, `WS` stands for the workspace root. Each case's expected file holds the gate's normalised stdout plus stderr, followed by an `exit-code:` line. The scope-docs cases run inside `fixtures/scope-docs/`, so their paths and labels are relative to that folder.

| Case | Invocation | Input | Expected |
| --- | --- | --- | --- |
| `alone-warn` | `<fixture>` | `fixtures/alone-warn.md` | `expected/alone-warn.txt` |
| `blockquote-quote` | `<fixture>` | `fixtures/blockquote-quote.md` | `expected/blockquote-quote.txt` |
| `clean` | `<fixture>` | `fixtures/clean.md` | `expected/clean.txt` |
| `compression-asides` | `<fixture>` | `fixtures/compression-asides.md` | `expected/compression-asides.txt` |
| `compression-contact` | `<fixture>` | `fixtures/compression-contact.md` | `expected/compression-contact.txt` |
| `compression-ledger` | `<fixture>` | `fixtures/compression-ledger.md` | `expected/compression-ledger.txt` |
| `curly-quotes` | `<fixture>` | `fixtures/curly-quotes.md` | `expected/curly-quotes.txt` |
| `double-backtick` | `<fixture>` | `fixtures/double-backtick.md` | `expected/double-backtick.txt` |
| `emdash` | `<fixture>` | `fixtures/emdash.md` | `expected/emdash.txt` |
| `endash-break` | `<fixture>` | `fixtures/endash-break.md` | `expected/endash-break.txt` |
| `faq-label` | `<fixture>` | `fixtures/faq-label.md` | `expected/faq-label.txt` |
| `fenced-exemplar` | `<fixture>` | `fixtures/fenced-exemplar.md` | `expected/fenced-exemplar.txt` |
| `heading-case` | `<fixture>` | `fixtures/heading-case.md` | `expected/heading-case.txt` |
| `hyphen-break` | `<fixture>` | `fixtures/hyphen-break.md` | `expected/hyphen-break.txt` |
| `inventory-opener` | `<fixture>` | `fixtures/inventory-opener.md` | `expected/inventory-opener.txt` |
| `jargon-new` | `<fixture>` | `fixtures/jargon-new.md` | `expected/jargon-new.txt` |
| `jargon-shape` | `<fixture>` | `fixtures/jargon-shape.md` | `expected/jargon-shape.txt` |
| `jargon` | `<fixture>` | `fixtures/jargon.md` | `expected/jargon.txt` |
| `metaphor-softens` | `<fixture>` | `fixtures/metaphor-softens.md` | `expected/metaphor-softens.txt` |
| `metaphor-warn` | `<fixture>` | `fixtures/metaphor-warn.md` | `expected/metaphor-warn.txt` |
| `na-cell` | `<fixture>` | `fixtures/na-cell.md` | `expected/na-cell.txt` |
| `portal-proper-noun` | `<fixture>` | `fixtures/portal-proper-noun.md` | `expected/portal-proper-noun.txt` |
| `question-heading` | `<fixture>` | `fixtures/question-heading.md` | `expected/question-heading.txt` |
| `question-opener` | `<fixture>` | `fixtures/question-opener.md` | `expected/question-opener.txt` |
| `semicolon-body` | `<fixture>` | `fixtures/semicolon-body.md` | `expected/semicolon-body.txt` |
| `trailing-pronoun` | `<fixture>` | `fixtures/trailing-pronoun.md` | `expected/trailing-pronoun.txt` |
| `vague-warn` | `<fixture>` | `fixtures/vague-warn.md` | `expected/vague-warn.txt` |
| `stdin-title-viol` | `--stdin --label title` | `stdin/stdin-title-viol.txt` on stdin | `expected/stdin-title-viol.txt` |
| `stdin-title-clean` | `--stdin --label title` | `stdin/stdin-title-clean.txt` on stdin | `expected/stdin-title-clean.txt` |
| `stdin-print-fail-lines` | `--stdin --label plines --print-fail-lines` | `stdin/stdin-print-fail-lines.txt` on stdin | `expected/stdin-print-fail-lines.txt` |
| `missing-file` | `fixtures/does-not-exist.md` | no file at that path | `expected/missing-file.txt` |
| `terms-table` | `--terms terms-table/terms.md terms-table/page.md` | `fixtures/terms-table/terms.md` and `fixtures/terms-table/page.md` | `expected/terms-table.txt` |
| `terms-bad-form` | `--terms terms-table/bad-terms.md terms-table/page.md` | `fixtures/terms-table/bad-terms.md` and `fixtures/terms-table/page.md` | `expected/terms-bad-form.txt` |
| `terms-no-table` | `--terms terms-table/no-table.md terms-table/page.md` | `fixtures/terms-table/no-table.md` and `fixtures/terms-table/page.md` | `expected/terms-no-table.txt` |
| `scope-docs-file` | `--terms terms.md page.md`, run inside `scope-docs/` | `fixtures/scope-docs/terms.md` and `fixtures/scope-docs/page.md` | `expected/scope-docs-file.txt` |
| `scope-docs-agent-skill` | `--stdin --label .claude/skills/x/SKILL.md --terms terms.md`, run inside `scope-docs/` | `fixtures/scope-docs/page.md` on stdin, with `fixtures/scope-docs/terms.md` | `expected/scope-docs-agent-skill.txt` |
| `scope-docs-agent-claude-md` | `--stdin --label hedy/CLAUDE.md --terms terms.md`, run inside `scope-docs/` | `fixtures/scope-docs/page.md` on stdin, with `fixtures/scope-docs/terms.md` | `expected/scope-docs-agent-claude-md.txt` |
| `scope-docs-page` | `--stdin --label docs/page.md --terms terms.md`, run inside `scope-docs/` | `fixtures/scope-docs/page.md` on stdin, with `fixtures/scope-docs/terms.md` | `expected/scope-docs-page.txt` |
| `scope-bad-token` | `--terms bad-scope.md page.md`, run inside `scope-docs/` | `fixtures/scope-docs/bad-scope.md` and `fixtures/scope-docs/page.md` | `expected/scope-bad-token.txt` |
| `profile-discovery` | `profile-discovery/pages/page.md` | `fixtures/profile-discovery/pages/page.md`, with `fixtures/profile-discovery/editorial-profile.md` found by discovery | `expected/profile-discovery.txt` |
| `profile-discovery-stdin` | `--stdin --label profile-discovery/pages/page.md --print-fail-lines` | `fixtures/profile-discovery/pages/page.md` on stdin, with `fixtures/profile-discovery/editorial-profile.md` found by discovery | `expected/profile-discovery-stdin.txt` |

## Mapping to hedy Prose Check

The file `hedy/src/commands/prose/__fixtures__/expected-findings.json` holds the findings that each case gives under `hedy prose check`, as `{ line, kind, term }`. The script `gate-data/derive-expected-findings.mjs` derived the file from the expected outputs, and each case was reviewed against its expected output on 11 November 2026. The script applied these rules:

- A FAIL line whose message names a banned term maps to `banned`, as does the message for a lower-case `portal`. A WARN line whose message names terms maps to `examine`. In both, `term` lists the named terms that appear on that line, in the order of the message.
- The punctuation message maps to one `shape` finding for each mark on the line: `em dash`, `spaced en dash` or `curly quote`. The `N/A` message maps to `N/A`, and the trailing-pronoun message maps to `trailing it`.
- A message for a shape outside round 1 maps to an entry under `deferred`, so that round 3 has the data. The names are `faq heading`, `faq label`, `faq opener`, `header preposition`, `heading case`, `inventory opener`, `contact clause`, `aside stacking`, `spaced hyphen` and `semicolon`.
- A finding whose rule came from a terms file or a profile is not carried over.

The review found that every FAIL and WARN word finding sits in the table of `language.md` that matches its tier. The derived data differs from a plain copy in five ways:

- The output of `stdin-print-fail-lines` held only the failing lines, so its findings were written by hand from the text: `seamless` and an em dash on line 1, and `portal` on line 3.
- The three scope cases share the page `pages/scope-docs.md` and differ only in label. The label `docs/page.md` gives the `you` finding, and the labels `.claude/skills/x/SKILL.md` and `hedy/CLAUDE.md` do not.
- The hedy copy of `portal-proper-noun.md` holds the URL `https://portal.example.test/services` in place of an internal address, because the repository is public. The findings do not change.
- The tests label each page `pages/<case>.md`. The old gate read the pages under `.claude/`, which skipped the `you` row. No page holds a `you` form, so no finding changes.
- `hedy prose check` masks front matter for every rule. The two pages with front matter, `hyphen-break` and `semicolon-body`, hold only deferred findings, and none of those lies inside the front matter.

These cases are retired:

- `missing-file`, because a missing file is a usage error in hedy and exits 2, not 1. The command's own test covers the case.
- `terms-table`, `scope-docs-file` and `scope-bad-token`, because hedy has no `--terms` option. The parser's fixtures `tables/bad-form.md` and `tables/empty-table.md` take the place of `terms-bad-form` and `terms-no-table`.
- `profile-discovery` and `profile-discovery-stdin`, because hedy has no profile discovery.

`stdin-print-fail-lines` stays as a standard input case without the `--print-fail-lines` option, which hedy does not have.
