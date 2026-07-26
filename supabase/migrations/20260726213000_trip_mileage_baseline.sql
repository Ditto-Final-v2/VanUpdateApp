alter table public.trips
  add column van_mileage_baseline integer not null default 0
    check (van_mileage_baseline >= 0),
  add column current_van_mileage integer not null default 0
    check (current_van_mileage >= 0);

comment on column public.trips.van_mileage_baseline is
  'Odometer reading from which post mileage deltas are calculated.';
comment on column public.trips.current_van_mileage is
  'Most recent saved van odometer reading; a journal value of zero reuses it.';

with active_trip as (
  select id
  from public.trips
  where status = 'active'
  order by updated_at desc
  limit 1
),
latest_post as (
  select p.id
  from public.posts p
  join active_trip t on t.id = p.trip_id
  where p.status = 'published'
  order by p.entry_date desc, p.published_at desc, p.created_at desc
  limit 1
)
update public.posts p
set van_mileage = 314135
from latest_post l
where p.id = l.id;

with active_trip as (
  select id
  from public.trips
  where status = 'active'
  order by updated_at desc
  limit 1
)
update public.posts p
set mileage_to_date = 1474
from active_trip t
where p.trip_id = t.id
  and p.status = 'published';

with active_trip as (
  select id
  from public.trips
  where status = 'active'
  order by updated_at desc
  limit 1
)
update public.trips t
set
  van_mileage_baseline = 314135,
  current_van_mileage = 314135,
  base_stats = jsonb_set(t.base_stats, '{milesDriven}', '1474'::jsonb, true),
  stats = jsonb_set(t.stats, '{milesDriven}', '1474'::jsonb, true)
from active_trip a
where t.id = a.id;

