# Clarify examples

Five decisions you will face when editing existing prose under `clarify`, each from a real passage a reader judged. Read this when you are deciding whether and how to change text that already exists. For repairs that make prose easier to read while keeping its meaning, read `voice-examples.md` instead; no example is repeated between the two files.

Each example gives the text, what happened to it, and the distinction it teaches. Every example also says what it does **not** establish, because a single judged case licenses less than it appears to.

The reader quoted throughout is the document's audience and the person whose acceptance the estate treats as the standard. His words are in blockquotes. Everything outside a blockquote is this file's own voice.

---

## 1. Parallel facts read better as a list

**The source.** Three sentences, inside a passage comparing two designs of the same service. Five shared properties are coordinated inside the long middle sentence and a sixth follows it:

> Sign-in is unchanged in substance. The front door remains the only component that talks to an identity provider, the same three bindings tie the callback, the assertion and the code to the request INS started, the same checks run on the assertion before any session exists, the return path is checked against the route allowlist, and a script call without a session receives an unauthenticated status rather than a redirect. Users are identified by issuer and subject together in both designs.

Here "the same" means unchanged between the two designs being compared. What the three bindings are, and what the checks do, the source never says, and neither does this example.

**The candidate.** The same facts as a list, with the lead-in naming the condition they share:

> Sign-in is unchanged in substance. In both designs:
>
> - the front door remains the only component that talks to an identity provider;
> - the same three bindings tie the callback, the assertion and the code to the request INS started;
> - the same checks run on the assertion before any session exists;
> - the return path is checked against the route allowlist;
> - a script call without a session receives an unauthenticated status rather than a redirect;
> - users are identified by issuer and subject together.

**The outcome.** Accepted, with the list preferred:

> claudes use of a bullet for these improved readability, I prefer that. The structural and editorial rewrite is an improvement.

**The distinction.** Here, facts sitting in parallel whose order carries no meaning were easier to check as a list than as a coordinated sentence: the reader can count them and find the one they came for. That is what this reader preferred on this passage.

**Not Established.** That prose is the wrong form for parallel facts in general: another writer's version kept them as short sentences and was also accepted. And that the whole candidate preserved every claim, which this verdict does not address.

---

## 2. Leaving a passage alone is a real outcome

**The source**, two paragraphs about what happens to a routing component under two possible futures:

> When CDP publishes its pattern, INS will either align the proxy with it or replace the proxy with a platform component. A replacement must support the cookie-to-header and forwarded-header rules, or INS must change the affected middleware: journeys would need to read the session cookie themselves if the platform router could not set the session header.
>
> If CDP's pattern is incompatible, or CDP will not accept the extra deployable, the front door can forward journey requests as a backend-for-frontend (BFF), setting the session header itself. Journeys would still resolve sessions through the session API and remain unreachable from the public internet, so only the forwarding role moves.

CDP is the authority responsible for the platform pattern under discussion. INS is the application. The proxy is the component that routes requests to the journeys, and the front door is the component that could take that forwarding role instead.

**The candidate.** Retain unchanged. The reviewer proposed no edit at all, on the grounds that each paragraph already leads with the situation that governs its alternative.

**The outcome.** Accepted as a retain, while a different reviewer's revision of the same passage was preferred. That revision changed the first paragraph only, splitting its second sentence in two and putting the condition about the platform router in front of what it governs, and it kept the second paragraph unchanged.

> I prefered Claude's answer, but I'd be happy with retaining this too, it reads well to me

**The distinction.** A retain is a decision, not an absence of one. A passage can be acceptable as written even when a preferred alternative exists, so "another version is better" is not by itself a reason to change the text.

**Not Established.** That retaining was the better choice here, since the other revision was preferred. And it endorses none of the reasoning the reviewer gave for retaining.

---

## 3. Wording that reads better can still change the claim

This example has three texts. Keep them apart.

**The source**, one sentence:

> Roles can be up to fifty minutes stale, about fifty-two with the clock allowance, rather than one renewal interval, and only if the provider re-evaluates them on this path, which is confirmed for the session-service design's renewal and unconfirmed here; if the provider replays them instead, a lost role can last the whole eight-hour session unless the picker is forced at every interval.

"This path" is the cookie design's path, contrasted with the other design's renewal. The "only if" condition governs the staleness bound; it does not govern the replay branch that follows, which carries its own exception.

**The candidate**, splitting that sentence into three:

