create extension if not exists citext with schema extensions;

create type public.trip_status as enum ('draft', 'active', 'completed');
create type public.post_status as enum ('draft', 'published');
create type public.comment_status as enum ('pending', 'approved', 'hidden', 'spam');
create type public.subscriber_status as enum ('pending', 'active', 'unsubscribed', 'bounced');
create type public.notification_status as enum ('queued', 'sent', 'delivered', 'failed', 'bounced');

create table public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  planned_route jsonb,
  completed_route jsonb,
  active_loop smallint not null default 1 check (active_loop in (1, 2)),
  current_location_name text,
  current_latitude double precision check (current_latitude between -90 and 90),
  current_longitude double precision check (current_longitude between -180 and 180),
  stats jsonb not null default '{"days":0,"milesDriven":0,"states":0,"nationalParks":0,"majorCities":0,"milesWalked":0,"milesBiked":0,"milesRan":0,"tanksOfGas":0}'::jsonb,
  status public.trip_status not null default 'draft',
  started_on date,
  ended_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((current_latitude is null) = (current_longitude is null)),
  check (jsonb_typeof(stats) = 'object'),
  check (planned_route is null or planned_route #>> '{geometry,type}' in ('LineString', 'MultiLineString')),
  check (completed_route is null or completed_route #>> '{geometry,type}' in ('LineString', 'MultiLineString'))
);

create table public.trip_stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  loop_number smallint not null check (loop_number in (1, 2)),
  stop_number integer not null check (stop_number > 0),
  name text not null check (char_length(name) between 1 and 200),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, loop_number, stop_number),
  check (completed or completed_at is null)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 180),
  excerpt text not null check (char_length(excerpt) between 1 and 600),
  body text not null,
  entry_date date not null,
  published_at timestamptz,
  location_name text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  cover_image_path text,
  cover_image_alt text,
  notification_title text,
  status public.post_status not null default 'draft',
  trip_day integer not null check (trip_day > 0),
  mileage_to_date integer not null default 0 check (mileage_to_date >= 0),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'draft' or published_at is not null)
);

create table public.post_photos (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  storage_path text not null unique,
  alt_text text not null,
  caption text,
  sort_order integer not null default 0 check (sort_order >= 0),
  width integer check (width > 0),
  height integer check (height > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id, sort_order)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  body text not null check (char_length(body) between 1 and 1200),
  status public.comment_status not null default 'pending',
  commenter_fingerprint_hash text,
  moderated_by uuid references auth.users (id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email extensions.citext not null unique,
  name text check (name is null or char_length(name) <= 100),
  status public.subscriber_status not null default 'pending',
  confirmation_token_hash text,
  confirmation_sent_at timestamptz,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  unsubscribe_token_version integer not null default 1 check (unsubscribe_token_version > 0),
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notification_sends (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete restrict,
  subscriber_id uuid not null references public.subscribers (id) on delete restrict,
  subject text not null,
  provider_message_id text,
  status public.notification_status not null default 'queued',
  error_code text,
  error_message text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id, subscriber_id)
);

create index trips_active_idx on public.trips (updated_at desc) where status = 'active';
create index trip_stops_trip_loop_idx on public.trip_stops (trip_id, loop_number, stop_number);
create index posts_trip_entry_idx on public.posts (trip_id, entry_date desc);
create index posts_published_idx on public.posts (published_at desc) where status = 'published';
create index post_photos_post_idx on public.post_photos (post_id, sort_order);
create index comments_post_status_idx on public.comments (post_id, status, created_at);
create index comments_pending_idx on public.comments (created_at) where status = 'pending';
create index subscribers_status_idx on public.subscribers (status, confirmed_at);
create index notification_provider_idx on public.notification_sends (provider_message_id) where provider_message_id is not null;
create index notification_status_idx on public.notification_sends (status, created_at);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.app_admins where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create trigger trips_updated_at before update on public.trips for each row execute function public.set_updated_at();
create trigger trip_stops_updated_at before update on public.trip_stops for each row execute function public.set_updated_at();
create trigger posts_updated_at before update on public.posts for each row execute function public.set_updated_at();
create trigger post_photos_updated_at before update on public.post_photos for each row execute function public.set_updated_at();
create trigger comments_updated_at before update on public.comments for each row execute function public.set_updated_at();
create trigger subscribers_updated_at before update on public.subscribers for each row execute function public.set_updated_at();
create trigger notification_sends_updated_at before update on public.notification_sends for each row execute function public.set_updated_at();

alter table public.app_admins enable row level security;
alter table public.trips enable row level security;
alter table public.trip_stops enable row level security;
alter table public.posts enable row level security;
alter table public.post_photos enable row level security;
alter table public.comments enable row level security;
alter table public.subscribers enable row level security;
alter table public.notification_sends enable row level security;

create policy "admins can read admin allowlist" on public.app_admins for select to authenticated using (public.is_admin());
create policy "public can read active trips" on public.trips for select to anon, authenticated using (status in ('active', 'completed'));
create policy "public can read stops for active trips" on public.trip_stops for select to anon, authenticated using (exists (select 1 from public.trips where trips.id = trip_stops.trip_id and trips.status in ('active', 'completed')));
create policy "public can read published posts" on public.posts for select to anon, authenticated using (status = 'published' and published_at <= now());
create policy "public can read published post photos" on public.post_photos for select to anon, authenticated using (exists (select 1 from public.posts where posts.id = post_photos.post_id and posts.status = 'published' and posts.published_at <= now()));
create policy "public can read approved comments" on public.comments for select to anon, authenticated using (status = 'approved' and exists (select 1 from public.posts where posts.id = comments.post_id and posts.status = 'published' and posts.published_at <= now()));

create policy "admins manage trips" on public.trips for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage stops" on public.trip_stops for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage posts" on public.posts for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage photos" on public.post_photos for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins moderate comments" on public.comments for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage subscribers" on public.subscribers for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage notifications" on public.notification_sends for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on all tables in schema public from anon, authenticated;
grant select on public.trips, public.trip_stops, public.posts, public.post_photos, public.comments to anon, authenticated;
grant select on public.app_admins to authenticated;
grant insert, update, delete on public.trips, public.trip_stops, public.posts, public.post_photos, public.comments, public.subscribers, public.notification_sends to authenticated;
grant select on public.subscribers, public.notification_sends to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trip-photos', 'trip-photos', false, 15728640, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "public can read published trip photos"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'trip-photos'
  and exists (
    select 1 from public.post_photos
    join public.posts on posts.id = post_photos.post_id
    where post_photos.storage_path = storage.objects.name
      and posts.status = 'published'
      and posts.published_at <= now()
  )
);

create policy "admins upload trip photos" on storage.objects for insert to authenticated with check (bucket_id = 'trip-photos' and public.is_admin());
create policy "admins update trip photos" on storage.objects for update to authenticated using (bucket_id = 'trip-photos' and public.is_admin()) with check (bucket_id = 'trip-photos' and public.is_admin());
create policy "admins delete trip photos" on storage.objects for delete to authenticated using (bucket_id = 'trip-photos' and public.is_admin());
