---
name: editorial
description: Editorial review and writing process for documents that humans will read - PR descriptions, READMEs, design docs, commit bodies, RFCs. Recursively drills from surface text to essence by asking what we're trying to say and why; includes a style guide of mechanical rules. Use when the user asks to review, sharpen, edit, or write a doc.
---

Follow this process when asked to review, write, or sharpen a doc. Interrogate every sentence until what remains is what we meant. Mechanical conventions live in the style guide at the bottom - apply as you go.

This SKILL builds on the foundational best-practices laid out in [writing.md](../../best-practices/gds/writing.md) and [language.md](../../best-practices/gds/language.md). Both of which need to be read before using this SKILL.

**Bash call hygiene** - one command per Bash call; paths in the literal `~/trade-imports-arch-workspace/...` form. Full rules: [`agent-skills.md`](../../best-practices/skills/agent-skills.md).

## Contents

- **Process** - steps 1 to 9.
- **Output behaviour**.
- **Style guide**.

## 1. Frame the reader

Decide who is reading this cold:

- Role and context.
- Concepts they already hold.
- Concepts that need first-use introduction.
- What action they need to take (approve, replicate, decide).
- Never assume the reader is a machine or has any visibility of the intermediate material used to generate an output

This frame is the lens for every later decision. Assume your audience is a cold reader.

## 2. Drill from surface to essence

For each section, paragraph, sentence, recursively ask:

- **What am I trying to say?**
- **Why am I saying it?**
- **Is this the real reason, or a surface gloss?**

When the question feels answered, ask once more. The first answer is usually the framing, the second is the substance, the third is the core.

**Worked example A.** A statement is written "adds typeCode + urlId (D23B unece:typeCode)":

- _Why is this a question?_ What am I trying to say? Why would a reader care? Does my reader know about typeCodes, or D23B?
- _What should have been written_: Vet handling and inspection regimes differ for live animals vs semen vs embryos vs ova. The CN commodity code does not always discriminate form, the urlId is added to the typeCode so we can tell the difference. UN/CEFACT uses these properties within the TradeProduct to convey this information.

**Worked example B.** An open question started as "is `private_transporter_approval_number` a real Defra scheme?". Drilling:

- _Why is this a question?_ We used the name in samples without registering it.
- _Why does that matter?_ Consumers can't dereference an unregistered scheme name.
- _Why is there no way?_ No mechanism exists for Defra-side scheme IDs that aren't in TRACES.
- _Other examples?_ `cph_number`, `bcp_reference`, per-animal identifier types.

The surface question was about one scheme. The real question was the codelist mechanism.

**Worked example C.** The App Registration has an **FIC** (no secret). The gateway gets a short-lived AWS Cognito OIDC token and presents it as `client_assertion` to the same Entra `/oauth2/v2.0/token` endpoint. The same access token comes back.

- _what is a FIC?_ — I have to find out what a FIC is? Is it a real term, is it ubiquitous language?
- _what is the same?_ - Ambiguous!

The App Registration has a Microsoft Federated Identity Credential (no secret). The gateway gets a short-lived AWS Cognito OIDC token and presents it as `client_assertion` to Entra's `/oauth2/v2.0/token` endpoint. Entra validates the JWT against the FIC and returns a Microsoft Entra access token. The gateway sends that token to Service Bus in the `Authorization: Bearer header`.

**Unpack load-bearing compression.** When a conclusion rests on a compressed phrase - a summary line, "by construction", "holds structurally", "passes through it" - the phrase is a pointer, not an explanation. Unpack it in the section that uses it: restate each clause as "means" plus the mechanism that makes it true (named components, real attributes), and close with one plain sentence stating the consequence. The compressed form may stay where a nearby unpacking backs it; a conclusion resting on a compressed phrase that is never mechanically grounded is an unverified assertion. Fund the words by culling decoration, not by growing the section: unpacking is what the words were for.

Unpacking is iterative: unpack, then reason about the simpler statements, unpacking again where one is still ambiguous. Stop only where further unpacking would be guessing; name the missing piece of knowledge there, and that residue is the open question (see Honesty on open questions). Do not raise a question a completed unpacking would dissolve. And unpacking is not addition: more words, more cross-references, or a dive into low-level detail trade one complexity for another. The test of a real unpacking is that each resulting statement is simpler than its parent and carries one unambiguous intent.

