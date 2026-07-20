alter table public.subscribers
  add column phone_e164 text unique,
  add column sms_status text not null default 'not_subscribed'
    check (sms_status in ('not_subscribed', 'active', 'unsubscribed')),
  add column sms_consent_at timestamptz,
  add column sms_unsubscribed_at timestamptz;

alter table public.subscribers
  add constraint subscribers_phone_e164_format
  check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$');

alter table public.notification_sends
  add column channel text not null default 'email'
  check (channel in ('email', 'mms'));

alter table public.notification_sends
  drop constraint notification_sends_post_id_subscriber_id_key;

alter table public.notification_sends
  add constraint notification_sends_post_subscriber_channel_key
  unique (post_id, subscriber_id, channel);

create index subscribers_sms_status_idx
  on public.subscribers (sms_status)
  where phone_e164 is not null;

create or replace function public.subscribe_to_trip(
  p_email text,
  p_name text,
  p_confirmation_token_hash text,
  p_phone_e164 text,
  p_sms_consent boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not p_sms_consent or p_phone_e164 !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Valid text-message consent and mobile number are required.';
  end if;

  insert into public.subscribers (
    email, name, status, confirmation_token_hash, confirmation_sent_at, source,
    phone_e164, sms_status, sms_consent_at, sms_unsubscribed_at
  ) values (
    lower(trim(p_email)), nullif(trim(p_name), ''), 'pending',
    p_confirmation_token_hash, now(), 'website', p_phone_e164, 'active', now(), null
  )
  on conflict (email) do update set
    name = coalesce(excluded.name, subscribers.name),
    status = case when subscribers.status = 'active' then 'active'::public.subscriber_status else 'pending'::public.subscriber_status end,
    confirmation_token_hash = case when subscribers.status = 'active' then subscribers.confirmation_token_hash else excluded.confirmation_token_hash end,
    confirmation_sent_at = case when subscribers.status = 'active' then subscribers.confirmation_sent_at else now() end,
    unsubscribed_at = null,
    phone_e164 = excluded.phone_e164,
    sms_status = 'active',
    sms_consent_at = now(),
    sms_unsubscribed_at = null
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.subscribe_to_trip(text, text, text, text, boolean) from public;
grant execute on function public.subscribe_to_trip(text, text, text, text, boolean) to anon, authenticated;

create or replace function public.unsubscribe_from_trip(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_changed integer;
begin
  update public.subscribers
  set status = 'unsubscribed',
      unsubscribed_at = now(),
      sms_status = case when phone_e164 is null then sms_status else 'unsubscribed' end,
      sms_unsubscribed_at = case when phone_e164 is null then sms_unsubscribed_at else now() end
  where unsubscribe_token = p_token;
  get diagnostics v_changed = row_count;
  return v_changed > 0;
end;
$$;

create or replace function public.publish_journal_entry_and_notify(
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
  select published.post_id, published.post_slug into v_post_id, v_post_slug
  from public.publish_journal_entry(
    p_slug, p_title, p_entry_date, p_location_name, p_van_mileage,
    p_miles_walked, p_miles_ran, p_miles_biked, p_major_cities_visited,
    p_new_states_visited, p_new_national_parks_visited, p_tanks_of_gas,
    p_notification_hook, p_body
  ) as published;

  if p_send_notification then
    insert into public.notification_sends (post_id, subscriber_id, subject, channel)
    select v_post_id, subscribers.id, coalesce(nullif(p_notification_hook, ''), p_title), 'email'
    from public.subscribers
    where subscribers.status = 'active'
    on conflict do nothing;

    insert into public.notification_sends (post_id, subscriber_id, subject, channel)
    select v_post_id, subscribers.id, coalesce(nullif(p_notification_hook, ''), p_title), 'mms'
    from public.subscribers
    where subscribers.sms_status = 'active' and subscribers.phone_e164 is not null
    on conflict do nothing;
  end if;

  return query select v_post_id, v_post_slug;
end;
$$;
