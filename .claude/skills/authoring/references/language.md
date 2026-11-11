# Language

This file lists the words, phrases and patterns that technical text in this workspace does not use, each with its repair. The authoring skill reads this file with `writing.md` before drafting, editing or writing a short artefact, and applies every row in the closing pass. `hedy prose check` reads these rows and reports each listed form it finds in a draft, and five patterns that need no reading: an em dash, a spaced en dash, a curly quote, `N/A` and a sentence that ends on `it`. The reading applies every other rule.

The rows apply to every document, pull request body, ticket and commit message. Fenced code, inline code, blockquotes, URLs and front matter are exempt. The `you` row applies to documents for people and not to instructions written for an AI agent, such as a `SKILL.md`, `CLAUDE.md` or `AGENTS.md`, because an instruction may address the agent directly.

To add a row, put each form in backticks in the Term cell and write the repair as the words to use instead or the fact to state. A trailing `*` stands for any ending, so `utilis*` covers every form. Two phrases in a Term cell change how the check applies a row: "documents for people only" limits the row to documents for people, and "in lower case" makes the row match lower case only. A rule about the pattern of a sentence, a heading or a punctuation mark is not a word, and belongs under "Patterns".

## Banned Words and Phrases

Replace every use. There is no literal sense to keep.

| Term | Repair |
| --- | --- |
| `earned`, `earns its place`, `earn its place`, `earns its keep`, `earn its keep`, `earns its cost`, `earn its cost` | state the fact or the function instead: what the thing does, or the measurement that supports keeping it |
| `easy`, `easier`, `easiest`, `cheap`, `cheaper`, `cheapest`, `cheaply` | straightforward, where the sense is not complicated; simple, where the sense is not complex and the thing is in fact simple; otherwise state the fact, such as the number of steps or the cost |
| `leverage`, `leverages`, `leveraged`, `leveraging` | use, build on, or name what is reused |
| `empower`, `empowers`, `empowered`, `empowering` | let or allow, or state the permission given |
| `facilitate`, `facilitates`, `facilitated`, `facilitating` | help or make possible, or name the action |
| `utilise`, `utilises`, `utilised`, `utilising`, `utilize`, `utilizes`, `utilized`, `utilizing` | use |
| `seamless`, `seamlessly` | state which step the user no longer takes |
| `user-friendly` | state what the user can do |
| `streamline`, `streamlines`, `streamlined`, `streamlining` | state what was removed or shortened |
| `load-bearing` | state what depends on the thing |
| `you`, `your`, `yours` (documents for people only) | name the actor or the reader's role, or write the step in the imperative |
| `powerful`, `elegant`, `beautiful`, `effortless*`, `magic*`, `just works`, `cutting-edge`, `bleeding edge`, `state-of-the-art`, `next-generation`, `world-class`, `best-in-class`, `industry-leading`, `game-changing`, `game changer`, `transformative`, `revolutionary`, `revolutionis*`, `revolutioniz*`, `reimagin*`, `turnkey`, `silver bullet`, `blazing fast`, `lightning fast`, `dead simple`, `10x`, `level up`, `take it to the next level`, `unleash*`, `supercharge*`, `turbocharge*`, `delight*`, `a testament to`, `we're excited`, `we are excited`, `we're thrilled`, `we are thrilled`, `the power of`, `feature-rich`, `tapestry`, `vibrant`, `game plan`, `north star` | marketing language: delete, or state the measured fact and its source |
| `combat*`, `pledge*`, `disincentivis*`, `incentivis*`, `incentiviz*`, `slim down`, `going forward`, `moving forward`, `one-stop shop`, `ring-fenc*` | state the action and who takes it: from now on, in future, reduce, reserve, name the service |
| `touch base`, `sync up`, `catch up`, `circle back`, `loop back`, `low-hanging fruit`, `quick win*`, `boil the ocean`, `move the needle`, `ballpark`, `slam dunk`, `home run`, `in the weeds`, `punt`, `punts`, `punted`, `quarterback`, `heads up`, `heads-up`, `ping me`, `shoot an email`, `shoot me`, `socialis*`, `socializ*`, `productis*`, `productiz*`, `operationalis*`, `operationaliz*`, `dogfooding`, `figure out`, `figures out`, `figured out`, `figuring out`, `normalcy`, `obligate`, `skyrocket` | American workplace idiom: meet, return to, straightforward change, defer, notice, send an email, share, design, make into a product, internal use, work out, normality, oblige, rise sharply |
| `on a daily basis`, `on a weekly basis`, `on a regular basis`, `at this point in time`, `at this time`, `presently`, `in excess of`, `commence*`, `ascertain*`, `per annum`, `it is recommended`, `in terms of` | padding: daily, now or the date, more than, start, find out, a year, we recommend or should, state the relation |
| `cuts a tag`, `cuts a release`, `cut a release`, `wires up`, `wired up`, `plumbs in`, `plumbed in`, `bolts on`, `bolted on`, `hooks into`, `hooked into`, `tears down`, `torn down`, `tear down`, `navigate to`, `reboot*` | name the operation: creates a tag, publishes a release, connects, configures, subscribes to, deletes, go to, restart |
| `whitelist*`, `blacklist*`, `slave`, `slaves`, `dummy`, `grandfathered`, `man-hours`, `man hours`, `chairman`, `crazy`, `insane`, `blind spot*` | allow list, block list, replica or worker, placeholder, legacy or exempt, work-hours, chair, unreasonable, gap |
| `defense`, `offense`, `pretense`, `fill out`, `check a box`, `check the box`, `on the weekend`, `different than`, `gotten`, `cell phone`, `zip code`, `parking lot`, `elevator`, `vacation`, `math`, `cybersecurity`, `percent`, `specialty` | British usage: defence, offence, fill in, tick a box, at the weekend, different from, got, mobile phone, postcode, car park, lift, holiday, maths, cyber security, per cent, speciality |
| `for the benefit of`, `has nothing to ask`, `have nothing to ask`, `falls away`, `fall away`, `on the merits`, `goes and fetches`, `go and fetch` | essay idiom: that only X would use, needs no further input from, no longer applies, for the reasons given, fetches |
| `portal` in lower case as a generic noun | website or service. A proper noun such as "CDP Portal" and a URL pass unchanged |