**Worked example D.** A pattern summary reads "every journey request passes through it against one server-side session", and a trade-off later claims sign-out "holds by construction". Unpacked clause by clause:

- "Every journey request passes through it" means the front door is the only public origin: `ins.defra.gov.uk` resolves to the front door and nothing else, journey frontends keep internal-only URLs, and the front door reverse-proxies path prefixes (`/plants/*`, `/animals/*`) to them as internal upstreams. The browser never has a second place to go.
- "Against one server-side session" means the browser's only credential is an opaque session id in a host-only cookie, resolving to a single record in the front door's Redis holding the tokens, claims and active organisation. Every request from every tab re-reads that record, so deleting or updating it is the propagation mechanism. There is nothing to synchronise because nothing else holds state.

Each clause became a mechanism plus a consequence sentence; "holds by construction" is now checkable instead of asserted. This phrase would be better unpacked as:

- the front door is the only public origin e.g. a url like `ins.defra.gov.uk` resolves to the front door and nothing else, journey frontends keep internal-only URLs, and the front door reverse-proxies path prefixes (`/plants/*`, `/animals/*`) to the relevant place. The browser's only credential is an opaque session id in a host-only cookie, resolving to a single record in the front door's Redis which holds the tokens, claims and active organisation. Every request from every tab re-reads that record, so deleting or updating it is the propagation mechanism. There is nothing to synchronise because nothing else holds state

**Worked example E - unpacking dissolves a false open question.** A draft hedged "whether reverse proxying across tenant frontends is supported on the platform is undocumented" and raised it as a question to the platform team. Unpacked, the claim is: the front door makes an outbound HTTP call to a journey frontend's internal URL (`{service}.{env}.cdp-int.defra.cloud`) and streams the response back. Reasoning about that simpler statement: service-to-service HTTP is documented platform behaviour, and everything else (route mapping, header forwarding, streaming) is code inside the front door. No platform grant is consumed, so there was no question to ask; the compressed phrase had hidden a facet of the solution that the unpacking made visible. What genuinely remained (rate-limit sizing at estate volume) was a different, narrower question.

## 3. Hunt jargon and opaque labels

Internal labels mean nothing to a cold reader. Watch for:

- Phase names, path names, ticket codes ("Path A / Path B", "Phase 2").
- Pattern names without explanation ("by-reference attachment pattern").
- Tag names where the tag was just invented (`schemeId: foo` where `foo` does not exist anywhere).
- Acronyms or product names used before first introduction.
- Positional references where the thing has a name: "whether pattern 4 meets single sign-out" when the document names it Backend for Frontend. The name is usually no longer than the number, and the number breaks the moment sections reorder.
- Requirement fragments pasted without context: "bounded stated staleness, audit logged" floating in a cell or sentence. Restate what the requirement demands here, in this sentence's own terms, not as a shorthand quotation of the requirements list.
- Figurative verbs standing in for mechanisms: "prices", "rides in", "bites", "spends", "hangs on". The verb's literal sense is not what happens, so the reader must decode the sentence to recover the mechanism it exists to state. Replace each with the literal statement (see Metaphor in the style guide).

For each, replace with substance or introduce on first use.

Close the pass with the hard-avoid sweep from the style guide's Metaphor section: run its grep over the draft, judge each hit, and replace every figurative use with the specific mechanism it stands for.

## 4. Verifiability check

Don't cite what a reader can't verify - gitignored files, local-only data, named schemes that don't exist. If a claim depends on inaccessible data, restate it inline as a standalone fact ("Some commodities are measured in weight") instead of citing the source ("Defra refdata says X").

## 5. Honesty on open questions

Before listing a question as open, ask: could a grep or read answer it?

- If yes - do it; bring back the answer.
- If partly - lead with the finding, propose a position, narrow what remains open.

## 6. Anti-circularity

If a change's source and its justification are the same authority, the "why" is empty. "TIG naming alignment" when TIG owns the schema is a tautology. Trace to the real why: canonical vocabulary, source data, or use case.

## 7. Decoration cull

For each sentence, ask: would removing this confuse the reader? If no, cut.

Common decoration:

