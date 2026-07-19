alter table public.trips add column base_stats jsonb not null default '{"days":0,"milesDriven":0,"states":0,"nationalParks":0,"majorCities":0,"milesWalked":0,"milesBiked":0,"milesRan":0,"tanksOfGas":0}'::jsonb check (jsonb_typeof(base_stats) = 'object');

with aggregates as (
  select trip_id, sum(new_states_visited) states, sum(new_national_parks_visited) parks,
    sum(major_cities_visited) cities, sum(miles_walked) walked, sum(miles_biked) biked,
    sum(miles_ran) ran, sum(tanks_of_gas) gas
  from public.posts where status = 'published' group by trip_id
)
update public.trips t set base_stats = jsonb_build_object(
  'days', 0, 'milesDriven', 0,
  'states', greatest(coalesce((t.stats->>'states')::numeric, 0) - coalesce(a.states, 0), 0),
  'nationalParks', greatest(coalesce((t.stats->>'nationalParks')::numeric, 0) - coalesce(a.parks, 0), 0),
  'majorCities', greatest(coalesce((t.stats->>'majorCities')::numeric, 0) - coalesce(a.cities, 0), 0),
  'milesWalked', greatest(coalesce((t.stats->>'milesWalked')::numeric, 0) - coalesce(a.walked, 0), 0),
  'milesBiked', greatest(coalesce((t.stats->>'milesBiked')::numeric, 0) - coalesce(a.biked, 0), 0),
  'milesRan', greatest(coalesce((t.stats->>'milesRan')::numeric, 0) - coalesce(a.ran, 0), 0),
  'tanksOfGas', greatest(coalesce((t.stats->>'tanksOfGas')::numeric, 0) - coalesce(a.gas, 0), 0)
) from aggregates a where a.trip_id = t.id;

create function public.recalculate_trip_stats(p_trip_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_base jsonb; v_totals record; v_driven integer := 0; v_previous integer; v_running integer := 0; v_post record;
begin
  if not public.is_admin() then raise exception 'Administrator access is required.'; end if;
  select base_stats into v_base from public.trips where id = p_trip_id for update;
  for v_post in select id, van_mileage from public.posts where trip_id = p_trip_id and status = 'published' order by entry_date, published_at, created_at loop
    if v_previous is not null then v_running := v_running + greatest(v_post.van_mileage - v_previous, 0); end if;
    update public.posts set mileage_to_date = v_running where id = v_post.id;
    v_previous := v_post.van_mileage;
  end loop;
  v_driven := v_running;
  select count(*) days, coalesce(sum(new_states_visited),0) states, coalesce(sum(new_national_parks_visited),0) parks,
    coalesce(sum(major_cities_visited),0) cities, coalesce(sum(miles_walked),0) walked,
    coalesce(sum(miles_biked),0) biked, coalesce(sum(miles_ran),0) ran, coalesce(sum(tanks_of_gas),0) gas
  into v_totals from public.posts where trip_id = p_trip_id and status = 'published';
  update public.trips set stats = jsonb_build_object(
    'days', v_totals.days + coalesce((v_base->>'days')::numeric,0),
    'milesDriven', v_driven + coalesce((v_base->>'milesDriven')::numeric,0),
    'states', v_totals.states + coalesce((v_base->>'states')::numeric,0),
    'nationalParks', v_totals.parks + coalesce((v_base->>'nationalParks')::numeric,0),
    'majorCities', v_totals.cities + coalesce((v_base->>'majorCities')::numeric,0),
    'milesWalked', v_totals.walked + coalesce((v_base->>'milesWalked')::numeric,0),
    'milesBiked', v_totals.biked + coalesce((v_base->>'milesBiked')::numeric,0),
    'milesRan', v_totals.ran + coalesce((v_base->>'milesRan')::numeric,0),
    'tanksOfGas', v_totals.gas + coalesce((v_base->>'tanksOfGas')::numeric,0)
  ) where id = p_trip_id;
end; $$;

revoke all on function public.recalculate_trip_stats(uuid) from public;
grant execute on function public.recalculate_trip_stats(uuid) to authenticated;

create function public.update_journal_entry(
  p_post_id uuid, p_title text, p_entry_date date, p_location_name text, p_van_mileage integer,
  p_miles_walked numeric, p_miles_ran numeric, p_miles_biked numeric, p_major_cities_visited integer,
  p_new_states_visited integer, p_new_national_parks_visited integer, p_tanks_of_gas numeric,
  p_notification_hook text, p_body text, p_status public.post_status,
  p_retained_photo_paths text[], p_new_photo_paths text[], p_cover_photo_path text
) returns void language plpgsql security definer set search_path = '' as $$
declare v_trip_id uuid;
begin
  if not public.is_admin() then raise exception 'Administrator access is required.'; end if;
  select trip_id into v_trip_id from public.posts where id = p_post_id for update;
  if not found then raise exception 'Journal entry not found.'; end if;
  if p_cover_photo_path is not null and not (p_cover_photo_path = any(p_retained_photo_paths || p_new_photo_paths)) then raise exception 'Cover photo must be retained or newly uploaded.'; end if;
  delete from public.post_photos where post_id = p_post_id and not (storage_path = any(p_retained_photo_paths));
  insert into public.post_photos(post_id, storage_path, alt_text, sort_order)
  select p_post_id, photo.path, p_title || ' photo ' || photo.ordinality,
    coalesce((select max(sort_order)+1 from public.post_photos where post_id=p_post_id),0) + photo.ordinality - 1
  from unnest(p_new_photo_paths) with ordinality photo(path, ordinality);
  update public.posts set title=p_title, excerpt=left(regexp_replace(p_body,'\s+',' ','g'),280), body=p_body,
    entry_date=p_entry_date, location_name=p_location_name, van_mileage=p_van_mileage,
    miles_walked=p_miles_walked, miles_ran=p_miles_ran, miles_biked=p_miles_biked,
    major_cities_visited=p_major_cities_visited, new_states_visited=p_new_states_visited,
    new_national_parks_visited=p_new_national_parks_visited, tanks_of_gas=p_tanks_of_gas,
    notification_title=nullif(p_notification_hook,''), status=p_status,
    published_at=case when p_status='published' then coalesce(published_at,now()) else null end,
    cover_image_path=p_cover_photo_path, cover_image_alt=case when p_cover_photo_path is null then null else p_title||' cover photo' end
  where id=p_post_id;
  perform public.recalculate_trip_stats(v_trip_id);
end; $$;

revoke all on function public.update_journal_entry(uuid,text,date,text,integer,numeric,numeric,numeric,integer,integer,integer,numeric,text,text,public.post_status,text[],text[],text) from public;
grant execute on function public.update_journal_entry(uuid,text,date,text,integer,numeric,numeric,numeric,integer,integer,integer,numeric,text,text,public.post_status,text[],text[],text) to authenticated;

create function public.delete_journal_entry(p_post_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare v_trip_id uuid;
begin
  if not public.is_admin() then raise exception 'Administrator access is required.'; end if;
  select trip_id into v_trip_id from public.posts where id=p_post_id for update;
  if not found then raise exception 'Journal entry not found.'; end if;
  delete from public.notification_sends where post_id=p_post_id;
  delete from public.posts where id=p_post_id;
  perform public.recalculate_trip_stats(v_trip_id);
end; $$;
revoke all on function public.delete_journal_entry(uuid) from public;
grant execute on function public.delete_journal_entry(uuid) to authenticated;
