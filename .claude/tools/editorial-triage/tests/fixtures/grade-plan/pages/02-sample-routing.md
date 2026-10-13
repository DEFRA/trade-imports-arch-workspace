# Sign-in and routing

The routing service takes every browser request for the service and decides where each one goes.

## The front door

The front door checks the redirect target against the registered list, as RFC 9700 sections 4.7 and 4.11 require.

On the direct path the routing service's allowlist, header stripping and request logging do not apply.

The sign-out form carries the ID token hint, which IDM uses to identify the session and validate the return URL.

Every session starts at the front door, and the direct path bypasses the front door.

## Open questions

- Which sealing library INS uses, how the seal key is provisioned, and what the rotation runbook says.
- Whether the tenant setting that validates the return URL is on.
