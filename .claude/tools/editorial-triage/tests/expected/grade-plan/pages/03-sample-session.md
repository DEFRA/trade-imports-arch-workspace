# The session record

The session record holds the subject, the organisation and the expiry.

The service will use the session token to identify the caller on every request.

Sessions utilise the same store in every environment.

The record states that the session lasts eight hours.

Every request is logged at the front door whichever path it takes.

Whether the seal key is rotated on a schedule is not yet decided.
