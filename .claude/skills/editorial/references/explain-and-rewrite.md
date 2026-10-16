# Explain and Rewrite

Explain and rewrite is how the estate makes text clear through simple language (`language.md`, "Just Enough"). It runs under both intents. Use it when a heuristic or a judge flags a sentence the reader cannot restate after one reading, when a reviewer writes a reword, and when the user asks for a rewrite. A reviewer writing a finding runs steps 1 to 3; the editorial skill and the triage run the rest.

Explain and rewrite never changes a claim: a rewrite keeps every claim of the unit. Under clarify, a rewrite grows only in the two cases the review brief names (`~/trade-imports-arch-workspace/.claude/skills/editorial/references/review-brief.md`, "Rules for every reviewer"), and says what each addition makes clear. Under distil, the paragraph ends no longer than its source. The rules of prose are `language.md`'s; this page is the procedure.

## The steps

1. **Explain.** Write the sentence's meaning in plain words, as if the reader had asked "what do you mean?". Mark every part of the explanation the source does not establish: the explanation is generated text and can add claims as easily as the source can hide them.
2. **Compare.** Set the explanation beside the source and list the claims the source holds: every quantity, condition, modal, exception and relation. Anything in the explanation that is not in that list is a question for the author or is dropped; nothing in the list may go.
3. **Rewrite.** Write the candidate from the supported part of the explanation, in simple language and the house voice, with one `changes` line per sentence changed (or one line for a pure split or list). Check each sentence of the candidate against `language.md`, "Sentences and paragraphs". Explain and rewrite each sentence that still fails, and repeat until every sentence passes. Stop where a further explanation would need a guess, and put that part to the author as a question.
4. **Check the deviation.** Run the nominator on the source and the candidate:

   ```
   bash ~/trade-imports-arch-workspace/.claude/tools/editorial/claim-diff.sh --before <source file> --after <candidate file>
   ```

   Write both files the same way, because the nominator reads their bytes unchanged and the wrapper's header says what a difference in trailing newlines alone reports. Answer every element the output lists against the source: an added or removed quantifier, modal, negation, connective, number or content word, and every sentence the candidate drops. This is preparation, not clearance. The nominator compares words and not meaning, so a claim can change without a listed element changing: "The gateway retries only failed requests" and "Only the gateway retries failed requests" share every word and differ in what they claim, and the nominator lists nothing. The next step covers the whole candidate.
5. **Judge, with fresh eyes.** Give a fresh-context reviewer the reader frame, the source with enough surrounding text to resolve its references and conditions, and the candidate, and not the explanation from step 1 or any account of why the candidate is better. Ask for two separate judgments with a reason each: whether the candidate preserves the source's meaning in its context, and whether the candidate gives this reader a supported benefit over the source for the same brief. The reviewer's method is the restatement test of `language.md`: read once, say back, compare. This local task is defined here; it is not the review brief's cold-editor role, which works at page level.
6. **Decide.** Keep the candidate only when both judgments pass. Retain the source when the benefit is absent or the preservation judgment is uncertain; a retained source is a normal outcome. Ask the author only when a real meaning or fact stays unresolved, not whenever a candidate is retained. A failed loop is local: it never widens the edit to the paragraph or the page.

## Modes

In review mode the kept candidate is returned as a finding with its `changes` lines, and the page does not change. In revise mode the kept candidate may be applied, and the whole-document reading of `language.md` follows.