## Words to Examine

Each of these has a literal sense that stays. Replace every other use with the repair.

| Term | Repair |
| --- | --- |
| `deliver`, `delivers`, `delivered`, `delivering` | keep for literal transport or message delivery; otherwise state the actual outcome |
| `bounds` | keep for mathematical limits or explicit boundary operations; otherwise use determines or constrains |
| `shape`, `shapes` | keep for literal geometry or data structure; otherwise name the design, proposal, pattern or layout |
| `robust`, `robustly` | state what withstands retries, redelivery or malformed input |
| `appropriate`, `appropriately` | state the criterion |
| `overarching` | name what the thing spans |
| `foster`, `fosters`, `fostered`, `fostering` | state the action taken |
| `alone` after a noun | where it restricts the subject ("the front door alone holds"), put only before the noun: "only the front door holds"; keep it for the by-itself sense ("expiry alone ends no provider session") or write "by itself" |
| `price`, `prices`, `priced`, `ride`, `rides`, `bite`, `bites`, `spend`, `spends`, `spent`, `buy`, `buys`, `kill`, `kills`, `hang on`, `hangs on`, `collapse`, `collapses`, `leak`, `leaks`, `land`, `lands`, `landed`, `foreclose`, `forecloses`, `soften`, `softens`, `softened`, `softening`, `bootstrap`, `bootstraps`, `bootstrapped`, `bootstrapping`, `axis`, `axes`, `posture`, `postures` | metaphor candidate: keep a literal use; rewrite a figurative use around the mechanism, not another metaphor |
| `held open under`, `argued under`, `its case is made`, `stated below the table`, `collected under`, `point back to`, `points back to` | ledger voice: state the status or pointer in plain words, "that is still an open question (see X)" |
| `frictionless`, `intuitive`, `mission-critical`, `enterprise-grade`, `future-proof`, `unlock*`, `harness*`, `elevate*`, `introducing`, `say hello to`, `meet the`, `comprehensive`, `best practice*`, `landscape`, `pivotal`, `crucial`, `vital` | hype: keep a literal use (a test harness, a raised privilege, a locked record); otherwise state the measured fact, list what is covered, or name the practice |
| `agenda`, `collaborate`, `collaborates`, `collaborated`, `collaborating`, `counter`, `counters`, `dialogue`, `focus`, `focuses`, `focused`, `initiate`, `initiates`, `initiated`, `initiating`, `liaise`, `liaises`, `liaising`, `promote`, `promotes`, `promoted`, `promoting`, `hub`, `hubs` | keep a literal use (a meeting agenda, a numeric counter, an input focus, a release promotion, a network hub); otherwise state the action and who takes it: work with, start, speak to |
| `reach out`, `reaches out`, `reached out`, `reaching out`, `at the end of the day`, `net-net`, `bottom line`, `deep dive`, `deep-dive`, `double-click on`, `drill down`, `drill into`, `dig into`, `bandwidth`, `the ask`, `learnings`, `sunset*`, `bake in`, `baked in`, `bakes in`, `gotcha*`, `a ton of`, `a bunch of`, `pretty much`, `kind of`, `sort of`, `super`, `awesome`, `real quick`, `you guys`, `folks`, `actionable`, `architect` as a verb, `ninja`, `rockstar`, `guru`, `wizard` | American workplace idiom: contact, in short, examine, time or capacity, request, lessons, retire, built in, pitfall, many, delete, specific, design, expert; keep a setup wizard and the job title |
| `under the hood`, `out of the box`, `out-of-the-box`, `drop-in replacement`, `plug and play`, `plug-and-play`, `go-live`, `big bang`, `pain point*`, `disruptive`, `agnostic`, `holistic`, `synergy`, `paradigm`, `silo`, `silos`, `siloed`, `stakeholder*`, `cadence`, `upcoming`, `ongoing`, `spin up`, `spins up`, `spun up`, `spinning up`, `stand up`, `stands up`, `stood up`, `standing up`, `check out` | internally, by default, compatible without changes (say with what), release date, problem, vendor-independent or whole-system or name the thing, the people it affects, frequency, forthcoming, continuing, create or start, see; keep a git checkout and a person standing |
| `prior to`, `subsequent to`, `in the event that`, `in respect of`, `with regard to`, `regarding`, `in relation to`, `in accordance with`, `currently`, `a number of`, `numerous`, `the majority of`, `terminate`, `terminates`, `terminated`, `discontinu*`, `assistance`, `modification*`, `the fact that`, `respectively`, `allows you to`, `enables you to`, `lets you`, `allow users to`, `allows users to`, `enable users to`, `enables users to` | padding: before, after, if, about, under, give the date or version, several or the number, most, stop or end (keep a TLS or process termination), help, change, rewrite as two sentences, make the reader the subject |
| `note that`, `it is worth noting`, `it's worth noting`, `it is important to note`, `importantly`, `notably`, `crucially`, `essentially`, `basically`, `ultimately`, `in summary`, `in conclusion`, `to summarise`, `to summarize`, `not only`, `simply`, `easily`, `obviously`, `very`, `quite`, `really`, `actually`, `of course` | filler: delete and keep the point |
| `secure`, `secured`, `guarantee`, `guarantees`, `guaranteed`, `shall` | an absolute states the property and its limit ("encrypts data in transit with TLS 1.3"); shall: must, or should, unless a standard defines the word |
| `stamps`, `stamped`, `pins to`, `pinned to`, `sits retrying`, `sits waiting`, `sits behind`, `sit behind`, `fronts`, `fires`, `fired`, `kicks off`, `kicked off`, `hits an endpoint`, `hits the`, `talks to`, `calls into`, `goes down`, `comes back`, `falls over`, `blows up`, `surfaces`, `surfaced`, `bubbles up`, `bubbled up`, `picks up`, `picked up`, `blocks on`, `hangs off`, `happy path`, `the box`, `the tin`, `the kit`, `chatty`, `noisy` | colloquial technical verb: name the operation (sets, fixes to, is served by, receives requests for, runs, starts, sends a request to, is unavailable, recovers, fails, shows, returns, reads, waits for, the successful case, the server, verbose); keep a timestamp, a pinned version, a physical surface and an event the code fires |
| `click on`, `click the`, `tap the`, `execute a test`, `perform a test`, `conduct a test`, `launch the`, `launches the`, `shows up`, `pops up` | select, run a test, open, appears; keep a touch screen and a product launch |
| `sanity check*`, `man-in-the-middle`, `guys` | check or confidence check, on-path attacker, people |
| `behavior`, `behaviors`, `color`, `colors`, `favor`, `favorite`, `honor`, `labor`, `neighbor`, `center`, `centers`, `centered`, `liter`, `fiber`, `modeling`, `modeled`, `labeled`, `labeling`, `canceled`, `canceling`, `traveling`, `signaling`, `leveled`, `totaling`, `fulfill`, `fulfills`, `enroll`, `enrolls`, `enrollment`, `installment`, `skillful`, `catalog`, `catalogs`, `analog`, `program`, `period`, `parentheses`, `parenthesis`, `whilst`, `amongst`, `roster`, `expiration` | British spelling and usage: behaviour, colour, centre, litre, fibre, modelling, labelled, cancelled, fulfil, enrol, catalogue, analogue, programme for a plan, full stop, round brackets, while, among, rota, expiry; keep a code identifier, a time period, a software program and the hedy roster command |
| `the receiving half`, `the sending half`, `the middle` as a partitive, `nobody owns`, `moves on`, `moved on`, `waits on`, `wait on` | essay idiom: name the component, name the owning team or say that no team owns the thing, state the next step, waits for |

