# Closing plan: plan-run

Clusters 13. Moves: R 3, C 2, W 1, K 1, O 1, I 1, T 1.

Closed without the user 6, decided by the user 2, still to decide 1, ignored 1, problems 3.

## Apply

R, C and W close without the user. The apply step edits these spans into the pages; a note under an R is the verifier's account of the claim the deletion loses.

- C-02-004 02-sample-routing.md:3 C `the twelve-hour session window` to `the session window`
- C-02-001 02-sample-routing.md:7 C `sections 4.7 and 4.11` to `sections 4.7 and 4.5`
- C-02-006 02-sample-routing.md:11 R `and validate the return URL`
  note: Deleting the clause loses the page's only statement that IDM validates the return URL (sentence:0).
- C-02-003 02-sample-routing.md:13 R `the front door`
- C-02-002 02-sample-routing.md:17 R `- Which sealing library INS uses, how the seal key is provisioned, and what the rotation runbook says.`
- C-03-001 03-sample-session.md:5 W `utilise the session token` to `use the session token`

## Decide

K needs the side that survives; T needs the closing instruction. A held entry names the move that was asked for and the state that stops it.

Nothing to decide.

## Decided, awaiting the edit

The user has answered these. The apply step does not touch them, because the surviving side is a choice about meaning: enact each one by hand.

- C-02-005 02-sample-routing.md:9 K keep B `Every request is logged at the front door whichever path it takes`, cut A `the routing service's allowlist, header stripping and request logging do not apply`
- C-03-003 03-sample-session.md:11 T state the exception on 02 and leave the rule here as it stands

## Presentation

Passages a diagram would carry better than prose, with the actors and steps a drawing needs. The apply step never edits these: take each to its owner.

None.

## Open

Open points the set cannot settle, one line each with an owner, for the user to take to that owner.

- C-03-002 03-sample-session.md:13 Who owns the seal key rotation schedule? (Ben)

## Retained

Passages a reviewer considered and found adequate, so nobody re-opens them.

None.

## Ignored

1 cluster, nothing to change.

## Problems

Clusters the plan cannot close as they stand, and S1 or S2 contradictions the grade ignored, for the user to rule on.

- C-03-006 03-sample-session.md:7 C: no rewrite (the record carries no replacement text for C)
- C-03-005 03-sample-session.md:9: ungraded (no label and no grade for this cluster)
- C-xx-001 set R: no page file (the cluster is set-wide)

## Spot check

3 of 6 apply entries, drawn with seed 42.

1. 02-sample-routing.md:13 R
   before `the front door`
   after (delete)

2. 02-sample-routing.md:7 C
   before `sections 4.7 and 4.11`
   after `sections 4.7 and 4.5`

3. 02-sample-routing.md:11 R
   before `and validate the return URL`
   after (delete)
   note Deleting the clause loses the page's only statement that IDM validates the return URL (sentence:0).

