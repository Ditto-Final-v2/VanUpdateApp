create function public.publish_journal_entry_with_photos(
  p_slug text, p_title text, p_entry_date date, p_location_name text,
  p_van_mileage integer, p_miles_walked numeric, p_miles_ran numeric,
  p_miles_biked numeric, p_major_cities_visited integer,
  p_new_states_visited integer, p_new_national_parks_visited integer,
  p_tanks_of_gas numeric, p_notification_hook text, p_body text,
  p_send_notification boolean, p_photo_paths text[], p_cover_photo_path text
)
returns table (post_id uuid, post_slug text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post_id uuid;
  v_post_slug text;
begin
  if coalesce(array_length(p_photo_paths, 1), 0) > 12 then
    raise exception 'A journal entry can contain at most 12 photos.';
  end if;
  if p_cover_photo_path is not null and not (p_cover_photo_path = any(p_photo_paths)) then
    raise exception 'The cover photo must be one of the uploaded photos.';
  end if;
  if exists (select 1 from unnest(p_photo_paths) path where path !~ '^staged/[a-f0-9-]+/[a-f0-9-]+\.(jpg|jpeg|png|webp)$') then
    raise exception 'An uploaded photo path is invalid.';
  end if;

  select published.post_id, published.post_slug into v_post_id, v_post_slug
  from public.publish_journal_entry_and_notify(
    p_slug, p_title, p_entry_date, p_location_name, p_van_mileage,
    p_miles_walked, p_miles_ran, p_miles_biked, p_major_cities_visited,
    p_new_states_visited, p_new_national_parks_visited, p_tanks_of_gas,
    p_notification_hook, p_body, p_send_notification
  ) as published;

  insert into public.post_photos (post_id, storage_path, alt_text, sort_order)
  select v_post_id, photo.path, p_title || ' photo ' || photo.ordinality, photo.ordinality - 1
  from unnest(p_photo_paths) with ordinality as photo(path, ordinality);

  update public.posts
  set cover_image_path = p_cover_photo_path,
      cover_image_alt = case when p_cover_photo_path is null then null else p_title || ' cover photo' end
  where id = v_post_id;

  return query select v_post_id, v_post_slug;
end;
$$;

revoke all on function public.publish_journal_entry_with_photos(text, text, date, text, integer, numeric, numeric, numeric, integer, integer, integer, numeric, text, text, boolean, text[], text) from public;
grant execute on function public.publish_journal_entry_with_photos(text, text, date, text, integer, numeric, numeric, numeric, integer, integer, integer, numeric, text, text, boolean, text[], text) to authenticated;
