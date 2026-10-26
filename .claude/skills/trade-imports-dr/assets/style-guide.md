# DR writing style guide

Read this every time you write or edit a DR. The rules are opinionated and easy to breach on autopilot. Reviewers have corrected each of these more than once in past DRs.

## Voice and register

- **Write warmly but professionally**: government context, so the reader is a senior product owner, security architect or service designer, not a customer. Avoid marketing language.
- **Be kind without softening**: no "genuinely", "honestly", "quite frankly", "importantly", "note that", "it is worth noting that". Say the thing.
- **Keep it concise**; a good test is whether you can delete words and still get the point across.
- **Explain the *why***: the reader wants to understand the decision, not just be told it, so every recommendation should carry its reasoning.

## Things to Avoid

### Em dashes: never

Not in prose, not in tables, not in captions. Use commas, colons, semicolons, parentheses or full stops instead. Grep for `—` before you claim to be done:

```bash
grep -n "—" <file>
```

The character to search for is U+2014 (EM DASH). En dashes (`–`, U+2013) are acceptable in date and page ranges (`12–13 May`) and character ranges (`A–Z`) but nowhere else.

### Emoji and decorative icons: never in prose

The only place iconography belongs is inside diagrams, and only when it aids comprehension of the diagram itself. Do not decorate headings, bullets, tables or callouts with emoji. Section headers use plain text.

### AI-style ornament

- No section dividers of decorative characters.
- No trailing sign-offs like "In summary,…" at the end of every section.
- No "Let me…" or "I'll…" framing sentences.
- No em dashes (repeated because it happens most often).

### Bullet highlights: bold flows into the sentence

Each bullet should carry an inline highlight of the first few words in bold, flowing naturally into the rest of the sentence. Bold is emphasis on the lead, not a standalone label. Do not use the pattern `**Label.** Full sentence.` with the bold portion ended by a full stop; the bold portion is grammatically part of the sentence that follows.

Good:

> - **Keep a hyphen** between commodity subcode and year, otherwise the parser can't tell where the prefix ends.
> - **The body is digits-only** so there is no ambiguity between the digit `0` and the letter `O`.
> - **The following describes** the fallback behaviour when the lookup times out.

Bad (bold used as a discrete label with a period):

> - **Keep a hyphen between commodity subcode and year.** `GBN-AG26-00001` glues the subcode to the year and a parser can't tell where the prefix ends.

Bad (no highlight, reader has to read the full bullet to find the point):

> - `GBN-AG-26-00001` parses cleanly and `GBN-AG26-00001` glues the subcode to the year, so we recommend keeping a hyphen between commodity subcode and year.

A reader skimming should be able to glance at the bolded openings and get the gist without reading every full bullet.

## Things to Do

### Lead the recommendation

For any rationale bullet, sub-heading or callout, the first sentence should carry the recommendation. Everything after is supporting detail. This is why bullets highlight the lead in bold, per the *Bullet highlights* rule above.

### Quote endorsements verbatim

If a security reviewer, product owner or data architect has endorsed the decision, quote them verbatim in a blockquote with attribution and date. Do not paraphrase; future readers need to see the source.

Format:

```markdown
**Security recommendation (Joe Ball, Defra Security, DD Month YYYY).** Short lead-in sentence.

> Verbatim quote from the source.
```

### Cite dates and sources

Every claim about who endorsed what, when a check was performed, when a decision was ratified: cite the date. Bare "we discussed this" ages badly.

### Table anything with more than three parallel items

Segment rules, alternatives considered, decision log, version history: all tables. Bulleted lists get tiresome above three items and lose their structural clarity.

### Keep the Version History

Every substantive edit adds a row to the version history table. Confluence readers use this to see what has moved between publishes; source-control diff shows what changed line-by-line but not why.

Row format:

```markdown
| 0.N | YYYY-MM-DD | Name (Team) | One sentence: what changed, why. |
```

Bump the digit conservatively. Typo fix → same version, no row. Substantive re-write → new row.

### Worked examples

For any format or code-shape decision, give at least two worked examples in a table (Scenario / Example). One "first of the year" example, one "mid-range typical" example. If variants exist (e.g. commodities), give one per variant.

## Length

Aim for one page in Confluence when rendered. Long DRs (>3 screens) are usually a sign that two decisions are being conflated; consider splitting.

## Publishing sanity check

Before saying "ready to publish", run:

```bash
grep -n "—" <file>                        # em dash sweep, must return nothing
node scripts/validate-docs-frontmatter.mjs   # frontmatter sanity (requires title)
```

Both must be clean.
