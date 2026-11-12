# Question Opener Fixture

What a journey backend checks is the signature, the issuer and the expiry.

This page answers:

- How a session starts
- **Which** component owns each action

| Field | Meaning |
| --- | --- |
| Expiry | Why the session ends at 8 hours |

The routing service forwards the request. Whether the cookie is sealed is decided separately.

When the record expires, the session service answers with a 410.

However the session ends, the cookie stops working.

The backend checks the signature, the issuer and the expiry.
