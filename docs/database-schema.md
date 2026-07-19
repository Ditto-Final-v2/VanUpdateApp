# Recommended Supabase schema

Use `uuid` primary keys generated with `gen_random_uuid()`, `timestamptz` timestamps, and a shared trigger that updates `updated_at` before every update. Store image object paths—not public URLs—so delivery policy can change later.

## Tables

### `trips`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | default `gen_random_uuid()` |
| `name`, `slug` | `text` | slug unique, both not null |
| `description` | `text` | nullable |
| `planned_route`, `completed_route` | `jsonb` | validated GeoJSON LineStrings |
| `status` | `text` | check: `draft`, `active`, `completed` |
| `started_on`, `ended_on` | `date` | nullable |
| `created_at`, `updated_at` | `timestamptz` | default `now()` |

Indexes: unique `slug`; partial index on active trips.

### `posts`

`id uuid` PK; `trip_id uuid` FK → `trips(id)` with restrict on delete; unique `slug text`; `title text`; `excerpt text`; `body text`; `entry_date date`; `published_at timestamptz`; `location_name text`; `latitude double precision` checked between -90 and 90; `longitude double precision` checked between -180 and 180; `cover_image_path text`; `cover_image_alt text`; `notification_title text`; `status text` checked to `draft` or `published`; `trip_day integer` positive; `mileage_to_date integer` nonnegative; `created_by uuid` FK → `auth.users(id)`; `created_at`, `updated_at timestamptz`.

Indexes: unique `slug`; `(trip_id, entry_date desc)`; partial `(published_at desc)` where status is published; GiST geography index if PostGIS is enabled.

### `post_photos`

`id uuid` PK; `post_id uuid` FK → `posts(id)` cascade; `storage_path text` not null; `alt_text text` not null; `caption text`; `sort_order integer` not null default 0; `width`, `height integer`; timestamps. Unique `(post_id, sort_order)` and index `post_id`.

### `comments`

`id uuid` PK; `post_id uuid` FK → `posts(id)` cascade; `display_name text`; `body text`; `status text` checked to `pending`, `approved`, `hidden`, `spam`; `commenter_fingerprint_hash text`; `moderated_by uuid` FK → `auth.users(id)`; `moderated_at timestamptz`; `created_at`, `updated_at timestamptz`. Index `(post_id, status, created_at)` plus partial pending index.

### `subscribers`

`id uuid` PK; `email citext` unique; `name text`; `status text` checked to `pending`, `active`, `unsubscribed`, `bounced`; `confirmation_token_hash text`; `confirmation_sent_at`, `confirmed_at`, `unsubscribed_at timestamptz`; `unsubscribe_token_version integer` default 1; `source text`; timestamps. Index `(status, confirmed_at)`; never store raw confirmation tokens.

### `notification_sends`

`id uuid` PK; `post_id uuid` FK → `posts(id)` restrict; `subscriber_id uuid` FK → `subscribers(id)` restrict; `subject text`; `provider_message_id text`; `status text` checked to `queued`, `sent`, `delivered`, `failed`, `bounced`; `error_code`, `error_message text`; `attempt_count integer` default 0; `sent_at`, `delivered_at`, `created_at`, `updated_at timestamptz`. Unique `(post_id, subscriber_id)` prevents duplicate campaign sends; index provider message ID and status.

## Row Level Security

Enable RLS on every table and deny by default. Put the administrator's user UUID in a server-controlled `app_admins` table or custom JWT claim; do not identify admins by client-supplied email.

- Anonymous/authenticated public users may select only posts with `status = 'published'` and their parent active trip; select only photos belonging to published posts; and select only approved comments on published posts.
- Public comment and subscription creation should go through security-definer RPCs or server actions that accept a minimal payload and force safe status values. Do not grant broad direct inserts, because Turnstile and rate-limit checks happen server-side.
- Only administrators may insert, update, or delete trips, posts, and photos; moderate comments; select or update subscribers; or read notification records.
- Storage policies permit public reads only from the published-photo bucket/path. Admins alone upload, replace, and delete objects. Validate MIME type, size, and object prefix server-side.
- Service-role access is reserved for server notification and moderation workflows and is never exposed in browser bundles.
