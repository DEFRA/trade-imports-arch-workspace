# Snapshot authoring - documents render current understanding

A document presents the team's current understanding. Readers should not need to reconstruct the sequence of changes that produced that understanding. Version control records that history; the document does not.

## The rule

When a decision, correction or new fact arrives, rewrite the affected passage as if the document had included that knowledge from the start. Replace the old account in place rather than appending a correction.

This holds for every document the work produces, deliverables and working artefacts alike: an analysis file, a requirements list and a one-shot prompt are governed by the rule as much as a published page. Do not use these forms:

- Dated decision annotations: `**Resolution (2026-09-03):**`, `**Update (May 2026):**`, `Edit:`, `[NEW]` markers.
- Revision narrative: "previously this section said X", "updated to reflect", "as of the latest review".
- Corrective addenda that leave the superseded text in place for the reader to reconcile.
- A version history inside the document: a `## Version history` section, a numbered list of `v2, <date>` entries, a "what changed in this version" note, or a pointer to any of them. State the current content and let git record how that content arrived.
- Author-note blocks in a deliverable - notes to a co-author belong in the conversation or the review artefact, never the document readers consume.
- Editorial status inventories or columns that classify sections as proposed, decided, open or complete. State the current design and unresolved questions in the relevant section instead.

Record how a document changed only where the person who asked for the document asked for that record. Provenance apparatus added unasked is work the reader has to remove before using the document.

## Why

A dated annotation forces each reader to reconstruct the current position from a sequence of corrections. Version control or the publishing platform already records that history, so repeating it in the document weakens coherence without adding information.

## The boundary

Artefacts whose job is to record change keep their established format. Describing change is their content, not residue:

- Commit messages and pull request bodies ([commits.md](../git/commits.md), [pull-requests.md](../git/pull-requests.md)).
- Changelogs and release notes, as standalone artefacts. A changelog is a file whose whole content is the record of change, which is not the same as a history section appended to a document that does another job.
- Decision records: a DR or ADR is a point-in-time record with a lifecycle. It is superseded by a new record, not re-authored, and its status line is lifecycle, not a changelog.

A review findings document is the snapshot of its run. Decisions taken after the run are applied to the document under review by re-authoring it; they are never appended to the findings as resolution entries.
