# Comment implementation plan

Phase 1 renders approved sample comments and validates new comments in the browser with Zod. A successful submission shows a moderation notice but is deliberately not persisted.

## Future request flow

1. A server action accepts only `post_id`, `display_name`, plain-text `body`, and a Turnstile token.
2. Zod trims and validates the input; HTML is never accepted or rendered. React's normal text escaping remains enabled.
3. The server verifies the Turnstile token with Cloudflare and rejects expired, duplicated, or failed tokens.
4. A rate limiter checks hashed IP and browser signals. Suggested limits are five attempts per hour per IP and three per post per hour.
5. Known, previously approved commenters may be approved automatically using a signed, short-lived commenter cookie. First-time commenters enter `pending`.
6. Supabase inserts the comment through a narrowly scoped database function. It never trusts a client-supplied moderation state.
7. The admin can move comments among `pending`, `approved`, `hidden`, and `spam`. Every action records `moderated_at` and `moderated_by`.

Return the same neutral success response for pending and automatically approved comments so the endpoint does not reveal moderation rules. Keep IP data only as a rotating salted hash, define a retention window, log rejected bursts, and apply a restrictive Content Security Policy.
