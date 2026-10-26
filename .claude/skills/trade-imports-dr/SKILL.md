---
name: trade-imports-dr
description: Create or update a Decision Record (DR) in the DEFRA trade-imports-documentation repo (a workspace child project this skill depends on), following the DR-EUDP-NNN template established by DR-EUDP-001. Use this skill whenever the user wants to write, draft, capture, publish or update a decision record for the EU DP / Reset programme or any other work in the trade-imports-documentation repo. Triggering phrases include "new DR", "start a DR", "draft a DR", "write a decision record", "DR-EUDP", "document this decision", "add a DR for", "update DR-EUDP-002", "capture this as a DR", or any mention of writing decision records for the EUDP, trade-imports or SPS-Reset domains. Produces markdown under `docs/systems/EUDP/Architecture and Development/DR/` with a kebab-case filename per DR, plus optional inline SVG diagrams stored alongside in `diagrams/`. The publish pipeline base64-embeds any referenced SVGs directly into the Confluence page, so relative image references from the DR just work.
metadata:
  workspace-deps: trade-imports-documentation npm
---

# Trade-imports Decision Record (DR)

Produce a new Decision Record for the trade-imports-documentation repo, or update an existing one, following the DR-EUDP-001 template. Decision Records here are one-page records aimed at both technical and product stakeholders; they capture the *what*, the *why*, the *who* and the *when* of a decision that has been (or is about to be) made.

The skill covers:

- what a DR looks like in this repo (template and conventions),
- how to place it on disk so the docs build and Confluence publish both pick it up,
- how to add inline SVG diagrams for decisions that involve a format, structure or flow,
- the DR writing style rules (which an author will otherwise repeatedly miss),
- how to publish it to Confluence.

Bundled resources live under `assets/`. Read them when you need the detail; SKILL.md itself is the workflow.

**Bash call hygiene** - one command per Bash call; paths in the literal `~/trade-imports-arch-workspace/...` form. Full rules: [`agent-skills.md`](../../best-practices/skills/agent-skills.md).

## Dependencies

This skill writes into, validates with and publishes from the `trade-imports-documentation` child project, so it needs that repository cloned at `~/trade-imports-arch-workspace/trade-imports-documentation/` (run `make` at the workspace root) with `npm install` done there, and `npm` on the path. Publishing also needs Atlassian credentials in the environment (`CONFLUENCE_USERNAME`, `CONFLUENCE_API_TOKEN`); see that repository's README.

---

## Assets to Consult

| You need | Read |
|---|---|
| The DR markdown template | `assets/template.md` |
| Style / voice rules to write in (very important) | `assets/style-guide.md` |

Read `assets/style-guide.md` on every invocation. The rules are opinionated and easy to breach if you're writing on autopilot.

---

## Workflow

The workflow has five stages. Do them in order. Confirm with the user between stages where marked.

### 1. Understand the decision

Ask the user just enough to be able to draft the record. You need:

1. A short title (the DR will be titled `DR-EUDP-NNN: <Title>`).
2. What decision is being made or has been made (in one or two sentences).
3. Who owns the decision, who is the product / business sponsor, and who has already reviewed or endorsed the decision. Names and roles.
4. The status: `Proposed`, `Accepted`, `Superseded`. Most DRs start as `Proposed` and move to `Accepted` after review.
5. Whether the decision involves a format, structure or flow that would benefit from a diagram.

If any of these are unclear, ask. Don't guess about sponsorship or endorsements; those go into the decision log verbatim and matter for governance.

If the user is turning an existing conversation, email thread, Slack thread or Confluence draft into a DR, offer to read the source material first and extract the answers yourself, then confirm with them rather than making them dictate.

### 2. Number the DR

DRs in this repo are numbered `DR-EUDP-001`, `DR-EUDP-002`, and so on. To pick the next number, list the existing DRs in the target folder and increment the highest. Use Glob with the pattern `~/trade-imports-arch-workspace/trade-imports-documentation/docs/systems/EUDP/Architecture and Development/DR/DR-EUDP-*.md`, or one plain `ls` of that folder with no pipes.

Confirm the number with the user before writing the file. If two DRs are being drafted in parallel, coordinate rather than clashing.

The filename convention is:

```
DR-EUDP-<NNN>-<kebab-case-slug>.md
```

Slug should be short (three to five words), lower-case, hyphen-separated. It appears in the file path and in URLs; it does not need to match the title exactly, only to identify the DR.

### 3. Draft the record

Read `assets/template.md`. Copy its structure verbatim into the new DR file at `docs/systems/EUDP/Architecture and Development/DR/DR-EUDP-<NNN>-<slug>.md`, and fill in each section with the material from stage 1.

Sections are:

| Section | Content |
|---|---|
| YAML frontmatter | `title:` and `version:`. Frontmatter with a `title` is required by the Astro build (see `scripts/validate-docs-frontmatter.mjs`); a missing title fails the build. |
| H1 heading | Matches the title exactly. |
| Metadata table | Status, Date, Proposed By, Agreed On, Agreed By, Decision. This mirrors the pattern used by ADRs in the same repo. |
| Summary | One tight paragraph plus a bullet list of the essentials someone would need to know if they read nothing else. Written for a non-technical reader as well as a technical one. |
| Context | What led to the decision. Includes the two related-but-separate concerns table where relevant (e.g. business decision vs technical implementation). |
| Decision | The chosen approach. Always include a diagram if the decision is a format, structure or flow. Include a segment / rule table. Include worked examples. |
| Rationale | *Why* this option, not the others. Use sub-headings if the rationale has multiple threads. Quote external endorsements (security, data architecture, product) verbatim in blockquotes with attribution and date. |
| Alternatives considered | A two-column table (Option, Outcome) covering the options that were seriously discussed and why each was rejected or accepted. |
| Out of scope | Bullet list of things the DR deliberately does not cover, so future readers do not read implications that aren't there. |
| Decision log | Table of Role, Name, Position; one row per person or team that formally weighed in. |
| Version history | Table of Version, Date, Author, Change. Every substantive edit adds a row. This is important because the DR is source-controlled but Confluence users rely on it to see what changed. |

