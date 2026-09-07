# Document types and structure

Choose the reader's job before choosing the structure. For ordinary documentation, use the [Diátaxis](https://diataxis.fr/) mode that best matches what the reader wants to do. A large README or landing page may route readers to several modes, but each self-contained section should have one clear job.

| Mode | Reader's job | Voice | Structure |
| --- | --- | --- | --- |
| Tutorial | Learn by doing for the first time | Coach; use "we" for shared progress and "you" or an imperative for learner actions; present tense | One path that works; numbered steps; a visible result at each stage |
| How-to | Complete a task they already understand | Instructor; imperative; assumes competence | Prerequisites, then numbered steps towards the goal |
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

During review, look for conceptual asides that interrupt a procedure, advice embedded in a reference table, unexplained step sequences in an explanation, and background paragraphs that a task-focused reader must scroll past.

## Fixed-format artefacts

Some artefacts have a stronger local contract. Follow the owning guidance instead of forcing a Diátaxis mode onto them.

| Artefact | Owning guidance |
| --- | --- |
| Pull request title and body | [pull-requests.md](../../../best-practices/git/pull-requests.md) |
| Commit message | [commits.md](../../../best-practices/git/commits.md) |
| Jira ticket fields | [Jira skill](../../jira/SKILL.md) |
| Architecture decision record | Preserve the repository's established headings; apply the lifecycle rules in [snapshot-authoring.md](../../../best-practices/writing/snapshot-authoring.md) |