## Judgement Calls

These words are used often in the estate, or in a literal sense that reading alone tells from the figurative one, so they have no row. Each is a judgement under the rules in `writing.md`: journey (the INS journey components), key, new, recent, recently, soon, latest, now, will, always, never, via, ensure, additional, deploy, impact, progress as a verb, obtain, acquire, attempt, sufficient, in order to, as well as, whether or not, end-to-end, please, master, log in and login (write sign in), onboard, ecosystem, best, fastest, optimal, the negative contractions, the -ize spellings with artifact, judgment and toward, stands-upon, tackle and strengthen, and the forms a table cannot hold: e.g., i.e., etc. and and/or.

`transform` stays for literal data transformation. Challenge it only when it means vague improvement.

`quick` and `simple` go where they judge how difficult work should feel. `simple` stays where the change is in fact simple, and in a literal name, a request for the simplest workable option, and "simple language".

## Patterns

Each pattern is recognised by reading, and the repair is the whole fix.

| Pattern | Repair |
| --- | --- |
| A heading that opens on what, how, which, when, where, why, who or whether, with or without a question mark (FAQ voice) | name the topic as a noun phrase in title case: "Session Assertion Checks", not "What a journey backend checks" |
| A table header, bold lead-in or list item that opens the same way | name the topic as a noun phrase in title case: "Condition", not "When the session is in it"; "End State", not "What John sees" |
| A sentence, list item or cell that opens on a half-question: "What the backend checks is the signature" | restructure so the actor and the content lead: "The backend checks the signature". A sentence that opens on When or Where to state a condition passes |
| A table header that ends on a preposition: "Set by", "Used by" | name the role: "Source", "Writer" |
| A heading not in title case | capitalise every word except articles, short conjunctions and short prepositions after the first word: "Activity and the Idle Point" |
| An opening sentence that lists the page's parts as noun phrases: "This page covers the assertion, the operations and the rules" | write one sentence per job of the page, each with an actor and a verb |
| A sentence or line that ends on the pronoun `it` | name the noun the pronoun stands for. The subject the pronoun hides usually belongs at the front of the sentence |
| A contact clause, a dropped relative pronoun that gives agency to a thing: "a store only the front door reaches" | restore the relative pronoun and the capability verb: "a store that only the front door can access" |
| Aside stacking, three or more spaced hyphens in one sentence | recast the asides as sentences or a list |
| An em dash, a spaced en dash or a spaced hyphen used as a sentence break | a full stop, a comma or a colon, or two sentences |
| A curly quote | a straight quote |
| A semicolon in body text | split the sentence, or use a colon before a list |
| `N/A` in text or a table cell | state the fact: "not applicable", "no data" or "not used" |
