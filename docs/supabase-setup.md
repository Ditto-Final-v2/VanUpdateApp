# Supabase setup

The repository contains a Supabase CLI project and an initial migration. The
public website still reads mock data until the data-access phase is completed.

## Hosted project

1. Create a Supabase project and save its database password in a password
   manager.
2. In the project settings, copy the project URL, publishable key, and service
   role key into `.env.local` using `.env.example` as the template. Never expose
   the service role key through a `NEXT_PUBLIC_*` variable.
3. Authenticate and link the CLI:

   ```powershell
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

4. In Authentication > Users, create the administrator account. Public Auth
   signup is disabled because site visitors do not need accounts.
5. In the SQL editor, add that user to the server-controlled administrator
   allowlist:

   ```sql
   insert into public.app_admins (user_id)
   select id
   from auth.users
   where email = 'YOUR_ADMIN_EMAIL'
   on conflict (user_id) do nothing;
   ```

6. Confirm that the `trip-photos` bucket exists and remains private. Published
   objects are readable only when their database photo record belongs to a
   published post.

## Local development

Local Supabase requires Docker Desktop. After Docker is installed and running:

```powershell
npm run db:start
npm run db:reset
npm run db:status
```

`db:start` prints the local API URL, publishable/anon key, service-role key, and
Studio URL. Copy the local values into `.env.local`. Use `npm run db:stop` when
the stack is no longer needed.

## Security model

- Anonymous visitors can read active trips, their stops, published posts,
  published photos, and approved comments.
- Direct anonymous comment and subscriber inserts are intentionally denied.
  Future server actions will validate Zod input, Turnstile, and rate limits
  before using restricted database functions or server credentials.
- Only authenticated users present in `public.app_admins` can manage content,
  moderation, subscribers, notifications, and storage objects.
- The service-role client is server-only and bypasses RLS. Use it only for
  narrowly scoped trusted workflows.

## Important files

- `supabase/config.toml`: local service and Auth configuration
- `supabase/migrations/20260719054810_initial_schema.sql`: schema, indexes,
  triggers, grants, RLS, and storage policies
- `src/lib/supabase/client.ts`: browser client factory
- `src/lib/supabase/server.ts`: cookie-aware Server Component client factory
- `src/lib/supabase/admin.ts`: server-only service-role client factory

## Next implementation step

Add the administrator sign-in page and Next.js auth proxy, protect every
`/admin` route, and test authenticated/anonymous access before replacing mock
data.
