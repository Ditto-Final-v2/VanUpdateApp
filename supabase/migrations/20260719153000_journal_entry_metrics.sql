alter table public.posts
  add column van_mileage integer not null default 0 check (van_mileage >= 0),
  add column miles_walked numeric(10, 2) not null default 0 check (miles_walked >= 0),
  add column miles_ran numeric(10, 2) not null default 0 check (miles_ran >= 0),
  add column miles_biked numeric(10, 2) not null default 0 check (miles_biked >= 0),
  add column major_cities_visited integer not null default 0 check (major_cities_visited >= 0),
  add column new_states_visited integer not null default 0 check (new_states_visited >= 0),
  add column new_national_parks_visited integer not null default 0 check (new_national_parks_visited >= 0),
  add column tanks_of_gas numeric(10, 2) not null default 0 check (tanks_of_gas >= 0);

insert into public.trips (
  name, slug, description, current_location_name, current_latitude,
  current_longitude, stats, status, started_on
)
select
  'The Wandering', 'the-wandering', 'A five-month road trip journal.',
  'El Paso, TX', 31.7619, -106.4850,
  '{"days":0,"milesDriven":0,"states":1,"nationalParks":0,"majorCities":1,"milesWalked":0,"milesBiked":0,"milesRan":0,"tanksOfGas":0}'::jsonb,
  'active', current_date
where not exists (select 1 from public.trips where status = 'active');

create function public.publish_journal_entry(
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

  select van_mileage into v_previous_mileage
  from public.posts
  where trip_id = v_trip.id and status = 'published'
  order by entry_date desc, published_at desc
  limit 1;

  v_effective_mileage := case
    when p_van_mileage = 0 then coalesce(v_previous_mileage, 0)
    else p_van_mileage
  end;

  if v_previous_mileage is not null and v_effective_mileage < v_previous_mileage then
    raise exception 'Van mileage cannot be lower than the most recent entry (%).', v_previous_mileage;
  end if;

  v_miles_driven := case
    when v_previous_mileage is null then 0
    else v_effective_mileage - v_previous_mileage
  end;
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

revoke all on function public.publish_journal_entry(text, text, date, text, integer, numeric, numeric, numeric, integer, integer, integer, numeric, text, text) from public;
grant execute on function public.publish_journal_entry(text, text, date, text, integer, numeric, numeric, numeric, integer, integer, integer, numeric, text, text) to authenticated;