create or replace function public.publish_journal_entry(
  p_slug text,
  p_title text,
  p_entry_date date,
  p_location_name text,
  p_van_mileage integer,
  p_miles_walked numeric,
  p_miles_ran numeric,
  p_miles_biked numeric,
  p_major_cities_visited integer,
  p_new_states_visited integer,
  p_new_national_parks_visited integer,
  p_tanks_of_gas numeric,
  p_notification_hook text,
  p_body text
)
returns table (post_id uuid, post_slug text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trip public.trips%rowtype;
  v_previous_mileage integer;
  v_effective_mileage integer;
  v_miles_driven integer;
  v_cumulative_driven integer;
  v_trip_day integer;
  v_post_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  select * into v_trip
  from public.trips
  where status = 'active'
  order by updated_at desc
  limit 1
  for update;

  if not found then
    raise exception 'No active trip is configured.';
  end if;

  v_previous_mileage := greatest(
    coalesce(v_trip.current_van_mileage, 0),
    coalesce(v_trip.van_mileage_baseline, 0)
  );
  v_effective_mileage := case
    when p_van_mileage = 0 then v_previous_mileage
    else p_van_mileage
  end;

  if v_effective_mileage < v_previous_mileage then
    raise exception 'Van mileage cannot be lower than the most recent saved odometer (%) mi.',
      to_char(v_previous_mileage, 'FM999,999,999');
  end if;

  v_miles_driven := v_effective_mileage - v_previous_mileage;
  v_cumulative_driven := coalesce((v_trip.stats ->> 'milesDriven')::integer, 0) + v_miles_driven;
  v_trip_day := coalesce((v_trip.stats ->> 'days')::integer, 0) + 1;

  insert into public.posts (
    trip_id, slug, title, excerpt, body, entry_date, published_at,
    location_name, latitude, longitude, notification_title, status,
    trip_day, mileage_to_date, van_mileage, miles_walked, miles_ran,
    miles_biked, major_cities_visited, new_states_visited,
    new_national_parks_visited, tanks_of_gas, created_by
  ) values (
    v_trip.id, p_slug, p_title, left(regexp_replace(p_body, '\\s+', ' ', 'g'), 280),
    p_body, p_entry_date, now(), p_location_name,
    coalesce(v_trip.current_latitude, 31.7619),
    coalesce(v_trip.current_longitude, -106.4850),
    nullif(p_notification_hook, ''), 'published', v_trip_day,
    v_cumulative_driven, v_effective_mileage, p_miles_walked, p_miles_ran,
    p_miles_biked, p_major_cities_visited, p_new_states_visited,
    p_new_national_parks_visited, p_tanks_of_gas, auth.uid()
  ) returning id into v_post_id;

  update public.trips set
    current_location_name = p_location_name,
    current_van_mileage = v_effective_mileage,
    stats = jsonb_build_object(
      'days', v_trip_day,
      'milesDriven', v_cumulative_driven,
      'states', coalesce((v_trip.stats ->> 'states')::integer, 0) + p_new_states_visited,
      'nationalParks', coalesce((v_trip.stats ->> 'nationalParks')::integer, 0) + p_new_national_parks_visited,
      'majorCities', coalesce((v_trip.stats ->> 'majorCities')::integer, 0) + p_major_cities_visited,
      'milesWalked', coalesce((v_trip.stats ->> 'milesWalked')::numeric, 0) + p_miles_walked,
      'milesBiked', coalesce((v_trip.stats ->> 'milesBiked')::numeric, 0) + p_miles_biked,
      'milesRan', coalesce((v_trip.stats ->> 'milesRan')::numeric, 0) + p_miles_ran,
      'tanksOfGas', coalesce((v_trip.stats ->> 'tanksOfGas')::numeric, 0) + p_tanks_of_gas
    )
  where id = v_trip.id;

  return query select v_post_id, p_slug;
end;
$$;

create or replace function public.recalculate_trip_stats(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base jsonb;
  v_baseline integer;
  v_current integer;
  v_totals record;
  v_previous integer;
  v_effective integer;
  v_running integer;
  v_post record;
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  select base_stats, van_mileage_baseline
  into v_base, v_baseline
  from public.trips
  where id = p_trip_id
  for update;

  if not found then
    raise exception 'Trip not found.';
  end if;

  v_previous := coalesce(v_baseline, 0);
  v_running := coalesce((v_base ->> 'milesDriven')::integer, 0);

  for v_post in
    select id, van_mileage
    from public.posts
    where trip_id = p_trip_id and status = 'published'
    order by entry_date, published_at, created_at
  loop
    v_effective := case
      when v_post.van_mileage = 0 then v_previous
      else v_post.van_mileage
    end;

    if v_effective < v_previous then
      raise exception 'Van mileage cannot decrease from % to %.',
        to_char(v_previous, 'FM999,999,999'),
        to_char(v_effective, 'FM999,999,999');
    end if;

    v_running := v_running + (v_effective - v_previous);
    update public.posts
    set mileage_to_date = v_running
    where id = v_post.id;
    v_previous := v_effective;
  end loop;

  v_current := v_previous;

  select
    count(*) days,
    coalesce(sum(new_states_visited), 0) states,
    coalesce(sum(new_national_parks_visited), 0) parks,
    coalesce(sum(major_cities_visited), 0) cities,
    coalesce(sum(miles_walked), 0) walked,
    coalesce(sum(miles_biked), 0) biked,
    coalesce(sum(miles_ran), 0) ran,
    coalesce(sum(tanks_of_gas), 0) gas
  into v_totals
  from public.posts
  where trip_id = p_trip_id and status = 'published';

  update public.trips
  set
    current_van_mileage = v_current,
    stats = jsonb_build_object(
      'days', v_totals.days + coalesce((v_base ->> 'days')::numeric, 0),
      'milesDriven', v_running,
      'states', v_totals.states + coalesce((v_base ->> 'states')::numeric, 0),
      'nationalParks', v_totals.parks + coalesce((v_base ->> 'nationalParks')::numeric, 0),
      'majorCities', v_totals.cities + coalesce((v_base ->> 'majorCities')::numeric, 0),
      'milesWalked', v_totals.walked + coalesce((v_base ->> 'milesWalked')::numeric, 0),
      'milesBiked', v_totals.biked + coalesce((v_base ->> 'milesBiked')::numeric, 0),
      'milesRan', v_totals.ran + coalesce((v_base ->> 'milesRan')::numeric, 0),
      'tanksOfGas', v_totals.gas + coalesce((v_base ->> 'tanksOfGas')::numeric, 0)
    )
  where id = p_trip_id;
end;
$$;
