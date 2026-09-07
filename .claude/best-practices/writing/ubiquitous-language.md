# Ubiquitous language - the register of workspace proper nouns

Tokens like `PIMS` and `TRACES` are proper nouns in this workspace's language: names the team uses daily, not jargon to flag. Registered tokens are the exception to the first-use expansion rule. The editorial skill, language guide and reviewer instructions defer to this register, so a registered token is not reconsidered for each document.

## Rules

- **Registered tokens are names, not abbreviations to unpack.** They pass without introduction in any document, and reviewers never flag them. First-use expansion applies to everything not in this register.
- **Expansion happens only on explicit request.** When the user asks for a token to be expanded, use exactly the expansion this register records. A "none recorded" row cannot be expanded at all - say so rather than guessing.
- **Never invent an expansion.** Add an expansion only when this corpus or the owner's published name supports that expansion. A guessed expansion reads as fact even though no source supports the guess.
- **Update the register when evidence changes.** Add a row when the user identifies established terminology or a written source confirms the term. Record a source-verified expansion or "none recorded". Correct or delete rows that prove wrong, and record collisions where one token has 2 meanings.

## The register

The Expansion column is a reference record, not a first-use instruction - it is used only when expansion is explicitly requested.

| Token | What it names | Expansion (only on explicit request) |
| --- | --- | --- |
| `TRACES` | The EU system that carries trade certification: CHEDs, INTRA certificates, reference data | Trade Control and Expert System |
| `IPAFFS` | The UK's live import notification system | Import of Products, Animals, Food and Feed System |
| `INS` | The service taking over UK import notification capture | Imports Notification Service. The corpus also carries "Import Notification Service"; the canonical spelling is not yet settled - match the document set you are editing |
| `TIG` | The gateway between the UK estate and TRACES | TRACES Integration Gateway |
| `PIMS` | The destination and BCP inspection workflow system | None recorded anywhere in the corpus - do not invent |
| `PHNNS` | A plants-side notification scheme; the letters are unconfirmed even within the team | None recorded - prefer wording like "the plants journey" |
| `IDM` | Defra's customer identity provider, also called Defra ID | Identity Management |
| `CDS` | HMRC's customs declaration system | Customs Declaration Service |
| `MDM` | Defra's reference-data platform (Semarchy) | Master Data Management |
| `APHA` | The agency that targets and carries out destination inspections | Animal and Plant Health Agency |
| `BCP` | The inspection facility at the border | Border Control Post. In IETF-literature contexts `BCP` is "Best Current Practice" - those documents say which sense they use |
| `CPH` | The holding identifier for GB agricultural premises | County Parish Holding |
| `CHED` | The TRACES entry document for a consignment (CHED-A, CHED-P, CHED-PP, CHED-D) | Common Health Entry Document |
| `ITAHC` | The intra-EU animal movement certificate | Intra Trade Animal Health Certificate |
| `GBN` | The GB pre-notification family: `GBN-AG`, `GBN-P`, `GBN-PP` identifiers and the `GBN`-prefixed document codes | Great Britain Notification |
| `BSP` | The complete UN/CEFACT vocabulary library from which the SPS certificate profile is derived | Buy-Ship-Pay |
| `SPS` | The border-controls domain protecting human, animal and plant health | Sanitary and Phytosanitary |
| `UNTDID` | The UN directory containing code list 1001 and related lists | United Nations Trade Data Interchange Directory |
| `D23B` | A UN/CEFACT directory version, this repo's baseline | Version label - nothing to expand |
| `CEFAS` | The fisheries science agency confirming catch-certificate scope | Centre for Environment, Fisheries and Aquaculture Science |
| `CITES` | The endangered-species trade convention | Convention on International Trade in Endangered Species |
| `IUU` | The fishing activity covered by the catch certificate | illegal, unreported and unregulated |
| `YARP` | Microsoft's reverse-proxy library | Product name - nothing to expand |
| `Trade Platform` | The Defra platform holding delegation-of-authority grants in Dynamics 365; IPAFFS reads it today | Product name - nothing to expand |
