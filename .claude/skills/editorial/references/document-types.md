# Document types and structure

Choose the reader's job before choosing the structure. For ordinary documentation, use the [Diátaxis](https://diataxis.fr/) mode that best matches what the reader wants to do. A large README or landing page may route readers to several modes, but each self-contained section should have one clear job.

| Mode | Reader's job | Voice | Structure |
| --- | --- | --- | --- |
| Tutorial | Learn by doing for the first time | Coach. "We" for shared progress and the imperative for learner actions ("Run the migration"), never "you". Present tense | One path that works. Numbered steps. A visible result at each stage |
| How-to | Complete a task they already understand | Instructor. The imperative for every step. Assumes competence | Prerequisites, then numbered steps towards the goal |
| Reference | Look up a fact | Neutral, concise and consistent | Tables and lists that mirror the subject; complete and predictable |
| Explanation | Understand how or why | Discursive; may compare alternatives and trade-offs | Connected prose under concrete headings |

Keep material that serves a different reader job out of the main flow:

- A tutorial gives the learner one path. Move optional branches and background explanations elsewhere.
- A how-to keeps the reader moving through the task. Include the criterion and a short example when a step requires judgment, but link to background teaching.
- A reference records facts or rules without persuasion. A style guide may state rules imperatively because the rules are the subject.
- An explanation develops an argument or mechanism. It may cover system or domain history when that history explains the present design, but it must not narrate the document's own revision history. Extract runnable step sequences into a how-to.

A numbered mechanism can belong in an explanation when sequence carries the meaning and every step names its actor. A single command shown as a fact does not turn a reference or explanation into a how-to.

## Structural forms

- Use a numbered list for reader actions and ordered mechanisms.
- Use bullets for discrete criteria, options or facts whose order does not carry meaning.
- Use a table when readers compare several items across the same fields.
- Use prose for a connected argument, causal explanation or qualification.
- Keep a rule beside its necessary qualification. Do not scatter exceptions across later sections.

A sequence or causal chain of interactions between named components, with their conditions, that a reader would follow more easily as a diagram is a diagram candidate: a sequence diagram for ordered exchanges, a flow diagram for decisions, a state diagram for one entity's lifecycle. Where a diagram exists, the prose beside it states consequences, limits and open questions and does not restate the arrows. A diagram is drawn only from stated actors, steps and conditions, never from an arrow the text does not state.

During review, look for conceptual asides that interrupt a procedure, advice embedded in a reference table, unexplained step sequences in an explanation, and background paragraphs that a task-focused reader must scroll past.

## Document Shapes

Classify first, then apply the shape. These shapes hold for the artefacts no other guidance in the workspace owns:

- Design document or technical specification: purpose and scope, context and constraints, the design (components, interfaces, data, sequence of events), decisions and trade-offs, operational concerns (deployment, monitoring, failure modes, capacity figures with the evidence for them), security and data protection, open questions. Instructions for testers or operators go in their own titled section or a separate how-to, never in the explanatory sections.
- Reference for an API, configuration or CLI: one consistent structure per item (name, purpose, parameters with type, required or optional, default, constraints, an example request and response, errors). Describe, never instruct. Complete, in the product's own order. For an API, "parameter" in requests and "field" in responses, each marked required or optional, an example response exactly as returned, and errors in a table of code, meaning and cause.
- README: what it is, who it is for, how to get it running in the fewest steps, where the rest of the documentation lives. Test the steps before publishing. Reference material moves into `docs/`.
- Release notes: one line per change, grouped as added, changed, fixed, removed, security. Anything the reader must do comes first. Version numbers, never "latest".
- Messages about technical work (email, Slack, Teams): the point first, the detail after, the request or decision needed stated plainly, a greeting and nothing more by way of pleasantry, no exclamation marks.

Warnings, cautions and notes go immediately before the step they apply to, never after the step. "Warning" for data loss or an irreversible action, "Caution" for something to do carefully, "Note" for useful information the reader can skip. Use them rarely, never two in a row, and never for a step that belongs in the sequence.

## Fixed-format artefacts

Some artefacts have a stronger local contract. Follow the owning guidance instead of forcing a Diátaxis mode onto them.

| Artefact | Owning guidance |
| --- | --- |
| Pull request title and body | [pull-requests.md](../../../best-practices/git/pull-requests.md) |
| Commit message | [commits.md](../../../best-practices/git/commits.md) |
| Jira ticket fields | [Jira skill](../../jira/SKILL.md) |
| Architecture decision record | Preserve the repository's established headings; apply the lifecycle rules in [snapshot-authoring.md](../../../best-practices/writing/snapshot-authoring.md) |
