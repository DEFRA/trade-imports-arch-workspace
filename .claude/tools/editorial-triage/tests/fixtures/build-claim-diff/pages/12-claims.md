# Claims page

The front door signs the cookie. The journey reads the cookie and must refuse a cookie whose signature fails.

The session service answers whether a session is live. The routing service forwards the answer to the journey, which records the outcome.

A consumer must reject a stale timestamp.

The routing service holds no key at all.

When the front door receives the callback, the front door checks the state value, then loads the stored return path, then issues the cookie, and then redirects the browser to the return path.

Every consumer holds the current key version.