Follow `assets/style-guide.md` throughout. In particular: no em dashes, no emoji in prose, no filler.

### 4. Diagrams (only if the decision needs one, always ad-hoc)

Not every DR needs a diagram. Use one only when the decision is fundamentally about a format, a structure, or a flow that is easier to see than describe. Free-text decisions (a choice of vendor, a governance approach, a policy) rarely need diagrams and forcing one in adds noise.

Diagrams here are always ad-hoc, drawn for the specific DR. There is no reusable template. Look at the SVGs produced for DR-EUDP-001 (`docs/systems/EUDP/Architecture and Development/DR/diagrams/numbering-scheme-diagram-*.svg`) as a colour-and-typography reference if one is already there, but design the shape and content from scratch to fit the decision at hand.

Practical conventions when you do add a diagram:

- **Store SVGs alongside the DR** in `docs/systems/EUDP/Architecture and Development/DR/diagrams/`, named after the DR (`dr-eudp-<NNN>-<what-it-shows>.svg`).
- **Reference them from the DR** with a markdown image whose target is the relative path `./diagrams/dr-eudp-<NNN>-<what-it-shows>.svg` (the template's Decision section shows the full image line).
- **Publishing is automatic**: the publish pipeline reads each referenced SVG, base64-encodes it, and inlines it into the Confluence page body as a `data:image/svg+xml;base64,…` `<img>` tag, so relative paths to SVGs on disk just work with no separate attachment step.
- **Variants get one SVG each** rather than being crammed into a single diagram (for example one per commodity when the format is parameterised).
- **Prefer Mermaid for flows** (sequence, state machine) over a static SVG, using `<MermaidDiagram diagramId="..." />` following the pattern in the ADR folder alongside; Mermaid is a first-class citizen in the repo's toolchain.

### 5. Publish

Once the DR is drafted and the user has reviewed the file locally:

1. Validate frontmatter: run `node scripts/validate-docs-frontmatter.mjs` with `~/trade-imports-arch-workspace/trade-imports-documentation` as the working directory (do not chain a `cd` with the command; set the working directory on the call). This confirms the DR has a `title:` in its frontmatter and won't break the Astro build.
2. Commit the file and any diagrams with `git -C ~/trade-imports-arch-workspace/trade-imports-documentation add ...` and then `git -C ~/trade-imports-arch-workspace/trade-imports-documentation commit ...`, one command per Bash call.
3. Publish to Confluence:

   ```bash
   npm --prefix ~/trade-imports-arch-workspace/trade-imports-documentation run publish:confluence -- --file "docs/systems/EUDP/Architecture and Development/DR/DR-EUDP-<NNN>-<slug>.md"
   ```

   The publisher walks the markdown, base64-encodes any referenced SVGs, and creates or updates a Confluence page. It only updates existing Confluence pages that carry the `generated` label. If this DR was drafted in Confluence first and needs its first source-controlled publish, add the `generated` label to the existing Confluence page once so the publisher can take it over.

Stop after publishing. Do not commit or push on the user's behalf without explicit sign-off; the DR is a governance document and the user may want to hand-review the diff first.

---

## Updating an existing DR

If the user is updating an existing DR rather than creating a new one:

1. Read the current DR to understand what's there.
2. Make the edit in place.
3. **Always add a row to the Version history** with a new version number, today's date, the author's name and a one-line description of what changed. This is the mechanism Confluence readers use to see what has moved between publishes; if you skip it, the change history is lost.
4. If the substance of the decision changed (rather than a wording tweak), bump the version's first digit as well. Typo fixes → patch bump. New rationale, new alternative considered, changed endorsement → minor bump.
5. Re-publish with the same `npm run publish:confluence` command.

---

## DR Location

Target repo (canonical workspace path):

```
~/trade-imports-arch-workspace/trade-imports-documentation/
```

DR folder within the repo:

```
docs/systems/EUDP/Architecture and Development/DR/
```

Confluence space for publishing: `EUDP` (mapped in `scripts/confluence/confluence-config.json`).

There is a separate `ADR/` folder in the same directory for Architecture Decision Records; those follow a similar pattern but a different filename convention (`ADR-EUDP-NNN-*.md`). DRs are broader (business / product / policy / cross-cutting), ADRs are strictly architecture. Do not conflate them; if in doubt, ask the user which they want.

---

## Anti-patterns to avoid

Things reviewers have repeatedly corrected in past DRs that the writer will drift into if not warned:

- **Never decorate prose with emoji or icons**; the only iconography allowed is inside diagrams, and only when it aids comprehension of the diagram itself.
- **No em dashes anywhere**, not in prose, not in tables, not in captions. Use commas, colons, semicolons, parentheses or full stops instead. Grep for `—` before claiming to be done.
- **Never produce wall-of-text bullets**: each bullet should carry its lead in the first few words in bold, flowing into a sentence of explanation, so someone skimming can read only the bolded openings and get the gist.
- **Cut filler adverbs and throat-clearing** such as "genuinely", "honestly", "in essence", "quite frankly", "importantly". Say the thing.
- **Drop "note that" and "it is worth noting that"**; just say the thing.
- **Never enter speculative sponsorship or endorsements** into the decision log. If the sponsor is unconfirmed, write `TBA - Defra` or the equivalent placeholder and flag it back to the user.

If the writer catches themselves reaching for any of these, that's the signal to pause and rewrite the sentence.
