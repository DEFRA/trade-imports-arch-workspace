# Editorial voice examples

These examples show repairs that make technical prose easier to read without changing its meaning. Read them before drafting human-facing technical prose. Each example names the reader and ends with the transferable move.

## Separate compressed requirements

Reader: a reviewer of the authentication design who knows Entra tenancy.

Before:

> A tenant can use the application only through a local service principal residing in that tenant, and that principal holds the tenant's grants.

After:

> Using the application in a tenant requires a local service principal residing there. Access to the tenant's resources requires grants held by that principal.

The compressed version makes 2 requirements look like one and overstates the second as an intrinsic fact about the principal. The revision gives each requirement its own sentence.

The move: separate independent requirements before checking whether each one is accurate.

## Name the actor and the object

Reader: an engineer who is new to the token flow.

Before:

> The App Registration has an FIC with no secret. The gateway gets a short-lived AWS Cognito OIDC token and presents it as `client_assertion` to the same Entra `/oauth2/v2.0/token` endpoint. The same access token comes back.

After:

> The App Registration has a Microsoft Federated Identity Credential (FIC) instead of a secret. The gateway gets a short-lived AWS Cognito OIDC token and presents it as `client_assertion` to Entra's `/oauth2/v2.0/token` endpoint. Entra validates the assertion against the FIC and returns a Microsoft Entra access token. The gateway sends that token to Service Bus in the `Authorization: Bearer` header.

The move: introduce an unfamiliar term, replace ambiguous shorthand with the exact noun, and name the actor at each step.

## Recover the reason for a change

Reader: a schema reviewer who does not know the relevant D23B structures.

Before:

> Adds typeCode + urlId (D23B unece:typeCode).

After:

> Vet handling and inspection regimes differ for live animals, semen, embryos and ova. The CN commodity code does not always identify the form, so `urlId` is added alongside `typeCode` to distinguish them. UN/CEFACT uses these properties within `TradeProduct` to carry this information.

The author already held this rationale, so writing it out recovers missing information rather than inventing an explanation. If the source does not contain the rationale, stop and ask the author to supply the reason.

The move: connect a technical change to the distinction or behaviour that makes the change necessary.

## Ground a conclusion in its mechanism

Reader: a reviewer comparing sign-out behaviour across patterns.

Before:

> Every journey request passes through the front door against one server-side session, so sign-out holds by construction.

After:

> The front door is the only public origin. `ins.defra.gov.uk` resolves to the front door, journey frontends keep internal-only URLs, and the front door forwards each path prefix to its internal upstream. The browser has no second origin to use.
>
> The browser's host-only cookie contains an opaque session ID. That ID resolves to one Redis record holding the tokens, claims and active organisation. Every request from every tab reads that record again. Deleting the record therefore signs the user out across all journeys on their next request.

The move: replace a compressed conclusion with the concrete mechanism and the consequence it produces.

## Vary cadence without losing the sequence

Reader: an engineer learning how duplicate events are handled.

Before:

> The consumer receives an event. It reads the event ID. It checks the database. It processes the event. It stores the result.

After:

> When the consumer receives an event, it checks the database for the event ID. A matching ID means the event has already been processed, so the consumer acknowledges the duplicate without repeating the work. Otherwise, it processes the event and stores the result with the ID.

The move: combine closely related actions, make the condition explicit and vary sentence length while keeping the sequence easy to follow.

## Keep a procedure moving

Reader: an engineer rotating a service credential who already understands the configuration.

Before:

> Credential rotation is the process by which an old credential is replaced. You should first create a new credential. After that, update the service and check it before deleting the old credential.

After:

> Create the replacement credential. Update the service to use it, then confirm that authentication succeeds. Delete the old credential only after the check passes.

The move: remove background the reader already knows and keep the safety condition beside the action it controls.

## Make reference facts scannable

Reader: an engineer checking a client's retry settings.

Before:

> The client tries a request 3 times. It waits 2 seconds between attempts. Each request times out after 10 seconds.

After:

| Setting | Value |
| --- | --- |
| Maximum attempts | 3 |
| Delay between attempts | 2 seconds |
| Request timeout | 10 seconds |

The move: use a table when the reader needs to compare several facts with the same structure.
