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
  if p_sms_consent and (p_phone_e164 is null or p_phone_e164 !~ '^\+[1-9][0-9]{7,14}$') then
    raise exception 'A valid mobile number is required when text consent is selected.';
  end if;

  insert into public.subscribers (
    email, name, status, confirmation_token_hash, confirmation_sent_at, source,
    phone_e164, sms_status, sms_consent_at, sms_unsubscribed_at
  ) values (
    lower(trim(p_email)), nullif(trim(p_name), ''), 'pending',
    p_confirmation_token_hash, now(), 'website',
    case when p_sms_consent then p_phone_e164 else null end,
    case when p_sms_consent then 'active' else 'not_subscribed' end,
    case when p_sms_consent then now() else null end,
    null
  )
  on conflict (email) do update set
    name = coalesce(excluded.name, subscribers.name),
    status = case when subscribers.status = 'active' then 'active'::public.subscriber_status else 'pending'::public.subscriber_status end,
    confirmation_token_hash = case when subscribers.status = 'active' then subscribers.confirmation_token_hash else excluded.confirmation_token_hash end,
    confirmation_sent_at = case when subscribers.status = 'active' then subscribers.confirmation_sent_at else now() end,
    unsubscribed_at = null,
    phone_e164 = case when p_sms_consent then excluded.phone_e164 else subscribers.phone_e164 end,
    sms_status = case when p_sms_consent then 'active' else subscribers.sms_status end,
    sms_consent_at = case when p_sms_consent then now() else subscribers.sms_consent_at end,
    sms_unsubscribed_at = case when p_sms_consent then null else subscribers.sms_unsubscribed_at end
  returning id into v_id;

  return v_id;
end;
$$;