> Roles can be up to fifty minutes stale, about fifty-two with the clock allowance, rather than one renewal interval. That bound holds only if the provider re-evaluates them on this path, which is confirmed for the session-service design's renewal and unconfirmed here. If the provider replays them instead, a lost role can last the whole eight-hour session unless the picker is forced at every interval.

**The outcome.** Rejected, on the candidate's first sentence:

> I don't need to go passed this sentence; it's horrible: Roles can be up to fifty minutes stale, about fifty-two with the clock allowance, rather than one renewal interval.

> I think this fails the clear comprehension test

That first sentence, without its full stop, is word for word the opening of the source. The complete sentence is not, because the source continues into the condition where the candidate stops. What the record shows is that the reader could not get past the candidate's opening sentence. It does not say that separating the bound from its condition caused that, and nothing here establishes the cause.

**The suggested wording, which is not an approved repair.** The reader offered his own version of the rejected opening:

> the renewal interval is therefore 50 minutes, or 52 if the proposal to adopt a clock allowance is adopted. When this interval elapses the cookie is deemed to be "stale".

It differs from the source in three ways. It equates fifty minutes with the renewal interval, where the source contrasts them. It treats the clock allowance as a proposal. And it makes the cookie go stale, where the source makes the roles go stale.

**The intended meaning is unresolved**, on the three differences just listed: whether fifty minutes is the renewal interval or is contrasted with it, whether the clock allowance is in force or proposed, and whether the roles or the cookie go stale. The question was put and never answered. This wording is a suggestion for the rejected opening, not an approved replacement for the passage, and nothing here shows it was tested or found easier to read.

The scope of the source's "only if" is **not** among the unresolved points: it governs the staleness bound, as stated above.

**The distinction.** Wording that reads more easily can carry a different claim, and a suggestion from any source, including the reader, is not automatically meaning-preserving. Check a candidate against the claim before its cadence.

**Branch.** The source's own intended meaning is unresolved here, so the question goes to the author rather than being settled by an edit. `explain-and-rewrite.md` carries the rule for choosing between those branches.

**Not Established.** Which meaning was intended, or that the suggested wording is wrong. Only that the two texts differ in the three ways above and that the intended meaning remains unresolved.

---

## 4. Structure can be accepted while tone is rejected

**The source's opening sentence**, from a comparison of two designs:

> The second difference is renewal, and it is the one a user will notice.

**The candidate** restructured the passage and opened it this way:

> Renewal is the second difference, and the one a user will notice.

In the next paragraph, describing how renewal happens in the cookie design, it also contained:

> A top-level navigation whose last authentication is more than twenty minutes old is redirected through the provider. The redirect completes without a prompt while a session in the provider's chain is live.

**The outcome.** The restructuring was accepted. The reader recorded that judgement separately; the excerpts above do not themselves show that acceptance. Two sentences were rejected on tone: the candidate's opener, "Renewal is the second difference, and the one a user will notice", and "The redirect completes without a prompt while a session in the provider's chain is live." The navigation sentence quoted before that second one is context, not a rejected sentence.

> are two examples where **tonaly** I think the result smacks of AI slop

His standard:

> neutral, factual and that of a technical author relaying facts

**The distinction.** A passage can be better organised and still fail. Structural success settles nothing about tone, so they are judged separately.

The second rejected sentence is the one to study. It ranks nothing and praises nothing, and reads as a plain statement of behaviour.

**Not Established.** Any rule for detecting a tone defect. What the second sentence shows is narrower: a sentence carrying no obvious evaluative wording was rejected on tone in this case.

---

## 5. Accepting a candidate is not endorsing every phrase inside

Two facts from different passages, which belong together.

**The objection.** Reviewing a passage that referred to a design as "that design", the reader wrote:

> The cookie design (see here I NAME the thing, I don't use "that" design - ambigous.

**The acceptance.** A different candidate, accepted as an improvement, opens:

> An outage behaves differently in the two designs. In the session-service design, no signed-in request anywhere can be served while the session API is unavailable, because no consumer caches its answer.

That is a framing sentence followed by a possessive pronoun. The verdict:

> Structurally and editorially an improvement from the poor starting material

**The distinction.** The objection is to a reference the reader could not resolve, not to pronouns. "Its answer" names the session API, which appears earlier in the same sentence, so that reference resolves where "that design" did not.

**Not Established.** That every pronoun should be replaced, or that framing sentences should be deleted. Nor does accepting a candidate endorse each phrase that survived in it; the acceptance was of the whole, and the reader recorded a separate reservation about that passage's scope.

**And it does not reach other rules.** Nothing here weakens the prohibition on changing a claim silently. These two facts bear on pronouns and framing constructions, and on nothing else.
