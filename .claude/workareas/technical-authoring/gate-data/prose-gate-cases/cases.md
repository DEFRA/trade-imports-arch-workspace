# Prose Gate Golden Cases

These are the 41 cases of the deleted `check-prose.sh` golden suite, blessed on 10 November 2026. The gate reads the word table in `../word-table.md`. In an expected file, `WS` stands for the workspace root. Each case's expected file holds the gate's normalised stdout plus stderr, followed by an `exit-code:` line. The scope-docs cases run inside `fixtures/scope-docs/`, so their paths and labels are relative to that folder.

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
