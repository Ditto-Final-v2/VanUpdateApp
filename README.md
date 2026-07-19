# Curtis on the Road

A polished, mobile-first road-trip journal prototype built with Next.js. Friends and family can follow a planned and completed route, open map markers, browse entries, and preview commenting and subscription flows. Phase 1 uses local typed mock data and requires no account or external backend.

## Feature status

- Complete prototype: responsive public navigation and hero, interactive MapLibre route, six entry markers, marker previews, latest entry, chronological feed, static journal pages, photo galleries, entry maps, adjacent navigation, client-validated comments and signup forms, accessible loading/error states.
- Architecture preview: admin overview, post list and editor, comments, and subscriber routes.
- Documented for Phase 2: Supabase schema/RLS, Turnstile moderation, and Resend notifications.
- Not implemented intentionally: persistence, authentication, uploads, real comments, subscriptions, or email delivery.

## Stack

Next.js App Router, React, strict TypeScript, Tailwind CSS 4, MapLibre GL JS, GeoJSON, Zod, and Lucide icons. The next phase will add Supabase, Resend, and Cloudflare Turnstile.

## Local setup

Requires Node.js 20.9 or newer and npm.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The default public OpenFreeMap style works without a key. `.env.local` is optional for the prototype.

Useful commands:

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm start
```

## Environment variables

See `.env.example`. Only `NEXT_PUBLIC_*` values are exposed to browsers. `NEXT_PUBLIC_MAP_STYLE_URL` must point to a MapLibre-compatible public style and must not contain a secret. Supabase service-role, Resend, and Turnstile secret keys are server-only placeholders for Phase 2.

## Folder structure

```text
src/app/                 Pages, states, journal and admin routes
src/components/          Admin, blog, form, layout, and map components
src/config/site.ts       Editable identity, map style, links, feature flags
src/data/                Typed posts and GeoJSON route fixtures
src/lib/                 Post selectors and formatting helpers
src/types/               Shared application types
src/validation/          Zod form schemas
docs/                    Backend schema and workflow designs
public/                  Static assets
```

## Editing prototype content

Site identity and contact details live in `src/config/site.ts`. Edit `src/data/posts.ts` to add or change entries. A new entry must satisfy `TripPost`, use a unique ID and slug, have valid coordinates, and use `status: "published"` to appear publicly. The array may be in any order; public selectors sort by `entryDate` newest first. Remote photo hosts must also be allowed in `next.config.ts`.

Routes live in `src/data/routes.ts` as GeoJSON `LineString` features. Coordinates use `[longitude, latitude]`. Replace `plannedRoute.geometry.coordinates` with the whole itinerary and make `completedRoute` end at the current checkpoint. Keep at least two points in each line.

## Deployment

Deploy directly to Vercel after adding the environment variables in project settings. The application also targets standards-compatible Next.js hosting; Cloudflare deployment requires its current Next.js adapter and should be verified in Phase 2. Ensure the map tile provider permits production traffic, set the canonical site URL, and configure image host rules before launch.

## Future services

Create a Supabase project, apply the design in `docs/database-schema.md`, enable RLS before importing data, configure Auth and Storage, then replace local selectors with server-side Supabase queries. Follow `docs/notifications.md` for Resend domain verification and idempotent sending. Follow `docs/comments.md` before enabling public submissions.

## Known limitations

- All content resets on reload and form submissions are simulations.
- Map tiles and sample Unsplash photos require internet access.
- Admin routes are publicly visible design placeholders and must be protected before real use.
- Route lines connect sample waypoints directly rather than following roads.
- The sample map style is a public third-party service; choose an appropriate production provider and usage plan.

## Recommended next phase

1. Add Supabase Auth, schema migrations, RLS tests, and protected admin middleware.
2. Replace mock posts/routes with Supabase reads and build image upload plus the real post editor.
3. Implement Turnstile-protected comments and double-opt-in subscriptions before adding Resend delivery.
