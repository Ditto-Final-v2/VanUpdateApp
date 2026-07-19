# Publishing and email notifications

No email is sent in Phase 1. The signup controls validate locally and explicitly say that addresses are not stored.

## Future publish workflow

1. The administrator creates or edits a post and enters a custom email subject (`notification_title`).
2. They choose whether this publish should notify subscribers.
3. A server action validates the payload and authenticates the Supabase user.
4. The server verifies that the user is the configured administrator before changing publication state.
5. The post is committed as `published`. If notification is selected, an idempotent notification job is created in the same transaction.
6. A server-only worker retrieves confirmed, active subscribers in bounded batches.
7. Resend sends an email containing the custom subject, post title, excerpt, cover photo, canonical read link, and a per-subscriber signed unsubscribe link.
8. Each attempt is written to `notification_sends` with provider ID, status, and error details. Retries use exponential backoff and the job's idempotency key prevents duplicate campaigns.

Resend keys and the Supabase service role key must remain server-only. Verify the sending domain, handle Resend webhooks to capture delivery/bounce events, suppress bounced addresses, and never put raw subscriber IDs in unsubscribe URLs. Preview and test-send should be separate actions from publish.
