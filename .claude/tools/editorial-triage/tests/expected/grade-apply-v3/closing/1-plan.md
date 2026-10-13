# Closing plan: out

Clusters 16. Moves: R 5, C 0, W 3, K 0, O 2, I 1, T 5.

Closed without the user 8, decided by the user 0, still to decide 7, ignored 1, problems 0.

## Apply

R, C and W close without the user. The apply step edits these spans into the pages; a note under an R is the verifier's account of the claim the deletion loses.

- C-12-003 12-claims.md:5 W `The session service answers whether a session is live. The routing service forwards the answer to the journey, which records the outcome.` to:
      The session service answers whether a session is live.

      The routing service forwards the answer to the journey, which records the outcome.
- C-12-004 12-claims.md:7 R `A consumer must reject a stale timestamp.`
  note: The timestamp rule is stated only in the deleted sentence, so the claim is lost (sentence:0).
- C-12-008 12-claims.md:15 R `The front door signs the cookie and the journey reads the cookie, as the first section states.`
- C-12-010 12-claims.md:19 R `Done.`
- C-12-011 12-claims.md:21 R `404.`
- C-12-012 12-claims.md:23 W `Sessions end since the clocks lapse.` to `Sessions end because the clocks lapse.`
- C-12-013 12-claims.md:25 W `The browser calls the server when the user signs in and the service checks the request.` to `The browser calls the server when the user signs in and the service validates the request.`
- C-12-014 12-claims.md:29 R `The cache holds the verdict for one minute and the journey reads the cache.`

## Decide

K needs the side that survives; T needs the closing instruction. A held entry names the move that was asked for and the state that stops it.

- C-12-001 12-claims.md:3 T held: C from label is not applied: claimShift material. Verify, then re-plan
- C-12-005 12-claims.md:9 T held: W from label is not applied: claimShift material. Verify, then re-plan
  introduced unsupported: `never reads the cookie's content`
- C-12-007 12-claims.md:13 T held: W from label is not applied: unsupported introduction. Verify, then re-plan
  introduced supported: `signing key` from the key management page
- C-12-009 12-claims.md:17 T held: W from label is not applied: claimShift unresolved. Verify, then re-plan
- C-13-001 13-stale.md:3 T held: W from label is not applied: claimShift stale: the page or the candidate has changed since the verdict. Verify, then re-plan
  introduced supported: `audit event` from 12-claims.md "The front door signs the cookie"

## Decided, awaiting the edit

The user has answered these. The apply step does not touch them, because the surviving side is a choice about meaning: enact each one by hand.

None.

## Presentation

Passages a diagram would carry better than prose, with the actors and steps a drawing needs. The apply step never edits these: take each to its owner.

- C-12-006 12-claims.md:11 Should the callback steps be drawn as a sequence diagram (front door, browser)? (author)
  actors: front door, browser
  step: front door checks the state value (when the front door receives the callback): `the front door checks the state value`
  step: front door loads the stored return path: `then loads the stored return path`
  step: front door issues the cookie: `then issues the cookie`
  step: front door redirects the browser to the return path: `then redirects the browser to the return path`
- C-13-002 13-stale.md:5 Should the consumer steps be a flow diagram? (author)
  actors: consumer
  step: consumer verifies the signature (when a consumer receives a cookie): `the consumer verifies the signature`
  step: consumer checks the expiry: `then checks the expiry`

## Open

Open points the set cannot settle, one line each with an owner, for the user to take to that owner.

Nothing open.

## Retained

Passages a reviewer considered and found adequate, so nobody re-opens them.

- 12-claims.md:17 `The verdict reaches the journey at the next request.`: States when the verdict lands, once, where the reader looks for it. (drill:12-claims.md)

## Ignored

1 cluster, nothing to change.

## Problems

Clusters the plan cannot close as they stand.

None.

## Spot check

8 of 8 apply entries, drawn with seed 42.

1. 12-claims.md:7 R
   before `A consumer must reject a stale timestamp.`
   after (delete)
   note The timestamp rule is stated only in the deleted sentence, so the claim is lost (sentence:0).

2. 12-claims.md:29 R
   before `The cache holds the verdict for one minute and the journey reads the cache.`
   after (delete)

3. 12-claims.md:23 W
   before `Sessions end since the clocks lapse.`
   after `Sessions end because the clocks lapse.`

4. 12-claims.md:19 R
   before `Done.`
   after (delete)

5. 12-claims.md:5 W
   before `The session service answers whether a session is live. The routing service forwards the answer to the journey, which records the outcome.`
   after:
      The session service answers whether a session is live.

      The routing service forwards the answer to the journey, which records the outcome.

6. 12-claims.md:15 R
   before `The front door signs the cookie and the journey reads the cookie, as the first section states.`
   after (delete)

7. 12-claims.md:25 W
   before `The browser calls the server when the user signs in and the service checks the request.`
   after `The browser calls the server when the user signs in and the service validates the request.`

8. 12-claims.md:21 R
   before `404.`
   after (delete)

