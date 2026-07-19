create function public.publish_journal_entry_and_notify(
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
  p_body text,
  p_send_notification boolean
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
  select published.post_id, published.post_slug
  into v_post_id, v_post_slug
  from public.publish_journal_entry(
    p_slug, p_title, p_entry_date, p_location_name, p_van_mileage,
    p_miles_walked, p_miles_ran, p_miles_biked, p_major_cities_visited,
    p_new_states_visited, p_new_national_parks_visited, p_tanks_of_gas,
    p_notification_hook, p_body
  ) as published;

  if p_send_notification then
    insert into public.notification_sends (post_id, subscriber_id, subject)
    select v_post_id, subscribers.id, coalesce(nullif(p_notification_hook, ''), p_title)
    from public.subscribers
    where subscribers.status = 'active';
  end if;

  return query select v_post_id, v_post_slug;
end;
$$;

revoke all on function public.publish_journal_entry_and_notify(text, text, date, text, integer, numeric, numeric, numeric, integer, integer, integer, numeric, text, text, boolean) from public;
grant execute on function public.publish_journal_entry_and_notify(text, text, date, text, integer, numeric, numeric, numeric, integer, integer, integer, numeric, text, text, boolean) to authenticated;