- Line counts and refactor narrative ("370 lines, down from 770").
- Pattern-matching observations ("matches the pattern X uses").
- Self-congratulation ("All N schemas compile").
- Restating what property names already say.
- Section intros that repeat the heading.

## 8. Structural pass

- Related items with the same shape → table.
- Short unrelated items → bullets.
- Don't comma-cram a paragraph that wants to be enumerated.
- Headings name what's below concretely ("Extensions to existing types"), not generically ("Overview").

## 9. Concrete over abstract

When something feels hand-wavy, paste the JSON, name the property, give the actual scheme ID.

## Output behaviour

- Non-trivial restructures (whole sections, reordering, framing shifts) - describe before editing.
- Tightening passes (cuts, swaps, jargon replacement) - just edit and summarise.
- After substantive edits, re-read with the reader frame from step 1.

---

## Style guide

Mechanical rules. Apply without thinking.

### Punctuation

- No em-dashes. Use a plain hyphen `-` (with a space on each side for a sentence break).
- Plain `"` and `'` quotes, not curly variants.

### Code identifiers

- Backticks around every property name, scheme ID, code value, file path, type name, JSON Schema keyword. Examples: `partyTypeCode`, `cph_number`, `H87`, `samples/imports/...`, `TradeParty`, `oneOf`.

### Lists and enumerations

- Related items with the same shape → table.
- Short unrelated items → bullets.
- Don't comma-cram.

### Section headings

- Name what's below concretely.
- Prefer "**Bold lead-in**" paragraphs over deeper heading levels.

### Schema `$def` names vs property names

- A `$def` name lives in the schema; it's invisible in a JSON instance.
- A property name appears in instance data and is what the reader will grep for.
- When both matter, name both: `gbnAgTradeProduct` `$def` (property: `specifiedTradeProduct[]`).
- Never substitute one for the other.

### Acronyms and domain terms

- Introduce on first use. TRACES, TIG, IPAFFS, CHED-A, UNTDID 1001, BSP, BCP, CPH - none are self-explanatory cold.
- Internal labels (Path A, Phase 2) are banned. Describe in domain terms.

### Code examples

- JSON with `//` comments → unmarked code fence ` ` ` (a ```` `json ```` fence trips linters).
- Pure JSON → ` ```json ` is fine.

### References

- Don't reference files that are gitignored. If context is needed, provide an inline summary.

### Tone

- Statements, not pronouncements ("X retains `schemeId`", not "Each is justified by real TRACES data carrying schemeId").
- Factual, not personality-driven.
- No self-congratulation.
- Plain constructions over clause-speak: "the adopted pattern should support it as a future requirement", not "no pattern may foreclose it". If a sentence sounds like a legal clause, rewrite it as what a colleague would say.

### Metaphor: hard avoids

- These terms are banned wherever the verb's literal sense is not what happens, the same way em-dashes are banned - no judgment call, replace on sight: "prices" / "priced", "rides" / "rides in", "bites", "spends", "buys", "kills", "hangs on", "collapses", "leaks", "lands", "forecloses".
- A term used in its literal technical sense stays: a cookie carries a value (HTTP semantics), a request times out. For anything not on the list, the test: could a reader new to the document say precisely what happens from this sentence alone? If the verb needs decoding, replace it.
- Replacement is unpacking: state the specific mechanism in precise, non-jargon language. This is not a synonym swap; the sentence usually needs rewriting around the mechanism.
- Sweep mechanically before finishing: `grep -niE '\b(prices?|priced|rides?|bites?|spends?|spent|buys?|kills?|collapses?|leaks?|lands?|forecloses?)\b|hangs? on' <file>`, then judge each hit; literal uses stay, every figurative hit is replaced.
- Observed failures and their replacements (4 Aug 2026):
  - "never rides in the session artefact" -> "is not stored in the session record or the session cookie"
  - "whether a frontend may forward page traffic to another prices the proxying front door" -> "if the platform does not let one frontend forward page requests to another, the proxying front door needs a platform change before it can be built, and that need counts against it in the comparison"
  - "whether the picker interrupts a returning user prices per-journey login" -> "if the organisation picker appears each time a journey signs a returning user in silently, patterns where every journey runs its own login show the user the picker repeatedly"
  - "sign-out and organisation switch bite on the next request" -> "sign-out and organisation switch take effect on the user's next request"
